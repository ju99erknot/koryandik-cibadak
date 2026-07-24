'use client';

import React, { useState, useEffect } from 'react';
import { getCategories, updateCategory, addCategory, deleteCategory } from '@/lib/db';
import type { Category } from '@/lib/schoolsData';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';

const AVAILABLE_ICONS = [
  { class: 'fa-solid fa-file-pdf', name: 'PDF' },
  { class: 'fa-solid fa-file-excel', name: 'Excel / Sheet' },
  { class: 'fa-solid fa-file-word', name: 'Word / Doc' },
  { class: 'fa-solid fa-file-lines', name: 'Laporan' },
  { class: 'fa-solid fa-file-signature', name: 'SPJ / Ttd' },
  { class: 'fa-solid fa-graduation-cap', name: 'Siswa' },
  { class: 'fa-solid fa-school', name: 'Sekolah' },
  { class: 'fa-solid fa-user-tie', name: 'Kepsek / Guru' },
  { class: 'fa-solid fa-wallet', name: 'Keuangan / BOS' },
  { class: 'fa-solid fa-chart-line', name: 'Grafik' },
  { class: 'fa-solid fa-calendar-days', name: 'Kalender' },
  { class: 'fa-solid fa-book', name: 'Kurikulum' },
  { class: 'fa-solid fa-stamp', name: 'Stempel' },
  { class: 'fa-solid fa-award', name: 'Sertifikat' },
  { class: 'fa-solid fa-chalkboard-user', name: 'Guru Kelas' },
  { class: 'fa-solid fa-building-columns', name: 'Dinas / Pemda' }
];

export default function AdminCategories() {
  const { user, loading, logout } = useAuth('admin');
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal States
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form States
  const [formData, setFormData] = useState<Partial<Category>>({
    id: '',
    name: '',
    description: '',
    icon: 'fa-solid fa-file-lines',
    deadline: 'Setiap akhir bulan'
  });

  const loadCategories = () => {
    getCategories().then(setCategories);
  };

  useEffect(() => {
    if (loading || !user) return;
    loadCategories();
  }, [loading, user]);

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData(cat);
  };

  const handleOpenAdd = () => {
    setIsAddModalOpen(true);
    setFormData({
      id: 'cat_' + Math.random().toString(36).slice(2, 7),
      name: '',
      description: '',
      icon: 'fa-solid fa-file-lines',
      deadline: 'Setiap akhir bulan'
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const updated = await updateCategory(editingCategory.id, formData);
    if (updated) {
      toast.success(`Kategori ${formData.name} berhasil diperbarui!`);
      setEditingCategory(null);
      loadCategories();
    } else {
      toast.error('Gagal memperbarui kategori berkas.');
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nama kategori wajib diisi!');
      return;
    }

    await addCategory(formData as Category);
    toast.success(`Kategori baru ${formData.name} berhasil ditambahkan!`);
    setIsAddModalOpen(false);
    loadCategories();
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Kategori Berkas',
      message: `Apakah Anda yakin ingin menghapus kategori "${name}"? Seluruh berkas yang terhubung dengan kategori ini di sekolah-sekolah juga akan dinonaktifkan.`,
      variant: 'danger',
    });
    if (confirmed) {
      await deleteCategory(id);
      toast.success(`Kategori "${name}" berhasil dihapus.`);
      loadCategories();
    }
  };

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Kategori Berkas Wajib"
      headerSubtitle="Pengaturan kategori rekapitulasi berkas pendidikan Kecamatan Cibadak"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          {/* Categories card */}
          <div className="card animate-fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2><i className="fa-solid fa-folder-open"></i> Daftar Kategori Wajib</h2>
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                <i className="fa-solid fa-plus"></i> Tambah Kategori
              </button>
            </div>
            
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Icon</th>
                      <th>Nama Kategori</th>
                      <th>Keterangan</th>
                      <th>Batas Waktu / Target</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, idx) => (
                      <tr key={cat.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <i className={cat.icon}></i>
                          </div>
                        </td>
                        <td><strong>{cat.name}</strong></td>
                        <td><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cat.description}</span></td>
                        <td>
                          {cat.deadline === 'Bulanan' && <span className="badge badge-warning">Bulanan</span>}
                          {cat.deadline === 'Triwulanan' && <span className="badge badge-success">Triwulanan</span>}
                          {cat.deadline?.includes('Tahapan') && <span className="badge badge-pending">Tahapan</span>}
                          {cat.deadline === 'Tahunan' && <span className="badge badge-primary">Tahunan</span>}
                          {!['Bulanan', 'Triwulanan', 'Tahunan'].includes(cat.deadline || '') && !cat.deadline?.includes('Tahapan') && (
                            <span className="badge badge-pending">{cat.deadline || 'Bulanan'}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-outline btn-xs" 
                              onClick={() => handleOpenEdit(cat)}
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-xs" 
                              onClick={() => handleDelete(cat.id, cat.name)}
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
        </div>
    </DashboardShell>

      {/* Edit / Add Modal */}
      {(editingCategory || isAddModalOpen) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            onClick={() => { setEditingCategory(null); setIsAddModalOpen(false); }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} 
          />
          <div 
            className="card modal-card animate-fade-in" 
            style={{ 
              position: 'relative', 
              width: '90%', 
              maxWidth: '500px', 
              border: '1px solid var(--card-border)', 
              borderRadius: '20px',
              zIndex: 1
            }}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{isAddModalOpen ? 'Tambah Kategori Berkas' : 'Edit Kategori Berkas'}</h3>
              <button 
                onClick={() => { setEditingCategory(null); setIsAddModalOpen(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={isAddModalOpen ? handleSaveAdd : handleSaveEdit}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Nama Kategori Berkas</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Contoh: Laporan SPJ Dana BOS"
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Deskripsi / Keterangan</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    required
                    placeholder="Keterangan mengenai berkas yang wajib diunggah..."
                    value={formData.description || ''} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Pilih Ikon Berkas</label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '8px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    padding: '10px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--card-border)',
                    maxHeight: '160px',
                    overflowY: 'auto'
                  }}>
                    {AVAILABLE_ICONS.map(ico => {
                      const isSelected = formData.icon === ico.class;
                      return (
                        <button
                          key={ico.class}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: ico.class })}
                          style={{
                            background: isSelected ? 'var(--primary-glow)' : 'transparent',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid transparent',
                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                            borderRadius: '8px',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={ico.name}
                        >
                          <i className={ico.class} style={{ fontSize: '16px' }}></i>
                          <span style={{ fontSize: '9px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', textAlign: 'center' }}>{ico.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Target / Batas Waktu (Deadline)</label>
                  <select 
                    className="form-control" 
                    value={formData.deadline || 'Bulanan'} 
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  >
                    <option value="Bulanan">Bulanan (Setiap Akhir Bulan)</option>
                    <option value="Triwulanan">Triwulanan (Setiap 3 Bulan)</option>
                    <option value="Tahapan (BOS)">Tahapan (Per Tahap BOS)</option>
                    <option value="Tahunan">Tahunan (Sekali Setahun)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ flex: 1 }} 
                    onClick={() => { setEditingCategory(null); setIsAddModalOpen(false); }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Simpan Kategori
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
