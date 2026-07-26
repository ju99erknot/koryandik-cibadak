'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser, UserRole } from '@/lib/types';
import { removePresence } from '@/lib/db';

export function useAuth(requiredRole?: UserRole | UserRole[]) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<SessionUser | null>(null);

  // Memoize requiredRole to avoid re-triggering effect
  const roleKey = Array.isArray(requiredRole) ? requiredRole.join(',') : (requiredRole || '');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('koryandik_current_user');
    const token = localStorage.getItem('koryandik_session_token');
    
    if (!stored || !token) {
      router.push('/');
      setLoading(false);
      return;
    }

    try {
      // Validate token format
      const parts = token.split(':');
      if (parts.length !== 2) throw new Error('Invalid token format');

      // Decode token payload to extract the ORIGINAL session identity
      const payloadDecoded = Buffer.from(parts[0], 'base64').toString('utf8');
      const tokenPayload = JSON.parse(payloadDecoded);

      // Parse current stored user data
      const parsed = JSON.parse(stored) as SessionUser;

      // Validate identity match: core fields must match between token and stored data
      // This allows profile updates (avatar, name, details) without invalidating the session
      const identityMatch =
        (tokenPayload.role === parsed.role) &&
        (tokenPayload.npsn === parsed.npsn || tokenPayload.id === parsed.id);

      if (!identityMatch) throw new Error('Token identity mismatch');

      // Check role authorization
      const roles = requiredRole
        ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        : null;

      if (roles && !roles.includes(parsed.role)) {
        router.push('/');
        setLoading(false);
        return;
      }

      // Only update user state if identity actually changed (prevents infinite re-renders)
      const prev = userRef.current;
      const isSameUser = prev &&
        prev.role === parsed.role &&
        prev.npsn === parsed.npsn &&
        prev.id === parsed.id &&
        prev.name === parsed.name &&
        prev.avatar === parsed.avatar;

      if (!isSameUser) {
        userRef.current = parsed;
        setUser(parsed);
      }
      setLoading(false);
    } catch {
      router.push('/');
      setLoading(false);
    }
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
    router.push('/');
  }, [router]);

  return { user, loading, logout };
}
