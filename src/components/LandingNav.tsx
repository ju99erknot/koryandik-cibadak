'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VoiceCommand from '@/components/VoiceCommand';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getSchools } from '@/lib/db';

export type LandingNavPage = 'home' | 'profil' | 'sekolah' | 'faq' | 'unduhan' | 'kalender' | 'galeri';

interface LandingNavProps {
  activePage?: LandingNavPage;
  onScrollTo?: (id: string) => void;
  onOpenLogin?: () => void;
  onSearch?: () => void;
}

export default function LandingNav({
  activePage = 'home',
  onScrollTo,
  onOpenLogin,
  onSearch,
}: LandingNavProps) {
  const router = useRouter();
  const current = activePage;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [schoolCount, setSchoolCount] = useState(49);
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavScrolled(window.scrollY > 50);
    const handleScroll = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadSchoolCount = async () => {
      const schools = await getSchools();
      if (schools.length > 0) setSchoolCount(schools.length);
    };
    loadSchoolCount();
  }, []);

  // Update sliding pill indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (activeButtonRef.current && navLinksRef.current) {
        const navRect = navLinksRef.current.getBoundingClientRect();
        const btnRect = activeButtonRef.current.getBoundingClientRect();
        setActiveIndicator({
          left: btnRect.left - navRect.left,
          width: btnRect.width,
        });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [current]);

  const goHome = () => {
    setDrawerOpen(false);
    setDropdownOpen(false);
    if (current === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else router.push('/');
  };

  const scrollOrNavigate = (id: string) => {
    setDrawerOpen(false);
    setDropdownOpen(false);
    if (current === 'home' && onScrollTo) onScrollTo(id);
    else router.push(`/#${id}`);
  };

  const navItems = current === 'home' ? [
    { id: 'home',   label: 'Beranda',     icon: 'fa-house',          type: 'page'    },
    { id: 'profil', label: 'Profil',       icon: 'fa-building-columns', type: 'route' },
    { id: 'sekolah', label: 'Sekolah',     icon: 'fa-school',         type: 'route'   },
    { id: 'galeri', label: 'Galeri',       icon: 'fa-images',           type: 'route' },
    { id: 'kalender', label: 'Kalender',   icon: 'fa-calendar-days', type: 'route'   },
    { id: 'unduhan', label: 'Unduhan',     icon: 'fa-file-arrow-down', type: 'route'  },
    { id: 'faq',    label: 'FAQ',          icon: 'fa-circle-question', type: 'route'  },
    { id: 'tracker', label: 'Cek Status', icon: 'fa-magnifying-glass-chart', type: 'section' },
    { id: 'statistik', label: 'Statistik', icon: 'fa-chart-pie',    type: 'section' },
    { id: 'gugus',  label: 'Gugus',        icon: 'fa-layer-group',   type: 'section' },
    { id: 'alur',   label: 'Alur Berkas',  icon: 'fa-diagram-project', type: 'section' },
  ] : [
    { id: 'home',    label: 'Beranda',  icon: 'fa-house',           type: 'page'  },
    { id: 'profil',  label: 'Profil',   icon: 'fa-building-columns', type: 'route' },
    { id: 'sekolah', label: 'Sekolah',  icon: 'fa-school',          type: 'route' },
    { id: 'galeri',  label: 'Galeri',   icon: 'fa-images',           type: 'route' },
    { id: 'kalender', label: 'Kalender', icon: 'fa-calendar-days',  type: 'route' },
    { id: 'unduhan', label: 'Unduhan',  icon: 'fa-file-arrow-down', type: 'route' },
    { id: 'faq',     label: 'FAQ',      icon: 'fa-circle-question', type: 'route' },
  ];

  // Split into main items (first 6) and dropdown items (rest)
  const mainNavItems = navItems.slice(0, 6);
  const dropdownNavItems = navItems.slice(6);

  const getIsActive = (item: typeof navItems[0]) => {
    if (item.type === 'page' && activePage === 'home') return true;
    if (item.type === 'route' && activePage === item.id) return true;
    return false;
  };

  const handleItemClick = (item: typeof navItems[0]) => {
    setDrawerOpen(false);
    setDropdownOpen(false);
    if (item.type === 'page') goHome();
    else if (item.type === 'section') scrollOrNavigate(item.id);
    else router.push(`/${item.id}`);
  };

  return (
    <div className={drawerOpen ? 'drawer-open' : ''}>
      {/* ===== STATUS BAR ===== */}
      <div className="nav-status-bar">
        <div className="nav-status-bar-inner">
          <div className="nav-status-signal">
            <span className="nav-status-dot" />
            <span>Sistem Online</span>
          </div>
          <div className="nav-status-divider" />
          <span className="nav-status-text">
            <i className="fa-solid fa-school" />
            {schoolCount} Sekolah Terdaftar
          </span>
          <div className="nav-status-divider" />
          <span className="nav-status-text">
            <i className="fa-solid fa-shield-halved" />
            Kec. Cibadak Sukabumi
          </span>
        </div>
      </div>

      {/* ===== MAIN NAVBAR ===== */}
      <nav
        className={`landing-nav${navScrolled ? ' landing-nav--scrolled' : ''}`}
        role="navigation"
        aria-label="Navigasi utama"
      >
        {/* Logo Brand */}
        <button
          type="button"
          onClick={goHome}
          className="nav-brand-btn"
          aria-label="Kembali ke beranda"
        >
          <div className="nav-brand">
            <div className="logo-circle">
              <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
            </div>
            <div className="nav-brand-text">
              <h2>KORYANDIK</h2>
              <span className="brand-sub">KEC. CIBADAK</span>
            </div>
          </div>
        </button>

        {/* Desktop Nav Links with sliding pill indicator */}
        <div className="nav-links" ref={navLinksRef}>
          {/* Sliding active pill */}
          {activeIndicator.width > 0 && (
            <span
              className="nav-active-pill"
              style={{ left: activeIndicator.left, width: activeIndicator.width }}
              aria-hidden="true"
            />
          )}

          {mainNavItems.map((item) => {
            const isActive = getIsActive(item);
            return (
              <button
                key={item.id}
                type="button"
                ref={isActive ? activeButtonRef : null}
                className={`nav-link-btn${isActive ? ' is-active' : ''}`}
                onClick={() => handleItemClick(item)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </button>
            );
          })}

          {dropdownNavItems.length > 0 && (
            <div className="nav-dropdown" ref={dropdownRef}>
              <button
                type="button"
                className={`nav-link-btn nav-dropdown-btn${dropdownOpen ? ' is-active' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                Lainnya
                <i className={`fa-solid fa-chevron-down nav-dropdown-icon${dropdownOpen ? ' rotated' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="nav-dropdown-menu" role="menu">
                  {dropdownNavItems.map((item) => {
                    const isActive = getIsActive(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`nav-dropdown-item${isActive ? ' is-active' : ''}`}
                        onClick={() => handleItemClick(item)}
                        role="menuitem"
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <i className={`fa-solid ${item.icon} nav-dropdown-item-icon`} />
                        {item.label}
                        {isActive && <i className="fa-solid fa-check nav-dropdown-item-check" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="nav-actions">
          {onSearch && (
            <button
              type="button"
              onClick={onSearch}
              className="icon-action-btn"
              title="Cari (Ctrl+K)"
              aria-label="Buka pencarian cepat (Ctrl+K)"
            >
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </button>
          )}

          <VoiceCommand />

          <button
            type="button"
            className="theme-toggle"
            onClick={(e) => toggleThemeWithTransition(e)}
            aria-label="Ganti tema terang/gelap"
          >
            <i className="fa-solid fa-sun" aria-hidden="true" />
            <i className="fa-solid fa-moon" aria-hidden="true" />
          </button>

          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn btn-primary nav-login-btn"
            >
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              <span>Masuk</span>
            </button>
          )}

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="nav-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </nav>

      {/* ===== MOBILE SIDE DRAWER ===== */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu navigasi">
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="nav-brand">
                <div className="logo-circle logo-circle--sm">
                  <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
                </div>
                <div className="nav-brand-text">
                  <h2 style={{ fontSize: '15px' }}>KORYANDIK</h2>
                  <span className="brand-sub" style={{ fontSize: '7px' }}>KEC. CIBADAK</span>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            {/* Status chip */}
            <div className="drawer-status-chip">
              <span className="nav-status-dot nav-status-dot--sm" />
              <span>Sistem Online · {schoolCount} Sekolah</span>
            </div>

            {/* Search */}
            {onSearch && (
              <button
                type="button"
                className="drawer-search-btn"
                onClick={() => { setDrawerOpen(false); onSearch(); }}
              >
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <span>Pencarian Cepat</span>
                <kbd>⌘K</kbd>
              </button>
            )}

            {/* Nav Items */}
            <nav className="drawer-nav" aria-label="Menu utama">
              {navItems.map((item, index) => {
                const isActive = getIsActive(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`drawer-nav-item${isActive ? ' is-active' : ''}`}
                    onClick={() => handleItemClick(item)}
                    style={{ animationDelay: `${index * 45}ms` }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="drawer-nav-icon">
                      <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                    </span>
                    <span className="drawer-nav-label">{item.label}</span>
                    {isActive && <span className="drawer-nav-active-dot" aria-hidden="true" />}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="drawer-footer">
              <div className="drawer-footer-row">
                <span className="drawer-footer-label">
                  <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
                  Tema
                </span>
                <button
                  type="button"
                  className="theme-toggle"
                  onClick={(e) => toggleThemeWithTransition(e)}
                  aria-label="Ganti tema"
                >
                  <i className="fa-solid fa-sun" aria-hidden="true" />
                  <i className="fa-solid fa-moon" aria-hidden="true" />
                </button>
              </div>

              {onOpenLogin && (
                <button
                  type="button"
                  className="btn btn-primary drawer-login-btn"
                  onClick={() => { setDrawerOpen(false); onOpenLogin(); }}
                >
                  <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                  Masuk
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
