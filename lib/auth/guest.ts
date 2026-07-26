import 'server-only';

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const GUEST_COOKIE_NAME = 'll_guest';
export const GUEST_TOKEN_TYP = 'guest';
export const GUEST_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export interface GuestJwtPayload {
  sub: string;
  typ: typeof GUEST_TOKEN_TYP;
  exp: number;
  iat: number;
  jti: string;
}

export interface GuestAuthContext {
  type: 'guest';
  guestSessionId: string;
  deviceToken: string;
}

function getGuestJwtSecret(): string {
  const secret = process.env.GUEST_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('GUEST_JWT_SECRET must be at least 32 characters');
  }
  return secret;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function signGuestToken(guestSessionId: string): string {
  const secret = getGuestJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: GuestJwtPayload = {
    sub: guestSessionId,
    typ: GUEST_TOKEN_TYP,
    iat: now,
    exp: now + GUEST_TOKEN_TTL_SECONDS,
    jti: randomUUID(),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${header}.${body}.${signature}`;
}

export function verifyGuestToken(token: string): GuestJwtPayload | null {
  try {
    const secret = getGuestJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(body).toString('utf8')) as GuestJwtPayload;
    if (payload.typ !== GUEST_TOKEN_TYP || !payload.sub || !payload.jti) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generateGuestSessionId(): string {
  return randomUUID();
}

export function extractGuestToken(request: NextRequest): string | null {
  return request.cookies.get(GUEST_COOKIE_NAME)?.value ?? null;
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * The signed cookie identifies a guest session, but the database determines
 * whether that device remains active. This makes recovery-token rotation and
 * session revocation effective immediately.
 */
export async function resolveGuestToken(deviceToken: string | null | undefined): Promise<GuestAuthContext | null> {
  if (!deviceToken) return null;
  const payload = verifyGuestToken(deviceToken);
  if (!payload) return null;

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from('guest_sessions')
    .select('id, device_token_hash, expires_at, claimed_by, revoked_at')
    .eq('id', payload.sub)
    .maybeSingle();

  if (
    error ||
    !session ||
    session.claimed_by ||
    session.revoked_at ||
    new Date(session.expires_at).getTime() <= Date.now() ||
    !hashesMatch(hashDeviceToken(deviceToken), session.device_token_hash)
  ) {
    return null;
  }

  void admin
    .from('guest_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', session.id)
    .then(() => undefined);

  return {
    type: 'guest',
    guestSessionId: session.id,
    deviceToken,
  };
}

export async function resolveGuestAuth(request: NextRequest): Promise<GuestAuthContext | null> {
  return resolveGuestToken(extractGuestToken(request));
}

export function guestCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  };
}
