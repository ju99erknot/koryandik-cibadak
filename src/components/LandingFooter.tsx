'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getProfileSettings } from '@/lib/db';
import type { ProfileSettings } from '@/lib/types';

interface LandingFooterProps {
  schoolCount?: number;
  onScrollTo?: (id: string) => void;
  onOpenLogin?: () => void;
}

export default function LandingFooter({ schoolCount = 0, onOpenLogin }: LandingFooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const year = new Date().getFullYear();
  const [profile, setProfile] = useState<ProfileSettings | null>(null);

  useEffect(() => {
    getProfileSettings().then(setProfile);
  }, []);

  const navLinks = [
    { label: 'Beranda', icon: 'fa-house', action: () => isHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : router.push('/') },
    { label: 'Kalender', icon: 'fa-calendar-days', action: () => router.push('/kalender') },
    { label: 'Unduhan', icon: 'fa-download', action: () => router.push('/unduhan') },
    { label: 'Profil', icon: 'fa-building-columns', action: () => router.push('/profil') },
    { label: 'Galeri', icon: 'fa-images', action: () => router.push('/galeri') },
    { label: 'FAQ', icon: 'fa-circle-question', action: () => router.push('/faq') },
  ];

  const contactItems = [
    { icon: 'fa-location-dot', text: profile?.address || 'Jl. Pelabuhan II KM 20, Cibadak, Kab. Sukabumi' },
    { icon: 'fa-envelope', text: profile?.email || 'koryandik.cibadak@sukabumi.go.id' },
    { icon: 'fa-clock', text: 'Senin – Jumat, 08.00 – 15.00 WIB' },
  ];

  if (profile?.phone) {
    contactItems.splice(2, 0, { icon: 'fa-phone', text: profile.phone });
  }

  return (
    <footer className="ftx-root">
      {/* Top glowing accent line */}
      <div className="ftx-accent-line" aria-hidden="true" />

      {/* Ambient background orbs */}
      <div className="ftx-orb ftx-orb-1" aria-hidden="true" />
      <div className="ftx-orb ftx-orb-2" aria-hidden="true" />

      <div className="ftx-inner">

        {/* ─── BRAND BLOCK ─── */}
        <div className="ftx-brand-block">
          <div className="ftx-logo">
            <i className="fa-solid fa-graduation-cap" />
          </div>
          <div className="ftx-brand-text">
            <span className="ftx-brand-name">Koryandik</span>
            <span className="ftx-brand-sub">Kecamatan Cibadak</span>
          </div>
          <p className="ftx-brand-desc">
            Portal digital terpadu Koordinator Layanan Administrasi Pendidikan se-Kecamatan Cibadak, Kabupaten Sukabumi. Transparan, terstruktur, dan terintegrasi penuh.
          </p>

          {/* Contact pills */}
          <div className="ftx-contact-pills">
            <a
              href={`mailto:${profile?.email || 'koryandik.cibadak@sukabumi.go.id'}`}
              className="ftx-pill"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-solid fa-envelope" />
              <span>Email</span>
            </a>
            <a
              href={`https://www.google.com/maps?q=${profile?.lat || -6.895},${profile?.lng || 106.785}`}
              className="ftx-pill"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-solid fa-map-location-dot" />
              <span>Peta Lokasi</span>
            </a>
            <button type="button" className="ftx-pill ftx-pill-primary" onClick={onOpenLogin}>
              <i className="fa-solid fa-right-to-bracket" />
              <span>Masuk Portal</span>
            </button>
          </div>
        </div>

        {/* ─── DIVIDER ─── */}
        <div className="ftx-divider-v" aria-hidden="true" />

        {/* ─── LINKS BLOCK ─── */}
        <div className="ftx-links-block">
          <div className="ftx-links-col">
            <p className="ftx-col-label">Navigasi</p>
            <ul className="ftx-nav-list">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={link.action} className="ftx-nav-btn">
                    <i className={`fa-solid ${link.icon} ftx-nav-icon`} />
                    <span>{link.label}</span>
                    <i className="fa-solid fa-arrow-right ftx-nav-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="ftx-links-col">
            <p className="ftx-col-label">Sekretariat</p>
            <ul className="ftx-contact-list">
              {contactItems.map((item) => (
                <li key={item.icon} className="ftx-contact-item">
                  <span className="ftx-contact-icon-wrap">
                    <i className={`fa-solid ${item.icon}`} />
                  </span>
                  <span className="ftx-contact-text">{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Status badge */}
            <div className="ftx-status-badge">
              <span className="ftx-status-dot" />
              <span className="ftx-status-text">Semua Sistem Aktif</span>
              <span className="ftx-status-chip">99.9% Uptime</span>
            </div>
          </div>

          <div className="ftx-links-col">
            <p className="ftx-col-label">Statistik</p>
            <div className="ftx-stats-grid">
              <div className="ftx-stat-card">
                <span className="ftx-stat-num">{schoolCount || '49+'}</span>
                <span className="ftx-stat-label">Sekolah Binaan</span>
              </div>
              <div className="ftx-stat-card">
                <span className="ftx-stat-num">5</span>
                <span className="ftx-stat-label">Gugus Kerja</span>
              </div>
              <div className="ftx-stat-card ftx-stat-wide">
                <span className="ftx-stat-num">6</span>
                <span className="ftx-stat-label">Peran Pengguna</span>
              </div>
              <div className="ftx-stat-card ftx-stat-wide">
                <span className="ftx-stat-num">v5.0</span>
                <span className="ftx-stat-label">Versi Portal</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div className="ftx-bottom">
        <div className="ftx-bottom-inner">
          <p className="ftx-copy">
            &copy; {year} <strong>Koryandik Cibadak</strong> — Koordinator Layanan Administrasi Pendidikan Kecamatan Cibadak.
          </p>
          <p className="ftx-made">
            Dibuat dengan <i className="fa-solid fa-heart ftx-heart" aria-hidden="true" /> untuk Pendidikan Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
