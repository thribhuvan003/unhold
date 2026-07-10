import { describe, expect, it } from 'vitest';
import { classifyDoc, isReadable } from '@/lib/evidence/readability';

describe('isReadable', () => {
  it('accepts a confidently-read document', () => {
    expect(isReadable(0.9, false)).toBe(true);
    expect(isReadable(0.5, false)).toBe(true);
  });

  it('rejects a low-confidence (blank / unreadable) document', () => {
    expect(isReadable(0.12, false)).toBe(false);
    expect(isReadable(0, false)).toBe(false);
  });

  it('rejects anything the verifier flagged as tampered', () => {
    expect(isReadable(0.99, true)).toBe(false);
  });

  it('trusts a sealed document with no auto-read (null = PDF/pending), so PDFs still work', () => {
    expect(isReadable(null, false)).toBe(true);
    expect(isReadable(undefined, false)).toBe(true);
  });
});

describe('classifyDoc', () => {
  it('is clean when confident and unflagged', () => {
    expect(classifyDoc({ confidence: 0.9, forgery: false, hasMismatch: false })).toBe('clean');
  });

  it('is unreadable when confidence is low', () => {
    expect(classifyDoc({ confidence: 0.1, forgery: false, hasMismatch: false })).toBe('unreadable');
  });

  it('is unreadable when the verifier flags tampering', () => {
    expect(classifyDoc({ confidence: 0.9, forgery: true, hasMismatch: false })).toBe('unreadable');
  });

  it('is flagged when a field mismatches but the read was fine', () => {
    expect(classifyDoc({ confidence: 0.9, forgery: false, hasMismatch: true })).toBe('flagged');
  });

  it('is "saved" (human-reviewed) when there is no auto-read', () => {
    expect(classifyDoc({ confidence: null, forgery: false, hasMismatch: false })).toBe('saved');
  });
});
