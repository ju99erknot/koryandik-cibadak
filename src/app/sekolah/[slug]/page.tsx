'use client';

import React, { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import BackToTop from '@/components/BackToTop';
import ParticleBackground from '@/components/ParticleBackground';
import SpotlightCard from '@/components/SpotlightCard';
import TiltCard from '@/components/TiltCard';
import RevealOnScroll from '@/components/RevealOnScroll';
import MagneticButton from '@/components/MagneticButton';
import { getSchools, getSchoolFacilities, getSchoolAchievements, getGalleryBySchool } from '@/lib/db';
import { getGugusTheme } from '@/lib/gugusThemes';
import type { GugusTheme } from '@/lib/gugusThemes';
import type { School } from '@/lib/schoolsData';
import type { SchoolFacility, SchoolAchievement, GalleryItem } from '@/lib/types';
import { findSchoolBySlug, generateSchoolSlug } from '@/lib/schoolSlug';
import { useScrollReveal } from '@/hooks/useScrollReveal';

/* ═══════════════════════════════════════════
   HELPER: Animated SVG Ring Chart
   ═══════════════════════════════════════════ */
function RingChart({ value, max, size = 110, strokeWidth = 10, color, label, suffix }: { value: number; max: number; size?: number; strokeWidth?: number; color: string; label: string; suffix?: string }) {
  const [drawn, setDrawn] = useState(0);
  const ref = useRef<SVGSVGElement>(null);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setDrawn(Math.min(value / max, 1)); obs.disconnect(); }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value, max]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg ref={ref} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-border)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={`${drawn * circ} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color}60)` }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: size > 100 ? 22 : 18, fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
          {Math.round(drawn * value)}{suffix || ''}
        </text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HELPER: Star Rating Component
   ═══════════════════════════════════════════ */
