import { describe, expect, it } from 'vitest';
import { buildCaseAwareLines, isDraftOverwritable } from '@/lib/agents/drafter/runner';

describe('isDraftOverwritable — never clobber an approved/sent letter', () => {
  it('allows (re)writing only pre-approval drafts', () => {
    expect(isDraftOverwritable(null)).toBe(true);
    expect(isDraftOverwritable(undefined)).toBe(true);
    expect(isDraftOverwritable('draft')).toBe(true);
    expect(isDraftOverwritable('pending_approval')).toBe(true);
  });

  it('protects a letter the user has already acted on (root of the mark-sent bug)', () => {
    // A late/duplicate re-draft must not revert these back to pending_approval.
    for (const status of ['approved', 'sent', 'response_received', 'timeout'] as const) {
      expect(isDraftOverwritable(status), status).toBe(false);
    }
  });
});

describe('buildCaseAwareLines — freeze-reason-aware, factual grounding', () => {
  it('requests written facts without asserting a legal outcome for a cyber/police freeze', () => {
    const lines = buildCaseAwareLines({}, '25000', 'cyber_upi_chain');
    expect(lines.LEGAL_GROUNDING).toMatch(/written freeze details/i);
    expect(lines.LEGAL_GROUNDING).not.toMatch(/BNSS|Section 107/i);
    expect(lines.DECLARATION_LINE).toMatch(/no knowledge of any fraud/);
  });

  it('does not assert police/BNSS framing for a KYC hold the branch can fix', () => {
    const lines = buildCaseAwareLines({}, '25000', 'kyc_expired');
    expect(lines.LEGAL_GROUNDING).not.toMatch(/BNSS|GRM/i);
    expect(lines.DECLARATION_LINE).not.toMatch(/fraud/i);
  });

  it('does not argue the freeze is unlawful when a court itself ordered it', () => {
    const lines = buildCaseAwareLines({}, '25000', 'court_order');
    expect(lines.LEGAL_GROUNDING).toMatch(/court/i);
    expect(lines.LEGAL_GROUNDING).not.toMatch(/unlawful|disproportionate|arbitrary/i);
    expect(lines.DECLARATION_LINE).not.toMatch(/fraud/i);
  });

  it('points to the tax/GST officer, not BNSS, for a tax attachment', () => {
    const lines = buildCaseAwareLines({}, '25000', 'tax_gst_attachment' as never);
    expect(lines.LEGAL_GROUNDING).toMatch(/tax|GST/i);
    expect(lines.LEGAL_GROUNDING).not.toMatch(/BNSS/);
  });

  it('produces genuinely different legal grounding for different freeze reasons', () => {
    const cyber = buildCaseAwareLines({}, '25000', 'cyber_upi_chain');
    const kyc = buildCaseAwareLines({}, '25000', 'kyc_expired');
    const court = buildCaseAwareLines({}, '25000', 'court_order');
    expect(cyber.LEGAL_GROUNDING).not.toBe(kyc.LEGAL_GROUNDING);
    expect(cyber.LEGAL_GROUNDING).not.toBe(court.LEGAL_GROUNDING);
    expect(kyc.LEGAL_GROUNDING).not.toBe(court.LEGAL_GROUNDING);
  });

  it('asks for the held amount on the cyber track without a sub-₹50k promise', () => {
    const cyber = buildCaseAwareLines({}, '10000', 'cyber_upi_chain');
    const court = buildCaseAwareLines({}, '10000', 'court_order');
    expect(cyber.AMOUNT_RULE_LINE).toMatch(/amount currently held/i);
    expect(court.AMOUNT_RULE_LINE).not.toMatch(/MHA SOP/);
  });

  it('defaults to factual cyber-track wording when freeze reason is unknown/unset', () => {
    const lines = buildCaseAwareLines({}, '25000', null);
    expect(lines.LEGAL_GROUNDING).toMatch(/written freeze details/i);
  });

  it('never asks the branch to RELEASE funds it cannot lift (court/tax)', () => {
    // Regression: the letter used to say "Release the undisputed balance" while
    // also saying the branch cannot lift a court freeze — self-contradictory.
    const court = buildCaseAwareLines({}, '25000', 'court_order');
    expect(court.L1_KEY_REQUESTS).not.toMatch(/release/i);
    expect(court.L1_KEY_REQUESTS).toMatch(/court order details/i);

    const tax = buildCaseAwareLines({}, '25000', 'tax_gst_attachment' as never);
    expect(tax.L1_KEY_REQUESTS).not.toMatch(/release/i);
    expect(tax.L1_KEY_REQUESTS).toMatch(/tax\/GST notice/i);

    // Cyber: request facts and the next authority; never an asserted release outcome.
    const cyber = buildCaseAwareLines({}, '25000', 'cyber_upi_chain');
    expect(cyber.L1_KEY_REQUESTS).not.toMatch(/release the undisputed balance/i);
    expect(cyber.L1_KEY_REQUESTS).toMatch(/confirm whether the amount currently held/i);
    expect(cyber.L1_KEY_REQUESTS).toMatch(/investigating authority/i);
    expect(cyber.L1_KEY_REQUESTS).toMatch(/formal grievance/i);
  });

  it('only claims "proof of legitimate funds" on the cyber track', () => {
    expect(buildCaseAwareLines({}, '25000', 'cyber_upi_chain').ATTACHMENTS_LINE).toMatch(
      /proof of legitimate funds/i,
    );
    expect(buildCaseAwareLines({}, '25000', 'kyc_expired').ATTACHMENTS_LINE).not.toMatch(
      /proof of legitimate funds/i,
    );
    expect(buildCaseAwareLines({}, '25000', 'court_order').ATTACHMENTS_LINE).not.toMatch(
      /proof of legitimate funds/i,
    );
  });
});
