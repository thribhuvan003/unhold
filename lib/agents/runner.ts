import 'server-only';

import { runDrafterJob } from '@/lib/agents/drafter/runner';
import { runIntakeJob } from '@/lib/agents/intake/runner';
import {
  EscalatorSuggestionOutputSchema,
  IntakeClassificationOutputSchema,
  LetterDraftOutputSchema,
  MonitorTickOutputSchema,
  VerifierResultOutputSchema,
} from '@/lib/agents/schemas';
import type { Database } from '@/supabase/database.types';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

export type AgentRunResult = {
  output: Record<string, unknown>;
  cost_usd?: number;
};

const OUTPUT_SCHEMA_BY_JOB: Record<string, { parse: (v: unknown) => unknown }> = {
  intake_classify: IntakeClassificationOutputSchema,
  monitor_tick: MonitorTickOutputSchema,
  verifier_extract: VerifierResultOutputSchema,
  draft_letter: LetterDraftOutputSchema,
  escalator_suggest: EscalatorSuggestionOutputSchema,
};

/**
 * AGENT LOOP — bounded single-job execution.
 */
export async function runAgentJob(job: AgentJobRow): Promise<AgentRunResult> {
  if (job.job_type === 'intake_classify') {
    return runIntakeJob(job);
  }
  if (job.job_type === 'draft_letter') {
    return runDrafterJob(job);
  }

  const schema = OUTPUT_SCHEMA_BY_JOB[job.job_type];
  if (!schema) {
    if (job.agent_role === 'EVIDENCE') {
      return {
        output: {
          bundle_sha256: null,
          manifest_json: {},
          status: 'pending_implementation',
        },
      };
    }
    throw new Error(`unknown_job_type: ${job.job_type}`);
  }

  // Placeholder until slice-05 wires Anthropic SDK + prompts/product/*
  const stubOutput = buildStubOutput(job.job_type);
  schema.parse(stubOutput);

  return { output: stubOutput as Record<string, unknown>, cost_usd: 0 };
}

function buildStubOutput(jobType: string): unknown {
  switch (jobType) {
    case 'intake_classify':
      return {
        freeze_reason: 'cyber_upi_chain',
        freeze_type: 'debit_freeze',
        victim_role: 'innocent_receiver',
        confidence: 0.5,
        confidence_breakdown: { rules: 0.5 },
        missing_documents: ['ncrp_ack'],
        playbook_slug: 'innocent_receiver_upi_chain_sbi',
        refuse_to_classify: false,
        human_review_required: true,
        citations: [{ source_id: 'intake_json', field: 'narration', excerpt: 'UPI lien' }],
      };
    case 'monitor_tick':
      return {
        message: 'Stub monitor tick — implement in slice-09',
        user_action_required: false,
        suggest_status_transition: null,
        quiet_hours_suppressed: false,
      };
    case 'verifier_extract':
      return {
        confidence: 0.5,
        field_confidence: {},
        extracted: {},
        forgery_risk: false,
        forgery_flags: [],
        mismatches: [],
        human_review_required: true,
      };
    case 'draft_letter':
      return {
        subject: 'Stub draft',
        body: 'Implement in slice-07',
        level: 'L1',
        template_slug: 'sbi_branch_lien_release',
        placeholders_used: [],
        placeholders_missing: ['USER_NAME'],
        confidence: 0.5,
        disclaimer_block: 'DRAFT ONLY — REVIEW BEFORE USE',
        language: 'en',
      };
    case 'escalator_suggest':
      return {
        can_escalate: false,
        blocked_reason: 'stub',
        proof_gate_passed: false,
        suggest_drafter: false,
      };
    default:
      return {};
  }
}