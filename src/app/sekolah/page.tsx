'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import BackToTop from '@/components/BackToTop';
import TiltCard from '@/components/TiltCard';
import RevealOnScroll from '@/components/RevealOnScroll';
import MagneticButton from '@/components/MagneticButton';
import { getSchools, getGugusData } from '@/lib/db';
import { getGugusTheme } from '@/lib/gugusThemes';
import type { School, GugusData } from '@/lib/schoolsData';
import { generateSchoolSlug } from '@/lib/schoolSlug';
import { useScrollReveal } from '@/hooks/useScrollReveal';

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

function getSchoolStatus(s: School): 'Negeri' | 'Swasta' {
  if (s.status === 'Swasta') return 'Swasta';
  const nameUpper = (s.name || '').toUpperCase();
  return nameUpper.includes('NEGERI') ? 'Negeri' : 'Swasta';
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortMode = 'name' | 'students' | 'teachers' | 'gugus';

export default function SekolahDirectoryPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [, setGuguses] = useState<GugusData[]>([]);
  const [search, setSearch] = useState('');
  const [filterGugus, setFilterGugus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  useEffect(() => {
    Promise.all([getSchools(), getGugusData()]).then(([s, g]) => {
      setSchools(s);
      setGuguses(g);
      setLoaded(true);
    });
  }, []);

  useScrollReveal([schools, filterGugus, search, filterLevel, viewMode, sortMode]);

  const filtered = useMemo(() => {
    const list = schools.filter((s) => {
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.address || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.principalName || '').toLowerCase().includes(search.toLowerCase()) ||
        s.npsn.includes(search);
      const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
      const matchLevel = filterLevel === 'all' || getSchoolStatus(s) === filterLevel;
      return matchSearch && matchGugus && matchLevel;
    });
    const sorted = [...list].sort((a, b) => {
      switch (sortMode) {
        case 'students': return b.studentCount - a.studentCount;
        case 'teachers': return b.teacherCount - a.teacherCount;
        case 'gugus': return a.gugus.localeCompare(b.gugus) || a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [schools, search, filterGugus, filterLevel, sortMode]);

  const totalStudents = useMemo(() => schools.reduce((a, s) => a + s.studentCount, 0), [schools]);
  const totalTeachers = useMemo(() => schools.reduce((a, s) => a + s.teacherCount, 0), [schools]);
  const negeriCount = useMemo(() => schools.filter(s => (filterGugus === 'all' || s.gugus === filterGugus) && getSchoolStatus(s) === 'Negeri').length, [schools, filterGugus]);
  const swastaCount = useMemo(() => schools.filter(s => (filterGugus === 'all' || s.gugus === filterGugus) && getSchoolStatus(s) === 'Swasta').length, [schools, filterGugus]);

  const clearFilters = () => {
    setSearch(''); setFilterGugus('all'); setFilterLevel('all');
  };
  const hasFilters = search || filterGugus !== 'all' || filterLevel !== 'all';

  const GUGUS_LIST = ['I', 'II', 'III', 'IV', 'V'];

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', top: '-150px', left: '-150px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', top: '40%', right: '-80px', animationDelay: '2s' }} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* ═══════════════ HERO ═══════════════ */
        .skl-hero-title {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        /* ═══════════════ STAT CARDS ═══════════════ */
        .skl-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 720px;
          margin: 0 auto 12px;
          padding: 0 20px;
        }
        @media (max-width: 640px) {
          .skl-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        .skl-stat-card {
          background: var(--card-glass);
          backdrop-filter: blur(16px);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 16px 14px;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .skl-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(59,130,246,0.1); }
        .skl-stat-card .skl-stat-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 8px; font-size: 15px; color: #fff;
        }
        .skl-stat-card .skl-stat-num { font-size: 22px; font-weight: 900; color: var(--text-primary); font-family: monospace; letter-spacing: -0.02em; }
        .skl-stat-card .skl-stat-label { font-size: 10.5px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

        /* ═══════════════ SEARCH ═══════════════ */
        .skl-search-wrap { position: relative; max-width: 560px; width: 100%; }
        .skl-search-wrap i.icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px; pointer-events: none; z-index: 2; }
        .skl-search-input {
          width: 100%; padding: 14px 50px 14px 48px;
          border-radius: 16px; border: 1.5px solid var(--card-border);
          background: var(--card-glass); backdrop-filter: blur(16px);
          color: var(--text-primary); font-size: 14px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .skl-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
        .skl-search-input::placeholder { color: var(--text-muted); }
        .skl-search-clear {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: var(--card-border); border: none; border-radius: 50%;
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-muted); font-size: 11px; transition: all 0.2s;
        }
        .skl-search-clear:hover { background: #ef4444; color: #fff; }

        /* ═══════════════ FILTER CHIPS ═══════════════ */
        .skl-filter-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .skl-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 12px;
          border: 1.5px solid var(--card-border); background: var(--card-glass);
          backdrop-filter: blur(12px); color: var(--text-secondary);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1); white-space: nowrap;
          font-family: inherit;
        }
        .skl-chip:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); }
        .skl-chip.active { color: #fff; border-color: transparent; box-shadow: 0 6px 20px rgba(59,130,246,0.25); }
        .skl-chip .chip-count { background: rgba(255,255,255,0.2); border-radius: 99px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
        .skl-chip:not(.active) .chip-count { background: var(--card-bg-elevated, rgba(0,0,0,0.06)); color: var(--text-muted); }
        .skl-chip-level {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 10px;
          border: 1.5px solid var(--card-border); background: var(--card-glass);
          color: var(--text-secondary); font-size: 11.5px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .skl-chip-level.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .skl-chip-level:not(.active):hover { border-color: var(--primary); color: var(--primary); }

        /* ═══════════════ TOOLBAR ═══════════════ */
        .skl-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; max-width: 1280px; margin: 0 auto;
          padding: 0 24px 20px;
        }
        .skl-view-toggle { display: flex; gap: 4px; background: var(--card-glass); border: 1px solid var(--card-border); border-radius: 12px; padding: 4px; backdrop-filter: blur(8px); }
        .skl-view-btn {
          width: 34px; height: 34px; border-radius: 8px; border: none;
          background: transparent; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 13px;
          transition: all 0.2s;
        }
        .skl-view-btn.active { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.25); }
        .skl-sort-select {
          padding: 9px 16px; border-radius: 12px; border: 1.5px solid var(--card-border);
          background: var(--card-glass); color: var(--text-primary); font-size: 12px;
          font-weight: 600; outline: none; cursor: pointer; backdrop-filter: blur(8px);
          font-family: inherit;
        }

        /* ═══════════════ GRID VIEW ═══════════════ */
        .skl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 24px; max-width: 1280px; margin: 0 auto; padding: 0 24px 80px;
        }
        @media (max-width: 380px) { .skl-grid { grid-template-columns: 1fr; } }

        .skl-card {
          border-radius: 20px;
          border: 1.5px solid var(--card-border);
          background: var(--card-glass);
          backdrop-filter: blur(16px);
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          display: flex; flex-direction: column;
          position: relative;
          overflow: visible;
        }
        .skl-card:hover {
          border-color: var(--card-primary, var(--primary));
          transform: translateY(-4px);
          box-shadow: 0 20px 45px rgba(59,130,246,0.14);
        }

        .skl-card-header {
          position: relative;
          padding: 20px 20px 24px;
          border-radius: 18px 18px 0 0;
          background: linear-gradient(135deg, var(--card-primary-tint, rgba(59,130,246,0.14)), var(--card-accent-tint, rgba(139,92,246,0.08)));
          border-bottom: 1px solid var(--card-border);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skl-card-header-row {
          display: flex; align-items: center; gap: 14px;
        }

        .skl-card-logo {
          width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; color: #fff; overflow: hidden;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }
        .skl-card-name { font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.25; }
        .skl-card-npsn { font-size: 10.5px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 3px; }

        .skl-card-badges {
          position: absolute;
          bottom: -13px;
          left: 20px;
          z-index: 10;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .skl-badge {
          font-size: 9.5px; font-weight: 800; padding: 5px 12px;
          border-radius: 99px; text-transform: uppercase; letter-spacing: 0.05em;
          border: 1.5px solid rgba(255,255,255,0.35);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          display: inline-flex; align-items: center; gap: 4px;
          color: #ffffff;
          backdrop-filter: blur(8px);
        }

        .skl-card-body { padding: 26px 20px 20px; flex: 1; display: flex; flex-direction: column; }

        .skl-card-stats {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 16px;
        }
        .skl-card-stat {
          background: var(--card-bg-elevated, rgba(0,0,0,0.04));
          border: 1px solid var(--card-border);
          border-radius: 12px; padding: 10px 12px;
          text-align: center;
        }
        .skl-card-stat-num { font-size: 18px; font-weight: 900; color: var(--text-primary); font-family: monospace; }
        .skl-card-stat-label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1px; }

        .skl-card-info { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; flex: 1; }
        .skl-card-info-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: var(--text-secondary); line-height: 1.4;
        }
        .skl-card-info-icon {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          background: var(--card-bg-elevated, rgba(0,0,0,0.04));
          border: 1px solid var(--card-border);
          color: var(--text-muted);
        }

        .skl-card-action {
          width: 100%; padding: 12px; border-radius: 14px;
          border: 1.5px solid var(--card-border); background: transparent;
          color: var(--text-primary); font-family: inherit; font-size: 12.5px;
          font-weight: 700; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px; transition: all 0.3s cubic-bezier(0.25,1,0.5,1);
          margin-top: auto;
        }
        .skl-card-action i { transition: transform 0.25s; }
        .skl-card-action:hover {
          background: linear-gradient(135deg, var(--card-primary, var(--primary)), var(--card-accent, var(--accent)));
          color: #fff; border-color: transparent;
          box-shadow: 0 8px 24px rgba(59,130,246,0.25);
        }
        .skl-card-action:hover i { transform: translateX(4px); }

        /* ═══════════════ LIST VIEW ═══════════════ */
        .skl-list { display: flex; flex-direction: column; gap: 10px; max-width: 1280px; margin: 0 auto; padding: 0 24px 80px; }
        .skl-list-item {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 20px; border-radius: 16px;
          border: 1.5px solid var(--card-border); background: var(--card-glass);
          backdrop-filter: blur(12px); cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .skl-list-item:hover { border-color: var(--primary); transform: translateX(4px); box-shadow: 0 8px 24px rgba(59,130,246,0.08); }
        .skl-list-logo {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; color: #fff; overflow: hidden;
          border: 1.5px solid rgba(255,255,255,0.12);
        }
        .skl-list-right {
          display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .skl-list-right { flex-direction: column; align-items: flex-end; gap: 4px; }
          .skl-list-item { gap: 12px; padding: 12px 14px; }
        }
        .skl-list-stat-chip {
          font-size: 10px; font-weight: 700; padding: 4px 10px;
          border-radius: 8px; color: var(--text-secondary);
          background: var(--card-bg-elevated, rgba(0,0,0,0.04));
          border: 1px solid var(--card-border);
          white-space: nowrap;
        }

        /* ═══════════════ COMPACT VIEW ═══════════════ */
        .skl-compact {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px; max-width: 1280px; margin: 0 auto; padding: 0 24px 80px;
        }
        .skl-compact-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 14px;
          border: 1.5px solid var(--card-border); background: var(--card-glass);
          backdrop-filter: blur(12px); cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .skl-compact-item:hover { border-color: var(--primary); box-shadow: 0 8px 20px rgba(59,130,246,0.08); transform: translateY(-2px); }
        .skl-compact-logo {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; color: #fff; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
        }

        /* ═══════════════ EMPTY STATE ═══════════════ */
        .skl-empty { text-align: center; padding: 80px 20px; color: var(--text-secondary); max-width: 1280px; margin: 0 auto; }
        .skl-empty-icon {
          width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 20px;
          display: flex; align-items: center; justify-content: center;
          background: var(--card-bg-elevated, rgba(0,0,0,0.04));
          border: 1.5px solid var(--card-border);
          font-size: 32px; color: var(--text-muted);
        }

        /* ═══════════════ SKELETON ═══════════════ */
        @keyframes skl-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skl-skeleton {
          border-radius: 20px; border: 1.5px solid var(--card-border);
          background: linear-gradient(90deg, var(--card-glass) 25%, var(--card-bg-elevated, rgba(0,0,0,0.04)) 50%, var(--card-glass) 75%);
          background-size: 200% 100%;
          animation: skl-shimmer 1.5s ease-in-out infinite;
        }
      ` }} />

      <LandingNav activePage="sekolah" onOpenLogin={() => router.push('/?login=1')} />

      <main className="static-page-main" style={{ zIndex: 2, position: 'relative' }}>
        {/* Hero */}
        <section className="pub-hero animate-fade-in" style={{ paddingBottom: '28px' }}>
          <div className="pub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-graduation-cap" />
            <span>Portal Sekolah Binaan</span>
          </div>
          <h1 className="skl-hero-title">Direktori Sekolah</h1>
          <p className="pub-hero-subtitle" style={{ maxWidth: '620px', margin: '0 auto 32px' }}>
            Profil lengkap, data fasilitas, pimpinan, dan informasi koordinasi untuk seluruh SD binaan Koryandik Kecamatan Cibadak.
          </p>
        </section>

        {/* Stat Cards */}
        <div className="skl-stat-grid animate-fade-in">
          <div className="skl-stat-card">
            <div className="skl-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
              <i className="fa-solid fa-school" />
            </div>
            <div className="skl-stat-num"><AnimatedNumber target={schools.length || 49} /></div>
            <div className="skl-stat-label">Total Sekolah</div>
          </div>
          <div className="skl-stat-card">
            <div className="skl-stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
              <i className="fa-solid fa-user-graduate" />
            </div>
            <div className="skl-stat-num"><AnimatedNumber target={totalStudents} /></div>
            <div className="skl-stat-label">Total Siswa</div>
          </div>
          <div className="skl-stat-card">
            <div className="skl-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
              <i className="fa-solid fa-chalkboard-user" />
            </div>
            <div className="skl-stat-num"><AnimatedNumber target={totalTeachers} /></div>
            <div className="skl-stat-label">Total Guru</div>
          </div>
          <div className="skl-stat-card">
            <div className="skl-stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <i className="fa-solid fa-layer-group" />
            </div>
            <div className="skl-stat-num">{GUGUS_LIST.length}</div>
            <div className="skl-stat-label">Gugus Binaan</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 20px 20px' }}>
          <div className="skl-search-wrap">
            <i className="fa-solid fa-magnifying-glass icon" />
            <input
              className="skl-search-input"
              type="text"
              placeholder="Cari nama sekolah, NPSN, atau kepala sekolah..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="skl-search-clear" onClick={() => setSearch('')}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '0 20px 28px' }}>
          {/* Gugus Filters */}
          <div className="skl-filter-row">
            <button
              className={`skl-chip${filterGugus === 'all' && filterLevel === 'all' ? ' active' : ''}`}
              style={filterGugus === 'all' && filterLevel === 'all' ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' } : {}}
              onClick={clearFilters}
            >
              <i className="fa-solid fa-layer-group" style={{ fontSize: '11px' }} />
              Semua
              <span className="chip-count">{schools.length}</span>
            </button>
            {GUGUS_LIST.map(g => {
              const theme = getGugusTheme(g);
              const count = schools.filter(s => s.gugus === g && (filterLevel === 'all' || getSchoolStatus(s) === filterLevel)).length;
              const isActive = filterGugus === g;
              return (
                <button
                  key={g}
                  className={`skl-chip${isActive ? ' active' : ''}`}
                  style={isActive ? { background: `linear-gradient(135deg,${theme.primary},${theme.accent})` } : {}}
                  onClick={() => setFilterGugus(isActive ? 'all' : g)}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary, display: 'inline-block', flexShrink: 0 }} />
                  Gugus {g}
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>
          {/* Level Filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`skl-chip-level${filterLevel === 'Negeri' ? ' active' : ''}`}
              onClick={() => setFilterLevel(filterLevel === 'Negeri' ? 'all' : 'Negeri')}
            >
              <i className="fa-solid fa-landmark" style={{ fontSize: '10px' }} /> Negeri <span style={{ fontWeight: 800 }}>({negeriCount})</span>
            </button>
            <button
              className={`skl-chip-level${filterLevel === 'Swasta' ? ' active' : ''}`}
              onClick={() => setFilterLevel(filterLevel === 'Swasta' ? 'all' : 'Swasta')}
            >
              <i className="fa-solid fa-building" style={{ fontSize: '10px' }} /> Swasta <span style={{ fontWeight: 800 }}>({swastaCount})</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="skl-toolbar">
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Menampilkan <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{filtered.length}</strong> sekolah
            {hasFilters && (
              <button onClick={clearFilters} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                <i className="fa-solid fa-xmark" style={{ marginRight: 4 }} />Reset filter
              </button>
            )}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select className="skl-sort-select" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
              <option value="name">Urut: Nama A–Z</option>
              <option value="gugus">Urut: Gugus</option>
              <option value="students">Urut: Siswa Terbanyak</option>
              <option value="teachers">Urut: Guru Terbanyak</option>
            </select>
            <div className="skl-view-toggle">
              <button className={`skl-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid">
                <i className="fa-solid fa-grip" />
              </button>
              <button className={`skl-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List">
                <i className="fa-solid fa-list" />
              </button>
              <button className={`skl-view-btn${viewMode === 'compact' ? ' active' : ''}`} onClick={() => setViewMode('compact')} title="Compact">
                <i className="fa-solid fa-table-cells" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {!loaded ? (
          <div className={viewMode === 'grid' ? 'skl-grid' : viewMode === 'list' ? 'skl-list' : 'skl-compact'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skl-skeleton" style={{ height: viewMode === 'grid' ? 340 : viewMode === 'list' ? 72 : 64 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="skl-empty animate-fade-in">
            <div className="skl-empty-icon">
              <i className="fa-solid fa-school-circle-xmark" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 6px' }}>Tidak Ada Sekolah Ditemukan</p>
            <p style={{ fontSize: '13px', margin: '0 0 16px' }}>Tidak ditemukan sekolah yang cocok dengan filter atau pencarian yang dipilih.</p>
            <button onClick={clearFilters} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
              <i className="fa-solid fa-arrow-rotate-left" style={{ marginRight: 6 }} />Reset Semua Filter
            </button>
          </div>

        /* ═══════ GRID VIEW ═══════ */
        ) : viewMode === 'grid' ? (
          <div className="skl-grid">
            {filtered.map((school, i) => {
              const theme = getGugusTheme(school.gugus);
              const slug = generateSchoolSlug(school.name);
              const cardVars = {
                '--card-primary': theme.primary,
                '--card-accent': theme.accent,
                '--card-primary-tint': `${theme.primary}22`,
                '--card-accent-tint': `${theme.accent}14`
              } as React.CSSProperties;
              return (
                <RevealOnScroll key={school.npsn} delay={(i % 4) * 0.05} duration={0.45}>
                  <div className="skl-card reveal-on-scroll" style={{ ...cardVars, ['--reveal-delay' as string]: `${(i % 6) * 60}ms`, height: '100%' }}>
                    {/* Card Header */}
                    <div className="skl-card-header">
                      {/* Header Logo + Info Row */}
                      <div className="skl-card-header-row">
                        <div className="skl-card-logo" style={{ background: school.logoUrl ? 'var(--card-glass)' : `linear-gradient(135deg,${theme.primary},${theme.accent})` }}>
                          {school.logoUrl
                            ? <img src={school.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
                            : <i className="fa-solid fa-graduation-cap" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="skl-card-name">{school.name}</h3>
                          <p className="skl-card-npsn">NPSN {school.npsn}</p>
                        </div>
                      </div>

                      {/* Floating Badges */}
                      <div className="skl-card-badges">
                        <span className="skl-badge" style={{ background: theme.primary, color: '#ffffff' }}>
                          Gugus {school.gugus}
                        </span>
                        {(() => {
                          const status = getSchoolStatus(school);
                          return (
                            <span className="skl-badge" style={{
                              background: status === 'Negeri' ? '#10b981' : '#8b5cf6',
                              color: '#ffffff'
                            }}>
                              <i className={status === 'Negeri' ? 'fa-solid fa-landmark' : 'fa-solid fa-building'} style={{ fontSize: '9px' }} />
                              {status}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                      {/* Card Body */}
                      <div className="skl-card-body">
                        {/* Stats */}
                        <div className="skl-card-stats">
                          <div className="skl-card-stat">
                            <div className="skl-card-stat-num">{school.studentCount}</div>
                            <div className="skl-card-stat-label">Siswa</div>
                          </div>
                          <div className="skl-card-stat">
                            <div className="skl-card-stat-num">{school.teacherCount}</div>
                            <div className="skl-card-stat-label">Guru</div>
                          </div>
                        </div>

                        {/* Info Rows */}
                        <div className="skl-card-info">
                          {school.principalName && (
                            <div className="skl-card-info-row">
                              <div className="skl-card-info-icon"><i className="fa-solid fa-user-tie" /></div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.principalName}</span>
                            </div>
                          )}
                          {school.address && (
                            <div className="skl-card-info-row">
                              <div className="skl-card-info-icon"><i className="fa-solid fa-location-dot" /></div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{school.address}</span>
                            </div>
                          )}
                        </div>

                        {/* Action */}
                        <MagneticButton className="skl-card-action" onClick={() => router.push(`/sekolah/${slug}`)}>
                          Buka Portal <i className="fa-solid fa-arrow-right" />
                        </MagneticButton>
                      </div>
                    </div>
                  </RevealOnScroll>
              );
            })}
          </div>

        /* ═══════ LIST VIEW ═══════ */
        ) : viewMode === 'list' ? (
          <div className="skl-list">
            {filtered.map((school, i) => {
              const theme = getGugusTheme(school.gugus);
              const slug = generateSchoolSlug(school.name);
              return (
                <div
                  key={school.npsn}
                  className="skl-list-item reveal-on-scroll"
                  style={{ ['--reveal-delay' as string]: `${(i % 8) * 40}ms`, borderLeft: `3px solid ${theme.primary}` } as React.CSSProperties}
                  onClick={() => router.push(`/sekolah/${slug}`)}
                >
                  <div className="skl-list-logo" style={{ background: school.logoUrl ? 'var(--card-glass)' : `linear-gradient(135deg,${theme.primary},${theme.accent})` }}>
                    {school.logoUrl
                      ? <img src={school.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
                      : <i className="fa-solid fa-graduation-cap" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0', fontWeight: 600 }}>
                      NPSN {school.npsn} · {school.principalName || '—'}
                    </p>
                  </div>
                  <div className="skl-list-right">
                    <span className="skl-list-stat-chip" style={{ borderLeft: `2px solid ${theme.primary}` }}>Gugus {school.gugus}</span>
                    <span className="skl-list-stat-chip">
                      <i className="fa-solid fa-users" style={{ marginRight: 4, fontSize: '9px', color: 'var(--primary)' }} />{school.studentCount} siswa
                    </span>
                    <span className="skl-list-stat-chip">
                      <i className="fa-solid fa-chalkboard-user" style={{ marginRight: 4, fontSize: '9px', color: 'var(--accent)' }} />{school.teacherCount} guru
                    </span>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '11px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              );
            })}
          </div>

        /* ═══════ COMPACT VIEW ═══════ */
        ) : (
          <div className="skl-compact">
            {filtered.map((school, i) => {
              const theme = getGugusTheme(school.gugus);
              const slug = generateSchoolSlug(school.name);
              return (
                <div
                  key={school.npsn}
                  className="skl-compact-item reveal-on-scroll"
                  style={{ ['--reveal-delay' as string]: `${(i % 8) * 30}ms` } as React.CSSProperties}
                  onClick={() => router.push(`/sekolah/${slug}`)}
                >
                  <div className="skl-compact-logo" style={{ background: school.logoUrl ? 'var(--card-glass)' : `linear-gradient(135deg,${theme.primary},${theme.accent})` }}>
                    {school.logoUrl
                      ? <img src={school.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                      : <i className="fa-solid fa-graduation-cap" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.name}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 600 }}>
                      Gugus {school.gugus} · {getSchoolStatus(school)} · {school.studentCount} siswa
                    </p>
                  </div>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <LandingFooter schoolCount={schools.length || 49} />
      <BackToTop />
    </div>
  );
}
