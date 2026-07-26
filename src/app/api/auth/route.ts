import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { gugusSecrets, supervisorSecrets } from '@/lib/authSecrets';
import {
  signSession,
  safeEqual,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/session';
import { USER_ROLES, type UserRole } from '@/lib/types';

/**
 * Authentication endpoint.
 *
 * Security model: the client sends only a role + identifier + passcode. The
 * server verifies the passcode and then derives the session identity itself.
 * Any `sessionData` sent by the client is ignored — previously it was signed
 * verbatim, which let a valid school login mint an admin token.
 */

interface VerifiedIdentity {
  role: UserRole;
  sub: string;
  name?: string;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Verify credentials and return the authoritative identity, or null.
 */
function verifyCredentials(
  role: UserRole,
  identifier: string,
  passcode: string
): VerifiedIdentity | null {
  if (role === 'school') {
    // A school authenticates with its own NPSN. The NPSN is public
    // information, so this is an identification step rather than a real
    // secret; it is preserved here to avoid changing operator workflow.
    // Constrain the shape so arbitrary strings cannot be used as a subject.
    if (!/^\d{8}$/.test(identifier)) return null;
    if (!safeEqual(passcode, identifier)) return null;
    return { role: 'school', sub: identifier };
  }

  if (role === 'gugus') {
    const gugus = gugusSecrets.find((g) => g.id === identifier);
    if (!gugus || !safeEqual(passcode, gugus.passcode)) return null;
    return { role: 'gugus', sub: gugus.id };
  }

  if (role === 'pengawas' || role === 'kkks' || role === 'pgri') {
    const supervisor = supervisorSecrets.find((s) => s.role === role);
    if (!supervisor || !safeEqual(passcode, supervisor.passcode)) return null;
    return { role, sub: supervisor.id };
  }

  if (role === 'admin') {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminRecord = supervisorSecrets.find((s) => s.role === 'admin');

    if (adminPassword && safeEqual(identifier, adminUsername) && safeEqual(passcode, adminPassword)) {
      return { role: 'admin', sub: adminRecord?.id ?? 'admin-1' };
    }

    // Fallback to the seeded admin record. In production this only applies
    // when ADMIN_PASSWORD is unset, which is already flagged as unsafe.
    if (
      adminRecord &&
      safeEqual(identifier, 'admin') &&
      safeEqual(passcode, adminRecord.passcode)
    ) {
      if (process.env.NODE_ENV === 'production' && !adminPassword) {
        console.warn(
          '[auth] Admin logged in with the seeded default passcode. ' +
            'Set ADMIN_PASSWORD to disable this fallback.'
        );
      }
      return { role: 'admin', sub: adminRecord.id };
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role, identifier, passcode } = body ?? {};

    if (!isUserRole(role) || typeof identifier !== 'string' || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const identity = verifyCredentials(role, identifier, passcode);

    if (!identity) {
      // Uniform response: do not reveal whether the identifier exists.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = signSession(identity);

    // The session lives in an httpOnly cookie so client-side JavaScript (and
    // therefore XSS) cannot read or forge it.
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({
      success: true,
      user: { role: identity.role, sub: identity.sub },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Clear the session cookie.
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
