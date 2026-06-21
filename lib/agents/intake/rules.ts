import {
  IntakeClassificationOutputSchema,
  type IntakeClassificationOutput,
} from '@/lib/agents/schemas';
import type { IntakeClassifierInput } from '@/lib/agents/intake/types';

const HUMAN_GATE_REASONS = new Set(['court_order', 'tax_attachment', 'suspected_mule']);

const MISSING_DOC_LABELS: Record<string, { title: string; evidence_type: string }> = {
  ncrp_ack: { title: 'Upload NCRP acknowledgement', evidence_type: 'ncrp_acknowledgement' },
  bank_sms: { title: 'Upload bank freeze SMS screenshot', evidence_type: 'freeze_sms' },
  id_proof: { title: 'Upload masked ID proof', evidence_type: 'aadhaar_masked' },
  court_order_doc: { title: 'Upload court order document', evidence_type: 'court_order' },
};

export { MISSING_DOC_LABELS };

function textBlob(input: IntakeClassifierInput): string {
  const parts = [
    JSON.stringify(input.intake_json),
    ...input.manifest.map((m) => `${m.field}:${m.value}`),
  ];
  return parts.join(' ').toLowerCase();
}

function citation(
  input: IntakeClassifierInput,
  field: string,
  excerpt: string,
): IntakeClassificationOutput['citations'][number] {
  const source = input.manifest.find((m) => m.field === field) ?? input.manifest[0];
  return {
    source_id: source?.source_id ?? 'intake_json',
    field,
    excerpt: excerpt.slice(0, 200),
  };
}

function hasEvidenceType(input: IntakeClassifierInput, type: string): boolean {
  return (input.evidence_types ?? []).includes(type);
}

function amountMismatch(input: IntakeClassifierInput): boolean {
  const userAmount = Number(input.intake_json.amount_inr ?? input.intake_json.amount_paise ?? 0);
  const ocrAmount = Number(
    input.intake_json.ocr_amount_inr ?? input.intake_json.vision_amount_inr ?? 0,
  );
  if (!userAmount || !ocrAmount) return false;
  const user = userAmount > 10000 ? userAmount : userAmount; // paise heuristic
  const ocr = ocrAmount;
  const ratio = Math.abs(user - ocr) / Math.max(user, ocr);
  return ratio > 0.1;
}

function detectFreezeReason(input: IntakeClassifierInput): IntakeClassificationOutput['freeze_reason'] {
  const blob = textBlob(input);
  const hint = String(input.intake_json.freeze_reason_hint ?? '').toLowerCase();

  if (hint.includes('court') || blob.includes('court order')) return 'court_order';
  if (hint.includes('tax') || hint.includes('gst') || blob.includes('tax attachment')) {
    return 'tax_attachment';
  }
  if (
    hint.includes('mule') ||
    blob.includes('suspected mule') ||
    input.intake_json.admits_unknown_funds === true
  ) {
    return 'suspected_mule';
  }
  if (blob.includes('kyc') || blob.includes('re-kyc')) return 'kyc_expired';
  if (blob.includes('cheque') && blob.includes('dishonour')) return 'cheque_dishonour';
  if (blob.includes('bnss') || blob.includes('police notice')) return 'police_notice_bnss106';
  if (blob.includes('str') || blob.includes('suspicious transaction')) return 'bank_str';
  if (blob.includes('nomination') || blob.includes('death')) return 'death_nomination_dispute';
  return 'cyber_upi_chain';
}

function detectVictimRole(input: IntakeClassifierInput): IntakeClassificationOutput['victim_role'] {
  const role = String(input.intake_json.user_role ?? input.intake_json.victim_role ?? '').toLowerCase();
  if (role === 'victim' || role === 'sender') return 'victim';
  return 'innocent_receiver';
}

function detectFreezeType(input: IntakeClassifierInput): IntakeClassificationOutput['freeze_type'] {
  const hint = String(input.intake_json.freeze_type_hint ?? 'debit_freeze').toLowerCase();
  if (hint.includes('credit')) return 'credit_freeze';
  if (hint.includes('total')) return 'total_freeze';
  if (hint.includes('partial') || hint.includes('lien')) return 'partial_lien';
  return 'debit_freeze';
}

