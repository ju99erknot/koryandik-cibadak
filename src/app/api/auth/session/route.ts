import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * Return the authenticated identity for the current request, if any.
 *
 * The client uses this to learn its *authoritative* role instead of reading it
 * from localStorage, which the user fully controls.
 */
export async function GET() {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    role: session.role,
    sub: session.sub,
    exp: session.exp,
  });
}
