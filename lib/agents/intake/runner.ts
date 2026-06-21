import 'server-only';

import { buildIntakeSystemPrompt, buildIntakeUserMessage } from '@/lib/agents/prompts/intake';
import { extractJsonText, isNvidiaLlmConfigured, nvidiaChatCompletion } from '@/lib/llm/nvidia';
import { buildIntakeManifest } from '@/lib/agents/intake/manifest';
import { classifyIntakeFromRules } from '@/lib/agents/intake/rules';
import type { IntakeClassifierInput } from '@/lib/agents/intake/types';
import { routeModel } from '@/lib/agents/router';
import {
  IntakeClassificationOutputSchema,
  type IntakeClassificationOutput,
} from '@/lib/agents/schemas';
import { validateIntakeOutput } from '@/lib/agents/validators';
import { hasGrantedConsent } from '@/lib/consent/record';
import { createUserActionsFromIntake } from '@/lib/user-actions/create';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';
import type { AgentRunResult } from '@/lib/agents/runner';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

const FREEZE_REASON_DB_MAP: Partial<
  Record<IntakeClassificationOutput['freeze_reason'], Database['public']['Enums']['freeze_reason']>
> = {
  tax_attachment: 'tax_gst_attachment',
};

export async function loadIntakeClassifierInput(
  caseId: string,
): Promise<IntakeClassifierInput> {
  const supabase = createAdminClient();

  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, intake_json')
    .eq('id', caseId)
    .single();

  if (caseError || !caseRow) {
    throw new Error(`case_not_found: ${caseId}`);
  }

  const { data: evidence } = await supabase
    .from('evidence')
    .select('id, evidence_type')
    .eq('case_id', caseId)
    .is('deleted_at', null);

  const intakeJson = (caseRow.intake_json ?? {}) as Record<string, unknown>;
  const evidenceRows = evidence ?? [];

  return {
    case_id: caseId,
    evidence_count: evidenceRows.length,
    intake_json: intakeJson,
    manifest: buildIntakeManifest(intakeJson, evidenceRows),
    evidence_types: evidenceRows.map((e) => e.evidence_type),
  };
}

async function classifyWithLlm(input: IntakeClassifierInput): Promise<IntakeClassificationOutput> {
  if (!isNvidiaLlmConfigured()) {
    return classifyIntakeFromRules(input);
  }

  if (!(await hasGrantedConsent(input.case_id, 'cross_border_ai'))) {
    return classifyIntakeFromRules(input);
  }

  const model = routeModel('INTAKE', { agent_cost_usd: 0, evidence_count: input.evidence_count });
  if (model === 'RULE_ENGINE' || model === 'HUMAN_OPS') {
    return classifyIntakeFromRules(input);
  }

  const text = await nvidiaChatCompletion({
    model,
    max_tokens: 2048,
    temperature: 0.2,
    messages: [
      { role: 'system', content: buildIntakeSystemPrompt() },
      { role: 'user', content: buildIntakeUserMessage(input) },
    ],
  });

  if (!text) {
    return classifyIntakeFromRules(input);
  }

  try {
    const parsed = JSON.parse(extractJsonText(text)) as unknown;
    return IntakeClassificationOutputSchema.parse(parsed);
  } catch {
    return classifyIntakeFromRules(input);
  }
}

export async function runIntakeClassification(
  input: IntakeClassifierInput,
): Promise<IntakeClassificationOutput> {
  const output =
    input.evidence_count === 0
      ? classifyIntakeFromRules(input)
      : await classifyWithLlm(input);

  const sourceIds = new Set(input.manifest.map((m) => m.source_id));
  const validation = validateIntakeOutput(output, sourceIds);
  if (!validation.valid) {
    const fallback = classifyIntakeFromRules(input);
    fallback.human_review_required = true;
    fallback.confidence = Math.min(fallback.confidence, 0.5);
    return fallback;
  }

  return output;
}

async function applyIntakeSideEffects(
  caseId: string,
  output: IntakeClassificationOutput,
  jobId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const dbFreezeReason =
    FREEZE_REASON_DB_MAP[output.freeze_reason] ?? output.freeze_reason;

  type CasePatch = Database['public']['Tables']['cases']['Update'] & {
    classification_confidence?: number;
    user_action_required?: boolean;
    last_activity_at?: string;
  };

  await supabase
    .from('cases')
    .update({
      freeze_reason: dbFreezeReason as Database['public']['Enums']['freeze_reason'],
      freeze_type: output.freeze_type,
      victim_role: output.victim_role,
      classification_confidence: output.confidence,
      user_action_required: output.missing_documents.length > 0 || output.human_review_required,
      last_activity_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['cases']['Update'])
    .eq('id', caseId);

  await createUserActionsFromIntake(caseId, output.missing_documents);

  if (output.human_review_required) {
    await supabase.from('human_gate_queue').insert({
      case_id: caseId,
      queue_reason: output.refuse_to_classify
        ? `intake_refuse:${output.refuse_reason ?? 'unknown'}`
        : 'intake_low_confidence',
      priority: output.refuse_to_classify ? 80 : 50,
      metadata_json: { classification: output } as Json,
    });
  }

  await appendSwarmEvent({
    case_id: caseId,
    agent_role: 'INTAKE',
    event_type: 'intake.classified',
    severity: output.human_review_required ? 'human_required' : 'info',
    message: output.refuse_to_classify
      ? `Intake refused: ${output.refuse_reason ?? 'review required'}`
      : `Classified as ${output.freeze_reason} (${output.playbook_slug})`,
    job_id: jobId,
    metadata: { confidence: output.confidence, playbook_slug: output.playbook_slug },
  });
}

export async function runIntakeJob(job: AgentJobRow): Promise<AgentRunResult> {
  const payload = (job.payload_json ?? {}) as Record<string, unknown>;
  const caseId = String(payload.case_id ?? job.case_id);

  const input = await loadIntakeClassifierInput(caseId);
  const output = await runIntakeClassification(input);

  await applyIntakeSideEffects(caseId, output, job.id);

  return {
    output: output as unknown as Record<string, unknown>,
    cost_usd: 0,
  };
}