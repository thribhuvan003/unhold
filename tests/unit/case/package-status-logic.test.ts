import { describe, expect, it } from 'vitest';
import { getUnfreezePath } from '@/lib/case/unfreeze-path';
import { isCourtOrTaxTrack } from '@/components/case/CourtTaxActionsCard';

describe('track routing for package / authority cards (mid-2026 domain)', () => {
  it('defaults unknown freezes to cyber (IO + GRM path)', () => {
    expect(getUnfreezePath(null).track).toBe('cyber');
    expect(getUnfreezePath('cyber_upi_chain').track).toBe('cyber');
    expect(getUnfreezePath('suspected_mule').track).toBe('cyber');
  });

  it('routes court and tax away from cyber authority', () => {
    expect(getUnfreezePath('court_order').track).toBe('court');
    expect(getUnfreezePath('tax_gst_attachment').track).toBe('tax');
    expect(isCourtOrTaxTrack('court')).toBe(true);
    expect(isCourtOrTaxTrack('tax')).toBe(true);
    expect(isCourtOrTaxTrack('cyber')).toBe(false);
    expect(isCourtOrTaxTrack('branch')).toBe(false);
  });

  it('branch-fixable reasons stay branch', () => {
    expect(getUnfreezePath('kyc_expired').track).toBe('branch');
  });
});
