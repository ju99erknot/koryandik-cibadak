'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getGalleryItems, saveGalleryItems } from '@/lib/db';
import type { GalleryItem } from '@/lib/types';
import { GALLERY_CATEGORIES } from '@/lib/types';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';

type ViewMode = 'grid' | 'list';
type GalleryCat = GalleryItem['category'] | 'Semua';

const CAT_COLORS: Record<string, string> = {
  'Rapat Ops': '#3b82f6',
  'KKKS': '#8b5cf6',
  'Pelatihan': '#f59e0b',
  'Kunjungan': '#22c55e',
  'Upacara': '#ef4444',
  'Lainnya': '#6b7280',
};

const CAT_ICONS: Record<string, string> = {
  'Rapat Ops': 'fa-users-rectangle',
  'KKKS': 'fa-people-group',
  'Pelatihan': 'fa-chalkboard-user',
  'Kunjungan': 'fa-building-flag',
  'Upacara': 'fa-flag',
  'Lainnya': 'fa-ellipsis',
};

const ITEMS_PER_PAGE = 12;

/** Convert Google Drive sharing URLs to direct-renderable image URLs */
function toDirectImageUrl(url: string): string {
  if (!url) return url;
  // /file/d/FILE_ID/view...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  // /open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  // /uc?...id=FILE_ID
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (ucMatch) return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  return url;
}

