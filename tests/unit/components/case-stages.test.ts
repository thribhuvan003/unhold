import { describe, expect, it } from 'vitest';
import { computeCaseStages } from '@/components/case/case-stages';

const base = {
  track: 'cyber' as const,
  hasFreezeNotice: false,
  hasBankStatement: false,
  hasPan: false,
  l1Drafted: false,
  l1Sent: false,
};

describe('computeCaseStages', () => {
  it('starts at "Add your papers" with the letter locked', () => {
    const model = computeCaseStages(base);
    expect(model.stageNum).toBe(2);
    expect(model.stageTitle).toBe('Add your papers');
    expect(model.letterUnlocked).toBe(false);
    expect(model.doNow.title).toBe('Add your papers');
    expect(model.doNow.desc).toContain('2 more to go');
    expect(model.doNow.desc).not.toMatch(/minutes/i);
    expect(model.doNow.target).toBe('papers');
    expect(model.stages[0]!.state).toBe('done');
    expect(model.stages[1]!.state).toBe('current');
    expect(model.stages[2]!.state).toBe('locked');
    expect(model.stages[2]!.note).toBe('Opens when 2 papers are added');
    expect(model.stages[3]!.state).toBe('locked');
    expect(model.stages[4]!.state).toBe('locked');
  });

  it('unlocks the letter on notice + statement and points DO THIS NOW at reading it', () => {
    const model = computeCaseStages({
      ...base,
      hasFreezeNotice: true,
      hasBankStatement: true,
    });
    expect(model.letterUnlocked).toBe(true);
    expect(model.stageNum).toBe(2);
    expect(model.doNow.title).toBe('Read your letter');
    expect(model.doNow.target).toBe('letter');
    expect(model.doNow.desc).toMatch(/authority and reference/i);
    expect(model.stages[1]!.note).toBe('2 of 3 added — last one is optional but helps');
    expect(model.stages[2]!.state).toBe('ready');
    expect(model.stages[2]!.note).toBe('Ready to read');
  });

  it('keeps the letter locked when the statement is missing, even with 2 papers in', () => {
    const model = computeCaseStages({
      ...base,
      hasFreezeNotice: true,
      hasBankStatement: false,
      hasPan: true,
    });
    expect(model.letterUnlocked).toBe(false);
    expect(model.doNow.title).toBe('Add your papers');
    expect(model.doNow.desc).toContain('1 more to go');
    expect(model.stages[2]!.state).toBe('locked');
  });

  it('moves to "Send it yourself" once the letter is drafted', () => {
    const model = computeCaseStages({
      ...base,
      hasFreezeNotice: true,
      hasBankStatement: true,
      hasPan: true,
      l1Drafted: true,
    });
    expect(model.stageNum).toBe(4);
    expect(model.stageTitle).toBe('Send it yourself');
    expect(model.doNow.title).toBe('Send the letter yourself + proof pack');
    expect(model.doNow.upNext).toBe('Keep the acknowledgement and follow the recipient’s stated response date.');
    expect(model.stages[1]!.state).toBe('done');
    expect(model.stages[1]!.note).toBe('All 3 added');
    expect(model.stages[2]!.state).toBe('done');
  });

  it('cyber after send: requires the exact authority and reference via a verified channel', () => {
    const model = computeCaseStages({
      ...base,
      hasFreezeNotice: true,
      hasBankStatement: true,
      l1Drafted: true,
      l1Sent: true,
    });
    expect(model.stageNum).toBe(5);
    expect(model.stageTitle).toBe('Follow the real path');
    expect(model.doNow.title).toBe('Next: confirm the exact authority and reference');
    expect(model.doNow.desc).toMatch(/authority or agency ordered the hold/i);
    expect(model.doNow.desc).toMatch(/verified official channel/i);
    expect(model.doNow.upNext).toBe(
      'Follow the recipient’s stated response date. RBI CMS is only for an eligible bank-service complaint.',
    );
    expect(model.doNow.upNext).not.toMatch(/\b7\b|\b15\b|NOC|GRM/i);
    expect(model.doNow.target).toBe('authority');
    expect(model.doNow.cta).toBeTruthy();
    expect(model.doNow.title).not.toMatch(/Wait for the bank/i);
    expect(model.stages[3]!.state).toBe('done');
    expect(model.stages[4]!.state).toBe('current');
    expect(model.stages[4]!.note).toBe('Confirm the exact authority and reference');
    expect(model.stages[4]!.target).toBe('authority');
  });

  it('branch after send: follows the bank’s stated response date with no path CTA', () => {
    const model = computeCaseStages({
      ...base,
      track: 'branch',
      hasFreezeNotice: true,
      hasBankStatement: true,
      l1Drafted: true,
      l1Sent: true,
    });
    expect(model.doNow.title).toBe('Follow the bank’s stated response date');
    expect(model.doNow.desc).toMatch(/verified grievance channel/i);
    expect(model.stages[4]!.note).toBe('Follow the bank’s stated response date');
    expect(model.doNow.cta).toBeNull();
    expect(model.doNow.target).toBeNull();
  });

  it('court after send: court authority messaging', () => {
    const model = computeCaseStages({
      ...base,
      track: 'court',
      hasFreezeNotice: true,
      hasBankStatement: true,
      l1Drafted: true,
      l1Sent: true,
    });
    expect(model.doNow.title).toMatch(/Court/i);
    expect(model.doNow.target).toBe('authority');
  });

  it('tax after send: tax officer messaging', () => {
    const model = computeCaseStages({
      ...base,
      track: 'tax',
      hasFreezeNotice: true,
      hasBankStatement: true,
      l1Drafted: true,
      l1Sent: true,
    });
    expect(model.doNow.title).toMatch(/tax/i);
    expect(model.doNow.target).toBe('authority');
  });
});
