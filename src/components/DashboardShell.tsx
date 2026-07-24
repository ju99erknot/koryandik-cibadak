'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getDashboardNav, DASHBOARD_BRANDS } from '@/lib/dashboardNav';
import type { SessionUser } from '@/lib/types';
import NotificationBadge from '@/components/NotificationBadge';
import NotificationCenter from '@/components/NotificationCenter';
import PushNotificationManager from '@/components/PushNotificationManager';
import DeadlineTracker from '@/components/DeadlineTracker';
import VoiceCommand from '@/components/VoiceCommand';
import ContactDirectoryModal from '@/components/ContactDirectoryModal';
import { updateSchool, getSupervisors, saveSupervisors } from '@/lib/db';
import { toast } from 'sonner';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface DashboardShellProps {
  user: SessionUser;
  onLogout: () => void;
  headerTitle: string;
  headerSubtitle?: string;
  /** Override brand for school role (uses school name) */
  brandTitle?: string;
  brandSubtitle?: string;
  children: React.ReactNode;
  /** Extra header actions (e.g. CommandPalette) */
  headerActions?: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  school: 'Operator Sekolah',
  gugus: 'Koordinator Gugus',
  pengawas: 'Pengawas',
  kkks: 'Ketua KKKS',
  pgri: 'Pengurus PGRI',
};

const ROLE_COLORS: Record<string, string> = {
  admin:    'var(--danger)',
  school:   'var(--primary)',
  gugus:    '#8b5cf6',
  pengawas: 'var(--warning)',
  kkks:     'var(--success)',
  pgri:     'var(--accent)',
};

// 5 Premium self-contained SVGs as data URIs (representing Astronaut, Rocket, Saturn, Robot, and Scholar)
const PRESET_AVATARS = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%231e3a8a"/><circle cx="50" cy="45" r="20" fill="%23e2e8f0"/><rect x="36" y="38" width="28" height="18" rx="8" fill="%233b82f6" stroke="%23ffffff" stroke-width="2"/><path d="M30,75 C30,60 70,60 70,75 L70,85 L30,85 Z" fill="%23f1f5f9"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%235b21b6"/><path d="M50,20 L80,35 L50,50 L20,35 Z" fill="%23a78bfa"/><rect x="47" y="38" width="6" height="20" fill="%238b5cf6"/><path d="M30,42 L30,65 C30,70 50,75 50,75 C50,75 70,70 70,65 L70,42" fill="none" stroke="%23c084fc" stroke-width="4"/><circle cx="50" cy="45" r="12" fill="%23f5f3ff"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23065f46"/><rect x="32" y="30" width="36" height="30" rx="8" fill="%2334d399"/><circle cx="42" cy="45" r="4" fill="%23ffffff"/><circle cx="58" cy="45" r="4" fill="%23ffffff"/><path d="M40,52 Q50,56 60,52" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round"/><rect x="48" y="60" width="4" height="12" fill="%23059669"/><path d="M25,75 C25,65 75,65 75,75 L75,85 L25,85 Z" fill="%23a7f3d0"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2378350f"/><polygon points="50,15 58,35 80,35 62,48 68,70 50,57 32,70 38,48 20,35 42,35" fill="%23f59e0b"/><circle cx="50" cy="45" r="10" fill="%23fffbeb"/><path d="M35,75 Q50,68 65,75 L65,85 L35,85 Z" fill="%23fef3c7"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%230f172a"/><ellipse cx="50" cy="50" rx="40" ry="12" fill="none" stroke="%23ec4899" stroke-width="4" transform="rotate(-20 50 50)"/><circle cx="50" cy="50" r="20" fill="%23f472b6"/><circle cx="45" cy="45" r="6" fill="%23ffffff" opacity="0.4"/></svg>',
];

