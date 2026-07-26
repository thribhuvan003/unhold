import { describe, expect, it } from 'vitest';
import { resolvePincodeToState } from '@/lib/geo/pincode';
import { getRegionalGrievanceContact } from '@/lib/banks/official-contacts';

describe('resolvePincodeToState', () => {
  it('resolves major metro PINs to the right state', () => {
    expect(resolvePincodeToState('110001')).toBe('delhi');
    expect(resolvePincodeToState('400001')).toBe('mumbai');
    expect(resolvePincodeToState('560001')).toBe('karnataka');
    expect(resolvePincodeToState('600001')).toBe('tamil nadu');
    expect(resolvePincodeToState('500001')).toBe('telangana');
    expect(resolvePincodeToState('700001')).toBe('west bengal');
    expect(resolvePincodeToState('800001')).toBe('bihar');
    expect(resolvePincodeToState('380001')).toBe('gujarat');
    expect(resolvePincodeToState('302001')).toBe('rajasthan');
    expect(resolvePincodeToState('226001')).toBe('uttar pradesh');
  });

  it('covers small towns and villages, not just metros', () => {
    expect(resolvePincodeToState('570001')).toBe('karnataka'); // Mysore
    expect(resolvePincodeToState('577601')).toBe('karnataka'); // Davangere-area halli
    expect(resolvePincodeToState('517247')).toBe('andhra pradesh'); // Punganur
    expect(resolvePincodeToState('517325')).toBe('andhra pradesh'); // Madanapalle
    expect(resolvePincodeToState('505001')).toBe('telangana'); // Karimnagar
    expect(resolvePincodeToState('641001')).toBe('tamil nadu'); // Coimbatore
    expect(resolvePincodeToState('851101')).toBe('bihar'); // Begusarai
    expect(resolvePincodeToState('273001')).toBe('uttar pradesh'); // Gorakhpur
  });

  it('handles carve-outs inside broader ranges', () => {
    expect(resolvePincodeToState('160017')).toBe('chandigarh'); // inside Punjab block
    expect(resolvePincodeToState('248001')).toBe('uttarakhand'); // inside UP block
    expect(resolvePincodeToState('403001')).toBe('goa'); // inside Maharashtra block
    expect(resolvePincodeToState('834001')).toBe('jharkhand'); // inside Bihar block
    expect(resolvePincodeToState('737101')).toBe('sikkim'); // inside WB block
    expect(resolvePincodeToState('795001')).toBe('manipur');
  });

  it('rejects invalid input', () => {
    expect(resolvePincodeToState('')).toBeNull();
    expect(resolvePincodeToState('12345')).toBeNull();
    expect(resolvePincodeToState('1234567')).toBeNull();
    expect(resolvePincodeToState('900001')).toBeNull(); // 9xx unallocated
    expect(resolvePincodeToState('abc123')).toBeNull();
  });

  it('feeds the SBI circle map: PIN state resolves to a published LHO email', () => {
    const state = resolvePincodeToState('500032'); // Hyderabad
    expect(state).toBe('telangana');
    // Telangana is SBI's Hyderabad Circle (verified 2026-07-05 on SBI's official
    // grievance list), NOT Amaravati/Andhra.
    const contact = getRegionalGrievanceContact('state-bank-of-india', { state: state! });
    expect(contact.email).toBe('agmcustomer.lhohyd@sbi.co.in');
  });

  it('NE states route to the SBI Guwahati (NE) circle', () => {
    const state = resolvePincodeToState('799001'); // Agartala, Tripura
    expect(state).toBe('tripura');
    const contact = getRegionalGrievanceContact('state-bank-of-india', { state: state! });
    expect(contact.email).toBe('agmcustomer.lhoguw@sbi.co.in');
  });

  it('unmapped-but-valid states fall back to the official circle list, never a guessed email', () => {
    const state = resolvePincodeToState('403001'); // Goa — no dedicated entry in the circle map
    expect(state).toBe('goa');
    const contact = getRegionalGrievanceContact('state-bank-of-india', { state: state! });
    expect(contact.email).toBeUndefined();
    expect(contact.portal).toContain('sbi.bank.in');
  });
});
