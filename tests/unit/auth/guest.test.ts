import { describe, expect, it } from 'vitest';
import { signGuestToken, verifyGuestToken } from '@/lib/auth/guest';

describe('guest tokens', () => {
  it('issues a distinct signed token for each recovery or session creation', () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';
    const first = signGuestToken(sessionId);
    const second = signGuestToken(sessionId);

    expect(first).not.toBe(second);
    expect(verifyGuestToken(first)?.sub).toBe(sessionId);
    expect(verifyGuestToken(second)?.sub).toBe(sessionId);
    expect(verifyGuestToken(first)?.jti).not.toBe(verifyGuestToken(second)?.jti);
  });
});