export default function DashboardShell({
  user,
  onLogout,
  headerTitle,
  headerSubtitle,
  brandTitle,
  brandSubtitle,
  children,
  headerActions,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Local profile states
  const [currentUser, setCurrentUser] = useState<SessionUser>(user);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user.name || '');
  const [editAvatar, setEditAvatar] = useState(user.avatar || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Contact Directory & WhatsApp Simulator States
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [waAlerts, setWaAlerts] = useState<any[]>([]);
  const waTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const handleWaEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const id = Date.now() + Math.random().toString(36).substr(2, 5);
      const newAlert = { id, ...detail };
      
      setWaAlerts((prev) => [newAlert, ...prev]);

      // Remove after 6 seconds
      const timeoutId = setTimeout(() => {
        setWaAlerts((prev) => prev.filter((alert) => alert.id !== id));
        waTimeoutsRef.current.delete(timeoutId);
      }, 6000);
      waTimeoutsRef.current.add(timeoutId);
    };

    window.addEventListener('koryandik_wa_simulated', handleWaEvent);
    return () => {
      window.removeEventListener('koryandik_wa_simulated', handleWaEvent);
      waTimeoutsRef.current.forEach(id => clearTimeout(id));
    };
  }, []);

  // Sync profile state with localStorage & database on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('koryandik_current_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as SessionUser;
            setCurrentUser(parsed);
            
            // Load fresh data from database for avatar
            let avatar = parsed.avatar || '';
            if (parsed.role === 'school' && parsed.npsn) {
              // For school users, get fresh data from db
              const { getSchoolByNpsn } = await import('@/lib/db');
              const school = await getSchoolByNpsn(parsed.npsn);
              if (school?.operatorAvatarUrl) {
                avatar = school.operatorAvatarUrl;
              }
            } else if (['admin', 'pengawas', 'kkks', 'pgri'].includes(parsed.role) && parsed.id) {
              // For supervisor/admin users, get fresh data from db
              const { getSupervisors } = await import('@/lib/db');
              const supervisors = await getSupervisors();
              const sup = supervisors.find(s => s.id === parsed.id);
              if (sup?.photoUrl) {
                avatar = sup.photoUrl;
              }
            }

            const initialName = parsed.role === 'school'
              ? ((parsed.details as any)?.operatorName || parsed.name || 'Operator Sekolah')
              : (parsed.name || '');
            
            setEditName(initialName);
            setEditAvatar(avatar);
            
            // Update localStorage with fresh avatar if needed
            if (avatar !== parsed.avatar) {
              const updatedUser = { ...parsed, avatar };
              localStorage.setItem('koryandik_current_user', JSON.stringify(updatedUser));
              setCurrentUser(updatedUser);
            }
          } catch (e) {
            console.error('Failed to parse current user:', e);
          }
        }
      }
    };

    loadProfile();

    window.addEventListener('koryandik_user_profile_updated', loadProfile);
    window.addEventListener('storage', loadProfile);
    return () => {
      window.removeEventListener('koryandik_user_profile_updated', loadProfile);
      window.removeEventListener('storage', loadProfile);
    };
  }, []);

  const brand = DASHBOARD_BRANDS[currentUser.role];
  const navItems = getDashboardNav(currentUser.role);
  const displayTitle = brandTitle ?? brand.title;
  const displaySubtitle = brandSubtitle ?? brand.subtitle;

  const roleLabel = ROLE_LABELS[currentUser.role] ?? currentUser.role;
  const roleColor = ROLE_COLORS[currentUser.role] ?? 'var(--primary)';

  // Display name for avatar/profile: if school, use Operator Name instead of School Name
  const displayName = currentUser.role === 'school'
    ? ((currentUser.details as any)?.operatorName || currentUser.name || 'Operator Sekolah')
    : (currentUser.name || currentUser.id || 'User');

  const userInitial = displayName[0].toUpperCase();

  // Handling file uploads for avatar change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal adalah 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditAvatar(event.target.result as string);
        toast.success('Foto berhasil dimuat.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handling Save Profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Nama pengguna tidak boleh kosong.');
      return;
    }

    try {
      // Save to database based on role
      if (currentUser.role === 'school' && currentUser.npsn) {
        // For school users, save operator avatar
        await updateSchool(currentUser.npsn, {
          operatorAvatarUrl: editAvatar,
        });
      } else if (['admin', 'pengawas', 'kkks', 'pgri'].includes(currentUser.role) && currentUser.id) {
        // For supervisor/admin users, save to supervisors table
        const supervisors = await getSupervisors();
        const updatedSupervisors = supervisors.map(s => {
          if (s.id === currentUser.id) {
            return {
              ...s,
              name: editName.trim(),
              photoUrl: editAvatar,
            };
          }
          return s;
        });
        await saveSupervisors(updatedSupervisors);
      }

      // Update local state and localStorage
      const updatedUser: SessionUser = {
        ...currentUser,
        name: editName.trim(),
        avatar: editAvatar,
      };

      localStorage.setItem('koryandik_current_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setIsEditModalOpen(false);
      toast.success('Profil berhasil diperbarui!');
      
      // Dispatch custom event to notify other components if any
      window.dispatchEvent(new Event('koryandik_user_profile_updated'));
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Gagal menyimpan profil.');
    }
  };

  return (
    <div className="dashboard-layout mesh-gradient-bg">
      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Navigasi utama">
        {/* Sidebar Header (Brand) */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className={brand.icon} aria-hidden="true" />
          </div>
          <div className="sidebar-brand">
            <h3>{displayTitle}</h3>
            <span>{displaySubtitle}</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup menu navigasi"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="sidebar-nav" aria-label="Menu dashboard">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href || item.label}
                type="button"
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={() => {
                  if (item.href) router.push(item.href);
                  setSidebarOpen(false);
                }}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
                {item.showBadge && (
                  <NotificationBadge
                    role={currentUser.role}
                    npsn={currentUser.npsn}
                    gugusId={currentUser.role === 'gugus' ? currentUser.id : undefined}
                  />
                )}
              </button>
            );
          })}
        </nav>

      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="main-content">
        {/* Dashboard Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu navigasi"
              aria-expanded={sidebarOpen}
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
            <div>
              <h1>{headerTitle}</h1>
              {headerSubtitle && <p className="header-subtitle">{headerSubtitle}</p>}
            </div>
          </div>

          <div className="header-right">
            {headerActions}
            <VoiceCommand currentUser={currentUser} />
            <NotificationCenter currentUser={currentUser} />
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setIsDirectoryOpen(true)}
              aria-label="Direktori Kontak Sekolah"
              title="Direktori Kontak Sekolah & Pengawas"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className="fa-solid fa-address-book" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="theme-toggle"
              onClick={(e) => toggleThemeWithTransition(e)}
              aria-label="Ganti tema terang/gelap"
            >
              <i className="fa-solid fa-sun" aria-hidden="true" />
              <i className="fa-solid fa-moon" aria-hidden="true" />
            </button>

            {/* Profile Dropdown Menu */}
            <div className="header-profile-menu-container" style={{ position: 'relative' }}>
              <button
                type="button"
                className="header-profile-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '14px',
                  width: '40px',
                  height: '40px',
                  padding: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-glass)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '10px',
                    background: currentUser.avatar ? 'none' : `${roleColor}22`,
                    color: roleColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    overflow: 'hidden',
                  }}
                >
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userInitial
                  )}
                </div>
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 99,
                    }}
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div
                    className="dropdown-menu-premium"
                    style={{
                      position: 'absolute',
                      top: '120%',
                      right: 0,
                      background: 'var(--card-glass)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '220px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--card-border)', marginBottom: '4px' }}>
                      <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>
                        {displayName}
                      </p>
                      <p style={{ fontSize: '11px', color: roleColor, margin: '2px 0 0 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {roleLabel}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="dropdown-item-premium"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '13px',
                        transition: 'background 0.2s',
                      }}
                    >
                      <i className="fa-solid fa-user-pen" style={{ color: 'var(--primary)' }}></i> Edit Profil
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        className="dropdown-item-premium"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          router.push('/admin/settings');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          fontSize: '13px',
                          transition: 'background 0.2s',
                        }}
                      >
                        <i className="fa-solid fa-gears" style={{ color: 'var(--success)' }}></i> Pengaturan Aplikasi
                      </button>
                    )}

                    <button
                      type="button"
                      className="dropdown-item-premium"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--danger)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '13px',
                        transition: 'background 0.2s',
                        borderTop: '1px solid var(--border)',
                        marginTop: '4px',
                      }}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i> Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {children}

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-nav" aria-label="Navigasi bawah">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== '' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href || item.label}
                type="button"
                className={`mobile-nav-item${isActive ? ' active' : ''}`}
                onClick={() => { if (item.href) router.push(item.href); }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <div className="mobile-nav-icon-wrap">
                  <i className={item.icon} aria-hidden="true" />
                  {item.showBadge && (
                    <NotificationBadge
                      role={currentUser.role}
                      npsn={currentUser.npsn}
                      gugusId={currentUser.role === 'gugus' ? currentUser.id : undefined}
                    />
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>

      {/* Background Managers */}
      <PushNotificationManager currentUser={currentUser} />
      <DeadlineTracker user={currentUser} />

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--modal-backdrop)',
            backdropFilter: 'blur(var(--modal-blur))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'var(--z-modal)' as any,
          }}
        >
          <div
            className="modal-content modal-card"
            style={{
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--modal-radius)',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsEditModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Edit Profil Saya
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Perbarui nama dan pilih foto profil kustom Anda.
            </p>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Pengguna</label>
                <input
                  type="text"
                  className="form-control"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Masukkan nama..."
                  disabled={currentUser.role === 'school'}
                  required
                />
                {currentUser.role === 'school' && (
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i> Nama sekolah hanya dapat diubah oleh Administrator.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Foto Profil</label>
                
                {/* Avatar previews */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: editAvatar ? 'none' : `${roleColor}22`,
                      color: roleColor,
                      border: `2px solid ${roleColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      overflow: 'hidden',
                    }}
                  >
                    {editAvatar ? (
                      <img src={editAvatar} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      editName ? editName[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      className="btn btn-outline btn-xs"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="fa-solid fa-upload"></i> Unggah Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {editAvatar && (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => setEditAvatar('')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-trash-can"></i> Hapus Foto
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Atau pilih dari preset cosmic:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatar(av)}
                      style={{
                        padding: 0,
                        border: editAvatar === av ? '2px solid var(--primary)' : '1.5px solid var(--card-border)',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        width: '44px',
                        height: '44px',
                        background: 'none',
                        transition: 'all 0.2s',
                        transform: editAvatar === av ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: editAvatar === av ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                      }}
                    >
                      <img src={av} alt={`Preset ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Contacts Directory Modal */}
      <ContactDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
      />

      {/* Simulated WhatsApp Gateway Notification Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 'var(--z-toast)' as any,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
          maxWidth: '380px',
          width: '90%'
        }}
      >
        {waAlerts.map((alert) => (
          <div
            key={alert.id}
            className="animate-slide-in"
            style={{
              background: '#075e54',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              border: '1px solid #128c7e',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              pointerEvents: 'auto',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-brands fa-whatsapp" style={{ fontSize: '18px', color: '#25d366' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em' }}>WHATSAPP GATEWAY (SIMULATOR)</span>
              </div>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>{alert.timestamp}</span>
            </div>
            <div style={{ fontSize: '12.5px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
              <strong>Terkirim ke {alert.schoolName} ({alert.phone})</strong>:
              <p style={{ margin: '4px 0 0', fontStyle: 'italic', opacity: 0.95, lineHeight: '1.4' }}>&ldquo;{alert.message}&rdquo;</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Memuat halaman" style={{ background: 'var(--bg-space)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Skeleton Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <LoadingSkeleton variant="text" width={180} height={20} />
          <LoadingSkeleton variant="text" width={120} height={12} />
        </div>
        <LoadingSkeleton variant="circular" width={40} height={40} />
      </div>

      {/* Skeleton Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '20px' }}>
            <LoadingSkeleton variant="rounded" width={48} height={48} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <LoadingSkeleton variant="text" width="60%" height={12} />
              <LoadingSkeleton variant="text" width="40%" height={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton Table */}
      <div style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px' }}>
          <LoadingSkeleton variant="text" width="35%" height={18} />
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4, 5].map((r) => (
            <div key={r} style={{ display: 'flex', gap: '16px' }}>
              {[1, 2, 3, 4].map((c) => (
                <LoadingSkeleton key={c} variant="text" height={14} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton Chart */}
      <div style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', height: '140px', padding: '0 20px' }}>
          {[60, 40, 80, 50, 90, 70, 45, 85].map((h, i) => (
            <LoadingSkeleton key={i} variant="rectangular" height={`${h}%`} style={{ flex: 1, borderRadius: '6px 6px 0 0' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
