'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import CommandPalette from '@/components/CommandPalette';
import { getSchools, getGalleryItems } from '@/lib/db';
import type { GalleryItem, GalleryCategory } from '@/lib/types';
import { GALLERY_CATEGORIES } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { toggleThemeWithTransition } from '@/lib/theme';

/** Convert Google Drive sharing URLs to direct-renderable image URLs */
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

export default function GaleriPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<GalleryCategory | 'Semua'>('Semua');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [schoolCount, setSchoolCount] = useState(49);
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);
  const [slideshowMode, setSlideshowMode] = useState(false);

  useEffect(() => {
    getSchools().then((s) => {
      if (s.length > 0) setSchoolCount(s.length);
    });
    getGalleryItems().then((items) => {
      // Sort newest date first
      setGallery(items.sort((a, b) => b.date.localeCompare(a.date)));
    });
  }, []);

  // Call scroll reveal hook
  useScrollReveal([gallery, activeCategory]);

  const filteredGallery = gallery.filter((item) => {
    if (activeCategory === 'Semua') return true;
    return item.category === activeCategory;
  });

  const getCategoryColor = (cat: GalleryCategory) => {
    switch (cat) {
      case 'Rapat Ops': return '#3b82f6';
      case 'KKKS': return '#8b5cf6';
      case 'Pelatihan': return '#f59e0b';
      case 'Kunjungan': return '#22c55e';
      case 'Upacara': return '#ef4444';
      case 'Lainnya': return '#6b7280';
      default: return 'var(--primary)';
    }
  };

  const navigatePhoto = (direction: number) => {
    const currentIndex = filteredGallery.findIndex(item => item.id === activePhoto?.id);
    if (currentIndex === -1) return;
    
    const newIndex = (currentIndex + direction + filteredGallery.length) % filteredGallery.length;
    setActivePhoto(filteredGallery[newIndex]);
  };

  // Close modal on ESC key and keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePhoto) return;
      
      if (e.key === 'Escape') {
        setActivePhoto(null);
        setSlideshowMode(false);
      } else if (e.key === 'ArrowLeft') {
        navigatePhoto(-1);
      } else if (e.key === 'ArrowRight') {
        navigatePhoto(1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setSlideshowMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, filteredGallery]);

  // Auto-play slideshow
  useEffect(() => {
    if (!slideshowMode || !activePhoto) return;
    
    const interval = setInterval(() => {
      navigatePhoto(1);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [slideshowMode, activePhoto, filteredGallery]);

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      {/* Background Mesh Orbs */}
      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent)', top: '-100px', left: '-100px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(6,182,212,0.08), transparent)', top: '30%', right: '-80px', animationDelay: '2s' }} />
      </div>

      <LandingNav
        activePage="galeri"
        onOpenLogin={() => router.push('/?login=1')}
      />

      <main className="static-page-main" style={{ zIndex: 2, position: 'relative' }}>
        {/* CSS Override for premium Bento Grid & Glassmorphism */}
        <style dangerouslySetInnerHTML={{ __html: `
          .galeri-title-gradient {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
          }
          .gallery-bento-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 28px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px 80px;
          }
          @media (min-width: 1024px) {
            .gallery-bento-grid {
              grid-template-columns: repeat(3, 1fr);
            }
            .bento-card-wide {
              grid-column: span 2;
            }
          }
          .bento-gallery-card {
            border-radius: 20px !important;
            background: var(--card-glass) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid var(--card-border) !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02) !important;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
            cursor: pointer;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          .bento-gallery-card:hover {
            transform: translateY(-6px) scale(1.01) !important;
            border-color: var(--primary) !important;
            box-shadow: 0 20px 45px rgba(59, 130, 246, 0.1) !important;
          }
          .bento-img-wrapper {
            width: 100%;
            height: 240px;
            position: relative;
            overflow: hidden;
            background: rgba(255,255,255,0.02);
            border-bottom: 1px solid rgba(0,0,0,0.05);
          }
          html.dark .bento-img-wrapper {
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .bento-card-wide .bento-img-wrapper {
            height: 280px;
          }
          .bento-img-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .bento-gallery-card:hover .bento-img-wrapper img {
            transform: scale(1.06) !important;
          }
          .bento-category-tag {
            position: absolute;
            top: 16px;
            left: 16px;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #fff;
            z-index: 5;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .bento-card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(9, 15, 29, 0.85) 0%, rgba(9, 15, 29, 0.2) 60%, transparent 100%) !important;
            opacity: 0;
            transition: opacity 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 20px;
            z-index: 3;
          }
          .bento-gallery-card:hover .bento-card-overlay {
            opacity: 1;
          }
          /* Bento grid details matching card-border globally */
          .bento-gallery-card {
            border-color: var(--card-border) !important;
          }
          /* Custom styles for neat layout of 7 buttons in static-tabs */
          .static-tabs.neat-tabs {
            display: inline-flex !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            padding: 6px !important;
            scrollbar-width: none !important;
          }
          .static-tabs.neat-tabs::-webkit-scrollbar {
            display: none !important;
          }
          .static-tabs.neat-tabs .static-tab-btn {
            flex: 0 0 auto !important;
            white-space: nowrap !important;
            padding: 10px 18px !important;
          }
        ` }} />

        {/* Hero Section */}
        <section className="pub-hero animate-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="pub-hero-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <i className="fa-solid fa-images" />
            <span>Dokumentasi Resmi Koryandik</span>
          </div>
          <h1 className="galeri-title-gradient">
            Galeri Kegiatan
          </h1>
          <p className="pub-hero-subtitle" style={{ maxWidth: '650px', margin: '0 auto 30px' }}>
            Kumpulan bukti visual pelaksanaan rapat koordinasi, pelatihan operator, monitoring sekolah binaan, dan upacara dinas se-Kecamatan Cibadak.
          </p>

          {/* Stats strip */}
          <div className="pub-hero-stats">
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{gallery.length}</div>
              <div className="pub-hero-stat-label">Foto Dokumentasi</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{schoolCount}</div>
              <div className="pub-hero-stat-label">Sekolah Binaan</div>
            </div>
          </div>
        </section>

        {/* Filter Pills (Matched exactly with Profile Tabs) */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 20px' }}>
          <div className="static-tabs neat-tabs no-print animate-fade-in" role="tablist" aria-label="Kategori galeri">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'Semua'}
              className={`static-tab-btn${activeCategory === 'Semua' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory('Semua')}
            >
              <i className="fa-solid fa-layer-group" />
              Semua Kegiatan
            </button>
            {GALLERY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                className={`static-tab-btn${activeCategory === cat ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getCategoryColor(cat),
                    display: 'inline-block'
                  }}
                />
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Bento Grid */}
        <div className="gallery-bento-grid">
          {filteredGallery.length === 0 ? (
            <div
              className="glass-panel text-center animate-fade-in"
              style={{
                gridColumn: '1 / -1',
                padding: '60px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <i
                className="fa-solid fa-images"
                style={{ fontSize: '48px', color: 'var(--text-secondary)', opacity: 0.3 }}
              />
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Belum Ada Dokumentasi
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                Tidak ditemukan dokumentasi untuk kategori &ldquo;{activeCategory}&rdquo;. Data baru akan ditambahkan oleh Koryandik secara berkala.
              </p>
            </div>
          ) : (
            filteredGallery.map((item, idx) => {
              // Alternate bento width: every 3rd card is wide
              const isWide = idx % 3 === 0;
              return (
                <div
                  key={item.id}
                  className={`bento-gallery-card reveal-on-scroll ${isWide ? 'bento-card-wide' : ''}`}
                  style={{
                    ['--reveal-delay' as string]: `${idx * 60}ms`
                  } as React.CSSProperties}
                  onClick={() => setActivePhoto(item)}
                >
                  <div className="bento-img-wrapper">
                    {/* Category Label */}
                    <span
                      className="bento-category-tag"
                      style={{ background: getCategoryColor(item.category) }}
                    >
                      {item.category}
                    </span>

                    {item.imageUrl ? (
                      <img
                        src={toDirectImageUrl(item.imageUrl)}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-images" style={{ fontSize: '24px', color: getCategoryColor(item.category) }} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>Pratinjau Gambar</span>
                      </div>
                    )}

                    {/* Hover Info Overlay */}
                    <div className="bento-card-overlay">
                      <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                        {item.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)' }}>
                        <i className="fa-solid fa-calendar-day" />
                        <span>
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>
                        {item.description || 'Tidak ada deskripsi kegiatan.'}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '12px', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span><i className="fa-solid fa-school"></i> Cibadak</span>
                      <span>{new Date(item.date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Fresh Glassmorphic Lightbox Modal (Completely Reworked) */}
      {activePhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease-out'
          }}
          onClick={() => setActivePhoto(null)}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '32px',
              maxWidth: '800px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
              animation: 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Vercel-Style Floating Glass Control Pill ( declutters photo area ) */}
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(9, 15, 29, 0.8)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '99px',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              zIndex: 100,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              {/* Previous Photo */}
              <button
                onClick={() => navigatePhoto(-1)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s', padding: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                title="Sebelumnya (ArrowLeft)"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>

              {/* Autoplay Slideshow */}
              <button
                onClick={() => setSlideshowMode(!slideshowMode)}
                style={{ background: 'none', border: 'none', color: slideshowMode ? '#3b82f6' : '#94a3b8', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s', padding: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.currentTarget.style.color = slideshowMode ? '#3b82f6' : '#94a3b8'}
                title={slideshowMode ? 'Jeda Slideshow (Space)' : 'Putar Slideshow (Space)'}
              >
                <i className={`fa-solid ${slideshowMode ? 'fa-pause' : 'fa-play'}`} />
              </button>

              {/* Next Photo */}
              <button
                onClick={() => navigatePhoto(1)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s', padding: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                title="Berikutnya (ArrowRight)"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>

              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />

              {/* Counter badge */}
              <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}>
                {filteredGallery.findIndex(item => item.id === activePhoto?.id) + 1}/{filteredGallery.length}
              </span>

              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />

              {/* Close Button */}
              <button
                onClick={() => { setActivePhoto(null); setSlideshowMode(false); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s', padding: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
                title="Tutup (Esc)"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Main Image container (Aspect Optimized) */}
            <div style={{ position: 'relative', width: '100%', height: '420px', background: '#070a13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Top info badge inside image wrapper */}
              <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <span
                  style={{
                    background: getCategoryColor(activePhoto.category),
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  {activePhoto.category}
                </span>
                <span style={{ background: 'rgba(9, 15, 29, 0.75)', color: '#e2e8f0', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                  <i className="fa-solid fa-calendar-day" />
                  {new Date(activePhoto.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {activePhoto.imageUrl ? (
                <img
                  src={toDirectImageUrl(activePhoto.imageUrl)}
                  alt={activePhoto.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-images" style={{ fontSize: '56px', color: getCategoryColor(activePhoto.category) }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Foto Dokumentasi</span>
                </div>
              )}
            </div>

            {/* Image Info Details */}
            <div style={{ padding: '28px 24px 80px', background: 'rgba(15, 23, 42, 0.75)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#fff', margin: '0 0 10px', letterSpacing: '0.3px' }}>
                {activePhoto.title}
              </h2>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                {activePhoto.description || 'Tidak ada deskripsi tambahan untuk kegiatan ini.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <CommandPalette onThemeToggle={(e) => toggleThemeWithTransition(e)} />
      <LandingFooter />

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
