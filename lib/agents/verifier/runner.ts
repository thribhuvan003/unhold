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
import { extractPdfText } from '@/lib/evidence/prepare-pdf';
import type { LlmContentPart } from '@/lib/llm/chat';
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

/** Result for an unreadable PDF (no text layer) — rejected, with a document_kind
 * the UI turns into "upload a photo instead". relevant:false caps its score. */
function pdfNeedsPhotoResult(): VerifierResultOutput {
  return VerifierResultOutputSchema.parse({
    confidence: 0.05,
    field_confidence: {},
    extracted: {},
    forgery_risk: false,
    forgery_flags: [],
    mismatches: [],
    human_review_required: true,
    relevant: false,
    document_kind: 'pdf_no_text',
  });
}

/** The only document_kind values allowed to leave the verifier — the prompt's
 * fixed set plus pdf_no_text. Anything else (incl. a model stuffing PII into
 * the field) is dropped, so no free-text reaches the DB or the browser. */
const KNOWN_DOCUMENT_KINDS = new Set([
  'freeze_notice',
  'bank_statement',
  'government_id',
  'ncrp_receipt',
  'police_fir',
  'payment_screenshot',
  'blank',
  'unrelated',
  'pdf_no_text',
]);

function safeDocumentKind(kind: string | undefined): string | null {
  return kind && KNOWN_DOCUMENT_KINDS.has(kind) ? kind : null;
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

/** A PDF with no readable text layer (scanned / image-only / blank) can't be
 * auto-verified without rasterising it, so we ask the user for a photo instead
 * — never silently trust it. Distinct from `null` (OCR genuinely skipped). */
const PDF_NO_TEXT = Symbol('pdf_no_text');

async function extractWithLlm(
  input: VerifierInput,
): Promise<VerifierResultOutput | typeof PDF_NO_TEXT | null> {
  if (!isLlmConfigured()) return null;
  // ai_ocr_processing consent is granted on case creation when the user accepts
  // the AI-processing block (F) on the consent screen — see app/api/v1/cases.
  // If the user declined AI, this fails safe and OCR never runs on their files.
  if (!(await hasGrantedConsent(input.case_id, 'ai_ocr_processing'))) return null;

  const supabase = createAdminClient();
  const { data: fileData, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .download(input.storage_path);

  if (error || !fileData) return null;

  const original = Buffer.from(await fileData.arrayBuffer());

  let content: LlmContentPart[];
  if (input.mime_type === 'application/pdf') {
    // For PDF statements/notices: extract text (digital) then LLM parse for structure (liens, amounts, dates, refs).
    // Perfect for bank statements with "LIEN ACTIVE", transactions, balances.
    const pdfText = await extractPdfText(original);
    if (!pdfText || pdfText.length < 20) return PDF_NO_TEXT;
    content = [
      { type: 'text', text: buildVerifierUserText(input.frozen_amount_paise) + "\n\nPDF text content:\n" + pdfText.substring(0, 4000) },
    ];
  } else if (SUPPORTED_IMAGE_MIMES.has(input.mime_type ?? '')) {
    // Downscale before vision OCR — big latency win on multi-MB phone photos.
    const { buffer, mime } = await downscaleForVision(original, input.mime_type ?? 'image/jpeg');
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
    content = [
      { type: 'text', text: buildVerifierUserText(input.frozen_amount_paise) },
      { type: 'image_url', image_url: { url: dataUri } },
    ];
  } else {
    return null;
  }

  const text = await chatCompletion({
    vision: input.mime_type !== 'application/pdf',
    max_tokens: 2048,
    temperature: 0.1,
    messages: [
      { role: 'system', content: buildVerifierSystemPrompt() },
      {
        role: 'user',
        content: content,
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

/** `ocrRan` distinguishes "the vision/OCR read happened" (confidence is real)
 * from "OCR was skipped" (unsupported type, no consent, or LLM off) — where the
 * confidence 0 is a placeholder, not a judgement about the document. */
type VerifierRun = { output: VerifierResultOutput; ocrRan: boolean };

async function runVerifierWithMeta(input: VerifierInput): Promise<VerifierRun> {
  const mime = input.mime_type ?? '';
  const isSupported = SUPPORTED_IMAGE_MIMES.has(mime) || mime === 'application/pdf';
  if (!mime || !isSupported) {
    return { output: noOcrResult(), ocrRan: false };
  }

  const llmResult = await extractWithLlm(input);
  if (llmResult === PDF_NO_TEXT) {
    // OCR was attempted (ocrRan:true) but the PDF had no readable text — reject
    // rather than trust, and tell the user to send a photo.
    return { output: pdfNeedsPhotoResult(), ocrRan: true };
  }
  if (!llmResult) return { output: noOcrResult(), ocrRan: false };

  const validation = validateVerifierOutput(llmResult);
  if (!validation.valid) {
    // OCR ran but the read failed our checks — a real "couldn't trust this" read.
    return { output: { ...noOcrResult(), forgery_risk: llmResult.forgery_risk }, ocrRan: true };
  }

  return {
    output: {
      ...llmResult,
      extracted: redactExtractedFields(llmResult.extracted),
      forgery_flags: redactForgeryFlags(llmResult.forgery_flags),
      mismatches: redactMismatches(llmResult.mismatches),
    },
    ocrRan: true,
  };
}

export async function runVerifier(input: VerifierInput): Promise<VerifierResultOutput> {
  return (await runVerifierWithMeta(input)).output;
}

/**
 * What the verifier persists onto the evidence row so the case, papers and
 * letter gates can read it. `vision_confidence` is the real score ONLY when OCR
 * ran; when it didn't, we store null (= "not auto-read", trusted pending human
 * review) rather than 0, so PDFs and no-consent uploads are never wrongly
 * treated as unreadable. Mirrors lib/evidence/readability.ts.
 */
export function verifierEvidencePatch(
  output: VerifierResultOutput,
  ocrRan: boolean,
): { vision_confidence: number | null; forgery_flag: boolean } {
  // An irrelevant document (wrong/blank/unrelated file) is forced to a low
  // score even if the model contradicts itself, so the readability gate rejects
  // it. When OCR did not run we keep null (= not auto-read, trusted pending
  // human review) so PDFs and no-consent uploads are never wrongly blocked.
  const confidence = ocrRan
    ? output.relevant === false
      ? Math.min(output.confidence, 0.1)
      : output.confidence
    : null;
  return {
    vision_confidence: confidence,
    forgery_flag: output.forgery_risk,
  };
}

async function applyVerifierSideEffects(
  input: VerifierInput,
  output: VerifierResultOutput,
  jobId: string,
  ocrRan: boolean,
): Promise<void> {
  const supabase = createAdminClient();

  // Persist the score + forgery flag onto the evidence row (not just the event
  // log) so the case, papers and letter gates can act on them.
  await supabase
    .from('evidence')
    .update({
      vision_extracted_json: output.extracted as Json,
      ...verifierEvidencePatch(output, ocrRan),
    })
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
      relevant: output.relevant,
      document_kind: safeDocumentKind(output.document_kind),
    },
  });
}

export async function runVerifierJob(job: AgentJobRow): Promise<AgentRunResult> {
  const payload = (job.payload_json ?? {}) as Record<string, unknown>;
  const evidenceId = String(payload.evidence_id ?? '');

  const input = await loadVerifierInput(evidenceId);
  const { output, ocrRan } = await runVerifierWithMeta(input);
  await applyVerifierSideEffects(input, output, job.id, ocrRan);

  return {
    output: output as unknown as Record<string, unknown>,
    cost_usd: 0,
  };
}
