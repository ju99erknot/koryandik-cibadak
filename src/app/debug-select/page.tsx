'use client';

/**
 * Halaman diagnostik untuk FancySelect di dalam drawer ber-backdrop-filter.
 * Mereproduksi kondisi modal login agar perilaku dropdown bisa diamati
 * langsung. Aman dihapus setelah selesai dipakai.
 */

import { useEffect, useState } from 'react';
import FancySelect from '@/components/FancySelect';
import { getSchools } from '@/lib/db';
import type { School } from '@/lib/schoolsData';

export default function DebugSelect() {
  const [schools, setSchools] = useState<School[]>([]);
  const [npsn, setNpsn] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    getSchools().then((s) => {
      setSchools(s);
      setLog((l) => [...l, `getSchools() -> ${s.length} sekolah`]);
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'var(--bg-primary)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        Diagnostik Dropdown Sekolah
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Panel kanan meniru drawer login (backdrop-filter + overflow-y: auto).
        Klik dropdown di dalamnya.
      </p>

      <div style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 16 }}>
        <div>jumlah sekolah: <strong>{schools.length}</strong></div>
        <div>terpilih: <strong>{npsn || '(kosong)'}</strong></div>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      <button className="btn btn-primary" onClick={() => setDrawerOpen((o) => !o)}>
        {drawerOpen ? 'Tutup' : 'Buka'} drawer
      </button>

      {/* Kontrol pembanding: di luar drawer */}
      <div style={{ maxWidth: 380, marginTop: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
          A. Di luar drawer (kontrol)
        </p>
        <FancySelect
          label="Pilih Sekolah"
          icon="fa-solid fa-school"
          searchable
          value={npsn}
          onChange={setNpsn}
          placeholder="-- Pilih Sekolah --"
          options={[
            { value: '', label: '-- Pilih Sekolah --' },
            ...schools.map((s) => ({ value: s.npsn, label: s.name, hint: `NPSN ${s.npsn}` })),
          ]}
        />
      </div>

      {/* Replika drawer login */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: drawerOpen ? 0 : -450,
          bottom: 0,
          width: 450,
          maxWidth: '100%',
          background: 'var(--card-glass)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderLeft: '1px solid var(--card-border)',
          zIndex: 1000,
          padding: 32,
          overflowY: 'auto',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
          B. Di dalam drawer (kondisi sebenarnya)
        </p>
        <FancySelect
          label="Pilih Sekolah"
          icon="fa-solid fa-school"
          searchable
          required
          value={npsn}
          onChange={setNpsn}
          placeholder="-- Pilih Sekolah --"
          options={[
            { value: '', label: '-- Pilih Sekolah --' },
            ...schools.map((s) => ({ value: s.npsn, label: s.name, hint: `NPSN ${s.npsn}` })),
          ]}
        />
        <div style={{ height: 600 }} />
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          (ruang kosong untuk menguji scroll)
        </p>
      </div>
    </div>
  );
}
