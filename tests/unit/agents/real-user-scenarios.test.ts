import { describe, expect, it } from 'vitest';
import scenarios from '@/tests/golden/real_user_scenarios.json';
import { classifyIntakeFromRules } from '@/lib/agents/intake/rules';
import type { IntakeClassifierInput } from '@/lib/agents/intake/types';
import type { IntakeClassificationOutput } from '@/lib/agents/schemas';
import { getDocumentChecklist } from '@/lib/intake/document-checklist';
import type { Database } from '@/supabase/database.types';
import { buildTemplateFallback } from '@/lib/agents/fallback/index';
import { buildCaseAwareLines } from '@/lib/agents/drafter/runner';

type DbFreezeReason = Database['public']['Enums']['freeze_reason'];

type RealUserScenario = {
  id: string;
  title: string;
  input: IntakeClassifierInput;
  expected: Partial<IntakeClassificationOutput> & {
    checklist_db_reason?: DbFreezeReason;
    checklist_includes: string[];
  };
};

const cases = scenarios.cases as RealUserScenario[];

function toDbFreezeReason(reason: IntakeClassificationOutput['freeze_reason']): DbFreezeReason {
  return reason === 'tax_attachment' ? 'tax_gst_attachment' : (reason as DbFreezeReason);
}

describe('real-user acceptance scenarios', () => {
  it.each(cases)('$id classifies $title', (testCase) => {
    const output = classifyIntakeFromRules(testCase.input);

    expect(output.freeze_reason).toBe(testCase.expected.freeze_reason);
    expect(output.freeze_type).toBe(testCase.expected.freeze_type);
    expect(output.victim_role).toBe(testCase.expected.victim_role);
    expect(output.refuse_to_classify).toBe(testCase.expected.refuse_to_classify);

    if (testCase.expected.playbook_slug) {
      expect(output.playbook_slug).toBe(testCase.expected.playbook_slug);
    }

    if (typeof testCase.expected.human_review_required === 'boolean') {
      expect(output.human_review_required).toBe(testCase.expected.human_review_required);
    }

    expect(output.citations.length).toBeGreaterThan(0);
    expect(output.citations.every((c) => testCase.input.manifest.some((m) => m.source_id === c.source_id))).toBe(true);
  });

  it.each(cases)('$id has a scenario-appropriate checklist', (testCase) => {
    const output = classifyIntakeFromRules(testCase.input);
    const checklistReason = testCase.expected.checklist_db_reason ?? toDbFreezeReason(output.freeze_reason);
    const checklist = getDocumentChecklist(checklistReason);
    const evidenceTypes = checklist.map((item) => item.evidence_type);

    for (const expectedType of testCase.expected.checklist_includes) {
      expect(evidenceTypes, `${testCase.id} missing ${expectedType}`).toContain(expectedType);
    }
  });

  it('keeps the cyber branch letter copy-only, review-first, and mail-ready', () => {
    // A real letter is rendered with the case-aware lines filled in (as in prod),
    // so we assert on the actual letter content — not an unfilled placeholder token.
    const caseLines = buildCaseAwareLines({ user_role: 'receiver' }, '12000', 'cyber_upi_chain');
    const draft = buildTemplateFallback(
      'L1',
      {
        TODAY_DATE: '2026-07-06',
        USER_NAME: 'Aarav Sharma',
        BANK_NAME: 'State Bank of India',
        BRANCH_CITY: 'Bengaluru',
        ACCOUNT_LAST4: '1234',
        AMOUNT_INR: '12000',
        FREEZE_DATE: '2026-06-20',
        NCRP_ID: '30912345678901',
        USER_PHONE: '9876543210',
        USER_ADDRESS: '5 Residency Road, Bengaluru 560025',
        ...caseLines,
      },
      { proofGateBlocked: false },
    );

    expect(draft.disclaimer_block).toBe('DRAFT ONLY — REVIEW BEFORE USE');
    // Account number must stay masked (last 4 only) — never the full number.
    expect(draft.subject).toContain('XXXXXX1234');
    expect(draft.body).toContain('To,');
    expect(draft.body).toContain('Subject:');
    expect(draft.body).toContain('NCRP');
    // Proper formal letter: greeting, a real declaration sentence, sign-off.
    expect(draft.body).toMatch(/accurate to the best of my knowledge/i);
    expect(draft.body).not.toMatch(/I declare that I had no knowledge of any fraud/);
    expect(draft.body).toContain('Yours faithfully');
    // No raw unfilled placeholder tokens leak into the letter body.
    expect(draft.body).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
    // Clean letter: user-facing meta/junk must NOT be inside the body a user
    // copies and mails to the bank.
    expect(draft.body).not.toContain('UNHOLD DOES NOT SEND');
    expect(draft.body).not.toContain('[ ] Annexure');
    expect(draft.placeholders_missing).toEqual([]);
  });
});
