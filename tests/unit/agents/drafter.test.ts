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
  USER_ADDRESS: '12 MG Road, Mumbai 400001',
};

describe('drafter template fallback', () => {
  it('produces L1 SBI branch letter with exact disclaimer', () => {
    const draft = buildTemplateFallback('L1', FULL_L1);

    expect(draft.level).toBe('L1');
    expect(draft.template_slug).toBe('branch_lien_release');
    expect(draft.disclaimer_block).toBe('DRAFT ONLY — REVIEW BEFORE USE');
    expect(draft.body).toContain('Rahul Sharma');
    expect(draft.placeholders_missing).toHaveLength(0);
  });

  it('blocks L2 when proof gate not met', () => {
    const draft = buildTemplateFallback('L2', FULL_L1, { proofGateBlocked: true });

    expect(draft.level).toBe('L2');
    expect(draft.template_slug).toBe('nodal_escalation');
    expect(draft.placeholders_missing).toContain('PROOF_GATE_L2');
    expect(draft.confidence).toBeLessThan(0.7);
  });

  it('blocks L3 when proof gate not met', () => {
    const draft = buildTemplateFallback('L3', FULL_L1, { proofGateBlocked: true });

    expect(draft.level).toBe('L3');
    expect(draft.template_slug).toBe('rbi_ombudsman');
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

  it('accepts all templates: their legal citations are on the allowlist', () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const draft = buildTemplateFallback(level, FULL_L1);
      const validation = validateDrafterOutput(draft);
      expect(validation.errors).toHaveLength(0);
    }
  });

  it('accepts grounded BNSS 106/107 citations and letter headings', () => {
    const draft = buildTemplateFallback('L1', FULL_L1);
    const ok = {
      ...draft,
      body: `${draft.body}\nSection 3 — Legal grounding\nAs per BNSS Section 106 and Section 107, only a Magistrate may attach.`,
    };
    expect(validateDrafterOutput(ok).valid).toBe(true);
  });

  it('rejects invented or repealed statute citations (falls back to template)', () => {
    const draft = buildTemplateFallback('L1', FULL_L1);
    for (const citation of ['Section 420 of IPC', 'CrPC 102', 'BNSS 111', 'Section 91']) {
      const bad = { ...draft, body: `${draft.body}\nAs per ${citation}, release the funds.` };
      const validation = validateDrafterOutput(bad);
      expect(validation.valid, `should reject: ${citation}`).toBe(false);
      expect(validation.errors.join(' ')).toContain('unsupported legal citation');
    }
  });

  it('rejects BNSS/police-freeze citations on a non-cyber (KYC/court/tax) track', () => {
    const draft = buildTemplateFallback('L1', FULL_L1);
    const withBnss = { ...draft, body: `${draft.body}\nAs per BNSS Section 106, release the funds.` };
    // Allowed on the cyber track (106/107 are the cyber-freeze grounding)...
    expect(validateDrafterOutput(withBnss, 'cyber').valid).toBe(true);
    // ...but wrong law for a KYC/court/tax freeze, so it must fail and fall back.
    for (const track of ['branch', 'court', 'tax'] as const) {
      const validation = validateDrafterOutput(withBnss, track);
      expect(validation.valid, `should reject BNSS on ${track}`).toBe(false);
      expect(validation.errors.join(' ')).toContain('not valid for');
    }
  });
});