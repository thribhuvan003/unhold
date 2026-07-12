import { describe, expect, it } from 'vitest';
import {
  buildIoNocLetter,
  CYBERCRIME_CITIZEN_PORTAL_URL,
  IO_NOC_TEMPLATE_SLUG,
} from '@/lib/letters/io-noc-template';

describe('buildIoNocLetter', () => {
  it('fills known fields and leaves labelled blanks for the rest', () => {
    const { subject, body } = buildIoNocLetter({
      USER_NAME: 'Asha Kumar',
      BANK_NAME: 'State Bank of India',
      ACCOUNT_LAST4: '4821',
      AMOUNT_INR: '1,800',
      NCRP_ID: '12345678901234',
      TODAY_DATE: '09 Jul 2026',
    });
    expect(IO_NOC_TEMPLATE_SLUG).toBe('io_cyber_noc_request');
    expect(subject).toContain('4821');
    expect(subject).toContain('12345678901234');
    expect(body).toContain('Asha Kumar');
    expect(body).toContain('State Bank of India');
    expect(body).toContain('1,800');
    expect(body).toContain('09 Jul 2026');
    expect(body).toMatch(/__________ \(your address\)/);
    expect(body).toMatch(/cyber cell \/ police station/i);
    expect(body).toContain('exact amount under hold');
    expect(body).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it('never invents a police station when missing', () => {
    const { body } = buildIoNocLetter({ USER_NAME: 'Test' });
    expect(body).toContain('__________ (cyber cell / police station name & address (from bank letter))');
  });

  it('exports the public citizen cybercrime portal URL', () => {
    expect(CYBERCRIME_CITIZEN_PORTAL_URL).toContain('cybercrime.gov.in');
  });
});
