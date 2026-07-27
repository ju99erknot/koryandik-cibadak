'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Batas galat tingkat rute.
 *
 * Sebelumnya tidak ada error boundary sama sekali: satu komponen yang gagal
 * membuat seluruh halaman menjadi putih kosong, tanpa pesan maupun jalan
 * keluar bagi operator sekolah. Berkas ini menangkap galat pada saat render
 * dan menawarkan pemulihan tanpa kehilangan sesi.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Koryandik] Terjadi galat pada halaman:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg-primary, #0f172a)',
      }}
    >
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div
          style={{
            width: 68,
            height: 68,
            margin: '0 auto 20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <i
            className="fa-solid fa-triangle-exclamation"
            aria-hidden="true"
            style={{ fontSize: 26, color: '#ef4444' }}
          />
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            margin: '0 0 10px',
            color: 'var(--text-primary, #e2e8f0)',
            letterSpacing: '-0.02em',
          }}
        >
          Terjadi Kendala pada Halaman Ini
        </h1>

        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-secondary, #94a3b8)',
            margin: '0 0 22px',
          }}
        >
          Halaman gagal dimuat, tetapi <strong>data Anda aman</strong> — tidak ada
          berkas yang terhapus. Silakan coba muat ulang. Bila masih berulang,
          laporkan ke Admin Koryandik.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            <i className="fa-solid fa-rotate" aria-hidden="true" /> Coba Lagi
          </button>
          <Link href="/" className="btn btn-outline">
            <i className="fa-solid fa-house" aria-hidden="true" /> Ke Beranda
          </Link>
        </div>

        {error.digest && (
          <p
            style={{
              marginTop: 20,
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            Kode galat: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
