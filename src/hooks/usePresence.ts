'use client';

import { useEffect, useRef } from 'react';
import { updatePresence, removePresence } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

/**
 * Hook yang mengirim "heartbeat" ke tabel online_presence setiap 30 detik
 * agar admin bisa melihat siapa saja yang sedang online.
 * 
 * Dipasang di setiap dashboard page (school, gugus, pengawas, kkks, pgri).
 */
export function usePresence(user: SessionUser | null, page?: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPage = page || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');

  useEffect(() => {
    if (!user) return;

    // Build presence ID based on role
    const presenceId = user.role === 'school'
      ? `school-${user.npsn || 'unknown'}`
      : `${user.role}-${user.id || user.name || 'unknown'}`;

    const presenceData = {
      id: presenceId,
      role: user.role,
      userName: user.name || 'Unknown',
      npsn: user.npsn || null,
      gugusId: (user.details as Record<string, unknown>)?.gugus as string || user.gugusId || null,
      page: currentPage,
    };

    // Kirim heartbeat pertama segera
    updatePresence(presenceData);

    // Kirim heartbeat setiap 30 detik
    intervalRef.current = setInterval(() => {
      updatePresence(presenceData);
    }, 30_000);

    // Cleanup: hapus presence saat unmount (logout / pindah halaman)
    const handleBeforeUnload = () => {
      removePresence(presenceId);
    };

    // Also handle visibility change for better cleanup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        removePresence(presenceId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Remove presence on cleanup to prevent ghost online users
      removePresence(presenceId);
    };
  }, [user, currentPage]);
}
