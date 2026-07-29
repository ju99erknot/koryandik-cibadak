'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getLkBospSubmissions, getSchools } from '@/lib/db';
import type { LkBospSubmission } from '@/lib/types';
import type { School, GugusData } from '@/lib/schoolsData';

export default function GugusLkBospPage() {
  const { user, logout } = useAuth('gugus');
  const gugusDetail = (user?.details as GugusData | undefined) ?? null;

  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTw, setSelectedTw] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [subData, schoolData] = await Promise.all([
        getLkBospSubmissions(),
        getSchools()
      ]);
      setSubmissions(subData);
      setSchools(schoolData);
    } catch {
      /* ignore */
    }
  };

  const gugusSchools = useMemo(() => {
    const gid = gugusDetail?.id || user?.id || '1';
    return schools.filter(s => s.gugus === gid);
  }, [gugusDetail, user, schools]);

  if (!user) return <LoadingScreen />;

  return (
    <DashboardShell
      user={user}
      onLogout={logout}
      brandTitle={gugusDetail?.name || user.name || 'Gugus Sekolah'}
      brandSubtitle={`Koordinator: ${gugusDetail?.koordinator || '-'}`}
      headerTitle={`Monitoring LK BOSP - Gugus ${gugusDetail?.id || user.id}`}
      headerSubtitle="Pemantauan Berkas LK BOSP & Kas Rekening Sekolah Anggota Gugus"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
      <div className="content-area animate-fade-in">
        <div className="card glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '8px', display: 'inline-block' }}>
                Gugus {gugusDetail?.id || user.id} - Korwil Cibadak
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Rekapitulasi BOSP Sekolah Anggota</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', fontWeight: 700 }}
              >
                <option value={2026}>Tahun 2026</option>
                <option value={2025}>Tahun 2025</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            {[1, 2, 3, 4].map(tw => (
              <button
                key={tw}
                type="button"
                onClick={() => setSelectedTw(tw)}
                className={`btn ${selectedTw === tw ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '10px', fontSize: '12px' }}
              >
                Triwulan {tw}
              </button>
            ))}
          </div>
        </div>

        <div className="card glass-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2><i className="fa-solid fa-clipboard-list" aria-hidden="true" /> Daftar Kelengkapan LK BOSP Sekolah Anggota</h2>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sekolah &amp; NPSN</th>
                    <th>Periode</th>
                    <th style={{ textAlign: 'right' }}>Total Realisasi (Rp)</th>
                    <th style={{ textAlign: 'right' }}>Sisa Saldo Rekening</th>
                    <th>Status Laporan</th>
                  </tr>
                </thead>
                <tbody>
                  {gugusSchools.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', marginBottom: '8px', display: 'block', opacity: 0.5 }} aria-hidden="true" />
                        Belum ada data laporan LK BOSP dari sekolah anggota gugus.
                      </td>
                    </tr>
                  ) : (
                    gugusSchools.map(sc => {
                      const sub = submissions.find(s => s.npsn === sc.npsn && s.periodYear === selectedYear && s.triwulan === selectedTw);
                      return (
                        <tr key={sc.npsn}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{sc.name}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NPSN: {sc.npsn}</span>
                          </td>
                          <td>TW {selectedTw} / {selectedYear}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {sub ? `Rp ${sub.totalRealisasi.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: sub?.isBalanceMatch ? 'var(--success)' : (sub ? 'var(--danger)' : 'var(--text-muted)') }}>
                            {sub ? `Rp ${sub.sisaSaldo.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td>
                            {sub ? (
                              <span className={`badge ${sub.status === 'approved' ? 'badge-success' : sub.status === 'revision' ? 'badge-danger' : 'badge-warning'}`}>
                                {sub.status === 'approved' ? 'Disetujui' : sub.status === 'revision' ? 'Perlu Revisi' : 'Menunggu Review'}
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'var(--card-border)', color: 'var(--text-muted)' }}>Belum Unggah</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
