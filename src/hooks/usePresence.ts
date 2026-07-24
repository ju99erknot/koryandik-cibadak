'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { updatePresence, removePresence } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

export function usePresence(user: SessionUser | null, page?: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathname = usePathname();
  const currentPageRef = useRef(page || pathname);

  // Keep ref in sync
  useEffect(() => {
    currentPageRef.current = page || pathname;
  }, [page, pathname]);

  useEffect(() => {
    if (!user) return;

    const presenceId = user.role === 'school'
      ? `school-${user.npsn || 'unknown'}`
      : `${user.role}-${user.id || user.name || 'unknown'}`;

    const buildPresenceData = () => ({
      id: presenceId,
      role: user.role,
      userName: user.name || 'Unknown',
      npsn: user.npsn || null,
      gugusId: (user.details as Record<string, unknown>)?.gugus as string || user.gugusId || null,
      page: currentPageRef.current,
    });

    // Send first heartbeat immediately
    updatePresence(buildPresenceData());

    // Send heartbeat every 30 seconds
    intervalRef.current = setInterval(() => {
      updatePresence(buildPresenceData());
    }, 30_000);

    const handleBeforeUnload = () => {
      removePresence(presenceId);
    };

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
      removePresence(presenceId);
    };
  }, [user, page]);
}
