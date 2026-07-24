'use client';

import React, { useState, useEffect } from 'react';
import { getAnnouncements, addAnnouncement, deleteAnnouncement } from '@/lib/db';
import type { Announcement } from '@/lib/db';
import { toast } from 'sonner';
import CommandPalette from '@/components/CommandPalette';
import { confirmAction } from '@/components/ConfirmDialog';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';

export default function AdminAnnouncements() {
  const { user, loading, logout } = useAuth('admin');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');

  useEffect(() => {
    if (loading || !user) return;
    getAnnouncements().then(setAnnouncements);
  }, [loading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newAnn = await addAnnouncement({
      title,
      content,
      priority,
      createdBy: 'Admin Utama'
    });

    setAnnouncements([newAnn, ...announcements]);
    setTitle('');
    setContent('');
    setPriority('normal');
    toast.success('Pengumuman berhasil dipublikasikan!');
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Pengumuman',
      message: 'Apakah Anda yakin ingin menghapus pengumuman ini?',
      variant: 'danger',
    });
    if (!confirmed) return;
    await deleteAnnouncement(id);
    setAnnouncements(announcements.filter(a => a.id !== id));
    toast.success('Pengumuman dihapus.');
  };

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Pengumuman Resmi"
      headerSubtitle="Kelola dan sebar luaskan info rekapitulasi sekolah"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Create form */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <h2><i className="fa-solid fa-pen-nib"></i> Tulis Pengumuman</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="announcement-title">Judul Pengumuman</label>
                    <input
                      id="announcement-title"
                      type="text"
                      className="form-control"
                      placeholder="Masukkan judul..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <span id="announcement-priority-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Prioritas Siaran</span>
                    <div role="radiogroup" aria-labelledby="announcement-priority-label" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { value: 'low' as const, label: 'ℹ️ Info', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' },
                        { value: 'normal' as const, label: '📋 Normal', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.25)' },
                        { value: 'high' as const, label: '🚨 Mendesak', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={priority === opt.value}
                          onClick={() => setPriority(opt.value)}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: priority === opt.value ? `2px solid ${opt.color}` : '2px solid var(--card-border)',
                            background: priority === opt.value ? opt.bg : 'transparent',
                            color: priority === opt.value ? opt.color : 'var(--text-secondary)',
                            fontWeight: priority === opt.value ? 'bold' : 'normal',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: priority === opt.value && opt.value === 'high' ? `0 0 12px ${opt.border}` : 'none'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {priority === 'high' && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        fontSize: '11px',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <i className="fa-solid fa-tower-broadcast" style={{ animation: 'pulse 1s infinite' }}></i>
                        <span>Pengumuman ini akan ditampilkan sebagai <strong>Banner Siaran Darurat</strong> di dashboard semua sekolah yang sedang login!</span>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="announcement-content">Konten Informasi</label>
                    <textarea
                      id="announcement-content"
                      className="form-control"
                      rows={6}
                      placeholder="Masukkan konten pengumuman..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-block" style={{
                    background: priority === 'high' ? 'linear-gradient(135deg, #dc2626, #ef4444)' : '',
                    color: priority === 'high' ? '#ffffff' : '',
                    animation: priority === 'high' ? 'broadcast-pulse 2s ease-in-out infinite' : ''
                  }}>
                    {priority === 'high' ? (
                      <><i className="fa-solid fa-tower-broadcast" style={{ marginRight: '6px' }}></i> Siarkan Darurat</>
                    ) : (
                      <>Publikasikan <i className="fa-solid fa-paper-plane" style={{ marginLeft: '6px' }}></i></>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* List */}
            <div className="card animate-fade-in" style={{ gridColumn: 'span 2' }}>
              <div className="card-header">
                <h2><i className="fa-solid fa-list"></i> Riwayat Pengumuman</h2>
              </div>
              <div className="card-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {announcements.map(ann => (
                  <div
                    key={ann.id}
                    style={{
                      border: ann.priority === 'high' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--card-border)',
                      borderRadius: '12px',
                      padding: '16px',
                      background: ann.priority === 'high' ? 'rgba(239, 68, 68, 0.03)' : 'rgba(255,255,255,0.01)',
                      borderLeft: `4px solid ${ann.priority === 'high' ? '#ef4444' : ann.priority === 'normal' ? 'var(--primary)' : 'var(--text-muted)'}`,
                      animation: ann.priority === 'high' ? 'broadcast-pulse 3s ease-in-out infinite' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {ann.priority === 'high' && (
                            <i className="fa-solid fa-tower-broadcast" style={{ color: '#ef4444', fontSize: '14px', animation: 'pulse 1s infinite' }}></i>
                          )}
                          <h3 style={{ fontSize: '16px' }}>{ann.title}</h3>
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          Dibuat pada: {new Date(ann.createdAt).toLocaleString('id-ID')} | Oleh: {ann.createdBy}
                        </small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`badge badge-${ann.priority === 'high' ? 'danger' : ann.priority === 'normal' ? 'pending' : 'success'}`}>
                          {ann.priority === 'high' ? '🚨 Mendesak' : ann.priority === 'normal' ? 'Normal' : 'Rendah'}
                        </span>
                         <button
                           className="btn btn-danger btn-xs"
                           onClick={() => handleDelete(ann.id)}
                           title="Hapus Pengumuman"
                         >
                           <i className="fa-solid fa-trash-can"></i>
                         </button>
                      </div>
                    </div>
                    <p style={{ marginTop: '12px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                      {ann.content}
                    </p>
                    {ann.priority === 'high' && (
                      <div style={{
                        marginTop: '10px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.06)',
                        fontSize: '10px',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <i className="fa-solid fa-satellite-dish"></i>
                        <span>Pengumuman ini sedang ditampilkan sebagai siaran darurat di semua dashboard sekolah</span>
                      </div>
                    )}
                  </div>
                ))}

                {announcements.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Belum ada pengumuman.</p>
                )}
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>
    </>
  );
}
