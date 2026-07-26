'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { updatePresence, removePresence } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

export function usePresence(user: SessionUser | null, page?: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathname = usePathname();
  const currentPageRef = useRef(page || pathname);
  const userRef = useRef(user);

  // Keep refs in sync without triggering effects
  useEffect(() => {
    currentPageRef.current = page || pathname;
  }, [page, pathname]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Stabilize effect dependencies to only user identity, not object reference
  const userId = user?.role === 'school'
    ? `school-${user?.npsn || 'unknown'}`
    : user ? `${user.role}-${user.id || user.name || 'unknown'}` : null;

  useEffect(() => {
    if (!userId || !userRef.current) return;

    const presenceId = userId;

    const buildPresenceData = () => ({
      id: presenceId,
      role: userRef.current!.role,
      userName: userRef.current!.name || 'Unknown',
      npsn: userRef.current!.npsn || null,
      gugusId: (userRef.current!.details as Record<string, unknown>)?.gugus as string || userRef.current!.gugusId || null,
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
  }, [userId]);
}
