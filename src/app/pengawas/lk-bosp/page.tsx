'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getLkBospSubmissions, updateLkBospStatus, getSchools } from '@/lib/db';
import type { LkBospSubmission } from '@/lib/types';
import type { School } from '@/lib/schoolsData';
import { toast } from 'sonner';

export default function PengawasLkBospPage() {
  const { user, logout } = useAuth('pengawas');

  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTw, setSelectedTw] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRekeningKoran, setSelectedRekeningKoran] = useState<{ schoolName: string; fileUrl: string } | null>(null);

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

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.npsn.includes(searchQuery)
  );

  if (!user) return <LoadingScreen />;

  return (
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Supervisi LK BOSP & Rekening Koran"
      headerSubtitle={`Pengawas Pembina: ${user.name}`}
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
      <div className="content-area animate-fade-in">
        <div className="card glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="badge badge-warning" style={{ marginBottom: '8px', display: 'inline-block' }}>
                Supervisi BOSP Pembina
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Verifikasi Berkas BOSP Sekolah Binaan</h2>
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
            <h2><i className="fa-solid fa-clipboard-check" aria-hidden="true" /> Daftar Kelengkapan Laporan BOSP</h2>
            <input
              type="text"
              placeholder="Cari sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ maxWidth: '240px', fontSize: '13px' }}
            />
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sekolah & NPSN</th>
                    <th>Gugus</th>
                    <th style={{ textAlign: 'right' }}>Total Realisasi (Rp)</th>
                    <th style={{ textAlign: 'right' }}>Sisa Saldo Kas</th>
                    <th>Rekening Koran</th>
                    <th>Status Review</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map(sc => {
                    const sub = submissions.find(s => s.npsn === sc.npsn && s.periodYear === selectedYear && s.triwulan === selectedTw);
                    return (
                      <tr key={sc.npsn}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{sc.name}</div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NPSN: {sc.npsn}</span>
                        </td>
                        <td>Gugus {sc.gugus}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {sub ? `Rp ${sub.totalRealisasi.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: sub?.isBalanceMatch ? 'var(--success)' : 'var(--danger)' }}>
                          {sub ? `Rp ${sub.sisaSaldo.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td>
                          {sub?.rekeningKoranUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRekeningKoran({ schoolName: sc.name, fileUrl: sub.rekeningKoranUrl! })}
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: '11px' }}
                            >
                              <i className="fa-solid fa-eye" /> Lihat
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {sub ? (
                            <span className={`badge ${sub.status === 'approved' ? 'badge-success' : sub.status === 'revision' ? 'badge-danger' : 'badge-warning'}`}>
                              {sub.status === 'approved' ? 'Disetujui' : sub.status === 'revision' ? 'Perlu Revisi' : 'Menunggu Review'}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--card-border)', color: 'var(--text-muted)' }}>Belum Kirim</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {sub ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await updateLkBospStatus(sub.id, 'approved', 'Diverifikasi oleh Pengawas Pembina');
                                toast.success(`Laporan ${sc.name} telah disetujui.`);
                                loadData();
                              }}
                              className="btn btn-sm btn-success"
                              style={{ fontSize: '11px' }}
                            >
                              <i className="fa-solid fa-check" /> Verifikasi
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Rekening Koran Viewer */}
        {selectedRekeningKoran && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'var(--modal-backdrop)', backdropFilter: 'blur(var(--modal-blur))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Pratinjau Rekening Koran - {selectedRekeningKoran.schoolName}</h3>
                <button type="button" onClick={() => setSelectedRekeningKoran(null)} className="btn btn-sm btn-secondary">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="card-body" style={{ flex: 1, overflow: 'auto', padding: '16px', textAlign: 'center' }}>
                {selectedRekeningKoran.fileUrl.startsWith('data:application/pdf') || selectedRekeningKoran.fileUrl.endsWith('.pdf') ? (
                  <iframe src={selectedRekeningKoran.fileUrl} style={{ width: '100%', height: '480px', border: 'none', borderRadius: '12px' }} />
                ) : (
                  <img src={selectedRekeningKoran.fileUrl} alt="Rekening Koran" style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '12px' }} />
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
