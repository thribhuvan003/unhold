import { describe, expect, it } from 'vitest';
import { computeSha256Hex, isValidSha256 } from '@/lib/evidence/sha256';

describe('sha256', () => {
  it('computes known hash for empty buffer', () => {
    const hash = computeSha256Hex(Buffer.from(''));
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('computes hash for sample text', () => {
    const hash = computeSha256Hex(Buffer.from('lienliberator'));
    expect(isValidSha256(hash)).toBe(true);
    expect(hash).toHaveLength(64);
  });

  it('validates sha256 format', () => {
    expect(isValidSha256('abc')).toBe(false);
    expect(isValidSha256('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe(true);
    expect(isValidSha256('E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855')).toBe(false);
  });
});