function playbookFor(
  reason: IntakeClassificationOutput['freeze_reason'],
  role: IntakeClassificationOutput['victim_role'],
  bankSlug: string,
): string {
  if (reason === 'suspected_mule') return 'innocent_receiver_upi_chain_generic';
  const bank = bankSlug.toLowerCase();
  if (role === 'victim') return bank.includes('sbi') ? 'victim_upi_chain_sbi' : 'victim_upi_chain_sbi';
  if (bank.includes('sbi')) return 'innocent_receiver_upi_chain_sbi';
  return 'innocent_receiver_upi_chain_generic';
}

function missingDocuments(input: IntakeClassifierInput): string[] {
  const missing: string[] = [];
  if (!hasEvidenceType(input, 'ncrp_acknowledgement') && !input.intake_json.ncrp_id) {
    missing.push('ncrp_ack');
  }
  if (!hasEvidenceType(input, 'freeze_sms')) missing.push('bank_sms');
  if (!hasEvidenceType(input, 'aadhaar_masked') && !hasEvidenceType(input, 'pan_card')) {
    missing.push('id_proof');
  }
  if (
    detectFreezeReason(input) === 'court_order' &&
    !hasEvidenceType(input, 'court_order')
  ) {
    missing.push('court_order_doc');
  }
  return missing;
}

/**
 * Deterministic rule engine — used when evidence_count === 0 or LLM unavailable.
 */
export function classifyIntakeFromRules(input: IntakeClassifierInput): IntakeClassificationOutput {
  const freeze_reason = detectFreezeReason(input);
  const victim_role = detectVictimRole(input);
  const freeze_type = detectFreezeType(input);
  const bankSlug = String(input.intake_json.bank_slug ?? 'sbi');
  const missing_documents = missingDocuments(input);

  let refuse_to_classify = false;
  let refuse_reason: string | undefined;
  let confidence = 0.82;
  const confidence_breakdown: Record<string, number> = { rules: 0.82 };

  if (amountMismatch(input)) {
    refuse_to_classify = true;
    refuse_reason = 'amount_mismatch_gt_10pct';
    confidence = 0.4;
    confidence_breakdown.rules = 0.4;
  }

  if (freeze_reason === 'court_order' && !hasEvidenceType(input, 'court_order')) {
    refuse_to_classify = true;
    refuse_reason = 'court_order_without_evidence';
    confidence = 0.35;
    confidence_breakdown.rules = 0.35;
  }

  if (
    freeze_reason === 'suspected_mule' &&
    input.intake_json.admits_unknown_funds === true
  ) {
    refuse_to_classify = true;
    refuse_reason = 'mule_admitted_unknown_funds';
    confidence = 0.3;
    confidence_breakdown.rules = 0.3;
  } else if (freeze_reason === 'suspected_mule' && victim_role === 'innocent_receiver') {
    refuse_to_classify = true;
    refuse_reason = 'mule_no_innocent_receiver_playbook';
    confidence = 0.35;
    confidence_breakdown.rules = 0.35;
  }

  const human_review_required =
    refuse_to_classify ||
    confidence < 0.75 ||
    HUMAN_GATE_REASONS.has(freeze_reason) ||
    missing_documents.length > 0;

  const output: IntakeClassificationOutput = {
    freeze_reason,
    freeze_type,
    victim_role,
    confidence,
    confidence_breakdown,
    missing_documents,
    playbook_slug: refuse_to_classify
      ? 'innocent_receiver_upi_chain_generic'
      : playbookFor(freeze_reason, victim_role, bankSlug),
    refuse_to_classify,
    refuse_reason,
    human_review_required,
    citations: [
      citation(input, 'narration', String(input.intake_json.narration ?? freeze_reason)),
    ],
  };

  return IntakeClassificationOutputSchema.parse(output);
}