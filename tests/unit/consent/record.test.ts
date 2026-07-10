import { describe, expect, it } from 'vitest';
import { DISCLAIMER_BLOCKS } from '@/lib/constants/disclaimers';
import { consentTextFor, hashConsentText } from '@/lib/consent/record';

describe('disclaimers Blocks A–H', () => {
  it('contains all eight verbatim blocks', () => {
    expect(Object.keys(DISCLAIMER_BLOCKS).sort().join('')).toBe('ABCDEFGH');
  });

  it('Block A mentions not law firm and helpline 1930', () => {
    expect(DISCLAIMER_BLOCKS.A).toContain('not a law firm');
    expect(DISCLAIMER_BLOCKS.A).toContain('1930');
  });

  it('Block B requires user responsibility', () => {
    expect(DISCLAIMER_BLOCKS.B).toContain('solely responsible');
    expect(DISCLAIMER_BLOCKS.B).toContain('does not guarantee');
  });

  it('Block C is DRAFT ONLY', () => {
    expect(DISCLAIMER_BLOCKS.C).toContain('DRAFT ONLY');
  });
});

describe('consent record helpers', () => {
  it('produces stable SHA-256 hash', () => {
    const text = consentTextFor('escalation_send');
    const hash = hashConsentText(text);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashConsentText(text)).toBe(hash);
  });

  it('maps escalation_send consent to Block C language', () => {
    expect(consentTextFor('escalation_send')).toContain('DRAFT ONLY');
  });

  it('maps cross_border_ai to Block F', () => {
    expect(consentTextFor('cross_border_ai')).toBe(DISCLAIMER_BLOCKS.F);
  });
});