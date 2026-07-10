import { describe, expect, it } from 'vitest';
import { getUnfreezePath } from '@/lib/case/unfreeze-path';

describe('getUnfreezePath', () => {
  it('cyber freeze: branch cannot fix it — the NOC from the cyber cell does', () => {
    const path = getUnfreezePath('cyber_upi_chain');
    expect(path.track).toBe('cyber');
    expect(path.branchCanFix).toBe(false);
    expect(path.headline).toMatch(/branch cannot lift this/i);
    expect(path.keyStep).toMatch(/NOC/);
    // The real ordered path: get details → cyber cell/NOC → submit to bank → rights.
    expect(path.steps).toHaveLength(4);
    expect(path.steps[1].detail).toMatch(/NOC/);
  });

  it('KYC freeze: honest — the branch CAN fix it directly', () => {
    const path = getUnfreezePath('kyc_expired');
    expect(path.track).toBe('branch');
    expect(path.branchCanFix).toBe(true);
    expect(path.headline).toMatch(/branch CAN lift it/i);
    expect(path.keyStep).toMatch(/re-KYC/i);
  });

  it('court and tax freezes: branch cannot fix; routes to the right authority', () => {
    expect(getUnfreezePath('court_order').track).toBe('court');
    expect(getUnfreezePath('court_order').branchCanFix).toBe(false);
    expect(getUnfreezePath('tax_gst_attachment').track).toBe('tax');
    expect(getUnfreezePath('tax_gst_attachment').branchCanFix).toBe(false);
  });

  it('unknown reason defaults to the cyber/NOC path (the most common + highest-stakes)', () => {
    const path = getUnfreezePath(null);
    expect(path.track).toBe('cyber');
    expect(path.branchCanFix).toBe(false);
  });
});
