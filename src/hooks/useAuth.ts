'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser, UserRole } from '@/lib/types';
import { removePresence } from '@/lib/db';

/**
 * Client-side auth state.
 *
 * The authoritative check happens on the server (see `src/proxy.ts`): a request
 * for a protected route never renders without a valid signed session cookie.
 * This hook asks the server who the user is via `/api/auth/session` rather than
 * trusting localStorage, which the user can edit freely.
 *
 * localStorage is still used, but only as a *presentation* cache for
 * non-authoritative fields (display name, avatar, cached school details). The
 * role returned by the server always wins.
 */
export function useAuth(requiredRole?: UserRole | UserRole[]) {
  const router = useRouter();

  // Synchronously restore presentation session from localStorage to prevent initial full-screen skeleton flash
  const [user, setUser] = useState<SessionUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('koryandik_current_user');
      if (stored) {
        const parsed = JSON.parse(stored) as SessionUser;
        if (parsed && parsed.role) {
          const roles = requiredRole
            ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
            : null;
          if (!roles || roles.includes(parsed.role)) {
            return parsed;
          }
        }
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('koryandik_current_user');
      if (stored) {
        const parsed = JSON.parse(stored) as SessionUser;
        if (parsed && parsed.role) {
          const roles = requiredRole
            ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
            : null;
          if (!roles || roles.includes(parsed.role)) {
            return false; // Instant session!
          }
        }
      }
    } catch {}
    return true;
  });

  const userRef = useRef<SessionUser | null>(user);

  // Memoize requiredRole to avoid re-triggering effect
  const roleKey = Array.isArray(requiredRole) ? requiredRole.join(',') : (requiredRole || '');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const clearLocalSession = () => {
      localStorage.removeItem('koryandik_current_user');
      localStorage.removeItem('koryandik_session_token');
    };

    const resolveSession = async () => {
      let session: { role: UserRole; sub: string } | null = null;

      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.role) {
            session = { role: data.role as UserRole, sub: String(data.sub ?? '') };
          }
        }
      } catch {
        // Network failure — treat as unauthenticated rather than assuming access.
      }

      if (cancelled) return;

      if (!session) {
        clearLocalSession();
        router.push('/');
        setLoading(false);
        return;
      }

      // Enforce the role client-side too, so the UI does not briefly render a
      // dashboard the user may not enter. `proxy.ts` is the real gate.
      const roles = requiredRole
        ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        : null;

      if (roles && !roles.includes(session.role)) {
        router.push('/');
        setLoading(false);
        return;
      }

      // Merge cached presentation data, but never let it override the
      // server-issued role or subject.
      let cached: Partial<SessionUser> = {};
      try {
        const stored = localStorage.getItem('koryandik_current_user');
        if (stored) {
          const parsed = JSON.parse(stored) as SessionUser;
          const matchesSession =
            session.role === 'school'
              ? parsed.npsn === session.sub
              : parsed.id === session.sub;
          if (parsed.role === session.role && matchesSession) {
            cached = parsed;
          } else {
            // Stale cache from a previous account: discard it.
            localStorage.removeItem('koryandik_current_user');
          }
        }
      } catch {
        localStorage.removeItem('koryandik_current_user');
      }

      const resolved: SessionUser = {
        ...cached,
        role: session.role,
        ...(session.role === 'school' ? { npsn: session.sub } : { id: session.sub }),
      };

      const prev = userRef.current;
      const isSameUser = prev &&
        prev.role === resolved.role &&
        prev.npsn === resolved.npsn &&
        prev.id === resolved.id &&
        prev.name === resolved.name &&
        prev.avatar === resolved.avatar;

      if (!isSameUser) {
        userRef.current = resolved;
        setUser(resolved);
      }
      setLoading(false);
    };

    resolveSession();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, roleKey]);

  const logout = useCallback(() => {
    const stored = localStorage.getItem('koryandik_current_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionUser;
        const presenceId = parsed.role === 'school'
          ? `school-${parsed.npsn || 'unknown'}`
          : `${parsed.role}-${parsed.id || parsed.name || 'unknown'}`;
        removePresence(presenceId);
      } catch { /* ignore */ }
    }
    localStorage.removeItem('koryandik_current_user');
    localStorage.removeItem('koryandik_session_token');

    // Clear the httpOnly cookie server-side; it cannot be removed from JS.
    fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' })
      .catch(() => { /* best effort */ })
      .finally(() => router.push('/'));
  }, [router]);

  return { user, loading, logout };
}
