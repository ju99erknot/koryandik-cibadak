'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import CommandPalette from '@/components/CommandPalette';
import { getSchools, getGalleryItems } from '@/lib/db';
import type { GalleryItem, GalleryCategory } from '@/lib/types';
import { GALLERY_CATEGORIES } from '@/lib/types';
import { toggleThemeWithTransition } from '@/lib/theme';

function toDirectImageUrl(url: string): string {
  if (!url) return url;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (ucMatch) return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  return url;
}

const CAT_META: Record<string, { color: string; gradient: string; icon: string }> = {
  'Rapat Ops': { color: '#3b82f6', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', icon: 'fa-users' },
  'KKKS':      { color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', icon: 'fa-chalkboard-teacher' },
  'Pelatihan': { color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: 'fa-graduation-cap' },
  'Kunjungan': { color: '#22c55e', gradient: 'linear-gradient(135deg,#22c55e,#15803d)', icon: 'fa-map-location-dot' },
  'Upacara':   { color: '#ef4444', gradient: 'linear-gradient(135deg,#ef4444,#b91c1c)', icon: 'fa-flag' },
  'Lainnya':   { color: '#6b7280', gradient: 'linear-gradient(135deg,#6b7280,#374151)', icon: 'fa-ellipsis' },
};

function getCatColor(cat: GalleryCategory) { return CAT_META[cat]?.color ?? 'var(--primary)'; }
function getCatGradient(cat: GalleryCategory) { return CAT_META[cat]?.gradient ?? 'var(--primary)'; }
function getCatIcon(cat: GalleryCategory) { return CAT_META[cat]?.icon ?? 'fa-images'; }

export default function GaleriPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<GalleryCategory | 'Semua'>('Semua');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [schoolCount, setSchoolCount] = useState(49);
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);
  const [slideshowMode, setSlideshowMode] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSchools().then(s => { if (s.length > 0) setSchoolCount(s.length); });
    getGalleryItems().then(items => setGallery(items.sort((a, b) => b.date.localeCompare(a.date))));
  }, []);

  const filteredGallery = gallery.filter(item => {
    const matchCat = activeCategory === 'Semua' || item.category === activeCategory;
    const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const catCounts = GALLERY_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = gallery.filter(i => i.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const navigatePhoto = useCallback((dir: number) => {
    const idx = filteredGallery.findIndex(i => i.id === activePhoto?.id);
    if (idx === -1) return;
    setImgLoaded(false);
    setActivePhoto(filteredGallery[(idx + dir + filteredGallery.length) % filteredGallery.length]);
  }, [activePhoto, filteredGallery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activePhoto) return;
      if (e.key === 'Escape') { setActivePhoto(null); setSlideshowMode(false); }
      else if (e.key === 'ArrowLeft') navigatePhoto(-1);
      else if (e.key === 'ArrowRight') navigatePhoto(1);
      else if (e.key === ' ') { e.preventDefault(); setSlideshowMode(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePhoto, navigatePhoto]);

  useEffect(() => {
    if (!slideshowMode || !activePhoto) return;
    const t = setInterval(() => navigatePhoto(1), 3500);
    return () => clearInterval(t);
  }, [slideshowMode, activePhoto, navigatePhoto]);

  useEffect(() => {
    document.body.style.overflow = activePhoto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activePhoto]);

  const currentIdx = filteredGallery.findIndex(i => i.id === activePhoto?.id);

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', top: '-150px', left: '-150px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', top: '40%', right: '-80px', animationDelay: '2s' }} />
        <div className="pub-hero-orb" style={{ width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(236,72,153,0.06), transparent)', bottom: '10%', left: '30%', animationDelay: '4s' }} />
      </div>

      <LandingNav activePage="galeri" onOpenLogin={() => router.push('/?login=1')} />

      <main className="static-page-main" style={{ zIndex: 2, position: 'relative' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .galeri-hero-title {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 900;
            font-size: clamp(2.2rem, 5vw, 3.5rem);
            line-height: 1.1;
            letter-spacing: -0.03em;
          }
          /* Filter bar */
          .galeri-filter-bar {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
            padding: 0 20px 40px;
          }
          .galeri-filter-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 18px;
            border-radius: 99px;
            border: 1.5px solid var(--card-border);
            background: var(--card-glass);
            backdrop-filter: blur(12px);
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
            white-space: nowrap;
          }
          .galeri-filter-btn:hover {
            border-color: var(--primary);
            color: var(--primary);
            transform: translateY(-2px);
          }
          .galeri-filter-btn.active {
            background: var(--primary);
            border-color: var(--primary);
            color: #fff;
            box-shadow: 0 6px 20px rgba(59,130,246,0.35);
          }
          .galeri-filter-btn .count-badge {
            background: rgba(255,255,255,0.2);
            border-radius: 99px;
            padding: 1px 7px;
            font-size: 10px;
            font-weight: 700;
          }
          .galeri-filter-btn:not(.active) .count-badge {
            background: var(--card-border);
            color: var(--text-muted);
          }
          /* Search bar */
          .galeri-search-wrap {
            position: relative;
            max-width: 380px;
            width: 100%;
          }
          .galeri-search-wrap i {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 13px;
            pointer-events: none;
          }
          .galeri-search-input {
            width: 100%;
            padding: 11px 16px 11px 40px;
            border-radius: 99px;
            border: 1.5px solid var(--card-border);
            background: var(--card-glass);
            backdrop-filter: blur(12px);
            color: var(--text-primary);
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s;
          }
          .galeri-search-input:focus { border-color: var(--primary); }
          .galeri-search-input::placeholder { color: var(--text-muted); }
          /* Masonry grid */
          .galeri-masonry {
            columns: 3;
            column-gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px 80px;
          }
          @media (max-width: 900px) { .galeri-masonry { columns: 2; } }
          @media (max-width: 560px) { .galeri-masonry { columns: 1; } }
          .galeri-card {
            break-inside: avoid;
            margin-bottom: 20px;
            border-radius: 18px;
            overflow: hidden;
            border: 1.5px solid var(--card-border);
            background: var(--card-glass);
            backdrop-filter: blur(16px);
            cursor: pointer;
            transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
            position: relative;
          }
          .galeri-card:hover {
            transform: translateY(-5px) scale(1.01);
            border-color: var(--primary);
            box-shadow: 0 20px 50px rgba(59,130,246,0.12);
          }
          .galeri-card-img {
            width: 100%;
            display: block;
            object-fit: cover;
            transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
          }
          .galeri-card:hover .galeri-card-img { transform: scale(1.05); }
          .galeri-card-img-wrap {
            overflow: hidden;
            position: relative;
          }
          .galeri-card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(5,10,25,0.9) 0%, rgba(5,10,25,0.3) 50%, transparent 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 18px;
          }
          .galeri-card:hover .galeri-card-overlay { opacity: 1; }
          .galeri-card-body {
            padding: 16px;
          }
          .galeri-cat-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 99px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #fff;
            margin-bottom: 8px;
          }
          /* Lightbox */
          .galeri-lightbox-bg {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(2,6,18,0.92);
            backdrop-filter: blur(24px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: lbFadeIn 0.2s ease-out;
          }
          .galeri-lightbox {
            position: relative;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            border-radius: 28px;
            overflow: hidden;
            background: rgba(10,18,40,0.7);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08);
            animation: lbScaleIn 0.3s cubic-bezier(0.16,1,0.3,1);
          }
          .galeri-lightbox-img-area {
            position: relative;
            flex: 1;
            min-height: 0;
            background: #050a18;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .galeri-lightbox-img {
            max-width: 100%;
            max-height: 60vh;
            object-fit: contain;
            display: block;
            transition: opacity 0.2s;
          }
          .galeri-lightbox-img.loading { opacity: 0; }
          .galeri-lightbox-info {
            padding: 22px 24px 24px;
            background: rgba(10,18,40,0.85);
            border-top: 1px solid rgba(255,255,255,0.07);
          }
          .galeri-lb-controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 16px;
            background: rgba(5,10,25,0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 99px;
            padding: 8px 20px;
            z-index: 10;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
          }
          .galeri-lb-btn {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 13px;
            padding: 0;
            transition: color 0.2s, transform 0.15s;
            line-height: 1;
          }
          .galeri-lb-btn:hover { color: #3b82f6; transform: scale(1.15); }
          .galeri-lb-btn.active { color: #3b82f6; }
          .galeri-lb-btn.close:hover { color: #ef4444; }
          .galeri-lb-divider { width: 1px; height: 14px; background: rgba(255,255,255,0.12); }
          /* Nav arrows */
          .galeri-lb-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(5,10,25,0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            z-index: 10;
          }
          .galeri-lb-arrow:hover { background: rgba(59,130,246,0.8); border-color: #3b82f6; transform: translateY(-50%) scale(1.08); }
          .galeri-lb-arrow.prev { left: 16px; }
          .galeri-lb-arrow.next { right: 16px; }
          /* Progress bar */
          .galeri-lb-progress {
            position: absolute;
            top: 0;
            left: 0;
            height: 2px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            transition: width 0.1s linear;
            z-index: 20;
          }
          @keyframes lbFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes lbScaleIn { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          /* Empty state */
          .galeri-empty {
            grid-column: 1/-1;
            text-align: center;
            padding: 80px 20px;
            color: var(--text-secondary);
          }
        ` }} />

        {/* Hero */}
        <section className="pub-hero animate-fade-in" style={{ paddingBottom: '36px' }}>
          <div className="pub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-images" />
            <span>Dokumentasi Resmi Koryandik</span>
          </div>
          <h1 className="galeri-hero-title">Galeri Kegiatan</h1>
          <p className="pub-hero-subtitle" style={{ maxWidth: '600px', margin: '0 auto 28px' }}>
            Kumpulan dokumentasi visual rapat koordinasi, pelatihan, monitoring sekolah binaan, dan upacara dinas se-Kecamatan Cibadak.
          </p>
          <div className="pub-hero-stats">
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{gallery.length}</div>
              <div className="pub-hero-stat-label">Foto Dokumentasi</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{schoolCount}</div>
              <div className="pub-hero-stat-label">Sekolah Binaan</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{GALLERY_CATEGORIES.length}</div>
              <div className="pub-hero-stat-label">Kategori Kegiatan</div>
            </div>
          </div>
        </section>

        {/* Search + Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '0 20px 36px' }}>
          <div className="galeri-search-wrap">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              className="galeri-search-input"
              type="text"
              placeholder="Cari dokumentasi kegiatan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="galeri-filter-bar" style={{ padding: 0 }}>
            <button
              className={`galeri-filter-btn${activeCategory === 'Semua' ? ' active' : ''}`}
              onClick={() => setActiveCategory('Semua')}
            >
              <i className="fa-solid fa-layer-group" style={{ fontSize: '11px' }} />
              Semua
              <span className="count-badge">{gallery.length}</span>
            </button>
            {GALLERY_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`galeri-filter-btn${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={activeCategory === cat ? { background: getCatGradient(cat), borderColor: getCatColor(cat) } : {}}
              >
                <i className={`fa-solid ${getCatIcon(cat)}`} style={{ fontSize: '11px' }} />
                {cat}
                <span className="count-badge">{catCounts[cat] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        {filteredGallery.length === 0 ? (
          <div className="galeri-empty animate-fade-in">
            <i className="fa-solid fa-images" style={{ fontSize: '52px', opacity: 0.2, display: 'block', marginBottom: '16px' }} />
            <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Belum Ada Dokumentasi</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Tidak ditemukan foto untuk kategori &ldquo;{activeCategory}&rdquo;.</p>
          </div>
        ) : (
          <div className="galeri-masonry">
            {filteredGallery.map((item, idx) => {
              const heights = [200, 260, 220, 280, 240];
              const imgH = heights[idx % heights.length];
              return (
                <div
                  key={item.id}
                  className="galeri-card reveal-on-scroll"
                  style={{ ['--reveal-delay' as string]: `${(idx % 6) * 60}ms` } as React.CSSProperties}
                  onClick={() => { setImgLoaded(false); setActivePhoto(item); }}
                >
                  <div className="galeri-card-img-wrap" style={{ height: `${imgH}px` }}>
                    {item.imageUrl ? (
                      <img
                        className="galeri-card-img"
                        src={toDirectImageUrl(item.imageUrl)}
                        alt={item.title}
                        loading="lazy"
                        style={{ height: `${imgH}px` }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: `${imgH}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
                        <i className={`fa-solid ${getCatIcon(item.category)}`} style={{ fontSize: '28px', color: getCatColor(item.category) }} />
                      </div>
                    )}
                    <div className="galeri-card-overlay">
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: '0 0 4px', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{item.title}</p>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-calendar-day" />
                        {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="galeri-card-body">
                    <span className="galeri-cat-pill" style={{ background: getCatGradient(item.category) }}>
                      <i className={`fa-solid ${getCatIcon(item.category)}`} style={{ fontSize: '8px' }} />
                      {item.category}
                    </span>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                    {item.description && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {activePhoto && (
        <div className="galeri-lightbox-bg" onClick={() => { setActivePhoto(null); setSlideshowMode(false); }}>
          <div className="galeri-lightbox" onClick={e => e.stopPropagation()}>
            {slideshowMode && (
              <div className="galeri-lb-progress" style={{ width: '100%', animation: 'none' }} />
            )}

            <div className="galeri-lightbox-img-area">
              {/* Prev/Next arrows */}
              <button className="galeri-lb-arrow prev" onClick={() => navigatePhoto(-1)} title="Sebelumnya">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button className="galeri-lb-arrow next" onClick={() => navigatePhoto(1)} title="Berikutnya">
                <i className="fa-solid fa-chevron-right" />
              </button>

              {/* Top badges */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <span style={{ background: getCatGradient(activePhoto.category), color: '#fff', padding: '5px 12px', borderRadius: '99px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <i className={`fa-solid ${getCatIcon(activePhoto.category)}`} style={{ marginRight: '5px' }} />
                  {activePhoto.category}
                </span>
                <span style={{ background: 'rgba(5,10,25,0.75)', color: '#e2e8f0', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: '99px', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="fa-solid fa-calendar-day" />
                  {new Date(activePhoto.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {activePhoto.imageUrl ? (
                <img
                  className={`galeri-lightbox-img${imgLoaded ? '' : ' loading'}`}
                  src={toDirectImageUrl(activePhoto.imageUrl)}
                  alt={activePhoto.title}
                  onLoad={() => setImgLoaded(true)}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                  <i className={`fa-solid ${getCatIcon(activePhoto.category)}`} style={{ fontSize: '60px', color: getCatColor(activePhoto.category) }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Foto Dokumentasi</span>
                </div>
              )}

              {/* Floating controls */}
              <div className="galeri-lb-controls">
                <button className="galeri-lb-btn" onClick={() => navigatePhoto(-1)} title="Sebelumnya (←)">
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button className={`galeri-lb-btn${slideshowMode ? ' active' : ''}`} onClick={() => setSlideshowMode(p => !p)} title="Slideshow (Space)">
                  <i className={`fa-solid ${slideshowMode ? 'fa-pause' : 'fa-play'}`} />
                </button>
                <button className="galeri-lb-btn" onClick={() => navigatePhoto(1)} title="Berikutnya (→)">
                  <i className="fa-solid fa-chevron-right" />
                </button>
                <div className="galeri-lb-divider" />
                <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>
                  {currentIdx + 1}/{filteredGallery.length}
                </span>
                <div className="galeri-lb-divider" />
                <button className="galeri-lb-btn close" onClick={() => { setActivePhoto(null); setSlideshowMode(false); }} title="Tutup (Esc)">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            <div className="galeri-lightbox-info">
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '0.2px' }}>{activePhoto.title}</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
                {activePhoto.description || 'Tidak ada deskripsi tambahan untuk kegiatan ini.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <CommandPalette onThemeToggle={e => toggleThemeWithTransition(e)} />
      <LandingFooter />
    </div>
  );
}
