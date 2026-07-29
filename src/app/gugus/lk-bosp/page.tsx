'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getLkBospSubmissions, getSchools } from '@/lib/db';
import { getSchoolSummaryForPeriod } from '@/lib/lkBospParser';
import type { LkBospSubmission, LkBospBreakdown } from '@/lib/types';
import type { School, GugusData } from '@/lib/schoolsData';

export default function GugusLkBospPage() {
  const { user, logout } = useAuth('gugus');
  const gugusDetail = (user?.details as GugusData | undefined) ?? null;

  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTw, setSelectedTw] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [detailModal, setDetailModal] = useState<LkBospSubmission | null>(null);

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

  const yearOptions = useMemo(() => {
    const years = new Set([2026, 2025, ...submissions.map(s => s.periodYear)]);
    return Array.from(years).sort((a, b) => b - a);
  }, [submissions]);

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
              <span className="badge badge-primary" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-layer-group" aria-hidden="true" />
                Gugus {gugusDetail?.id || user.id} - Korwil Cibadak
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Monitoring &amp; Rekapitulasi BOSP Sekolah Anggota</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Pemantauan berkas LK BOSP dan kas rekening sekolah anggota gugus.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', outline: 'none' }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 1, label: 'Triwulan I (Jan-Mar)' },
              { id: 2, label: 'Triwulan II (Apr-Jun)' },
              { id: 3, label: 'Triwulan III (Jul-Sep)' },
              { id: 4, label: 'Triwulan IV (Okt-Des)' },
              { id: 0, label: 'Akumulasi Total 1 Tahun' },
            ].map(tw => (
              <button
                key={tw.id}
                type="button"
                onClick={() => setSelectedTw(tw.id)}
                className={`btn ${selectedTw === tw.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '12px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
              >
                {tw.label}
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
                    <th style={{ textAlign: 'center' }}>Aksi</th>
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
                      const sub = getSchoolSummaryForPeriod(submissions, sc.npsn, selectedYear, selectedTw);
                      return (
                        <tr key={sc.npsn}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{sc.name}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NPSN: {sc.npsn}</span>
                          </td>
                          <td>{sub ? (selectedTw === 0 ? `Akumulasi 1 Thn / ${selectedYear}` : `TW ${sub.triwulan} / ${sub.periodYear}`) : '-'}</td>
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
                          <td style={{ textAlign: 'center' }}>
                            {sub ? (
                              <button
                                type="button"
                                onClick={() => setDetailModal(sub)}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '11px' }}
                              >
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ marginRight: '4px' }} /> Detail
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
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

        {/* Modal Detail Rincian Belanja per Jenis Kegiatan */}
        {detailModal && (() => {
          const b = detailModal.breakdown || {} as LkBospBreakdown;
          const totalRealisasi = (b.totalBarangJasa || 0) + (b.totalModal || 0);
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
              background: 'var(--modal-backdrop)',
              backdropFilter: 'blur(var(--modal-blur))',
              WebkitBackdropFilter: 'blur(var(--modal-blur))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
              <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3><i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary)', marginRight: '8px' }} aria-hidden="true" /> Detail Rincian Realisasi BOS - {detailModal.schoolName}</h3>
                  <button type="button" onClick={() => setDetailModal(null)} className="btn btn-sm btn-secondary" aria-label="Tutup">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
                <div className="card-body" style={{ flex: 1, overflow: 'auto' }}>
                  {/* Ringkasan Kas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--card-bg-elevated)', border: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Saldo Awal</div>
                      <div style={{ fontSize: '16px', fontWeight: 800 }}>Rp {detailModal.saldoAwal.toLocaleString('id-ID')}</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--card-bg-elevated)', border: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Penerimaan</div>
                      <div style={{ fontSize: '16px', fontWeight: 800 }}>Rp {detailModal.totalPenerimaan.toLocaleString('id-ID')}</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Realisasi</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>Rp {detailModal.totalRealisasi.toLocaleString('id-ID')}</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', background: detailModal.isBalanceMatch ? 'var(--success-glow)' : 'var(--danger-glow)', border: `1px solid ${detailModal.isBalanceMatch ? 'var(--success)' : 'var(--danger)'}` }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Sisa Saldo</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: detailModal.isBalanceMatch ? 'var(--success)' : 'var(--danger)' }}>Rp {detailModal.sisaSaldo.toLocaleString('id-ID')}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">TW {detailModal.triwulan} / {detailModal.periodYear}</span>
                    <span className={`badge ${detailModal.status === 'approved' ? 'badge-success' : detailModal.status === 'revision' ? 'badge-danger' : 'badge-warning'}`}>
                      {detailModal.status === 'approved' ? 'Disetujui' : detailModal.status === 'revision' ? 'Perlu Revisi' : 'Menunggu Review'}
                    </span>
                  </div>

                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>No</th>
                          <th>Kelompok Belanja</th>
                          <th>Jenis Pengeluaran Kegiatan</th>
                          <th style={{ textAlign: 'right' }}>Jumlah Realisasi (Rp)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>1</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Belanja Barang Pakai Habis (BHP ATK/Kebersihan/Listrik)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.bhp || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>2</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Jasa Tenaga Pendidik dan Kependidikan (Honor)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.honor || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>3</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Daya dan Jasa (Listrik, Air, Telepon, Internet)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.dayaJasa || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>4</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Bahan Pemeliharaan Sarana &amp; Gedung Sekolah</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.pemeliharaan || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>5</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Upah Pemeliharaan (Jasa Tukang Perbaikan Fisik)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.upahPemeliharaan || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>6</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Biaya Pendaftaran Lomba / Bimtek / Workshop</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.lombaBimtek || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>7</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Honorarium Kegiatan / Panitia</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.honorKegiatan || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>8</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Makan dan Minum Kegiatan Rapat / Acara</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.makanMinum || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>9</td><td><span className="badge badge-outline">Barang &amp; Jasa</span></td><td>Perjalanan Dinas / Transport Kegiatan</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.perdin || 0).toLocaleString('id-ID')}</td></tr>
                        <tr style={{ background: 'var(--primary-glow)' }}>
                          <td colSpan={3}><strong>TOTAL BELANJA BARANG DAN JASA</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>{(b.totalBarangJasa || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr><td>10</td><td><span className="badge badge-primary">Belanja Modal</span></td><td>Peralatan dan Mesin (KIB B)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.kibB || 0).toLocaleString('id-ID')}</td></tr>
                        <tr><td>11</td><td><span className="badge badge-primary">Belanja Modal</span></td><td>Aset Tetap Lainnya (KIB E)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.kibE || 0).toLocaleString('id-ID')}</td></tr>
                        <tr style={{ background: 'var(--success-glow)' }}>
                          <td colSpan={3}><strong>TOTAL BELANJA MODAL (KIB B + KIB E)</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>{(b.totalModal || 0).toLocaleString('id-ID')}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr style={{ fontSize: '15px', background: 'var(--card-bg-elevated)' }}>
                          <th colSpan={3}>TOTAL REALISASI DANA BOS</th>
                          <th style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 900 }}>{totalRealisasi.toLocaleString('id-ID')}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </DashboardShell>
  );
}
