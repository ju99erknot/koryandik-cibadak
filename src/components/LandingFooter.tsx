'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getProfileSettings } from '@/lib/db';
import type { ProfileSettings } from '@/lib/types';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

interface LandingFooterProps {
  schoolCount?: number;
  onScrollTo?: (id: string) => void;
  onOpenLogin?: () => void;
}

export default function LandingFooter({ schoolCount = 49, onScrollTo, onOpenLogin }: LandingFooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const year = new Date().getFullYear();
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    getProfileSettings().then(setProfile);
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyEmail = (emailStr: string) => {
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const navLinks = [
    { label: 'Beranda', icon: 'fa-house', path: '/' },
    { label: 'Sekolah Binaan', icon: 'fa-school', path: '/sekolah' },
    { label: 'Profil Koryandik', icon: 'fa-building-columns', path: '/profil' },
    { label: 'Galeri Kegiatan', icon: 'fa-images', path: '/galeri' },
    { label: 'Kalender Akademik', icon: 'fa-calendar-days', path: '/kalender' },
    { label: 'FAQ & Bantuan', icon: 'fa-circle-question', path: '/faq' },
    { label: 'Pusat Unduhan', icon: 'fa-download', path: '/unduhan' },
  ];

  const rolePortals = [
    { label: 'Portal Sekolah', role: 'school', icon: 'fa-school', badge: 'SD se-Kecamatan' },
    { label: 'Portal Gugus', role: 'gugus', icon: 'fa-sitemap', badge: 'Gugus I - V' },
    { label: 'Portal Pengawas', role: 'pengawas', icon: 'fa-user-check', badge: 'Pengawas Bina' },
    { label: 'Portal KKKS', role: 'kkks', icon: 'fa-chalkboard-teacher', badge: 'Kepala Sekolah' },
    { label: 'Portal PGRI', role: 'pgri', icon: 'fa-award', badge: 'Pengurus Cabang' },
    { label: 'Portal Admin', role: 'admin', icon: 'fa-shield-halved', badge: 'Administrator' },
  ];

  const socialLinks = [
    { label: 'Instagram', icon: 'fa-instagram', url: 'https://instagram.com', color: '#e1306c' },
    { label: 'Facebook', icon: 'fa-facebook', url: 'https://facebook.com', color: '#1877f2' },
    { label: 'YouTube', icon: 'fa-youtube', url: 'https://youtube.com', color: '#ff0000' },
    { label: 'TikTok', icon: 'fa-tiktok', url: 'https://tiktok.com', color: '#00f2fe' },
    { label: 'Telegram', icon: 'fa-telegram', url: 'https://t.me', color: '#229ed9' },
  ];

  const emailAddress = profile?.email || 'koryandik.cibadak@sukabumi.go.id';
  const phoneNumber = profile?.phone || '0812-3456-7890';
  const addressText = profile?.address || 'Koryandik Cibadak, Kec. Cibadak, Kab. Sukabumi, Jawa Barat';
  const waNumber = formatPhoneForWhatsApp(phoneNumber);
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Admin Koryandik Cibadak, saya ingin bertanya terkait portal layanan administrasi.')}` : '#';

  return (
    <footer className="ftx-root">
      {/* Top ambient glowing accent line */}
      <div className="ftx-accent-line" aria-hidden="true" />

      {/* Ambient background blur orbs */}
      <div className="ftx-orb ftx-orb-1" aria-hidden="true" />
      <div className="ftx-orb ftx-orb-2" aria-hidden="true" />

      <div className="ftx-container">
        {/* ─── 1. CALLOUT PRE-FOOTER BANNER ─── */}
        <div className="ftx-banner-card">
          <div className="ftx-banner-glow" aria-hidden="true" />
          <div className="ftx-banner-content">
            <div className="ftx-banner-text">
              <span className="ftx-banner-badge">
                <i className="fa-solid fa-sparkles" aria-hidden="true" /> Portal Administrasi Digital
              </span>
              <h2>Siap Mengelola &amp; Memantau Berkas Sekolah?</h2>
              <p>
                Kelola pelaporan SPJ BOS, dokumen administrasi, dan koordinasi gugus wilayah se-Kecamatan Cibadak dalam satu portal terpadu.
              </p>
            </div>
            <div className="ftx-banner-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg ftx-banner-btn-primary"
                onClick={onOpenLogin}
              >
                <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                <span>Masuk Portal Koryandik</span>
              </button>
              {isHome && onScrollTo ? (
                <button
                  type="button"
                  className="btn btn-outline btn-lg ftx-banner-btn-secondary"
                  onClick={() => onScrollTo('cek-status')}
                >
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <span>Cek Status Berkas</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-lg ftx-banner-btn-secondary"
                  onClick={() => router.push('/unduhan')}
                >
                  <i className="fa-solid fa-download" aria-hidden="true" />
                  <span>Pusat Unduhan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. MAIN FOOTER GRID (4 COLUMNS) ─── */}
        <div className="ftx-main-grid">
          {/* COLUMN 1: BRAND & IDENTITY */}
          <div className="ftx-col ftx-col-brand">
            <div className="ftx-brand-header">
              <div className="ftx-brand-logo">
                <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
              </div>
              <div className="ftx-brand-titles">
                <span className="ftx-brand-title">Koryandik</span>
                <span className="ftx-brand-subtitle">Kecamatan Cibadak</span>
              </div>
            </div>

            <p className="ftx-brand-desc">
              Koordinator Layanan Administrasi Pendidikan Dasar Kecamatan Cibadak, Kabupaten Sukabumi — mengintegrasikan pelaporan digital, supervisi pengawas, dan transparansi publik se-49 sekolah binaan di 5 gugus wilayah.
            </p>

            {/* Live Uptime Status Badge */}
            <div className="ftx-status-badge">
              <span className="ftx-status-dot" />
              <span className="ftx-status-label">Semua Sistem Aktif</span>
              <span className="ftx-status-chip">99.9% Uptime</span>
            </div>

            {/* Quick Action Chips */}
            <div className="ftx-brand-chips">
              <button
                type="button"
                className="ftx-chip"
                onClick={() => handleCopyEmail(emailAddress)}
                title="Salin Email Resmi"
              >
                <i className={`fa-solid ${copiedEmail ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
                <span>{copiedEmail ? 'Email Tersalin!' : 'Salin Email'}</span>
              </button>
              <a
                href={`https://www.google.com/maps?q=${profile?.lat || -6.895},${profile?.lng || 106.785}`}
                className="ftx-chip"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                <span>Peta GPS</span>
              </a>
            </div>
          </div>

          {/* COLUMN 2: NAVIGATION LINKS */}
          <div className="ftx-col">
            <h4 className="ftx-col-title">
              <i className="fa-solid fa-compass" aria-hidden="true" /> Jelajahi Portal
            </h4>
            <ul className="ftx-menu-list">
              {navLinks.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      className={`ftx-menu-btn ${isActive ? 'is-active' : ''}`}
                      onClick={() => {
                        if (isHome && item.path === '/') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          router.push(item.path);
                        }
                      }}
                    >
                      <i className={`fa-solid ${item.icon} ftx-menu-icon`} aria-hidden="true" />
                      <span>{item.label}</span>
                      <i className="fa-solid fa-chevron-right ftx-menu-arrow" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* COLUMN 3: PORTAL ACCESS */}
          <div className="ftx-col">
            <h4 className="ftx-col-title">
              <i className="fa-solid fa-user-lock" aria-hidden="true" /> Akses Portal Peran
            </h4>
            <div className="ftx-portals-grid">
              {rolePortals.map((roleItem) => (
                <button
                  key={roleItem.role}
                  type="button"
                  className="ftx-role-card"
                  onClick={onOpenLogin}
                >
                  <div className="ftx-role-icon">
                    <i className={`fa-solid ${roleItem.icon}`} aria-hidden="true" />
                  </div>
                  <div className="ftx-role-info">
                    <span className="ftx-role-title">{roleItem.label}</span>
                    <span className="ftx-role-badge">{roleItem.badge}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* COLUMN 4: CONTACT & SOCIALS */}
          <div className="ftx-col">
            <h4 className="ftx-col-title">
              <i className="fa-solid fa-headset" aria-hidden="true" /> Kontak Sekretariat
            </h4>

            <ul className="ftx-contact-list">
              <li>
                <div className="ftx-contact-icon">
                  <i className="fa-solid fa-location-dot" aria-hidden="true" />
                </div>
                <div className="ftx-contact-info">
                  <span className="ftx-contact-label">Alamat Sekretariat</span>
                  <span className="ftx-contact-val">{addressText}</span>
                </div>
              </li>
              <li>
                <div className="ftx-contact-icon">
                  <i className="fa-solid fa-envelope" aria-hidden="true" />
                </div>
                <div className="ftx-contact-info">
                  <span className="ftx-contact-label">Email Resmi</span>
                  <a href={`mailto:${emailAddress}`} className="ftx-contact-link">
                    {emailAddress}
                  </a>
                </div>
              </li>
              <li>
                <div className="ftx-contact-icon">
                  <i className="fa-solid fa-phone-flip" aria-hidden="true" />
                </div>
                <div className="ftx-contact-info">
                  <span className="ftx-contact-label">Telepon / WhatsApp</span>
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="ftx-contact-link">
                    {phoneNumber}
                  </a>
                </div>
              </li>
              <li>
                <div className="ftx-contact-icon">
                  <i className="fa-solid fa-clock" aria-hidden="true" />
                </div>
                <div className="ftx-contact-info">
                  <span className="ftx-contact-label">Jam Layanan Kantor</span>
                  <span className="ftx-contact-val">Senin – Jumat, 08.00 – 15.00 WIB</span>
                </div>
              </li>
            </ul>

            {/* Social media links */}
            <div className="ftx-social-section">
              <span className="ftx-social-label">Ikuti Media Sosial:</span>
              <div className="ftx-social-chips">
                {socialLinks.map((soc) => (
                  <a
                    key={soc.label}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ftx-social-chip"
                    title={soc.label}
                    style={{ '--soc-color': soc.color } as React.CSSProperties}
                  >
                    <i className={`fa-brands ${soc.icon}`} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. STATS STRIP ─── */}
        <div className="ftx-stats-strip">
          <div className="ftx-stat-box">
            <span className="ftx-stat-number">{schoolCount || '49'}</span>
            <span className="ftx-stat-title">Sekolah Binaan SD</span>
          </div>
          <div className="ftx-stat-divider" aria-hidden="true" />
          <div className="ftx-stat-box">
            <span className="ftx-stat-number">5</span>
            <span className="ftx-stat-title">Gugus Kerja Wilayah</span>
          </div>
          <div className="ftx-stat-divider" aria-hidden="true" />
          <div className="ftx-stat-box">
            <span className="ftx-stat-number">6</span>
            <span className="ftx-stat-title">Peran Akses Terintegrasi</span>
          </div>
          <div className="ftx-stat-divider" aria-hidden="true" />
          <div className="ftx-stat-box">
            <span className="ftx-stat-number">100%</span>
            <span className="ftx-stat-title">Format Google Drive</span>
          </div>
        </div>

        {/* ─── 4. BOTTOM BAR ─── */}
        <div className="ftx-bottom-bar">
          <div className="ftx-copy-text">
            &copy; {year} <strong>Koryandik Cibadak</strong> — Sekretariat Layanan Administrasi Pendidikan Kecamatan Cibadak, Kab. Sukabumi.
          </div>

          <div className="ftx-made-text">
            Dibuat dengan <i className="fa-solid fa-heart ftx-heart-icon" aria-hidden="true" /> untuk Kemajuan Pendidikan Indonesia
          </div>

          <button
            type="button"
            className="ftx-backtop-btn"
            onClick={handleBackToTop}
            title="Kembali ke Atas"
          >
            <span>Ke Atas</span>
            <i className="fa-solid fa-arrow-up" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
