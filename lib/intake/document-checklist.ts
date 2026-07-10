import type { Database } from '@/supabase/database.types';

type FreezeReason = Database['public']['Enums']['freeze_reason'];
type EvidenceType = Database['public']['Enums']['evidence_type'];

export type ChecklistItem = {
  evidence_type: EvidenceType;
  required: boolean;
  label: string;
  /** Plain-language reason this document helps — humane context for a stressed user. */
  why: string;
};

const FREEZE_SMS: ChecklistItem = {
  evidence_type: 'freeze_sms',
  required: true,
  label: 'Bank freeze SMS or notice',
  why: 'Shows the date and exact wording of the freeze — the starting point for any letter.',
};
const BANK_STATEMENT: ChecklistItem = {
  evidence_type: 'bank_statement',
  required: true,
  label: 'Statement showing the lien / freeze entry',
  why: 'Proves the amount held and where the funds came from.',
};
const PAN_MASKED: ChecklistItem = {
  evidence_type: 'pan_card',
  required: true,
  label: 'PAN (masked upload)',
  why: 'Confirms your identity to the bank. Upload a masked copy.',
};

/**
 * Deterministic document checklist per freeze reason. Mirrors the seeded
 * playbook checklist_json shape (010_rls_views_seed.sql) and uses only
 * evidence_type enum values. Advisory suggestions, not legal advice.
 */
const CHECKLISTS: Record<FreezeReason, ChecklistItem[]> = {
  cyber_upi_chain: [
    FREEZE_SMS,
    BANK_STATEMENT,
    { evidence_type: 'ncrp_acknowledgement', required: false, label: 'NCRP 14-digit acknowledgement', why: 'If you filed on cybercrime.gov.in, this links your case to the investigation.' },
    PAN_MASKED,
    { evidence_type: 'chat_screenshot', required: false, label: 'UPI transaction chat / screenshot', why: 'Helps show the incoming payment was unsolicited or legitimate.' },
  ],
  suspected_mule: [
    FREEZE_SMS,
    BANK_STATEMENT,
    { evidence_type: 'chat_screenshot', required: false, label: 'Proof the payment was genuine (chat / invoice)', why: 'Counters the suspicion that your account was used to move fraud funds.' },
    PAN_MASKED,
  ],
  kyc_expired: [
    FREEZE_SMS,
    PAN_MASKED,
    { evidence_type: 'aadhaar_masked', required: true, label: 'Aadhaar (masked) or address proof', why: 'KYC freezes usually lift once identity/address documents are re-verified.' },
    { evidence_type: 'passbook_screenshot', required: false, label: 'Passbook / account details', why: 'Helps the branch match your re-KYC to the account.' },
  ],
  tax_gst_attachment: [
    FREEZE_SMS,
    BANK_STATEMENT,
    { evidence_type: 'court_order', required: false, label: 'Tax / GST notice or order (if you have it)', why: 'The attachment usually references a tax demand — the order shows what is required.' },
    PAN_MASKED,
  ],
  court_order: [
    FREEZE_SMS,
    { evidence_type: 'court_order', required: true, label: 'Copy of the court order / notice', why: 'The bank acts on the order — you need its details to respond correctly.' },
    BANK_STATEMENT,
  ],
  police_notice_bnss106: [
    FREEZE_SMS,
    { evidence_type: 'police_fir', required: true, label: 'Police notice / FIR copy', why: 'BNSS 106 freezes stem from a police request — the notice shows what they need.' },
    BANK_STATEMENT,
    PAN_MASKED,
  ],
  bank_str: [
    FREEZE_SMS,
    BANK_STATEMENT,
    { evidence_type: 'chat_screenshot', required: false, label: 'Explanation of the flagged transaction', why: 'A suspicious-transaction-report freeze lifts when the activity is explained.' },
    PAN_MASKED,
  ],
  cheque_dishonour: [
    FREEZE_SMS,
    BANK_STATEMENT,
    { evidence_type: 'passbook_screenshot', required: false, label: 'Passbook / cheque details', why: 'Helps the branch tie the hold to the specific cheque.' },
  ],
  death_nomination_dispute: [
    BANK_STATEMENT,
    { evidence_type: 'other', required: true, label: 'Death certificate / nomination proof', why: 'Releasing funds in a nomination dispute needs proof of entitlement.' },
    PAN_MASKED,
  ],
};

/** Returns the document checklist for a freeze reason, or a safe minimal default when unknown. */
export function getDocumentChecklist(reason: FreezeReason | null | undefined): ChecklistItem[] {
  if (reason && CHECKLISTS[reason]) return CHECKLISTS[reason];
  return [FREEZE_SMS, BANK_STATEMENT, PAN_MASKED];
}

/** Short, plain-language label for a freeze reason — for case headers and summaries. */
export const FREEZE_REASON_LABEL: Record<FreezeReason, string> = {
  cyber_upi_chain: 'Cyber / UPI fraud freeze',
  suspected_mule: 'Suspected misuse of account (not an accusation against you)',
  kyc_expired: 'KYC / verification freeze',
  tax_gst_attachment: 'Tax / GST attachment',
  court_order: 'Court order',
  police_notice_bnss106: 'Police notice (BNSS 106)',
  bank_str: 'Bank suspicious-transaction freeze',
  cheque_dishonour: 'Cheque dishonour',
  death_nomination_dispute: 'Nomination / succession hold',
};

export function getFreezeReasonLabel(reason: FreezeReason | null | undefined): string | null {
  return reason ? FREEZE_REASON_LABEL[reason] : null;
}
