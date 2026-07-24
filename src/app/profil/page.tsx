'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GugusData, PengawasData } from '@/lib/schoolsData';
import { getGugusData, getSupervisors, getSchools, getProfileSettings } from '@/lib/db';
import type { ProfileSettings } from '@/lib/types';
import CommandPalette from '@/components/CommandPalette';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import { toast } from 'sonner';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getGugusColor } from '@/lib/gugusThemes';
import { KORYANDIK_ADDRESS } from '@/lib/mapConstants';
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

const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'visi-misi', label: 'Visi & Misi', icon: 'fa-eye' },
  { id: 'struktur', label: 'Struktur Organisasi', icon: 'fa-sitemap' },
  { id: 'kontak', label: 'Sekretariat', icon: 'fa-envelope' },
];

export default function ProfilKoryandik() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('visi-misi');
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [supervisors, setSupervisors] = useState<PengawasData[]>([]);
  const [schoolCount, setSchoolCount] = useState(0);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [expandedGugus, setExpandedGugus] = useState<string | null>(null);
  
  // State for interactive organogram details popover
  const [selectedPerson, setSelectedPerson] = useState<OrgPerson | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [schools, supervisors, profile] = await Promise.all([
        getSchools(),
        getSupervisors(),
        getProfileSettings()
      ]);
      // Pass existingSchools to avoid duplicate fetch inside getGugusData
      const guguses = await getGugusData(schools);
      setGuguses(guguses);
      setSupervisors(supervisors);
      setSchoolCount(schools.length);
      setProfile(profile);
    };
    loadData();
  }, []);

  // Call scroll reveal hook
  useScrollReveal([activeTab, supervisors, guguses]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile?.email || 'koryandik.cibadak@sukabumi.go.id');
    toast.success('Email disalin ke papan klip!');
  };

  const pengawas = supervisors.find((s) => s.role === 'pengawas');
  const kkks = supervisors.find((s) => s.role === 'kkks');
  const pgri = supervisors.find((s) => s.role === 'pgri');

  const navigateHomeSection = (id: string) => router.push(`/#${id}`);

  // Helper to open person detail
  const openPersonDetail = (id: string, name: string, role: string, nip: string, photo: string, bio: string) => {
    setSelectedPerson({
      id,
      name,
      role,
      nip,
      photoUrl: photo,
      bio,
      email: profile?.email || 'koryandik.cibadak@sukabumi.go.id',
      phone: profile?.phone || '(0266) 531234'
    });
  };

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        .static-tab-btn {
          border-radius: 12px !important;
          transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1) !important;
          border: 1px solid var(--card-border) !important;
          background: transparent !important;
          color: var(--text-secondary) !important;
          white-space: nowrap !important;
        }
        .static-tab-btn:hover {
          transform: translateY(-2px);
          border-color: var(--primary) !important;
          color: var(--text-primary) !important;
        }
        .static-tab-btn.is-active {
          background: linear-gradient(135deg, var(--primary), var(--accent)) !important;
          color: #fff !important;
          border-color: transparent !important;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25) !important;
        }
        .profile-card {
          border-radius: 24px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important;
          background: var(--card-glass) !important;
          border: 1px solid var(--card-border) !important;
        }
        .profile-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08) !important;
        }
        
        /* 3D Organogram Specific Styles */
        .org-tree-container-3d {
          perspective: 1200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 40px 20px 80px;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }
        
        .org-node-3d {
          position: relative;
          border-radius: 24px !important;
          background: var(--card-glass) !important;
          border: 1px solid var(--card-border) !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03) !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease !important;
          transform-style: preserve-3d;
          cursor: pointer;
          padding: 24px !important;
          text-align: center;
          width: 280px;
          z-index: 10;
        }
        
        .org-node-3d:hover {
          transform: translateY(-10px) rotateX(6deg) rotateY(-4deg) !important;
          border-color: var(--primary) !important;
          box-shadow: 0 25px 50px rgba(59, 130, 246, 0.15), 0 0 25px var(--primary-glow) !important;
        }
        
        .org-node-3d::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 60%);
          pointer-events: none;
        }
        
        .org-node-3d--lead {
          border: 2px solid var(--primary) !important;
          box-shadow: 0 10px 35px rgba(59, 130, 246, 0.15) !important;
          width: 320px;
        }
        
        .org-node-3d--lead:hover {
          box-shadow: 0 25px 60px rgba(59, 130, 246, 0.25) !important;
        }
        
        .org-avatar-3d {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          margin: 0 auto 12px;
          overflow: hidden;
          border: 3px solid var(--card-border);
          transition: border-color 0.3s ease;
          background: var(--card-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .org-node-3d:hover .org-avatar-3d {
          border-color: var(--primary);
        }
        
        .org-avatar-3d img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .org-avatar-3d i {
          font-size: 28px;
          color: var(--text-secondary);
        }
        
        /* Pulse Line Connectors */
        @keyframes connectorPulse {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
        
        .org-pulse-line-v {
          width: 3px;
          height: 48px;
          margin: 0 auto;
          background: linear-gradient(180deg, var(--primary), var(--accent), var(--primary));
          background-size: 200% 200%;
          animation: connectorPulse 3s linear infinite;
          box-shadow: 0 0 6px var(--primary-glow);
        }
        
        .org-pulse-line-v-long {
          height: 70px;
        }
        
        .org-pulse-bridge {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        
        .org-pulse-line-h {
          height: 3px;
          width: calc(50% - 100px);
          position: absolute;
          top: 0;
          background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary));
          background-size: 200% 200%;
          animation: connectorPulse 3s linear infinite;
          box-shadow: 0 0 6px var(--primary-glow);
        }
        
        .org-pulse-line-h--left {
          left: 20%;
          width: 30%;
        }
        
        .org-pulse-line-h--right {
          right: 20%;
          width: 30%;
        }
        
        .org-partners-grid-3d {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 60px;
          width: 100%;
          max-width: 800px;
          justify-items: center;
          position: relative;
          margin-bottom: 20px;
        }
        
        .org-gugus-grid-3d {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          width: 100%;
          margin-top: 24px;
        }
        @media (max-width: 900px) {
          .org-gugus-grid-3d {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 600px) {
          .org-gugus-grid-3d {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .org-gugus-card-3d {
          width: 100% !important;
          padding: 20px !important;
        }
        
        .org-gugus-card-3d:hover {
          border-color: var(--gugus-accent) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 0 15px var(--gugus-accent) !important;
        }
        
        .org-gugus-card-3d .badge {
          background: var(--gugus-accent);
          color: #fff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 10px;
          fontWeight: bold;
        }
      ` }} />
      
      <LandingNav
        activePage="profil"
        onOpenLogin={() => router.push('/?login=1')}
      />

      <main className="static-page-main">
        {/* Hero Banner */}
        <section className="pub-hero animate-fade-in">
          <div className="pub-hero-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <i className="fa-solid fa-building-columns" />
            <span>Profil &amp; Organisasi Koryandik</span>
          </div>
          <h1 className="galeri-title-gradient">
            Koryandik Kec. Cibadak
          </h1>
          <p className="pub-hero-subtitle" style={{ maxWidth: '680px', margin: '0 auto 30px' }}>
            Koordinator Layanan Administrasi Pendidikan Kecamatan Cibadak, Kabupaten Sukabumi — mengoordinasikan standar mutu, pembinaan guru, dan pelaporan SPJ sekolah dasar secara transparan.
          </p>

          {/* Stats strip */}
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
              <div className="pub-hero-stat-label">Supervisor</div>
            </div>
          </div>
        </section>

        {/* Tab Menu Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 20px' }}>
          <div className="static-tabs neat-tabs no-print animate-fade-in" role="tablist" aria-label="Bagian profil">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`static-tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`fa-solid ${tab.icon}`} aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visi Misi Tab */}
        {activeTab === 'visi-misi' && (
          <div className="static-tab-panel profile-visi-grid">
            <article className="card profile-card profile-card--primary reveal-on-scroll" style={{ ['--reveal-delay' as string]: '0ms' }}>
              <div className="profile-card-head">
                <div className="profile-card-icon profile-card-icon--primary">
                  <i className="fa-solid fa-eye" aria-hidden="true" />
                </div>
                <div>
                  <h2>Visi Kami</h2>
                  <span>Masa depan cerdas &amp; berkarakter</span>
                </div>
              </div>
              <p className="profile-card-body profile-quote">
                &ldquo;{profile?.vision || 'Terwujudnya pelayanan pendidikan prima yang transparan, akuntabel, dan berintegritas tinggi guna mendorong terwujudnya sekolah dasar binaan Kecamatan Cibadak yang unggul, cerdas, dan berkarakter mulia.'}&rdquo;
              </p>
            </article>

            <article className="card profile-card profile-card--accent reveal-on-scroll" style={{ ['--reveal-delay' as string]: '100ms' }}>
              <div className="profile-card-head">
                <div className="profile-card-icon profile-card-icon--accent">
                  <i className="fa-solid fa-bullseye" aria-hidden="true" />
                </div>
                <div>
                  <h2>Misi Kami</h2>
                  <span>Langkah strategis pelayanan</span>
                </div>
              </div>
              <ul className="profile-card-list">
                {profile?.mission ? (
                  profile.mission.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <>
                    <li>Meningkatkan kualitas pelayanan administrasi kependidikan sekolah binaan secara digital dan terintegrasi.</li>
                    <li>Mengoptimalkan koordinasi berkas SPJ, BOS, dan Dapodik secara transparan dan akuntabel.</li>
                    <li>Meningkatkan pembinaan mutu profesionalisme pendidik dan tenaga kependidikan se-Kecamatan Cibadak.</li>
                  </>
                )}
              </ul>
            </article>
          </div>
        )}

        {/* 3D Organogram Tab */}
        {activeTab === 'struktur' && (
          <div className="static-tab-panel">
            <div className="org-tree-container-3d">
              {/* Leader Node: Koordinator Pelayanan */}
              <div 
                className="org-node-3d org-node-3d--lead reveal-on-scroll"
                onClick={() => openPersonDetail(
                  'pengawas',
                  pengawas?.name || 'Tuti Sumiati, S.Pd.',
                  'Koordinator Pelayanan',
                  pengawas?.nip || '197410052006042004',
                  pengawas?.photoUrl || '',
                  'Memimpin penyelenggaraan koordinasi teknis dinas pendidikan di wilayah Cibadak, memverifikasi keterlaksanaan administrasi SPJ, serta mengarahkan pembinaan tata kelola guru se-Kecamatan.'
                )}
              >
                <div className="org-avatar-3d">
                  {pengawas?.photoUrl ? (
                    <img src={pengawas.photoUrl} alt={pengawas.name} />
                  ) : (
                    <i className="fa-solid fa-user-tie" />
                  )}
                </div>
                <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '12px' }}>
                  Koordinator Pelayanan
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '8px 0 2px' }}>
                  {pengawas?.name || 'Memuat…'}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                  NIP. {pengawas?.nip || '—'}
                </p>
                <span style={{ fontSize: '10px', color: 'var(--primary)', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                  <i className="fa-solid fa-expand" /> Klik Detail
                </span>
              </div>

              {/* Vertical connector from Leader */}
              <div className="org-pulse-line-v" />

              {/* Horizontal bridge line spanning partners */}
              <div className="org-pulse-bridge">
                <div className="org-pulse-line-h org-pulse-line-h--left" />
                <div className="org-pulse-line-h org-pulse-line-h--right" />
              </div>

              {/* Partners level: KKKS & PGRI */}
              <div className="org-partners-grid-3d">
                {/* KKKS Node */}
                <div 
                  className="org-node-3d reveal-on-scroll"
                  onClick={() => openPersonDetail(
                    'kkks',
                    kkks?.name || 'Mulyadi, S.Pd., M.M.',
                    'Ketua KKKS Cibadak',
                    kkks?.nip || '197903122008011007',
                    kkks?.photoUrl || '',
                    'Mengoordinasikan Kelompok Kerja Kepala Sekolah di tingkat Kecamatan, menyinkronkan kebijakan dinas, dan membimbing kepala sekolah dalam tata kelola administrasi dana BOS dan pelaporan SPJ.'
                  )}
                >
                  <div className="org-avatar-3d">
                    {kkks?.photoUrl ? (
                      <img src={kkks.photoUrl} alt={kkks.name} />
                    ) : (
                      <i className="fa-solid fa-school" style={{ color: 'var(--accent)' }} />
                    )}
                  </div>
                  <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '12px' }}>
                    Ketua KKKS
                  </span>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '8px 0 2px' }}>
                    {kkks?.name || 'Memuat…'}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                    NIP. {kkks?.nip || '—'}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--accent)', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                    <i className="fa-solid fa-expand" /> Klik Detail
                  </span>
                </div>

                {/* PGRI Node */}
                <div 
                  className="org-node-3d reveal-on-scroll"
                  onClick={() => openPersonDetail(
                    'pgri',
                    pgri?.name || 'Drs. H. Asep Sunandar',
                    'Ketua PGRI Cabang Cibadak',
                    pgri?.nip || '196805121992031008',
                    pgri?.photoUrl || '',
                    'Memimpin cabang Persatuan Guru Republik Indonesia se-Kecamatan Cibadak, melindungi hak-hak guru, membina solidaritas, serta memimpin program peningkatan kompetensi pendidik profesional.'
                  )}
                >
                  <div className="org-avatar-3d">
                    {pgri?.photoUrl ? (
                      <img src={pgri.photoUrl} alt={pgri.name} />
                    ) : (
                      <i className="fa-solid fa-users" style={{ color: 'var(--accent)' }} />
                    )}
                  </div>
                  <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '12px' }}>
                    Ketua PGRI
                  </span>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '8px 0 2px' }}>
                    {pgri?.name || 'Memuat…'}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                    NIP. {pgri?.nip || '—'}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--accent)', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                    <i className="fa-solid fa-expand" /> Klik Detail
                  </span>
                </div>
              </div>

              {/* Vertical connector down to Gugus */}
              <div className="org-pulse-line-v org-pulse-line-v-long" />

              {/* Gugus Section */}
              <div className="org-gugus-section" style={{ width: '100%', position: 'relative', zIndex: 5 }}>
                <div className="org-gugus-label" style={{ border: '1px solid var(--card-border)', background: 'var(--card-glass)', backdropFilter: 'blur(10px)' }}>
                  <span>Pelaksana Gugus Wilayah (Klik Kartu untuk Ekspansi)</span>
                </div>

                <div className="org-gugus-grid-3d">
                  {guguses.map((g, idx) => {
                    const accent = getGugusColor(g.id);
                    const isExpanded = expandedGugus === g.id;
                    return (
                      <div
                        key={g.id}
                        className="card org-node-3d org-gugus-card-3d reveal-on-scroll"
                        style={{ 
                          '--gugus-accent': accent, 
                          ['--reveal-delay' as string]: `${idx * 80}ms`,
                          cursor: 'pointer'
                        } as React.CSSProperties}
                        onClick={() => setExpandedGugus(isExpanded ? null : g.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="badge" style={{ background: accent }}>Gugus {g.id}</span>
                          <i className="fa-solid fa-school" style={{ color: accent, opacity: 0.8 }} />
                        </div>
                        <h5 style={{ fontSize: '13.5px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--text-primary)' }}>
                          {g.koordinator}
                        </h5>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                          {g.name.split('-')[1]?.trim() || g.name}
                        </p>
                        
                        {/* Expand indicator */}
                        <div style={{
                          marginTop: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: accent,
                          fontWeight: 600
                        }}>
                          <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} />
                          <span>{isExpanded ? 'Tutup Detail' : 'Lihat Detail'}</span>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: `1px solid ${accent}33`,
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                            textAlign: 'left'
                          }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong style={{ color: accent }}>Wilayah Binaan:</strong> {g.name}
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <strong style={{ color: accent }}>Ketua Koordinator:</strong> {g.koordinator}
                            </div>
                            <div>
                              <strong style={{ color: accent }}>Status Gugus:</strong> Aktif Terintegrasi
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sekretariat Tab */}
        {activeTab === 'kontak' && (
          <div className="static-tab-panel contact-grid">
            <article className="card profile-card contact-card reveal-on-scroll" style={{ ['--reveal-delay' as string]: '0ms' }}>
              <h3>
                <i className="fa-solid fa-map-location-dot" aria-hidden="true" /> Kantor Sekretariat
              </h3>
              <p className="contact-address">
                Gedung Pelayanan Koryandik Cibadak
                <br />
                {profile?.address || KORYANDIK_ADDRESS}
                <span className="contact-note">
                  *Tepat berada di samping kompleks Kantor Kecamatan Cibadak.
                </span>
              </p>
            </article>

            <article className="card profile-card contact-card reveal-on-scroll" style={{ ['--reveal-delay' as string]: '100ms' }}>
              <h3>
                <i className="fa-solid fa-address-book" aria-hidden="true" /> Layanan Informasi
              </h3>
              <div className="contact-list">
                <div className="contact-item">
                  <div className="contact-item-icon">
                    <i className="fa-solid fa-phone" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="contact-item-label">Telepon Dinas</span>
                    <span className="contact-item-value">{profile?.phone || '(0266) 531234'}</span>
                  </div>
                </div>
                <div
                  className="contact-item contact-item--clickable"
                  onClick={handleCopyEmail}
                  onKeyDown={(e) => e.key === 'Enter' && handleCopyEmail()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="contact-item-icon">
                    <i className="fa-solid fa-envelope" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="contact-item-label">Email Resmi (klik untuk salin)</span>
                    <span className="contact-item-value contact-item-value--link">
                      {profile?.email || 'koryandik.cibadak@sukabumi.go.id'}
                    </span>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-item-icon">
                    <i className="fa-solid fa-clock" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="contact-item-label">Jam Kerja Pelayanan</span>
                    <span className="contact-item-value">Senin – Jumat: 08.00 – 15.30 WIB</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        )}
      </main>

      {/* Glassmorphic Org Person Detail Drawer/Modal */}
      {selectedPerson && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--modal-overlay, rgba(0, 0, 0, 0.6))',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease-out'
          }}
          onClick={() => setSelectedPerson(null)}
        >
          <div
            style={{
              background: 'var(--card-glass)',
              backdropFilter: 'blur(25px)',
              border: '1px solid var(--card-border)',
              borderRadius: '32px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.18), inset 0 1px 0 var(--card-border)',
              position: 'relative',
              animation: 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPerson(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--card-border)',
                border: 'none',
                color: 'var(--text-primary)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Profile Detail Content */}
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: '96px', 
                height: '96px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                border: '4px solid var(--primary)', 
                margin: '0 auto 16px',
                boxShadow: '0 0 20px var(--primary-glow)'
              }}>
                {selectedPerson.photoUrl ? (
                  <img src={selectedPerson.photoUrl} alt={selectedPerson.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-user-tie" style={{ fontSize: '36px', color: '#fff' }} />
                  </div>
                )}
              </div>

              <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', border: '1px solid var(--primary)' }}>
                {selectedPerson.role}
              </span>

              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '12px 0 4px' }}>
                {selectedPerson.name}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 20px', fontFamily: 'monospace' }}>
                NIP. {selectedPerson.nip}
              </p>

              <div style={{
                background: 'var(--bg-secondary, rgba(0, 0, 0, 0.04))',
                border: '1px solid var(--card-border)',
                borderRadius: '16px',
                padding: '16px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                textAlign: 'left',
                marginBottom: '24px'
              }}>
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)' }}></i> Tugas Pokok &amp; Wewenang
                </h4>
                {selectedPerson.bio}
              </div>

              {/* Direct Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`mailto:${selectedPerson.email}`}
                  style={{ 
                    flex: 1, 
                    borderRadius: '14px', 
                    padding: '12px', 
                    fontSize: '13px', 
                    background: 'var(--card-border)', 
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-envelope" /> Email
                </a>
                <button
                  onClick={() => {
                    setSelectedPerson(null);
                    toast.success('Panggilan kontak disiapkan.');
                  }}
                  style={{ 
                    flex: 1, 
                    borderRadius: '14px', 
                    padding: '12px', 
                    fontSize: '13px', 
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))', 
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-phone" /> Kontak
                </button>
              </div>
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

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
