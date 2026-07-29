'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getLkBospSubmissions, saveLkBospSubmission, getSchools } from '@/lib/db';
import { parseLkBospExcel } from '@/lib/lkBospParser';
import type { School } from '@/lib/schoolsData';
import type { LkBospSubmission, LkBospBreakdown } from '@/lib/types';
import { toast } from 'sonner';

export default function SchoolLkBospPage() {
  const { user, logout } = useAuth('school');
  const school = (user?.details as School | undefined) ?? null;

  const [activeTw, setActiveTw] = useState<1 | 2 | 3 | 4>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [submissions, setSubmissions] = useState<LkBospSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [parsing, setParsing] = useState(false);

  // Current submission for active TW
  const currentSub = submissions.find(s => s.periodYear === selectedYear && s.triwulan === activeTw) || null;

  // Form states
  const [excelFileName, setExcelFileName] = useState('');
  const [rekeningKoranFileName, setRekeningKoranFileName] = useState('');
  const [rekeningKoranUrl, setRekeningKoranUrl] = useState('');
  const [saldoAwalInput, setSaldoAwalInput] = useState<number>(0);
  const [totalPenerimaanInput, setTotalPenerimaanInput] = useState<number>(0);
  const [rekeningKoranBalanceInput, setRekeningKoranBalanceInput] = useState<number>(0);
  const [parsedBreakdown, setParsedBreakdown] = useState<LkBospBreakdown | null>(null);

  const [allSchools, setAllSchools] = useState<School[]>([]);

  useEffect(() => {
    loadExistingSubmission();
  }, [user, selectedYear, activeTw]);

  const loadExistingSubmission = async () => {
    setLoadingData(true);
    try {
      const [subs, schoolList] = await Promise.all([
        getLkBospSubmissions(),
        getSchools()
      ]);
      setAllSchools(schoolList);
      setSubmissions(subs);
      
      const npsn = school?.npsn || user?.npsn;
      const found = subs.find(s => s.npsn === npsn && s.periodYear === selectedYear && s.triwulan === activeTw);
      if (found) {
        setSaldoAwalInput(found.saldoAwal);
        setTotalPenerimaanInput(found.totalPenerimaan);
        setParsedBreakdown(found.breakdown);
        setExcelFileName(found.excelFileName || '');
        setRekeningKoranFileName(found.rekeningKoranName || '');
        setRekeningKoranUrl(found.rekeningKoranUrl || '');
        setRekeningKoranBalanceInput(found.sisaSaldo || 0);
      } else {
        setExcelFileName('');
        setRekeningKoranFileName('');
        setRekeningKoranUrl('');
        setSaldoAwalInput(0);
        setTotalPenerimaanInput(0);
        setRekeningKoranBalanceInput(0);
        setParsedBreakdown(null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingData(false);
    }
  };

  // Handle Excel Upload & Auto-Parsing
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) return;

        const parsed = parseLkBospExcel(buffer, school?.npsn || user?.npsn, allSchools);
        if (parsed.saldoAwal > 0) setSaldoAwalInput(parsed.saldoAwal);
        if (parsed.totalPenerimaan > 0) setTotalPenerimaanInput(parsed.totalPenerimaan);

        setParsedBreakdown(parsed.breakdown);
        toast.success(`Berhasil mengekstrak data dari ${file.name}`);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        toast.error('Gagal membaca format file Excel. Pastikan menggunakan format LK BOS resmi.');
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle Rekening Koran Upload
  const handleRekeningKoranUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran berkas Rekening Koran maksimal 10MB.');
      return;
    }

    setRekeningKoranFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRekeningKoranUrl(event.target.result as string);
        toast.success('Bukti Rekening Koran berhasil dimuat.');
      }
    };
    reader.readAsDataURL(file);
  };

  const calcTotalRealisasi = parsedBreakdown ? (parsedBreakdown.totalBarangJasa + parsedBreakdown.totalModal) : 0;
  const calcSisaSaldo = (saldoAwalInput + totalPenerimaanInput) - calcTotalRealisasi;
  const hasRekeningKoran = Boolean(rekeningKoranUrl);
  const isBalanceMatch = hasRekeningKoran && Math.abs(calcSisaSaldo - rekeningKoranBalanceInput) < 100 && (rekeningKoranBalanceInput > 0 || calcSisaSaldo === 0);

  // Auto fill rekening koran balance input from parsed excel if not set
  useEffect(() => {
    if (parsedBreakdown && rekeningKoranBalanceInput === 0 && calcSisaSaldo > 0) {
      setRekeningKoranBalanceInput(calcSisaSaldo);
    }
  }, [parsedBreakdown, calcSisaSaldo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const npsn = school?.npsn || user.npsn || '20202279';
    const schoolName = school?.name || 'SD Negeri Binaan';
    const gugus = school?.gugus || '1';

    if (!excelFileName && !parsedBreakdown) {
      toast.error('Silakan unggah berkas Excel LK BOSP terlebih dahulu.');
      return;
    }

    if (!rekeningKoranUrl) {
      toast.error('Silakan unggah bukti Rekening Koran terlebih dahulu.');
      return;
    }

    try {
      await saveLkBospSubmission({
        id: currentSub?.id,
        npsn,
        schoolName,
        gugus,
        periodYear: selectedYear,
        triwulan: activeTw,
        excelFileName,
        excelFileUrl: '#',
        rekeningKoranName: rekeningKoranFileName,
        rekeningKoranUrl,
        saldoAwal: saldoAwalInput,
        totalPenerimaan: totalPenerimaanInput,
        totalRealisasi: calcTotalRealisasi,
        sisaSaldo: calcSisaSaldo,
        isBalanceMatch,
        breakdown: parsedBreakdown || {
          bhp: 0, honor: 0, dayaJasa: 0, pemeliharaan: 0, upahPemeliharaan: 0,
          lombaBimtek: 0, honorKegiatan: 0, makanMinum: 0, perdin: 0, kibB: 0, kibE: 0,
          totalBarangJasa: 0, totalModal: 0
        },
        status: 'pending',
      });

      toast.success(`Laporan LK BOSP Triwulan ${activeTw} Tahun ${selectedYear} berhasil disimpan!`);
      loadExistingSubmission();
    } catch {
      toast.error('Gagal menyimpan laporan LK BOSP.');
    }
  };

  if (!user) return <LoadingScreen />;

  return (
    <DashboardShell
      user={user}
      onLogout={logout}
      brandTitle={school?.name || 'SD Binaan'}
      brandSubtitle={school ? `NPSN: ${school.npsn}` : undefined}
      headerTitle="LK BOSP & Rekening Koran"
      headerSubtitle="Pengelolaan Lembar Kerja BOSP & Bukti Kas Bank Triwulan"
      headerActions={<CommandPalette currentUser={{ role: 'school', details: school, npsn: school?.npsn || user.npsn }} onThemeToggle={() => toggleThemeWithTransition()} />}
    >
      <div className="content-area animate-fade-in">

        {/* Top Header Card */}
        <div className="card glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '8px', display: 'inline-block' }}>
                <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" style={{ marginRight: '6px' }} />
                LK BOSP Regular {selectedYear}
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Laporan Lembar Kerja Triwulan</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Unggah file Excel LK BOS dan Rekening Koran resmi untuk diverifikasi oleh Korwil/Kecamatan Cibadak.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tahun Anggaran:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--card-border)',
                  background: 'var(--card-bg-elevated)', color: 'var(--text-primary)', fontWeight: 700
                }}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>

          {/* Triwulan Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px' }}>
            {([1, 2, 3, 4] as const).map((tw) => {
              const sub = submissions.find(s => s.periodYear === selectedYear && s.triwulan === tw);
              const isActive = activeTw === tw;
              const statusColor = sub ? (sub.status === 'approved' ? 'var(--success)' : sub.status === 'revision' ? 'var(--danger)' : 'var(--warning)') : 'var(--text-muted)';
              const statusLabel = sub ? (sub.status === 'approved' ? 'Disetujui' : sub.status === 'revision' ? 'Perlu Revisi' : 'Menunggu Review') : 'Belum Unggah';

              return (
                <button
                  key={tw}
                  type="button"
                  onClick={() => setActiveTw(tw)}
                  style={{
                    padding: '14px', borderRadius: '14px', border: isActive ? `2px solid var(--primary)` : '1px solid var(--card-border)',
                    background: isActive ? 'var(--primary-glow)' : 'var(--card-bg-elevated)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: isActive ? 'var(--primary)' : 'var(--text-primary)' }}>
                      Triwulan {tw}
                    </span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Status: <strong style={{ color: statusColor }}>{statusLabel}</strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Submission Status Banner if notes or revision */}
        {currentSub && currentSub.notes && (
          <div className="card" style={{
            marginBottom: '24px', padding: '16px 20px', borderRadius: '14px',
            background: currentSub.status === 'revision' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${currentSub.status === 'revision' ? 'var(--danger)' : 'var(--primary)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <i className={`fa-solid ${currentSub.status === 'revision' ? 'fa-triangle-exclamation text-danger' : 'fa-circle-info text-primary'}`} style={{ fontSize: '18px', marginTop: '2px' }} aria-hidden="true" />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>Catatan Verifikator Korwil:</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{currentSub.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload & Parsing Form */}
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            
            {/* Box 1: File Excel LK BOSP */}
            <div className="card glass-card">
              <div className="card-header">
                <h2><i className="fa-solid fa-file-excel" aria-hidden="true" style={{ color: '#10b981' }} /> 1. Unggah File Excel LK BOSP</h2>
              </div>
              <div className="card-body">
                <div style={{
                  padding: '24px', borderRadius: '16px', border: '2px dashed var(--card-border)',
                  background: 'var(--card-bg-elevated)', textAlign: 'center', cursor: 'pointer'
                }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '12px', display: 'block' }} aria-hidden="true" />
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    {excelFileName ? excelFileName : 'Klik atau Tarik File Excel LK BOS (.xlsx)'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sistem mengekstrak otomatis sheet Realisasi BPK, BHP, KIB B, KIB E, & Pemeliharaan.
                  </p>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </div>

                {parsing && (
                  <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--primary)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Membaca & mengekstrak data Excel...
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Bukti Rekening Koran Bank */}
            <div className="card glass-card">
              <div className="card-header">
                <h2><i className="fa-solid fa-receipt" aria-hidden="true" style={{ color: '#f59e0b' }} /> 2. Unggah Bukti Rekening Koran</h2>
              </div>
              <div className="card-body">
                <div style={{
                  padding: '24px', borderRadius: '16px', border: '2px dashed var(--card-border)',
                  background: 'var(--card-bg-elevated)', textAlign: 'center', cursor: 'pointer'
                }}>
                  <i className="fa-solid fa-file-pdf" style={{ fontSize: '32px', color: '#f59e0b', marginBottom: '12px', display: 'block' }} aria-hidden="true" />
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    {rekeningKoranFileName ? rekeningKoranFileName : 'Unggah Rekening Koran PDF / Foto (JPG/PNG)'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Bukti cetak kas bank resmi s.d. akhir Triwulan {activeTw} {selectedYear}.
                  </p>
                  <input
                    type="file"
                    accept=".pdf, image/*"
                    onChange={handleRekeningKoranUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </div>

                {rekeningKoranUrl && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: 'var(--card-bg-elevated)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }} /> File Rekening Koran Siap
                    </span>
                    <a href={rekeningKoranUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>
                      <i className="fa-solid fa-eye" /> Pratinjau
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Balance & Financial Totals Card */}
          <div className="card glass-card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2><i className="fa-solid fa-calculator" aria-hidden="true" /> 3. Ringkasan Kas & Imbangan Saldo Triwulan {activeTw}</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Saldo Awal (Rp):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={saldoAwalInput}
                    onChange={(e) => setSaldoAwalInput(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Total Penerimaan TW {activeTw} (Rp):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={totalPenerimaanInput}
                    onChange={(e) => setTotalPenerimaanInput(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Total Realisasi Belanja (Rp):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={calcTotalRealisasi}
                    readOnly
                    style={{ background: 'var(--card-bg-elevated)', fontWeight: 700, color: 'var(--primary)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Sisa Saldo Kas Buku (Rp):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={calcSisaSaldo}
                    readOnly
                    style={{ background: 'var(--card-bg-elevated)', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Nominal Saldo Rekening Koran (Rp):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={rekeningKoranBalanceInput}
                    onChange={(e) => setRekeningKoranBalanceInput(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Balance Verification Indicator */}
              {!hasRekeningKoran ? (
                <div style={{
                  padding: '14px 20px', borderRadius: '12px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid var(--warning)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '20px', color: 'var(--warning)' }} aria-hidden="true" />
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--warning)' }}>
                        Menunggu Bukti Rekening Koran
                      </strong>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Silakan unggah berkas Rekening Koran PDF / Foto di Box 2 untuk memverifikasi kesesuaian saldo kas bank.
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-warning">MENUNGGU REKENING KORAN</span>
                </div>
              ) : (
                <div style={{
                  padding: '14px 20px', borderRadius: '12px',
                  background: isBalanceMatch ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${isBalanceMatch ? 'var(--success)' : 'var(--danger)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className={`fa-solid ${isBalanceMatch ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}`} style={{ fontSize: '20px' }} aria-hidden="true" />
                    <div>
                      <strong style={{ fontSize: '13px', color: isBalanceMatch ? 'var(--success)' : 'var(--danger)' }}>
                        {isBalanceMatch ? 'Keseimbangan Saldo Cocok (Match)' : 'Peringatan: Selisih Saldo Terdeteksi'}
                      </strong>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isBalanceMatch
                          ? 'Sisa saldo di laporan Excel LK BOS tepat sesuai dengan saldo akhir di Rekening Koran Bank.'
                          : `Terdapat selisih Rp ${Math.abs(calcSisaSaldo - rekeningKoranBalanceInput).toLocaleString('id-ID')} antara saldo laporan dan Rekening Koran.`}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${isBalanceMatch ? 'badge-success' : 'badge-danger'}`}>
                    {isBalanceMatch ? 'BALANCE OK' : 'MISMATCH'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Per Jenis Belanja Table */}
          {parsedBreakdown && (
            <div className="card glass-card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h2><i className="fa-solid fa-list-check" aria-hidden="true" /> 4. Rincian Belanja per Jenis Kegiatan (Parsed Data)</h2>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Kelompok Belanja</th>
                        <th>Jenis Pengeluaran Kegiatan</th>
                        <th style={{ textAlign: 'right' }}>Jumlah Realisasi (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Belanja Barang Pakai Habis (BHP ATK/Kebersihan/Listrik)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.bhp.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Jasa Tenaga Pendidik dan Kependidikan (Honor Guru/Tenaga Kerja)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.honor.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>3</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Daya dan Jasa (Listrik, Air, Telepon, Internet)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.dayaJasa.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>4</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Bahan Pemeliharaan Sarana & Gedung Sekolah</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.pemeliharaan.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>5</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Upah Pemeliharaan (Jasa Tukang Perbaikan Fisik)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.upahPemeliharaan.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>6</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Biaya Pendaftaran Lomba / Bimtek / Rakor / Workshop</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.lombaBimtek.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>7</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Honorarium Kegiatan / Panitia</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.honorKegiatan.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>8</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Makan dan Minum Kegiatan Rapat / Acara</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.makanMinum.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>9</td>
                        <td><span className="badge badge-outline">Barang & Jasa</span></td>
                        <td>Perjalanan Dinas / Transport Kegiatan</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.perdin.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr style={{ background: 'var(--primary-glow)' }}>
                        <td colSpan={3}><strong>TOTAL BELANJA BARANG DAN JASA</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                          {parsedBreakdown.totalBarangJasa.toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td>10</td>
                        <td><span className="badge badge-primary">Belanja Modal</span></td>
                        <td>Peralatan dan Mesin (KIB B - Laptop, Printer, Sound, AC, dll)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.kibB.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td>11</td>
                        <td><span className="badge badge-primary">Belanja Modal</span></td>
                        <td>Aset Tetap Lainnya (KIB E - Buku Utama/Pendamping, Olahraga, Kesenian)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{parsedBreakdown.kibE.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr style={{ background: 'var(--success-glow)' }}>
                        <td colSpan={3}><strong>TOTAL BELANJA MODAL (KIB B + KIB E)</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                          {parsedBreakdown.totalModal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr style={{ fontSize: '15px', background: 'var(--card-bg-elevated)' }}>
                        <th colSpan={3}>TOTAL REALISASI DANA BOS TRIWULAN {activeTw}</th>
                        <th style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 900 }}>
                          {calcTotalRealisasi.toLocaleString('id-ID')}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '14px' }}>
              <i className="fa-solid fa-paper-plane" style={{ marginRight: '8px' }} />
              Simpan & Kirim Laporan LK BOSP TW {activeTw}
            </button>
          </div>

        </form>

      </div>
    </DashboardShell>
  );
}
