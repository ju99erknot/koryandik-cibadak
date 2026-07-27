'use client';

import { useEffect, useRef } from 'react';

/**
 * Polling yang berhenti saat tab tidak dilihat.
 *
 * MASALAH YANG DIATASI
 * Enam komponen melakukan polling terus-menerus ke Supabase (tiap 10–30 detik)
 * dan tetap berjalan walaupun tab berada di latar belakang. Operator yang lupa
 * menutup tab membakar kuota seharian: sekitar 1.080 permintaan per jam per
 * pengguna, atau ~1,9 juta per bulan untuk 10 pengguna aktif — cukup untuk
 * melampaui kuota Supabase gratis.
 *
 * Hook ini:
 *  - menjeda timer ketika document.visibilityState === 'hidden',
 *  - menjalankan callback sekali saat tab kembali terlihat agar data langsung
 *    segar (tidak perlu menunggu satu siklus penuh),
 *  - memakai ref untuk callback sehingga interval tidak dibuat ulang setiap
 *    render induk.
 *
 * @param callback  Fungsi yang dijalankan tiap siklus. Boleh async.
 * @param intervalMs Jeda antar-siklus dalam milidetik.
 * @param enabled   Setel false untuk menonaktifkan sepenuhnya.
 */
export function useVisiblePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    // Cegah dua eksekusi menumpuk bila jaringan lambat.
    let running = false;

    const tick = async () => {
      if (running) return;
      running = true;
      try {
        await callbackRef.current();
      } finally {
        running = false;
      }
    };

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Segarkan sekali agar tampilan tidak basi setelah jeda panjang.
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, enabled]);
}
