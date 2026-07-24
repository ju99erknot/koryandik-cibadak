'use client';

import React, { useState, useEffect } from 'react';
import type { School, Category } from '@/lib/schoolsData';
import { getSubmissions, getSchools, getCategories } from '@/lib/db';
import type { Submission } from '@/lib/db';
import CommandPalette from '@/components/CommandPalette';
import FancySelect from '@/components/FancySelect';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';

export default function AdminRecap() {
  const { user, loading, logout } = useAuth('admin');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGugus, setFilterGugus] = useState('all');

  useEffect(() => {
    if (loading || !user) return;
    getSubmissions().then(setSubmissions);
    getSchools().then(setSchools);
    getCategories().then(setCategories);
  }, [loading, user]);

  // Filter logic
  const filteredSchools = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.npsn.includes(searchTerm);
    const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
    return matchSearch && matchGugus;
  });

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Rekapitulasi Berkas Kecamatan"
      headerSubtitle="Matriks status kelengkapan berkas seluruh sekolah"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          {/* Matrix Card */}
          <div className="card animate-fade-in">
            <div className="card-header flex-col md:flex-row gap-4" style={{ alignItems: 'stretch' }}>
              <h2 style={{ display: 'flex', alignItems: 'center' }}><i className="fa-solid fa-table-cells" style={{ marginRight: '8px' }}></i> Matriks Pengumpulan</h2>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="input-with-icon" style={{ flex: 1, minWidth: '200px' }}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari sekolah..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <FancySelect
                  size="sm"
                  fullWidth={false}
                  value={filterGugus}
                  onChange={setFilterGugus}
                  icon="fa-solid fa-sitemap"
                  options={[
                    { value: 'all', label: 'Semua Gugus' },
                    { value: 'I', label: 'Gugus I' },
                    { value: 'II', label: 'Gugus II' },
                    { value: 'III', label: 'Gugus III' },
                    { value: 'IV', label: 'Gugus IV' },
                    { value: 'V', label: 'Gugus V' },
                  ]}
                />
              </div>
            </div>
            
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '180px', position: 'sticky', left: 0, background: 'var(--bg-space-dark)', zIndex: 1 }}>Nama Sekolah</th>
                      {categories.map(c => (
                        <th key={c.id} style={{ textAlign: 'center', minWidth: '100px' }} title={c.name}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <i className={c.icon} style={{ fontSize: '14px', color: 'var(--primary)' }}></i>
                            <span style={{ fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{c.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map(school => {
                      const schoolSubs = submissions.filter(s => s.schoolNpsn === school.npsn);
                      return (
                        <tr key={school.npsn}>
                          <td style={{ position: 'sticky', left: 0, background: 'var(--bg-space-dark)', zIndex: 1, fontWeight: 'bold' }}>
                            {school.name}
                            <br />
                            <small style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>Gugus {school.gugus}</small>
                          </td>
                          {categories.map(cat => {
                            const sub = schoolSubs.find(s => s.categoryId === cat.id);
                            let content = <i className="fa-solid fa-minus" style={{ color: 'var(--text-muted)' }}></i>;
                            
                            if (sub) {
                              if (sub.status === 'approved') {
                                content = <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', fontSize: '16px' }} title="Disetujui"></i>;
                              } else if (sub.status === 'pending') {
                                content = <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'var(--primary)', fontSize: '16px' }} title="Proses Verifikasi"></i>;
                              } else if (sub.status === 'revision') {
                                content = <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--revision)', fontSize: '16px' }} title="Revisi"></i>;
                              } else {
                                content = <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--danger)', fontSize: '16px' }} title="Ditolak"></i>;
                              }
                            }
                            
                            return (
                              <td key={cat.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                {sub?.driveLink ? (
                                  <a href={sub.driveLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                    {content}
                                  </a>
                                ) : content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Legend bar */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)' }}></i>
                  <span>Disetujui</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'var(--primary)' }}></i>
                  <span>Menunggu Review</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--revision)' }}></i>
                  <span>Perlu Revisi</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-minus" style={{ color: 'var(--text-muted)' }}></i>
                  <span>Belum Dikirim</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>
    </>
  );
}
