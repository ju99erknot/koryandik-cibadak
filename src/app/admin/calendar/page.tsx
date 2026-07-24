'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getCalendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/db';
import type { CalendarEvent } from '@/lib/types';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';
import { playSuccessSound, playClickSound, playWarningSound } from '@/lib/sound';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import AcademicCalendar from '@/components/AcademicCalendar';
import { toggleThemeWithTransition } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import FancySelect from '@/components/FancySelect';

const TEMPLATES = [
  { category: 'submission' as const, label: 'Tenggat Berkas', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: 'fa-file-arrow-up' },
  { category: 'meeting' as const, label: 'Rapat Dinas', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'fa-handshake' },
  { category: 'exam' as const, label: 'Ujian / Asesmen', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'fa-file-pen' },
  { category: 'holiday' as const, label: 'Hari Libur Resmi', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: 'fa-umbrella-beach' },
  { category: 'event' as const, label: 'Kegiatan Guru', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: 'fa-chalkboard-user' },
  { category: 'reporting' as const, label: 'Pembagian Rapor', color: '#eab308', bg: 'rgba(234,179,8,0.12)', icon: 'fa-book-open' },
  { category: 'admission' as const, label: 'Pendaftaran PPDB', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: 'fa-user-plus' },
  { category: 'national' as const, label: 'Hari Besar / Upacara', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', icon: 'fa-flag' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Semua Sasaran' },
  { value: 'school', label: 'Operator Sekolah' },
  { value: 'teacher', label: 'Guru & Pendidik' },
  { value: 'principal', label: 'Kepala Sekolah' },
  { value: 'gugus', label: 'Koordinator Gugus' },
  { value: 'supervisor', label: 'Pengawas Sekolah' },
  { value: 'kkks', label: 'Pengurus KKKS' },
  { value: 'pgri', label: 'Pengurus PGRI' },
];

const CATEGORY_OPTIONS = [
  { value: 'submission', label: 'Tenggat Berkas' },
  { value: 'meeting', label: 'Rapat Dinas' },
  { value: 'exam', label: 'Ujian / Asesmen' },
  { value: 'holiday', label: 'Hari Libur Resmi' },
  { value: 'event', label: 'Kegiatan Guru / KKG' },
  { value: 'reporting', label: 'Pembagian Rapor' },
  { value: 'admission', label: 'Pendaftaran PPDB' },
  { value: 'national', label: 'Hari Besar / Upacara' },
];

