import 'server-only';
import crypto from 'crypto';
import type { UserRole } from '@/lib/types';

/**
 * Server-side session signing and verification.
 *
 * The previous implementation produced an HMAC but never verified it, so any
 * client could hand-craft a token payload and be trusted. Everything in this
 * module runs server-only (see the `server-only` import above) so the secret
 * can never be bundled into client JavaScript.
 */

const DEV_FALLBACK_SECRET = 'koryandik-cibadak-dev-only-insecure-secret';

/** Session lifetime: 12 hours. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const SESSION_COOKIE_NAME = 'koryandik_session';

export interface SessionPayload {
  /** Authoritative role — assigned by the server, never taken from the client. */
  role: UserRole;
  /** Stable identifier: NPSN for schools, record id for everyone else. */
  sub: string;
  /** Display name (non-authoritative, convenience only). */
  name?: string;
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expires-at, epoch seconds. */
  exp: number;
}

/** Minimum entropy for the signing key, in characters. */
const MIN_SECRET_LENGTH = 32;

/**
 * True when the deployment is missing a usable SERVER_SECRET in production.
 * Exported so a health endpoint can surface the problem before a user hits it.
 */
export function isSecretMisconfigured(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  const secret = process.env.SERVER_SECRET;
  return !secret || secret.trim().length < MIN_SECRET_LENGTH;
}

function getSecret(): string {
  const secret = process.env.SERVER_SECRET;

  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      // Refuse to run with a guessable secret in production: a known secret
      // means anyone can mint valid tokens for any role.
      throw new Error(
        'SERVER_SECRET environment variable is required in production. ' +
          'Generate one with: openssl rand -hex 32'
      );
    }
    console.warn(
      '[auth] SERVER_SECRET is not set — using an insecure development ' +
        'fallback. Set SERVER_SECRET before deploying to production.'
    );
    return DEV_FALLBACK_SECRET;
  }

  if (process.env.NODE_ENV === 'production' && secret.trim().length < MIN_SECRET_LENGTH) {
    // A short secret is brute-forceable, which defeats the signature entirely.
    throw new Error(
      `SERVER_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production. ` +
        'Generate one with: openssl rand -hex 32'
    );
  }

  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function computeSignature(payloadB64: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/**
 * Constant-time string comparison. A plain `===` on secrets leaks information
 * through timing, which lets an attacker recover a signature byte by byte.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still perform a comparison so the failure cost does not depend on length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Create a signed session token. The signature covers the encoded payload, so
 * any tampering with the role or subject invalidates it.
 */
export function signSession(input: { role: UserRole; sub: string; name?: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    role: input.role,
    sub: input.sub,
    name: input.name,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  return `${payloadB64}.${computeSignature(payloadB64)}`;
}

/**
 * Verify a session token.
 *
 * Returns the payload only when the signature matches and the token has not
 * expired; otherwise `null`. Never throws on malformed input.
 */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  // Verify the signature *before* parsing the payload, so untrusted input is
  // never interpreted as structured data.
  if (!safeEqual(signature, computeSignature(payloadB64))) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.role !== 'string' || typeof payload.sub !== 'string') return null;
  if (typeof payload.exp !== 'number') return null;

  // Reject expired sessions.
  if (Math.floor(Date.now() / 1000) >= payload.exp) return null;

  return payload;
}
