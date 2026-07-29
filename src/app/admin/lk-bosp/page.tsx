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

export default function AdminLkBospPage() {
  const { user, logout } = useAuth('admin');

  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedTw, setSelectedTw] = useState<number>(1); // 1, 2, 3, 4, 0 (0 = Total 1 Tahun)
  const [filterGugus, setFilterGugus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Rekening Koran Viewer
  const [selectedRekeningKoran, setSelectedRekeningKoran] = useState<{ schoolName: string; fileUrl: string; fileName: string } | null>(null);

  // Modal Review Status
  const [reviewModal, setReviewModal] = useState<{ id: string; schoolName: string; status: 'approved' | 'revision'; notes: string } | null>(null);

  // Modal Detail Rincian Belanja
  const [detailModal, setDetailModal] = useState<LkBospSubmission | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subData, schoolData, gugusDataList] = await Promise.all([
        getLkBospSubmissions(),
        getSchools(),
        getGugusData()
      ]);
      setSubmissions(subData);
      setSchools(schoolData);
      setGuguses(gugusDataList);
    } catch {
      toast.error('Gagal memuat rekapitulasi LK BOSP.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Year Options from database
  const yearOptions = useMemo(() => {
    const years = new Set([2026, 2025, ...submissions.map(s => s.periodYear)]);
    return Array.from(years).sort((a, b) => b - a);
  }, [submissions]);

  // Filtered schools according to selected filters
  const filteredSchools = useMemo(() => {
    return schools.filter(sc => {
      const matchGugus = filterGugus === 'all' || sc.gugus === filterGugus;
      const matchSearch = sc.name.toLowerCase().includes(searchQuery.toLowerCase()) || sc.npsn.includes(searchQuery);
      return matchGugus && matchSearch;
    });
  }, [schools, filterGugus, searchQuery]);

  // Filtered submissions according to selected filters
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchYear = s.periodYear === selectedYear;
      const matchTw = selectedTw === 0 || s.triwulan === selectedTw;
      const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
      const matchSearch = s.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) || s.npsn.includes(searchQuery);
      return matchYear && matchTw && matchGugus && matchSearch;
    });
  }, [submissions, selectedYear, selectedTw, filterGugus, searchQuery]);

  // Aggregate stats se-Kecamatan
  const aggregateStats = useMemo(() => {
    let totalRealisasi = 0;
    let totalBhp = 0;
    let totalKibB = 0;
    let totalKibE = 0;
    let totalPemeliharaan = 0;

    filteredSubmissions.forEach(s => {
      totalRealisasi += (s.totalRealisasi || 0);
      if (s.breakdown) {
        totalBhp += (s.breakdown.bhp || 0);
        totalKibB += (s.breakdown.kibB || 0);
        totalKibE += (s.breakdown.kibE || 0);
        totalPemeliharaan += (s.breakdown.pemeliharaan || 0) + (s.breakdown.upahPemeliharaan || 0);
      }
    });

    return {
      totalRealisasi,
      totalBhp,
      totalKibB,
      totalKibE,
      totalPemeliharaan,
      submittedCount: filteredSubmissions.length,
      approvedCount: filteredSubmissions.filter(s => s.status === 'approved').length,
    };
  }, [filteredSubmissions]);

  const handleUpdateStatus = async () => {
    if (!reviewModal) return;
    try {
      await updateLkBospStatus(reviewModal.id, reviewModal.status, reviewModal.notes);
      toast.success(`Status laporan ${reviewModal.schoolName} berhasil diperbarui.`);
      setReviewModal(null);
      loadData();
    } catch {
      toast.error('Gagal memperbarui status laporan.');
    }
  };

  const handleExportCsv = () => {
    if (filteredSubmissions.length === 0) {
      toast.error('Tidak ada data laporan untuk diekspor.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'NPSN,Nama Sekolah,Gugus,Tahun,Triwulan,Saldo Awal,Total Penerimaan,BHP,Honor,DayaJasa,Pemeliharaan,KIB B,KIB E,Total Realisasi,Sisa Saldo,Status\n';

    filteredSubmissions.forEach(s => {
      const b = s.breakdown || {};
      const row = [
        `"${s.npsn}"`,
        `"${s.schoolName}"`,
        `"Gugus ${s.gugus}"`,
        s.periodYear,
        `TW ${s.triwulan}`,
        s.saldoAwal,
        s.totalPenerimaan,
        b.bhp || 0,
        b.honor || 0,
        b.dayaJasa || 0,
        (b.pemeliharaan || 0) + (b.upahPemeliharaan || 0),
        b.kibB || 0,
        b.kibE || 0,
        s.totalRealisasi,
        s.sisaSaldo,
        s.status
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `REKAP_LK_BOSP_CIBADAK_${selectedYear}_TW${selectedTw || 'ALL'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File Rekapitulasi CSV BPK berhasil diunduh.');
  };

  if (!user) return <LoadingScreen />;

  return (
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Rekapitulasi LK BOSP & Rekening Koran"
      headerSubtitle="Monitoring Penggunaan Dana BOSP & Kas Rekening 49 Sekolah Se-Kecamatan"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
      <div className="content-area animate-fade-in">

        {/* Top Header Card */}
        <div className="card glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '8px', display: 'inline-block' }}>
                <i className="fa-solid fa-calculator" aria-hidden="true" style={{ marginRight: '6px' }} />
                Korwil Pendidikan Kecamatan Cibadak
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Monitoring & Rekapitulasi LK BOSP</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Pantau akumulasi nominal belanja per jenis kegiatan dan verifikasi bukti rekening koran bank.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', outline: 'none' }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>

              {/* Gugus Select */}
              <select
                value={filterGugus}
                onChange={(e) => setFilterGugus(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', fontWeight: 700 }}
              >
                <option value="all">Semua Wilayah Gugus ({guguses.length} Gugus)</option>
                {guguses.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              <button type="button" onClick={handleExportCsv} className="btn btn-success" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <i className="fa-solid fa-file-excel" style={{ marginRight: '6px' }} />
                Ekspor Rekap BPK (.csv)
              </button>
            </div>
          </div>

          {/* Triwulan Selector Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 1, label: 'Triwulan I (Jan-Mar)' },
              { id: 2, label: 'Triwulan II (Apr-Jun)' },
              { id: 3, label: 'Triwulan III (Jul-Sep)' },
              { id: 4, label: 'Triwulan IV (Okt-Des)' },
              { id: 0, label: ' Akumulasi Total 1 Tahun' },
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

        {/* Bento Stat Cards: Total Nominal Se-Kecamatan */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card glass-panel">
            <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
              <i className="fa-solid fa-sack-dollar" aria-hidden="true" />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '18px' }}>Rp {aggregateStats.totalRealisasi.toLocaleString('id-ID')}</span>
              <span className="stat-label">Total Realisasi BOSP {selectedTw ? `TW ${selectedTw}` : '1 Tahun'}</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
              <i className="fa-solid fa-box-archive" aria-hidden="true" />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '18px' }}>Rp {aggregateStats.totalBhp.toLocaleString('id-ID')}</span>
              <span className="stat-label">Total Belanja Barang Habis Pakai (BHP)</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
              <i className="fa-solid fa-laptop" aria-hidden="true" />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '18px' }}>Rp {aggregateStats.totalKibB.toLocaleString('id-ID')}</span>
              <span className="stat-label">Total Belanja Modal KIB B (Peralatan/Mesin)</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon" style={{ background: 'var(--purple-glow)', color: 'var(--purple)' }}>
              <i className="fa-solid fa-book" aria-hidden="true" />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '18px' }}>Rp {aggregateStats.totalKibE.toLocaleString('id-ID')}</span>
              <span className="stat-label">Total Belanja Modal KIB E (Buku/Aset Lain)</span>
            </div>
          </div>
        </div>

        {/* Search Bar & Monitoring Table */}
        <div className="card glass-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2><i className="fa-solid fa-table-list" aria-hidden="true" /> Monitoring Laporan 49 Sekolah Dasar</h2>
            
            <input
              type="text"
              placeholder="Cari nama sekolah atau NPSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ maxWidth: '280px', fontSize: '13px' }}
            />
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sekolah & NPSN</th>
                    <th>Gugus</th>
                    <th>Periode</th>
                    <th style={{ textAlign: 'right' }}>Total Realisasi (Rp)</th>
                    <th style={{ textAlign: 'right' }}>Sisa Saldo Rekening</th>
                    <th>Bukti Rekening Koran</th>
                    <th>Status Review</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', marginBottom: '8px', display: 'block', opacity: 0.5 }} aria-hidden="true" />
                        Belum ada data laporan LK BOSP yang sesuai dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSchools.map((sc) => {
                      const sub = submissions.find(s => s.npsn === sc.npsn && s.periodYear === selectedYear && (selectedTw === 0 || s.triwulan === selectedTw));

                      return (
                        <tr key={sc.npsn}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{sc.name}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NPSN: {sc.npsn}</span>
                          </td>
                          <td><span className="badge badge-outline">Gugus {sc.gugus}</span></td>
                          <td>{sub ? `TW ${sub.triwulan} / ${sub.periodYear}` : '-'}</td>
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
                                onClick={() => setSelectedRekeningKoran({ schoolName: sc.name, fileUrl: sub.rekeningKoranUrl!, fileName: sub.rekeningKoranName || 'Rekening Koran' })}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '11px' }}
                              >
                                <i className="fa-solid fa-file-pdf" style={{ color: 'var(--warning)', marginRight: '4px' }} /> Pratinjau
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Belum Unggah</span>
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
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {sub ? (
                                <>
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
                                    onClick={() => setReviewModal({ id: sub.id, schoolName: sc.name, status: sub.status === 'approved' ? 'approved' : 'approved', notes: sub.notes || '' })}
                                    className="btn btn-sm btn-primary"
                                    style={{ fontSize: '11px' }}
                                  >
                                    <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }} /> Verifikasi
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                              )}
                            </div>
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

        {/* Modal Pratinjau Rekening Koran Inline */}
        {selectedRekeningKoran && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
            background: 'var(--modal-backdrop)',
            backdropFilter: 'blur(var(--modal-blur))',
            WebkitBackdropFilter: 'blur(var(--modal-blur))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3><i className="fa-solid fa-file-pdf" style={{ color: 'var(--warning)', marginRight: '8px' }} /> Pratinjau Bukti Rekening Koran - {selectedRekeningKoran.schoolName}</h3>
                <button type="button" onClick={() => setSelectedRekeningKoran(null)} className="btn btn-sm btn-secondary" aria-label="Tutup">
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <div className="card-body" style={{ flex: 1, overflow: 'auto', padding: '16px', textAlign: 'center' }}>
                {selectedRekeningKoran.fileUrl.startsWith('data:application/pdf') || selectedRekeningKoran.fileUrl.endsWith('.pdf') ? (
                  <iframe src={selectedRekeningKoran.fileUrl} style={{ width: '100%', height: '500px', border: 'none', borderRadius: '12px' }} title="Rekening Koran PDF Viewer" />
                ) : (
                  <img src={selectedRekeningKoran.fileUrl} alt={selectedRekeningKoran.fileName} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '12px' }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Review Status */}
        {reviewModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
            background: 'var(--modal-backdrop)',
            backdropFilter: 'blur(var(--modal-blur))',
            WebkitBackdropFilter: 'blur(var(--modal-blur))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '500px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Verifikasi Laporan LK BOSP - {reviewModal.schoolName}</h3>
                <button type="button" onClick={() => setReviewModal(null)} className="btn btn-sm btn-secondary" aria-label="Tutup">
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Status Verifikasi:</label>
                  <select
                    className="form-input"
                    value={reviewModal.status}
                    onChange={(e) => setReviewModal({ ...reviewModal, status: e.target.value as 'approved' | 'revision' })}
                  >
                    <option value="approved">Disetujui (Approved)</option>
                    <option value="revision">Perlu Revisi (Revision Required)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Catatan Supervisi / Alasan Revisi:</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Masukkan catatan perbaikan atau konfirmasi kelengkapan..."
                    value={reviewModal.notes}
                    onChange={(e) => setReviewModal({ ...reviewModal, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" onClick={() => setReviewModal(null)} className="btn btn-secondary">Batal</button>
                  <button type="button" onClick={handleUpdateStatus} className="btn btn-primary">Simpan Verifikasi</button>
                </div>
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

                  {/* Info Badge */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span className="badge badge-outline">Gugus {detailModal.gugus}</span>
                    <span className="badge badge-primary">TW {detailModal.triwulan} / {detailModal.periodYear}</span>
                    <span className={`badge ${detailModal.status === 'approved' ? 'badge-success' : detailModal.status === 'revision' ? 'badge-danger' : 'badge-warning'}`}>
                      {detailModal.status === 'approved' ? 'Disetujui' : detailModal.status === 'revision' ? 'Perlu Revisi' : 'Menunggu Review'}
                    </span>
                  </div>

                  {/* Breakdown Table - Realisasi BOS BPK Format */}
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
                        <tr>
                          <td>1</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Belanja Barang Pakai Habis (BHP ATK/Kebersihan/Listrik)</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.bhp || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>2</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Jasa Tenaga Pendidik dan Kependidikan (Honor Guru/Tenaga Kerja)</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.honor || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>3</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Daya dan Jasa (Listrik, Air, Telepon, Internet)</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.dayaJasa || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>4</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Bahan Pemeliharaan Sarana &amp; Gedung Sekolah</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.pemeliharaan || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>5</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Upah Pemeliharaan (Jasa Tukang Perbaikan Fisik)</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.upahPemeliharaan || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>6</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Biaya Pendaftaran Lomba / Bimtek / Rakor / Workshop</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.lombaBimtek || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>7</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Honorarium Kegiatan / Panitia</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.honorKegiatan || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>8</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Makan dan Minum Kegiatan Rapat / Acara</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.makanMinum || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>9</td>
                          <td><span className="badge badge-outline">Barang &amp; Jasa</span></td>
                          <td>Perjalanan Dinas / Transport Kegiatan</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.perdin || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr style={{ background: 'var(--primary-glow)' }}>
                          <td colSpan={3}><strong>TOTAL BELANJA BARANG DAN JASA</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>{(b.totalBarangJasa || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>10</td>
                          <td><span className="badge badge-primary">Belanja Modal</span></td>
                          <td>Peralatan dan Mesin (KIB B - Laptop, Printer, Sound, AC, dll)</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.kibB || 0).toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td>11</td>
                          <td><span className="badge badge-primary">Belanja Modal</span></td>
                          <td>Aset Tetap Lainnya (KIB E - Buku Utama/Pendamping, Olahraga, Kesenian)</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(b.kibE || 0).toLocaleString('id-ID')}</td>
                        </tr>
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
