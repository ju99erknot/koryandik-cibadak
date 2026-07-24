'use client';

import React, { useEffect, useState } from 'react';
import {
  getAppSettings,
  upsertAppSetting,
  getFaqs,
  saveFaqs,
  getDownloads,
  saveDownloads,
  getProfileSettings,
  saveProfileSettings,
  getSupervisors,
  saveSupervisors,
  getAllRelatedLinks,
  saveRelatedLinks,
  addRelatedLink,
  updateRelatedLink,
  deleteRelatedLink
} from '@/lib/db';
import type { AppSetting } from '@/lib/db';
import type { FaqItem, DownloadItem, ProfileSettings, RelatedLink } from '@/lib/types';
import type { PengawasData } from '@/lib/schoolsData';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import CommandPalette from '@/components/CommandPalette';
import IconPicker from '@/components/IconPicker';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';

const INITIAL_SETTINGS = [
  {
    key: 'submission_deadline_default',
    label: 'Deadline Default Kategori',
    description: 'Nilai default yang digunakan jika kategori tidak memiliki deadline tersendiri.',
    type: 'json',
    placeholder: '{"day": 15, "type": "monthly"}'
  },
  {
    key: 'deadline_reminder_days',
    label: 'Pengingat Deadline',
    description: 'Jarak hari sebelum dan sesudah deadline untuk membuat notifikasi pengingat.',
    type: 'json',
    placeholder: '{"before": 7, "after": 2}'
  },
  {
    key: 'default_theme',
    label: 'Tema Default',
    description: 'Tema awal aplikasi untuk pengguna yang belum memilih preferensi.',
    type: 'json',
    placeholder: '{"mode": "light"}'
  },
  {
    key: 'announcement_banner_enabled',
    label: 'Banner Pengumuman',
    description: 'Menentukan apakah banner pengumuman global akan ditampilkan.',
    type: 'json',
    placeholder: '{"enabled": true}'
  }
];

type SettingsTab = 'global' | 'profile' | 'faqs' | 'downloads' | 'supervisors' | 'links';

