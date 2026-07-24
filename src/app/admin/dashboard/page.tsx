'use client';

import React, { useState, useEffect } from 'react';
import { getSubmissions, updateSubmission, getLogs, getAnnouncements, getSchools, getCategories, getGugusData, getOnlineUsers } from '@/lib/db';
import type { Submission, LogEntry, Announcement, OnlinePresence } from '@/lib/db';
import type { School, Category, GugusData } from '@/lib/schoolsData';
import { usePresence } from '@/hooks/usePresence';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CommandPalette from '@/components/CommandPalette';
import FancySelect from '@/components/FancySelect';
import DocumentReviewer from '@/components/DocumentReviewer';
import SignaturePad from '@/components/SignaturePad';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentMonthIndex, getMonthLabel } from '@/lib/monthArchive';
import { toggleThemeWithTransition } from '@/lib/theme';
import OnboardingTour from '@/components/OnboardingTour';

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth('admin');
  usePresence(user, '/admin/dashboard');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlinePresence[]>([]);

  // Modal / Feedback state
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Gem States
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<Submission | null>(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthIndex);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGugus, setFilterGugus] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (loading || !user) return;
    getSubmissions().then(setSubmissions);
    getLogs().then(logs => setLogs(logs.slice(0, 5)));
    getAnnouncements().then(setAnnouncements);
    getSchools().then(setSchools);
    getCategories().then(setCategories);
    getGugusData().then(setGuguses);

    // Initial presence load
    getOnlineUsers().then(setOnlineUsers);

    // Poll online users list every 15s
    const presenceTimer = setInterval(() => {
      getOnlineUsers().then(setOnlineUsers);
    }, 15000);

    return () => clearInterval(presenceTimer);
  }, [loading, user]);

  const handleApprove = async (id: string) => {
    const updated = await updateSubmission(id, {
      status: 'approved',
      reviewedBy: 'Admin Utama',
      reviewedAt: new Date().toISOString()
    });
    if (updated) {
      setSubmissions(submissions.map(s => s.id === id ? updated : s));
      toast.success('Berkas disetujui secara permanen!');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmissionId || !revisionNotes.trim()) return;

    const updated = await updateSubmission(activeSubmissionId, {
      status: 'revision',
      reviewedBy: 'Admin Utama',
      reviewedAt: new Date().toISOString(),
      notes: revisionNotes
    });

    if (updated) {
      setSubmissions(submissions.map(s => s.id === activeSubmissionId ? updated : s));
      setActiveSubmissionId(null);
      setRevisionNotes('');
      toast.warning('Berkas dikembalikan untuk direvisi sekolah.');
    }
  };

  const getSchoolName = (npsn: string) => {
    return schools.find(s => s.npsn === npsn)?.name || 'Sekolah Terhapus';
  };

  const getCategoryName = (catId: string) => {
    return categories.find(c => c.id === catId)?.name || 'Kategori Terhapus';
  };

  // Filter submissions by selected month and active filter query
  const filteredSubmissions = submissions.filter(s => {
    const date = new Date(s.submittedAt);
    const monthMatch = date.getMonth() === selectedMonth;
    if (!monthMatch) return false;

    // Search Match
    const school = schools.find(sch => sch.npsn === s.schoolNpsn);
    const searchMatch = !searchQuery || 
      school?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      school?.npsn.includes(searchQuery);

    // Gugus Match
    const gugusMatch = filterGugus === 'all' || school?.gugus === filterGugus;

    // Status Match
    const statusMatch = filterStatus === 'all' || s.status === filterStatus;

    // Category Match
    const categoryMatch = filterCategory === 'all' || s.categoryId === filterCategory;

    return searchMatch && gugusMatch && statusMatch && categoryMatch;
  });

  const approvedCount = filteredSubmissions.filter(s => s.status === 'approved').length;
  const pendingCount = filteredSubmissions.filter(s => s.status === 'pending').length;
  const revisionCount = filteredSubmissions.filter(s => s.status === 'revision').length;

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Dashboard Admin"
      headerSubtitle="Kelola verifikasi berkas seluruh sekolah"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsSigningModalOpen(true)}
              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-signature" aria-hidden="true"></i> Tanda Tangan & Stempel
            </button>
          </div>
          {/* Time-Travel Archive Timeline Slider */}
          <div className="card animate-fade-in" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent)' }}></i> Time-Travel Archives (Histori Bulanan)
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Geser garis waktu untuk melihat rekapitulasi bulan lalu</span>
              </div>
              <span className="badge badge-pending" style={{ fontSize: '12px', padding: '6px 12px' }}>
                Arsip: <strong>{getMonthLabel(selectedMonth)} {new Date().getFullYear()}</strong>
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jan {String(new Date().getFullYear()).substring(2)}</span>
              <input
                type="range"
                min="0"
                max="11"
                value={selectedMonth}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  setSelectedMonth(m);
                  toast.success(`Beralih ke arsip bulan ${getMonthLabel(m)}`);
                }}
                style={{
                  flex: 1,
                  height: '6px',
                  background: 'var(--card-border)',
                  borderRadius: '99px',
                  cursor: 'pointer',
                  accentColor: 'var(--accent)'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{getMonthLabel(getCurrentMonthIndex()).substring(0, 3)} {String(new Date().getFullYear()).substring(2)}</span>
            </div>
          </div>
          {/* Stats Grid */}
          <div className="stats-grid bento-grid-asymmetric">
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <i className="fa-solid fa-school"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{schools.length}</span>
                <span className="stat-label">Total Sekolah Binaan</span>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                <i className="fa-solid fa-check-double"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{approvedCount}</span>
                <span className="stat-label">Berkas Disetujui</span>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
                <i className="fa-solid fa-clock"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{pendingCount}</span>
                <span className="stat-label">Menunggu Review</span>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--revision-glow)', color: 'var(--revision)' }}>
                <i className="fa-solid fa-arrows-spin"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{revisionCount}</span>
                <span className="stat-label">Jumlah Revisi</span>
              </div>
            </div>
          </div>

          {/* 📊 Analytics Charts - MonthlyTrend, StatusDonut, CategoryCompletion */}
          <AnalyticsCharts submissions={submissions} categories={categories} schools={schools} variant="full" />

          {/* Recharts Bar Chart - Gugus Progress Overview */}
          <div className="card animate-fade-in">
            <div className="card-header">
              <h2><i className="fa-solid fa-chart-bar"></i> Progres Berkas per Gugus</h2>
            </div>
            <div className="card-body" style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={guguses.map(g => {
                    const gugusSchools = schools.filter(s => s.gugus === g.id);
                    const gugusNpsns = gugusSchools.map(s => s.npsn);
                    const gugusSubs = filteredSubmissions.filter(s => gugusNpsns.includes(s.schoolNpsn));
                    const approved = gugusSubs.filter(s => s.status === 'approved').length;
                    const pending = gugusSubs.filter(s => s.status === 'pending').length;
                    const revision = gugusSubs.filter(s => s.status === 'revision').length;
                    return { name: `Gugus ${g.id}`, Disetujui: approved, Menunggu: pending, Revisi: revision };
                  })}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px' }} />
                  <Bar dataKey="Disetujui" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="Menunggu" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="Revisi" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Recent Submissions */}
            <div className="card animate-fade-in" style={{ gridColumn: 'span 2' }}>
              <div className="card-header">
                <h2><i className="fa-solid fa-file-circle-check"></i> Pengiriman Berkas Terbaru</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {/* Filter Panel */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--card-border)',
                  background: 'rgba(255, 255, 255, 0.01)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px'
                }}>
                  {/* Search input */}
                  <div style={{ position: 'relative', gridColumn: 'span 2', minWidth: '180px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }}></i>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Cari sekolah..." 
                      style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <FancySelect
                    size="sm"
                    fullWidth
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
                  <FancySelect
                    size="sm"
                    fullWidth
                    value={filterCategory}
                    onChange={setFilterCategory}
                    icon="fa-solid fa-folder"
                    searchable
                    options={[
                      { value: 'all', label: 'Semua Kategori' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <FancySelect
                    size="sm"
                    fullWidth
                    value={filterStatus}
                    onChange={setFilterStatus}
                    icon="fa-solid fa-filter"
                    options={[
                      { value: 'all', label: 'Semua Status' },
                      { value: 'pending', label: 'Menunggu' },
                      { value: 'approved', label: 'Disetujui' },
                      { value: 'revision', label: 'Revisi' },
                    ]}
                  />
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sekolah</th>
                        <th>Kategori</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.slice(0, 8).map((sub, idx) => (
                        <tr key={sub.id || idx}>
                          <td><strong>{getSchoolName(sub.schoolNpsn)}</strong></td>
                          <td><span style={{ fontSize: '13px' }}>{getCategoryName(sub.categoryId)}</span></td>
                          <td>
                            <span className={`badge badge-${sub.status === 'approved' ? 'success' : sub.status === 'pending' ? 'pending' : sub.status === 'revision' ? 'revision' : 'danger'}`}>
                              {sub.status === 'approved' ? 'Disetujui' : sub.status === 'pending' ? 'Menunggu' : sub.status === 'revision' ? 'Revisi' : 'Ditolak'}
                            </span>
                          </td>
                          <td>
                             <div style={{ display: 'flex', gap: '4px' }}>
                               <a href={sub.driveLink ?? '#'} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs" aria-disabled={!sub.driveLink} title="Lihat Berkas">
                                 <i className="fa-solid fa-arrow-up-right-from-square"></i>
                               </a>
                               {sub.status === 'pending' && (
                                 <>
                                   <button className="btn btn-accent btn-xs" onClick={() => setActiveReviewSubmission(sub)} title="Pemeriksaan Berkas (AI Split-Screen)">
                                     <i className="fa-solid fa-magnifying-glass"></i>
                                   </button>
                                   <button className="btn btn-primary btn-xs" onClick={() => handleApprove(sub.id)} title="Setujui Berkas">
                                     <i className="fa-solid fa-check"></i>
                                   </button>
                                 </>
                               )}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar widgets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Announcements widget */}
              <div className="card animate-fade-in">
                <div className="card-header">
                  <h2><i className="fa-solid fa-bullhorn"></i> Pengumuman</h2>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {announcements.slice(0, 3).map((ann, idx) => (
                      <div key={ann.id || idx} style={{ borderLeft: `3px solid ${ann.priority === 'high' ? 'var(--danger)' : 'var(--primary)'}`, paddingLeft: '12px' }}>
                        <h4 style={{ fontSize: '13px' }}>{ann.title}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                          {ann.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 🟢 Online Presence Monitor Widget */}
              <div className="card animate-fade-in">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2><i className="fa-solid fa-signal" style={{ color: 'var(--success)' }}></i> Status Online</h2>
                  <span className="badge badge-success" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success-glow)', color: 'var(--success)' }}>
                    <span className="live-dot" style={{ margin: 0 }}></span> {(() => {
                      const activeCount = onlineUsers.filter(ou => ou.page !== 'Offline' && (new Date().getTime() - new Date(ou.lastSeen).getTime() < 120000)).length;
                      return activeCount;
                    })()} Online
                  </span>
                </div>
                <div className="card-body">
                  {(() => {
                    const activeUsers = onlineUsers.filter(ou => ou.page !== 'Offline' && (new Date().getTime() - new Date(ou.lastSeen).getTime() < 120000));
                    
                    if (activeUsers.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          Tidak ada sekolah atau pengawas yang aktif saat ini
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeUsers.map((ou) => {
                          const isSchool = ou.role === 'school';
                          const roleLabel = isSchool ? 'Operator' : ou.role.toUpperCase();
                          let badgeColor = 'var(--text-muted)';
                          if (ou.role === 'admin') badgeColor = 'var(--danger)';
                          else if (ou.role === 'pengawas' || ou.role === 'kkks' || ou.role === 'pgri') badgeColor = 'var(--accent)';
                          else if (ou.role === 'gugus') badgeColor = 'var(--primary)';

                          return (
                            <div key={ou.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <span className="live-dot" title="Aktif"></span>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{ou.userName}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: badgeColor, fontWeight: 'bold' }}>{roleLabel}</span>
                                    {ou.npsn && <span>• NPSN: {ou.npsn}</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="badge badge-pending" style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--card-border)', color: 'var(--text-secondary)' }} title="Halaman saat ini">
                                {ou.page === '/school/dashboard' ? 'Dashboard' : ou.page === '/school/profile' ? 'Profil' : ou.page === '/school/receipt' ? 'Tanda Terima' : ou.page || 'Dashboard'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Activity Logs widget */}
              <div className="card animate-fade-in">
                <div className="card-header">
                  <h2><i className="fa-solid fa-clock-rotate-left"></i> Aktivitas Terkini</h2>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {logs.map((log, idx) => (
                      <div key={log.id || idx} style={{ fontSize: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>{log.user}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{log.action}: {log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>

      {/* Revision Modal */}
      {activeSubmissionId && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card modal-card" style={{ width: '400px', maxWidth: '90%' }}>
            <div className="card-header">
              <h3>Catatan Pengembalian Revisi</h3>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
                onClick={() => setActiveSubmissionId(null)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleRejectSubmit}>
                <div className="form-group">
                  <label>Detail Kekurangan Berkas</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Masukkan alasan pengembalian..."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setActiveSubmissionId(null)}>Batal</button>
                  <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Kirim</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Signature drawing pad */}
      {isSigningModalOpen && (
        <SignaturePad onClose={() => setIsSigningModalOpen(false)} />
      )}

      {/* AI Split-Screen Reviewer */}
      {activeReviewSubmission && (
        <DocumentReviewer
          submission={activeReviewSubmission}
          onApprove={(id) => {
            handleApprove(id);
            setActiveReviewSubmission(null);
          }}
          onRejectSubmit={(id, notes) => {
            setActiveSubmissionId(id);
            setRevisionNotes(notes);
            // Submit mock reject immediately using notes
            updateSubmission(id, {
              status: 'revision',
              reviewedBy: 'Admin Utama',
              reviewedAt: new Date().toISOString(),
              notes: notes
            }).then((updated) => {
              if (updated) {
                setSubmissions(submissions.map(s => s.id === id ? updated : s));
                setActiveSubmissionId(null);
                setRevisionNotes('');
                toast.warning('Berkas dikembalikan untuk direvisi sekolah.');
              }
            });
            setActiveReviewSubmission(null);
          }}
          onClose={() => setActiveReviewSubmission(null)}
        />
      )}

      <OnboardingTour />
    </>
  );
}
