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

type ViewMode = 'grid' | 'list';
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
      const matchLevel = filterLevel === 'all' || s.level === filterLevel;
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
        .sekolah-hero-title {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .sekolah-search-wrap { position: relative; max-width: 520px; width: 100%; }
        .sekolah-search-wrap i.icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px; pointer-events: none; }
        .sekolah-search-input {
          width: 100%; padding: 13px 48px 13px 46px;
          border-radius: 99px; border: 1.5px solid var(--card-border);
          background: var(--card-glass); backdrop-filter: blur(12px);
          color: var(--text-primary); font-size: 14px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sekolah-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .sekolah-search-input::placeholder { color: var(--text-muted); }
        .sekolah-search-clear {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: var(--card-border); border: none; border-radius: 50%;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-muted); font-size: 11px; transition: all 0.2s;
        }
        .sekolah-search-clear:hover { background: #ef4444; color: #fff; }
        /* Filter pills */
        .sekolah-filter-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .sekolah-filter-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 99px;
          border: 1.5px solid var(--card-border); background: var(--card-glass);
          backdrop-filter: blur(12px); color: var(--text-secondary);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1); white-space: nowrap;
        }
        .sekolah-filter-pill:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); }
        .sekolah-filter-pill.active { color: #fff; border-color: transparent; box-shadow: 0 6px 20px rgba(59,130,246,0.3); }
        .sekolah-filter-pill .badge { background: rgba(255,255,255,0.2); border-radius: 99px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
        .sekolah-filter-pill:not(.active) .badge { background: var(--card-border); color: var(--text-muted); }
        /* Toolbar */
        .sekolah-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; max-width: 1200px; margin: 0 auto;
          padding: 0 20px 20px;
        }
        .sekolah-view-toggle { display: flex; gap: 4px; background: var(--card-glass); border: 1px solid var(--card-border); border-radius: 10px; padding: 4px; }
        .sekolah-view-btn {
          width: 32px; height: 32px; border-radius: 7px; border: none;
          background: transparent; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 13px;
          transition: all 0.2s;
        }
        .sekolah-view-btn.active { background: var(--primary); color: #fff; }
        .sekolah-sort-select {
          padding: 8px 14px; border-radius: 10px; border: 1.5px solid var(--card-border);
          background: var(--card-glass); color: var(--text-primary); font-size: 12px;
          font-weight: 600; outline: none; cursor: pointer; backdrop-filter: blur(8px);
        }
        /* Grid */
        .sekolah-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 22px; max-width: 1200px; margin: 0 auto; padding: 0 20px 80px;
        }
        /* List */
        .sekolah-list { display: flex; flex-direction: column; gap: 12px; max-width: 1200px; margin: 0 auto; padding: 0 20px 80px; }
        .sekolah-list-item {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 20px; border-radius: 16px;
          border: 1.5px solid var(--card-border); background: var(--card-glass);
          backdrop-filter: blur(12px); cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .sekolah-list-item:hover { border-color: var(--primary); transform: translateX(4px); box-shadow: 0 8px 24px rgba(59,130,246,0.08); }
        /* Card */
        .sekolah-card-inner {
          padding: 22px; border-radius: 18px; height: 100%;
          display: flex; flex-direction: column; position: relative;
          background: var(--card-glass); backdrop-filter: blur(16px);
          border: 1.5px solid var(--card-border);
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .sekolah-card-inner:hover { border-color: var(--card-primary, var(--primary)); box-shadow: 0 20px 50px rgba(59,130,246,0.12); }
        .sekolah-card-strip { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 18px 18px 0 0; }
        .sekolah-logo {
          width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; color: #fff; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .sekolah-action-btn {
          width: 100%; padding: 11px; border-radius: 99px;
          border: 1.5px solid var(--card-border); background: transparent;
          color: var(--text-primary); font-family: inherit; font-size: 12px;
          font-weight: 700; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px; transition: all 0.3s cubic-bezier(0.25,1,0.5,1);
          margin-top: auto;
        }
        .sekolah-action-btn i { transition: transform 0.25s; }
        .sekolah-action-btn:hover { background: linear-gradient(135deg, var(--card-primary, var(--primary)), var(--card-accent, var(--accent))); color: #fff; border-color: transparent; box-shadow: 0 8px 20px rgba(59,130,246,0.25); }
        .sekolah-action-btn:hover i { transform: translateX(4px); }
        .sekolah-empty { text-align: center; padding: 80px 20px; color: var(--text-secondary); max-width: 1200px; margin: 0 auto; }
        .sekolah-stat-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; background: rgba(255,255,255,0.15); border: 1px solid var(--card-border); border-radius: 10px; margin: 14px 0; }
        html.dark .sekolah-stat-mini { background: rgba(15,23,42,0.2); }
        .sekolah-stat-mini-item { display: flex; flex-direction: column; align-items: center; font-size: 11px; color: var(--text-secondary); gap: 2px; }
        .sekolah-stat-mini-item strong { font-size: 15px; font-weight: 800; color: var(--text-primary); font-family: monospace; }
      ` }} />

      <LandingNav activePage="sekolah" onOpenLogin={() => router.push('/?login=1')} />

      <main className="static-page-main" style={{ zIndex: 2, position: 'relative' }}>
        {/* Hero */}
        <section className="pub-hero animate-fade-in" style={{ paddingBottom: '36px' }}>
          <div className="pub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-graduation-cap" />
            <span>Portal Sekolah Binaan</span>
          </div>
          <h1 className="sekolah-hero-title">Direktori Sekolah</h1>
          <p className="pub-hero-subtitle" style={{ maxWidth: '600px', margin: '0 auto 28px' }}>
            Profil publik, data fasilitas, pimpinan, dan informasi koordinasi untuk seluruh sekolah dasar binaan Koryandik Kecamatan Cibadak.
          </p>
          <div className="pub-hero-stats">
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num"><AnimatedNumber target={schools.length || 49} /></div>
              <div className="pub-hero-stat-label">Sekolah Binaan</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num"><AnimatedNumber target={totalStudents} /></div>
              <div className="pub-hero-stat-label">Total Siswa</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num"><AnimatedNumber target={totalTeachers} /></div>
              <div className="pub-hero-stat-label">Total Guru</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{GUGUS_LIST.length}</div>
              <div className="pub-hero-stat-label">Gugus</div>
            </div>
          </div>
        </section>

        {/* Search */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 24px' }}>
          <div className="sekolah-search-wrap">
            <i className="fa-solid fa-magnifying-glass icon" />
            <input
              className="sekolah-search-input"
              type="text"
              placeholder="Cari nama sekolah, NPSN, atau kepala sekolah..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="sekolah-search-clear" onClick={() => setSearch('')}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '0 20px 32px' }}>
          <div className="sekolah-filter-row">
            <button
              className={`sekolah-filter-pill${filterGugus === 'all' && filterLevel === 'all' ? ' active' : ''}`}
              style={filterGugus === 'all' && filterLevel === 'all' ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' } : {}}
              onClick={clearFilters}
            >
              <i className="fa-solid fa-layer-group" style={{ fontSize: '11px' }} />
              Semua
              <span className="badge">{schools.length}</span>
            </button>
            {GUGUS_LIST.map(g => {
              const theme = getGugusTheme(g);
              const count = schools.filter(s => s.gugus === g).length;
              const isActive = filterGugus === g;
              return (
                <button
                  key={g}
                  className={`sekolah-filter-pill${isActive ? ' active' : ''}`}
                  style={isActive ? { background: `linear-gradient(135deg,${theme.primary},${theme.accent})` } : {}}
                  onClick={() => { setFilterGugus(isActive ? 'all' : g); setFilterLevel('all'); }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary, display: 'inline-block', flexShrink: 0 }} />
                  Gugus {g}
                  <span className="badge">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="sekolah-toolbar">
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Menampilkan <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{filtered.length}</strong> sekolah
            {hasFilters && (
              <button onClick={clearFilters} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                <i className="fa-solid fa-xmark" style={{ marginRight: 4 }} />Reset filter
              </button>
            )}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select className="sekolah-sort-select" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
              <option value="name">Urut: Nama A–Z</option>
              <option value="gugus">Urut: Gugus</option>
              <option value="students">Urut: Siswa Terbanyak</option>
              <option value="teachers">Urut: Guru Terbanyak</option>
            </select>
            <div className="sekolah-view-toggle">
              <button className={`sekolah-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid">
                <i className="fa-solid fa-grip" />
              </button>
              <button className={`sekolah-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List">
                <i className="fa-solid fa-list" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {!loaded ? (
          <div className={viewMode === 'grid' ? 'sekolah-grid' : 'sekolah-list'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 18, border: '1.5px solid var(--card-border)', background: 'var(--card-glass)', height: viewMode === 'grid' ? 260 : 72, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.5 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="sekolah-empty animate-fade-in">
            <i className="fa-solid fa-school-circle-xmark" style={{ fontSize: '52px', opacity: 0.2, display: 'block', marginBottom: '16px' }} />
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Tidak Ada Sekolah</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Tidak ditemukan sekolah yang cocok dengan filter yang dipilih.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="sekolah-grid">
            {filtered.map((school, i) => {
              const theme = getGugusTheme(school.gugus);
              const slug = generateSchoolSlug(school.name);
              const cardVars = { '--card-primary': theme.primary, '--card-accent': theme.accent } as React.CSSProperties;
              return (
                <RevealOnScroll key={school.npsn} delay={(i % 4) * 0.05} duration={0.45}>
                  <TiltCard intensity={5} glare style={{ borderRadius: 18, height: '100%', border: '1.5px solid var(--card-border)' }}>
                    <div className="sekolah-card-inner reveal-on-scroll" style={{ ...cardVars, ['--reveal-delay' as string]: `${(i % 6) * 60}ms` }}>
                      <div className="sekolah-card-strip" style={{ background: `linear-gradient(90deg,${theme.primary},${theme.accent})` }} />
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div className="sekolah-logo" style={{ background: school.logoUrl ? 'transparent' : `linear-gradient(135deg,${theme.primary},${theme.accent})` }}>
                          {school.logoUrl
                            ? <img src={school.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
                            : <i className="fa-solid fa-graduation-cap" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px', lineHeight: 1.3 }}>{school.name}</h3>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>NPSN {school.npsn}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px', background: `${theme.primary}15`, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gugus {school.gugus}</span>
                        <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px', background: 'rgba(59,130,246,0.08)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{school.level}</span>
                      </div>
                      <div className="sekolah-stat-mini">
                        <div className="sekolah-stat-mini-item"><span>Siswa</span><strong>{school.studentCount}</strong></div>
                        <div className="sekolah-stat-mini-item" style={{ borderLeft: '1px solid var(--card-border)' }}><span>Guru</span><strong>{school.teacherCount}</strong></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px', flex: 1 }}>
                        {school.principalName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <i className="fa-solid fa-user-tie" style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid var(--card-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.principalName}</span>
                          </div>
                        )}
                        {school.address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <i className="fa-solid fa-map-pin" style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid var(--card-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0, marginTop: 1 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{school.address}</span>
                          </div>
                        )}
                      </div>
                      <MagneticButton className="sekolah-action-btn" onClick={() => router.push(`/sekolah/${slug}`)}>
                        Buka Portal <i className="fa-solid fa-arrow-right" />
                      </MagneticButton>
                    </div>
                  </TiltCard>
                </RevealOnScroll>
              );
            })}
          </div>
        ) : (
          <div className="sekolah-list">
            {filtered.map((school, i) => {
              const theme = getGugusTheme(school.gugus);
              const slug = generateSchoolSlug(school.name);
              return (
                <div
                  key={school.npsn}
                  className="sekolah-list-item reveal-on-scroll"
                  style={{ ['--reveal-delay' as string]: `${(i % 8) * 40}ms`, borderLeft: `3px solid ${theme.primary}` } as React.CSSProperties}
                  onClick={() => router.push(`/sekolah/${slug}`)}
                >
                  <div className="sekolah-logo" style={{ background: school.logoUrl ? 'transparent' : `linear-gradient(135deg,${theme.primary},${theme.accent})`, width: 40, height: 40, borderRadius: 10, fontSize: 16 }}>
                    {school.logoUrl
                      ? <img src={school.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                      : <i className="fa-solid fa-graduation-cap" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 600 }}>NPSN {school.npsn} · {school.principalName || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px', background: `${theme.primary}15`, color: theme.primary }}>Gugus {school.gugus}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{school.studentCount} siswa</span>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '11px', color: 'var(--text-muted)' }} />
                  </div>
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
