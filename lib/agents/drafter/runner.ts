import 'server-only';

import { buildTemplateFallback, type TemplateLevel } from '@/lib/agents/fallback/index';
import { chatCompletion, extractJsonText, isLlmConfigured } from '@/lib/llm/chat';
import { buildDrafterSystemPrompt } from '@/lib/agents/prompts/drafter';
import { retrieveRelevantContext } from '@/lib/rag/retrieve';
import { routeModel } from '@/lib/agents/router';
import { getUnfreezePath, type UnfreezeTrack } from '@/lib/case/unfreeze-path';
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
  freeze_reason: Database['public']['Enums']['freeze_reason'] | null;
  proofGateBlocked: boolean;
  placeholderValues: Record<string, string>;
};

/**
 * All the copy that varies by the freeze's *track* (who can actually lift it —
 * see lib/case/unfreeze-path.ts), kept in ONE place per track so the letter is
 * internally consistent by construction. A court-ordered freeze is not a police
 * freeze and the branch cannot lift it, so that letter must never (a) cite
 * BNSS/GRM, (b) demand the branch "release the balance", or (c) claim "proof of
 * legitimate funds" against a fraud it isn't about. Splitting only cyber-vs-rest
 * produced exactly those contradictions, so each track carries its own set.
 */
type TrackLetterCopy = {
  legalGrounding: string;
  declaration: string;
  /** L1 attachment list — track-specific so a KYC/court/tax letter never claims
   *  "proof of legitimate funds" (a cyber-fraud-only concept). */
  attachments: string;
  /** First-person situation line used when the victim role is unknown; avoids
   *  asserting a fraud dispute for a non-cyber hold. */
  situationFallback: string;
  /** The L1 branch-letter asks AFTER the universal "confirm the freeze details"
   *  item. The branch can act on a cyber lien or a bank/KYC hold, but CANNOT
   *  lift a court or tax freeze — so those ask it to share the order details,
   *  never to release funds. */
  l1KeyRequests: (disputed: boolean, amountInr: string, amount: number) => string;
  /** A correct statement of the amount principle for the L2/L3 escalation
   *  letters — phrased so it never asks the branch to release a freeze it
   *  cannot lift. */
  amountRule: (disputed: boolean, amountInr: string, amount: number) => string;
};

// For a cyber/LEA restriction, ask for the written amount, scope and authority.
// The product must not infer which actor can change it before those facts are
// known or state a universal lien-only rule.
const CYBER_AMOUNT_RULE = (disputed: boolean, amountInr: string, amount: number): string => {
  void amount;
  return disputed
    ? `Please confirm in writing whether the amount currently held is approximately Rs. ${amountInr}, the authority that ordered the hold, and whether any further review is needed.`
    : 'Please confirm in writing the exact amount currently held, the authority that ordered the hold, and whether any further review is needed.';
};

