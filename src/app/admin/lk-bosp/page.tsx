'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getLkBospSubmissions, updateLkBospStatus } from '@/lib/db';
import { schoolsData, gugusData } from '@/lib/schoolsData';
import type { LkBospSubmission } from '@/lib/types';
import { toast } from 'sonner';

export default function AdminLkBospPage() {
  const { user, logout } = useAuth('admin');

  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedTw, setSelectedTw] = useState<number>(1); // 1, 2, 3, 4, 0 (0 = Total 1 Tahun)
  const [filterGugus, setFilterGugus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Rekening Koran Viewer
  const [selectedRekeningKoran, setSelectedRekeningKoran] = useState<{ schoolName: string; fileUrl: string; fileName: string } | null>(null);

  // Modal Review Status
  const [reviewModal, setReviewModal] = useState<{ id: string; schoolName: string; status: 'approved' | 'revision'; notes: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getLkBospSubmissions();
      setSubmissions(data);
    } catch {
      toast.error('Gagal memuat rekapitulasi LK BOSP.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered schools according to selected filters
  const filteredSchools = useMemo(() => {
    return schoolsData.filter(sc => {
      const matchGugus = filterGugus === 'all' || sc.gugus === filterGugus;
      const matchSearch = sc.name.toLowerCase().includes(searchQuery.toLowerCase()) || sc.npsn.includes(searchQuery);
      return matchGugus && matchSearch;
    });
  }, [filterGugus, searchQuery]);

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
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', fontWeight: 700 }}
              >
                <option value={2026}>Tahun 2026</option>
                <option value={2025}>Tahun 2025</option>
              </select>

              {/* Gugus Select */}
              <select
                value={filterGugus}
                onChange={(e) => setFilterGugus(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg-elevated)', fontWeight: 700 }}
              >
                <option value="all">Semua Gugus (Gugus I - V)</option>
                {gugusData.map(g => (
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
                  {filteredSchools.map((sc) => {
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
                              <i className="fa-solid fa-file-pdf" style={{ color: '#f59e0b', marginRight: '4px' }} /> Pratinjau
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
                          {sub ? (
                            <button
                              type="button"
                              onClick={() => setReviewModal({ id: sub.id, schoolName: sc.name, status: sub.status === 'approved' ? 'approved' : 'approved', notes: sub.notes || '' })}
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: '11px' }}
                            >
                              <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }} /> Verifikasi
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

        {/* Modal Pratinjau Rekening Koran Inline */}
        {selectedRekeningKoran && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'var(--modal-backdrop)', backdropFilter: 'blur(var(--modal-blur))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3><i className="fa-solid fa-file-pdf" style={{ color: '#f59e0b', marginRight: '8px' }} /> Pratinjau Bukti Rekening Koran - {selectedRekeningKoran.schoolName}</h3>
                <button type="button" onClick={() => setSelectedRekeningKoran(null)} className="btn btn-sm btn-secondary">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="card-body" style={{ flex: 1, overflow: 'auto', padding: '16px', textAlign: 'center' }}>
                {selectedRekeningKoran.fileUrl.startsWith('data:application/pdf') || selectedRekeningKoran.fileUrl.endsWith('.pdf') ? (
                  <iframe src={selectedRekeningKoran.fileUrl} style={{ width: '100%', height: '500px', border: 'none', borderRadius: '12px' }} />
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
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'var(--modal-backdrop)', backdropFilter: 'blur(var(--modal-blur))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card glass-card animate-scale-in" style={{ width: '100%', maxWidth: '500px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Verifikasi Laporan LK BOSP - {reviewModal.schoolName}</h3>
                <button type="button" onClick={() => setReviewModal(null)} className="btn btn-sm btn-secondary">
                  <i className="fa-solid fa-xmark" />
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

      </div>
    </DashboardShell>
  );
}
