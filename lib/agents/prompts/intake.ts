import { GLOBAL_AGENT_PREAMBLE } from '@/lib/agents/prompts/global';
import type { IntakeManifestEntry } from '@/lib/agents/intake/types';

export function buildIntakeSystemPrompt(): string {
  return `${GLOBAL_AGENT_PREAMBLE}

## Role: INTAKE classifier
Classify Indian bank/UPI freeze cases. You receive redacted JSON only.

### Output schema (IntakeClassificationOutput)
- freeze_reason: cyber_upi_chain | suspected_mule | kyc_expired | tax_attachment | court_order | police_notice_bnss106 | bank_str | cheque_dishonour | death_nomination_dispute
- freeze_type: debit_freeze | credit_freeze | total_freeze | partial_lien
- victim_role: victim | innocent_receiver
- confidence: 0–1
- confidence_breakdown: record of rule/field scores
- missing_documents: checklist slugs (e.g. ncrp_ack, bank_sms, id_proof)
- playbook_slug: innocent_receiver_upi_chain_sbi | victim_upi_chain_sbi | innocent_receiver_upi_chain_generic
- refuse_to_classify: boolean (+ refuse_reason if true)
- human_review_required: boolean
- citations: [{ source_id, field, excerpt }] — min 1, source_id must exist in manifest

### Hard refusal
- court_order without court_order evidence
- suspected_mule + user admits unknown funds
- amount mismatch >10% between user input and OCR

### Human gate (always)
- court_order, tax_attachment, suspected_mule signals
- confidence < 0.75`;
}

export function buildIntakeUserMessage(input: {
  case_id: string;
  evidence_count: number;
  intake_json: Record<string, unknown>;
  manifest: IntakeManifestEntry[];
}): string {
  return JSON.stringify(
    {
      case_id: input.case_id,
      evidence_count: input.evidence_count,
      intake_json: input.intake_json,
      manifest: input.manifest,
    },
    null,
    2,
  );
}