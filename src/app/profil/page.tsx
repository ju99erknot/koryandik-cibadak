'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { GugusData, PengawasData } from '@/lib/schoolsData';
import { getGugusData, getSupervisors, getSchools, getProfileSettings } from '@/lib/db';
import type { ProfileSettings } from '@/lib/types';
import CommandPalette from '@/components/CommandPalette';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import LandingLocationMap from '@/components/LandingLocationMap';
import { toast } from 'sonner';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getGugusColor } from '@/lib/gugusThemes';
import { KORYANDIK_ADDRESS, KORYANDIK_CENTER } from '@/lib/mapConstants';
import { useScrollReveal } from '@/hooks/useScrollReveal';

type ProfileTab = 'visi-misi' | 'struktur' | 'kontak';

interface OrgPerson {
  id: string;
  name: string;
  role: string;
  nip: string;
  photoUrl: string;
  bio: string;
  email?: string;
  phone?: string;
}

const TABS: { id: ProfileTab; label: string; icon: string; color: string }[] = [
  { id: 'visi-misi', label: 'Visi & Misi', icon: 'fa-eye', color: '#3b82f6' },
  { id: 'struktur',  label: 'Struktur Organisasi', icon: 'fa-sitemap', color: '#8b5cf6' },
  { id: 'kontak',    label: 'Sekretariat', icon: 'fa-envelope', color: '#10b981' },
];

const CORE_VALUES = [
  { icon: 'fa-scale-balanced', label: 'Transparan', desc: 'Terbuka & dapat diaudit publik', color: '#3b82f6' },
  { icon: 'fa-shield-halved',  label: 'Akuntabel', desc: 'Bertanggung jawab penuh', color: '#8b5cf6' },
  { icon: 'fa-handshake',      label: 'Kolaboratif', desc: 'Sinergi lintas gugus', color: '#10b981' },
  { icon: 'fa-bolt',           label: 'Responsif', desc: 'Layanan cepat & tepat', color: '#f59e0b' },
];

function OfficeStatus() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && mins >= 480 && mins < 930;
  const color = isOpen ? '#10b981' : '#ef4444';
  return (
    <div className="profil-office-status" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 16px',
      borderRadius: '99px',
      background: `${color}14`,
      border: `1.5px solid ${color}40`,
      color,
      fontSize: '12px',
      fontWeight: 700,
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'currentColor',
        boxShadow: '0 0 8px currentColor',
        animation: isOpen ? 'office-pulse 2s ease-in-out infinite' : 'none',
      }} />
      {isOpen ? 'Kantor Buka' : 'Kantor Tutup'}
      <span style={{ opacity: 0.65, fontWeight: 500 }}>
        · {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
      </span>
    </div>
  );
}

