'use client';

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  subscribeSyncStatus,
  getSyncState,
  getSyncFailures,
  clearSyncFailures,
  type SyncFailure,
} from '@/lib/syncStatus';

/**
 * Peringatan jujur ketika data gagal tersimpan ke server.
 *
 * Sebelumnya kegagalan penyimpanan hanya dicatat ke console: operator melihat
 * notifikasi "Berhasil disimpan!" padahal datanya hanya mendarat di peramban
 * miliknya sendiri. Banner ini muncul begitu ada operasi tulis yang tidak
 * sampai ke server, sehingga pengguna tahu pekerjaannya perlu diulang.
 */
export default function SyncStatusBanner() {
  const [dismissedAt, setDismissedAt] = useState(0);

  // useSyncExternalStore membaca status pada render pertama, sehingga tidak
  // perlu setState di dalam efek (yang memicu render bertingkat).
  const subscribe = useCallback(
    (onChange: () => void) => subscribeSyncStatus(() => onChange()),
    []
  );
  const state = useSyncExternalStore(subscribe, getSyncState, () => 'ok' as const);
  const failures: SyncFailure[] = state === 'degraded' ? getSyncFailures() : [];

  // Kegagalan baru setelah pengguna menutup banner akan memunculkannya lagi.
  const newest = failures.length > 0 ? failures[failures.length - 1].at : 0;
  if (failures.length === 0 || newest <= dismissedAt) return null;

  // Tampilkan operasi unik agar pesan tidak berulang-ulang.
  const labels = [...new Set(failures.map((f) => f.label))];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 20,
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-toast)' as React.CSSProperties['zIndex'],
        maxWidth: 'min(560px, calc(100vw - 32px))',
        width: '100%',
        background: 'rgba(239, 68, 68, 0.14)',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.32)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <i
        className="fa-solid fa-cloud-arrow-up"
        aria-hidden="true"
        style={{ color: '#ef4444', fontSize: 18, marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
          Data belum tersimpan ke server
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.55 }}>
          {labels.length === 1 ? labels[0] : `${labels.length} operasi`} gagal dikirim.
          Perubahan Anda tersimpan sementara di peramban ini, tetapi{' '}
          <strong>belum terlihat oleh pengawas</strong>. Periksa koneksi lalu ulangi.
        </p>
        {labels.length > 1 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 11.5, color: 'var(--text-muted)' }}>
            {labels.slice(0, 4).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-danger btn-xs"
            onClick={() => window.location.reload()}
          >
            <i className="fa-solid fa-rotate" aria-hidden="true" /> Muat Ulang
          </button>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={() => {
              setDismissedAt(Date.now());
              clearSyncFailures();
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
