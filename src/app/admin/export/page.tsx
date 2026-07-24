'use client';

import React, { useState, useEffect } from 'react';
import type { School, Category, PengawasData } from '@/lib/schoolsData';
import { getSubmissions, getSchools, getCategories, getSupervisors } from '@/lib/db';
import type { Submission } from '@/lib/db';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';
import PdfExport from '@/components/PdfExport';

export default function AdminExport() {
  const { user, loading, logout } = useAuth('admin');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supervisors, setSupervisors] = useState<PengawasData[]>([]);
  const [filterGugus, setFilterGugus] = useState('all');

  useEffect(() => {
    if (loading || !user) return;
    getSubmissions().then(setSubmissions);
    getSchools().then(setSchools);
    getCategories().then(setCategories);
    getSupervisors().then(setSupervisors);
  }, [loading, user]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const header = ['Nama Sekolah', 'NPSN', 'Gugus', 'Total Berkas', 'Disetujui', 'Progres (%)'];
    const rows = filteredSchools.map(s => {
      const schoolSubs = submissions.filter(sub => sub.schoolNpsn === s.npsn);
      const approved = schoolSubs.filter(sub => sub.status === 'approved').length;
      const progressPercent = categories.length > 0 ? Math.round((approved / categories.length) * 100) : 0;
      return [
        s.name,
        s.npsn,
        s.gugus,
        categories.length.toString(),
        approved.toString(),
        `${progressPercent}%`
      ];
    });

    const csvContent = [header, ...rows].map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_koryandik_cibadak_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSchools = schools.filter(s => {
    return filterGugus === 'all' || s.gugus === filterGugus;
  });

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Ekspor & Cetak Rekapitulasi"
      headerSubtitle="Download file rekap format CSV atau cetak langsung bukti rekap kecamatan"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area animate-fade-in">
          {/* Controls no-print */}
          <div className="card no-print" style={{ marginBottom: '24px' }}>
            <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Filter Gugus:</label>
                <select
                  className="form-control"
                  value={filterGugus}
                  onChange={(e) => setFilterGugus(e.target.value)}
                  style={{ width: 'auto', minWidth: '150px' }}
                >
                  <option value="all">Semua Gugus</option>
                  <option value="I">Gugus I</option>
                  <option value="II">Gugus II</option>
                  <option value="III">Gugus III</option>
                  <option value="IV">Gugus IV</option>
                  <option value="V">Gugus V</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" onClick={handleDownloadCSV}>
                  Download CSV <i className="fa-solid fa-file-csv" style={{ marginLeft: '8px' }}></i>
                </button>
                <button className="btn btn-primary" onClick={handlePrint}>
                  Cetak Rekap <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Printable Recap Layout */}
          <div className="card print-container" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double var(--card-border)', paddingBottom: '16px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', textTransform: 'uppercase' }}>Rekap Pengumpulan Berkas Kecamatan</h2>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Kecamatan Cibadak, Kabupaten Sukabumi, Jawa Barat</p>
                {filterGugus !== 'all' && (
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>Wilayah: Gugus {filterGugus}</p>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                <p>Status: Transparan Real-Time</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                    <th style={{ padding: '10px 0' }}>Nama Sekolah</th>
                    <th>NPSN</th>
                    <th>Gugus</th>
                    <th>Jumlah Kategori</th>
                    <th>Disetujui</th>
                    <th style={{ textAlign: 'right' }}>Progres (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map(school => {
                    const schoolSubs = submissions.filter(s => s.schoolNpsn === school.npsn);
                    const approved = schoolSubs.filter(s => s.status === 'approved').length;
                    const progressPercent = categories.length > 0 ? Math.round((approved / categories.length) * 100) : 0;
                    return (
                      <tr key={school.npsn} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{school.name}</td>
                        <td><code>{school.npsn}</code></td>
                        <td>Gugus {school.gugus}</td>
                        <td>{categories.length} Kategori</td>
                        <td><span style={{ color: approved === categories.length ? 'var(--success)' : 'inherit', fontWeight: 'bold' }}>{approved} Berkas</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{progressPercent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Print Signatures */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '60px' }} className="print-only">
              <div style={{ textAlign: 'center', width: '220px' }}>
                <p style={{ fontSize: '13px' }}>Mengetahui,</p>
                <p style={{ fontSize: '13px' }}>{supervisors.find(s => s.role === 'pengawas')?.title || 'Pengawas Sekolah Bina'}</p>
                <div style={{ height: '70px' }}></div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{supervisors.find(s => s.role === 'pengawas')?.name || 'AHMAD YANI, S.Pd'}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NIP. {supervisors.find(s => s.role === 'pengawas')?.nip || '196512151986031005'}</p>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>

      <style jsx global>{`
        .print-only {
          display: none !important;
        }
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .sidebar {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
            padding: 0 !important;
            color: #000000 !important;
          }
          .print-only {
            display: block !important;
          }
          html {
            background: #ffffff !important;
            color: #000000 !important;
            color-scheme: light !important;
          }
        }
      `}</style>
      <PdfExport schools={schools} categories={categories} submissions={submissions} filterGugus={filterGugus} />
    </>
  );
}
