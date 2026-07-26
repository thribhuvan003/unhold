import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Metadata keys on cases.metadata_json for guest recovery (no extra migration). */
export const RECOVERY_HASH_KEY = 'recovery_code_hash';
export const RECOVERY_SET_AT_KEY = 'recovery_code_set_at';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_LENGTH = 8;

/**
 * One-time human-facing recovery code. Shown once after case create;
 * only the SHA-256 hash is stored on the case.
 */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code), 'utf8').digest('hex');
}

export function verifyRecoveryCode(code: string, expectedHash: string): boolean {
  if (!expectedHash || expectedHash.length !== 64) return false;
  const actual = hashRecoveryCode(code);
  try {
    const a = Buffer.from(actual, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isValidPublicId(publicId: string): boolean {
  return /^LL-\d+$/i.test(publicId.trim());
}

export function readRecoveryHash(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const h = metadata[RECOVERY_HASH_KEY];
  return typeof h === 'string' && h.length === 64 ? h : null;
}