export default function AdminCalendarPage() {
  const { user, loading: authLoading, logout } = useAuth('admin');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEvent['category']>('submission');
  const [formTarget, setFormTarget] = useState<CalendarEvent['targetAudience']>('all');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Filtering / Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (authLoading || !user) return;
    const loadEvents = async () => {
      setLoading(true);
      const data = await getCalendarEvents();
      setEvents(data);
      setLoading(false);
    };
    loadEvents();
  }, [authLoading, user, refreshTrigger]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyEvents = events.filter(e => {
      const date = new Date(e.startDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return {
      total: events.length,
      monthly: monthlyEvents.length,
      submissions: events.filter(e => e.category === 'submission').length,
      meetings: events.filter(e => e.category === 'meeting').length,
      exams: events.filter(e => e.category === 'exam').length,
      holidays: events.filter(e => e.category === 'holiday').length,
    };
  }, [events]);

  // Filtered list
  const filteredEventsList = useMemo(() => {
    return events.filter(e => {
      const matchQuery = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = filterCategory === 'all' || e.category === filterCategory;
      return matchQuery && matchCat;
    }).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [events, searchQuery, filterCategory]);

  const handleDateSelect = (dateStr: string) => {
    playClickSound();
    setFormTitle('');
    setFormDesc('');
    setFormCategory('submission');
    setFormTarget('all');
    setFormStartDate(dateStr);
    setFormEndDate(dateStr);
    setFormLocation('');
    setModalMode('create');
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleEventSelect = (evt: CalendarEvent) => {
    playClickSound();
    setSelectedEventId(evt.id);
    setFormTitle(evt.title);
    setFormDesc(evt.description || '');
    setFormCategory(evt.category);
    setFormTarget(evt.targetAudience);
    setFormStartDate(evt.startDate);
    setFormEndDate(evt.endDate);
    setFormLocation(evt.location || '');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleEventMove = async (rawData: string, targetDate: string) => {
    if (rawData.startsWith('template:')) {
      const category = rawData.split(':')[1] as CalendarEvent['category'];
      handleDateSelect(targetDate);
      setFormCategory(category);
    } else if (rawData.startsWith('event:')) {
      const eventId = rawData.split(':')[1];
      const targetEvent = events.find(e => e.id === eventId);
      if (targetEvent) {
        const start = new Date(targetEvent.startDate);
        const end = new Date(targetEvent.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const newStartDate = targetDate;
        const newEndDateObj = new Date(targetDate);
        newEndDateObj.setDate(newEndDateObj.getDate() + diffDays - 1);
        const newEndDate = newEndDateObj.toISOString().split('T')[0];
        
        const updated = {
          ...targetEvent,
          startDate: newStartDate,
          endDate: newEndDate
        };
        
        await updateCalendarEvent(updated);
        playSuccessSound();
        toast.success(`Agenda "${targetEvent.title}" dipindahkan ke tanggal ${targetDate}`);
        setRefreshTrigger(prev => prev + 1);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate || !formEndDate) {
      toast.error('Judul, Tanggal Mulai, dan Selesai wajib diisi.');
      return;
    }

    if (new Date(formStartDate) > new Date(formEndDate)) {
      toast.error('Tanggal Mulai tidak boleh setelah Tanggal Selesai.');
      return;
    }

    const eventPayload = {
      title: formTitle,
      description: formDesc,
      category: formCategory,
      targetAudience: formTarget,
      startDate: formStartDate,
      endDate: formEndDate,
      location: formLocation,
    };

    if (modalMode === 'create') {
      await addCalendarEvent(eventPayload);
      playSuccessSound();
      toast.success('Agenda baru berhasil ditambahkan!');
    } else if (modalMode === 'edit' && selectedEventId) {
      await updateCalendarEvent({
        id: selectedEventId,
        ...eventPayload
      });
      playSuccessSound();
      toast.success('Agenda berhasil diperbarui!');
    }

    setIsModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    playWarningSound();
    const confirmed = await confirmAction({
      title: 'Hapus Agenda',
      message: 'Apakah Anda yakin ingin menghapus agenda ini dari kalender pendidikan?',
      variant: 'danger',
    });
    if (!confirmed) return;

    await deleteCalendarEvent(id);
    playSuccessSound();
    toast.success('Agenda berhasil dihapus.');
    setIsModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  if (authLoading || loading || !user) return <LoadingScreen />;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-cal-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .admin-cal-layout {
            grid-template-columns: 1fr;
          }
        }
        .template-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid var(--card-border);
          cursor: grab;
          font-size: 11.5px;
          font-weight: 750;
          transition: all 0.2s ease;
          user-select: none;
        }
        .template-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .template-item:active {
          cursor: grabbing;
        }
        .admin-cal-search-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .admin-cal-search-row .admin-cal-filter-wrap {
          width: 150px;
          flex-shrink: 0;
        }
        .admin-cal-scroller {
          max-height: 480px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 2px;
        }
        .admin-cal-scroller::-webkit-scrollbar { width: 4px; }
        .admin-cal-scroller::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 4px; }
        .admin-cal-evt-row {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          gap: 10px;
        }
        .admin-cal-evt-details {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .admin-cal-evt-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-cal-evt-meta {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-cal-evt-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
      ` }} />

      <DashboardShell
        user={user}
        onLogout={logout}
        headerTitle="Kelola Kalender Akademik"
        headerSubtitle="Rancang jadwal ujian, rapat, tenggat berkas dinas, dan libur resmi"
        headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
      >
        <div className="content-area">
          {/* Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <i className="fa-solid fa-calendar-days"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Agenda Terdaftar</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.monthly}</span>
                <span className="stat-label">Agenda Bulan Ini</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
                <i className="fa-solid fa-file-arrow-up"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.submissions}</span>
                <span className="stat-label">Tenggat Berkas</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                <i className="fa-solid fa-handshake"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.meetings}</span>
                <span className="stat-label">Rapat Koordinasi</span>
              </div>
            </div>
          </div>

          <div className="admin-cal-layout">
            {/* Left: Interactive Calendar */}
            <div>
              <AcademicCalendar 
                mode="edit" 
                refreshTrigger={refreshTrigger}
                onDateSelect={handleDateSelect}
                onEventMove={handleEventMove}
                onEventSelect={handleEventSelect}
              />
            </div>

            {/* Right: Planner Tray */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Draggable templates toolbox */}
              <div className="card animate-fade-in">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2><i className="fa-solid fa-toolbox" style={{ color: 'var(--accent)' }}></i> Alat Seret Agenda</h2>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const nowStr = new Date().toISOString().split('T')[0];
                      handleDateSelect(nowStr);
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Agenda Baru
                  </button>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Seret (*drag*) salah satu template kategori di bawah ke dalam tanggal kalender di sebelah kiri untuk menjadwalkan kegiatan secara instan.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {TEMPLATES.map(tmp => (
                      <div
                        key={tmp.category}
                        className="template-item"
                        style={{ borderLeft: `4px solid ${tmp.color}` }}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', `template:${tmp.category}`);
                        }}
                      >
                        <i className={`fa-solid ${tmp.icon}`} style={{ color: tmp.color }}></i>
                        {tmp.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Event search & List */}
              <div className="card animate-fade-in" style={{ flex: 1 }}>
                <div className="card-header">
                  <h2><i className="fa-solid fa-magnifying-glass"></i> Daftar &amp; Pencarian Agenda</h2>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                  <div className="admin-cal-search-row">
                    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px', pointerEvents: 'none' }}></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Cari kata kunci..."
                        style={{ paddingLeft: '28px', height: '36px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="admin-cal-filter-wrap">
                      <FancySelect
                        size="sm"
                        fullWidth
                        value={filterCategory}
                        onChange={setFilterCategory}
                        icon="fa-solid fa-filter"
                        options={[
                          { value: 'all', label: 'Semua Kategori' },
                          ...CATEGORY_OPTIONS
                        ]}
                      />
                    </div>
                  </div>

                  <div className="admin-cal-scroller">
                    {filteredEventsList.length > 0 ? filteredEventsList.map(evt => {
                      const meta = TEMPLATES.find(t => t.category === evt.category) || { color: 'var(--primary)', icon: 'fa-calendar' };
                      const targetMeta = AUDIENCE_OPTIONS.find(a => a.value === evt.targetAudience)?.label || evt.targetAudience;

                      return (
                        <div key={evt.id} className="admin-cal-evt-row" style={{ borderLeft: `3px solid ${meta.color}` }}>
                          <div className="admin-cal-evt-details">
                            <div className="admin-cal-evt-title" title={evt.title}>{evt.title}</div>
                            <div className="admin-cal-evt-meta" title={`${evt.startDate === evt.endDate ? evt.startDate : evt.startDate + ' s.d ' + evt.endDate} · ${targetMeta}`}>
                              <span><i className="fa-solid fa-calendar-day" style={{ marginRight: '4px' }}></i>{evt.startDate === evt.endDate ? evt.startDate : `${evt.startDate} — ${evt.endDate}`}</span>
                              <span style={{ marginLeft: '8px' }}><i className="fa-solid fa-users" style={{ marginRight: '4px' }}></i>{targetMeta}</span>
                            </div>
                          </div>
                          <div className="admin-cal-evt-actions">
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => handleEventSelect(evt)}
                              title="Sunting Agenda"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => handleDelete(evt.id)}
                              title="Hapus Agenda"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <i className="fa-solid fa-box-open" style={{ display: 'block', fontSize: '24px', opacity: 0.3, marginBottom: '8px' }}></i>
                        Tidak ada agenda yang cocok
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 10005, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '480px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', animation: 'scale-in 0.25s', background: 'var(--bg-space)', backdropFilter: 'none', border: '1.5px solid var(--card-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{modalMode === 'create' ? 'Tambah Agenda Kalender' : 'Edit Agenda Kalender'}</h3>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
                onClick={() => setIsModalOpen(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="event-title">Judul Agenda *</label>
                  <input
                    id="event-title"
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Rapat Ujian Tengah Semester"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="event-desc">Keterangan / Deskripsi</label>
                  <textarea
                    id="event-desc"
                    className="form-control"
                    rows={2}
                    placeholder="Masukkan detail instruksi atau keterangan agenda..."
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Kategori Agenda</label>
                    <FancySelect
                      fullWidth
                      value={formCategory}
                      onChange={(val) => setFormCategory(val as CalendarEvent['category'])}
                      icon="fa-solid fa-tags"
                      options={CATEGORY_OPTIONS}
                    />
                  </div>
                  <div className="form-group">
                    <label>Target Sasaran</label>
                    <FancySelect
                      fullWidth
                      value={formTarget}
                      onChange={(val) => setFormTarget(val as CalendarEvent['targetAudience'])}
                      icon="fa-solid fa-users"
                      options={AUDIENCE_OPTIONS}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="event-start">Tanggal Mulai *</label>
                    <input
                      id="event-start"
                      type="date"
                      className="form-control"
                      value={formStartDate}
                      onChange={e => setFormStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="event-end">Tanggal Selesai *</label>
                    <input
                      id="event-end"
                      type="date"
                      className="form-control"
                      value={formEndDate}
                      onChange={e => setFormEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="event-loc">Lokasi Kegiatan</label>
                  <input
                    id="event-loc"
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Aula Koryandik / Gedung PGRI / Online"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  {modalMode === 'edit' && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '8px 16px' }}
                      onClick={() => selectedEventId && handleDelete(selectedEventId)}
                    >
                      <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Hapus
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1.2 }}
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
