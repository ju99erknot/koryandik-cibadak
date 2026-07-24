'use client';

import React, { useState, useEffect } from 'react';
import { getSchools, updateSchool, addSchool, deleteSchool, getAllPresence, getSubmissions } from '@/lib/db';
import type { OnlinePresence, Submission } from '@/lib/db';
import type { School } from '@/lib/schoolsData';
import CommandPalette from '@/components/CommandPalette';
import FancySelect from '@/components/FancySelect';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { toggleThemeWithTransition } from '@/lib/theme';
import DistrictMap from '@/components/DistrictMap';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';
import { getGugusColor } from '@/lib/gugusThemes';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

export default function AdminSchools() {
  const { user, loading, logout } = useAuth('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGugus, setFilterGugus] = useState('all');
  const [schools, setSchools] = useState<School[]>([]);
  const [presence, setPresence] = useState<OnlinePresence[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Modal States
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrSchool, setQrSchool] = useState<School | null>(null);

  // Form states for adding/editing
  const [formData, setFormData] = useState<Partial<School>>({
    npsn: '',
    name: '',
    level: 'SD',
    address: '',
    gugus: 'I',
    principalName: '',
    operatorName: '',
    studentCount: 0,
    teacherCount: 0,
    lat: -6.8950,
    lng: 106.7900,
    ksPhone: '',
    operatorPhone: '',
    accreditation: 'B',
    status: 'Negeri'
  });

  const loadSchools = () => {
    getSchools().then(setSchools);
    getAllPresence().then(setPresence);
    getSubmissions().then(setSubmissions);
  };

  useEffect(() => {
    if (loading || !user) return;
    loadSchools();
  }, [loading, user]);

  const handleOpenEdit = (school: School) => {
    setEditingSchool(school);
    setFormData(school);
  };

  const handleOpenAdd = () => {
    setIsAddModalOpen(true);
    setFormData({
      npsn: '',
      name: '',
      level: 'SD',
      address: '',
      gugus: 'I',
      principalName: '',
      operatorName: '',
      studentCount: 0,
      teacherCount: 0,
      lat: -6.8950,
      lng: 106.7900,
      ksPhone: '',
      operatorPhone: '',
      accreditation: 'B',
      status: 'Negeri'
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    const updated = await updateSchool(editingSchool.npsn, formData);
    if (updated) {
      toast.success(`Data sekolah ${formData.name} berhasil diperbarui!`);
      setEditingSchool(null);
      loadSchools();
    } else {
      toast.error('Gagal memperbarui data sekolah.');
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.npsn || !formData.name) {
      toast.error('NPSN dan Nama Sekolah wajib diisi!');
      return;
    }

    // Check if NPSN already exists
    const exists = schools.some(s => s.npsn === formData.npsn);
    if (exists) {
      toast.error(`Sekolah dengan NPSN ${formData.npsn} sudah terdaftar!`);
      return;
    }

    await addSchool(formData as School);
    toast.success(`Sekolah ${formData.name} berhasil ditambahkan!`);
    setIsAddModalOpen(false);
    loadSchools();
  };

  const handleDeleteSchool = async (npsn: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Sekolah',
      message: `Apakah Anda yakin ingin menghapus sekolah "${name}"? Semua data pengiriman berkas yang berkaitan dengan sekolah ini juga kemungkinan akan terdampak.`,
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteSchool(npsn);
      toast.success(`Sekolah ${name} berhasil dihapus.`);
      loadSchools();
    } catch {
      toast.error('Gagal menghapus sekolah.');
    }
  };

  // Filter logic
  const filteredSchools = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.npsn.includes(searchTerm);
    const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
    return matchSearch && matchGugus;
  });

  const totalStudents = schools.reduce((acc, s) => acc + (s.studentCount || 0), 0);
  const totalTeachers = schools.reduce((acc, s) => acc + (s.teacherCount || 0), 0);

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Kelola Sekolah Binaan"
      headerSubtitle="Daftar Lembaga Pendidikan di Wilayah Kerja Kecamatan Cibadak"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <i className="fa-solid fa-school"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{schools.length}</span>
                <span className="stat-label">Total Sekolah</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalStudents.toLocaleString('id-ID')}</span>
                <span className="stat-label">Total Siswa Binaan</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalTeachers.toLocaleString('id-ID')}</span>
                <span className="stat-label">Total Guru Aktif</span>
              </div>
            </div>
          </div>

          {/* District Map with Admin Edit Coordinates Mode */}
          <div style={{ marginBottom: '24px' }}>
            <DistrictMap isAdminMode={true} />
          </div>

          {/* School List card */}
          <div className="card animate-fade-in">
            <div className="card-header flex-col md:flex-row gap-4" style={{ alignItems: 'stretch' }}>
              <h2 style={{ display: 'flex', alignItems: 'center' }}><i className="fa-solid fa-list-check" style={{ marginRight: '8px' }}></i> Daftar Lembaga</h2>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                <div className="input-with-icon" style={{ flex: 1, minWidth: '220px' }}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari sekolah atau NPSN..."
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

                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    const printWin = window.open('', '_blank');
                    if (!printWin) return;

                    // Generate QR codes for all schools first
                    const qrPromises = filteredSchools.map(async s => {
                      const url = window.location.origin + '/?school=' + s.npsn;
                      const dataUrl = await QRCode.toDataURL(url, { width: 130, margin: 1 });
                      return { ...s, qrDataUrl: dataUrl };
                    });
                    const schoolsWithQr = await Promise.all(qrPromises);

                    const qrElements = schoolsWithQr.map(s => `
                      <div style="display:inline-block; text-align:center; margin:24px; padding:16px; border:1px solid #ddd; border-radius:12px; width:180px; page-break-inside:avoid; font-family:sans-serif;">
                        <h4 style="margin:0 0 8px; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.name}</h4>
                        <img src="${s.qrDataUrl}" alt="QR Code ${s.npsn}" style="width:130px; height:130px; background:#fff; padding:10px; border-radius:8px; display:inline-block;" />
                        <div style="margin-top:8px; font-size:11px; font-weight:bold; color:#555;">NPSN: ${s.npsn}</div>
                      </div>
                    `).join('');

                    printWin.document.write(`
                      <html>
                        <head>
                          <title>Cetak QR Code Koryandik</title>
                          <style>
                            @media print {
                              body { background: #fff; color: #000; }
                              .no-print { display: none; }
                            }
                          </style>
                        </head>
                        <body style="padding:20px; font-family:sans-serif; background:#f9f9f9; color:#333; display:flex; flex-direction:column; align-items:center;">
                          <div class="no-print" style="width:100%; max-width:800px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding:12px; background:#fff; border:1px solid #ddd; border-radius:8px;">
                            <span>Siap mencetak <strong>${filteredSchools.length}</strong> QR Code Sekolah.</span>
                            <button onclick="window.print()" style="background:#3b82f6; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Cetak Sekarang</button>
                          </div>
                          <h2 style="margin:10px 0 20px; text-align:center;">QR Code Portal Login Sekolah</h2>
                          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px; max-width:900px;">
                            ${qrElements}
                          </div>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-qrcode"></i> Cetak QR Massal
                </button>

                <button className="btn btn-primary" onClick={handleOpenAdd}>
                  <i className="fa-solid fa-plus"></i> Tambah Sekolah
                </button>
              </div>
            </div>
            
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Sekolah</th>
                      <th>NPSN</th>
                      <th>Gugus</th>
                      <th>Kepala Sekolah</th>
                      <th>Operator</th>
                      <th>Aktivitas & Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map(school => {
                      const color = getGugusColor(school.gugus);
                      
                      return (
                      <tr key={school.npsn}>
                        <td><strong>{school.name}</strong> <span className="badge badge-pending" style={{ fontSize: '9px', padding: '2px 6px' }}>{school.level}</span></td>
                        <td><code>{school.npsn}</code></td>
                        <td><span className="badge" style={{ background: `${color}15`, color: color, border: `1px solid ${color}30` }}>Gugus {school.gugus}</span></td>
                        <td>
                          <div>{school.principalName || '—'}</div>
                          {school.ksPhone && (
                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(school.ksPhone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 600 }}
                            >
                              <i className="fa-brands fa-whatsapp" /> {school.ksPhone}
                            </a>
                          )}
                        </td>
                        <td>
                          <div>{school.operatorName || '—'}</div>
                          {school.operatorPhone && (
                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(school.operatorPhone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 600 }}
                            >
                              <i className="fa-brands fa-whatsapp" /> {school.operatorPhone}
                            </a>
                          )}
                        </td>
                        <td>
                          <small>Siswa: <strong>{school.studentCount}</strong></small>
                          <br />
                          <small>Guru: <strong>{school.teacherCount}</strong></small>
                        </td>
                        <td>
                          {(() => {
                            // Find presence
                            const schoolPresence = presence.find(p => p.npsn === school.npsn);
                            const isOnline = schoolPresence && schoolPresence.page !== 'Offline' && (new Date().getTime() - new Date(schoolPresence.lastSeen).getTime() < 120000);

                            // Find last submission
                            const schoolSubs = submissions
                              .filter(s => s.schoolNpsn === school.npsn)
                              .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                            const lastSub = schoolSubs[0];

                            // Relative time helper
                            const formatRelativeTime = (isoString: string) => {
                              const diffMs = new Date().getTime() - new Date(isoString).getTime();
                              const diffMin = Math.floor(diffMs / 60000);
                              const diffHrs = Math.floor(diffMin / 60);
                              const diffDays = Math.floor(diffHrs / 24);

                              if (diffMin < 1) return 'Baru saja';
                              if (diffMin < 60) return `${diffMin} mnt lalu`;
                              if (diffHrs < 24) return `${diffHrs} jam lalu`;
                              return `${diffDays} hari lalu`;
                            };

                            if (isOnline) {
                              const pageName = schoolPresence.page === '/school/dashboard' ? 'Dashboard' : schoolPresence.page === '/school/profile' ? 'Profil' : schoolPresence.page === '/school/receipt' ? 'Tanda Terima' : 'Aktif';
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: '600' }} title={`Sedang aktif di halaman ${pageName}`}>
                                  <span className="live-dot" style={{ margin: 0 }} title="Aktif"></span> Aktif
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                    ({pageName})
                                  </span>
                                </div>
                              );
                            } else if (schoolPresence) {
                              const localDateTime = new Date(schoolPresence.lastSeen).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '11px' }} title={`Terakhir aktif pada: ${localDateTime}`}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }}></span>
                                  Offline ({formatRelativeTime(schoolPresence.lastSeen)})
                                </div>
                              );
                            } else if (lastSub) {
                              const uploadDateTime = new Date(lastSub.submittedAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              return (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }} title={`Unggah berkas terakhir: ${uploadDateTime}`}>
                                  <i className="fa-solid fa-file-arrow-up" style={{ color: 'var(--primary)' }}></i>
                                  Unggah: {formatRelativeTime(lastSub.submittedAt)}
                                </div>
                              );
                            } else {
                              return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Belum ada aktivitas</span>;
                            }
                          })()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              className="btn btn-outline btn-xs" 
                              onClick={() => setQrSchool(school)}
                              title="QR Code"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <i className="fa-solid fa-qrcode"></i> QR
                            </button>
                            <button 
                              className="btn btn-outline btn-xs" 
                              onClick={() => handleOpenEdit(school)}
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-xs" 
                              onClick={() => handleDeleteSchool(school.npsn, school.name)}
                            >
                              <i className="fa-solid fa-trash"></i> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>

      {/* Edit / Add Modal */}
      {(editingSchool || isAddModalOpen) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            onClick={() => { setEditingSchool(null); setIsAddModalOpen(false); }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} 
          />
          <div 
            className="card modal-card animate-fade-in" 
            style={{ 
              position: 'relative', 
              width: '90%', 
              maxWidth: '600px', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              border: '1px solid var(--card-border)', 
              borderRadius: '20px',
              zIndex: 1
            }}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{isAddModalOpen ? 'Tambah Sekolah Baru' : 'Edit Data Sekolah'}</h3>
              <button 
                onClick={() => { setEditingSchool(null); setIsAddModalOpen(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={isAddModalOpen ? handleSaveAdd : handleSaveEdit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Nama Sekolah</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>NPSN (ID Unik)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      disabled={!isAddModalOpen}
                      value={formData.npsn || ''} 
                      onChange={(e) => setFormData({ ...formData, npsn: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <FancySelect
                      label="Jenjang"
                      size="sm"
                      value={formData.level || 'SD'}
                      onChange={(val) => setFormData({ ...formData, level: val as 'SD' | 'SMP' })}
                      options={[
                        { value: 'SD', label: 'SD (Sekolah Dasar)' },
                        { value: 'SMP', label: 'SMP (Sekolah Menengah Pertama)' },
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <FancySelect
                      label="Gugus"
                      size="sm"
                      value={formData.gugus || 'I'}
                      onChange={(val) => setFormData({ ...formData, gugus: val })}
                      icon="fa-solid fa-sitemap"
                      options={[
                        { value: 'I', label: 'Gugus I' },
                        { value: 'II', label: 'Gugus II' },
                        { value: 'III', label: 'Gugus III' },
                        { value: 'IV', label: 'Gugus IV' },
                        { value: 'V', label: 'Gugus V' },
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nama Kepala Sekolah</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.principalName || ''} 
                      onChange={(e) => setFormData({ ...formData, principalName: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Nama Operator Sekolah</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.operatorName || ''} 
                      onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Jumlah Siswa</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formData.studentCount || 0} 
                      onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Jumlah Guru</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formData.teacherCount || 0} 
                      onChange={(e) => setFormData({ ...formData, teacherCount: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Garis Lintang (Lat)</label>
                    <input 
                      type="number" 
                      step="0.000001" 
                      className="form-control" 
                      value={formData.lat || -6.8950} 
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Garis Bujur (Lng)</label>
                    <input 
                      type="number" 
                      step="0.000001" 
                      className="form-control" 
                      value={formData.lng || 106.7900} 
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>No. HP Kepala Sekolah (KS)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="+628xxxxxxx"
                      value={formData.ksPhone || ''} 
                      onChange={(e) => setFormData({ ...formData, ksPhone: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label>No. HP Operator Sekolah</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="+628xxxxxxx"
                      value={formData.operatorPhone || ''} 
                      onChange={(e) => setFormData({ ...formData, operatorPhone: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Alamat Lengkap</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    value={formData.address || ''} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                {/* Akreditasi & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div className="form-group">
                    <label><i className="fa-solid fa-certificate" style={{ marginRight: '6px', color: '#f59e0b' }}></i>Akreditasi</label>
                    <select className="form-control" value={formData.accreditation || 'B'} onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}>
                      <option value="A">Akreditasi A (Unggul)</option>
                      <option value="B">Akreditasi B (Baik)</option>
                      <option value="C">Akreditasi C (Cukup)</option>
                      <option value="Belum Terakreditasi">Belum Terakreditasi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-building-user" style={{ marginRight: '6px', color: '#10b981' }}></i>Status Sekolah</label>
                    <select className="form-control" value={formData.status || 'Negeri'} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="Negeri">Negeri</option>
                      <option value="Swasta">Swasta</option>
                    </select>
                  </div>
                </div>
                {/* Branding & Media Sosial */}
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '16px' }}>
                  <h3 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}><i className="fa-solid fa-palette" style={{ marginRight: '6px' }}></i>Branding & Media Sosial</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label><i className="fa-solid fa-globe" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>Website</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="https://sdn1cibadak.sch.id"
                        value={formData.website || ''} 
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label><i className="fa-brands fa-instagram" style={{ marginRight: '6px', color: '#E1306C' }}></i>Instagram</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="@sdn1cibadak"
                        value={formData.instagram || ''} 
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ flex: 1 }} 
                    onClick={() => { setEditingSchool(null); setIsAddModalOpen(false); }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrSchool && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-full)', background: 'var(--modal-backdrop)', backdropFilter: 'blur(var(--modal-blur))', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
          onClick={() => setQrSchool(null)}
        >
          <div className="modal-card" style={{ background: 'var(--bg-space)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px', maxWidth: '360px', width: '90%', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setQrSchool(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div style={{ marginBottom: '16px' }}>
              <i className="fa-solid fa-qrcode" style={{ fontSize: '24px', color: 'var(--accent)', marginBottom: '8px', display: 'block' }}></i>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--text-primary)' }}>{qrSchool.name}</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NPSN: {qrSchool.npsn}</span>
            </div>
            <div id="qr-code-container" style={{ background: '#fff', borderRadius: '12px', padding: '20px', display: 'inline-flex', marginBottom: '16px' }}>
              <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?school=${qrSchool.npsn}`} size={200} level="H" includeMargin={false} />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>Scan QR Code ini untuk membuka halaman login portal Koryandik</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { const svg = document.querySelector('#qr-code-container svg'); if (!svg) return; const svgData = new XMLSerializer().serializeToString(svg); const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400; const ctx = canvas.getContext('2d'); const img = new Image(); img.onload = () => { if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 400); ctx.drawImage(img, 0, 0, 400, 400); } const a = document.createElement('a'); a.download = `QR-${qrSchool.npsn}-${qrSchool.name.replace(/\s+/g, '_')}.png`; a.href = canvas.toDataURL('image/png'); a.click(); toast.success('QR Code berhasil diunduh!'); }; img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData))); }} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-download"></i> Unduh PNG
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { const printWin = window.open('', '_blank'); if (!printWin) return; const svg = document.querySelector('#qr-code-container svg'); if (!svg) return; const svgData = new XMLSerializer().serializeToString(svg); printWin.document.write(`<html><head><title>QR Code - ${qrSchool.name}</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif"><div style="text-align:center"><h2>${qrSchool.name}</h2><p>NPSN: ${qrSchool.npsn}</p><div>${svgData}</div><p style="margin-top:16px;color:#666;font-size:12px">Scan untuk membuka portal Koryandik</p></div></body></html>`); printWin.document.close(); setTimeout(() => printWin.print(), 500); }} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-print"></i> Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
