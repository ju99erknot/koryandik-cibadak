import Link from 'next/link';

/**
 * Halaman 404.
 *
 * Sebelumnya Next.js menampilkan halaman bawaan berbahasa Inggris tanpa
 * identitas Koryandik dan tanpa jalan kembali yang jelas.
 */
export default function NotFound() {
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
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 14,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: 19,
            fontWeight: 800,
            margin: '0 0 10px',
            color: 'var(--text-primary, #e2e8f0)',
          }}
        >
          Halaman Tidak Ditemukan
        </h1>

        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-secondary, #94a3b8)',
            margin: '0 0 22px',
          }}
        >
          Alamat yang Anda tuju tidak tersedia. Mungkin tautannya keliru atau
          halaman sudah dipindahkan.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            <i className="fa-solid fa-house" aria-hidden="true" /> Beranda
          </Link>
          <Link href="/sekolah" className="btn btn-outline">
            <i className="fa-solid fa-school" aria-hidden="true" /> Sekolah Binaan
          </Link>
        </div>
      </div>
    </div>
  );
}
