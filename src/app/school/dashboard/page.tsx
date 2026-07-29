'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { School, Category } from '@/lib/schoolsData';
import { getSubmissionsBySchool, addSubmission, updateSubmission, getCategories, getAnnouncements, checkAndCreateDeadlineReminders, getAppSetting, getCalendarEvents, getSupervisionNotesBySchool } from '@/lib/db';
import type { Submission, Announcement } from '@/lib/db';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import type { SessionUser, CalendarEvent, SupervisionNote } from '@/lib/types';
import { playCelebrationSound, playSuccessSound } from '@/lib/sound';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';

import AnalyticsCharts from '@/components/AnalyticsCharts';
import BulkUploadModal from '@/components/BulkUploadModal';
import FancySelect from '@/components/FancySelect';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

export default function SchoolDashboard() {
  const { user, loading, logout } = useAuth('school');
  usePresence(user, '/school/dashboard');
  const school = (user?.details as School | undefined) ?? null;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [supervisionNotes, setSupervisionNotes] = useState<SupervisionNote[]>([]);


  // Form states
  const [selectedCatId, setSelectedCatId] = useState('');
  const [fileNameInput, setFileNameInput] = useState('');
  const [driveLinkInput, setDriveLinkInput] = useState('');

  // Drag & drop file states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const simulateUpload = (file: File) => {
    setUploadedFile(file);
    setFileNameInput(file.name);
    setUploadProgress(0);

    // Dispatch Dynamic Island upload start event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('koryandik-upload-start', { detail: { fileName: file.name } }));
    }
    
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setUploadProgress(current);

      // Dispatch progress to Dynamic Island
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('koryandik-upload-progress', { detail: { progress: current } }));
      }

      if (current >= 100) {
        clearInterval(interval);
        setDriveLinkInput(`https://drive.google.com/uploaded-files/${school?.npsn || 'koryandik'}_${file.name.replace(/\s/g, '_')}`);
        toast.success(`File ${file.name} sukses diunggah ke portal!`);

        // Dispatch completion to Dynamic Island
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('koryandik-upload-complete', { detail: { success: true, message: `${file.name} berhasil diunggah!` } }));
        }
      }
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Hanya berkas PDF yang diperbolehkan!');
        return;
      }
      simulateUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Hanya berkas PDF yang diperbolehkan!');
        return;
      }
      simulateUpload(file);
    }
  };

  // Revision modal states
  const [selectedSubmissionForModal, setSelectedSubmissionForModal] = useState<Submission | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  // Derived from calendarEvents — computed during render instead of mirrored
  // into state via an effect (react-hooks/set-state-in-effect).
  const deadlineInfo = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const upcoming = calendarEvents
      .filter(e => {
        const start = new Date(e.startDate).getTime();
        return start >= today && (e.targetAudience === 'all' || e.targetAudience === 'school');
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (upcoming.length > 0) {
      const d = new Date(upcoming[0].startDate);
      return {
        targetTime: new Date(`${upcoming[0].startDate}T23:59:59`).getTime(),
        title: upcoming[0].title,
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      };
    }

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      targetTime: endOfMonth.getTime(),
      title: 'Akhir Bulan Berjalan',
      dateLabel: endOfMonth.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }, [calendarEvents]);

  const nearestDeadline = { title: deadlineInfo.title, dateLabel: deadlineInfo.dateLabel };
  const [targetYear] = useState(new Date().getFullYear());
  const [announcementBannerEnabled, setAnnouncementBannerEnabled] = useState(true);

  useEffect(() => {
    const targetTime = deadlineInfo.targetTime;

    const updateTimer = () => {
      const currentTime = new Date().getTime();
      const diff = targetTime - currentTime;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    const frame = requestAnimationFrame(updateTimer);
    const interval = setInterval(updateTimer, 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [deadlineInfo]);

  useEffect(() => {
    if (!user?.npsn) return;

    getSubmissionsBySchool(user.npsn).then(setSubmissions);
    getCategories().then(setActiveCategories);
    getAnnouncements().then(setAnnouncements);
    getCalendarEvents().then(setCalendarEvents);
    getSupervisionNotesBySchool(user.npsn).then(setSupervisionNotes);
    getAppSetting<{ enabled: boolean }>('announcement_banner_enabled', { enabled: true })
      .then((config) => setAnnouncementBannerEnabled(config?.enabled ?? true))
      .catch(() => setAnnouncementBannerEnabled(true));
  }, [user?.npsn]);

  useEffect(() => {
    if (!school || !activeCategories.length || !submissions.length) return;
    checkAndCreateDeadlineReminders(school.npsn, activeCategories, submissions)
      .catch(err => console.error("Error creating deadline reminders:", err));
  }, [school, activeCategories, submissions]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !selectedCatId || !driveLinkInput) return;

    const matchedCategory = activeCategories.find(c => c.id === selectedCatId);
    if (!matchedCategory) return;

    if (!driveLinkInput.startsWith('http://') && !driveLinkInput.startsWith('https://')) {
      toast.error('Tautan Google Drive harus dimulai dengan http:// atau https://');
      return;
    }

    const existing = submissions.find(s => s.categoryId === selectedCatId);
    const generatedFileName = fileNameInput.trim() || `${matchedCategory.name.replace(/\s/g, '_')}_${school.npsn}.pdf`;
    let newSubmissionsList: Submission[];

    if (existing) {
      const updated = await updateSubmission(existing.id, {
        status: 'pending',
        driveLink: driveLinkInput,
        fileName: generatedFileName,
        submittedAt: new Date().toISOString(),
        notes: null,
        reviewedAt: null,
        reviewedBy: null,
      });
      if (!updated) {
        toast.error('Gagal memperbarui berkas. Silakan coba lagi.');
        return;
      }
      newSubmissionsList = submissions.map(s => s.id === existing.id ? updated : s);
    } else {
      const newSub = await addSubmission({
        schoolNpsn: school.npsn,
        categoryId: selectedCatId,
        status: 'pending',
        fileName: generatedFileName,
        driveLink: driveLinkInput,
      });
      newSubmissionsList = [...submissions, newSub];
    }

    setSubmissions(newSubmissionsList);

    // Trigger confetti if all categories are now submitted
    const uniqueSubmittedCategories = new Set(newSubmissionsList.map(s => s.categoryId));
    if (uniqueSubmittedCategories.size === activeCategories.length) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
      playCelebrationSound();
      toast.success('Luar biasa! Seluruh kategori berkas telah Anda lengkapi.', { duration: 5000 });
    } else {
      playSuccessSound();
      toast.success('Berkas berhasil dikirim untuk verifikasi!');
    }

    setSelectedCatId('');
    setFileNameInput('');
    setDriveLinkInput('');
    setUploadedFile(null);
    setUploadProgress(null);
  };

  // Stats calculation
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;
  const revisionCount = submissions.filter(s => s.status === 'revision').length;

  const totalCategories = activeCategories.length;
  const progressPercent = totalCategories > 0 ? Math.round((approvedCount / totalCategories) * 100) : 0;

  if (!user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user as SessionUser}
      onLogout={logout}
      brandTitle={school?.name || 'SD Binaan'}
      brandSubtitle={school ? `NPSN: ${school.npsn}` : undefined}
      headerTitle="Dashboard Sekolah"
      headerSubtitle="Kelola dan unggah berkas persyaratan administrasi"
      headerActions={<CommandPalette currentUser={{ role: 'school', details: school, npsn: school?.npsn || user.npsn }} onThemeToggle={() => toggleThemeWithTransition()} />}
    >
        <div className="content-area">


          {/* 🚨 Urgent Admin Broadcast Banner */}
          {announcementBannerEnabled && announcements.filter(a => a.priority === 'high').map(urgentAnn => (
            <div key={urgentAnn.id} className="animate-fade-in" style={{
              background: 'var(--danger-glow)',
              border: '1px solid var(--danger)',
              borderRadius: '16px',
              padding: '0',
              marginBottom: '20px',
              overflow: 'hidden',
              position: 'relative',
              animation: 'broadcast-pulse 3s ease-in-out infinite'
            }}>
              {/* Top red ribbon */}
              <div style={{
                background: 'var(--danger)',
                padding: '6px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-tower-broadcast" style={{ color: '#ffffff', fontSize: '12px', animation: 'pulse 1s infinite' }} aria-hidden="true"></i>
                  <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    🚨 Siaran Darurat dari Admin Koryandik
                  </span>
                </div>
                <button
                  onClick={() => setAnnouncements(prev => prev.filter(a => a.id !== urgentAnn.id))}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: '#ffffff',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                  title="Tutup pengumuman ini"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>
              {/* Content body */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--danger-glow)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                  animation: 'pulse 1.5s infinite'
                }}>
                  <i className="fa-solid fa-bullhorn" aria-hidden="true"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--danger)' }}>
                    {urgentAnn.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    {urgentAnn.content}
                  </p>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-clock" aria-hidden="true"></i>
                    <span>Diterbitkan {new Date(urgentAnn.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ margin: '0 4px' }}>•</span>
                    <span>Oleh: {urgentAnn.createdBy}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 🚨 REVISION & REJECTION ALERT BANNER */}
          {submissions.some(s => s.status === 'revision' || s.status === 'rejected') && (
            <div className="animate-fade-in" style={{
              background: 'var(--warning-glow)',
              border: '1px solid var(--warning)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', fontSize: '20px', animation: 'pulse 1.5s infinite' }} aria-hidden="true"></i>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Pemberitahuan Revisi &amp; Catatan Pengawas
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      Terdapat {submissions.filter(s => s.status === 'revision' || s.status === 'rejected').length} berkas yang memerlukan perhatian atau unggah ulang.
                    </p>
                  </div>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>Perlu Tindakan</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' }}>
                {submissions.filter(s => s.status === 'revision' || s.status === 'rejected').map(sub => {
                  const cat = activeCategories.find(c => c.id === sub.categoryId);
                  return (
                    <div key={sub.id} style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{cat?.name || 'Berkas'}</span>
                        <span className={`badge badge-${sub.status === 'revision' ? 'warning' : 'danger'}`} style={{ fontSize: '10px' }}>
                          {sub.status === 'revision' ? 'Revisi' : 'Ditolak'}
                        </span>
                      </div>
                      {sub.notes && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: '6px', borderLeft: '3px solid var(--warning)' }}>
                          <i className="fa-solid fa-comment-dots" style={{ marginRight: '6px', color: 'var(--warning)' }} aria-hidden="true"></i>
                          {sub.notes}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        style={{ alignSelf: 'flex-end', fontSize: '10.5px' }}
                        onClick={() => {
                          setSelectedCatId(sub.categoryId);
                          setFileNameInput(sub.fileName || `${cat?.name.replace(/\s/g, '_') || 'berkas'}_${school?.npsn || user.npsn}.pdf`);
                          setDriveLinkInput(sub.driveLink || '');
                        }}
                      >
                        <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Perbaiki &amp; Upload Ulang
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deadline Countdown Banner */}
          <div className="card animate-fade-in" style={{
            background: 'var(--warning-glow)',
            border: '1px solid var(--warning)',
            padding: '16px 24px',
            marginBottom: '24px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--warning-glow)',
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                animation: 'pulse 1.5s infinite'
              }}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Pengingat Batas Akhir Unggah Berkas</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {nearestDeadline
                    ? `${nearestDeadline.title} — ${nearestDeadline.dateLabel}`
                    : 'Belum ada tenggat aktif.'}
                </p>
              </div>
            </div>
            {/* Timer boxes */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[
                { label: 'Hari', val: timeLeft.days },
                { label: 'Jam', val: timeLeft.hours },
                { label: 'Menit', val: timeLeft.minutes },
                { label: 'Detik', val: timeLeft.seconds }
              ].map((t, idx) => (
                <React.Fragment key={t.label}>
                  <div style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid var(--warning)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '54px'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--warning)', fontFamily: 'monospace' }}>
                      {String(t.val).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                      {t.label}
                    </div>
                  </div>
                  {idx < 3 && <span style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '16px' }}>:</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid bento-grid-asymmetric">
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{approvedCount.toLocaleString('id-ID')}</span>
                <span className="stat-label">Disetujui</span>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <i className="fa-solid fa-clock" aria-hidden="true"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{pendingCount.toLocaleString('id-ID')}</span>
                <span className="stat-label">Menunggu Review</span>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--revision-glow)', color: 'var(--revision)' }}>
                <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{revisionCount.toLocaleString('id-ID')}</span>
                <span className="stat-label">Butuh Revisi</span>
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon" style={{ background: 'var(--danger-glow)', color: 'var(--danger)' }}>
                <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{rejectedCount.toLocaleString('id-ID')}</span>
                <span className="stat-label">Ditolak</span>
              </div>
            </div>
          </div>

          {/* ROW 2: Bento Grid Pair — Donut Progress (50%) & Live Agenda Countdown (50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
            {/* Progress Section with Donut Chart */}
            <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h2><i className="fa-solid fa-chart-pie" aria-hidden="true"></i> Progres Kelengkapan Berkas</h2>
                <span className="badge badge-success" style={{ fontSize: '12px' }}>{progressPercent}% Selesai</span>
              </div>
              <div className="card-body" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                  {/* Donut Chart */}
                  <div style={{ width: '160px', height: '160px', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Disetujui', value: approvedCount, color: '#10b981' },
                            { name: 'Menunggu', value: pendingCount, color: '#f59e0b' },
                            { name: 'Revisi', value: revisionCount, color: '#8b5cf6' },
                            { name: 'Ditolak', value: rejectedCount, color: '#ef4444' },
                            { name: 'Belum Diunggah', value: Math.max(0, totalCategories - approvedCount - pendingCount - revisionCount - rejectedCount), color: '#334155' }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {[
                            { name: 'Disetujui', value: approvedCount, color: '#10b981' },
                            { name: 'Menunggu', value: pendingCount, color: '#f59e0b' },
                            { name: 'Revisi', value: revisionCount, color: '#8b5cf6' },
                            { name: 'Ditolak', value: rejectedCount, color: '#ef4444' },
                            { name: 'Belum Diunggah', value: Math.max(0, totalCategories - approvedCount - pendingCount - revisionCount - rejectedCount), color: '#334155' }
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px' }} 
                          formatter={(value?: ValueType, name?: NameType) => [`${value ?? 0} berkas`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success)', lineHeight: 1 }}>{progressPercent}%</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Selesai</div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '140px' }}>
                    {[
                      { label: 'Disetujui', count: approvedCount, color: 'var(--success)', icon: 'fa-circle-check' },
                      { label: 'Menunggu Review', count: pendingCount, color: 'var(--warning)', icon: 'fa-clock' },
                      { label: 'Butuh Revisi', count: revisionCount, color: 'var(--purple)', icon: 'fa-arrows-rotate' },
                      { label: 'Ditolak', count: rejectedCount, color: 'var(--danger)', icon: 'fa-circle-xmark' },
                      { label: 'Belum Diunggah', count: Math.max(0, totalCategories - approvedCount - pendingCount - revisionCount - rejectedCount), color: '#334155', icon: 'fa-circle-minus' }
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, flexShrink: 0 }}></div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <i className={`fa-solid ${item.icon}`} style={{ marginRight: '4px', color: item.color, fontSize: '10px' }}></i>
                            {item.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: item.color }}>{item.count}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                      <span>Total Kategori</span>
                      <span>{totalCategories}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Calendar & Agenda Countdown */}
            <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)' }} aria-hidden="true"></i>
                  Agenda &amp; Countdown
                </h2>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: '6px' }}>Live</span>
              </div>
              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                {(() => {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                  const upcoming = calendarEvents
                    .filter(e => {
                      const start = new Date(e.startDate).getTime();
                      return start >= today && (e.targetAudience === 'all' || e.targetAudience === 'school');
                    })
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                  if (upcoming.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-space-dark)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Tidak ada agenda terdekat dalam waktu dekat.</p>
                      </div>
                    );
                  }

                  const nearest = upcoming[0];
                  const isToday = new Date(nearest.startDate).toDateString() === now.toDateString();

                  return (
                    <div style={{ padding: '16px', background: 'var(--bg-space-dark)', border: '1px solid var(--card-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Agenda Terdekat</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{nearest.startDate}</span>
                      </div>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.3 }}>{nearest.title}</h4>
                      
                      {/* Countdown Display */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                        {isToday ? (
                          <div style={{ width: '100%', background: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}  aria-hidden="true"/> Agenda Berlangsung Hari Ini!
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%' }}>
                            {[
                              { label: 'Hari', value: timeLeft.days, color: 'var(--primary)' },
                              { label: 'Jam', value: timeLeft.hours, color: 'var(--accent)' },
                              { label: 'Min', value: timeLeft.minutes, color: 'var(--success)' },
                              { label: 'Det', value: timeLeft.seconds, color: 'var(--purple)' }
                            ].map(timeUnit => (
                              <div key={timeUnit.label} style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: timeUnit.color }}>{timeUnit.value}</div>
                                <div style={{ fontSize: '8px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{timeUnit.label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Remaining events list */}
                {(() => {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                  const upcomingList = calendarEvents
                    .filter(e => {
                      const start = new Date(e.startDate).getTime();
                      return start > today && (e.targetAudience === 'all' || e.targetAudience === 'school');
                    })
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .slice(0, 2);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agenda Mendatang</span>
                      {upcomingList.map(evt => {
                        let dotColor = 'var(--primary)';
                        if (evt.category === 'meeting') dotColor = 'var(--success)';
                        if (evt.category === 'exam') dotColor = 'var(--warning)';
                        if (evt.category === 'holiday') dotColor = 'var(--danger)';

                        return (
                          <div key={evt.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, marginTop: '5px', flexShrink: 0 }} />
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{evt.title}</span>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginLeft: '8px', flexShrink: 0 }}>{evt.startDate}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <a
                  href="/kalender"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-block"
                  style={{ fontSize: '12px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                >
                  <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}  aria-hidden="true"/> Buka Kalender Publik
                </a>
              </div>
            </div>
          </div>

          {/* ROW 3: Bento Grid Pair — Kirim Berkas Baru Form (50%) & Analytics Overview (50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'stretch', marginTop: '24px' }}>
            {/* Form Upload Berkas */}
            <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}><i className="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Kirim Berkas Baru</h2>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsBulkUploadOpen(true)}
                  style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Bulk Upload
                </button>
              </div>
              <div className="card-body" style={{ flex: 1 }}>
                <form onSubmit={handleUploadSubmit}>
                  <FancySelect
                    label="Kategori Berkas"
                    icon="fa-solid fa-folder-open"
                    searchable
                    required
                    value={selectedCatId}
                    onChange={(val) => {
                      setSelectedCatId(val);
                      const matched = activeCategories.find((c) => c.id === val);
                      if (matched) {
                        setFileNameInput(`${matched.name.replace(/\s/g, '_')}_${school?.npsn || user.npsn}.pdf`);
                      }
                    }}
                    placeholder="-- Pilih Kategori Berkas --"
                    options={[
                      { value: '', label: '-- Pilih Kategori Berkas --' },
                      ...activeCategories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <div className="form-group">
                    <label>Nama Dokumen (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Contoh: PTK_SDN1Cibadak_${targetYear}.pdf`}
                      value={fileNameInput}
                      onChange={(e) => setFileNameInput(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unggah Berkas PDF (Drag &amp; Drop)</label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('drag-drop-input')?.click()}
                      style={{
                        border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--card-border)',
                        borderRadius: '16px',
                        background: isDragging ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.1)',
                        padding: '20px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <input
                        id="drag-drop-input"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />

                      {uploadProgress === null && (
                        <>
                          <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '24px', color: 'var(--primary)', opacity: 0.8 }}  aria-hidden="true"/>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                              Seret &amp; lepas berkas PDF di sini
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              atau klik untuk memilih file dari komputer Anda
                            </span>
                          </div>
                        </>
                      )}

                      {uploadProgress !== null && uploadProgress < 100 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <svg width="50" height="50" viewBox="0 0 60 60">
                            <circle
                              cx="30"
                              cy="30"
                              r="24"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="4"
                              fill="transparent"
                            />
                            <circle
                              cx="30"
                              cy="30"
                              r="24"
                              stroke="var(--primary)"
                              strokeWidth="4"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 24}
                              strokeDashoffset={2 * Math.PI * 24 * (1 - uploadProgress / 100)}
                              strokeLinecap="round"
                              transform="rotate(-90 30 30)"
                              style={{ transition: 'stroke-dashoffset 0.15s ease' }}
                            />
                            <text
                              x="30"
                              y="34"
                              textAnchor="middle"
                              fill="var(--text-primary)"
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {uploadProgress}%
                            </text>
                          </svg>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Mengunggah berkas...</span>
                        </div>
                      )}

                      {uploadProgress === 100 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', fontSize: '18px' }}>
                            <i className="fa-solid fa-circle-check"  aria-hidden="true"/>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>Selesai Diunggah!</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all', maxWidth: '250px' }}>
                            {uploadedFile?.name || fileNameInput}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Link Google Drive (Terisi Otomatis / Manual)</label>
                    <div className="input-with-icon">
                      <i className="fa-brands fa-google-drive" aria-hidden="true"></i>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://drive.google.com/file/d/..."
                        value={driveLinkInput}
                        onChange={(e) => setDriveLinkInput(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">
                    Kirim Berkas <i className="fa-solid fa-paper-plane" style={{ marginLeft: '6px' }} aria-hidden="true"></i>
                  </button>
                </form>
              </div>
            </div>

            {/* Analytics Status Donut & Category Summary */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <AnalyticsCharts submissions={submissions} categories={activeCategories} schools={[]} variant="compact" />
            </div>
          </div>

          {/* Full Width Section: Catatan Supervisi & Kunjungan Pengawas */}
          <div className="card animate-fade-in" style={{ marginTop: '24px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2><i className="fa-solid fa-clipboard-user" style={{ color: 'var(--primary)' }} aria-hidden="true"></i> Catatan Supervisi &amp; Kunjungan Pengawas</h2>
              <span className="badge badge-info">{supervisionNotes.length} Catatan</span>
            </div>
            <div className="card-body">
              {supervisionNotes.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {supervisionNotes.map(note => (
                    <div key={note.id} style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-primary" style={{ fontSize: '10px' }}>Bidang: {note.category}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-calendar-day" style={{ marginRight: '4px' }} aria-hidden="true"></i>
                          {new Date(note.visitDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Rating Kesiapan:</span>
                        <div style={{ color: 'var(--warning)', fontSize: '12px', display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <i key={star} className={`fa-${star <= note.score ? 'solid' : 'regular'} fa-star`}></i>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px', lineHeight: 1.5 }}>
                        <strong>Catatan Evaluasi:</strong> {note.notes}
                      </div>
                      {note.recommendations && (
                        <div style={{ fontSize: '12px', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)', lineHeight: 1.5 }}>
                          <strong>Rekomendasi Tindak Lanjut:</strong> {note.recommendations}
                        </div>
                      )}
                      <small style={{ fontSize: '10px', opacity: 0.6 }}>Pengawas: {note.supervisorName}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                  <i className="fa-solid fa-user-check" style={{ fontSize: '28px', marginBottom: '8px' }} aria-hidden="true"></i>
                  <p style={{ margin: 0, fontSize: '13px' }}>Belum ada catatan kunjungan supervisi dari Pengawas Pembina.</p>
                </div>
              )}
            </div>
          </div>

          {/* Full Width Section: Daftar Status Berkas Table */}
          <div className="card animate-fade-in" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h2><i className="fa-solid fa-folder-open" aria-hidden="true"></i> Daftar Status Berkas</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kategori Berkas</th>
                      <th>Alur Verifikasi</th>
                      <th>Status</th>
                      <th>File Name</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCategories.map(cat => {
                      const sub = submissions.find(s => s.categoryId === cat.id);
                      return (
                        <tr key={cat.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className={cat.icon} style={{ color: 'var(--primary)' }}></i>
                              <span><strong>{cat.name}</strong></span>
                            </div>
                          </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: sub ? 'var(--success)' : 'var(--text-muted)' }}>
                                  <i className={`fa-solid ${sub ? 'fa-circle-check' : 'fa-circle-dot'}`}></i> Diunggah
                                </span>
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: '8px', opacity: 0.4 }} aria-hidden="true"></i>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: sub && sub.status !== 'pending' ? 'var(--success)' : sub?.status === 'pending' ? 'var(--warning)' : 'var(--text-muted)' }}>
                                  <i className={`fa-solid ${sub && sub.status !== 'pending' ? 'fa-circle-check' : sub?.status === 'pending' ? 'fa-clock' : 'fa-circle-dot'}`}></i> Verifikasi
                                </span>
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: '8px', opacity: 0.4 }} aria-hidden="true"></i>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: sub?.status === 'approved' ? 'var(--success)' : sub?.status === 'revision' ? 'var(--warning)' : sub?.status === 'rejected' ? 'var(--danger)' : 'var(--text-muted)' }}>
                                  <i className={`fa-solid ${sub?.status === 'approved' ? 'fa-circle-check' : sub?.status === 'revision' ? 'fa-arrows-rotate' : sub?.status === 'rejected' ? 'fa-circle-xmark' : 'fa-circle-dot'}`}></i>
                                  {sub?.status === 'approved' ? 'Disetujui' : sub?.status === 'revision' ? 'Revisi' : sub?.status === 'rejected' ? 'Ditolak' : 'Hasil'}
                                </span>
                              </div>
                            </td>
                            <td>
                              {sub ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                  <span className={`badge badge-${sub.status === 'approved' ? 'success' : sub.status === 'pending' ? 'pending' : sub.status === 'revision' ? 'revision' : 'danger'}`}>
                                    {sub.status === 'approved' ? 'Disetujui' : sub.status === 'pending' ? 'Menunggu' : sub.status === 'revision' ? 'Revisi' : 'Ditolak'}
                                  </span>
                                  {sub.status === 'revision' && sub.notes && (
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-xs"
                                      style={{ borderColor: 'var(--revision)', color: 'var(--revision)' }}
                                      onClick={() => setSelectedSubmissionForModal(sub)}
                                    >
                                      Catatan <i className="fa-solid fa-comment-dots" aria-hidden="true"></i>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Belum Dikirim</span>
                              )}
                            </td>
                            <td>
                              {sub ? (
                                <small style={{ maxWidth: '180px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sub.fileName}
                                </small>
                              ) : '-'}
                            </td>
                            <td>
                               {sub ? (
                                 <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                   {sub.status === 'revision' || sub.status === 'rejected' ? (
                                     <button
                                       type="button"
                                       className="btn btn-primary btn-xs"
                                       onClick={() => {
                                         setSelectedCatId(cat.id);
                                         setFileNameInput(sub.fileName || `${cat.name.replace(/\s/g, '_')}_${school?.npsn || user.npsn}.pdf`);
                                         setDriveLinkInput(sub.driveLink || '');
                                       }}
                                     >
                                       Upload Ulang <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                                     </button>
                                   ) : null}
                                   <a href={sub.driveLink ?? '#'} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs">
                                     Buka <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                                   </a>
                                 </div>
                               ) : (
                                 <button
                                   type="button"
                                   className="btn btn-primary btn-xs"
                                   onClick={() => {
                                     setSelectedCatId(cat.id);
                                     setFileNameInput(`${cat.name.replace(/\s/g, '_')}_${school?.npsn || user.npsn}.pdf`);
                                   }}
                                 >
                                   Upload
                                 </button>
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
          </div>
        </DashboardShell>

      {/* Revision notes modal */}
      {selectedSubmissionForModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(var(--modal-blur))', WebkitBackdropFilter: 'blur(var(--modal-blur))', zIndex: 'var(--z-modal)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card modal-card" style={{ width: '400px', maxWidth: '90%' }}>
            <div className="card-header">
              <h3>Catatan Revisi</h3>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
                onClick={() => setSelectedSubmissionForModal(null)}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                {selectedSubmissionForModal.notes || "Tidak ada catatan detail."}
              </p>
              <button className="btn btn-primary btn-block" onClick={() => {
                setSelectedCatId(selectedSubmissionForModal.categoryId);
                setDriveLinkInput(selectedSubmissionForModal.driveLink || '');
                setFileNameInput(selectedSubmissionForModal.fileName || '');
                setSelectedSubmissionForModal(null);
              }}>
                Perbaiki Berkas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {school && (
        <BulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          categories={activeCategories}
          schoolNpsn={school.npsn}
          onUploadSuccess={() => getSubmissionsBySchool(school.npsn).then(setSubmissions)}
        />
      )}
    </>
  );
}
