import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, isSecretMisconfigured, SESSION_COOKIE_NAME } from '@/lib/session';
import type { UserRole } from '@/lib/types';

/**
 * Server-side route protection.
 *
 * Previously every dashboard was guarded only by `useAuth`, a client hook that
 * trusted localStorage. Anyone could set two localStorage keys and load the
 * admin dashboard. This runs before the route renders, so an unauthenticated
 * or under-privileged request never reaches the page at all.
 *
 * Note: in Next.js 16 the `middleware` convention was renamed to `proxy`, and
 * it runs on the Node.js runtime (which is what lets us use node:crypto here).
 */

/** Route prefix -> roles allowed to access it. */
const PROTECTED_ROUTES: ReadonlyArray<{ prefix: string; roles: readonly UserRole[] }> = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/school', roles: ['school'] },
  { prefix: '/gugus', roles: ['gugus'] },
  { prefix: '/pengawas', roles: ['pengawas'] },
  { prefix: '/kkks', roles: ['kkks'] },
  { prefix: '/pgri', roles: ['pgri'] },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = PROTECTED_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  // Public route — nothing to enforce.
  if (!rule) return NextResponse.next();

  // Surface a deployment mistake loudly and early. Without this the operator
  // only discovers the missing secret when a user reports "login returns an
  // error", with nothing in the UI explaining why.
  if (isSecretMisconfigured()) {
    console.error(
      '[auth] SERVER_SECRET is missing or too short. Protected routes are ' +
        'unavailable until it is set. Generate one with: openssl rand -hex 32'
    );
    const url = new URL('/', request.url);
    url.searchParams.set('auth', 'misconfigured');
    return NextResponse.redirect(url);
  }

  const session = verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // No valid session: send the visitor to the landing page to log in.
  if (!session) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth', 'required');
    const response = NextResponse.redirect(url);
    // Clear a stale or tampered cookie so the client stops re-sending it.
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Valid session but wrong role: refuse rather than silently downgrading.
  if (!rule.roles.includes(session.role)) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth', 'forbidden');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Run on application routes only. Excluding static assets, image
   * optimization output and metadata files keeps CSS/JS/icons loading
   * normally — without this the auth redirect would also block them.
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.json|sw.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)',
  ],
};
