import 'server-only';

import { buildTemplateFallback, type TemplateLevel } from '@/lib/agents/fallback/index';
import { chatCompletion, extractJsonText, isLlmConfigured } from '@/lib/llm/chat';
import { buildDrafterSystemPrompt } from '@/lib/agents/prompts/drafter';
import { routeModel } from '@/lib/agents/router';
import {
  LetterDraftOutputSchema,
  type LetterDraftOutput,
} from '@/lib/agents/schemas';
import { validateDrafterOutput } from '@/lib/agents/validators';
import { hasGrantedConsent } from '@/lib/consent/record';
import { createUserAction } from '@/lib/user-actions/create';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';
import type { AgentRunResult } from '@/lib/agents/runner';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];
type EscalationLevel = Database['public']['Enums']['escalation_level'];

const LEVEL_CHANNEL: Record<TemplateLevel, Database['public']['Enums']['escalation_channel']> = {
  L1: 'branch_manager',
  L2: 'nodal_officer',
  L3: 'rbi_cms',
};

const WAIT_DAYS: Record<TemplateLevel, number> = {
  L1: 7,
  L2: 10,
  L3: 90,
};

export type DrafterCaseContext = {
  case_id: string;
  level: TemplateLevel;
  intake_json: Record<string, unknown>;
  account_last4: string | null;
  ncrp_id: string | null;
  frozen_amount_paise: number | null;
  frozen_since: string | null;
  proofGateBlocked: boolean;
  placeholderValues: Record<string, string>;
};

export async function checkProofGate(
  caseId: string,
  level: TemplateLevel,
): Promise<boolean> {
  if (level === 'L1') return false;

  const supabase = createAdminClient();
  const priorLevel: EscalationLevel = level === 'L2' ? 'L1' : 'L2';

  const { data } = await supabase
    .from('escalations')
    .select('status, sent_proof_evidence_id')
    .eq('case_id', caseId)
    .eq('level', priorLevel)
    .maybeSingle();

  if (!data) return true;
  if (data.status !== 'sent' && data.status !== 'response_received') return true;
  if (!data.sent_proof_evidence_id) return true;
  return false;
}

export async function loadDrafterContext(
  caseId: string,
  level: TemplateLevel,
): Promise<DrafterCaseContext> {
  const supabase = createAdminClient();

  const { data: caseRow, error } = await supabase
    .from('cases')
    .select('id, intake_json, account_last4, ncrp_id, frozen_amount_paise, frozen_since')
    .eq('id', caseId)
    .single();

  if (error || !caseRow) {
    throw new Error(`case_not_found: ${caseId}`);
  }

  const intake = (caseRow.intake_json ?? {}) as Record<string, unknown>;
  const proofGateBlocked = await checkProofGate(caseId, level);

  const amountInr =
    caseRow.frozen_amount_paise != null
      ? String(Math.round(caseRow.frozen_amount_paise / 100))
      : String(intake.amount_inr ?? '');

  const { data: l1 } = await supabase
    .from('escalations')
    .select('sent_at')
    .eq('case_id', caseId)
    .eq('level', 'L1')
    .maybeSingle();

  const { data: l2 } = await supabase
    .from('escalations')
    .select('sent_at')
    .eq('case_id', caseId)
    .eq('level', 'L2')
    .maybeSingle();

  const placeholderValues: Record<string, string> = {
    USER_NAME: String(intake.user_name ?? intake.full_name ?? ''),
    BANK_NAME: String(intake.bank_name ?? 'State Bank of India'),
    BRANCH_CITY: String(intake.branch_city ?? intake.city ?? ''),
    ACCOUNT_LAST4: caseRow.account_last4 ?? String(intake.account_last4 ?? ''),
    AMOUNT_INR: amountInr,
    FREEZE_DATE: caseRow.frozen_since ?? String(intake.freeze_date ?? ''),
    NCRP_ID: caseRow.ncrp_id ?? String(intake.ncrp_id ?? ''),
    USER_PHONE: String(intake.user_phone ?? intake.phone ?? ''),
    NODAL_EMAIL: String(intake.nodal_email ?? ''),
    L1_SENT_DATE: l1?.sent_at ? l1.sent_at.slice(0, 10) : '',
    L2_SENT_DATE: l2?.sent_at ? l2.sent_at.slice(0, 10) : '',
  };

  return {
    case_id: caseId,
    level,
    intake_json: intake,
    account_last4: caseRow.account_last4,
    ncrp_id: caseRow.ncrp_id,
    frozen_amount_paise: caseRow.frozen_amount_paise,
    frozen_since: caseRow.frozen_since,
    proofGateBlocked,
    placeholderValues,
  };
}

