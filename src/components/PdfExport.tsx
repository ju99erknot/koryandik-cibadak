'use client';

import React from 'react';
import type { School, Category } from '@/lib/schoolsData';
import type { Submission } from '@/lib/db';

interface PdfExportProps {
  schools: School[];
  categories: Category[];
  submissions: Submission[];
  filterGugus: string;
}

export default function PdfExport({ schools, categories, submissions, filterGugus }: PdfExportProps) {
  const filteredSchools = schools.filter(s => {
    return filterGugus === 'all' || s.gugus === filterGugus;
  });

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="print-only" style={{ padding: '40px', background: 'white', color: 'black', minHeight: '100vh' }}>
      {/* KOP Surat / Header */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px solid black', paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Kordinator Pelayanan Pendidikan (KORYANDIK)
          </h2>
          <h3 style={{ margin: '8px 0', fontSize: '20px' }}>Kecamatan Cibadak</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Laporan Rekapitulasi Pengumpulan Berkas Wajib Sekolah
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 8px' }}><strong>Tanggal Cetak:</strong> {currentDate}</p>
          <p style={{ margin: 0 }}><strong>Filter Gugus:</strong> {filterGugus === 'all' ? 'Semua Gugus' : filterGugus}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 8px' }}><strong>Total Sekolah:</strong> {filteredSchools.length}</p>
          <p style={{ margin: 0 }}><strong>Total Kategori Berkas:</strong> {categories.length}</p>
        </div>
      </div>

      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '12px', border: '1px solid #000', textAlign: 'center', width: '50px' }}>No</th>
            <th style={{ padding: '12px', border: '1px solid #000', textAlign: 'left' }}>Nama Sekolah</th>
            <th style={{ padding: '12px', border: '1px solid #000', textAlign: 'center' }}>NPSN</th>
            <th style={{ padding: '12px', border: '1px solid #000', textAlign: 'center' }}>Gugus</th>
            <th style={{ padding: '12px', border: '1px solid #000', textAlign: 'center' }}>Total Disetujui</th>
            <th style={{ padding: '12px', border: '1px solid #000', textAlign: 'center' }}>Progres</th>
          </tr>
        </thead>
        <tbody>
          {filteredSchools.map((s, idx) => {
            const schoolSubs = submissions.filter(sub => sub.schoolNpsn === s.npsn);
            const approved = schoolSubs.filter(sub => sub.status === 'approved').length;
            const progressPercent = categories.length > 0 ? Math.round((approved / categories.length) * 100) : 0;
            
            return (
              <tr key={s.npsn}>
                <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '10px', border: '1px solid #000' }}><strong>{s.name}</strong></td>
                <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'center' }}>{s.npsn}</td>
                <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'center' }}>{s.gugus}</td>
                <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'center' }}>
                  {approved} / {categories.length}
                </td>
                <td style={{ padding: '10px', border: '1px solid #000', textAlign: 'center' }}>
                  {progressPercent}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '60px' }}>
        <div style={{ textAlign: 'center', width: '250px' }}>
          <p style={{ margin: '0 0 80px' }}>Cibadak, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Admin Koryandik</p>
          <p style={{ margin: 0, fontWeight: 'bold', borderBottom: '1px solid black', paddingBottom: '4px' }}>________________________</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px' }}>NIP. .......................</p>
        </div>
      </div>
    </div>
  );
}