const TRACK_LETTER_COPY: Record<UnfreezeTrack, TrackLetterCopy> = {
  cyber: {
    legalGrounding:
      'Please register this as a formal grievance, provide the written freeze details, and tell me the next official step. I understand that the bank and investigating authority decide any release or modification.',
    declaration:
      'I confirm that the factual details in this letter are accurate to the best of my knowledge and I am willing to provide relevant documents through verified official channels.',
    attachments:
      'the freeze SMS/notice, bank statement, photo ID (masked), and proof of legitimate funds (a salary slip or invoice)',
    situationFallback: 'I am the account holder and need the written restriction details so I can respond through the correct official channel.',
    l1KeyRequests: (disputed, amountInr) =>
      `2. Please confirm whether the amount currently held is ${
        disputed ? `approximately Rs. ${amountInr}` : 'the amount shown in the freeze record'
      }, the authority that ordered it, and whether any further documents are needed from me.\n3. Register this as a formal grievance and provide a reference number. If an investigating authority is involved, please identify it and explain the next official step.`,
    amountRule: CYBER_AMOUNT_RULE,
  },
  branch: {
    legalGrounding:
      'This appears to be a bank-side administrative hold rather than a police or court restriction. Please confirm the required paperwork and restore access when the bank’s requirements are met.',
    declaration:
      'I confirm the details above are true and correct, and I am providing the requested documents in good faith.',
    attachments:
      'the freeze SMS/notice, bank statement, photo ID (masked), and the documents needed to clear this hold',
    situationFallback:
      'I am the account holder and would like to complete whatever is needed to lift this hold.',
    l1KeyRequests: (disputed, amountInr) =>
      disputed
        ? `2. Restore access to my account once the requirements above are met; if any specific amount (approx. Rs. ${amountInr}) must remain held, kindly confirm that in writing.`
        : '2. Restore access to my account once the requirements above are met.',
    amountRule: (disputed, amountInr) =>
      disputed
        ? `Please restore access to my account; if any specific amount (approx. Rs. ${amountInr}) must remain held, kindly confirm that in writing.`
        : 'Please restore access to my account once the requirements above are met.',
  },
  court: {
    legalGrounding:
      'This account was frozen under a court order. Only that court can modify or vacate it; I am asking your branch to confirm the order details (court, case number, amount) so I can respond to it correctly, not to lift the freeze itself.',
    declaration: 'I confirm the details above are true and correct to the best of my knowledge.',
    attachments: 'the freeze SMS/notice, bank statement, and photo ID (masked)',
    situationFallback:
      'I am the account holder and need the order details so I can seek relief from the court that passed it.',
    l1KeyRequests: () =>
      '2. Share the court order details (court, case number, and the amount/scope of the attachment) so I can apply to that court for relief.',
    amountRule: () =>
      'Please confirm that the bank has implemented the amount and scope stated in the court order, without asking the bank to change that order.',
  },
  tax: {
    legalGrounding:
      'This hold follows a tax/GST attachment. Only the tax/GST officer who issued it can release it; I am asking your branch to confirm the notice details so I can take this up with that officer.',
    declaration: 'I confirm the details above are true and correct to the best of my knowledge.',
    attachments: 'the freeze SMS/notice, bank statement, and photo ID (masked)',
    situationFallback:
      'I am the account holder and need the notice details so I can take this up with the tax/GST office.',
    l1KeyRequests: () =>
      '2. Share the tax/GST notice details (issuing office, reference, and the amount attached) so I can take this up with that office.',
    amountRule: () =>
      'Please confirm that the bank has implemented the amount and scope stated in the tax/GST notice, without asking the bank to change that notice.',
  },
};

/**
 * Deterministic, case-specific sentences the templates interpolate, so two
 * different freezes read differently. No LLM — every value is fixed, vetted
 * copy pulled from TRACK_LETTER_COPY; nothing is invented.
 */
