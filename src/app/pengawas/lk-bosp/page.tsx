'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getLkBospSubmissions, updateLkBospStatus, getSchools, getGugusData } from '@/lib/db';
import type { LkBospSubmission, LkBospBreakdown } from '@/lib/types';
import type { School, GugusData } from '@/lib/schoolsData';
import { toast } from 'sonner';

export default function PengawasLkBospPage() {
  const { user, logout } = useAuth('pengawas');

  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTw, setSelectedTw] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [filterGugus, setFilterGugus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRekeningKoran, setSelectedRekeningKoran] = useState<{ schoolName: string; fileUrl: string } | null>(null);
  const [detailModal, setDetailModal] = useState<LkBospSubmission | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [subData, schoolData, gugusList] = await Promise.all([
        getLkBospSubmissions(),
        getSchools(),
        getGugusData()
      ]);
      setSubmissions(subData);
      setSchools(schoolData);
      setGuguses(gugusList);
    } catch {
      /* ignore */
    }
  };

  const yearOptions = useMemo(() => {
    const years = new Set([2026, 2025, ...submissions.map(s => s.periodYear)]);
    return Array.from(years).sort((a, b) => b - a);
  }, [submissions]);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.npsn.includes(searchQuery);
      return matchGugus && matchSearch;
    });
  }, [schools, filterGugus, searchQuery]);

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
              <span className="badge badge-primary" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-user-tie" aria-hidden="true" />
                Supervisi BOSP Pembina - Korwil Cibadak
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Monitoring &amp; Rekapitulasi LK BOSP Pembina</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Verifikasi berkas LK BOSP dan keselarasan saldo rekening koran sekolah binaan.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', outline: 'none' }}
              >
                {yearOptions.map((y: number) => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>

              <select
                value={filterGugus}
                onChange={(e) => setFilterGugus(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', outline: 'none' }}
              >
                <option value="all">Semua Wilayah Gugus ({guguses.length} Gugus)</option>
                {guguses.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
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
                  {filteredSchools.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', marginBottom: '8px', display: 'block', opacity: 0.5 }} aria-hidden="true" />
                        Belum ada data laporan LK BOSP yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredSchools.map((sc: School) => {
                      const sub = submissions.find(s => s.npsn === sc.npsn && s.periodYear === selectedYear && (selectedTw === 0 || s.triwulan === selectedTw));
                      return (
                        <tr key={sc.npsn}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{sc.name}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NPSN: {sc.npsn}</span>
                          </td>
                          <td><span className="badge badge-outline">Gugus {sc.gugus}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {sub ? `Rp ${sub.totalRealisasi.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: sub?.isBalanceMatch ? 'var(--success)' : (sub ? 'var(--danger)' : 'var(--text-muted)') }}>
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
                                <i className="fa-solid fa-eye" aria-hidden="true" /> Lihat
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
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setDetailModal(sub)}
                                  className="btn btn-sm btn-secondary"
                                  style={{ fontSize: '11px' }}
                                >
                                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ marginRight: '4px' }} /> Detail
                                </button>
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
                                  <i className="fa-solid fa-check" aria-hidden="true" /> Verifikasi
                                </button>
                              </div>
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

        {/* Modal Rekening Koran Viewer */}
        {selectedRekeningKoran && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
            background: 'var(--modal-backdrop)',
            backdropFilter: 'blur(var(--modal-blur))',
            WebkitBackdropFilter: 'blur(var(--modal-blur))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3><i className="fa-solid fa-file-pdf" style={{ color: 'var(--warning)', marginRight: '8px' }} aria-hidden="true" /> Pratinjau Rekening Koran - {selectedRekeningKoran.schoolName}</h3>
                <button type="button" onClick={() => setSelectedRekeningKoran(null)} className="btn btn-sm btn-secondary" aria-label="Tutup">
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <div className="card-body" style={{ flex: 1, overflow: 'auto', padding: '16px', textAlign: 'center' }}>
                {selectedRekeningKoran.fileUrl.startsWith('data:application/pdf') || selectedRekeningKoran.fileUrl.endsWith('.pdf') ? (
                  <iframe src={selectedRekeningKoran.fileUrl} style={{ width: '100%', height: '480px', border: 'none', borderRadius: '12px' }} title="Rekening Koran PDF Viewer" />
                ) : (
                  <img src={selectedRekeningKoran.fileUrl} alt="Rekening Koran" style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '12px' }} />
                )}
              </div>
            </div>
          </div>
        )}
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
                    <span className="badge badge-outline">Gugus {detailModal.gugus}</span>
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