export default function ProfilKoryandik() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('visi-misi');
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [supervisors, setSupervisors] = useState<PengawasData[]>([]);
  const [schoolCount, setSchoolCount] = useState(0);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [expandedGugus, setExpandedGugus] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<OrgPerson | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [schools, supervisors, profile] = await Promise.all([
        getSchools(),
        getSupervisors(),
        getProfileSettings(),
      ]);
      const guguses = await getGugusData(schools);
      setGuguses(guguses);
      setSupervisors(supervisors);
      setSchoolCount(schools.length);
      setProfile(profile);
    };
    loadData();
  }, []);

  useScrollReveal([activeTab, supervisors, guguses]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile?.email || 'koryandik.cibadak@sukabumi.go.id');
    toast.success('Email disalin ke papan klip!');
  };

  const pengawas = supervisors.find((s) => s.role === 'pengawas');
  const kkks = supervisors.find((s) => s.role === 'kkks');
  const pgri = supervisors.find((s) => s.role === 'pgri');

  const navigateHomeSection = (id: string) => router.push(`/#${id}`);

  const openPersonDetail = (
    id: string, name: string, role: string, nip: string, photo: string, bio: string
  ) => setSelectedPerson({
    id, name, role, nip, photoUrl: photo, bio,
    email: profile?.email || 'koryandik.cibadak@sukabumi.go.id',
    phone: profile?.phone || '(0266) 531234',
  });

  const missionItems = profile?.mission?.length ? profile.mission : [
    'Meningkatkan kualitas pelayanan administrasi kependidikan sekolah binaan secara digital dan terintegrasi.',
    'Mengoptimalkan koordinasi berkas SPJ, BOS, dan Dapodik secara transparan dan akuntabel.',
    'Meningkatkan pembinaan mutu profesionalisme pendidik dan tenaga kependidikan se-Kecamatan Cibadak.',
  ];

  const tabConfig = TABS.find(t => t.id === activeTab);

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Tab pill: konsisten dengan galeri/faq/sekolah ── */
        .profil-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 0 auto 32px;
          padding: 0 20px;
        }
        .profil-tab-pill {
          padding: 9px 18px !important;
          border-radius: 99px !important;
          border: 1.5px solid var(--card-border) !important;
          background: var(--card-glass) !important;
          backdrop-filter: blur(12px);
          color: var(--text-secondary) !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1) !important;
        }
        .profil-tab-pill:hover {
          border-color: var(--tab-color, var(--primary)) !important;
          color: var(--tab-color, var(--primary)) !important;
          transform: translateY(-2px) !important;
        }
        .profil-tab-pill.is-active {
          background: var(--tab-color, var(--primary)) !important;
          border-color: transparent !important;
          color: #fff !important;
          box-shadow: 0 8px 24px color-mix(in srgb, var(--tab-color, var(--primary)) 30%, transparent) !important;
        }

        /* ── Visi card ── */
        .profil-visi-card {
          position: relative;
          background: var(--card-glass) !important;
          border: 1.5px solid var(--card-border) !important;
          border-radius: 24px !important;
          padding: 40px !important;
          overflow: hidden;
          backdrop-filter: blur(20px);
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1) !important;
        }
        .profil-visi-card:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--primary) 40%, transparent) !important;
          box-shadow: 0 20px 50px color-mix(in srgb, var(--primary) 12%, transparent);
        }
        .profil-visi-card::before {
          content: '"';
          position: absolute;
          top: -20px;
          right: 20px;
          font-family: Georgia, serif;
          font-size: 220px;
          line-height: 1;
          color: var(--primary);
          opacity: 0.08;
          font-weight: 700;
          pointer-events: none;
        }
        .profil-visi-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 99px;
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .profil-visi-quote {
          font-size: clamp(18px, 2vw, 22px);
          line-height: 1.6;
          color: var(--text-primary);
          font-weight: 500;
          font-style: italic;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        /* ── Misi timeline ── */
        .profil-misi-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .profil-misi-card {
          position: relative;
          display: flex;
          gap: 20px;
          padding: 22px 24px;
          background: var(--card-glass);
          border: 1.5px solid var(--card-border);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .profil-misi-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--primary), var(--accent));
          transform: scaleY(0);
          transform-origin: center;
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .profil-misi-card:hover {
          transform: translateX(6px);
          border-color: color-mix(in srgb, var(--accent) 30%, transparent);
          box-shadow: 0 12px 32px color-mix(in srgb, var(--accent) 10%, transparent);
        }
        .profil-misi-card:hover::before { transform: scaleY(1); }
        .profil-misi-num {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 30%, transparent);
        }
        .profil-misi-text {
          flex: 1;
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
          padding-top: 10px;
        }

        /* ── Values grid ── */
        .profil-values {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-top: 32px;
        }
        .profil-value-card {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 18px 20px;
          background: var(--card-glass);
          border: 1.5px solid var(--card-border);
          border-radius: 18px;
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          position: relative;
          overflow: hidden;
        }
        .profil-value-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--val-color) 12%, transparent), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .profil-value-card:hover {
          transform: translateY(-4px);
          border-color: var(--val-color);
          box-shadow: 0 16px 36px color-mix(in srgb, var(--val-color) 18%, transparent);
        }
        .profil-value-card:hover::after { opacity: 1; }
        .profil-value-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--val-color) 14%, transparent);
          color: var(--val-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }
        .profil-value-label {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 3px;
        }
        .profil-value-desc {
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* ── Two-col wrapper for Visi & Misi ── */
        .profil-vm-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 20px;
        }
        @media (min-width: 900px) {
          .profil-vm-grid {
            grid-template-columns: 1.05fr 1fr;
          }
        }

        /* ── Organogram cards ── */
        .profil-org-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .profil-org-lead-wrap { position: relative; }
        .profil-org-lead-wrap::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          width: 2px;
          height: 44px;
          background: linear-gradient(180deg, var(--primary), var(--accent));
          transform: translateX(-50%);
        }
        .profil-org-connector-h {
          position: relative;
          width: 100%;
          max-width: 640px;
          height: 44px;
          margin-top: 44px;
        }
        .profil-org-connector-h::before {
          content: '';
          position: absolute;
          top: 0;
          left: 25%;
          right: 25%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent);
        }
        .profil-org-connector-h::after {
          content: '';
          position: absolute;
          top: 0;
          left: 25%;
          width: 2px;
          height: 44px;
          background: var(--accent);
        }
        .profil-org-connector-h .conn-right {
          position: absolute;
          top: 0;
          right: 25%;
          width: 2px;
          height: 44px;
          background: var(--accent);
        }
        .profil-org-partners {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 280px));
          gap: 40px;
          justify-content: center;
        }
        @media (max-width: 640px) {
          .profil-org-lead-wrap::before,
          .profil-org-connector-h { display: none; }
          .profil-org-partners { grid-template-columns: 1fr; }
        }

        .profil-org-card {
          position: relative;
          padding: 24px 20px;
          background: var(--card-glass);
          border: 1.5px solid var(--card-border);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          text-align: center;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .profil-org-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--org-color) 15%, transparent), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .profil-org-card:hover {
          transform: translateY(-6px);
          border-color: var(--org-color);
          box-shadow: 0 20px 44px color-mix(in srgb, var(--org-color) 22%, transparent);
        }
        .profil-org-card:hover::before { opacity: 1; }
        .profil-org-card.is-lead {
          width: 300px;
          border-width: 2px;
        }
        .profil-org-card.is-partner { width: 100%; }

        .profil-org-avatar {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 14px;
          border: 3px solid var(--card-border);
          background: color-mix(in srgb, var(--org-color) 12%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--org-color);
          font-size: 30px;
          transition: border-color 0.3s;
        }
        .profil-org-card:hover .profil-org-avatar {
          border-color: var(--org-color);
        }
        .profil-org-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .profil-org-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 99px;
          background: var(--org-color);
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }
        .profil-org-name {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .profil-org-nip {
          font-size: 11px;
          color: var(--text-muted);
          margin: 0 0 12px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .profil-org-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: var(--org-color);
          padding-top: 10px;
          border-top: 1px dashed var(--card-border);
          width: 100%;
          justify-content: center;
        }

        /* ── Section header ── */
        .profil-sec-head {
          text-align: center;
          margin: 56px auto 32px;
          max-width: 680px;
        }
        .profil-sec-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 99px;
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 14px;
          backdrop-filter: blur(8px);
        }
        .profil-sec-title {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary), var(--primary));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .profil-sec-caption {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.55;
        }

        /* ── Gugus grid ── */
        .profil-gugus-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          max-width: 1280px;
          margin: 32px auto 0;
          padding: 0 20px;
        }
        @media (max-width: 1200px) {
          .profil-gugus-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .profil-gugus-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .profil-gugus-grid { grid-template-columns: 1fr; }
        }
        .profil-gugus-card {
          padding: 20px;
          background: var(--card-glass);
          border: 1.5px solid var(--card-border);
          border-radius: 18px;
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          position: relative;
          overflow: hidden;
        }
        .profil-gugus-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--gugus-color), color-mix(in srgb, var(--gugus-color) 60%, #fff));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .profil-gugus-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--gugus-color) 10%, transparent), transparent 70%);
          opacity: 0;
          transition: opacity 0.35s;
          pointer-events: none;
        }
        .profil-gugus-card:hover {
          transform: translateY(-6px);
          border-color: var(--gugus-color);
          box-shadow: 0 16px 40px color-mix(in srgb, var(--gugus-color) 22%, transparent);
        }
        .profil-gugus-card:hover::before { transform: scaleX(1); }
        .profil-gugus-card:hover::after { opacity: 1; }
        .profil-gugus-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .profil-gugus-tag {
          padding: 4px 10px;
          border-radius: 99px;
          background: var(--gugus-color);
          color: #fff;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px color-mix(in srgb, var(--gugus-color) 40%, transparent);
        }
        .profil-gugus-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: color-mix(in srgb, var(--gugus-color) 12%, transparent);
          color: var(--gugus-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          transition: all 0.3s;
        }
        .profil-gugus-card:hover .profil-gugus-icon {
          background: var(--gugus-color);
          color: #fff;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--gugus-color) 40%, transparent);
        }
        .profil-gugus-coord {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .profil-gugus-wilayah {
          font-size: 11.5px;
          color: var(--text-muted);
          margin: 0 0 12px;
        }
        .profil-gugus-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px dashed var(--card-border);
          font-size: 11px;
          font-weight: 700;
          color: var(--gugus-color);
        }
        .profil-gugus-toggle i {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .profil-gugus-expand {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid color-mix(in srgb, var(--gugus-color) 25%, transparent);
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
          text-align: left;
          animation: profil-expand 0.3s ease;
        }
        @keyframes profil-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profil-gugus-expand strong { color: var(--gugus-color); }

        /* ── Kontak / Sekretariat Stacked Layout ── */
        .profil-kontak-stack {
          display: flex;
          flex-direction: column;
          gap: 36px;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .profil-kontak-top-card {
          position: relative;
          padding: 36px 32px;
          background: var(--card-glass);
          border: 1.5px solid var(--card-border);
          border-radius: 28px;
          backdrop-filter: blur(24px);
          overflow: hidden;
          box-shadow: 0 16px 40px color-mix(in srgb, #000 8%, transparent);
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .profil-kontak-top-card:hover {
          border-color: color-mix(in srgb, #10b981 35%, transparent);
          box-shadow: 0 20px 50px color-mix(in srgb, #10b981 12%, transparent);
        }
        .profil-kontak-top-card::before {
          content: '';
          position: absolute;
          top: -100px;
          right: -80px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, color-mix(in srgb, #10b981 16%, transparent), transparent 70%);
          pointer-events: none;
        }

        .profil-kontak-top-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 860px) {
          .profil-kontak-top-grid {
            grid-template-columns: 1fr 1.15fr;
            align-items: start;
          }
        }

        .profil-kontak-h {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 16px 0 12px;
        }
        .profil-kontak-h i {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          box-shadow: 0 6px 18px color-mix(in srgb, #10b981 35%, transparent);
        }
        .profil-kontak-addr {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0 0 14px;
        }
        .profil-kontak-coord {
          font-size: 11.5px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          margin: 0 0 24px;
          padding: 8px 14px;
          background: color-mix(in srgb, var(--text-muted) 6%, transparent);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .profil-kontak-coord i {
          color: #10b981;
        }

        .profil-kontak-lines {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .profil-kontak-line {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          background: color-mix(in srgb, var(--kline-color, var(--text-muted)) 5%, transparent);
          border: 1.5px solid transparent;
          text-align: left;
          width: 100%;
          font: inherit;
          color: inherit;
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .profil-kontak-line::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--kline-color);
          transform: scaleY(0);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .profil-kontak-line:hover::after { transform: scaleY(1); }
        .profil-kontak-line:hover {
          border-color: color-mix(in srgb, var(--kline-color) 30%, transparent);
          background: color-mix(in srgb, var(--kline-color) 10%, transparent);
          transform: translateX(4px);
        }
        .profil-kontak-line-btn { cursor: pointer; }
        .profil-kontak-line-btn:hover {
          box-shadow: 0 8px 24px color-mix(in srgb, var(--kline-color) 15%, transparent);
        }
        .profil-kontak-line-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background: color-mix(in srgb, var(--kline-color) 14%, transparent);
          color: var(--kline-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
          transition: all 0.3s;
        }
        .profil-kontak-line:hover .profil-kontak-line-icon {
          background: var(--kline-color);
          color: #fff;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--kline-color) 40%, transparent);
        }
        .profil-kontak-line-body { flex: 1; }
        .profil-kontak-line-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .profil-kontak-line-val {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .profil-kontak-line .profil-kontak-copy-hint {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--kline-color);
          opacity: 0;
          transition: opacity 0.25s;
          padding: 4px 10px;
          border-radius: 99px;
          background: color-mix(in srgb, var(--kline-color) 12%, transparent);
        }
        .profil-kontak-line:hover .profil-kontak-copy-hint { opacity: 1; }

        /* Quick actions bar */
        .profil-kontak-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }
        .profil-kontak-action-btn {
          flex: 1;
          min-width: 130px;
          padding: 13px 18px;
          border-radius: 14px;
          border: 1.5px solid var(--card-border);
          background: var(--card-glass);
          backdrop-filter: blur(8px);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: inherit;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-secondary);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          text-decoration: none;
        }
        .profil-kontak-action-btn i {
          font-size: 14px;
        }
        .profil-kontak-action-btn:hover {
          border-color: var(--action-color, var(--primary));
          color: var(--action-color, var(--primary));
          transform: translateY(-3px);
          box-shadow: 0 10px 28px color-mix(in srgb, var(--action-color, var(--primary)) 20%, transparent);
        }
        .profil-kontak-action-btn.is-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 8px 24px color-mix(in srgb, #10b981 30%, transparent);
        }
        .profil-kontak-action-btn.is-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px color-mix(in srgb, #10b981 40%, transparent);
        }

        /* Operating hours mini card */
        .profil-kontak-hours {
          margin-top: 16px;
          padding: 18px 20px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--text-muted) 4%, transparent);
          border: 1px solid var(--card-border);
        }
        .profil-kontak-hours-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .profil-kontak-hours-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .profil-kontak-hours-row + .profil-kontak-hours-row {
          border-top: 1px dashed var(--card-border);
          padding-top: 8px;
          margin-top: 4px;
        }
        .profil-kontak-hours-day {
          font-weight: 700;
          color: var(--text-primary);
        }
        .profil-kontak-hours-time {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11.5px;
          padding: 4px 10px;
          border-radius: 6px;
          background: color-mix(in srgb, #10b981 10%, transparent);
          color: #10b981;
          white-space: nowrap;
          font-weight: 600;
        }
        .profil-kontak-hours-closed {
          font-size: 11.5px;
          padding: 4px 10px;
          border-radius: 6px;
          background: color-mix(in srgb, #ef4444 10%, transparent);
          color: #ef4444;
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── Map Block — scoped overrides to match profil page design ── */
        .profil-kontak-map-block {
          border-radius: 28px;
          overflow: hidden;
        }
        .profil-kontak-map-block .landing-map-section {
          padding: 0 !important;
        }
        .profil-kontak-map-block .section-header-premium {
          margin-bottom: 32px;
        }
        .profil-kontak-map-block .section-eyebrow-premium {
          background: color-mix(in srgb, #10b981 10%, transparent);
          border-color: color-mix(in srgb, #10b981 25%, transparent);
          color: #10b981;
        }
        .profil-kontak-map-block .section-header-premium h2 {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary), #10b981);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }
        .profil-kontak-map-block .hero-gradient-text {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }
        .profil-kontak-map-block .section-header-premium p {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .profil-kontak-map-block .landing-map-shell {
          gap: 20px;
        }
        .profil-kontak-map-block .landing-map-frame {
          border-radius: 22px;
          border: 1.5px solid var(--card-border);
          box-shadow: 0 16px 40px color-mix(in srgb, #000 10%, transparent);
        }
        .profil-kontak-map-block .landing-map-coords-badge {
          background: var(--card-glass);
          backdrop-filter: blur(16px);
          border: 1px solid var(--card-border);
          color: var(--text-secondary);
          font-size: 10.5px;
        }
        .profil-kontak-map-block .landing-map-info {
          border-radius: 22px !important;
          background: var(--card-glass) !important;
          border: 1.5px solid var(--card-border) !important;
          backdrop-filter: blur(20px);
          box-shadow: none;
        }
        .profil-kontak-map-block .landing-map-info-glow {
          background: radial-gradient(circle, color-mix(in srgb, #10b981 20%, transparent), transparent 70%);
        }
        .profil-kontak-map-block .landing-map-info-icon {
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 12px;
          width: 42px;
          height: 42px;
          font-size: 17px;
        }
        .profil-kontak-map-block .landing-map-info-header h3 {
          font-size: 16px;
          font-weight: 800;
        }
        .profil-kontak-map-block .landing-map-live {
          color: #10b981;
        }
        .profil-kontak-map-block .landing-map-info-list li {
          font-size: 12.5px;
        }
        .profil-kontak-map-block .landing-map-info-list i {
          color: #10b981;
        }
        .profil-kontak-map-block .landing-map-stats div {
          background: color-mix(in srgb, #10b981 8%, transparent);
          border: 1px solid color-mix(in srgb, #10b981 16%, transparent);
          border-radius: 14px;
          padding: 14px 8px;
        }
        .profil-kontak-map-block .landing-map-stats strong {
          color: #10b981;
          font-size: 18px;
        }
        .profil-kontak-map-block .landing-map-stats span {
          font-size: 9.5px;
          color: var(--text-muted);
        }
        .profil-kontak-map-block .btn-primary {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          border-color: transparent !important;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 700;
          padding: 14px 20px;
          box-shadow: 0 8px 24px color-mix(in srgb, #10b981 30%, transparent);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .profil-kontak-map-block .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px color-mix(in srgb, #10b981 40%, transparent);
        }
        @media (max-width: 860px) {
          .profil-kontak-map-block .landing-map-shell {
            grid-template-columns: 1fr !important;
          }
          .profil-kontak-map-block .landing-map-frame {
            min-height: 320px;
          }
          .profil-kontak-map-block .landing-map-canvas {
            min-height: 320px;
          }
        }

        /* ── Person modal ── */
        .profil-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: color-mix(in srgb, #000 55%, transparent);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: profil-fade 0.25s ease-out;
        }
        .profil-modal-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: var(--card-glass);
          backdrop-filter: blur(24px);
          border: 1.5px solid var(--card-border);
          border-radius: 28px;
          padding: 32px 28px 24px;
          text-align: center;
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
          animation: profil-scale 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes profil-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes profil-scale {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        .profil-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--card-border);
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .profil-modal-close:hover { background: #ef4444; color: #fff; }
        .profil-modal-avatar {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 16px;
          border: 4px solid var(--primary);
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          color: #fff;
          box-shadow: 0 0 32px color-mix(in srgb, var(--primary) 40%, transparent);
        }
        .profil-modal-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profil-modal-badge {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 99px;
          background: color-mix(in srgb, var(--primary) 14%, transparent);
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);
          margin-bottom: 12px;
        }
        .profil-modal-name {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .profil-modal-nip {
          font-size: 11.5px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          margin: 0 0 20px;
        }
        .profil-modal-body {
          padding: 16px 18px;
          background: color-mix(in srgb, var(--text-muted) 5%, transparent);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          margin-bottom: 20px;
          text-align: left;
        }
        .profil-modal-body-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 8px;
        }
        .profil-modal-body p {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
        }
        .profil-modal-actions { display: flex; gap: 10px; }
        .profil-modal-btn {
          flex: 1;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          transition: all 0.2s;
          border: 1.5px solid var(--card-border);
        }
        .profil-modal-btn-ghost {
          background: var(--card-glass);
          color: var(--text-primary);
        }
        .profil-modal-btn-ghost:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .profil-modal-btn-solid {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 30%, transparent);
        }
        .profil-modal-btn-solid:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px color-mix(in srgb, var(--primary) 40%, transparent);
        }

        @keyframes office-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      ` }} />

      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', top: '-150px', left: '-150px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', top: '40%', right: '-80px', animationDelay: '2s' }} />
      </div>

      <LandingNav activePage="profil" onOpenLogin={() => router.push('/?login=1')} />

      <main className="static-page-main">
        {/* Hero */}
        <section className="pub-hero animate-fade-in">
          <div className="pub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-building-columns" />
            Profil &amp; Organisasi Koryandik
          </div>
          <h1 className="pub-hero-title">Koryandik Kec. Cibadak</h1>
          <p className="pub-hero-subtitle">
            Koordinator Layanan Administrasi Pendidikan Kecamatan Cibadak, Kabupaten Sukabumi — mengoordinasikan standar mutu, pembinaan guru, dan pelaporan SPJ sekolah dasar secara transparan.
          </p>

          <div className="pub-hero-stats">
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{schoolCount}</div>
              <div className="pub-hero-stat-label">Sekolah Binaan</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{guguses.length || 5}</div>
              <div className="pub-hero-stat-label">Gugus Wilayah</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{supervisors.length || 3}</div>
              <div className="pub-hero-stat-label">Personil Inti</div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="profil-tabs animate-fade-in" role="tablist" aria-label="Bagian profil">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`profil-tab-pill${activeTab === tab.id ? ' is-active' : ''}`}
              style={{ ['--tab-color' as string]: tab.color } as React.CSSProperties}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Visi & Misi */}
        {activeTab === 'visi-misi' && (
          <>
            <div className="profil-vm-grid">
              <article className="profil-visi-card reveal-on-scroll" style={{ ['--reveal-delay' as string]: '0ms' } as React.CSSProperties}>
                <div className="profil-visi-badge">
                  <i className="fa-solid fa-eye" /> Visi Kami
                </div>
                <p className="profil-visi-quote">
                  {profile?.vision || 'Terwujudnya pelayanan pendidikan prima yang transparan, akuntabel, dan berintegritas tinggi guna mendorong terwujudnya sekolah dasar binaan Kecamatan Cibadak yang unggul, cerdas, dan berkarakter mulia.'}
                </p>
              </article>

              <div className="profil-misi-wrap">
                {missionItems.map((item, idx) => (
                  <article
                    key={idx}
                    className="profil-misi-card reveal-on-scroll"
                    style={{ ['--reveal-delay' as string]: `${100 + idx * 80}ms` } as React.CSSProperties}
                  >
                    <div className="profil-misi-num">{String(idx + 1).padStart(2, '0')}</div>
                    <p className="profil-misi-text">{item}</p>
                  </article>
                ))}
              </div>
            </div>

            {/* Section: Nilai Inti */}
            <div className="profil-sec-head">
              <span className="profil-sec-eyebrow">
                <i className="fa-solid fa-star" style={{ color: '#f59e0b' }} /> Nilai Inti
              </span>
              <h2 className="profil-sec-title">Empat Prinsip Pelayanan Kami</h2>
              <p className="profil-sec-caption">
                Fondasi kerja Koryandik dalam setiap koordinasi berkas, pembinaan, dan pelaporan.
              </p>
            </div>

            <div className="profil-values" style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 20px' }}>
              {CORE_VALUES.map((v, idx) => (
                <div
                  key={v.label}
                  className="profil-value-card reveal-on-scroll"
                  style={{
                    ['--val-color' as string]: v.color,
                    ['--reveal-delay' as string]: `${idx * 80}ms`,
                  } as React.CSSProperties}
                >
                  <div className="profil-value-icon">
                    <i className={`fa-solid ${v.icon}`} />
                  </div>
                  <div>
                    <div className="profil-value-label">{v.label}</div>
                    <div className="profil-value-desc">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Struktur */}
        {activeTab === 'struktur' && (
          <>
            <div className="profil-org-wrap">
              <div className="profil-org-lead-wrap reveal-on-scroll">
                <div
                  className="profil-org-card is-lead"
                  style={{ ['--org-color' as string]: '#3b82f6' } as React.CSSProperties}
                  onClick={() => openPersonDetail(
                    'pengawas',
                    pengawas?.name || 'Koordinator',
                    'Koordinator Pelayanan',
                    pengawas?.nip || '—',
                    pengawas?.photoUrl || '',
                    'Memimpin penyelenggaraan koordinasi teknis dinas pendidikan di wilayah Cibadak, memverifikasi keterlaksanaan administrasi SPJ, serta mengarahkan pembinaan tata kelola guru se-Kecamatan.'
                  )}
                >
                  <div className="profil-org-avatar">
                    {pengawas?.photoUrl ? <img src={pengawas.photoUrl} alt={pengawas.name} /> : <i className="fa-solid fa-user-tie" />}
                  </div>
                  <span className="profil-org-badge">Koordinator Pelayanan</span>
                  <h3 className="profil-org-name">{pengawas?.name || 'Memuat…'}</h3>
                  <p className="profil-org-nip">NIP. {pengawas?.nip || '—'}</p>
                  <span className="profil-org-cta">
                    <i className="fa-solid fa-arrow-right" /> Lihat Detail
                  </span>
                </div>
              </div>

              <div className="profil-org-connector-h" aria-hidden="true">
                <span className="conn-right" />
              </div>

              <div className="profil-org-partners">
                <div
                  className="profil-org-card is-partner reveal-on-scroll"
                  style={{ ['--org-color' as string]: '#f59e0b', ['--reveal-delay' as string]: '80ms' } as React.CSSProperties}
                  onClick={() => openPersonDetail(
                    'kkks',
                    kkks?.name || 'Ketua KKKS',
                    'Ketua KKKS Cibadak',
                    kkks?.nip || '—',
                    kkks?.photoUrl || '',
                    'Mengoordinasikan Kelompok Kerja Kepala Sekolah di tingkat Kecamatan, menyinkronkan kebijakan dinas, dan membimbing kepala sekolah dalam tata kelola administrasi dana BOS dan pelaporan SPJ.'
                  )}
                >
                  <div className="profil-org-avatar">
                    {kkks?.photoUrl ? <img src={kkks.photoUrl} alt={kkks.name} /> : <i className="fa-solid fa-users-gear" />}
                  </div>
                  <span className="profil-org-badge">Ketua KKKS</span>
                  <h3 className="profil-org-name">{kkks?.name || 'Memuat…'}</h3>
                  <p className="profil-org-nip">NIP. {kkks?.nip || '—'}</p>
                  <span className="profil-org-cta">
                    <i className="fa-solid fa-arrow-right" /> Lihat Detail
                  </span>
                </div>

                <div
                  className="profil-org-card is-partner reveal-on-scroll"
                  style={{ ['--org-color' as string]: '#10b981', ['--reveal-delay' as string]: '160ms' } as React.CSSProperties}
                  onClick={() => openPersonDetail(
                    'pgri',
                    pgri?.name || 'Ketua PGRI',
                    'Ketua PGRI Cabang Cibadak',
                    pgri?.nip || '—',
                    pgri?.photoUrl || '',
                    'Memimpin cabang Persatuan Guru Republik Indonesia se-Kecamatan Cibadak, melindungi hak-hak guru, membina solidaritas, serta memimpin program peningkatan kompetensi pendidik profesional.'
                  )}
                >
                  <div className="profil-org-avatar">
                    {pgri?.photoUrl ? <img src={pgri.photoUrl} alt={pgri.name} /> : <i className="fa-solid fa-id-card" />}
                  </div>
                  <span className="profil-org-badge">Ketua PGRI</span>
                  <h3 className="profil-org-name">{pgri?.name || 'Memuat…'}</h3>
                  <p className="profil-org-nip">NIP. {pgri?.nip || '—'}</p>
                  <span className="profil-org-cta">
                    <i className="fa-solid fa-arrow-right" /> Lihat Detail
                  </span>
                </div>
              </div>
            </div>

            {/* Gugus section */}
            <div className="profil-sec-head">
              <span className="profil-sec-eyebrow">
                <i className="fa-solid fa-sitemap" style={{ color: '#8b5cf6' }} /> Pelaksana Wilayah
              </span>
              <h2 className="profil-sec-title">Lima Gugus Pelaksana</h2>
              <p className="profil-sec-caption">
                Klik salah satu kartu untuk melihat wilayah binaan &amp; status gugus.
              </p>
            </div>

            <div className="profil-gugus-grid">
              {guguses.map((g, idx) => {
                const accent = getGugusColor(g.id);
                const isExpanded = expandedGugus === g.id;
                return (
                  <div
                    key={g.id}
                    className="profil-gugus-card reveal-on-scroll"
                    style={{
                      ['--gugus-color' as string]: accent,
                      ['--reveal-delay' as string]: `${idx * 60}ms`,
                    } as React.CSSProperties}
                    onClick={() => setExpandedGugus(isExpanded ? null : g.id)}
                  >
                    <div className="profil-gugus-head">
                      <span className="profil-gugus-tag">Gugus {g.id}</span>
                      <div className="profil-gugus-icon"><i className="fa-solid fa-school" /></div>
                    </div>
                    <h5 className="profil-gugus-coord">{g.koordinator || '—'}</h5>
                    <p className="profil-gugus-wilayah">
                      {g.name.split('-')[1]?.trim() || g.name}
                    </p>
                    <div className="profil-gugus-toggle">
                      <span>{isExpanded ? 'Tutup Detail' : 'Lihat Detail'}</span>
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} />
                    </div>
                    {isExpanded && (
                      <div className="profil-gugus-expand">
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Wilayah:</strong> {g.name}
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Sekolah Inti:</strong> NPSN {g.sekolahInti}
                        </div>
                        <div>
                          <strong>Status:</strong> Aktif Terintegrasi
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Kontak / Sekretariat Stacked */}
        {activeTab === 'kontak' && (
          <div className="profil-kontak-stack">
            {/* Top Card: Sekretariat Info */}
            <article className="profil-kontak-top-card reveal-on-scroll" style={{ ['--reveal-delay' as string]: '0ms' } as React.CSSProperties}>
              <div className="profil-kontak-top-grid">
                {/* Left: General Info & Actions */}
                <div>
                  <OfficeStatus />

                  <h3 className="profil-kontak-h">
                    <i className="fa-solid fa-map-location-dot" /> Kantor Sekretariat Koryandik
                  </h3>
                  <p className="profil-kontak-addr">
                    Gedung Pelayanan Koryandik Cibadak<br />
                    {profile?.address || KORYANDIK_ADDRESS}
                  </p>
                  <div className="profil-kontak-coord">
                    <i className="fa-solid fa-location-crosshairs" />
                    {(profile?.lat ?? KORYANDIK_CENTER.lat).toFixed(6)}° S, {(profile?.lng ?? KORYANDIK_CENTER.lng).toFixed(6)}° E
                  </div>

                  <div className="profil-kontak-actions">
                    <a
                      href={`mailto:${profile?.email || 'koryandik.cibadak@sukabumi.go.id'}`}
                      className="profil-kontak-action-btn"
                      style={{ ['--action-color' as string]: '#8b5cf6' } as React.CSSProperties}
                    >
                      <i className="fa-solid fa-envelope" /> Kirim Email
                    </a>
                    <button
                      type="button"
                      className="profil-kontak-action-btn is-primary"
                      onClick={() => {
                        const mapUrl = `https://www.google.com/maps?q=${profile?.lat ?? KORYANDIK_CENTER.lat},${profile?.lng ?? KORYANDIK_CENTER.lng}`;
                        window.open(mapUrl, '_blank');
                      }}
                    >
                      <i className="fa-solid fa-diamond-turn-right" /> Petunjuk Arah
                    </button>
                  </div>
                </div>

                {/* Right: Contact Lines & Operating Hours */}
                <div>
                  <div className="profil-kontak-lines">
                    <div className="profil-kontak-line" style={{ ['--kline-color' as string]: '#3b82f6' } as React.CSSProperties}>
                      <div className="profil-kontak-line-icon">
                        <i className="fa-solid fa-phone" />
                      </div>
                      <div className="profil-kontak-line-body">
                        <div className="profil-kontak-line-label">Telepon Dinas</div>
                        <div className="profil-kontak-line-val">{profile?.phone || '(0266) 531234'}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="profil-kontak-line profil-kontak-line-btn"
                      onClick={handleCopyEmail}
                      style={{ ['--kline-color' as string]: '#8b5cf6' } as React.CSSProperties}
                    >
                      <div className="profil-kontak-line-icon">
                        <i className="fa-solid fa-envelope" />
                      </div>
                      <div className="profil-kontak-line-body">
                        <div className="profil-kontak-line-label">Email Resmi</div>
                        <div className="profil-kontak-line-val">
                          {profile?.email || 'koryandik.cibadak@sukabumi.go.id'}
                        </div>
                      </div>
                      <span className="profil-kontak-copy-hint">
                        <i className="fa-solid fa-copy" /> Salin
                      </span>
                    </button>

                    <div className="profil-kontak-line" style={{ ['--kline-color' as string]: '#10b981' } as React.CSSProperties}>
                      <div className="profil-kontak-line-icon">
                        <i className="fa-brands fa-whatsapp" />
                      </div>
                      <div className="profil-kontak-line-body">
                        <div className="profil-kontak-line-label">WhatsApp Koordinasi</div>
                        <div className="profil-kontak-line-val">{profile?.phone || '0812-xxxx-xxxx'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="profil-kontak-hours">
                    <div className="profil-kontak-hours-head">
                      <i className="fa-solid fa-clock" /> Jam Operasional Pelayanan
                    </div>
                    <div className="profil-kontak-hours-row">
                      <span className="profil-kontak-hours-day">Senin – Kamis</span>
                      <span className="profil-kontak-hours-time">08.00 – 15.30 WIB</span>
                    </div>
                    <div className="profil-kontak-hours-row">
                      <span className="profil-kontak-hours-day">Jumat</span>
                      <span className="profil-kontak-hours-time">08.00 – 14.30 WIB</span>
                    </div>
                    <div className="profil-kontak-hours-row">
                      <span className="profil-kontak-hours-day">Sabtu – Minggu</span>
                      <span className="profil-kontak-hours-closed">Tutup</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Bottom: Full Location Map Showcase */}
            <div className="profil-kontak-map-block reveal-on-scroll" style={{ ['--reveal-delay' as string]: '120ms' } as React.CSSProperties}>
              <LandingLocationMap
                schoolCount={schoolCount}
                gugusCount={guguses.length || 5}
                profileSettings={profile}
                compact={false}
              />
            </div>
          </div>
        )}
      </main>

      {/* Person modal */}
      {selectedPerson && (
        <div className="profil-modal-overlay" onClick={() => setSelectedPerson(null)}>
          <div className="profil-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="profil-modal-close"
              onClick={() => setSelectedPerson(null)}
              aria-label="Tutup"
            >
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="profil-modal-avatar">
              {selectedPerson.photoUrl
                ? <img src={selectedPerson.photoUrl} alt={selectedPerson.name} />
                : <i className="fa-solid fa-user-tie" />
              }
            </div>
            <span className="profil-modal-badge">{selectedPerson.role}</span>
            <h2 className="profil-modal-name">{selectedPerson.name}</h2>
            <p className="profil-modal-nip">NIP. {selectedPerson.nip}</p>
            <div className="profil-modal-body">
              <div className="profil-modal-body-label">
                <i className="fa-solid fa-circle-info" /> Tugas Pokok &amp; Wewenang
              </div>
              <p>{selectedPerson.bio}</p>
            </div>
            <div className="profil-modal-actions">
              <a
                href={`mailto:${selectedPerson.email}`}
                className="profil-modal-btn profil-modal-btn-ghost"
              >
                <i className="fa-solid fa-envelope" /> Email
              </a>
              <button
                type="button"
                className="profil-modal-btn profil-modal-btn-solid"
                onClick={() => { setSelectedPerson(null); toast.success('Panggilan disiapkan.'); }}
              >
                <i className="fa-solid fa-phone" /> Kontak
              </button>
            </div>
          </div>
        </div>
      )}

      <LandingFooter
        schoolCount={schoolCount}
        onScrollTo={navigateHomeSection}
        onOpenLogin={() => router.push('/?login=1')}
      />

      <CommandPalette currentUser={null} onThemeToggle={(e) => toggleThemeWithTransition(e)} />
    </div>
  );
}
