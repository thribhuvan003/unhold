import { describe, expect, it } from 'vitest';
import { buildTemplateFallback } from '@/lib/agents/fallback/index';
import { validateDrafterOutput } from '@/lib/agents/validators';

const FULL_L1 = {
  USER_NAME: 'Rahul Sharma',
  BANK_NAME: 'State Bank of India',
  BRANCH_CITY: 'Mumbai',
  ACCOUNT_LAST4: '1234',
  AMOUNT_INR: '25000',
  FREEZE_DATE: '2025-01-15',
  NCRP_ID: '12345678901234',
  USER_PHONE: '9876543210',
};

describe('drafter template fallback', () => {
  it('produces L1 SBI branch letter with exact disclaimer', () => {
    const draft = buildTemplateFallback('L1', FULL_L1);

    expect(draft.level).toBe('L1');
    expect(draft.template_slug).toBe('sbi_branch_lien_release');
    expect(draft.disclaimer_block).toBe('DRAFT ONLY — REVIEW BEFORE USE');
    expect(draft.body).toContain('Rahul Sharma');
    expect(draft.placeholders_missing).toHaveLength(0);
  });

  it('blocks L2 when proof gate not met', () => {
    const draft = buildTemplateFallback('L2', FULL_L1, { proofGateBlocked: true });

    expect(draft.level).toBe('L2');
    expect(draft.template_slug).toBe('sbi_nodal_escalation');
    expect(draft.placeholders_missing).toContain('PROOF_GATE_L2');
    expect(draft.confidence).toBeLessThan(0.7);
  });

  it('blocks L3 when proof gate not met', () => {
    const draft = buildTemplateFallback('L3', FULL_L1, { proofGateBlocked: true });

    expect(draft.level).toBe('L3');
    expect(draft.template_slug).toBe('rbi_ombudsman_sbi');
    expect(draft.placeholders_missing).toContain('PROOF_GATE_L3');
  });

  it('lists missing placeholders when intake incomplete', () => {
    const draft = buildTemplateFallback('L1', { USER_NAME: 'Test User' });

    expect(draft.placeholders_missing.length).toBeGreaterThan(0);
    const validation = validateDrafterOutput(draft);
    expect(validation.human_gate_required).toBe(true);
  });

  it('validateDrafterOutput rejects wrong disclaimer', () => {
    const draft = buildTemplateFallback('L1', FULL_L1);
    const bad = { ...draft, disclaimer_block: 'WRONG' as typeof draft.disclaimer_block };
    const validation = validateDrafterOutput(bad);
    expect(validation.valid).toBe(false);
  });
});