import 'server-only';

import { buildVerifierSystemPrompt, buildVerifierUserText } from '@/lib/agents/prompts/verifier';
import { chatCompletion, extractJsonText, isLlmConfigured } from '@/lib/llm/chat';
import { VerifierResultOutputSchema, type VerifierResultOutput } from '@/lib/agents/schemas';
import { validateVerifierOutput } from '@/lib/agents/validators';
import { hasGrantedConsent } from '@/lib/consent/record';
import { redactExtractedFields, redactForgeryFlags, redactMismatches } from '@/lib/redaction/pii';
import { enqueueHumanGate } from '@/lib/ops/human-gate';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { createAdminClient } from '@/lib/supabase/admin';
import { EVIDENCE_BUCKET } from '@/lib/evidence/storage-path';
import { downscaleForVision } from '@/lib/evidence/prepare-image';
import type { Database, Json } from '@/supabase/database.types';
import type { AgentRunResult } from '@/lib/agents/runner';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

/** NVIDIA NIM vision input only accepts these formats — not application/pdf. */
const SUPPORTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif']);

export type VerifierInput = {
  evidence_id: string;
  case_id: string;
  storage_path: string;
  mime_type: string | null;
  frozen_amount_paise: number | null;
};

function noOcrResult(): VerifierResultOutput {
  return VerifierResultOutputSchema.parse({
    confidence: 0,
    field_confidence: {},
    extracted: {},
    forgery_risk: false,
    forgery_flags: [],
    mismatches: [],
    human_review_required: true,
  });
}

export async function loadVerifierInput(evidenceId: string): Promise<VerifierInput> {
  const supabase = createAdminClient();

  const { data: evidence, error } = await supabase
    .from('evidence')
    .select('id, case_id, storage_path, mime_type')
    .eq('id', evidenceId)
    .single();

  if (error || !evidence) {
    throw new Error(`evidence_not_found: ${evidenceId}`);
  }

  const { data: caseRow } = await supabase
    .from('cases')
    .select('frozen_amount_paise')
    .eq('id', evidence.case_id)
    .maybeSingle();

  // Cross-check uploads against the notice amount when the case has no frozen
  // amount yet (pre-intake hero path) — reuses the existing amount-mismatch rule.
  let expectedAmountPaise = caseRow?.frozen_amount_paise ?? null;
  if (expectedAmountPaise === null) {
    const { data: notice } = await supabase
      .from('notice_analysis')
      .select('extracted_amount_paise')
      .eq('case_id', evidence.case_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    expectedAmountPaise = notice?.extracted_amount_paise ?? null;
  }

  return {
    evidence_id: evidence.id,
    case_id: evidence.case_id,
    storage_path: evidence.storage_path,
    mime_type: evidence.mime_type,
    frozen_amount_paise: expectedAmountPaise,
  };
}

async function extractWithLlm(input: VerifierInput): Promise<VerifierResultOutput | null> {
  if (!isLlmConfigured()) return null;
  // ai_ocr_processing consent is not yet grantable anywhere in the product UI
  // (tracked as a follow-up) — this check fails safe until that's wired up.
  if (!(await hasGrantedConsent(input.case_id, 'ai_ocr_processing'))) return null;

  const supabase = createAdminClient();
  const { data: fileData, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .download(input.storage_path);

  if (error || !fileData) return null;

  const original = Buffer.from(await fileData.arrayBuffer());
  // Downscale before vision OCR — big latency win on multi-MB phone photos.
  const { buffer, mime } = await downscaleForVision(original, input.mime_type ?? 'image/jpeg');
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

  const text = await chatCompletion({
    vision: true,
    max_tokens: 2048,
    temperature: 0.1,
    messages: [
      { role: 'system', content: buildVerifierSystemPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildVerifierUserText(input.frozen_amount_paise) },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
    ],
  });

  if (!text) return null;

  try {
    const parsed = JSON.parse(extractJsonText(text)) as unknown;
    return VerifierResultOutputSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function runVerifier(input: VerifierInput): Promise<VerifierResultOutput> {
  if (!input.mime_type || !SUPPORTED_IMAGE_MIMES.has(input.mime_type)) {
    return noOcrResult();
  }

  const llmResult = await extractWithLlm(input);
  if (!llmResult) return noOcrResult();

  const validation = validateVerifierOutput(llmResult);
  if (!validation.valid) {
    return { ...noOcrResult(), forgery_risk: llmResult.forgery_risk };
  }

  return {
    ...llmResult,
    extracted: redactExtractedFields(llmResult.extracted),
    forgery_flags: redactForgeryFlags(llmResult.forgery_flags),
    mismatches: redactMismatches(llmResult.mismatches),
  };
}

async function applyVerifierSideEffects(
  input: VerifierInput,
  output: VerifierResultOutput,
  jobId: string,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('evidence')
    .update({ vision_extracted_json: output.extracted as Json })
    .eq('id', input.evidence_id);

  const { human_gate_required } = validateVerifierOutput(output);

  if (human_gate_required) {
    await enqueueHumanGate({
      case_id: input.case_id,
      queue_reason: output.forgery_risk ? 'verifier_forgery_risk' : 'verifier_low_confidence',
      priority: output.forgery_risk ? 90 : 50,
      metadata: { evidence_id: input.evidence_id, confidence: output.confidence },
    });
  }

  await appendSwarmEvent({
    case_id: input.case_id,
    agent_role: 'VERIFIER',
    event_type: 'evidence.verified',
    severity: human_gate_required ? 'human_required' : 'info',
    message: `Evidence ${input.evidence_id.slice(0, 8)} verified (confidence ${output.confidence.toFixed(2)})`,
    job_id: jobId,
    metadata: {
      evidence_id: input.evidence_id,
      confidence: output.confidence,
      field_confidence: output.field_confidence,
      forgery_risk: output.forgery_risk,
      forgery_flags: output.forgery_flags,
      mismatches: output.mismatches,
      human_review_required: output.human_review_required,
    },
  });
}

export async function runVerifierJob(job: AgentJobRow): Promise<AgentRunResult> {
  const payload = (job.payload_json ?? {}) as Record<string, unknown>;
  const evidenceId = String(payload.evidence_id ?? '');

  const input = await loadVerifierInput(evidenceId);
  const output = await runVerifier(input);
  await applyVerifierSideEffects(input, output, job.id);

  return {
    output: output as unknown as Record<string, unknown>,
    cost_usd: 0,
  };
}
