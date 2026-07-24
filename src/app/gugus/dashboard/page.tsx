'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { School, Category } from '@/lib/schoolsData';
import { getSubmissions, updateSubmission, getSchools, getCategories, getAnnouncements } from '@/lib/db';
import type { Submission, Announcement } from '@/lib/db';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CommandPalette from '@/components/CommandPalette';
import DocumentReviewer from '@/components/DocumentReviewer';
import SignaturePad from '@/components/SignaturePad';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import GugusThemeSelector from '@/components/GugusThemeSelector';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { confirmAction } from '@/components/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getCurrentMonthIndex, getMonthLabel } from '@/lib/monthArchive';

export default function GugusDashboard() {
  const { user, loading, logout } = useAuth('gugus');
  usePresence(user, '/gugus/dashboard');
  const gugusUser = user;
  const [schools, setSchools] = useState<School[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // UI states
  const [expandedSchoolNpsn, setExpandedSchoolNpsn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete' | 'empty'>('all');

  // Reject / Revision feedback states
  const [revisionSubmissionId, setRevisionSubmissionId] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Feature States
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<Submission | null>(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthIndex);

  useEffect(() => {
    if (loading || !gugusUser?.id) return;
    getSchools().then(allSchools => {
      setSchools(allSchools.filter(s => s.gugus === gugusUser.id));
    });
    getCategories().then(setCategories);
    getSubmissions().then(setAllSubmissions);
    getAnnouncements().then(setAnnouncements);
  }, [loading, gugusUser?.id]);

  // ------- HANDLERS -------
  const handleApprove = async (subId: string) => {
    if (!gugusUser) return;
    const updated = await updateSubmission(subId, {
      status: 'approved',
      reviewedBy: gugusUser.koordinator,
      reviewedAt: new Date().toISOString()
    });
    if (updated) {
      setAllSubmissions(prev => prev.map(s => s.id === subId ? updated : s));
      toast.success('Berkas berhasil disetujui!');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gugusUser || !revisionSubmissionId || !revisionNotes.trim()) return;

    const updated = await updateSubmission(revisionSubmissionId, {
      status: 'revision',
      reviewedBy: gugusUser.koordinator,
      reviewedAt: new Date().toISOString(),
      notes: revisionNotes
    });

    if (updated) {
      setAllSubmissions(prev => prev.map(s => s.id === revisionSubmissionId ? updated : s));
      setRevisionSubmissionId(null);
      setRevisionNotes('');
      toast.warning('Berkas dikembalikan untuk direvisi oleh sekolah.');
    }
  };

  const handleResetStatus = async (sub: Submission, catName: string) => {
    const confirmed = await confirmAction({
      title: 'Kembalikan Status',
      message: `Apakah Anda yakin ingin membatalkan verifikasi berkas "${catName}" dan mengembalikannya ke status Menunggu Review?`,
      confirmText: 'Ya, Batalkan',
      cancelText: 'Batal',
      variant: 'warning'
    });
    if (confirmed) {
      const updated = await updateSubmission(sub.id, {
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        notes: null
      });
      if (updated) {
        setAllSubmissions(prev => prev.map(s => s.id === sub.id ? updated : s));
        toast.info('Status berkas direset ke Menunggu Review.');
      }
    }
  };

  // ------- COMPUTED DATA -------
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter(s => {
      const date = new Date(s.submittedAt);
      return date.getMonth() === selectedMonth;
    });
  }, [allSubmissions, selectedMonth]);

  const schoolNpsns = useMemo(() => schools.map(s => s.npsn), [schools]);

  const gugusSubs = useMemo(() => {
    return filteredSubmissions.filter(s => schoolNpsns.includes(s.schoolNpsn));
  }, [filteredSubmissions, schoolNpsns]);

  const stats = useMemo(() => ({
    total: schools.length,
    totalSubs: gugusSubs.length,
    approved: gugusSubs.filter(s => s.status === 'approved').length,
    pending: gugusSubs.filter(s => s.status === 'pending').length,
    revision: gugusSubs.filter(s => s.status === 'revision').length,
    completionRate: schools.length > 0 && categories.length > 0
      ? Math.round((gugusSubs.filter(s => s.status === 'approved').length / (schools.length * categories.length)) * 100)
      : 0
  }), [schools, gugusSubs, categories]);

  const getSchoolProgress = (npsn: string) => {
    const schoolSubs = gugusSubs.filter(s => s.schoolNpsn === npsn);
    const approved = schoolSubs.filter(s => s.status === 'approved').length;
    return categories.length > 0 ? Math.round((approved / categories.length) * 100) : 0;
  };

  const getSchoolSubs = (npsn: string) => gugusSubs.filter(s => s.schoolNpsn === npsn);

  // Filter schools
  const displaySchools = useMemo(() => {
    let result = [...schools];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.npsn.includes(q) ||
        (s.operatorName || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'complete') {
      result = result.filter(s => getSchoolProgress(s.npsn) === 100);
    } else if (filterStatus === 'incomplete') {
      result = result.filter(s => {
        const prog = getSchoolProgress(s.npsn);
        return prog > 0 && prog < 100;
      });
    } else if (filterStatus === 'empty') {
      result = result.filter(s => getSchoolProgress(s.npsn) === 0);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, searchQuery, filterStatus, gugusSubs, categories]);

  // Donut chart data
  const donutData = useMemo(() => [
    { name: 'Disetujui', value: stats.approved, color: '#10b981' },
    { name: 'Menunggu', value: stats.pending, color: '#f59e0b' },
    { name: 'Revisi', value: stats.revision, color: '#8b5cf6' },
  ].filter(d => d.value > 0), [stats]);

  if (loading || !gugusUser) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={gugusUser}
      onLogout={logout}
      brandTitle={gugusUser.name}
      brandSubtitle={`Koordinator: ${gugusUser.koordinator || '-'}`}
      headerTitle={`Portal Gugus ${gugusUser.id}`}
      headerSubtitle="Monitoring & Koreksi Berkas Tingkat Gugus"
      headerActions={
        <>
          <GugusThemeSelector currentGugusId={gugusUser.id} />
          <CommandPalette currentUser={gugusUser} onThemeToggle={(e) => toggleThemeWithTransition(e)} />
        </>
      }
    >
        <div className="content-area">

          {/* ===== WELCOME CARD ===== */}
          <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--primary)', marginBottom: '24px' }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                  Selamat Datang, {gugusUser.koordinator || 'Koordinator'} 👋
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Anda bertanggung jawab atas <strong>{stats.total} sekolah binaan</strong> di Gugus {gugusUser.id}. 
                  Saat ini ada <strong style={{ color: 'var(--warning)' }}>{stats.pending} berkas</strong> menunggu pemeriksaan Anda.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsSigningModalOpen(true)}
                  style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-signature" aria-hidden="true"></i> Tanda Tangan
                </button>
              </div>
            </div>
          </div>

          {/* ===== TIME-TRAVEL ARCHIVE ===== */}
          <div className="card animate-fade-in" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent)' }}></i> Time-Travel Archives (Histori Bulanan)
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Geser garis waktu untuk melihat rekam jejak bulan lalu</span>
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

          {/* ===== STATS GRID ===== */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <i className="fa-solid fa-school"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Sekolah Binaan</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.approved}</span>
                <span className="stat-label">Disetujui</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
                <i className="fa-solid fa-clock"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.pending}</span>
                <span className="stat-label">Menunggu Review</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--revision-glow)', color: 'var(--revision)' }}>
                <i className="fa-solid fa-arrows-rotate"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.revision}</span>
                <span className="stat-label">Revisi</span>
              </div>
            </div>
          </div>

          {/* ===== ANALYTICS + DONUT ROW ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>

            {/* Donut Chart */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <h2><i className="fa-solid fa-chart-pie"></i> Distribusi Status Berkas</h2>
              </div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', minHeight: '200px' }}>
                {donutData.length > 0 ? (
                  <>
                    <div style={{ width: '180px', height: '180px', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {donutData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: 'var(--card-glass)',
                              border: '1px solid var(--card-border)',
                              borderRadius: '10px',
                              fontSize: '12px',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        textAlign: 'center', pointerEvents: 'none'
                      }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.completionRate}%</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Selesai</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {donutData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color, display: 'inline-block' }}></span>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{d.name}: <strong>{d.value}</strong></span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total: <strong>{stats.totalSubs}</strong> berkas</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <i className="fa-solid fa-chart-pie" style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Belum ada data berkas di bulan ini.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Announcements Widget */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <h2><i className="fa-solid fa-bullhorn"></i> Pengumuman</h2>
              </div>
              <div className="card-body">
                {announcements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {announcements.slice(0, 4).map((ann, idx) => (
                      <div key={ann.id || idx} style={{
                        borderLeft: `3px solid ${ann.priority === 'high' ? 'var(--danger)' : 'var(--primary)'}`,
                        paddingLeft: '12px'
                      }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{ann.title}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                          {ann.content.length > 120 ? ann.content.substring(0, 120) + '…' : ann.content}
                        </p>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                          {new Date(ann.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <i className="fa-solid fa-bell-slash" style={{ fontSize: '28px', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Belum ada pengumuman terbaru.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== ANALYTICS CHARTS (shared component) ===== */}
          <AnalyticsCharts
            submissions={gugusSubs}
            categories={categories}
            schools={schools}
            variant="compact"
          />

          {/* ===== SCHOOL PROGRESS TABLE ===== */}
          <div className="card animate-fade-in">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <h2><i className="fa-solid fa-table-list"></i> Progres Pengumpulan Berkas Sekolah</h2>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '200px' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }}></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari sekolah / operator…"
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="form-control"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  style={{ height: '36px', fontSize: '12px', minWidth: '140px' }}
                >
                  <option value="all">Semua Status</option>
                  <option value="complete">✅ Lengkap (100%)</option>
                  <option value="incomplete">🔄 Belum Lengkap</option>
                  <option value="empty">⚠️ Belum Ada Berkas</option>
                </select>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Sekolah</th>
                      <th>NPSN</th>
                      <th>Progres</th>
                      <th style={{ textAlign: 'center' }}>Status Ringkas</th>
                      <th style={{ textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySchools.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
                          Tidak ada sekolah yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : displaySchools.map(school => {
                      const prog = getSchoolProgress(school.npsn);
                      const schoolSubs = getSchoolSubs(school.npsn);
                      const isExpanded = expandedSchoolNpsn === school.npsn;
                      const pendingCount = schoolSubs.filter(s => s.status === 'pending').length;
                      const approvedCount = schoolSubs.filter(s => s.status === 'approved').length;
                      const revisionCount = schoolSubs.filter(s => s.status === 'revision').length;

                      return (
                        <React.Fragment key={school.npsn}>
                          <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedSchoolNpsn(isExpanded ? null : school.npsn)}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '10px',
                                  background: prog === 100 ? 'var(--success-glow)' : 'var(--primary-glow)',
                                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                                  color: prog === 100 ? 'var(--success)' : 'var(--primary)',
                                  fontSize: '14px', flexShrink: 0
                                }}>
                                  <i className={`fa-solid ${prog === 100 ? 'fa-circle-check' : 'fa-school'}`}></i>
                                </div>
                                <div>
                                  <strong style={{ fontSize: '13px' }}>{school.name}</strong>
                                  <br />
                                  <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                    <i className="fa-solid fa-user" style={{ marginRight: '4px' }}></i>
                                    {school.operatorName || '-'}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td><code style={{ fontSize: '12px' }}>{school.npsn}</code></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="progress-bar" style={{ width: '100px' }}>
                                  <div className="progress-fill" style={{
                                    width: `${prog}%`,
                                    background: prog === 100 ? 'var(--success)' : prog > 50 ? 'var(--primary)' : 'var(--warning)'
                                  }}></div>
                                </div>
                                <span style={{
                                  fontSize: '12px', fontWeight: 'bold',
                                  color: prog === 100 ? 'var(--success)' : 'var(--text-primary)'
                                }}>{prog}%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {approvedCount > 0 && <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>{approvedCount} ✓</span>}
                                {pendingCount > 0 && <span className="badge badge-pending" style={{ fontSize: '10px', padding: '2px 6px' }}>{pendingCount} ⏳</span>}
                                {revisionCount > 0 && <span className="badge badge-revision" style={{ fontSize: '10px', padding: '2px 6px' }}>{revisionCount} ↻</span>}
                                {schoolSubs.length === 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className={`btn ${isExpanded ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                onClick={(e) => { e.stopPropagation(); setExpandedSchoolNpsn(isExpanded ? null : school.npsn); }}
                                style={{ fontSize: '11px' }}
                              >
                                {isExpanded ? 'Tutup' : 'Detail'} <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                              </button>
                            </td>
                          </tr>

                          {/* ===== EXPANDED DETAIL ===== */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} style={{ padding: '20px 24px', background: 'var(--bg-space-dark)', borderBottom: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                                    <i className="fa-solid fa-clipboard-list" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                                    Detail Dokumen — {school.name}
                                  </h4>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <span className="badge badge-success" style={{ fontSize: '10px' }}>{approvedCount}/{categories.length} Disetujui</span>
                                    {pendingCount > 0 && <span className="badge badge-pending" style={{ fontSize: '10px' }}>{pendingCount} Menunggu</span>}
                                  </div>
                                </div>
                                <div className="table-responsive" style={{ borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
                                  <table className="data-table">
                                    <thead>
                                      <tr style={{ background: 'var(--primary-glow)' }}>
                                        <th>Kategori Berkas</th>
                                        <th>Status</th>
                                        <th>Tgl Unggah</th>
                                        <th>Dokumen</th>
                                        <th>Aksi Koordinator</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {categories.map(cat => {
                                        const sub = schoolSubs.find(s => s.categoryId === cat.id);
                                        return (
                                          <tr key={cat.id}>
                                            <td>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className={cat.icon} style={{ color: 'var(--primary)', fontSize: '13px' }}></i>
                                                <span style={{ fontWeight: 500, fontSize: '13px' }}>{cat.name}</span>
                                              </div>
                                            </td>
                                            <td>
                                              {sub ? (
                                                <span className={`badge badge-${sub.status === 'approved' ? 'success' : sub.status === 'pending' ? 'pending' : 'revision'}`}>
                                                  {sub.status === 'approved' ? '✓ Disetujui' : sub.status === 'pending' ? '⏳ Menunggu' : '↻ Revisi'}
                                                </span>
                                              ) : (
                                                <span className="badge" style={{ background: 'var(--card-border)', color: 'var(--text-muted)' }}>Belum Ada</span>
                                              )}
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                              {sub ? new Date(sub.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'}
                                            </td>
                                            <td>
                                              {sub?.driveLink ? (
                                                <a href={sub.driveLink} target="_blank" rel="noopener noreferrer"
                                                  style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                  <i className="fa-solid fa-external-link-alt" style={{ fontSize: '10px' }}></i> Lihat
                                                </a>
                                              ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                                            </td>
                                            <td>
                                              {sub ? (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                  <button type="button" className="btn btn-outline btn-xs" onClick={() => setActiveReviewSubmission(sub)} title="Periksa Berkas">
                                                    <i className="fa-solid fa-eye"></i>
                                                  </button>
                                                  {sub.status !== 'approved' && (
                                                    <button type="button" className="btn btn-xs" onClick={() => handleApprove(sub.id)} title="Setujui"
                                                      style={{ background: 'var(--success)', borderColor: 'var(--success)', color: '#fff' }}>
                                                      <i className="fa-solid fa-check"></i>
                                                    </button>
                                                  )}
                                                  {sub.status !== 'revision' && (
                                                    <button type="button" className="btn btn-danger btn-xs" onClick={() => { setRevisionSubmissionId(sub.id); setRevisionNotes(''); }} title="Minta Revisi">
                                                      <i className="fa-solid fa-rotate-left"></i>
                                                    </button>
                                                  )}
                                                  {sub.status !== 'pending' && (
                                                    <button type="button" className="btn btn-outline btn-xs" onClick={() => handleResetStatus(sub, cat.name)} title="Reset Status">
                                                      <i className="fa-solid fa-arrow-rotate-left"></i>
                                                    </button>
                                                  )}
                                                </div>
                                              ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {/* Reviewed by info */}
                                {schoolSubs.filter(s => s.reviewedBy).length > 0 && (
                                  <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-user-check"></i>
                                    Terakhir diverifikasi oleh: <strong style={{ color: 'var(--text-secondary)' }}>{schoolSubs.find(s => s.reviewedBy)?.reviewedBy || '—'}</strong>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>

      {/* ===== REVISION MODAL ===== */}
      {revisionSubmissionId && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: `blur(var(--modal-blur))`, zIndex: 'var(--z-modal)' as unknown as number, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card modal-card" style={{ width: '440px', maxWidth: '90%', borderRadius: 'var(--modal-radius)' }}>
            <div className="card-header">
              <h3><i className="fa-solid fa-rotate-left" style={{ color: 'var(--warning)', marginRight: '8px' }}></i>Catatan Pengembalian Revisi</h3>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => setRevisionSubmissionId(null)}
                aria-label="Tutup modal"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleRejectSubmit}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Detail Kekurangan / Petunjuk Revisi</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Contoh: Lampiran halaman 3 belum ditandatangani kepala sekolah."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    required
                    style={{ fontSize: '13px' }}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setRevisionSubmissionId(null)}>Batal</button>
                  <button type="submit" className="btn btn-danger" style={{ flex: 1 }} disabled={!revisionNotes.trim()}>
                    <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i>Kirim Catatan
                  </button>
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
            updateSubmission(id, {
              status: 'revision',
              reviewedBy: gugusUser.koordinator,
              reviewedAt: new Date().toISOString(),
              notes: notes
            }).then((updated) => {
              if (updated) {
                setAllSubmissions(prev => prev.map(s => s.id === id ? updated : s));
                toast.warning('Berkas dikembalikan untuk direvisi oleh sekolah.');
              }
            });
            setActiveReviewSubmission(null);
          }}
          onClose={() => setActiveReviewSubmission(null)}
        />
      )}

    </>
  );
}
