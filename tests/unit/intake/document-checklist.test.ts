import { describe, expect, it } from 'vitest';
import { getDocumentChecklist } from '@/lib/intake/document-checklist';

const ALL_FREEZE_REASONS = [
  'cyber_upi_chain',
  'suspected_mule',
  'kyc_expired',
  'tax_gst_attachment',
  'court_order',
  'police_notice_bnss106',
  'bank_str',
  'cheque_dishonour',
  'death_nomination_dispute',
] as const;

const VALID_EVIDENCE_TYPES = new Set([
  'freeze_sms',
  'bank_statement',
  'passbook_screenshot',
  'ncrp_acknowledgement',
  'police_fir',
  'pan_card',
  'aadhaar_masked',
  'chat_screenshot',
  'letter_sent_proof',
  'bank_release_letter',
  'court_order',
  'other',
]);

describe('getDocumentChecklist', () => {
  it('returns at least one item for every freeze reason, with a required item and valid evidence types', () => {
    for (const reason of ALL_FREEZE_REASONS) {
      const items = getDocumentChecklist(reason);
      expect(items.length, reason).toBeGreaterThan(0);
      expect(items.some((i) => i.required), `${reason} should have a required doc`).toBe(true);
      for (const item of items) {
        expect(VALID_EVIDENCE_TYPES.has(item.evidence_type), `${reason}: ${item.evidence_type}`).toBe(true);
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.why.length).toBeGreaterThan(0);
      }
    }
  });

  it('mirrors the seeded cyber_upi_chain playbook (freeze_sms + bank_statement required, ncrp optional)', () => {
    const items = getDocumentChecklist('cyber_upi_chain');
    const byType = new Map(items.map((i) => [i.evidence_type, i]));
    expect(byType.get('freeze_sms')?.required).toBe(true);
    expect(byType.get('bank_statement')?.required).toBe(true);
    expect(byType.get('ncrp_acknowledgement')?.required).toBe(false);
  });

  it('falls back to a safe minimal checklist for an unknown/null reason', () => {
    const items = getDocumentChecklist(null);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.required)).toBe(true);
  });
});