export default function AdminGallery() {
  const { user, loading, logout } = useAuth('admin');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // UI states
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<GalleryCat>('Semua');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [editModal, setEditModal] = useState<Partial<GalleryItem> | null>(null);
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading || !user) return;
    getGalleryItems().then(items => {
      setGallery(items);
      setDataLoaded(true);
    });
  }, [loading, user]);

  // Filtered & searched items
  const filtered = useMemo(() => {
    let items = [...gallery];
    if (filterCat !== 'Semua') items = items.filter(i => i.category === filterCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [gallery, filterCat, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filter changes
  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) setCurrentPage(1);
    }, 0);
    return () => {
      active = false;
    };
  }, [filterCat, searchQuery]);

  // Stats per category
  const catStats = useMemo(() => {
    const stats: Record<string, number> = {};
    GALLERY_CATEGORIES.forEach(c => stats[c] = 0);
    gallery.forEach(i => { stats[i.category] = (stats[i.category] || 0) + 1; });
    return stats;
  }, [gallery]);

  // Handlers
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal?.title || !editModal?.category) {
      toast.error('Judul dan kategori wajib diisi!');
      return;
    }
    setSaving(true);
    try {
      const item: GalleryItem = {
        id: editModal.id || `gal-${Date.now().toString(36)}`,
        title: editModal.title || '',
        description: editModal.description || '',
        imageUrl: editModal.imageUrl || '',
        category: (editModal.category as GalleryItem['category']) || 'Lainnya',
        date: editModal.date || new Date().toISOString().slice(0, 10),
        createdAt: editModal.createdAt || new Date().toISOString(),
      };
      const updated = editModal.id
        ? gallery.map(g => g.id === item.id ? item : g)
        : [...gallery, item];
      await saveGalleryItems(updated);
      setGallery(updated);
      setEditModal(null);
      toast.success(editModal.id ? 'Foto berhasil diperbarui!' : 'Foto berhasil ditambahkan!');
    } catch {
      toast.error('Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Foto',
      message: 'Hapus foto ini dari galeri?',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const updated = gallery.filter(g => g.id !== id);
      await saveGalleryItems(updated);
      setGallery(updated);
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('Foto berhasil dihapus.');
    } catch {
      toast.error('Gagal menghapus.');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = await confirmAction({
      title: 'Hapus Massal Foto',
      message: `Hapus ${selected.size} foto terpilih?`,
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const updated = gallery.filter(g => !selected.has(g.id));
      await saveGalleryItems(updated);
      setGallery(updated);
      setSelected(new Set());
      toast.success(`${selected.size} foto berhasil dihapus.`);
    } catch {
      toast.error('Gagal menghapus.');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(i => i.id)));
    }
  };

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
      <DashboardShell
        user={user}
        onLogout={logout}
        headerTitle="Galeri Dokumentasi"
        headerSubtitle="Arsip foto kegiatan Koryandik se-Kecamatan Cibadak"
        headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
      >
        <div className="content-area">

          {/* ═══ Stats Ribbon ═══ */}
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {/* Total card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '16px', padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#818cf8', lineHeight: 1 }}>{gallery.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>Total Foto</div>
            </div>
            {/* Per-category mini cards */}
            {GALLERY_CATEGORIES.map(cat => {
              const color = CAT_COLORS[cat] || '#6b7280';
              const icon = CAT_ICONS[cat] || 'fa-image';
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCat(filterCat === cat ? 'Semua' : cat)}
                  style={{
                    background: filterCat === cat ? `${color}20` : 'var(--card-glass)',
                    border: `1px solid ${filterCat === cat ? color : 'var(--card-border)'}`,
                    borderRadius: '16px', padding: '14px 10px', textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    outline: filterCat === cat ? `2px solid ${color}` : 'none',
                    outlineOffset: '1px',
                  }}
                >
                  <i className={`fa-solid ${icon}`} style={{ fontSize: '16px', color, display: 'block', marginBottom: '6px' }} />
                  <div style={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>{catStats[cat]}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 }}>{cat}</div>
                </button>
              );
            })}
          </div>

          {/* ═══ Toolbar ═══ */}
          <div className="card animate-fade-in" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '14px 18px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
            }}>
              {/* Search */}
              <div style={{ flex: '1 1 220px', position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Cari judul atau deskripsi foto..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px', fontSize: '13px' }}
                />
              </div>

              {/* Category filter dropdown */}
              <select
                className="form-input"
                value={filterCat}
                onChange={e => setFilterCat(e.target.value as GalleryCat)}
                style={{ width: 'auto', minWidth: '140px', fontSize: '13px' }}
              >
                <option value="Semua">Semua Kategori</option>
                {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c} ({catStats[c]})</option>)}
              </select>

              {/* View toggle */}
              <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '8px 12px', border: 'none', cursor: 'pointer',
                    background: viewMode === 'grid' ? 'var(--primary)' : 'var(--card-glass)',
                    color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s', fontSize: '13px',
                  }}
                  title="Tampilan Grid"
                >
                  <i className="fa-solid fa-table-cells" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '8px 12px', border: 'none', cursor: 'pointer',
                    background: viewMode === 'list' ? 'var(--primary)' : 'var(--card-glass)',
                    color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s', fontSize: '13px',
                  }}
                  title="Tampilan List"
                >
                  <i className="fa-solid fa-list" />
                </button>
              </div>

              {/* Add button */}
              <button className="btn btn-primary btn-sm" onClick={() => setEditModal({ category: 'Rapat Ops', date: new Date().toISOString().slice(0, 10) })}>
                <i className="fa-solid fa-plus" /> Tambah Foto
              </button>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div style={{
                padding: '10px 18px',
                borderTop: '1px solid var(--card-border)',
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(239,68,68,0.06)',
                fontSize: '13px',
              }}>
                <button type="button" className="btn btn-outline btn-xs" onClick={toggleSelectAll}>
                  {selected.size === paginated.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--danger)' }}>{selected.size}</strong> foto terpilih
                </span>
                <button className="btn btn-danger btn-xs" onClick={handleBulkDelete}>
                  <i className="fa-solid fa-trash" /> Hapus Terpilih
                </button>
              </div>
            )}
          </div>

          {/* ═══ Content Area ═══ */}
          {!dataLoaded ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              Memuat galeri...
            </div>
          ) : filtered.length === 0 ? (
            <div className="card animate-fade-in" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-images" style={{ fontSize: '48px', opacity: 0.2, display: 'block', marginBottom: '16px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                {searchQuery || filterCat !== 'Semua' ? 'Tidak ada foto yang sesuai filter.' : 'Belum ada dokumentasi foto.'}
              </div>
              <div style={{ fontSize: '12.5px', marginBottom: '20px' }}>
                {searchQuery || filterCat !== 'Semua' ? 'Coba ubah kata kunci atau kategori filter.' : 'Klik tombol "Tambah Foto" untuk mulai mengarsipkan dokumentasi kegiatan.'}
              </div>
              {!searchQuery && filterCat === 'Semua' && (
                <button className="btn btn-primary btn-sm" onClick={() => setEditModal({ category: 'Rapat Ops', date: new Date().toISOString().slice(0, 10) })}>
                  <i className="fa-solid fa-plus" /> Tambah Foto Pertama
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ══════ GRID VIEW ══════ */
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {paginated.map(item => {
                const catColor = CAT_COLORS[item.category] || '#6b7280';
                const isSelected = selected.has(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: '16px', overflow: 'hidden',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: 'var(--card-glass)',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Checkbox overlay */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      style={{
                        position: 'absolute', top: '10px', left: '10px', zIndex: 3,
                        width: '24px', height: '24px', borderRadius: '6px',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.6)'}`,
                        background: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.3)',
                        color: '#fff', fontSize: '11px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {isSelected && <i className="fa-solid fa-check" />}
                    </button>

                    {/* Image container */}
                    <div
                      onClick={() => setPreviewItem(item)}
                      style={{
                        width: '100%', height: '160px',
                        background: item.imageUrl ? 'transparent' : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={toDirectImageUrl(item.imageUrl)}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <i className="fa-solid fa-image" style={{ fontSize: '32px', color: 'var(--text-secondary)', opacity: 0.25 }} />
                      )}
                      {/* Hover overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.4)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.25s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                            onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                          >
                            <i className="fa-solid fa-eye" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                            onClick={(e) => { e.stopPropagation(); setEditModal(item); }}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.6)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(239,68,68,0.4)' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info section */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '10.5px' }}>
                        <span style={{
                          background: `${catColor}18`, color: catColor,
                          padding: '2px 8px', borderRadius: '99px', fontWeight: 700,
                        }}>
                          {item.category}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <i className="fa-solid fa-calendar-day" />
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ══════ LIST VIEW ══════ */
            <div className="card animate-fade-in">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} />
                      </th>
                      <th style={{ width: '70px' }}>Foto</th>
                      <th>Judul</th>
                      <th>Kategori</th>
                      <th>Tanggal</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(item => {
                      const catColor = CAT_COLORS[item.category] || '#6b7280';
                      return (
                        <tr key={item.id} style={{ background: selected.has(item.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                          <td>
                            <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                          </td>
                          <td>
                            <div
                              onClick={() => setPreviewItem(item)}
                              style={{
                                width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden',
                                border: '1px solid var(--card-border)', cursor: 'pointer',
                                background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {item.imageUrl ? (
                                <img src={toDirectImageUrl(item.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <i className="fa-solid fa-image" style={{ fontSize: '16px', opacity: 0.3 }} />
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.title}</div>
                            {item.description && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ background: `${catColor}18`, color: catColor, padding: '3px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '10.5px' }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button className="btn btn-outline btn-xs" onClick={() => setPreviewItem(item)} title="Lihat"><i className="fa-solid fa-eye" /></button>
                              <button className="btn btn-outline btn-xs" onClick={() => setEditModal(item)} title="Edit"><i className="fa-solid fa-pen" /></button>
                              <button className="btn btn-danger btn-xs" onClick={() => handleDelete(item.id)} title="Hapus"><i className="fa-solid fa-trash" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ Pagination ═══ */}
          {totalPages > 1 && (
            <div className="animate-fade-in" style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: '6px', marginTop: '20px',
            }}>
              <button
                className="btn btn-outline btn-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: page === currentPage ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                    background: page === currentPage ? 'var(--primary)' : 'var(--card-glass)',
                    color: page === currentPage ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                className="btn btn-outline btn-xs"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                {filtered.length} foto
              </span>
            </div>
          )}
        </div>
      </DashboardShell>

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ PREVIEW LIGHTBOX MODAL ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {previewItem && (
        <div
          onClick={() => setPreviewItem(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-space-dark)', borderRadius: '24px',
              maxWidth: '720px', width: '100%', overflow: 'hidden',
              border: '1px solid var(--card-border)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
            }}
          >
            {/* Image */}
            {previewItem.imageUrl ? (
              <div style={{ width: '100%', maxHeight: '420px', overflow: 'hidden', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={toDirectImageUrl(previewItem.imageUrl)}
                  alt={previewItem.title}
                  style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div style={{ width: '100%', height: '200px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-image" style={{ fontSize: '48px', opacity: 0.2, color: 'var(--text-secondary)' }} />
              </div>
            )}
            {/* Info */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{previewItem.title}</h3>
                <span style={{
                  background: `${CAT_COLORS[previewItem.category] || '#6b7280'}18`,
                  color: CAT_COLORS[previewItem.category] || '#6b7280',
                  padding: '4px 12px', borderRadius: '99px', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap',
                }}>
                  {previewItem.category}
                </span>
              </div>
              {previewItem.description && (
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {previewItem.description}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                <span><i className="fa-solid fa-calendar-day" /> {new Date(previewItem.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span><i className="fa-solid fa-clock" /> {new Date(previewItem.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditModal(previewItem); setPreviewItem(null); }}>
                  <i className="fa-solid fa-pen" /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => { handleDelete(previewItem.id); setPreviewItem(null); }}>
                  <i className="fa-solid fa-trash" /> Hapus
                </button>
                <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setPreviewItem(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ ADD/EDIT SLIDE MODAL ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {editModal && (
        <div
          onClick={() => setEditModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-space-dark)', borderRadius: '24px',
              maxWidth: '520px', width: '100%', overflow: 'hidden',
              border: '1px solid var(--card-border)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--card-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                <i className={`fa-solid ${editModal.id ? 'fa-pen-to-square' : 'fa-camera'}`} style={{ marginRight: '8px', color: 'var(--primary)' }} />
                {editModal.id ? 'Edit Dokumentasi' : 'Tambah Dokumentasi Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)', fontSize: '14px',
                  transition: 'background 0.2s',
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Modal body form */}
            <form onSubmit={handleSave} style={{ padding: '24px', display: 'grid', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="gal-title">Judul Kegiatan *</label>
                <input
                  id="gal-title" type="text" className="form-input" required
                  value={editModal.title || ''}
                  onChange={e => setEditModal({ ...editModal, title: e.target.value })}
                  placeholder="Contoh: Rapat Koordinasi Operator"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gal-desc">Deskripsi</label>
                <textarea
                  id="gal-desc" className="form-input" rows={3}
                  value={editModal.description || ''}
                  onChange={e => setEditModal({ ...editModal, description: e.target.value })}
                  placeholder="Ringkasan singkat jalannya acara..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="gal-cat">Kategori *</label>
                  <select
                    id="gal-cat" className="form-input" required
                    value={editModal.category || ''}
                    onChange={e => setEditModal({ ...editModal, category: e.target.value as GalleryItem['category'] })}
                  >
                    <option value="">Pilih Kategori</option>
                    {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="gal-date">Tanggal Acara</label>
                  <input
                    id="gal-date" type="date" className="form-input"
                    value={editModal.date || ''}
                    onChange={e => setEditModal({ ...editModal, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gal-url">URL Gambar / Google Drive</label>
                <input
                  id="gal-url" type="text" className="form-input"
                  value={editModal.imageUrl || ''}
                  onChange={e => setEditModal({ ...editModal, imageUrl: e.target.value })}
                  placeholder="https://drive.google.com/... atau URL langsung"
                />
              </div>

              {/* Preview */}
              {editModal.imageUrl && (
                <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--card-border)', maxHeight: '200px', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={toDirectImageUrl(editModal.imageUrl || '')} alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={saving}>
                  {saving ? (<><i className="fa-solid fa-spinner fa-spin" /> Menyimpan...</>) : (<><i className="fa-solid fa-check" /> {editModal.id ? 'Simpan Perubahan' : 'Tambahkan Foto'}</>)}
                </button>
                <button className="btn btn-outline" type="button" onClick={() => setEditModal(null)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