export function buildCaseAwareLines(
  intake: Record<string, unknown>,
  amountInr: string,
  freezeReason?: Database['public']['Enums']['freeze_reason'] | null,
): Record<string, string> {
  const freezeType = String(intake.freeze_type_hint ?? '');
  const role = String(intake.user_role ?? '');
  const amount = Number(amountInr);
  const disputed = Number.isFinite(amount) && amount > 0;
  const copy = TRACK_LETTER_COPY[getUnfreezePath(freezeReason).track];

  const FREEZE_DESCRIPTION =
    freezeType === 'total_freeze'
      ? 'a total freeze — I am unable to access any funds in the account'
      : freezeType === 'debit_freeze'
        ? 'a debit freeze — credits are allowed but I cannot withdraw or transfer any money'
        : freezeType === 'partial_lien'
          ? 'a lien marked on part of my balance'
          : 'a lien / debit freeze';

  const SITUATION_LINE =
    role === 'receiver'
      ? 'Money I did not expect was credited to my account, after which I found the account restricted. I am asking for the transaction and authority details so I can respond accurately.'
      : role === 'sender'
        ? 'I made a payment that I believed was genuine, after which I found the account restricted. I am asking for the transaction and authority details so I can respond accurately.'
        : copy.situationFallback;

  return {
    FREEZE_DESCRIPTION,
    SITUATION_LINE,
    AMOUNT_RULE_LINE: copy.amountRule(disputed, amountInr, amount),
    LEGAL_GROUNDING: copy.legalGrounding,
    DECLARATION_LINE: copy.declaration,
    ATTACHMENTS_LINE: copy.attachments,
    L1_KEY_REQUESTS: copy.l1KeyRequests(disputed, amountInr, amount),
  };
}

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
    .select('id, intake_json, account_last4, ncrp_id, frozen_amount_paise, frozen_since, freeze_reason')
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

  // Case-aware sentences so different situations produce genuinely different
  // letters — freeze type, user role and freeze-reason track — without an LLM
  // or an inferred legal rule.
  const caseLines = buildCaseAwareLines(intake, amountInr, caseRow.freeze_reason);

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
    TODAY_DATE: new Date().toISOString().slice(0, 10),
    USER_NAME: String(intake.user_name ?? intake.full_name ?? ''),
    // No silent bank default: an empty value lands in placeholders_missing and
    // the user must fill their real bank before the letter unlocks.
    BANK_NAME: String(intake.bank_name ?? ''),
    BRANCH_CITY: String(intake.branch_city ?? intake.city ?? ''),
    ACCOUNT_LAST4: caseRow.account_last4 ?? String(intake.account_last4 ?? ''),
    AMOUNT_INR: amountInr,
    FREEZE_DATE: caseRow.frozen_since ?? String(intake.freeze_date ?? ''),
    NCRP_ID: caseRow.ncrp_id ?? String(intake.ncrp_id ?? ''),
    USER_PHONE: String(intake.user_phone ?? intake.phone ?? ''),
    USER_ADDRESS: String(intake.user_address ?? ''),
    NODAL_EMAIL: String(intake.nodal_email ?? ''),
    L1_SENT_DATE: l1?.sent_at ? l1.sent_at.slice(0, 10) : '',
    L2_SENT_DATE: l2?.sent_at ? l2.sent_at.slice(0, 10) : '',
    ...caseLines,
  };

  return {
    case_id: caseId,
    level,
    intake_json: intake,
    account_last4: caseRow.account_last4,
    ncrp_id: caseRow.ncrp_id,
    frozen_amount_paise: caseRow.frozen_amount_paise,
    frozen_since: caseRow.frozen_since,
    freeze_reason: caseRow.freeze_reason,
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

  // Ground the letter in the curated corpus so it can distinguish official
  // routes and avoid inventing legal rules. Best-effort.
  let grounding = '';
  try {
    const query =
      `Escalation letter ${ctx.level} to ${LEVEL_CHANNEL[ctx.level]} for a bank/UPI freeze case; ` +
      `request written hold details, the ordering authority, and the next official step. ${String(ctx.intake_json.narration ?? '')} ${String(ctx.intake_json.freeze_reason ?? '')}`;
    const chunks = await retrieveRelevantContext(query, 5);
    if (chunks.length > 0) {
      grounding =
        '\n\nGROUNDING — reviewed India bank-restriction context. ' +
        'Use ONLY items tagged [current]/[high]; never cite [verify]/[low] items as settled law, and never invent a citation.\n' +
        chunks
          .map(
            (c) =>
              `- [${c.currency ?? '?'}/${c.confidence ?? '?'}] ${c.title}: ${c.content}` +
              (c.source ? ` (Source: ${c.source})` : ''),
          )
          .join('\n');
    }
  } catch {
    // grounding is best-effort
  }

  const text = await chatCompletion({
    max_tokens: 4096,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildDrafterSystemPrompt(ctx.level) + grounding },
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
    // Enforce the freeze-reason track: a KYC/court/tax letter that (despite the
    // prompt) cites BNSS/police-freeze law is legally wrong, so it fails
    // validation and we fall back to the correct deterministic template.
    const track = getUnfreezePath(ctx.freeze_reason).track;
    const validation = validateDrafterOutput(llmDraft, track);
    if (validation.valid && llmDraft.confidence >= 0.7) {
      return llmDraft;
    }
  }

  return buildTemplateFallback(ctx.level, ctx.placeholderValues);
}

/**
 * A draft may only be (re)written while it is still pre-approval. Once the user
 * has approved or sent the letter, a late or duplicate re-draft (e.g. a lingering
 * queued draft_letter job draining after the user acted) must NOT revert it to
 * pending_approval or overwrite the reviewed body — that silently loses the
 * approval and can block / 422 the next escalation level.
 */
export function isDraftOverwritable(
  status: Database['public']['Enums']['escalation_status'] | null | undefined,
): boolean {
  return status === null || status === undefined || status === 'draft' || status === 'pending_approval';
}

async function persistDraft(
  ctx: DrafterCaseContext,
  draft: LetterDraftOutput,
  jobId: string,
): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('escalations')
    .select('id, status')
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
    // Guard: don't clobber a letter the user has already approved/sent.
    if (!isDraftOverwritable(existing.status)) {
      return existing.id;
    }
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

export async function createDrafterDraftNow(
  caseId: string,
  level: TemplateLevel,
  jobId = 'inline-draft',
): Promise<string> {
  const ctx = await loadDrafterContext(caseId, level);
  const draft = await runDrafter(ctx);
  return persistDraft(ctx, draft, jobId);
}
