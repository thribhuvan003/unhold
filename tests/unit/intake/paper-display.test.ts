import { describe, expect, it } from 'vitest';
import { papersForReason } from '@/lib/intake/paper-display';

const types = (docs: { type: string }[]) => docs.map((d) => d.type);

describe('papersForReason', () => {
  it('adapts the papers to the freeze reason (not the same 3 every time)', () => {
    const cyber = papersForReason('cyber_upi_chain');
    const kyc = papersForReason('kyc_expired');
    const court = papersForReason('court_order');

    // Different reasons ask for genuinely different papers.
    expect(types(kyc.core)).toContain('aadhaar_masked'); // KYC needs Aadhaar
    expect(types(cyber.core)).not.toContain('aadhaar_masked');
    expect(types(court.core)).toContain('court_order'); // court freeze needs the order
    expect(types(cyber.extras)).toContain('ncrp_acknowledgement'); // cyber → NCRP receipt

    // The reason banner is set.
    expect(cyber.reasonLabel).toMatch(/cyber/i);
    expect(kyc.reasonLabel).toMatch(/kyc/i);
  });

  it('always keeps the universal core (freeze notice, statement, PAN) present', () => {
    for (const reason of ['cyber_upi_chain', 'kyc_expired', 'court_order', 'tax_gst_attachment'] as const) {
      const t = types(papersForReason(reason).core);
      expect(t).toContain('freeze_sms');
      expect(t).toContain('bank_statement');
      expect(t).toContain('pan_card');
    }
  });

  it('falls back to the generic set with no banner when the reason is unknown', () => {
    const unknown = papersForReason(null);
    expect(types(unknown.core)).toEqual(['freeze_sms', 'bank_statement', 'pan_card']);
    expect(unknown.reasonLabel).toBeNull();
  });
});
