'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import BackToTop from '@/components/BackToTop';
import ParticleBackground from '@/components/ParticleBackground';
import SpotlightCard from '@/components/SpotlightCard';
import TiltCard from '@/components/TiltCard';
import RevealOnScroll from '@/components/RevealOnScroll';
import MagneticButton from '@/components/MagneticButton';
import { getSchools, getGugusData } from '@/lib/db';
import { getGugusTheme, getGugusColor } from '@/lib/gugusThemes';
import type { School, GugusData } from '@/lib/schoolsData';
import { generateSchoolSlug } from '@/lib/schoolSlug';
import { useScrollReveal } from '@/hooks/useScrollReveal';

// Animated counter helper matching the Unduhan page pattern
function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString('id-ID')}</span>;
}

export default function SekolahDirectoryPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [search, setSearch] = useState('');
  const [filterGugus, setFilterGugus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getSchools(), getGugusData()]).then(([s, g]) => {
      setSchools(s);
      setGuguses(g);
      setLoaded(true);
    });
  }, []);

  useScrollReveal([schools, filterGugus, search, filterLevel]);

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const matchSearch = !search || 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        (s.address || '').toLowerCase().includes(search.toLowerCase()) ||
        s.npsn.includes(search);
      const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
      const matchLevel = filterLevel === 'all' || s.level === filterLevel;
      return matchSearch && matchGugus && matchLevel;
    });
  }, [schools, search, filterGugus, filterLevel]);

  const totalStudents = useMemo(() => schools.reduce((a, s) => a + s.studentCount, 0), [schools]);
  const totalTeachers = useMemo(() => schools.reduce((a, s) => a + s.teacherCount, 0), [schools]);

  return (
    <div className="landing-page static-page" style={{ minHeight: '100vh', background: 'var(--bg-space)' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ─── SCHOOL PORTAL SYSTEM: MATCHING UNDUHAN PAGE STYLING ─── */
        
        .school-hub-root {
          padding: 40px 8% 80px;
          position: relative;
          z-index: 1;
        }

        /* HERO AREA */
        .school-hub-hero {
          position: relative;
          padding: 20px 0 60px;
          overflow: hidden;
          text-align: center;
        }

        .school-hub-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 100px;
          background: var(--primary-glow);
          border: 1px solid rgba(59,130,246,0.3);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--primary);
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .school-hub-hero h1 {
          font-size: clamp(1.8rem, 3.8vw, 2.5rem);
          font-weight: 900;
          line-height: 1.25;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
          color: var(--text-primary);
        }

        .school-hub-hero h1 span {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .school-hub-subtitle {
          font-size: 16px;
          color: var(--text-secondary);
          max-width: 580px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }

        /* STATS STRIP MATCHING UNDUHAN */
        .school-hub-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }

        .school-hub-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 36px;
          border-right: 1px solid var(--card-border);
        }

        .school-hub-stat-item:last-child {
          border-right: none;
        }

        .school-hub-stat-num {
          font-size: 2rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 4px;
        }

        .school-hub-stat-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* SEARCH BAR */
        .school-hub-search-wrap {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }

        .school-hub-search-input {
          width: 100%;
          padding: 16px 56px 16px 52px;
          border-radius: 100px;
          border: 1.5px solid var(--card-border);
          background: var(--card-glass);
          backdrop-filter: blur(12px);
          color: var(--text-primary);
          font-size: 15px;
          font-family: inherit;
          transition: all 0.25s ease;
          outline: none;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .school-hub-search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-glow), 0 8px 32px rgba(0,0,0,0.08);
        }

        .school-hub-search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 16px;
          pointer-events: none;
        }

        .school-hub-search-clear {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 12px;
          transition: all 0.2s;
        }

        .school-hub-search-clear:hover {
          background: var(--danger-glow);
          color: var(--danger);
        }

        /* LAYOUT SPLIT GRID */
        .school-hub-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
          align-items: start;
          padding: 0 0 80px;
        }

        @media (max-width: 900px) {
          .school-hub-layout { grid-template-columns: 1fr; }
          .school-hub-sidebar { position: static !important; }
        }

        /* SIDEBAR FILTER PANEL */
        .school-hub-sidebar {
          position: sticky;
          top: 90px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .school-hub-sidebar-section {
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
        }

        .school-hub-sidebar-title {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 14px;
          padding-left: 4px;
        }

        .sidebar-select-neo {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--card-border);
          background: var(--bg-space-dark);
          color: var(--text-primary);
          outline: none;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sidebar-select-neo:focus {
          border-color: var(--primary);
        }

        /* gugus vertical button filter stack */
        .sidebar-vertical-stack {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-vertical-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          transition: all 0.2s ease;
          position: relative;
        }

        .sidebar-vertical-btn:hover {
          background: var(--primary-glow);
          color: var(--primary);
        }

        .sidebar-vertical-btn.active {
          background: var(--primary-glow);
          color: var(--primary);
        }

        .sidebar-vertical-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--text-muted);
          transition: all 0.2s;
        }

        .sidebar-vertical-btn.active .sidebar-vertical-dot {
          transform: scale(1.2);
          background: var(--primary);
          box-shadow: 0 0 8px var(--primary);
        }

        .sidebar-vertical-count {
          margin-left: auto;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          color: var(--text-muted);
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .sidebar-vertical-btn.active .sidebar-vertical-count {
          background: var(--primary);
          color: #fff;
          border-color: transparent;
        }

        /* RIGHT CONTENT SECTION */
        .school-hub-content-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .school-hub-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .school-hub-results-label {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .school-hub-results-label strong {
          color: var(--text-primary);
          font-size: 15px;
        }

        .school-hub-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 24px;
        }

        /* School Item Card interior */
        .school-item-card-inner {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          background: var(--card-glass);
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Subtle colored ambient glow matching Gugus theme */
        .school-item-card-inner::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: radial-gradient(circle at 100% 0%, var(--card-glow-solid), transparent 50%);
          pointer-events: none;
          z-index: 0;
          transition: opacity 0.4s;
          opacity: 0.6;
        }

        .school-item-card-inner:hover::after {
          opacity: 1;
        }

        .school-card-strip {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 20px 20px 0 0;
          z-index: 1;
        }

        .school-logo-frame {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 8px 20px var(--card-glow-solid);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .school-logo-frame img {
          transition: transform 0.5s ease;
        }

        .school-item-card-inner:hover .school-logo-frame img {
          transform: scale(1.1);
        }

        .school-title-text {
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.35;
          margin-bottom: 3px;
          letter-spacing: -0.01em;
          transition: color 0.3s;
        }

        .school-item-card-inner:hover .school-title-text {
          color: var(--card-primary);
        }

        .school-npsn-text {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .school-badges-row {
          display: flex;
          gap: 6px;
          margin-bottom: 18px;
          flex-wrap: wrap;
          z-index: 1;
        }

        .school-badge-tag {
          font-size: 9.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 5px rgba(0,0,0,0.02);
          border: 1px solid rgba(255,255,255,0.05);
        }

        /* Modern bento stats grid */
        .school-stats-compact {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          margin-bottom: 18px;
          z-index: 1;
          backdrop-filter: blur(8px);
          transition: all 0.3s;
        }

        html.dark .school-stats-compact {
          background: rgba(15, 23, 42, 0.2);
        }

        .school-item-card-inner:hover .school-stats-compact {
          border-color: var(--card-border-muted);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        .school-stat-item {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          text-align: center;
        }

        .school-stat-item strong {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 800;
          font-family: monospace;
        }

        .school-info-lines {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 22px;
          flex: 1;
          z-index: 1;
        }

        .school-info-line {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .school-info-line i {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.3);
          border: 1px solid var(--card-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 10px;
          flex-shrink: 0;
          transition: all 0.3s;
        }

        html.dark .school-info-line i {
          background: rgba(15, 23, 42, 0.2);
        }

        .school-item-card-inner:hover .school-info-line i {
          color: var(--card-primary);
          border-color: var(--card-border-muted);
        }

        /* Sleek Capsule Action Button */
        .school-action-btn {
          width: 100%;
          padding: 12px;
          border-radius: 99px;
          border: 1px solid var(--card-border-muted);
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 1;
        }

        .school-action-btn i {
          transition: transform 0.25s;
        }

        .school-action-btn:hover {
          background: linear-gradient(135deg, var(--card-primary), var(--card-accent)) !important;
          color: #fff !important;
          border-color: transparent !important;
          box-shadow: 0 8px 20px var(--card-glow-solid) !important;
        }

        .school-action-btn:hover i {
          transform: translateX(4px);
        }

        /* ===== EMPTY STATE ===== */
        .school-empty-box {
          text-align: center;
          padding: 60px 24px;
          color: var(--text-muted);
          background: var(--card-glass);
          border: 1px dashed var(--card-border);
          border-radius: 20px;
          backdrop-filter: blur(12px);
        }

        .school-empty-box i {
          font-size: 40px;
          margin-bottom: 16px;
          opacity: 0.3;
        }

        .school-empty-box h3 {
          font-size: 17px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
      `}} />

      <LandingNav activePage="sekolah" />

      {/* CANVAS PARTICLES BACKGROUND */}
      <ParticleBackground particleCount={30} color="rgba(59, 130, 246, 0.15)" />

      <div className="school-hub-root">
        {/* HERO AREA (Matches Unduhan Page structure) */}
        <section className="school-hub-hero">
          <div className="school-hub-badge">
            <i className="fa-solid fa-graduation-cap" /> Portal Binaan
          </div>
          <h1>Profil Publik <span>Sekolah Dasar</span></h1>
          <p className="school-hub-subtitle">
            Akses informasi umum, data fasilitas, pimpinan, prestasi, dan koordinasi PPDB gratis untuk 49 sekolah dasar di Kecamatan Cibadak.
          </p>

          {/* STATS STRIP MATCHING UNDUHAN */}
          <div className="school-hub-stats">
            <div className="school-hub-stat-item">
              <span className="school-hub-stat-num"><AnimatedNumber target={schools.length || 49} /></span>
              <span className="school-hub-stat-label">Sekolah</span>
            </div>
            <div className="school-hub-stat-item">
              <span className="school-hub-stat-num"><AnimatedNumber target={totalStudents} /></span>
              <span className="school-hub-stat-label">Siswa</span>
            </div>
            <div className="school-hub-stat-item">
              <span className="school-hub-stat-num"><AnimatedNumber target={totalTeachers} /></span>
              <span className="school-hub-stat-label">Guru</span>
            </div>
          </div>

          {/* OVAL SEARCH BOX MATCHING UNDUHAN */}
          <div className="school-hub-search-wrap">
            <i className="fa-solid fa-magnifying-glass school-hub-search-icon" />
            <input
              className="school-hub-search-input"
              type="text"
              placeholder="Cari berdasarkan nama sekolah, NPSN, atau pimpinan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                type="button" 
                className="school-hub-search-clear"
                onClick={() => setSearch('')}
                aria-label="Bersihkan pencarian"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </section>

        {/* LAYOUT: SIDEBAR & MAIN */}
        <div className="school-hub-layout">
          {/* SIDEBAR (Matches Unduhan sidebar) */}
          <aside className="school-hub-sidebar">
            {/* Jenjang Filter Section */}
            <div className="school-hub-sidebar-section">
              <span className="school-hub-sidebar-title">Jenjang</span>
              <select
                className="sidebar-select-neo"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
              >
                <option value="all">Semua Jenjang</option>
                <option value="SD">SD (Sekolah Dasar)</option>
                <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
              </select>
            </div>

            {/* Gugus Filter Section (Matches Category filter in unduhan) */}
            <div className="school-hub-sidebar-section">
              <span className="school-hub-sidebar-title">Filter Gugus</span>
              <div className="sidebar-vertical-stack">
                <button
                  className={`sidebar-vertical-btn ${filterGugus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterGugus('all')}
                >
                  <span className="sidebar-vertical-dot" style={{ background: 'var(--primary)' }} />
                  <span>Semua Gugus</span>
                  <span className="sidebar-vertical-count">
                    {schools.length}
                  </span>
                </button>
                {['I', 'II', 'III', 'IV', 'V'].map((g) => {
                  const theme = getGugusTheme(g);
                  const count = schools.filter((s) => s.gugus === g).length;
                  const isActive = filterGugus === g;
                  return (
                    <button
                      key={g}
                      className={`sidebar-vertical-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setFilterGugus(g)}
                    >
                      <span className="sidebar-vertical-dot" style={{ background: theme.primary }} />
                      <span>Gugus {g}</span>
                      <span className="sidebar-vertical-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT RIGHT */}
          <main className="school-hub-content-right">
            <div className="school-hub-toolbar">
              <span className="school-hub-results-label">
                Menampilkan <strong>{filtered.length}</strong> sekolah binaan
              </span>
            </div>

            {filtered.length > 0 ? (
              <div className="school-hub-cards-grid">
                {filtered.map((school, i) => {
                  const theme = getGugusTheme(school.gugus);
                  const slug = generateSchoolSlug(school.name);
                  
                  const cardColors = {
                    '--card-primary': theme.primary,
                    '--card-accent': theme.accent,
                    '--card-glow-solid': `${theme.primary}25`,
                    '--card-border-muted': `${theme.primary}35`
                  } as React.CSSProperties;

                  return (
                    <RevealOnScroll 
                      key={school.npsn} 
                      delay={(i % 3) * 0.05} 
                      duration={0.5}
                    >
                      <TiltCard 
                        intensity={6}
                        glare={true}
                        style={{ borderRadius: '20px', height: '100%', border: '1px solid var(--card-border)' }}
                      >
                        <div className="school-item-card-inner" style={cardColors}>
                          <div className="school-card-strip" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />

                          <div className="school-card-top-header" style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                            <div className="school-logo-frame" style={{ background: school.logoUrl ? 'transparent' : `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}>
                              {school.logoUrl ? (
                                <img src={school.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
                              ) : (
                                <i className="fa-solid fa-graduation-cap" />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 className="school-title-text">{school.name}</h3>
                              <span className="school-npsn-text">NPSN {school.npsn}</span>
                            </div>
                          </div>

                          <div className="school-badges-row">
                            <span className="school-badge-tag" style={{ background: `${theme.primary}12`, color: theme.primary }}>
                              Gugus {school.gugus}
                            </span>
                            <span className="school-badge-tag" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)' }}>
                              {school.level}
                            </span>
                          </div>

                          <div className="school-stats-compact">
                            <div className="school-stat-item">
                              <span>Siswa</span>
                              <strong>{school.studentCount}</strong>
                            </div>
                            <div className="school-stat-item" style={{ borderLeft: '1px solid var(--card-border)' }}>
                              <span>Guru</span>
                              <strong>{school.teacherCount}</strong>
                            </div>
                          </div>

                          <div className="school-info-lines">
                            <div className="school-info-line">
                              <i className="fa-solid fa-user-tie" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {school.principalName || '—'}
                              </span>
                            </div>
                            {school.address && (
                              <div className="school-info-line">
                                <i className="fa-solid fa-map-pin" />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                                  {school.address}
                                </span>
                              </div>
                            )}
                          </div>

                          <MagneticButton 
                            className="school-action-btn"
                            onClick={() => router.push(`/sekolah/${slug}`)}
                          >
                            Buka Portal <i className="fa-solid fa-arrow-right" />
                          </MagneticButton>
                        </div>
                      </TiltCard>
                    </RevealOnScroll>
                  );
                })}
              </div>
            ) : (
              <div className="school-empty-box">
                <i className="fa-solid fa-school-circle-xmark" />
                <h3>Tidak Ada Sekolah</h3>
                <p>Tidak ditemukan sekolah binaan yang cocok dengan kriteria filter Anda.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <LandingFooter schoolCount={schools.length || 49} />
      <BackToTop />
    </div>
  );
}