async function draftWithLlm(
  ctx: DrafterCaseContext,
): Promise<LetterDraftOutput | null> {
  if (!isLlmConfigured()) return null;
  if (!(await hasGrantedConsent(ctx.case_id, 'cross_border_ai'))) return null;

  const model = routeModel('DRAFTER', {
    agent_cost_usd: 0,
    level: ctx.level,
  });
  if (model === 'RULE_ENGINE' || model === 'HUMAN_OPS') return null;

  const text = await chatCompletion({
    max_tokens: 4096,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildDrafterSystemPrompt(ctx.level) },
      {
        role: 'user',
        content: JSON.stringify({
          case_id: ctx.case_id,
          level: ctx.level,
          placeholders: ctx.placeholderValues,
          proof_gate_blocked: ctx.proofGateBlocked,
        }),
      },
    ],
  });

  if (!text) return null;

  try {
    const parsed = JSON.parse(extractJsonText(text)) as unknown;
    return LetterDraftOutputSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function runDrafter(
  ctx: DrafterCaseContext,
): Promise<LetterDraftOutput> {
  if (ctx.proofGateBlocked) {
    return buildTemplateFallback(ctx.level, ctx.placeholderValues, {
      proofGateBlocked: true,
      confidence: 0.2,
    });
  }

  const llmDraft = await draftWithLlm(ctx);
  if (llmDraft) {
    const validation = validateDrafterOutput(llmDraft);
    if (validation.valid && llmDraft.confidence >= 0.7) {
      return llmDraft;
    }
  }

  return buildTemplateFallback(ctx.level, ctx.placeholderValues);
}

async function persistDraft(
  ctx: DrafterCaseContext,
  draft: LetterDraftOutput,
  jobId: string,
): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('escalations')
    .select('id')
    .eq('case_id', ctx.case_id)
    .eq('level', ctx.level)
    .maybeSingle();

  type EscalationUpsert = Database['public']['Tables']['escalations']['Insert'] & {
    letter_subject?: string | null;
    letter_body?: string | null;
    created_by_agent?: Database['public']['Enums']['agent_role'] | null;
    metadata_json?: Json;
    status?: Database['public']['Enums']['escalation_status'];
  };

  const row: EscalationUpsert = {
    case_id: ctx.case_id,
    level: ctx.level,
    channel: LEVEL_CHANNEL[ctx.level],
    status: 'pending_approval',
    letter_template_id: draft.template_slug,
    letter_subject: draft.subject,
    letter_body: draft.body,
    wait_days: WAIT_DAYS[ctx.level],
    created_by_agent: 'DRAFTER',
    metadata_json: {
      placeholders_used: draft.placeholders_used,
      placeholders_missing: draft.placeholders_missing,
      disclaimer_block: draft.disclaimer_block,
    } as Json,
  };

  if (existing?.id) {
    await supabase.from('escalations').update(row).eq('id', existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('escalations')
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`persist_draft_failed: ${error?.message ?? 'unknown'}`);
  }

  await createUserAction({
    case_id: ctx.case_id,
    action_type: 'review_letter',
    title: `Review ${ctx.level} draft letter`,
    description: draft.placeholders_missing.length
      ? `Missing fields: ${draft.placeholders_missing.join(', ')}`
      : 'Copy-only draft ready for your review',
    priority: 80,
    escalation_id: data.id,
    metadata: { level: ctx.level, template_slug: draft.template_slug },
  });

  await appendSwarmEvent({
    case_id: ctx.case_id,
    agent_role: 'DRAFTER',
    event_type: 'letter.drafted',
    severity: draft.placeholders_missing.length ? 'warn' : 'info',
    message: `${ctx.level} draft ready (${draft.template_slug})`,
    job_id: jobId,
    metadata: { level: ctx.level, confidence: draft.confidence },
  });

  return data.id;
}

export async function runDrafterJob(job: AgentJobRow): Promise<AgentRunResult> {
  const payload = (job.payload_json ?? {}) as Record<string, unknown>;
  const caseId = String(payload.case_id ?? job.case_id);
  const level = String(payload.level ?? payload.target_level ?? 'L1') as TemplateLevel;

  if (!['L1', 'L2', 'L3'].includes(level)) {
    throw new Error(`unsupported_draft_level: ${level}`);
  }

  const ctx = await loadDrafterContext(caseId, level);
  const draft = await runDrafter(ctx);
  await persistDraft(ctx, draft, job.id);

  return {
    output: draft as unknown as Record<string, unknown>,
    cost_usd: 0,
  };
}