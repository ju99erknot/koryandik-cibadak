'use client';

import React, { useState, useEffect } from 'react';
import type { School, Category, GugusData } from '@/lib/schoolsData';
import { getSubmissions, getSchools, getCategories, getGugusData } from '@/lib/db';
import type { Submission } from '@/lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toggleThemeWithTransition } from '@/lib/theme';

export default function PengawasDashboard() {
  const { user, loading, logout } = useAuth('pengawas');
  usePresence(user, '/pengawas/dashboard');
  const [schools, setSchools] = useState<School[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGugus, setFilterGugus] = useState('all');

  useEffect(() => {
    if (loading || !user) return;
    getSubmissions().then(setSubmissions);
    getSchools().then(setSchools);
    getCategories().then(setCategories);
    getGugusData().then(setGuguses);
  }, [loading, user]);

  const filteredSchools = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.npsn.includes(searchTerm);
    const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
    return matchSearch && matchGugus;
  });

  const getSchoolProgress = (npsn: string) => {
    const schoolSubs = submissions.filter(s => s.schoolNpsn === npsn);
    const approved = schoolSubs.filter(s => s.status === 'approved').length;
    return categories.length > 0 ? Math.round((approved / categories.length) * 100) : 0;
  };

  const getSchoolStatusCounts = (npsn: string) => {
    const schoolSubs = submissions.filter(s => s.schoolNpsn === npsn);
    return {
      approved: schoolSubs.filter(s => s.status === 'approved').length,
      pending: schoolSubs.filter(s => s.status === 'pending').length,
      rejected: schoolSubs.filter(s => s.status === 'rejected').length,
      revision: schoolSubs.filter(s => s.status === 'revision').length,
    };
  };

  const totalApproved = submissions.filter(s => s.status === 'approved').length;
  const totalPending = submissions.filter(s => s.status === 'pending').length;
  const totalRejected = submissions.filter(s => s.status === 'rejected').length;
  const overallProgress = submissions.length > 0 ? Math.round((totalApproved / submissions.length) * 100) : 0;

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Dashboard Pengawas"
      headerSubtitle={user.name}
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                <i className="fa-solid fa-school"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{schools.length}</span>
                <span className="stat-label">Total Sekolah</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalApproved}</span>
                <span className="stat-label">Berkas Disetujui</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <i className="fa-solid fa-clock"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalPending}</span>
                <span className="stat-label">Menunggu Review</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                <i className="fa-solid fa-circle-xmark"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalRejected}</span>
                <span className="stat-label">Ditolak</span>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="card animate-fade-in">
            <div className="card-header">
              <h2><i className="fa-solid fa-chart-line"></i> Progress Keseluruhan</h2>
              <span className="badge badge-success">{overallProgress}%</span>
            </div>
            <div className="card-body">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${overallProgress}%` }}></div>
              </div>
              <p style={{ marginTop: '8px', fontSize: '13px', opacity: 0.7 }}>
                {totalApproved} dari {submissions.length} berkas telah disetujui
              </p>
            </div>
          </div>

          {/* Recharts Bar Chart - Gugus Comparison */}
          <div className="card animate-fade-in">
            <div className="card-header">
              <h2><i className="fa-solid fa-chart-bar"></i> Perbandingan Progres Berkas per Gugus</h2>
            </div>
            <div className="card-body" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={guguses.map(g => {
                    const gugusSchools = schools.filter(s => s.gugus === g.id);
                    const gugusNpsns = gugusSchools.map(s => s.npsn);
                    const gugusSubs = submissions.filter(s => gugusNpsns.includes(s.schoolNpsn));
                    const approved = gugusSubs.filter(s => s.status === 'approved').length;
                    const total = gugusSchools.length * categories.length;
                    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
                    return { name: `Gugus ${g.id}`, progres: pct, jumlahSekolah: gugusSchools.length };
                  })}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px' }}
                    formatter={(value: any) => [`${value}%`, 'Progres']}
                  />
                  <Bar dataKey="progres" radius={[6, 6, 0, 0]} barSize={50}>
                    {guguses.map((_, idx) => (
                      <Cell key={idx} fill={['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'][idx % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="card animate-fade-in">
            <div className="card-header">
              <h2><i className="fa-solid fa-school"></i> Monitoring Sekolah Binaan</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Sekolah</th>
                      <th>NPSN</th>
                      <th>Gugus</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map((school, idx) => {
                      const progress = getSchoolProgress(school.npsn);
                      const counts = getSchoolStatusCounts(school.npsn);
                      return (
                        <tr key={school.npsn}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{school.name}</strong>
                            <br />
                            <small style={{ opacity: 0.6 }}>{school.principalName}</small>
                          </td>
                          <td><code>{school.npsn}</code></td>
                          <td><span className="badge badge-pending">Gugus {school.gugus}</span></td>
                          <td>
                            <div className="progress-bar" style={{ width: '100px' }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${progress}%`,
                                  background: progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444',
                                }}
                              ></div>
                            </div>
                            <small>{progress}%</small>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span className="badge badge-success" style={{ fontSize: '10px' }}>{counts.approved}</span>
                              <span className="badge badge-warning" style={{ fontSize: '10px' }}>{counts.pending}</span>
                              <span className="badge badge-danger" style={{ fontSize: '10px' }}>{counts.rejected}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>
    </>
  );
}
