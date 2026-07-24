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

    let active = true;
    const stored = localStorage.getItem('koryandik_current_user');
    if (!stored) {
      router.push('/');
      setTimeout(() => {
        if (active) setLoading(false);
      }, 0);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as SessionUser;
      const roles = requiredRole
        ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        : null;

      if (roles && !roles.includes(parsed.role)) {
        router.push('/');
        setTimeout(() => {
          if (active) setLoading(false);
        }, 0);
        return;
      }

      setTimeout(() => {
        if (active) {
          setUser(parsed);
          setLoading(false);
        }
      }, 0);
    } catch {
      router.push('/');
      setTimeout(() => {
        if (active) setLoading(false);
      }, 0);
    }

    return () => {
      active = false;
    };
  }, [router, requiredRole]);

  const logout = useCallback(() => {
    // Hapus presence sebelum logout agar admin langsung tahu user sudah offline
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
    router.push('/');
  }, [router]);

  return { user, loading, logout };
}