function StarRating({ rating, label, color }: { rating: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <i key={i} className={`fa-${i <= rating ? 'solid' : 'regular'} fa-star`}
            style={{ fontSize: 14, color: i <= rating ? color : 'var(--card-border)', transition: `color 0.3s ${i * 0.08}s`, filter: i <= rating ? `drop-shadow(0 0 4px ${color}40)` : 'none' }} />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HELPER: Liquid SVG Wave Section Divider
   ═══════════════════════════════════════════ */
function LiquidDivider({ color }: { color: string }) {
  const cleanColor = color.replace('#', '');
  return (
    <div className="liquid-divider-wrap">
      <svg className="liquid-divider-svg" viewBox="0 0 2400 30" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`lgrad-${cleanColor}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`${color}00`} />
            <stop offset="25%" stopColor={`${color}40`} />
            <stop offset="50%" stopColor={color} />
            <stop offset="75%" stopColor={`${color}40`} />
            <stop offset="100%" stopColor={`${color}00`} />
          </linearGradient>
        </defs>
        <g className="liquid-wave-group-fast">
          <path
            d="M 0 15 Q 150 5, 300 15 T 600 15 T 900 15 T 1200 15 T 1500 15 T 1800 15 T 2100 15 T 2400 15 L 2400 30 L 0 30 Z"
            fill={`${color}06`}
          />
        </g>
        <g className="liquid-wave-group">
          <path
            d="M 0 15 Q 150 5, 300 15 T 600 15 T 900 15 T 1200 15 T 1500 15 T 1800 15 T 2100 15 T 2400 15"
            fill="none"
            stroke={`url(#lgrad-${cleanColor})`}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

export default function SchoolProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  // ─── Core state ───
  const [school, setSchool] = useState<School | null>(null);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [facilities, setFacilities] = useState<SchoolFacility[]>([]);
  const [achievements, setAchievements] = useState<SchoolAchievement[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [theme, setTheme] = useState<GugusTheme>(getGugusTheme('default'));
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // ─── Animated counters ───
  const [cStudents, setCStudents] = useState(0);
  const [cTeachers, setCTeachers] = useState(0);

  // ─── Feature #4: Testimonial Carousel ───
  const [carouselIdx, setCarouselIdx] = useState(0);

  // ─── Feature #5: FAB ───
  const [fabOpen, setFabOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Feature #6: Live Info ───
  const [clock, setClock] = useState('');
  const [isOperational, setIsOperational] = useState(false);

  // ─── Live clock ticker ───
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      setClock(wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const day = wib.getDay();
      const hour = wib.getHours();
      setIsOperational(day >= 1 && day <= 5 && hour >= 7 && hour < 14);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Auto-slide testimonials ───
  useEffect(() => {
    const timer = setInterval(() => setCarouselIdx(i => (i + 1) % 5), 5000);
    return () => clearInterval(timer);
  }, []);

  // ─── Data loading ───
  useEffect(() => {
    getSchools().then((schools) => {
      setAllSchools(schools);
      const match = findSchoolBySlug(schools, slug);
      if (!match) { setNotFound(true); return; }
      const found = schools.find((s) => s.npsn === match.npsn);
      if (!found) { setNotFound(true); return; }
      setSchool(found);
      setTheme(getGugusTheme(found.gugus));

      Promise.all([
        getSchoolFacilities(found.npsn),
        getSchoolAchievements(found.npsn),
        getGalleryBySchool(found.npsn),
      ]).then(([fac, ach, gal]) => {
        setFacilities(fac);
        setAchievements(ach);
        setGallery(gal);
      });

      // Animate counters
      const dur = 1200, steps = 30, interval = dur / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const p = Math.min(step / steps, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setCStudents(Math.round(ease * found.studentCount));
        setCTeachers(Math.round(ease * found.teacherCount));
        if (step >= steps) clearInterval(timer);
      }, interval);
    });
  }, [slug]);

  // ─── Leaflet map ───
  useEffect(() => {
    if (!school?.lat || !school?.lng || typeof window === 'undefined') return;
    let map: unknown;
    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (!mapRef.current) return;
      const isDark = document.documentElement.classList.contains('dark');
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const m = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([school.lat!, school.lng!], 16);
      L.tileLayer(tileUrl, { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
      // Beacon pulse marker
      const beaconIcon = L.divIcon({
        html: `<div class="map-beacon-marker">
          <div class="map-beacon-ring"></div>
          <div class="map-beacon-ring"></div>
          <div class="map-beacon-ring"></div>
          <div class="map-beacon-core"><i class="fa-solid fa-school"></i></div>
        </div>`,
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      L.marker([school.lat!, school.lng!], { icon: beaconIcon }).addTo(m);
      // Ambient radius zone
      L.circle([school.lat!, school.lng!], {
        radius: 200,
        color: theme.primary,
        fillColor: theme.primary,
        fillOpacity: 0.06,
        weight: 2,
        dashArray: '8 6',
      }).addTo(m);
      // Inner glow zone
      L.circle([school.lat!, school.lng!], {
        radius: 80,
        color: theme.accent,
        fillColor: theme.accent,
        fillOpacity: 0.04,
        weight: 1,
        dashArray: '4 4',
      }).addTo(m);
      map = m;
      setMapReady(true);
      setTimeout(() => {
        m.invalidateSize();
      }, 200);
    };
    init();
    return () => { if (map && typeof (map as { remove: () => void }).remove === 'function') (map as { remove: () => void }).remove(); };
  }, [school, theme]);

  useScrollReveal([school, facilities, achievements, gallery]);

  // ─── Lightbox keyboard ───
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') { const idx = gallery.findIndex(g => g.id === lightbox.id); if (idx < gallery.length - 1) setLightbox(gallery[idx + 1]); }
      if (e.key === 'ArrowLeft') { const idx = gallery.findIndex(g => g.id === lightbox.id); if (idx > 0) setLightbox(gallery[idx - 1]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, gallery]);

  // ─── Share / Copy handler ───
  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try { await navigator.share({ title: school?.name || '', url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [school]);

  // ─── Computed data ───
  const sameGugusSchools = allSchools.filter(s => s.gugus === school?.gugus && s.npsn !== school?.npsn).slice(0, 6);
  const gugusAvgStudents = school ? Math.round(allSchools.filter(s => s.gugus === school.gugus).reduce((a, s) => a + s.studentCount, 0) / Math.max(allSchools.filter(s => s.gugus === school.gugus).length, 1)) : 0;
  const ratio = school ? Math.round(school.studentCount / Math.max(school.teacherCount, 1)) : 0;

  // Rating calculations
  const facilityRating = facilities.length >= 7 ? 5 : facilities.length >= 5 ? 4 : facilities.length >= 3 ? 3 : facilities.length >= 1 ? 2 : 1;
  const sdmRating = ratio <= 15 ? 5 : ratio <= 20 ? 4 : ratio <= 25 ? 3 : ratio <= 30 ? 2 : 1;
  const achieveRating = achievements.length >= 5 ? 5 : achievements.length >= 3 ? 4 : achievements.length >= 2 ? 3 : achievements.length >= 1 ? 2 : 1;

  const socialLinks = school ? [
    { key: 'website', icon: 'fa-globe', label: 'Website', value: school.website, color: '#3b82f6' },
    { key: 'instagram', icon: 'fa-instagram', label: 'Instagram', value: school.instagram, color: '#e1306c', brand: true },
    { key: 'facebook', icon: 'fa-facebook', label: 'Facebook', value: school.facebook, color: '#1877f2', brand: true },
    { key: 'youtube', icon: 'fa-youtube', label: 'YouTube', value: school.youtube, color: '#ff0000', brand: true },
    { key: 'tiktok', icon: 'fa-tiktok', label: 'TikTok', value: school.tiktok, color: '#010101', brand: true },
    { key: 'twitter', icon: 'fa-x-twitter', label: 'X / Twitter', value: school.twitter, color: '#1da1f2', brand: true },
    { key: 'email', icon: 'fa-envelope', label: 'Email', value: school.email, color: '#f59e0b' },
    { key: 'whatsapp', icon: 'fa-whatsapp', label: 'WhatsApp', value: school.whatsapp, color: '#25d366', brand: true },
    { key: 'telegram', icon: 'fa-telegram', label: 'Telegram', value: school.telegram, color: '#0088cc', brand: true },
  ].filter(l => l.value) : [];

  const achievementColor: Record<string, string> = { akademik: '#3b82f6', olahraga: '#10b981', seni: '#8b5cf6', keagamaan: '#f59e0b', lainnya: '#6b7280' };

  // Testimonials (contextual to school)
  const testimonials = school ? [
    { quote: `Lingkungan belajar di ${school.name} sangat kondusif dan mendukung tumbuh kembang anak secara optimal.`, name: 'Bunda Ratna', role: 'Orang Tua Siswa', icon: 'fa-user' },
    { quote: `Guru-guru di sini sangat profesional dan perhatian terhadap perkembangan setiap peserta didik.`, name: 'Pak Hendra', role: 'Wali Murid Kelas 4', icon: 'fa-user-tie' },
    { quote: `Senang bisa bersekolah di sini! Banyak kegiatan seru dan teman-teman yang baik.`, name: 'Anisa', role: 'Siswa Kelas 6', icon: 'fa-child' },
    { quote: `Administrasi sekolah tertib dan transparan. Komunikasi antara pihak sekolah dengan orang tua berjalan baik.`, name: 'Ibu Sari', role: 'Komite Sekolah', icon: 'fa-users' },
    { quote: `Fasilitas terus ditingkatkan setiap tahun. Kami bangga menjadi bagian dari keluarga besar ${school.name}.`, name: 'Pak Dedi', role: 'Alumni Wali Murid', icon: 'fa-heart' },
  ] : [];

  // Timeline milestones
  const timelineMilestones = school ? [
    { icon: 'fa-school', title: 'Berdiri sebagai Sekolah Dasar', desc: `${school.name} resmi beroperasi melayani pendidikan dasar di wilayah Kec. Cibadak.`, tag: 'Pendirian' },
    { icon: 'fa-people-group', title: `Bergabung dengan Gugus ${school.gugus}`, desc: `Tergabung dalam klaster Gugus ${school.gugus} untuk koordinasi dan pembinaan bersama.`, tag: 'Koordinasi' },
    ...(achievements.length > 0 ? [{ icon: 'fa-trophy', title: achievements[0].title, desc: achievements[0].description || 'Prestasi resmi yang membanggakan.', tag: `Prestasi ${achievements[0].year || ''}` }] : []),
    { icon: 'fa-laptop-code', title: 'Terdaftar di Platform Koryandik', desc: 'Terintegrasi dengan sistem administrasi digital Koryandik untuk pelaporan dan koordinasi modern.', tag: new Date().getFullYear().toString() },
  ] : [];

  // ─── Not Found / Loading States ───
  if (notFound) {
    return (
      <div className="landing-page static-page mesh-gradient-bg">
        <LandingNav activePage="sekolah" />
        <div style={{ textAlign: 'center', padding: '200px 24px 120px', minHeight: '70vh' }}>
          <i className="fa-solid fa-school-circle-xmark" style={{ fontSize: 72, color: 'var(--text-muted)', opacity: 0.4, marginBottom: 24 }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Sekolah Tidak Ditemukan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>Halaman profil untuk slug &quot;{slug}&quot; tidak tersedia.</p>
          <button onClick={() => router.push('/sekolah')} style={{ padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <i className="fa-solid fa-arrow-left" style={{ marginRight: 8 }} /> Kembali ke Direktori
          </button>
        </div>
        <LandingFooter schoolCount={49} />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="landing-page static-page mesh-gradient-bg">
        <LandingNav activePage="sekolah" />
        <div style={{ textAlign: 'center', padding: '200px 24px', minHeight: '70vh' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Memuat profil sekolah...</p>
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page static-page mesh-gradient-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ═══════════════════════════════════════════════════
           SCHOOL PROFILE — PREMIUM PORTAL DESIGN SYSTEM
           ═══════════════════════════════════════════════════ */

        .profile-root { width: 100%; display: flex; flex-direction: column; gap: 48px; position: relative; z-index: 1; }

        /* ── HERO GRID ── */
        .profile-hero-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 60px; align-items: center; }
        .hero-info-left { text-align: left; }
        .breadcrumb-neo { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; background: var(--card-glass); border: 1px solid var(--card-border); font-size: 11px; font-weight: 800; color: var(--text-secondary); margin-bottom: 24px; backdrop-filter: blur(8px); }
        .breadcrumb-neo a { color: var(--text-secondary); text-decoration: none; transition: color 0.2s; }
        .breadcrumb-neo a:hover { color: ${theme.primary}; }
        .profile-main-title { font-family: var(--font-heading); font-size: clamp(30px, 5vw, 48px); font-weight: 900; color: var(--text-primary); letter-spacing: -2px; line-height: 1.1; margin-bottom: 20px; }
        .badges-stack { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .badge-neo { font-size: 11px; font-weight: 800; padding: 5px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; background: var(--card-glass); border: 1px solid var(--card-border); color: var(--text-primary); backdrop-filter: blur(8px); }
        .address-left { font-size: 14px; color: var(--text-secondary); display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; margin-bottom: 24px; }
        .address-left i { margin-top: 3px; color: ${theme.primary}; }
        .action-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .btn-grad { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); color: #fff; font-size: 13px; font-weight: 800; border: none; cursor: pointer; font-family: var(--font-body); box-shadow: 0 8px 20px ${theme.primary}20; transition: all 0.25s; text-decoration: none; }
        .btn-grad:hover { transform: translateY(-2px); box-shadow: 0 12px 28px ${theme.primary}35; }
        .btn-outline { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; background: var(--card-glass); border: 1px solid var(--card-border); color: var(--text-primary); font-size: 13px; font-weight: 800; cursor: pointer; font-family: var(--font-body); backdrop-filter: blur(8px); transition: all 0.25s; text-decoration: none; }
        .btn-outline:hover { border-color: ${theme.primary}40; }

        /* ── FEATURE #6: Live Info Widget ── */
        .live-widget { display: inline-flex; align-items: center; gap: 14px; padding: 10px 20px; border-radius: 14px; background: var(--card-glass); border: 1px solid var(--card-border); backdrop-filter: blur(12px); font-size: 12px; font-weight: 700; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .live-dot.on { background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: livePulse 1.5s infinite; }
        .live-dot.off { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
        @keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .live-sep { width: 1px; height: 16px; background: var(--card-border); }

        /* ── FEATURE #3: Accreditation Badge ── */
        .accred-section { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
        .accred-badge-wrap { display: flex; align-items: center; gap: 18px; }
        .accred-ring { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-size: 28px; font-weight: 900; color: #fff; box-shadow: 0 8px 30px ${theme.primary}35; position: relative; animation: accredGlow 3s ease-in-out infinite; flex-shrink: 0; }
        @keyframes accredGlow { 0%,100% { box-shadow: 0 8px 30px ${theme.primary}35; } 50% { box-shadow: 0 8px 40px ${theme.primary}55, 0 0 60px ${theme.primary}20; } }
        .accred-ring::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 2px dashed ${theme.primary}40; animation: spin 12s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .accred-meta { display: flex; flex-direction: column; gap: 2px; }
        .accred-meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
        .accred-meta-val { font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: var(--text-primary); }
        .ratings-stack { display: flex; flex-direction: column; gap: 8px; }

        .badge-accred { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); }

        /* ── HERO RIGHT: Mini Stat Cards 2x2 Grid ── */
        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .stat-card-mini {
          padding: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .stat-card-mini:hover {
          transform: translateY(-4px);
          border-color: ${theme.primary}30;
          box-shadow: 0 10px 25px ${theme.primary}10;
        }
        .stat-card-mini-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
        }
        .stat-card-mini-val {
          font-family: var(--font-heading);
          font-size: 24px;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .stat-card-mini-lbl {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .profile-logo-header {
          transition: transform var(--transition-normal);
        }
        .profile-logo-header:hover {
          transform: rotate(5deg) scale(1.05);
        }

        /* ── SECTION LAYOUTS ── */
        .sec-block { padding: 10px 0; }
        .sec-head { margin-bottom: 28px; text-align: left; }
        .sec-title { font-family: var(--font-heading); font-size: 22px; font-weight: 900; color: var(--text-primary); letter-spacing: -1px; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .sec-title i { color: ${theme.primary}; font-size: 18px; }
        .sec-sub { font-size: 13px; color: var(--text-muted); }
        .divider-line { height: 1px; background: linear-gradient(90deg, transparent, var(--card-border), transparent); margin: 8px 0; }

        /* ── Liquid SVG Section Divider CSS ── */
        .liquid-divider-wrap {
          width: 100%;
          height: 36px;
          display: flex;
          align-items: center;
          overflow: hidden;
          margin: 16px 0;
          position: relative;
          pointer-events: none;
        }
        .liquid-divider-svg {
          width: 2400px;
          height: 100%;
          flex-shrink: 0;
          display: flex;
        }
        .liquid-wave-group {
          display: flex;
          width: 2400px;
          animation: liquid-wave-slide 18s linear infinite;
        }
        .liquid-wave-group-fast {
          display: flex;
          width: 2400px;
          animation: liquid-wave-slide-reverse 12s linear infinite;
          opacity: 0.6;
        }
        @keyframes liquid-wave-slide {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-1200px, 0, 0); }
        }
        @keyframes liquid-wave-slide-reverse {
          0% { transform: translate3d(-1200px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        /* ── Staff Cards ── */
        .staff-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
        .staff-inner { padding: 24px; display: flex; align-items: center; gap: 16px; }
        .staff-avatar { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; flex-shrink: 0; background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); box-shadow: 0 8px 16px ${theme.primary}20; }
        .staff-role-tag { font-size: 9px; font-weight: 800; color: ${theme.primary}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; display: block; }
        .staff-name { font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .staff-phone { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }

        /* ── FEATURE #1: Infographic Dashboard ── */
        .infograph-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; }
        .infograph-card { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; border-radius: 20px; }
        .infograph-bar-wrap { width: 100%; padding: 24px; border-radius: 20px; }
        .infograph-bar-track { height: 12px; border-radius: 99px; background: var(--card-border); overflow: hidden; position: relative; }
        .infograph-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, ${theme.primary}, ${theme.accent}); transition: width 1.6s cubic-bezier(0.22,1,0.36,1); position: relative; }
        .infograph-bar-fill::after { content: ''; position: absolute; top: 0; left: -60%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: bar-shimmer 2.4s ease-in-out infinite; }
        @keyframes bar-shimmer { 0% { left: -60%; } 60% { left: 120%; } 100% { left: 120%; } }
        .infograph-bar-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; font-weight: 700; color: var(--text-secondary); }

        /* ── FEATURE #2: Timeline ── */
        .timeline-wrap { position: relative; padding-left: 40px; }
        .timeline-line { position: absolute; left: 16px; top: 10px; bottom: 10px; width: 3px; border-radius: 99px; background: linear-gradient(180deg, ${theme.primary}, ${theme.accent}); box-shadow: 0 0 12px ${theme.primary}40; }
        .timeline-item { position: relative; margin-bottom: 32px; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-dot { position: absolute; left: -32px; top: 8px; width: 16px; height: 16px; border-radius: 50%; background: ${theme.primary}; border: 3px solid var(--bg-space); box-shadow: 0 0 12px ${theme.primary}60; z-index: 2; }
        .timeline-tag { font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 6px; background: ${theme.primary}12; color: ${theme.primary}; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 6px; }
        .timeline-card-inner { padding: 20px; border-radius: 16px; }
        .timeline-card-title { font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .timeline-card-title i { color: ${theme.primary}; }
        .timeline-card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0; }

        /* ── Split Features Grid ── */
        .split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .split-col { display: flex; flex-direction: column; gap: 14px; }
        
        /* Bento Facilities Grid */
        .facility-bento-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .facility-bento-card {
          padding: 20px 16px; border-radius: 18px; text-align: center;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
          background: var(--card-glass); border: 1px solid var(--card-border);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer;
        }
        .facility-bento-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: ${theme.primary}50;
          box-shadow: 0 12px 30px ${theme.primary}15;
        }
        .facility-bento-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, ${theme.primary}15, ${theme.accent}15);
          border: 1px solid ${theme.primary}20; color: ${theme.primary};
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; transition: transform 0.3s ease;
        }
        .facility-bento-card:hover .facility-bento-icon {
          transform: scale(1.1) rotate(6deg);
          background: linear-gradient(135deg, ${theme.primary}, ${theme.accent});
          color: #fff;
        }
        .facility-bento-name { font-family: var(--font-heading); font-size: 13px; font-weight: 800; color: var(--text-primary); line-height: 1.3; }

        .feat-inner { padding: 18px 22px; display: flex; gap: 16px; align-items: flex-start; transition: all 0.3s ease; }
        .feat-icon { width: 44px; height: 44px; border-radius: 14px; background: ${theme.primary}12; border: 1px solid ${theme.primary}20; color: ${theme.primary}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 4px 12px ${theme.primary}10; }
        .feat-title { font-family: var(--font-heading); font-size: 14px; font-weight: 850; color: var(--text-primary); margin-bottom: 4px; }
        .feat-desc { font-size: 12px; color: var(--text-muted); line-height: 1.45; margin: 0; }
        .feat-pills { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .feat-pill { font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.04em; }

        /* ── Cinematic Masonry Gallery ── */
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .gallery-item { border-radius: 20px; overflow: hidden; aspect-ratio: 4/3; position: relative; cursor: pointer; border: 1px solid var(--card-border); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .gallery-item:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,0.25); border-color: ${theme.accent}60; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .gallery-item:hover img { transform: scale(1.12); }
        .gallery-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(0deg, rgba(3,7,18,0.85) 0%, rgba(3,7,18,0.2) 50%, transparent 100%);
          display: flex; flex-direction: column; justify-content: flex-end; padding: 20px;
          opacity: 0; transform: translateY(10px); transition: all 0.35s ease;
        }
        .gallery-item:hover .gallery-overlay { opacity: 1; transform: translateY(0); }

        /* ── FEATURE #4: Testimonial Carousel ── */
        .carousel-wrap { position: relative; overflow: hidden; border-radius: 24px; }
        .carousel-track { display: flex; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .carousel-slide { min-width: 100%; padding: 40px 48px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; }
        .carousel-avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); box-shadow: 0 8px 20px ${theme.primary}25; }
        .carousel-quote { font-size: 16px; color: var(--text-primary); font-weight: 600; line-height: 1.65; font-style: italic; max-width: 560px; position: relative; }
        .carousel-quote::before { content: '\\201C'; position: absolute; top: -24px; left: -16px; font-size: 48px; color: ${theme.primary}30; font-family: Georgia, serif; }
        .carousel-name { font-family: var(--font-heading); font-size: 14px; font-weight: 800; color: var(--text-primary); }
        .carousel-role { font-size: 12px; color: var(--text-muted); }
        .carousel-dots { display: flex; justify-content: center; gap: 8px; padding: 16px 0; }
        .carousel-dot { width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.3s; background: var(--card-border); }
        .carousel-dot.active { background: ${theme.primary}; box-shadow: 0 0 10px ${theme.primary}60; transform: scale(1.2); }

        /* ── Map ── */
        .map-grid { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 40px; align-items: center; }
        .map-addr-card { padding: 24px; }
        .map-lbl { font-family: var(--font-heading); font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: block; }
        .map-addr-val { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; }
        .map-frame-wrap { position: relative; border-radius: 24px; overflow: hidden; height: 400px; }
        .map-frame-wrap::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 26px;
          background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}, ${theme.primary});
          background-size: 300% 300%;
          animation: neon-border-shift 4s ease infinite;
          z-index: 0;
          opacity: 0.7;
        }
        .map-frame-wrap::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 30px;
          background: linear-gradient(135deg, ${theme.primary}30, ${theme.accent}20, ${theme.primary}30);
          background-size: 300% 300%;
          animation: neon-border-shift 4s ease infinite;
          filter: blur(16px);
          z-index: -1;
        }
        @keyframes neon-border-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .map-frame { position: relative; border-radius: 22px; overflow: hidden; height: 100%; z-index: 1; border: none; background: var(--bg-space-dark); }
        .map-frame .leaflet-container { height: 100%; width: 100%; background: var(--bg-space-dark) !important; }

        /* Map GPS Overlay Card */
        .map-gps-overlay {
          position: absolute; bottom: 16px; left: 16px; z-index: 1000;
          background: rgba(15,23,42,0.85); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
          padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .map-gps-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: ${theme.accent}; }
        .map-gps-coords { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; font-weight: 600; color: #fff; letter-spacing: 0.04em; }

        /* Pulse Beacon Marker */
        .map-beacon-marker { position: relative; width: 48px; height: 48px; }
        .map-beacon-core {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, ${theme.primary}, ${theme.accent});
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 20px;
          box-shadow: 0 4px 24px ${theme.primary}80;
          position: relative; z-index: 2;
          border: 3px solid rgba(255,255,255,0.9);
        }
        .map-beacon-ring {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid ${theme.primary};
          animation: beacon-pulse 2.5s ease-out infinite;
          z-index: 1;
        }
        .map-beacon-ring:nth-child(2) { animation-delay: 0s; }
        .map-beacon-ring:nth-child(3) { animation-delay: 0.8s; }
        .map-beacon-ring:nth-child(4) { animation-delay: 1.6s; }
        @keyframes beacon-pulse {
          0% { width: 48px; height: 48px; opacity: 0.7; }
          100% { width: 140px; height: 140px; opacity: 0; }
        }

        /* Coord Chip */
        .coord-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 10px;
          background: ${theme.primary}10; border: 1px solid ${theme.primary}25;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px; font-weight: 600; color: ${theme.primary};
          letter-spacing: 0.03em;
        }
        .coord-chip i { font-size: 10px; opacity: 0.7; }

        /* ── Socials ── */
        .socials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .social-card { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 12px; text-decoration: none; transition: all 0.25s; border: 1px solid var(--card-border); background: var(--card-glass); }
        .social-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: rgba(59, 130, 246, 0.15); }
        .social-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #fff; flex-shrink: 0; }
        .social-lbl { font-size: 12px; font-weight: 800; color: var(--text-primary); }
        .social-val { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }

        /* ── FEATURE #5: QR Code ── */
        .qr-section { display: flex; align-items: center; gap: 24px; padding: 24px; border-radius: 20px; }
        .qr-img-wrap { width: 140px; height: 140px; border-radius: 16px; overflow: hidden; background: #fff; padding: 10px; flex-shrink: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .qr-img-wrap img { width: 100%; height: 100%; object-fit: contain; }
        .qr-info h4 { font-family: var(--font-heading); font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px; }
        .qr-info p { font-size: 13px; color: var(--text-secondary); margin: 0 0 14px; line-height: 1.5; }

        /* ── PPDB Banner ── */
        .ppdb-banner { background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); border-radius: 24px; padding: 56px 44px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; align-items: center; text-align: left; box-shadow: 0 16px 40px ${theme.primary}20; position: relative; overflow: hidden; }
        .ppdb-banner::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 10% 20%, rgba(255,255,255,0.1) 0%, transparent 40%); }
        .ppdb-title { font-family: var(--font-heading); font-size: clamp(24px, 3.5vw, 32px); font-weight: 900; color: #fff; margin-bottom: 10px; }
        .ppdb-desc { color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.55; margin: 0; }
        .ppdb-btn-box { display: flex; justify-content: flex-end; z-index: 2; }
        .ppdb-wa-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; background: #fff; color: ${theme.primary}; font-size: 13px; font-weight: 800; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.06); transition: all 0.25s; font-family: var(--font-body); }
        .ppdb-wa-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(0,0,0,0.12); }

        /* ── Related Schools ── */
        .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .related-inner { padding: 20px; height: 100%; cursor: pointer; }
        .related-title { font-family: var(--font-heading); font-size: 14px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
        .related-addr { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
        .related-stats { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
        .related-stats span { display: flex; align-items: center; gap: 6px; }

        /* ── Empty State ── */
        .empty-box { text-align: center; padding: 30px 20px; border-radius: 16px; border: 1px dashed var(--card-border); color: var(--text-muted); background: rgba(0,0,0,0.01); }
        html.dark .empty-box { background: rgba(255,255,255,0.01); }
        .empty-box i { font-size: 24px; opacity: 0.3; margin-bottom: 6px; }

        /* ── FEATURE #5: FAB ── */
        .fab-container { position: fixed; bottom: 28px; right: 28px; z-index: 998; display: flex; flex-direction: column-reverse; align-items: center; gap: 12px; }
        .fab-main { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); color: #fff; border: none; font-size: 22px; cursor: pointer; box-shadow: 0 8px 30px ${theme.primary}40; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); z-index: 2; }
        .fab-main:hover { transform: scale(1.08); }
        .fab-main.open { transform: rotate(45deg); }
        .fab-sub { width: 44px; height: 44px; border-radius: 50%; border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.15); transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); opacity: 0; transform: scale(0.3) translateY(20px); pointer-events: none; }
        .fab-sub.show { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
        .fab-sub:hover { transform: scale(1.1) translateY(0); }
        .fab-tooltip { position: absolute; right: 60px; padding: 5px 12px; border-radius: 8px; background: var(--bg-space-dark); color: var(--text-primary); font-size: 11px; font-weight: 700; white-space: nowrap; border: 1px solid var(--card-border); pointer-events: none; opacity: 0; transition: opacity 0.2s; }
        .fab-sub:hover .fab-tooltip { opacity: 1; }

        /* ── Lightbox ── */
        .lightbox-screen { position: fixed; inset: 0; background: rgba(4,7,13,0.95); backdrop-filter: blur(20px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .lightbox-wrap { position: relative; max-width: 90%; max-height: 85vh; }
        .lightbox-wrap img { max-width: 100%; max-height: 80vh; border-radius: 20px; box-shadow: 0 30px 80px rgba(0,0,0,0.6); }
        .lightbox-close { position: absolute; top: -24px; right: -24px; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; transition: all 0.2s; }
        .lightbox-close:hover { transform: scale(1.1); background: rgba(255,255,255,0.2); }
        .lightbox-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; transition: all 0.3s; }
        .lightbox-arrow:hover { background: rgba(255,255,255,0.15); }

        .ambient-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; opacity: 0.5; }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .profile-hero-grid, .split-grid, .map-grid { grid-template-columns: 1fr; gap: 32px; }
          .ppdb-banner { grid-template-columns: 1fr; gap: 24px; }
          .ppdb-btn-box { justify-content: flex-start; }
          .carousel-slide { padding: 28px 20px; }
        }
        @media (max-width: 768px) {
          .action-row { gap: 10px; }
          .btn-grad, .btn-outline { width: 100%; justify-content: center; }
          .qr-section { flex-direction: column; text-align: center; }
          .infograph-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .profile-header-wrap { flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
        }
        @media (max-width: 480px) {
          .hero-stats-grid { grid-template-columns: 1fr; }
        }
      `}} />

      <LandingNav activePage="sekolah" />
      <ParticleBackground particleCount={35} color={`${theme.primary}25`} />
      <div className="ambient-orb" style={{ width: 450, height: 450, background: `${theme.primary}12`, top: '10%', left: '5%' }} />
      <div className="ambient-orb" style={{ width: 350, height: 350, background: `${theme.accent}08`, top: '40%', right: '5%' }} />

      <main className="static-page-main animate-fade-in">
        <div className="profile-root">

          {/* ══════════════════════════════════
              HERO SECTION
              ══════════════════════════════════ */}
          <section className="profile-hero-grid">
            <div className="hero-info-left">
              {/* Header with Logo inline next to the Title & Breadcrumbs */}
              <div className="profile-header-wrap" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
                <div className="profile-logo-header" style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  color: '#fff',
                  background: school.logoUrl ? 'transparent' : `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                  border: school.logoUrl ? '2px solid var(--card-border)' : 'none',
                  boxShadow: school.logoUrl ? 'none' : `0 10px 25px ${theme.primary}20`,
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {school.logoUrl ? (
                    <img src={school.logoUrl} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 16 }} />
                  ) : (
                    <i className="fa-solid fa-graduation-cap" style={{ display: 'block', margin: 'auto' }} />
                  )}
                </div>
                <div>
                  <div className="breadcrumb-neo" style={{ marginBottom: 12 }}>
                    <a href="/">Beranda</a>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                    <a href="/sekolah">Sekolah Binaan</a>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                    <span style={{ color: theme.primary }}>{school.name}</span>
                  </div>
                  <h1 className="profile-main-title" style={{ margin: 0, fontSize: 'clamp(24px, 4.5vw, 36px)' }}>{school.name}</h1>
                </div>
              </div>

              <div className="badges-stack">
                <span className="badge-neo"><i className="fa-solid fa-fingerprint" style={{ color: theme.primary }} /> NPSN {school.npsn}</span>
                <span className="badge-neo"><i className="fa-solid fa-award" style={{ color: theme.primary }} /> {school.level}</span>
                <span className="badge-neo"><i className="fa-solid fa-layer-group" style={{ color: theme.accent }} /> Gugus {school.gugus}</span>
                {school.accreditation && <span className="badge-neo"><i className="fa-solid fa-certificate" style={{ color: '#f59e0b' }} /> Akreditasi {school.accreditation}</span>}
                {school.status && <span className="badge-neo"><i className="fa-solid fa-building-user" style={{ color: '#10b981' }} /> {school.status}</span>}
              </div>

              {/* Live Info Banner */}
              <div className="live-status-bar" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '8px 16px', borderRadius: '12px', background: 'var(--card-glass)', border: '1px solid var(--card-border)', flexWrap: 'wrap', backdropFilter: 'blur(8px)' }}>
                <span className={`live-dot ${isOperational ? 'on' : 'off'}`} style={{ width: 8, height: 8, borderRadius: '50%' }} />
                <span style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: isOperational ? '#22c55e' : '#ef4444' }}>
                  {isOperational ? 'Jam Operasional Buka' : 'Diluar Jam Operasional'}
                </span>
                <div style={{ width: 1, height: 12, background: 'var(--card-border)' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>{clock}</span>
                <div style={{ width: 1, height: 12, background: 'var(--card-border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fa-solid fa-cloud-sun" style={{ color: '#f59e0b' }} /> Cibadak · 28°C
                </span>
              </div>

              {school.address && (
                <div className="address-left"><i className="fa-solid fa-location-dot" /><span>{school.address}</span></div>
              )}

              <div className="action-row">
                {school.whatsapp ? (
                  <a href={`https://wa.me/${school.whatsapp.replace(/\D/g, '')}?text=Halo%20Admin%20PPDB%20${encodeURIComponent(school.name)}%2C%20saya%20ingin%20bertanya%20mengenai%20syarat%20pendaftaran%20siswa%20baru.`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <MagneticButton className="btn-grad"><i className="fa-brands fa-whatsapp" /> Hubungi PPDB</MagneticButton>
                  </a>
                ) : null}
                {school.website ? (
                  <a href={school.website.startsWith('http') ? school.website : `https://${school.website}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <MagneticButton className="btn-outline"><i className="fa-solid fa-globe" /> Kunjungi Website</MagneticButton>
                  </a>
                ) : null}
              </div>
            </div>

            {/* Right Column: 4 Mini Stat Cards Grid */}
            <div className="hero-stats-grid">
              <RevealOnScroll direction="left" delay={0.05} duration={0.6}>
                <SpotlightCard className="stat-card-mini" style={{ borderRadius: 20 }}>
                  <div className="stat-card-mini-icon" style={{ background: `${theme.primary}12`, color: theme.primary }}>
                    <i className="fa-solid fa-users" />
                  </div>
                  <div>
                    <div className="stat-card-mini-val">{cStudents}</div>
                    <div className="stat-card-mini-lbl">Siswa</div>
                  </div>
                </SpotlightCard>
              </RevealOnScroll>

              <RevealOnScroll direction="left" delay={0.1} duration={0.6}>
                <SpotlightCard className="stat-card-mini" style={{ borderRadius: 20 }}>
                  <div className="stat-card-mini-icon" style={{ background: `${theme.accent}12`, color: theme.accent }}>
                    <i className="fa-solid fa-chalkboard-user" />
                  </div>
                  <div>
                    <div className="stat-card-mini-val">{cTeachers}</div>
                    <div className="stat-card-mini-lbl">Guru</div>
                  </div>
                </SpotlightCard>
              </RevealOnScroll>

              <RevealOnScroll direction="left" delay={0.15} duration={0.6}>
                <SpotlightCard className="stat-card-mini" style={{ borderRadius: 20 }}>
                  <div className="stat-card-mini-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                    <i className="fa-solid fa-scale-balanced" />
                  </div>
                  <div>
                    <div className="stat-card-mini-val">{ratio}:1</div>
                    <div className="stat-card-mini-lbl">Rasio Siswa:Guru</div>
                  </div>
                </SpotlightCard>
              </RevealOnScroll>

              <RevealOnScroll direction="left" delay={0.2} duration={0.6}>
                <SpotlightCard className="stat-card-mini" style={{ borderRadius: 20 }}>
                  <div className="stat-card-mini-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                    <i className="fa-solid fa-certificate" />
                  </div>
                  <div>
                    <div className="stat-card-mini-val">{school.accreditation || 'B'}</div>
                    <div className="stat-card-mini-lbl">Akreditasi {school.accreditation === 'A' ? 'Unggul' : school.accreditation === 'B' ? 'Baik' : school.accreditation === 'C' ? 'Cukup' : school.accreditation === 'Belum Terakreditasi' ? '' : 'Baik'}</div>
                  </div>
                </SpotlightCard>
              </RevealOnScroll>
            </div>
          </section>

          {/* ══════════════════════════════════
              STAFF
              ══════════════════════════════════ */}
          <section className="sec-block">
            <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
              <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-user-tie" /> Pimpinan & Staf</h2><span className="sec-sub">Penanggung jawab administrasi dan kepemimpinan</span></div>
            </RevealOnScroll>
            <div className="staff-grid">
              {[{ name: school.principalName, role: 'Kepala Sekolah', icon: 'fa-user-tie', phone: school.ksPhone }, { name: school.operatorName, role: 'Operator Sekolah', icon: 'fa-gears', phone: school.operatorPhone }].map((s, i) => (
                <RevealOnScroll key={i} direction="right" delay={i * 0.05} duration={0.6}>
                  <SpotlightCard style={{ borderRadius: 20 }}>
                    <div className="staff-inner">
                      <div className="staff-avatar" style={i === 1 ? { background: `linear-gradient(135deg, ${theme.accent}, ${theme.primary})` } : {}}><i className={`fa-solid ${s.icon}`} /></div>
                      <div>
                        <span className="staff-role-tag">{s.role}</span>
                        <h3 className="staff-name">{s.name || `${s.role} belum diset`}</h3>
                        {s.phone && <div className="staff-phone"><i className="fa-solid fa-phone" style={{ color: theme.primary }} /> {s.phone}</div>}
                      </div>
                    </div>
                  </SpotlightCard>
                </RevealOnScroll>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════
              VISI & MISI SECTION
              ══════════════════════════════════ */}
          {(school.vision || school.mission) && (
            <>
              <LiquidDivider color={theme.primary} />
              <section className="sec-block">
                <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
                  <div className="sec-head">
                    <h2 className="sec-title">
                      <i className="fa-solid fa-bullseye" style={{ color: theme.primary, marginRight: '10px' }} /> Visi & Misi
                    </h2>
                    <span className="sec-sub">Fokus utama dan tujuan luhur sekolah dalam pendidikan</span>
                  </div>
                </RevealOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: school.vision && school.mission ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: '20px', marginTop: '20px' }}>
                  {school.vision && (
                    <RevealOnScroll direction="left" delay={0.05} duration={0.6}>
                      <SpotlightCard className="visi-misi-card" style={{ borderRadius: 20, padding: '30px', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${theme.primary}15`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            <i className="fa-solid fa-eye" />
                          </div>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Visi Sekolah</h3>
                        </div>
                        <p style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                          &ldquo;{school.vision}&rdquo;
                        </p>
                      </SpotlightCard>
                    </RevealOnScroll>
                  )}
                  {school.mission && (
                    <RevealOnScroll direction="right" delay={0.1} duration={0.6}>
                      <SpotlightCard className="visi-misi-card" style={{ borderRadius: 20, padding: '30px', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${theme.accent}15`, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            <i className="fa-solid fa-list-check" />
                          </div>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Misi Sekolah</h3>
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                          {school.mission}
                        </div>
                      </SpotlightCard>
                    </RevealOnScroll>
                  )}
                </div>
              </section>
            </>
          )}

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              FEATURE #1: INFOGRAPHIC DASHBOARD
              ══════════════════════════════════ */}
          <section className="sec-block">
            <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
              <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-chart-pie" /> Dashboard Analitik</h2><span className="sec-sub">Visualisasi data statistik sekolah dalam format interaktif</span></div>
            </RevealOnScroll>
            <div className="infograph-grid">
              <RevealOnScroll delay={0.05}><SpotlightCard className="infograph-card" style={{ borderRadius: 20 }}>
                <RingChart value={ratio} max={40} color={theme.primary} label="Rasio Siswa:Guru" suffix=":1" />
              </SpotlightCard></RevealOnScroll>
              <RevealOnScroll delay={0.1}><SpotlightCard className="infograph-card" style={{ borderRadius: 20 }}>
                <RingChart value={school.studentCount} max={Math.max(school.studentCount, gugusAvgStudents) * 1.2} color={theme.accent} label="Total Siswa" />
              </SpotlightCard></RevealOnScroll>
              <RevealOnScroll delay={0.15}><SpotlightCard className="infograph-card" style={{ borderRadius: 20 }}>
                <RingChart value={school.teacherCount} max={30} color="#f59e0b" label="Total Guru" />
              </SpotlightCard></RevealOnScroll>
              <RevealOnScroll delay={0.2}><SpotlightCard className="infograph-card" style={{ borderRadius: 20 }}>
                <RingChart value={facilities.length} max={10} size={110} color="#8b5cf6" label="Fasilitas" />
              </SpotlightCard></RevealOnScroll>
            </div>
            {/* Comparison Bar */}
            <RevealOnScroll delay={0.1}>
              <SpotlightCard className="infograph-bar-wrap" style={{ borderRadius: 20, marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
                  <i className="fa-solid fa-scale-balanced" style={{ color: theme.primary, marginRight: 8 }} />
                  Perbandingan Jumlah Siswa vs Rata-Rata Gugus {school.gugus}
                </div>
                <div className="infograph-bar-track">
                  <div className="infograph-bar-fill" style={{ width: `${Math.min((school.studentCount / Math.max(gugusAvgStudents, 1)) * 50, 100)}%` }} />
                </div>
                <div className="infograph-bar-labels">
                  <span><i className="fa-solid fa-school" style={{ marginRight: 4, color: theme.primary }} /> {school.name.split(' ').slice(0, 3).join(' ')}: <strong>{school.studentCount}</strong></span>
                  <span>Rata-rata Gugus: <strong>{gugusAvgStudents}</strong></span>
                </div>
              </SpotlightCard>
            </RevealOnScroll>
          </section>

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              FEATURE #2: TIMELINE
              ══════════════════════════════════ */}
          <section className="sec-block">
            <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
              <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-timeline" /> Tonggak Sejarah</h2><span className="sec-sub">Perjalanan dan pencapaian penting sekolah</span></div>
            </RevealOnScroll>
            <div className="timeline-wrap">
              <div className="timeline-line" />
              {timelineMilestones.map((m, i) => (
                <RevealOnScroll key={i} delay={i * 0.1} duration={0.6}>
                  <div className="timeline-item">
                    <div className="timeline-dot" />
                    <span className="timeline-tag">{m.tag}</span>
                    <SpotlightCard className="timeline-card-inner" style={{ borderRadius: 16 }}>
                      <h4 className="timeline-card-title"><i className={`fa-solid ${m.icon}`} /> {m.title}</h4>
                      <p className="timeline-card-desc">{m.desc}</p>
                    </SpotlightCard>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </section>

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              FACILITIES & ACHIEVEMENTS
              ══════════════════════════════════ */}
          <section className="sec-block split-grid">
            <div>
              <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
                <div className="sec-head" style={{ marginBottom: 24 }}><h2 className="sec-title"><i className="fa-solid fa-building-circle-check" /> Sarana & Prasarana</h2><span className="sec-sub">Fasilitas penunjang pembelajaran</span></div>
              </RevealOnScroll>
              <div className="facility-bento-grid">
                {facilities.length > 0 ? facilities.map((fac, i) => (
                  <RevealOnScroll key={fac.id} delay={i * 0.04} duration={0.5}>
                    <div className="facility-bento-card" title={fac.description || fac.name}>
                      <div className="facility-bento-icon"><i className={`fa-solid ${fac.icon}`} /></div>
                      <span className="facility-bento-name">{fac.name}</span>
                    </div>
                  </RevealOnScroll>
                )) : <div className="empty-box" style={{ gridColumn: '1 / -1' }}><i className="fa-solid fa-building-circle-xmark" /><p style={{ fontSize: 13, margin: 0 }}>Data fasilitas belum tersedia.</p></div>}
              </div>
            </div>
            <div>
              <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
                <div className="sec-head" style={{ marginBottom: 24 }}><h2 className="sec-title"><i className="fa-solid fa-trophy" /> Galeri Prestasi</h2><span className="sec-sub">Penghargaan dan capaian resmi</span></div>
              </RevealOnScroll>
              <div className="split-col">
                {achievements.length > 0 ? achievements.map((ach, i) => {
                  const ac = achievementColor[ach.category] || '#6b7280';
                  return (
                    <RevealOnScroll key={ach.id} delay={i * 0.05} duration={0.6}>
                      <SpotlightCard style={{ borderRadius: 16 }}><div className="feat-inner">
                        <div className="feat-icon" style={{ background: `${ac}10`, color: ac }}><i className={`fa-solid ${ach.icon}`} /></div>
                        <div><h4 className="feat-title">{ach.title}</h4>{ach.description && <p className="feat-desc">{ach.description}</p>}
                          <div className="feat-pills">{ach.year && <span className="feat-pill" style={{ background: `${ac}15`, color: ac }}>{ach.year}</span>}<span className="feat-pill" style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)' }}>{ach.category}</span></div>
                        </div>
                      </div></SpotlightCard>
                    </RevealOnScroll>
                  );
                }) : <div className="empty-box"><i className="fa-solid fa-award" /><p style={{ fontSize: 13, margin: 0 }}>Data prestasi belum tercatat.</p></div>}
              </div>
            </div>
          </section>

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              GALLERY
              ══════════════════════════════════ */}
          <section className="sec-block">
            <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
              <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-images" /> Dokumentasi Kegiatan</h2><span className="sec-sub">Galeri foto kegiatan dan suasana sekolah</span></div>
            </RevealOnScroll>
            {gallery.length > 0 ? (
              <div className="gallery-grid">
                {gallery.slice(0, 8).map((item, i) => (
                  <RevealOnScroll key={item.id} delay={i * 0.05} duration={0.5}>
                    <div className="gallery-item" onClick={() => setLightbox(item)}>
                      <img src={item.imageUrl} alt={item.title} loading="lazy" />
                      <div className="gallery-overlay"><span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{item.title}</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{item.date}</span></div>
                    </div>
                  </RevealOnScroll>
                ))}
              </div>
            ) : <div className="empty-box" style={{ padding: '48px 20px' }}><i className="fa-solid fa-panorama" /><p style={{ fontSize: 13, margin: 0 }}>Belum ada galeri dokumentasi kegiatan.</p></div>}
          </section>

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              FEATURE #4: TESTIMONIAL CAROUSEL
              ══════════════════════════════════ */}
          <section className="sec-block">
            <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
              <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-quote-left" /> Suara Komunitas</h2><span className="sec-sub">Testimoni dari orang tua, siswa, dan komunitas sekolah</span></div>
            </RevealOnScroll>
            <RevealOnScroll delay={0.1}>
              <SpotlightCard className="carousel-wrap" style={{ borderRadius: 24 }}>
                <div className="carousel-track" style={{ transform: `translateX(-${carouselIdx * 100}%)` }}>
                  {testimonials.map((t, i) => (
                    <div key={i} className="carousel-slide">
                      <div className="carousel-avatar"><i className={`fa-solid ${t.icon}`} /></div>
                      <p className="carousel-quote">{t.quote}</p>
                      <div><div className="carousel-name">{t.name}</div><div className="carousel-role">{t.role}</div></div>
                    </div>
                  ))}
                </div>
                <div className="carousel-dots">
                  {testimonials.map((_, i) => (
                    <button key={i} className={`carousel-dot ${carouselIdx === i ? 'active' : ''}`} onClick={() => setCarouselIdx(i)} aria-label={`Slide ${i + 1}`} />
                  ))}
                </div>
              </SpotlightCard>
            </RevealOnScroll>
          </section>

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              MAP LOCATION
              ══════════════════════════════════ */}
          <section className="sec-block">
            <div className="map-grid">
              <div>
                <RevealOnScroll direction="right" delay={0.05} duration={0.6}>
                  <div className="sec-head" style={{ marginBottom: 24 }}><h2 className="sec-title"><i className="fa-solid fa-map-location-dot" /> Lokasi Geografis</h2><span className="sec-sub">Titik koordinat fisik sekolah binaan</span></div>
                </RevealOnScroll>
                <RevealOnScroll direction="right" delay={0.1} duration={0.6}>
                  <SpotlightCard style={{ borderRadius: 20 }}>
                    <div className="map-addr-card">
                      <span className="map-lbl">Alamat Lengkap</span>
                      <p className="map-addr-val">{school.address || 'Alamat belum terdaftar.'}</p>
                      {school.lat && school.lng && (
                        <MagneticButton className="btn-outline" onClick={() => window.open(`https://www.google.com/maps?q=${school.lat},${school.lng}`, '_blank')} style={{ padding: '10px 20px', fontSize: 13 }}>
                          <i className="fa-solid fa-compass" /> Petunjuk Google Maps
                        </MagneticButton>
                      )}
                    </div>
                  </SpotlightCard>
                </RevealOnScroll>
              </div>
              <RevealOnScroll direction="left" delay={0.12} duration={0.6}>
                {school.lat && school.lng ? (
                  <div className="map-frame-wrap">
                    <div className="map-frame" ref={mapRef} />
                    <div className="map-gps-overlay">
                      <span className="map-gps-label"><i className="fa-solid fa-satellite" style={{ marginRight: 6 }} />Live Coordinates</span>
                      <span className="map-gps-coords">{school.lat!.toFixed(6)}°S, {school.lng!.toFixed(6)}°E</span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-box" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div><i className="fa-solid fa-satellite-dish" style={{ fontSize: 36, marginBottom: 12, opacity: 0.25 }} /><p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>Koordinat peta belum terdaftar.</p></div>
                  </div>
                )}
              </RevealOnScroll>
            </div>
          </section>

          <LiquidDivider color={theme.primary} />

          {/* ══════════════════════════════════
              SOCIALS + QR CODE
              ══════════════════════════════════ */}
          <section className="sec-block">
            <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
              <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-share-nodes" /> Hubungan Masyarakat</h2><span className="sec-sub">Saluran komunikasi dan sosial media resmi</span></div>
            </RevealOnScroll>

            {socialLinks.length > 0 && (
              <div className="socials-grid" style={{ marginBottom: 24 }}>
                {socialLinks.map((link, i) => {
                  const href = link.key === 'email' ? `mailto:${link.value}` : (link.value!.startsWith('http') ? link.value! : `https://${link.value}`);
                  return (
                    <RevealOnScroll key={link.key} delay={i * 0.05} duration={0.5}>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="social-card">
                        <div className="social-icon" style={{ background: link.color }}><i className={`${link.brand ? 'fa-brands' : 'fa-solid'} ${link.icon}`} /></div>
                        <div style={{ minWidth: 0 }}><div className="social-lbl">{link.label}</div><div className="social-val">{link.value}</div></div>
                      </a>
                    </RevealOnScroll>
                  );
                })}
              </div>
            )}

            {/* FEATURE #5: QR Code */}
            <RevealOnScroll delay={0.1}>
              <SpotlightCard style={{ borderRadius: 20 }}>
                <div className="qr-section">
                  <div className="qr-img-wrap">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : encodeURIComponent(`https://koryandik.vercel.app/sekolah/${slug}`)}`} alt="QR Code" />
                  </div>
                  <div className="qr-info">
                    <h4><i className="fa-solid fa-qrcode" style={{ color: theme.primary, marginRight: 8 }} />Bagikan Profil Sekolah</h4>
                    <p>Scan kode QR ini untuk membagikan halaman profil {school.name} ke orang tua siswa, kolega, atau pihak terkait.</p>
                    <MagneticButton className="btn-outline" onClick={handleShare} style={{ padding: '10px 20px', fontSize: 13 }}>
                      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} /> {copied ? 'Link Tersalin!' : 'Salin Link Profil'}
                    </MagneticButton>
                  </div>
                </div>
              </SpotlightCard>
            </RevealOnScroll>
          </section>

          {/* ══════════════════════════════════
              PPDB CTA
              ══════════════════════════════════ */}
          <section className="sec-block" style={{ paddingTop: 20 }}>
            <RevealOnScroll delay={0.05} duration={0.6}>
              <div className="ppdb-banner">
                <div>
                  <h3 className="ppdb-title">Penerimaan Peserta Didik Baru</h3>
                  <p className="ppdb-desc">Pertanyaan seputar tata cara pendaftaran, syarat administratif, serta daya tampung siswa baru dapat dikirimkan langsung ke operator sekolah.</p>
                </div>
                <div className="ppdb-btn-box">
                  {school.whatsapp ? (
                    <a href={`https://wa.me/${school.whatsapp.replace(/\D/g, '')}?text=Halo%20Admin%20PPDB%20${encodeURIComponent(school.name)}%2C%20saya%20ingin%20bertanya%20mengenai%20syarat%20pendaftaran%20siswa%20baru.`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <MagneticButton className="ppdb-wa-btn"><i className="fa-brands fa-whatsapp" /> Hubungi Operator PPDB</MagneticButton>
                    </a>
                  ) : (
                    <MagneticButton className="ppdb-wa-btn" onClick={() => router.push('/sekolah')}><i className="fa-solid fa-school" /> Cari Sekolah Lain</MagneticButton>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* ══════════════════════════════════
              RELATED SCHOOLS
              ══════════════════════════════════ */}
          {sameGugusSchools.length > 0 && (
            <section className="sec-block">
              <RevealOnScroll direction="up" delay={0.05} duration={0.6}>
                <div className="sec-head"><h2 className="sec-title"><i className="fa-solid fa-network-wired" /> Klaster Sekolah Gugus {school.gugus}</h2><span className="sec-sub">Sekolah binaan terdekat di klaster yang sama</span></div>
              </RevealOnScroll>
              <div className="related-grid">
                {sameGugusSchools.map((s, i) => (
                  <RevealOnScroll key={s.npsn} delay={i * 0.05} duration={0.6}>
                    <TiltCard intensity={5} glare style={{ borderRadius: 16, height: '100%', border: '1px solid var(--card-border)' }}>
                      <div className="related-inner" onClick={() => router.push(`/sekolah/${generateSchoolSlug(s.name)}`)}>
                        <h4 className="related-title">{s.name}</h4>
                        <div className="related-addr"><i className="fa-solid fa-map-marker-alt" /> {s.address || 'Alamat tidak tersedia'}</div>
                        <div className="related-stats">
                          <span><i className="fa-solid fa-users" style={{ color: theme.primary }} /> {s.studentCount} Siswa</span>
                          <span><i className="fa-solid fa-chalkboard-user" style={{ color: theme.accent }} /> {s.teacherCount} Guru</span>
                        </div>
                      </div>
                    </TiltCard>
                  </RevealOnScroll>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════
          FEATURE #5: FLOATING ACTION BUTTON
          ══════════════════════════════════ */}
      <div className="fab-container">
        <button className={`fab-main ${fabOpen ? 'open' : ''}`} onClick={() => setFabOpen(!fabOpen)} aria-label="Menu Aksi Cepat">
          <i className="fa-solid fa-plus" />
        </button>

        <button className={`fab-sub ${fabOpen ? 'show' : ''}`} style={{ background: '#25d366', transitionDelay: fabOpen ? '0.05s' : '0s' }} onClick={() => { if (school.whatsapp) window.open(`https://wa.me/${school.whatsapp.replace(/\D/g, '')}`, '_blank'); setFabOpen(false); }}>
          <i className="fa-brands fa-whatsapp" /><span className="fab-tooltip">WhatsApp</span>
        </button>

        <button className={`fab-sub ${fabOpen ? 'show' : ''}`} style={{ background: '#3b82f6', transitionDelay: fabOpen ? '0.1s' : '0s' }} onClick={() => { if (school.lat && school.lng) window.open(`https://www.google.com/maps?q=${school.lat},${school.lng}`, '_blank'); setFabOpen(false); }}>
          <i className="fa-solid fa-location-dot" /><span className="fab-tooltip">Google Maps</span>
        </button>

        <button className={`fab-sub ${fabOpen ? 'show' : ''}`} style={{ background: '#8b5cf6', transitionDelay: fabOpen ? '0.15s' : '0s' }} onClick={() => { handleShare(); setFabOpen(false); }}>
          <i className="fa-solid fa-share-nodes" /><span className="fab-tooltip">{copied ? 'Tersalin!' : 'Bagikan'}</span>
        </button>

        <button className={`fab-sub ${fabOpen ? 'show' : ''}`} style={{ background: '#f59e0b', transitionDelay: fabOpen ? '0.2s' : '0s' }} onClick={() => { window.print(); setFabOpen(false); }}>
          <i className="fa-solid fa-print" /><span className="fab-tooltip">Cetak</span>
        </button>
      </div>

      {/* ══════════════════════════════════
          LIGHTBOX
          ══════════════════════════════════ */}
      {lightbox && (
        <div className="lightbox-screen" onClick={() => setLightbox(null)}>
          <div className="lightbox-wrap" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}><i className="fa-solid fa-xmark" /></button>
            <button className="lightbox-arrow" style={{ left: -80 }} onClick={() => { const idx = gallery.findIndex(g => g.id === lightbox.id); if (idx > 0) setLightbox(gallery[idx - 1]); }}><i className="fa-solid fa-chevron-left" /></button>
            <img src={lightbox.imageUrl} alt={lightbox.title} />
            <button className="lightbox-arrow" style={{ right: -80 }} onClick={() => { const idx = gallery.findIndex(g => g.id === lightbox.id); if (idx < gallery.length - 1) setLightbox(gallery[idx + 1]); }}><i className="fa-solid fa-chevron-right" /></button>
            <div style={{ color: '#fff', textAlign: 'center', marginTop: 16 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{lightbox.title}</div><div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Dokumentasi · {lightbox.date}</div></div>
          </div>
        </div>
      )}

      <LandingFooter schoolCount={allSchools.length || 49} />
      <BackToTop />
    </div>
  );
}
