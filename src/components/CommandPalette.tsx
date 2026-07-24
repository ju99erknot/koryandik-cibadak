'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import type { School, Category } from '@/lib/schoolsData';
import { getSchools, getCategories, getAnnouncements, removePresence } from '@/lib/db';
import type { Announcement } from '@/lib/db';
import type { SessionUser } from '@/lib/types';
import { toggleThemeWithTransition } from '@/lib/theme';
import { playClickSound, toggleSoundEnabled, isSoundEnabled } from '@/lib/sound';

interface CommandPaletteProps {
  currentUser?: SessionUser | null;
  onThemeToggle?: (e?: React.MouseEvent) => void;
}

export default function CommandPalette({ currentUser, onThemeToggle }: CommandPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [schools, setSchools] = useState<School[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'nav' | 'schools' | 'announcements' | 'categories'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Check user role
  const role = currentUser?.role;

  const openPalette = useCallback(() => {
    setSearch('');
    setSelectedIndex(0);
    setActiveTab('all');
    setIsOpen(true);
  }, []);

  const closePalette = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) closePalette();
        else openPalette();
      }
      if (e.key === 'Escape') {
        closePalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePalette, openPalette]);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      const [schools, categories, announcements] = await Promise.all([
        getSchools(),
        getCategories(),
        getAnnouncements()
      ]);
      setSchools(schools);
      setCategories(categories);
      setAnnouncements(announcements);
      window.clearTimeout(timer);
    };
    loadData();
  }, [isOpen]);

  // Build command list based on user role
  const commands: Array<{
    id: string;
    name: string;
    icon: string;
    section: string;
    action: (e?: any) => void;
  }> = [
    { id: 'nav-home', name: 'Ke Halaman Beranda Utama', icon: 'fa-solid fa-house', section: 'Navigasi', action: () => router.push('/') },
  ];

  if (role === 'school') {
    commands.push(
      { id: 'nav-school-dash', name: 'Dashboard Sekolah', icon: 'fa-solid fa-gauge', section: 'Navigasi', action: () => router.push('/school/dashboard') },
      { id: 'nav-school-prof', name: 'Profil Sekolah Anda', icon: 'fa-solid fa-circle-user', section: 'Navigasi', action: () => router.push('/school/profile') },
      { id: 'nav-school-rec', name: 'Cetak Bukti Tanda Terima', icon: 'fa-solid fa-file-invoice', section: 'Navigasi', action: () => router.push('/school/receipt') }
    );
  } else if (role === 'gugus') {
    commands.push(
      { id: 'nav-gugus-dash', name: 'Dashboard Koordinator Gugus', icon: 'fa-solid fa-sitemap', section: 'Navigasi', action: () => router.push('/gugus/dashboard') }
    );
  } else if (role === 'pengawas' || role === 'kkks' || role === 'pgri') {
    commands.push(
      { id: 'nav-sup-dash', name: `Dashboard ${role.toUpperCase()}`, icon: 'fa-solid fa-chart-pie', section: 'Navigasi', action: () => router.push(`/${role}/dashboard`) }
    );
  } else if (role === 'admin') {
    commands.push(
      { id: 'nav-admin-dash', name: 'Dashboard Admin Utama', icon: 'fa-solid fa-user-shield', section: 'Navigasi', action: () => router.push('/admin/dashboard') },
      { id: 'nav-admin-sch', name: 'Kelola Daftar Sekolah', icon: 'fa-solid fa-school', section: 'Navigasi', action: () => router.push('/admin/schools') },
      { id: 'nav-admin-cat', name: 'Kategori Berkas Wajib', icon: 'fa-solid fa-folder-tree', section: 'Navigasi', action: () => router.push('/admin/categories') },
      { id: 'nav-admin-recap', name: 'Matriks Rekapitulasi Berkas', icon: 'fa-solid fa-rectangle-list', section: 'Navigasi', action: () => router.push('/admin/recap') },
      { id: 'nav-admin-exp', name: 'Ekspor Data (CSV/Cetak)', icon: 'fa-solid fa-file-export', section: 'Navigasi', action: () => router.push('/admin/export') },
      { id: 'nav-admin-logs', name: 'Tinjau Log Aktivitas Sistem', icon: 'fa-solid fa-receipt', section: 'Navigasi', action: () => router.push('/admin/logs') },
      { id: 'nav-admin-ann', name: 'Kelola Pengumuman', icon: 'fa-solid fa-bullhorn', section: 'Navigasi', action: () => router.push('/admin/announcements') },
      { id: 'nav-admin-settings', name: 'Pengaturan Aplikasi', icon: 'fa-solid fa-gear', section: 'Navigasi', action: () => router.push('/admin/settings') }
    );
  }

  // System actions
  commands.push(
    {
      id: 'action-theme',
      name: 'Ubah Tema (Dark / Light Mode)',
      icon: 'fa-solid fa-circle-half-stroke',
      section: 'Sistem',
      action: (e) => {
        playClickSound();
        if (onThemeToggle) {
          onThemeToggle(e as React.MouseEvent);
        } else {
          toggleThemeWithTransition();
        }
        setIsOpen(false);
      }
    },
    {
      id: 'action-sound',
      name: `Toggle Efek Suara UI (${isSoundEnabled() ? 'Aktif 🔊' : 'Mati 🔇'})`,
      icon: isSoundEnabled() ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark',
      section: 'Sistem',
      action: () => {
        toggleSoundEnabled();
        setIsOpen(false);
      }
    }
  );

  if (role) {
    commands.push({
      id: 'action-logout',
      name: 'Keluar (Logout)',
      icon: 'fa-solid fa-right-from-bracket',
      section: 'Sistem',
      action: () => {
        // Clear presence from DB
        const stored = localStorage.getItem('koryandik_current_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as SessionUser;
            const presenceId = parsed.role === 'school'
              ? `school-${parsed.npsn || 'unknown'}`
              : `${parsed.role}-${parsed.id || parsed.name || 'unknown'}`;
            removePresence(presenceId);
          } catch { /* ignore */ }
        }
        localStorage.removeItem('koryandik_current_user');
        router.push('/');
        setIsOpen(false);
      }
    });
  }

  // Search filter
  const filteredCommands = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const allItems = React.useMemo(() => {
    const schoolCommands = (role === 'admin' || role === 'pengawas' || role === 'kkks' || role === 'pgri')
      ? schools
          .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.npsn.includes(search))
          .slice(0, 5)
          .map((s) => ({
            id: `school-${s.npsn}`,
            name: `Lihat Rekap: ${s.name} (${s.npsn})`,
            icon: 'fa-solid fa-graduation-cap',
            section: 'Sekolah Binaan',
            action: () => {
              if (role === 'admin') router.push(`/admin/recap?search=${s.npsn}`);
              else router.push(`/${role}/dashboard?search=${s.npsn}`);
              setIsOpen(false);
            }
          }))
      : [];

    const categoryCommands = categories
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 5)
      .map((c) => ({
        id: `cat-${c.id}`,
        name: `Kategori Berkas: ${c.name} (Deadline: ${c.deadline || 'Tidak Ada'})`,
        icon: c.icon || 'fa-solid fa-file-invoice',
        section: 'Kategori Berkas',
        action: () => {
          if (role === 'admin') router.push('/admin/categories');
          else router.push('/school/dashboard');
          setIsOpen(false);
        }
      }));

    const announcementCommands = announcements
      .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 5)
      .map((a) => ({
        id: `ann-${a.id}`,
        name: `Pengumuman: ${a.title}`,
        icon: 'fa-solid fa-bullhorn',
        section: 'Pengumuman',
        action: () => {
          if (role === 'admin') router.push('/admin/announcements');
          else router.push('/school/dashboard');
          setIsOpen(false);
        }
      }));

    switch (activeTab) {
      case 'nav':
        return filteredCommands.filter(c => c.section === 'Navigasi' || c.section === 'Sistem');
      case 'schools':
        return schoolCommands;
      case 'announcements':
        return announcementCommands;
      case 'categories':
        return categoryCommands;
      case 'all':
      default:
        return [...filteredCommands, ...schoolCommands, ...categoryCommands, ...announcementCommands];
    }
  }, [activeTab, filteredCommands, role, router, schools, categories, announcements, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (allItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    }
  };

  // Autoscroll logic
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('.active-item');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 'var(--z-modal-full)' as any,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '10vh'
            }}
          >
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--modal-backdrop)',
                backdropFilter: 'blur(var(--modal-blur))',
                WebkitBackdropFilter: 'blur(var(--modal-blur))'
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
                background: 'var(--card-glass)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 1
              }}
            >
              {/* Input field */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--card-border)'
                }}
              >
                <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: '18px', marginRight: '14px' }}></i>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik command, menu navigasi, atau nama sekolah..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '16px'
                  }}
                />
              </div>

              {/* Tab Selector */}
              <div 
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid var(--card-border)',
                  overflowX: 'auto',
                  scrollbarWidth: 'none'
                }}
              >
                <button
                  onClick={() => { setActiveTab('all'); setSelectedIndex(0); }}
                  style={{
                    background: activeTab === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  Semua
                </button>
                <button
                  onClick={() => { setActiveTab('nav'); setSelectedIndex(0); }}
                  style={{
                    background: activeTab === 'nav' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'nav' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  Navigasi
                </button>
                {(role === 'admin' || role === 'pengawas' || role === 'kkks' || role === 'pgri') && (
                  <button
                    onClick={() => { setActiveTab('schools'); setSelectedIndex(0); }}
                    style={{
                      background: activeTab === 'schools' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: activeTab === 'schools' ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s'
                    }}
                  >
                    Sekolah
                  </button>
                )}
                <button
                  onClick={() => { setActiveTab('announcements'); setSelectedIndex(0); }}
                  style={{
                    background: activeTab === 'announcements' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'announcements' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  Pengumuman
                </button>
                <button
                  onClick={() => { setActiveTab('categories'); setSelectedIndex(0); }}
                  style={{
                    background: activeTab === 'categories' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'categories' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  Berkas Wajib
                </button>
              </div>

              {/* Items List */}
              <div 
                ref={listRef}
                style={{
                  maxHeight: '350px',
                  overflowY: 'auto',
                  padding: '8px'
                }}
              >
                {allItems.length > 0 ? (
                  (() => {
                    let currentSection = '';
                    return allItems.map((item, idx) => {
                      const showSection = item.section !== currentSection;
                      currentSection = item.section;
                      const isActive = idx === selectedIndex;

                      return (
                        <div key={item.id}>
                          {showSection && (
                            <div 
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                color: 'var(--primary)',
                                padding: '12px 16px 6px',
                                letterSpacing: '0.05em'
                              }}
                            >
                              {item.section}
                            </div>
                          )}
                          <div
                            className={isActive ? 'active-item' : ''}
                            onClick={(e) => item.action(e)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              background: isActive ? 'var(--primary-glow)' : 'transparent',
                              color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            <i className={item.icon} style={{ fontSize: '16px', width: '24px', opacity: isActive ? 1 : 0.6 }}></i>
                            <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 500 }}>{item.name}</span>
                            {isActive && (
                              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>
                                ENTER <i className="fa-solid fa-arrow-turn-down" style={{ fontSize: '9px', marginLeft: '4px' }}></i>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: '8px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '24px', color: 'var(--text-secondary)', opacity: 0.4 }}></i>
                    <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                      Tidak ada hasil pencarian.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer status bar */}
              <div 
                style={{
                  background: 'var(--bg-space-dark)',
                  padding: '12px 20px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--card-border)'
                }}
              >
                <span>Gunakan <kbd>↑</kbd> <kbd>↓</kbd> untuk memilih, <kbd>Enter</kbd> untuk konfirmasi</span>
                <span>ESC untuk keluar</span>
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
