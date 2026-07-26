import { describe, expect, it } from 'vitest';
import {
  generateRecoveryCode,
  hashRecoveryCode,
  isValidPublicId,
  normalizeRecoveryCode,
  readRecoveryHash,
  verifyRecoveryCode,
} from '@/lib/auth/recovery';

describe('recovery codes', () => {
  it('generates an 8-char unambiguous code', () => {
    const code = generateRecoveryCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });

  it('hashes and verifies case-insensitively with spaces stripped', () => {
    const code = 'AB12CD34';
    const hash = hashRecoveryCode(code);
    expect(hash).toHaveLength(64);
    expect(verifyRecoveryCode('ab12cd34', hash)).toBe(true);
    expect(verifyRecoveryCode('AB12-CD34', hash)).toBe(true);
    expect(verifyRecoveryCode('AB12 CD34', hash)).toBe(true);
    expect(verifyRecoveryCode('WRONGCOD', hash)).toBe(false);
  });

  it('normalizeRecoveryCode strips separators', () => {
    expect(normalizeRecoveryCode(' ab-12 cd ')).toBe('AB12CD');
  });

  it('validates public_id shape', () => {
    expect(isValidPublicId('LL-10001')).toBe(true);
    expect(isValidPublicId('ll-99')).toBe(true);
    expect(isValidPublicId('not-a-case')).toBe(false);
    expect(isValidPublicId('')).toBe(false);
  });

  it('readRecoveryHash only accepts 64-char hex', () => {
    expect(readRecoveryHash({ recovery_code_hash: 'a'.repeat(64) })).toHaveLength(64);
    expect(readRecoveryHash({ recovery_code_hash: 'short' })).toBeNull();
    expect(readRecoveryHash({})).toBeNull();
    expect(readRecoveryHash(null)).toBeNull();
  });
});
