import { describe, expect, it } from 'vitest';
import evalFixtures from '@/tests/golden/agent_eval.json';
import { buildTemplateFallback } from '@/lib/agents/fallback/index';
import { classifyIntakeFromRules } from '@/lib/agents/intake/rules';
import type { IntakeClassifierInput } from '@/lib/agents/intake/types';

type IntakeCase = {
  id: string;
  agent: 'intake';
  input: IntakeClassifierInput;
  expected: Record<string, unknown>;
};

type DrafterCase = {
  id: string;
  agent: 'drafter';
  level: 'L1' | 'L2' | 'L3';
  input: {
    placeholderValues: Record<string, string>;
    proofGateBlocked: boolean;
  };
  expected: Record<string, unknown>;
};

type EvalCase = IntakeCase | DrafterCase;

const cases = evalFixtures.cases as EvalCase[];

function runIntakeCase(testCase: IntakeCase): boolean {
  const output = classifyIntakeFromRules(testCase.input);
  const expected = testCase.expected;

  for (const [key, value] of Object.entries(expected)) {
    if ((output as Record<string, unknown>)[key] !== value) return false;
  }

  if (!output.citations.every((c) => testCase.input.manifest.some((m) => m.source_id === c.source_id))) {
    return false;
  }

  const inventedNcrp = output.citations.some((c) => /\d{14}/.test(c.excerpt));
  const inputNcrp = JSON.stringify(testCase.input.intake_json).match(/\d{14}/);
  if (inventedNcrp && !inputNcrp) return false;

  return true;
}

function runDrafterCase(testCase: DrafterCase): boolean {
  const draft = buildTemplateFallback(testCase.level, testCase.input.placeholderValues, {
    proofGateBlocked: testCase.input.proofGateBlocked,
  });
  const expected = testCase.expected;

  if (expected.level && draft.level !== expected.level) return false;
  if (expected.template_slug && draft.template_slug !== expected.template_slug) return false;
  if (expected.disclaimer_block && draft.disclaimer_block !== expected.disclaimer_block) return false;

  if (expected.proof_gate_blocked === true) {
    if (!draft.placeholders_missing.some((p) => p.startsWith('PROOF_GATE_'))) return false;
  }

  if (typeof expected.placeholders_missing_count === 'number') {
    if (draft.placeholders_missing.length !== expected.placeholders_missing_count) return false;
  }

  if (typeof expected.placeholders_missing_min === 'number') {
    if (draft.placeholders_missing.length < expected.placeholders_missing_min) return false;
  }

  return true;
}

describe('agent golden eval', () => {
  it(`passes at least ${evalFixtures.pass_threshold}/${cases.length} cases`, () => {
    let passed = 0;
    const failures: string[] = [];

    for (const testCase of cases) {
      const ok =
        testCase.agent === 'intake'
          ? runIntakeCase(testCase)
          : runDrafterCase(testCase);

      if (ok) passed += 1;
      else failures.push(testCase.id);
    }

    if (failures.length > 0) {
      console.warn('Golden eval failures:', failures.join(', '));
    }

    expect(passed).toBeGreaterThanOrEqual(evalFixtures.pass_threshold);
  });

  it('all drafter outputs use exact disclaimer literal', () => {
    const drafterCases = cases.filter((c) => c.agent === 'drafter') as DrafterCase[];
    for (const testCase of drafterCases) {
      const draft = buildTemplateFallback(testCase.level, testCase.input.placeholderValues, {
        proofGateBlocked: testCase.input.proofGateBlocked,
      });
      expect(draft.disclaimer_block).toBe('DRAFT ONLY — REVIEW BEFORE USE');
    }
  });
});