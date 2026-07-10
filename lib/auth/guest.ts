import 'server-only';

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const GUEST_COOKIE_NAME = 'll_guest';
export const GUEST_TOKEN_HEADER = 'X-Guest-Token';
export const GUEST_TOKEN_TYP = 'guest';
export const GUEST_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export interface GuestJwtPayload {
  sub: string;
  typ: typeof GUEST_TOKEN_TYP;
  exp: number;
  iat: number;
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
    if (payload.typ !== GUEST_TOKEN_TYP || !payload.sub) return null;
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
  const header = request.headers.get(GUEST_TOKEN_HEADER);
  if (header) return header.trim();
  const cookie = request.cookies.get(GUEST_COOKIE_NAME)?.value;
  return cookie ?? null;
}

export function resolveGuestAuth(request: NextRequest): GuestAuthContext | null {
  const deviceToken = extractGuestToken(request);
  if (!deviceToken) return null;
  const payload = verifyGuestToken(deviceToken);
  if (!payload) return null;
  return {
    type: 'guest',
    guestSessionId: payload.sub,
    deviceToken,
  };
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