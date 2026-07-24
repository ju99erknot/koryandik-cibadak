'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser, UserRole } from '@/lib/types';
import { removePresence } from '@/lib/db';

export function useAuth(requiredRole?: UserRole | UserRole[]) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      // Format validation for token
      const parts = token.split(':');
      if (parts.length !== 2) throw new Error('Invalid token format');
      const payloadDecoded = Buffer.from(parts[0], 'base64').toString('utf8');
      
      // We validate it structurally matches the session data
      if (payloadDecoded !== stored) throw new Error('Token payload mismatch');

      const parsed = JSON.parse(stored) as SessionUser;
      const roles = requiredRole
        ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        : null;

      if (roles && !roles.includes(parsed.role)) {
        router.push('/');
        setLoading(false);
        return;
      }

      setUser(parsed);
      setLoading(false);
    } catch {
      router.push('/');
      setLoading(false);
    }
  }, [router, Array.isArray(requiredRole) ? requiredRole.join(',') : requiredRole]);

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