export default function AdminSettingsPage() {
  const { user, loading, logout } = useAuth('admin');
  const [activeTab, setActiveTab] = useState<SettingsTab>('global');

  // Global settings state
  const [settings, setSettings] = useState<Record<string, AppSetting>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Profile CMS state
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [newMission, setNewMission] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // FAQ CMS state
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);
  const [savingFaq, setSavingFaq] = useState(false);

  // Downloads CMS state
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [editingDownload, setEditingDownload] = useState<Partial<DownloadItem> | null>(null);
  const [savingDownload, setSavingDownload] = useState(false);

  // Supervisors CMS state
  const [supervisors, setSupervisors] = useState<PengawasData[]>([]);
  const [editingSupervisor, setEditingSupervisor] = useState<Partial<PengawasData> | null>(null);
  const [savingSupervisor, setSavingSupervisor] = useState(false);


  // Related Links CMS state
  const [relatedLinks, setRelatedLinks] = useState<RelatedLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<RelatedLink> | null>(null);
  const [savingLink, setSavingLink] = useState(false);

  // Toggle show raw JSON editor per key
  const [showRawJson, setShowRawJson] = useState<Record<string, boolean>>({});

  // Helper to parse JSON settings safely
  const getParsedValue = (key: string, defaultValue: any) => {
    try {
      return JSON.parse(formValues[key] || '{}') || defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const updateParsedValue = (key: string, newValue: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: JSON.stringify(newValue, null, 2)
    }));
  };

  useEffect(() => {
    if (loading || !user) return;

    // Load App settings
    getAppSettings().then((data) => {
      setSettings(data);
      setFormValues(
        INITIAL_SETTINGS.reduce((acc, item) => {
          acc[item.key] = JSON.stringify(data[item.key]?.value ?? JSON.parse(item.placeholder), null, 2);
          return acc;
        }, {} as Record<string, string>)
      );
    });

    // Load Dynamic Profile settings
    getProfileSettings().then(setProfile);

    // Load FAQs
    getFaqs().then(setFaqs);

    // Load Downloads
    getDownloads().then(setDownloads);

    // Load Supervisors
    getSupervisors().then(setSupervisors);

      getAllRelatedLinks().then(setRelatedLinks);
  }, [loading, user]);

  // Save Global setting handler
  const handleSaveGlobal = async (key: string) => {
    try {
      const parsed = JSON.parse(formValues[key]);
      setSavingGlobal(true);
      const updated = await upsertAppSetting(
        key,
        parsed,
        INITIAL_SETTINGS.find((item) => item.key === key)?.description
      );
      setSettings((prev) => ({ ...prev, [key]: updated }));
      toast.success(`Pengaturan ${key} berhasil disimpan.`);
    } catch (error) {
      toast.error('Format JSON tidak valid. Periksa kembali struktur data.');
    } finally {
      setSavingGlobal(false);
    }
  };

  // Save Profile Settings handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSavingProfile(true);
      await saveProfileSettings(profile);
      toast.success('Profil Koryandik berhasil diperbarui!');
    } catch {
      toast.error('Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // FAQ CRUD handlers
  const handleAddOrUpdateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq?.question || !editingFaq?.answer || !editingFaq?.category) {
      toast.error('Mohon lengkapi semua kolom wajib.');
      return;
    }

    try {
      setSavingFaq(true);
      let updatedFaqs: FaqItem[];

      if (editingFaq.id) {
        // Edit mode
        updatedFaqs = faqs.map((f) => (f.id === editingFaq.id ? (editingFaq as FaqItem) : f));
      } else {
        // Add mode
        const newFaq: FaqItem = {
          id: 'faq_' + Date.now().toString(36),
          question: editingFaq.question,
          answer: editingFaq.answer,
          category: editingFaq.category,
          icon: editingFaq.icon || 'fa-circle-info'
        };
        updatedFaqs = [...faqs, newFaq];
      }

      await saveFaqs(updatedFaqs);
      setFaqs(updatedFaqs);
      setEditingFaq(null);
      toast.success(editingFaq.id ? 'Pertanyaan FAQ diperbarui.' : 'Pertanyaan FAQ baru ditambahkan.');
    } catch {
      toast.error('Gagal menyimpan FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus FAQ',
      message: 'Apakah Anda yakin ingin menghapus pertanyaan FAQ ini?',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const updatedFaqs = faqs.filter((f) => f.id !== id);
      await saveFaqs(updatedFaqs);
      setFaqs(updatedFaqs);
      toast.success('FAQ berhasil dihapus.');
    } catch {
      toast.error('Gagal menghapus FAQ.');
    }
  };

  // Download CRUD handlers
  const handleAddOrUpdateDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDownload?.title || !editingDownload?.description || !editingDownload?.category || !editingDownload?.fileSize || !editingDownload?.fileType || !editingDownload?.downloadUrl) {
      toast.error('Mohon lengkapi semua kolom wajib.');
      return;
    }

    try {
      setSavingDownload(true);
      let updatedDownloads: DownloadItem[];

      // Auto-generate previewUrl from downloadUrl if not provided
      let finalPreviewUrl = editingDownload.previewUrl;
      if (!finalPreviewUrl || finalPreviewUrl === '#') {
        const docsMatch = editingDownload.downloadUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        const driveMatch = editingDownload.downloadUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const sheetsMatch = editingDownload.downloadUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        
        if (docsMatch) {
          finalPreviewUrl = `https://docs.google.com/document/d/${docsMatch[1]}/preview`;
        } else if (sheetsMatch) {
          finalPreviewUrl = `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;
        } else if (driveMatch) {
          finalPreviewUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
      }

      const downloadItem: DownloadItem = {
        id: editingDownload.id || 'dl_' + Date.now().toString(36),
        title: editingDownload.title,
        description: editingDownload.description,
        category: editingDownload.category as 'surat' | 'format' | 'sk',
        fileSize: editingDownload.fileSize,
        fileType: editingDownload.fileType as 'PDF' | 'DOCX' | 'XLSX',
        downloadUrl: editingDownload.downloadUrl,
        icon: editingDownload.icon || (editingDownload.fileType === 'XLSX' ? 'fa-table' : editingDownload.fileType === 'PDF' ? 'fa-file-signature' : 'fa-envelope-open-text'),
        updatedAt: new Date().toISOString().split('T')[0],
        downloadCount: editingDownload.downloadCount ?? 0,
        version: editingDownload.version || '1.0',
        status: editingDownload.status || 'active',
        previewUrl: finalPreviewUrl || '#'
      };

      if (editingDownload.id) {
        updatedDownloads = downloads.map((d) => (d.id === editingDownload.id ? downloadItem : d));
      } else {
        updatedDownloads = [...downloads, downloadItem];
      }

      await saveDownloads(updatedDownloads);
      setDownloads(updatedDownloads);
      setEditingDownload(null);
      toast.success(editingDownload.id ? 'Dokumen unduhan diperbarui.' : 'Dokumen unduhan baru ditambahkan.');
    } catch {
      toast.error('Gagal menyimpan dokumen unduhan.');
    } finally {
      setSavingDownload(false);
    }
  };

  const handleDeleteDownload = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Berkas Unduhan',
      message: 'Apakah Anda yakin ingin menghapus berkas unduhan ini?',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const updatedDownloads = downloads.filter((d) => d.id !== id);
      await saveDownloads(updatedDownloads);
      setDownloads(updatedDownloads);
      toast.success('Berkas unduhan berhasil dihapus.');
    } catch {
      toast.error('Gagal menghapus berkas.');
    }
  };

  // Supervisor CRUD handlers
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrator',
    pengawas: 'Pengawas Bina',
    kkks: 'Ketua KKKS',
    pgri: 'Ketua PGRI'
  };

  const handleAddOrUpdateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupervisor?.name || !editingSupervisor?.role || !editingSupervisor?.passcode) {
      toast.error('Nama, Peran, dan Kode Akses wajib diisi.');
      return;
    }

    try {
      setSavingSupervisor(true);
      const item: PengawasData = {
        id: editingSupervisor.id || 'sup_' + Date.now().toString(36),
        name: editingSupervisor.name,
        nip: editingSupervisor.nip || '-',
        passcode: editingSupervisor.passcode,
        role: editingSupervisor.role as PengawasData['role'],
        title: editingSupervisor.title || ROLE_LABELS[editingSupervisor.role] || 'Staf',
        wilayah: editingSupervisor.wilayah || 'Kecamatan Cibadak',
        photoUrl: editingSupervisor.photoUrl,
        phone: editingSupervisor.phone
      };

      let updated: PengawasData[];
      if (editingSupervisor.id) {
        updated = supervisors.map((s) => (s.id === editingSupervisor.id ? item : s));
      } else {
        updated = [...supervisors, item];
      }

      await saveSupervisors(updated);
      setSupervisors(updated);
      setEditingSupervisor(null);
      toast.success(editingSupervisor.id ? 'Data pengawas diperbarui.' : 'Pengawas baru ditambahkan.');
    } catch {
      toast.error('Gagal menyimpan data pengawas.');
    } finally {
      setSavingSupervisor(false);
    }
  };

  const handleDeleteSupervisor = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Pengawas',
      message: 'Apakah Anda yakin ingin menghapus pengawas ini?',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const updated = supervisors.filter((s) => s.id !== id);
      await saveSupervisors(updated);
      setSupervisors(updated);
      toast.success('Pengawas berhasil dihapus.');
    } catch {
      toast.error('Gagal menghapus pengawas.');
    }
  };

  // Related Links CRUD handlers
  const handleAddOrUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink?.title || !editingLink?.url || !editingLink?.description) {
      toast.error('Mohon lengkapi semua kolom wajib.');
      return;
    }

    try {
      setSavingLink(true);
      let updatedLinks: RelatedLink[];

      const linkItem: RelatedLink = {
        id: editingLink.id || 'link-' + Date.now().toString(36),
        title: editingLink.title,
        url: editingLink.url,
        category: editingLink.category as 'pendidikan' | 'layanan' | 'referensi' | 'lainnya',
        icon: editingLink.icon || 'fa-link',
        description: editingLink.description,
        target: editingLink.target || '_blank',
        isActive: editingLink.isActive !== undefined ? editingLink.isActive : true,
        order: editingLink.order !== undefined ? editingLink.order : relatedLinks.length + 1
      };

      if (editingLink.id) {
        updatedLinks = relatedLinks.map((l) => (l.id === editingLink.id ? linkItem : l));
      } else {
        updatedLinks = [...relatedLinks, linkItem];
      }

      await saveRelatedLinks(updatedLinks);
      setRelatedLinks(updatedLinks);
      setEditingLink(null);
      toast.success(editingLink.id ? 'Tautan berhasil diperbarui.' : 'Tautan baru berhasil ditambahkan.');
    } catch {
      toast.error('Gagal menyimpan tautan.');
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Tautan',
      message: 'Apakah Anda yakin ingin menghapus tautan ini?',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const updatedLinks = relatedLinks.filter((l) => l.id !== id);
      await saveRelatedLinks(updatedLinks);
      setRelatedLinks(updatedLinks);
      toast.success('Tautan berhasil dihapus.');
    } catch {
      toast.error('Gagal menghapus tautan.');
    }
  };


  if (loading || !user) return <LoadingScreen />;

  return (
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Pengaturan Portal"
      headerSubtitle="Kelola konfigurasi sistem &amp; konten halaman dinamis"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
      <div className="content-area">
        {/* Navigation Tabs */}
        <div
          className="static-tabs admin-tabs no-print animate-fade-in"
          style={{ marginBottom: '24px', maxWidth: '100%', padding: '4px' }}
        >
          {(
            [
              { id: 'global', label: 'Pengaturan Global', icon: 'fa-gears' },
              { id: 'profile', label: 'Profil Koryandik', icon: 'fa-address-card' },
              { id: 'supervisors', label: 'Kelola Pengawas', icon: 'fa-user-tie' },
              { id: 'faqs', label: 'Kelola FAQ', icon: 'fa-circle-question' },
              { id: 'downloads', label: 'Kelola Unduhan', icon: 'fa-cloud-arrow-down' },
              { id: 'links', label: 'Tautan Terkait', icon: 'fa-link' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`static-tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingFaq(null);
                setEditingDownload(null);
                setEditingSupervisor(null);
                setEditingLink(null);
              }}
            >
              <i className={`fa-solid ${tab.icon} fa-fw`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content: GLOBAL */}
        {activeTab === 'global' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-gears" /> Pengaturan Sistem Global
              </h2>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: '20px' }}>
              {INITIAL_SETTINGS.map((item) => {
                const isRaw = !!showRawJson[item.key];
                return (
                  <div
                    key={item.key}
                    className="setting-card"
                    style={{
                      background: 'var(--card-glass)',
                      padding: '20px',
                      borderRadius: '18px',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{item.label}</h3>
                        <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {item.description}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => setShowRawJson(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        >
                          <i className={`fa-solid ${isRaw ? 'fa-eye-slash' : 'fa-code'}`} /> {isRaw ? 'Tutup JSON' : 'Edit JSON'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveGlobal(item.key)}
                          disabled={savingGlobal}
                        >
                          <i className="fa-solid fa-cloud-arrow-up" /> Simpan
                        </button>
                      </div>
                    </div>

                    {/* Styled Inputs depending on Key */}
                    {!isRaw && (
                      <div style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '14px' }}>
                        {item.key === 'submission_deadline_default' && (() => {
                          const val = getParsedValue('submission_deadline_default', { day: 15, type: 'monthly' });
                          return (
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Hari Batas Pengumpulan (Tanggal)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min={1}
                                  max={31}
                                  value={val.day ?? 15}
                                  onChange={(e) => updateParsedValue('submission_deadline_default', { ...val, day: parseInt(e.target.value) || 1 })}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Periode Siklus Batas</label>
                                <select
                                  className="form-input"
                                  value={val.type ?? 'monthly'}
                                  onChange={(e) => updateParsedValue('submission_deadline_default', { ...val, type: e.target.value })}
                                >
                                  <option value="weekly">Mingguan (Weekly)</option>
                                  <option value="monthly">Bulanan (Monthly)</option>
                                  <option value="yearly">Tahunan (Yearly)</option>
                                </select>
                              </div>
                            </div>
                          );
                        })()}

                        {item.key === 'deadline_reminder_days' && (() => {
                          const val = getParsedValue('deadline_reminder_days', { before: 7, after: 2 });
                          return (
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Notifikasi Pengingat (Hari Sebelum)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min={0}
                                  value={val.before ?? 7}
                                  onChange={(e) => updateParsedValue('deadline_reminder_days', { ...val, before: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Notifikasi Tenggat (Hari Sesudah)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min={0}
                                  value={val.after ?? 2}
                                  onChange={(e) => updateParsedValue('deadline_reminder_days', { ...val, after: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {item.key === 'default_theme' && (() => {
                          const val = getParsedValue('default_theme', { mode: 'light' });
                          return (
                            <div style={{ maxWidth: '280px' }}>
                              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pilihan Mode Default Aplikasi</label>
                              <select
                                className="form-input"
                                value={val.mode ?? 'light'}
                                onChange={(e) => updateParsedValue('default_theme', { mode: e.target.value })}
                              >
                                <option value="light">☀️ Terang (Light Mode)</option>
                                <option value="dark">🌙 Gelap (Dark Mode)</option>
                              </select>
                            </div>
                          );
                        })()}

                        {item.key === 'announcement_banner_enabled' && (() => {
                          const val = getParsedValue('announcement_banner_enabled', { enabled: true });
                          return (
                            <div>
                              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Status Banner Siaran Global</label>
                              <button
                                type="button"
                                className={`btn ${val.enabled ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                onClick={() => updateParsedValue('announcement_banner_enabled', { enabled: !val.enabled })}
                                style={{ borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                              >
                                <i className={`fa-solid ${val.enabled ? 'fa-circle-check' : 'fa-circle-minus'}`} />
                                {val.enabled ? 'Banner Siaran Aktif' : 'Banner Siaran Dinonaktifkan'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Raw Textarea Editor */}
                    {isRaw && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--card-border)', paddingTop: '14px' }}>
                        <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Edit Konfigurasi JSON Mentah</label>
                        <textarea
                          value={formValues[item.key] ?? ''}
                          onChange={(e) => setFormValues({ ...formValues, [item.key]: e.target.value })}
                          style={{
                            width: '100%',
                            minHeight: '90px',
                            borderRadius: '12px',
                            border: '1px solid var(--card-border)',
                            background: 'rgba(0,0,0,0.15)',
                            color: 'var(--text-primary)',
                            padding: '12px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            lineHeight: '1.4'
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab content: PROFILE */}
        {activeTab === 'profile' && profile && (
          <form onSubmit={handleSaveProfile} className="card animate-fade-in">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-address-card" /> Informasi &amp; Profil Koryandik
              </h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="vision">Visi Koryandik</label>
                <textarea
                  id="vision"
                  value={profile.vision}
                  onChange={(e) => setProfile({ ...profile, vision: e.target.value })}
                  className="form-input"
                  style={{ minHeight: '80px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Misi Koryandik</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={newMission}
                    onChange={(e) => setNewMission(e.target.value)}
                    placeholder="Tulis poin misi baru..."
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (!newMission.trim()) return;
                      setProfile({ ...profile, mission: [...profile.mission, newMission.trim()] });
                      setNewMission('');
                    }}
                  >
                    Tambah
                  </button>
                </div>
                <ul
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: 0,
                    margin: 0,
                    listStyle: 'none'
                  }}
                >
                  {profile.mission.map((m, idx) => (
                    <li key={idx} className="mission-list-item">
                      <span>{m}</span>
                      <button
                        type="button"
                        className="mission-delete-btn"
                        onClick={() =>
                          setProfile({ ...profile, mission: profile.mission.filter((_, i) => i !== idx) })
                        }
                        title="Hapus poin misi"
                      >
                        <i className="fa-solid fa-times" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '8px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Dinas</label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Telepon/WhatsApp</label>
                  <input
                    type="text"
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="address">Alamat Sekretariat</label>
                <input
                  type="text"
                  id="address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="lat">Latitude (Koordinat)</label>
                  <input
                    type="number"
                    step="0.00000000001"
                    id="lat"
                    value={profile.lat}
                    onChange={(e) => setProfile({ ...profile, lat: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lng">Longitude (Koordinat)</label>
                  <input
                    type="number"
                    step="0.00000000001"
                    id="lng"
                    value={profile.lng}
                    onChange={(e) => setProfile({ ...profile, lng: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                disabled={savingProfile}
              >
                {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        )}

        {/* Tab content: FAQ */}
        {activeTab === 'faqs' && (
          <div className="animate-fade-in">
            {/* Form Editor FAQ */}
            {editingFaq ? (
              <form onSubmit={handleAddOrUpdateFaq} className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h2>{editingFaq.id ? 'Edit Pertanyaan FAQ' : 'Tambah FAQ Baru'}</h2>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingFaq(null)}>
                    Batal
                  </button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="faq-question">Pertanyaan</label>
                    <input
                      type="text"
                      id="faq-question"
                      value={editingFaq.question || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                      placeholder="Masukkan pertanyaan..."
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="faq-answer">Jawaban</label>
                    <textarea
                      id="faq-answer"
                      value={editingFaq.answer || ''}
                      onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                      placeholder="Masukkan jawaban lengkap. Tips: gunakan ${schoolCount} untuk render dinamis jumlah sekolah."
                      className="form-input"
                      style={{ minHeight: '100px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="faq-category">Kategori</label>
                      <select
                        id="faq-category"
                        value={editingFaq.category || ''}
                        onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                        className="form-input"
                        required
                      >
                        <option value="">-- Pilih Kategori --</option>
                        <option value="Umum">Umum</option>
                        <option value="Penggunaan">Penggunaan</option>
                        <option value="Teknis">Teknis</option>
                        <option value="Gugus">Gugus</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Pilih Ikon</label>
                      <IconPicker
                        value={editingFaq.icon || ''}
                        onChange={(icon) => setEditingFaq({ ...editingFaq, icon })}
                        placeholder="Pilih ikon untuk FAQ"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingFaq}>
                    {savingFaq ? 'Menyimpan...' : 'Simpan FAQ'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="card">
                <div
                  className="card-header"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h2>Daftar FAQ Publik</h2>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingFaq({})}>
                    + Tambah FAQ
                  </button>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Kategori</th>
                          <th>Pertanyaan</th>
                          <th>Kunci Icon</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqs.map((faq) => (
                          <tr key={faq.id}>
                            <td>
                              <span className="badge">{faq.category}</span>
                            </td>
                            <td>
                              <strong>{faq.question}</strong>
                              <p
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-secondary)',
                                  margin: '4px 0 0',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '450px'
                                }}
                              >
                                {faq.answer}
                              </p>
                            </td>
                            <td>
                              <code>{faq.icon}</code>
                            </td>
                            <td>
                               <div style={{ display: 'flex', gap: '8px' }}>
                                 <button
                                   type="button"
                                   className="btn btn-outline btn-xs"
                                   onClick={() => setEditingFaq(faq)}
                                 >
                                   <i className="fa-solid fa-pen-to-square"></i> Edit
                                 </button>
                                 <button
                                   type="button"
                                   className="btn btn-danger btn-xs"
                                   onClick={() => handleDeleteFaq(faq.id)}
                                 >
                                   <i className="fa-solid fa-trash"></i> Hapus
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab content: DOWNLOADS */}
        {activeTab === 'downloads' && (
          <div className="animate-fade-in">
            {editingDownload ? (
              <form onSubmit={handleAddOrUpdateDownload} className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h2>{editingDownload.id ? 'Edit Berkas Unduhan' : 'Tambah Berkas Baru'}</h2>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingDownload(null)}>
                    Batal
                  </button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="dl-title">Nama Dokumen</label>
                    <input
                      type="text"
                      id="dl-title"
                      value={editingDownload.title || ''}
                      onChange={(e) => setEditingDownload({ ...editingDownload, title: e.target.value })}
                      placeholder="Contoh: Format Laporan Bulanan Sekolah..."
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="dl-description">Keterangan / Deskripsi</label>
                    <input
                      type="text"
                      id="dl-description"
                      value={editingDownload.description || ''}
                      onChange={(e) => setEditingDownload({ ...editingDownload, description: e.target.value })}
                      placeholder="Deskripsi singkat dokumen..."
                      className="form-input"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-category">Kategori</label>
                      <select
                        id="dl-category"
                        value={editingDownload.category || ''}
                        onChange={(e) => setEditingDownload({ ...editingDownload, category: e.target.value as 'surat' | 'format' | 'sk' })}
                        className="form-input"
                        required
                      >
                        <option value="">-- Pilih --</option>
                        <option value="surat">Surat Undangan</option>
                        <option value="format">Format Berkas</option>
                        <option value="sk">SK &amp; Dokumen Resmi</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-type">Ekstensi File</label>
                      <select
                        id="dl-type"
                        value={editingDownload.fileType || ''}
                        onChange={(e) => setEditingDownload({ ...editingDownload, fileType: e.target.value as 'PDF' | 'DOCX' | 'XLSX' })}
                        className="form-input"
                        required
                      >
                        <option value="">-- Pilih --</option>
                        <option value="PDF">PDF</option>
                        <option value="DOCX">DOCX</option>
                        <option value="XLSX">XLSX</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-size">Ukuran File</label>
                      <input
                        type="text"
                        id="dl-size"
                        value={editingDownload.fileSize || ''}
                        onChange={(e) => setEditingDownload({ ...editingDownload, fileSize: e.target.value })}
                        placeholder="Contoh: 312 KB"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-version">Versi Dokumen</label>
                      <input
                        type="text"
                        id="dl-version"
                        value={editingDownload.version || '1.0'}
                        onChange={(e) => setEditingDownload({ ...editingDownload, version: e.target.value })}
                        placeholder="Contoh: 1.0"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-status">Status Regulasi</label>
                      <select
                        id="dl-status"
                        value={editingDownload.status || 'active'}
                        onChange={(e) => setEditingDownload({ ...editingDownload, status: e.target.value as 'active' | 'deprecated' })}
                        className="form-input"
                      >
                        <option value="active">Aktif</option>
                        <option value="deprecated">Kedaluwarsa (Deprecated)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-count">Total Diunduh (Kali)</label>
                      <input
                        type="number"
                        id="dl-count"
                        value={editingDownload.downloadCount ?? 0}
                        onChange={(e) => setEditingDownload({ ...editingDownload, downloadCount: parseInt(e.target.value) || 0 })}
                        className="form-input"
                        min={0}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="dl-url">Link Unduh (Google Drive/Lainnya)</label>
                      <input
                        type="text"
                        id="dl-url"
                        value={editingDownload.downloadUrl || ''}
                        onChange={(e) => setEditingDownload({ ...editingDownload, downloadUrl: e.target.value })}
                        placeholder="https://drive.google.com/..."
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Pilih Ikon</label>
                      <IconPicker
                        value={editingDownload.icon || ''}
                        onChange={(icon) => setEditingDownload({ ...editingDownload, icon })}
                        placeholder="Pilih ikon untuk dokumen"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="dl-preview">Link Preview (Opsional - untuk Google Docs/Drive)</label>
                    <input
                      type="text"
                      id="dl-preview"
                      value={editingDownload.previewUrl || ''}
                      onChange={(e) => setEditingDownload({ ...editingDownload, previewUrl: e.target.value })}
                      placeholder="https://docs.google.com/document/d/.../preview"
                      className="form-input"
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Kosongkan untuk auto-generate dari link unduh
                    </small>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingDownload}>
                    {savingDownload ? 'Menyimpan...' : 'Simpan Berkas'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="card">
                <div
                  className="card-header"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h2>Manajemen Dokumen Unduhan</h2>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingDownload({})}>
                    + Tambah Berkas
                  </button>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Dokumen</th>
                          <th>Kategori</th>
                          <th>Versi</th>
                          <th>Status</th>
                          <th>Unduhan</th>
                          <th>Ukuran</th>
                          <th>Tipe</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {downloads.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.title}</strong>
                              <p
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-secondary)',
                                  margin: '2px 0 0',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '300px'
                                }}
                              >
                                {item.description}
                              </p>
                            </td>
                            <td>
                              <span 
                                className="badge"
                                style={{
                                  background: item.category === 'surat' ? 'var(--primary-glow)' : item.category === 'format' ? 'var(--accent-glow)' : 'rgba(245, 158, 11, 0.15)',
                                  color: item.category === 'surat' ? 'var(--primary)' : item.category === 'format' ? 'var(--accent)' : '#f59e0b'
                                }}
                              >
                                {item.category === 'surat' ? 'Surat' : item.category === 'format' ? 'Format' : 'SK'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>v{item.version || '1.0'}</span>
                            </td>
                            <td>
                              <span 
                                className="badge"
                                style={{
                                  background: (item.status || 'active') === 'active' ? 'var(--success-glow)' : 'var(--danger-glow)',
                                  color: (item.status || 'active') === 'active' ? 'var(--success)' : 'var(--danger)'
                                }}
                              >
                                {(item.status || 'active') === 'active' ? 'Aktif' : 'Deprecated'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--success)' }}>
                                <i className="fa-solid fa-download" style={{ marginRight: '4px' }} />
                                {item.downloadCount || 0}x
                              </span>
                            </td>
                            <td>{item.fileSize}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background:
                                    item.fileType === 'PDF'
                                      ? '#ef444415'
                                      : item.fileType === 'XLSX'
                                      ? '#10b98115'
                                      : '#3b82f615',
                                  color:
                                    item.fileType === 'PDF'
                                      ? '#ef4444'
                                      : item.fileType === 'XLSX'
                                      ? '#10b981'
                                      : '#3b82f6'
                                }}
                              >
                                {item.fileType}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs"
                                  onClick={() => setEditingDownload(item)}
                                >
                                  <i className="fa-solid fa-pen-to-square"></i> Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-xs"
                                  onClick={() => handleDeleteDownload(item.id)}
                                >
                                  <i className="fa-solid fa-trash"></i> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab content: SUPERVISORS */}
        {activeTab === 'supervisors' && (
          <div className="card animate-fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2>
                <i className="fa-solid fa-user-tie" /> Kelola Pengawas &amp; Pejabat
              </h2>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setEditingSupervisor({ role: 'pengawas', wilayah: 'Kecamatan Cibadak' })}
              >
                <i className="fa-solid fa-plus" /> Tambah Pengawas
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Supervisor Editor Form */}
              {editingSupervisor && (
                <form
                  onSubmit={handleAddOrUpdateSupervisor}
                  style={{
                    background: 'var(--card-glass)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                    <i className="fa-solid fa-user-pen" style={{ marginRight: '8px' }} />
                    {editingSupervisor.id ? 'Edit Pengawas' : 'Tambah Pengawas Baru'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-name">Nama Lengkap *</label>
                      <input
                        id="sup-name"
                        className="form-input"
                        value={editingSupervisor.name || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, name: e.target.value })}
                        placeholder="Contoh: AHMAD YANI, S.Pd"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-nip">NIP</label>
                      <input
                        id="sup-nip"
                        className="form-input"
                        value={editingSupervisor.nip || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, nip: e.target.value })}
                        placeholder="196512151986031005"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-role">Peran *</label>
                      <select
                        id="sup-role"
                        className="form-input"
                        value={editingSupervisor.role || 'pengawas'}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, role: e.target.value as PengawasData['role'], title: ROLE_LABELS[e.target.value] || editingSupervisor.title || '' })}
                        required
                      >
                        <option value="pengawas">Pengawas Bina</option>
                        <option value="kkks">Ketua KKKS</option>
                        <option value="pgri">Ketua PGRI</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-title">Jabatan</label>
                      <input
                        id="sup-title"
                        className="form-input"
                        value={editingSupervisor.title || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, title: e.target.value })}
                        placeholder="Pengawas Sekolah"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-passcode">Kode Akses (Passcode) *</label>
                      <input
                        id="sup-passcode"
                        className="form-input"
                        value={editingSupervisor.passcode || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, passcode: e.target.value })}
                        placeholder="Kode login pengawas"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-wilayah">Wilayah Binaan</label>
                      <input
                        id="sup-wilayah"
                        className="form-input"
                        value={editingSupervisor.wilayah || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, wilayah: e.target.value })}
                        placeholder="Kecamatan Cibadak"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-phone">No. Telepon</label>
                      <input
                        id="sup-phone"
                        className="form-input"
                        value={editingSupervisor.phone || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, phone: e.target.value })}
                        placeholder="+6281234567890"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sup-photo">URL Foto</label>
                      <input
                        id="sup-photo"
                        className="form-input"
                        value={editingSupervisor.photoUrl || ''}
                        onChange={(e) => setEditingSupervisor({ ...editingSupervisor, photoUrl: e.target.value })}
                        placeholder="/pengawas.png"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingSupervisor(null)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={savingSupervisor}>
                      {savingSupervisor ? 'Menyimpan...' : editingSupervisor.id ? 'Perbarui' : 'Tambah'}
                    </button>
                  </div>
                </form>
              )}

              {/* Supervisors Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Peran</th>
                      <th>NIP</th>
                      <th>Kode Akses</th>
                      <th>Wilayah</th>
                      <th>Telepon</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisors.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                style={{ width: 32, height: 32, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--card-border)' }}
                              />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                                {item.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <strong style={{ fontSize: '13px' }}>{item.name}</strong>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{item.title}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background:
                                item.role === 'admin' ? '#ef444420' :
                                item.role === 'pengawas' ? '#3b82f620' :
                                item.role === 'kkks' ? '#f59e0b20' :
                                '#10b98120',
                              color:
                                item.role === 'admin' ? '#ef4444' :
                                item.role === 'pengawas' ? '#3b82f6' :
                                item.role === 'kkks' ? '#f59e0b' :
                                '#10b981'
                            }}
                          >
                            {ROLE_LABELS[item.role] || item.role}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{item.nip}</td>
                        <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{item.passcode}</td>
                        <td style={{ fontSize: '12px' }}>{item.wilayah}</td>
                        <td style={{ fontSize: '12px' }}>{item.phone || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-xs"
                              onClick={() => setEditingSupervisor(item)}
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => handleDeleteSupervisor(item.id)}
                            >
                              <i className="fa-solid fa-trash"></i> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {supervisors.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                          <i className="fa-solid fa-user-slash" style={{ fontSize: '24px', opacity: 0.4, marginBottom: '8px', display: 'block' }} />
                          Belum ada data pengawas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab content: RELATED LINKS */}
        {activeTab === 'links' && (
          <div className="animate-fade-in">
            {editingLink ? (
              <form
                onSubmit={handleAddOrUpdateLink}
                className="card"
                style={{ marginBottom: '24px' }}
              >
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>{editingLink.id ? 'Edit Tautan' : 'Tambah Tautan Baru'}</h2>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingLink(null)}>
                    Batal
                  </button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="link-title">Judul Tautan</label>
                    <input
                      type="text"
                      id="link-title"
                      className="form-input"
                      placeholder="Dapodik Kemdikbud"
                      value={editingLink.title || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="link-url">URL Tautan</label>
                    <input
                      type="url"
                      id="link-url"
                      className="form-input"
                      placeholder="https://dapodik.kemdikbud.go.id/"
                      value={editingLink.url || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="link-description">Deskripsi</label>
                    <textarea
                      id="link-description"
                      className="form-input"
                      rows={2}
                      placeholder="Portal Data Pokok Pendidikan Nasional"
                      value={editingLink.description || ''}
                      onChange={(e) => setEditingLink({ ...editingLink, description: e.target.value })}
                      style={{ resize: 'vertical' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="link-category">Kategori</label>
                      <select
                        id="link-category"
                        className="form-input"
                        value={editingLink.category || 'pendidikan'}
                        onChange={(e) => setEditingLink({ ...editingLink, category: e.target.value as 'pendidikan' | 'layanan' | 'referensi' | 'lainnya' })}
                        required
                      >
                        <option value="pendidikan">Pendidikan</option>
                        <option value="layanan">Layanan</option>
                        <option value="referensi">Referensi</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="link-target">Target</label>
                      <select
                        id="link-target"
                        className="form-input"
                        value={editingLink.target || '_blank'}
                        onChange={(e) => setEditingLink({ ...editingLink, target: e.target.value as '_blank' | '_self' })}
                      >
                        <option value="_blank">Tab Baru</option>
                        <option value="_self">Tab Saat Ini</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Pilih Ikon</label>
                      <IconPicker
                        value={editingLink.icon || ''}
                        onChange={(icon) => setEditingLink({ ...editingLink, icon })}
                        placeholder="Pilih ikon untuk tautan"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="link-order">Urutan</label>
                      <input
                        type="number"
                        id="link-order"
                        className="form-input"
                        min="1"
                        value={editingLink.order || relatedLinks.length + 1}
                        onChange={(e) => setEditingLink({ ...editingLink, order: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={editingLink.isActive !== undefined ? editingLink.isActive : true}
                        onChange={(e) => setEditingLink({ ...editingLink, isActive: e.target.checked })}
                        style={{ width: 'auto' }}
                      />
                      Aktifkan tautan
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingLink}>
                    {savingLink ? 'Menyimpan...' : 'Simpan Tautan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Manajemen Tautan Terkait</h2>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setEditingLink({})}
                  >
                    + Tambah Tautan
                  </button>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Judul</th>
                          <th>URL</th>
                          <th>Kategori</th>
                          <th>Status</th>
                          <th>Urutan</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatedLinks
                          .sort((a, b) => a.order - b.order)
                          .map((link) => {
                            const catLabels: Record<string, { label: string; color: string }> = {
                              pendidikan: { label: 'Pendidikan', color: '#3b82f6' },
                              layanan: { label: 'Layanan', color: '#10b981' },
                              referensi: { label: 'Referensi', color: '#f59e0b' },
                              lainnya: { label: 'Lainnya', color: '#8b5cf6' }
                            };
                            const cat = catLabels[link.category] || { label: link.category, color: 'var(--text-secondary)' };
                            return (
                              <tr key={link.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className={`${link.icon.includes('google') || link.icon.includes('youtube') || link.icon.includes('facebook') || link.icon.includes('instagram') || link.icon.includes('twitter') || link.icon.includes('whatsapp') ? 'fa-brands' : 'fa-solid'} ${link.icon}`} style={{ fontSize: '14px', color: 'var(--primary)' }} />
                                    <strong style={{ fontSize: '13px' }}>{link.title}</strong>
                                  </div>
                                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {link.description}
                                  </p>
                                </td>
                                <td style={{ fontSize: '11px', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                    {link.url}
                                  </a>
                                </td>
                                <td>
                                  <span style={{ fontSize: '10px', fontWeight: 800, background: `${cat.color}20`, color: cat.color, padding: '2px 8px', borderRadius: '6px' }}>
                                    {cat.label}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '10px', fontWeight: 800, background: link.isActive ? 'var(--success-glow)' : 'var(--danger-glow)', color: link.isActive ? 'var(--success)' : 'var(--danger)', padding: '2px 8px', borderRadius: '6px' }}>
                                    {link.isActive ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '12px' }}>{link.order}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-xs"
                                      onClick={() => setEditingLink({ ...link })}
                                    >
                                      <i className="fa-solid fa-pen-to-square"></i> Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-xs"
                                      onClick={() => handleDeleteLink(link.id)}
                                    >
                                      <i className="fa-solid fa-trash"></i> Hapus
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {relatedLinks.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                              <i className="fa-solid fa-link-slash" style={{ fontSize: '24px', opacity: 0.4, marginBottom: '8px', display: 'block' }} />
                              Belum ada tautan terdaftar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
