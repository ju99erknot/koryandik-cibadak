'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { School, GugusData, PengawasData, Category } from '@/lib/schoolsData';
import { getSchools, getSubmissions, getGugusData, getSupervisors, getCategories, getProfileSettings } from '@/lib/db';
import type { ProfileSettings } from '@/lib/types';
import type { Submission } from '@/lib/db';
import { toast } from 'sonner';
import CommandPalette from '@/components/CommandPalette';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import DistrictMap from '@/components/DistrictMap';
import LandingLocationMap from '@/components/LandingLocationMap';
import LandingFooter from '@/components/LandingFooter';
import { showDynamicNotification } from '@/components/DynamicIsland';
import CityScapeChart from '@/components/CityScapeChart';
import LiveRadar from '@/components/LiveRadar';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getGugusColor, GUGUS_IDS } from '@/lib/gugusThemes';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import LandingNav from '@/components/LandingNav';
import AcademicCalendar from '@/components/AcademicCalendar';
import LoginDrawer from '@/components/LoginDrawer';
import FancySelect from '@/components/FancySelect';
import BackToTop from '@/components/BackToTop';
import ParticleBackground from '@/components/ParticleBackground';
import RevealOnScroll from '@/components/RevealOnScroll';
import GradientText from '@/components/GradientText';
import AnimatedCard from '@/components/AnimatedCard';
import TiltCard from '@/components/TiltCard';
import SpotlightCard from '@/components/SpotlightCard';
import MagneticButton from '@/components/MagneticButton';
import ProgressBar from '@/components/ProgressBar';
import TypingText from '@/components/TypingText';


export default function LandingPage() {
  const router = useRouter();

  // Data states
  const [schools, setSchools] = useState<School[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [supervisors, setSupervisors] = useState<PengawasData[]>([]);
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);
  const [activeOfficialTab, setActiveOfficialTab] = useState<'all' | 'pengawas' | 'kkks' | 'pgri'>('all');

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: 'Halo! 👋 Saya Asisten Virtual Koryandik Cibadak. Ada yang bisa saya bantu hari ini?' }
  ]);
  const [chatTyping, setChatTyping] = useState(false);

  // Navbar scroll state
  const [navScrolled, setNavScrolled] = useState(false);

  // Status Tracker states
  const [selectedSearchSchool, setSelectedSearchSchool] = useState('');
  const [searchStatusActive, setSearchStatusActive] = useState(false);

  // Chatbot Voice State
  const [chatSpeak, setChatSpeak] = useState(false);

  // Premium SVG Map State
  const [selectedSvgGugus, setSelectedSvgGugus] = useState<string | null>('I');


  // Activity Pulse State
  const [activityPulseSchool, setActivityPulseSchool] = useState<string | null>(null);

  // Animated Counter State
  const [animatedSchools, setAnimatedSchools] = useState(0);
  const [animatedStudents, setAnimatedStudents] = useState(0);
  const [animatedTeachers, setAnimatedTeachers] = useState(0);


  useEffect(() => {
    // Check local session
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('koryandik_current_user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          if (userObj.role === 'admin') router.push('/admin/dashboard');
          else if (userObj.role === 'gugus') router.push('/gugus/dashboard');
          else if (userObj.role === 'pengawas') router.push('/pengawas/dashboard');
          else if (userObj.role === 'kkks') router.push('/kkks/dashboard');
          else if (userObj.role === 'pgri') router.push('/pgri/dashboard');
          else if (userObj.role === 'school') router.push('/school/dashboard');
        } catch {
          localStorage.removeItem('koryandik_current_user');
        }
      }

    }

    // Load all data in parallel with batched state updates (single re-render)
    Promise.all([
      getSchools(),
      getSubmissions(),
      getSupervisors(),
      getCategories(),
      getProfileSettings()
    ]).then(([schoolsData, subsData, supervisorsData, catsData, profileData]) => {
      setSchools(schoolsData);
      setSubmissions(subsData);
      setSupervisors(supervisorsData);
      setActiveCategories(catsData);
      setProfileSettings(profileData);
      // Pass existingSchools to avoid duplicate fetch inside getGugusData
      getGugusData(schoolsData).then(setGuguses);
    });
    
    // Navbar scroll listener
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setNavScrolled(true);
      } else {
        setNavScrolled(false);
      }

      // Handle navbar spacer height
      const spacer = document.getElementById('navbar-spacer');
      if (spacer) {
        if (window.scrollY > 30) {
          spacer.style.height = '70px';
        } else {
          spacer.style.height = '0';
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

  // Buka drawer login dari halaman lain (?login=1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') {
      let active = true;
      setTimeout(() => {
        if (active) setIsDrawerOpen(true);
      }, 0);
      window.history.replaceState({}, '', '/');
      return () => {
        active = false;
      };
    }
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  // Use custom scroll reveal hook
  useScrollReveal([schools, supervisors, guguses, activeOfficialTab]);

  // Reset card visibility when officials tab changes so cards re-animate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cards = document.querySelectorAll('.officials-grid .reveal-on-scroll');
    cards.forEach((el) => el.classList.remove('is-visible'));
  }, [activeOfficialTab]);

  const triggerSearch = () => {
    if (typeof window === 'undefined') return;
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  };


  const getSupervisorName = (role: string): string => {
    const sup = supervisors.find(s => s.role === role);
    return sup ? sup.name : '';
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    // Map legacy nav ids to new standalone section IDs
    const idMap: Record<string, string> = {
      pengawas: 'pengawas-section',
      cockpit: 'radar',
    };
    const targetId = idMap[id] ?? id;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };





  // Helper status tracker
  const getSelectedSchoolTrackerData = () => {
    if (!selectedSearchSchool) return null;
    const targetSchool = schools.find(s => s.npsn === selectedSearchSchool);
    if (!targetSchool) return null;

    const schoolSubs = submissions.filter(s => s.schoolNpsn === selectedSearchSchool);
    const approved = schoolSubs.filter(s => s.status === 'approved').length;
    const progressPercent = activeCategories.length > 0 ? Math.round((approved / activeCategories.length) * 100) : 0;

    return {
      school: targetSchool,
      submissions: schoolSubs,
      progress: progressPercent,
      approvedCount: approved
    };
  };

  // Leaderboard Calculation with Badges
  const leaderboard = schools.map(sch => {
    const schoolSubs = submissions.filter(s => s.schoolNpsn === sch.npsn);
    const approvedCount = schoolSubs.filter(s => s.status === 'approved').length;
    const totalCats = activeCategories.length || 1;
    const progressPercent = Math.round((approvedCount / totalCats) * 100);
    
    // Badge system
    let badge = null;
    if (progressPercent === 100) {
      badge = { icon: '🏆', name: 'Perfect', color: '#ffd700' };
    } else if (progressPercent >= 90) {
      badge = { icon: '⭐', name: 'Excellent', color: '#c0c0c0' };
    } else if (progressPercent >= 75) {
      badge = { icon: '🥉', name: 'Great', color: '#cd7f32' };
    } else if (progressPercent >= 50) {
      badge = { icon: '📈', name: 'On Track', color: '#3b82f6' };
    }
    
    return {
      ...sch,
      progress: progressPercent,
      approvedCount,
      badge
    };
  })
  .sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name))
  .slice(0, 5);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Remove emojis to avoid weird speech synthesizer sounds
      const cleanText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'id-ID';
      
      // Select indonesian voice if available
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) utterance.voice = idVoice;
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleFaqClick = (question: string, answer: string) => {
    // Prevent double clicking while bot is typing
    if (chatTyping) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: question }]);
    setChatTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text: answer }]);
      setChatTyping(false);
      if (chatSpeak) {
        speakText(answer);
      }
    }, 800);
  };




  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    if (schools.length === 0) return;
    const quotes = [
      'Sebelum ada Koryandik, kami harus bolak-balik ke kantor dinas untuk menyerahkan berkas. Sekarang cukup unggah dari sekolah, sangat membantu!',
      'Fitur tracking status berkas real-time membuat kami bisa memantau progres tanpa harus menelepon koordinator gugus berulang kali.',
      'Tampilan dashboardnya sangat modern dan mudah dipahami. Bahkan guru senior di sekolah kami bisa mengoperasikannya tanpa kesulitan.',
      'Sangat membantu dalam sinkronisasi dokumen antar sekolah binaan dan pengawas. Tidak ada lagi kertas fisik yang menumpuk!',
      'Proses validasi dan umpan balik berkas langsung dikabarkan lewat notifikasi. Sangat efisien untuk manajemen waktu kami.'
    ];
    
    const schoolsWithOps = schools.filter(s => s.operatorName && s.operatorName.trim() !== '');
    if (schoolsWithOps.length < 3) return;
    
    // Acak daftar sekolah yang memiliki nama operator
    const shuffledSchools = [...schoolsWithOps].sort(() => 0.5 - Math.random());
    const shuffledQuotes = [...quotes].sort(() => 0.5 - Math.random());
    const avatars = ['👨‍🏫', '👩‍🏫', '👩‍💻', '👨‍💻', '🧑‍💻'];
    const shuffledAvatars = [...avatars].sort(() => 0.5 - Math.random());
    
    setTestimonials([
      { name: shuffledSchools[0].operatorName, school: shuffledSchools[0].name, gugus: shuffledSchools[0].gugus, quote: shuffledQuotes[0], avatar: shuffledAvatars[0] },
      { name: shuffledSchools[1].operatorName, school: shuffledSchools[1].name, gugus: shuffledSchools[1].gugus, quote: shuffledQuotes[1], avatar: shuffledAvatars[1] },
      { name: shuffledSchools[2].operatorName, school: shuffledSchools[2].name, gugus: shuffledSchools[2].gugus, quote: shuffledQuotes[2], avatar: shuffledAvatars[2] }
    ]);
  }, [schools]);

  const getOfficialRoleMeta = (role: string) => {
    const map: Record<string, { color: string; icon: string; label: string }> = {
      admin: { color: '#8b5cf6', icon: 'fa-user-shield', label: 'Administrator' },
      pengawas: { color: '#3b82f6', icon: 'fa-user-tie', label: 'Pengawas Bina' },
      kkks: { color: '#f59e0b', icon: 'fa-users-gear', label: 'Ketua KKKS' },
      pgri: { color: '#10b981', icon: 'fa-id-card', label: 'Ketua PGRI' },
    };
    return map[role] ?? { color: '#64748b', icon: 'fa-user', label: role };
  };

  const getKecamatanProgressStats = () => {
    const defaultStats = [
      { name: 'Profil PTK', val: 88, color: '#10b981' },
      { name: 'SPJ BOS', val: 72, color: '#3b82f6' },
      { name: 'Sertifikasi', val: 60, color: '#f59e0b' },
      { name: 'Lap. Bulanan', val: 95, color: '#8b5cf6' }
    ];
    if (schools.length === 0 || submissions.length === 0) return defaultStats;

    const mapping = [
      { key: 'cat-1', name: 'Profil PTK', color: '#10b981' },
      { key: 'cat-5', name: 'SPJ BOS', color: '#3b82f6' },
      { key: 'cat-3', name: 'Sertifikasi', color: '#f59e0b' },
      { key: 'cat-6', name: 'Lap. Bulanan', color: '#8b5cf6' }
    ];

    const totalSchools = schools.length || 1;

    return mapping.map(mapItem => {
      const approvedCount = submissions.filter(
        s => s.categoryId === mapItem.key && s.status === 'approved'
      ).length;
      const val = Math.round((approvedCount / totalSchools) * 100);
      return {
        name: mapItem.name,
        val: val,
        color: mapItem.color
      };
    });
  };

  const kecamatanProgressStats = getKecamatanProgressStats();

  const totalSchoolsCount = schools.length;
  const totalStudentsCount = schools.reduce((acc, s) => acc + (s.studentCount || 0), 0);
  const totalTeachersCount = schools.reduce((acc, s) => acc + (s.teacherCount || 0), 0);

  // Animate all counters with a single rAF-based effect (eliminates 180 setState calls)
  useEffect(() => {
    if (totalSchoolsCount === 0 && totalStudentsCount === 0 && totalTeachersCount === 0) return;
    const duration = 2000;
    let startTime: number | null = null;
    let rafId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedSchools(Math.floor(eased * totalSchoolsCount));
      setAnimatedStudents(Math.floor(eased * totalStudentsCount));
      setAnimatedTeachers(Math.floor(eased * totalTeachersCount));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [totalSchoolsCount, totalStudentsCount, totalTeachersCount]);

  const trackerData = getSelectedSchoolTrackerData();

  const getGugusProgress = (gugusId: string) => {
    const gugusSchools = schools.filter(s => s.gugus === gugusId);
    if (gugusSchools.length === 0 || activeCategories.length === 0) return 0;
    const schoolNpsns = gugusSchools.map(s => s.npsn);
    const gugusApproved = submissions.filter(s => schoolNpsns.includes(s.schoolNpsn) && s.status === 'approved').length;
    return Math.round((gugusApproved / (gugusSchools.length * activeCategories.length)) * 100);
  };

  const activeGugusId = selectedSvgGugus || 'I';
  const activeGugusData = guguses.find((g) => g.id === activeGugusId);
  const activeGugusSchools = schools.filter((s) => s.gugus === activeGugusId);
  const activeGugusInti = schools.find((s) => s.npsn === activeGugusData?.sekolahInti);
  const activeGugusProgress = getGugusProgress(activeGugusId);
  const activeGugusColor = getGugusColor(activeGugusId);

  return (
    <div className="landing-page">
      {/* Background Orbs */}
      <div className="hero-mesh-bg">
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
      </div>

      {/* Navbar */}
      <LandingNav
        activePage="home"
        onScrollTo={scrollToSection}
        onOpenLogin={() => setIsDrawerOpen(true)}
        onSearch={triggerSearch}
      />

      {/* Spacer for fixed navbar */}
      <div style={{ height: '0', transition: 'height 0.3s ease' }} id="navbar-spacer" />

      {/* Hero Section */}
      <header id="top-hero" className="hero-section" style={{ paddingTop: '120px' }}>
        <div className="hero-content">
          <div className="hero-badge-pill animate-fade-in">
            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%' }}></span>
            <span>PORTAL DIGITAL KORYANDIK V5.0</span>
          </div>
          <h1 className="animate-slide-up">
            Rekap Berkas <br />
            Pendidikan Digital <br />
            <TypingText
              text="Kecamatan Cibadak"
              speed={100}
              delay={500}
              className="gradient-text"
              style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            />
          </h1>
          <p className="hero-desc animate-slide-up">
            Solusi manajemen berkas satu pintu terintegrasi Google Drive untuk pelaporan bulanan, sertifikasi guru, SPJ Dana BOS, dan Dapodik secara transparan dan terstruktur.
          </p>
          <div className="hero-actions animate-slide-up">
            <MagneticButton className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
              Masuk Portal <i className="fa-solid fa-right-to-bracket"></i>
            </MagneticButton>
            <MagneticButton className="btn btn-outline" onClick={() => scrollToSection('tracker')}>
              Cek Status Berkas <i className="fa-solid fa-magnifying-glass"></i>
            </MagneticButton>
          </div>
          <div className="hero-trust-bar animate-fade-in">
            <div className="trust-item">
              <i className="fa-solid fa-satellite-dish" style={{ animation: 'pulse 1.5s infinite' }}></i>
              <span><strong>{animatedSchools || 0}</strong> Sekolah Binaan</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <i className="fa-solid fa-users-viewfinder"></i>
              <span><strong>{(animatedStudents || 0).toLocaleString('id-ID')}</strong> Siswa Terdata</span>
            </div>
            <div className="trust-divider"></div>
            <div className="trust-item">
              <i className="fa-solid fa-network-wired"></i>
              <span><strong>{animatedTeachers || 0}</strong> Guru Terverifikasi</span>
            </div>
          </div>
        </div>

        <div className="hero-visual animate-fade-in">
          <div className="hero-dashboard-card">
            <div className="hero-card-header">
              <div className="hero-card-icon">
                <i className="fa-brands fa-google-drive"></i>
              </div>
              <div>
                <h4 style={{ fontSize: '13px' }}>Monitoring Transparan</h4>
                <small style={{ color: 'var(--text-secondary)' }}>Status Berkas Kecamatan</small>
              </div>
              <div className="hero-card-live">
                <span className="live-dot"></span> LIVE
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '10px 0' }}>
              {kecamatanProgressStats.map((prog) => (
                <div key={prog.name} style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '16px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `rgba(${parseInt(prog.color.slice(1,3), 16)}, ${parseInt(prog.color.slice(3,5), 16)}, ${parseInt(prog.color.slice(5,7), 16)}, 0.08)`;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 20px ${prog.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                    <svg width="56" height="56" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke={prog.color}
                        strokeWidth="3.5"
                        strokeDasharray="100.5"
                        strokeDashoffset={100.5 - (100.5 * prog.val) / 100}
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dashoffset 1.5s ease-in-out',
                          filter: `drop-shadow(0 0 4px ${prog.color})`
                        }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'var(--text-primary)',
                      textShadow: `0 0 10px ${prog.color}40`
                    }}>{prog.val}%</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', textAlign: 'center' }}>{prog.name}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-circle-info"></i>
              <span>Diperbarui otomatis oleh Koordinator Gugus</span>
            </div>
          </div>
          
          <div className="hero-float-badge hero-float-badge-1">
            <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)' }}></i>
            <span>Verifikasi Cepat</span>
          </div>
          <div className="hero-float-badge hero-float-badge-2">
            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }}></i>
            <span>Aman & Terstruktur</span>
          </div>
        </div>
      </header>


      {/* District Progress Board */}
      <section className="landing-section landing-progress-section">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-chart-pie" aria-hidden="true" />
              <span>Progres Wilayah</span>
            </div>
            <h2>Peta Kendali &amp; <GradientText colors={['#3b82f6', '#06b6d4']}>Progres Gugus</GradientText></h2>
            <p>Persentase penyelesaian berkas wajib se-Kecamatan Cibadak per Gugus Wilayah binaan.</p>
          </div>
        </RevealOnScroll>

        <div className="gugus-progress-grid">
          {GUGUS_IDS.map((gugusId, idx) => {
            const prog = getGugusProgress(gugusId);
            const gugusSchools = schools.filter(s => s.gugus === gugusId);
            const totalGugusSchools = gugusSchools.length;
            const schoolIntiObj = schools.find(s => s.npsn === guguses.find(g => g.id === gugusId)?.sekolahInti);
            const color = getGugusColor(gugusId);
            const isDone = prog === 100;
            const CIRC = 276.46;
            const filled = (prog / 100) * CIRC;

            return (
              <div
                key={gugusId}
                className="gugus-ctrl-card reveal-on-scroll"
                style={{
                  ['--g-color' as string]: color,
                  ['--reveal-delay' as string]: `${idx * 90}ms`,
                }}
              >
                {/* Background glow effect */}
                <div className="gugus-ctrl-glow" aria-hidden="true" />

                <div className="gugus-ctrl-body">
                  {/* Top section with badge and icon */}
                  <div className="gugus-ctrl-top">
                    <div className="gugus-ctrl-icon-wrapper">
                      <i className="fa-solid fa-layer-group" />
                    </div>
                    <div className="gugus-ctrl-meta">
                      <h3>Gugus {gugusId}</h3>
                      <p className="gugus-ctrl-school-name">
                        <i className="fa-solid fa-school-flag" />
                        {schoolIntiObj ? schoolIntiObj.name : 'Sekolah Inti tidak ditemukan'}
                      </p>
                    </div>
                  </div>

                  {/* Middle with progress ring and stats */}
                  <div className="gugus-ctrl-middle">
                    <div className="gugus-ctrl-ring">
                      <svg viewBox="0 0 100 100">
                        <circle className="gugus-ctrl-ring-track" cx="50" cy="50" r="44" />
                        <circle
                          className="gugus-ctrl-ring-fill"
                          cx="50" cy="50" r="44"
                          strokeDasharray={`${filled} ${CIRC}`}
                          strokeDashoffset="0"
                        />
                      </svg>
                      <div className="gugus-ctrl-ring-center">
                        <span className="gugus-ctrl-percent">{prog}%</span>
                        <span className="gugus-ctrl-percent-label">selesai</span>
                      </div>
                    </div>

                    <div className="gugus-ctrl-stats-grid">
                      <div className="gugus-ctrl-stat-item">
                        <div className="gugus-ctrl-stat-value">{totalGugusSchools}</div>
                        <div className="gugus-ctrl-stat-label">Total Sekolah</div>
                      </div>
                      <div className="gugus-ctrl-stat-item">
                        <div className="gugus-ctrl-stat-value accent">{gugusSchools.reduce((a, s) => a + s.studentCount, 0)}</div>
                        <div className="gugus-ctrl-stat-label">Total Siswa</div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom progress bar and status */}
                  <div className="gugus-ctrl-bottom">
                    <div className="gugus-ctrl-bar-wrap">
                      <div className="gugus-ctrl-bar-info">
                        <span>Penyelesaian Berkas</span>
                        <span className="gugus-ctrl-bar-pct">{prog}%</span>
                      </div>
                      <div className="gugus-ctrl-bar-track">
                        <div
                          className="gugus-ctrl-bar-fill"
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                    </div>

                    <div className="gugus-ctrl-footer">
                      <div className="gugus-ctrl-school-count">
                        <i className="fa-solid fa-school" />
                        {totalGugusSchools} Sekolah Binaan
                      </div>
                      <div className={`gugus-ctrl-status ${isDone ? 'done' : 'ongoing'}`}>
                        <i className={`fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle-dot'}`} />
                        {isDone ? 'Selesai' : 'Berjalan'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* Feature Highlights */}
      <section className="landing-section landing-features-section">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-sparkles" aria-hidden="true" />
              <span>Keunggulan Portal</span>
            </div>
            <h2>Fitur Utama <GradientText colors={['#3b82f6', '#06b6d4']}>Koryandik Cibadak</GradientText></h2>
            <p>Infrastruktur digital terpadu Koordinator Layanan Administrasi Pendidikan se-Kecamatan Cibadak.</p>
          </div>
        </RevealOnScroll>
        <div className="landing-features-grid">
          {[
            { icon: 'fa-brands fa-google-drive', title: 'Integrasi Google Drive', desc: 'Link langsung ke Google Drive untuk setiap berkas yang diunggah, mudah diakses dan dikelola.', accent: '#3b82f6' },
            { icon: 'fa-solid fa-chart-line', title: 'Monitoring Live Progres', desc: 'Pantau progres pengumpulan berkas secara real-time dengan visualisasi grafik interaktif.', accent: '#10b981' },
            { icon: 'fa-solid fa-bell', title: 'Notifikasi Instan', desc: 'Pemberitahuan otomatis ketika berkas disetujui, ditolak, atau membutuhkan revisi.', accent: '#f59e0b' },
            { icon: 'fa-solid fa-shield-halved', title: 'Keamanan Data Terjamin', desc: 'Akses terkontrol per peran dengan autentikasi berbasis NIP/NPSN dan enkripsi data.', accent: '#8b5cf6' },
            { icon: 'fa-solid fa-map-location-dot', title: 'Peta Lokasi Sekolah', desc: 'Visualisasi lokasi GPS seluruh sekolah binaan untuk memudahkan koordinasi wilayah.', accent: '#06b6d4' },
            { icon: 'fa-solid fa-trophy', title: 'Leaderboard Kepatuhan', desc: 'Papan peringkat sekolah yang paling responsif dan lengkap mengirimkan berkas laporan.', accent: '#f97316' },
            { icon: 'fa-solid fa-satellite-dish', title: 'Radar Aktivitas', desc: 'Memantau aktivitas pengunggahan dan verifikasi berkas secara real-time di seluruh kecamatan.', accent: '#ec4899' },
            { icon: 'fa-solid fa-file-shield', title: 'Bukti Tanda Terima', desc: 'Menerbitkan bukti tanda terima berkas resmi ber-QR Code untuk keperluan arsip.', accent: '#14b8a6' },
          ].map((feat, idx) => (
            <SpotlightCard
              key={feat.title}
              className="landing-feature-card"
              style={{ '--feature-accent': feat.accent } as React.CSSProperties}
            >
              <div className="landing-feature-icon-wrapper">
                <div className="landing-feature-icon">
                  <i className={feat.icon} aria-hidden="true" />
                </div>
              </div>
              <div className="landing-feature-content">
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Status Tracker Section */}
      <section id="tracker" className="landing-tracker-section">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <span>Pelacakan Real-Time</span>
            </div>
            <h2>Cek Status <GradientText colors={['#3b82f6', '#06b6d4']}>Berkas Sekolah</GradientText></h2>
            <p>Pilih sekolah binaan — progres pengumpulan &amp; persetujuan berkas langsung terlihat secara instan tanpa perlu login.</p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll direction="up">
          <div className="card tracker-card card--overflow-visible">
          <div className="card-body tracker-card-body">
            <div className="tracker-select-wrap">
              <FancySelect
                id="tracker-school-select"
                label="Pilih Sekolah Binaan"
                icon="fa-solid fa-school"
                searchable
                size="lg"
                value={selectedSearchSchool}
                onChange={(val: string) => {
                  setSelectedSearchSchool(val);
                  setSearchStatusActive(!!val);
                }}
                placeholder="Ketik atau pilih nama sekolah…"
                options={[
                  { value: '', label: '— Pilih Sekolah Binaan —' },
                  ...schools.map((sch) => ({
                    value: sch.npsn,
                    label: sch.name,
                    hint: `NPSN ${sch.npsn} • Gugus ${sch.gugus}`,
                  })),
                ]}
              />
            </div>
            <div className="tracker-meta-row">
              <span className="tracker-meta-chip">
                <i className="fa-solid fa-building-columns" aria-hidden="true" />
                {schools.length} sekolah terdaftar
              </span>
              <span className="tracker-meta-chip">
                <i className="fa-solid fa-folder-tree" aria-hidden="true" />
                {activeCategories.length} kategori berkas
              </span>
            </div>

            {searchStatusActive && trackerData && (
              <div className="tracker-results-area">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px' }}>{trackerData.school.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      NPSN: <code>{trackerData.school.npsn}</code> | Gugus: {trackerData.school.gugus}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-success" style={{ fontSize: '14px', padding: '6px 14px' }}>
                      Progress: {trackerData.progress}%
                    </span>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {trackerData.approvedCount} dari {activeCategories.length} kategori disetujui
                    </p>
                  </div>
                </div>

                <ProgressBar
                  value={trackerData.progress}
                  color="var(--primary)"
                  height={8}
                  showLabel={false}
                  style={{ marginBottom: '24px' }}
                />

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kategori Berkas</th>
                        <th>Status</th>
                        <th>Tanggal Pengiriman</th>
                        <th>Akses Berkas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCategories.map(cat => {
                        const sub = trackerData.submissions.find(s => s.categoryId === cat.id);
                        return (
                          <tr key={cat.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className={cat.icon} style={{ color: 'var(--primary)' }}></i>
                                <strong>{cat.name}</strong>
                              </div>
                            </td>
                            <td>
                              {sub ? (
                                <span className={`badge badge-${sub.status === 'approved' ? 'success' : sub.status === 'pending' ? 'pending' : sub.status === 'revision' ? 'revision' : 'danger'}`}>
                                  {sub.status === 'approved' ? 'Disetujui' : sub.status === 'pending' ? 'Menunggu Review' : sub.status === 'revision' ? 'Revisi' : 'Ditolak'}
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Belum Kirim</span>
                              )}
                            </td>
                            <td>{sub ? new Date(sub.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</td>
                            <td>
                              {sub ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}>
                                  <i className="fa-solid fa-shield-halved"></i> Terproteksi
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        </RevealOnScroll>
      </section>
      {/* ── SECTION: RADAR AKTIVITAS REALTIME ── */}
      <div className="section-glow-divider" aria-hidden="true" />
      <section id="radar" className="radar-section">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
              <span>Monitoring Realtime</span>
            </div>
            <h2>
              Radar Aktivitas <GradientText colors={['#3b82f6', '#06b6d4']}>Sekolah Binaan</GradientText>
            </h2>
            <p>
              Pantau aktivitas pengunggahan, verifikasi berkas, dan perubahan data sekolah se-Kecamatan
              Cibadak secara langsung — diperbarui setiap 10 detik.
            </p>
          </div>
        </RevealOnScroll>
        <RevealOnScroll direction="up">
          <LiveRadar />
        </RevealOnScroll>
      </section>

      {/* ── SECTION: KALENDER AKADEMIK & AGENDA ── */}
      <div className="section-glow-divider" aria-hidden="true" />
      <section id="calendar" className="landing-section" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
        <RevealOnScroll direction="up">
          <AcademicCalendar />
        </RevealOnScroll>
      </section>


      {/* ── SECTION: STRUKTUR GUGUS ── */}
      <div className="section-glow-divider" aria-hidden="true" />
      <section id="gugus" className="gugus-section-premium">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-sitemap" aria-hidden="true" />
              <span>Struktur Wilayah</span>
            </div>
            <h2>
              Wilayah Gugus <GradientText colors={['#3b82f6', '#06b6d4']}>&amp; Sekolah Koordinator</GradientText>
            </h2>
            <p>
              Kecamatan Cibadak terbagi menjadi {guguses.length} gugus aktif, masing-masing dikoordinasikan
              oleh satu Sekolah Inti dengan sekolah binaan tersendiri.
            </p>
          </div>
        </RevealOnScroll>

        {/* Pill tab switcher */}
        <div className="gugus-tabs-premium" role="tablist" aria-label="Pilih Gugus Wilayah">
          {guguses.map((g) => {
            const themeColor = getGugusColor(g.id);
            const isActive = selectedSvgGugus === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`gugus-tab-premium${isActive ? ' is-active' : ''}`}
                style={{ '--gugus-accent': themeColor } as React.CSSProperties}
                onClick={() => setSelectedSvgGugus(g.id)}
              >
                <span className="gugus-tab-premium-id">Gugus {g.id}</span>
                <span className="gugus-tab-premium-pct">{getGugusProgress(g.id)}%</span>
              </button>
            );
          })}
        </div>

        {/* Explorer card */}
        <div
          className="card gugus-explorer reveal-on-scroll"
          style={{ '--gugus-accent': activeGugusColor } as React.CSSProperties}
        >
          <div className="gugus-explorer-grid">
            <div className="gugus-map-panel">
              <div className="gugus-map-panel-head">
                <span>Peta Skematik Gugus</span>
                <span className="gugus-map-panel-hint">Klik wilayah untuk beralih</span>
              </div>
              <svg viewBox="0 0 500 400" className="gugus-schematic-svg" aria-hidden="true">
                <path d="M 100 50 L 250 30 L 350 100 L 280 170 L 150 150 Z"
                  className={`gugus-svg-path gugus-svg-path-1${selectedSvgGugus === 'I' ? ' gugus-svg-active' : ''}`}
                  onClick={() => setSelectedSvgGugus('I')} />
                <path d="M 350 100 L 450 120 L 480 250 L 350 280 L 280 170 Z"
                  className={`gugus-svg-path gugus-svg-path-2${selectedSvgGugus === 'II' ? ' gugus-svg-active' : ''}`}
                  onClick={() => setSelectedSvgGugus('II')} />
                <path d="M 100 50 L 150 150 L 130 280 L 30 250 L 50 120 Z"
                  className={`gugus-svg-path gugus-svg-path-3${selectedSvgGugus === 'III' ? ' gugus-svg-active' : ''}`}
                  onClick={() => setSelectedSvgGugus('III')} />
                <path d="M 130 280 L 350 280 L 320 370 L 150 360 Z"
                  className={`gugus-svg-path gugus-svg-path-4${selectedSvgGugus === 'IV' ? ' gugus-svg-active' : ''}`}
                  onClick={() => setSelectedSvgGugus('IV')} />
                <path d="M 150 150 L 280 170 L 350 280 L 130 280 Z"
                  className={`gugus-svg-path gugus-svg-path-5${selectedSvgGugus === 'V' ? ' gugus-svg-active' : ''}`}
                  onClick={() => setSelectedSvgGugus('V')} />
                <text x="200" y="100" className="gugus-svg-label gugus-svg-label-1">I</text>
                <text x="370" y="180" className="gugus-svg-label gugus-svg-label-2">II</text>
                <text x="90" y="170" className="gugus-svg-label gugus-svg-label-3">III</text>
                <text x="230" y="330" className="gugus-svg-label gugus-svg-label-4">IV</text>
                <text x="220" y="210" className="gugus-svg-label gugus-svg-label-5">V</text>
              </svg>
            </div>

            <div className="gugus-detail-panel">
              <div className="gugus-detail-head">
                <span className="gugus-detail-badge">Gugus {activeGugusId}</span>
                <span className="gugus-detail-progress">{activeGugusProgress}% selesai</span>
              </div>
              <h3 className="gugus-detail-title">{activeGugusData?.name ?? `Gugus ${activeGugusId}`}</h3>

              <dl className="gugus-detail-stats">
                <div className="gugus-detail-stat">
                  <dt><i className="fa-solid fa-user-tie" aria-hidden="true" /> Koordinator Gugus</dt>
                  <dd>{activeGugusData?.koordinator ?? '—'}</dd>
                </div>
                <div className="gugus-detail-stat">
                  <dt><i className="fa-solid fa-school" aria-hidden="true" /> Sekolah Koordinator</dt>
                  <dd>{activeGugusInti?.name ?? 'Memuat…'}</dd>
                </div>
                <div className="gugus-detail-stat">
                  <dt><i className="fa-solid fa-user-gear" aria-hidden="true" /> Operator Inti</dt>
                  <dd>{activeGugusInti?.operatorName ?? '—'}</dd>
                </div>
                <div className="gugus-detail-stat">
                  <dt><i className="fa-solid fa-list-check" aria-hidden="true" /> Sekolah Binaan</dt>
                  <dd>{activeGugusSchools.length} lembaga</dd>
                </div>
                <div className="gugus-detail-stat">
                  <dt><i className="fa-solid fa-users" aria-hidden="true" /> Siswa / Guru</dt>
                  <dd>
                    {activeGugusSchools.reduce((a, s) => a + s.studentCount, 0)} /{' '}
                    {activeGugusSchools.reduce((a, s) => a + s.teacherCount, 0)}
                  </dd>
                </div>
              </dl>

              <div className="gugus-detail-progressbar" aria-hidden="true">
                <div className="gugus-detail-progressbar-fill" style={{ width: `${activeGugusProgress}%` }} />
              </div>

              <button
                type="button"
                className="btn btn-sm gugus-map-scroll-btn"
                onClick={() => {
                  document.getElementById('gugus-map-leaflet')?.scrollIntoView({ behavior: 'smooth' });
                  toast.success(`Menampilkan sekolah binaan ${activeGugusData?.name} pada peta GPS`);
                }}
              >
                <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
                Tampilkan di Peta GPS
              </button>
            </div>
          </div>

          <div className="gugus-schools-panel">
            <div className="gugus-schools-panel-head">
              <h4>Sekolah Binaan Gugus {activeGugusId}</h4>
              <span>{activeGugusSchools.length} sekolah</span>
            </div>
            <ul className="gugus-schools-list">
              {activeGugusSchools.map((sch) => (
                <li key={sch.npsn} className="gugus-school-item">
                  <span className="gugus-school-name">{sch.name}</span>
                  <span className="gugus-school-meta">NPSN {sch.npsn}</span>
                </li>
              ))}
              {activeGugusSchools.length === 0 && (
                <li className="gugus-school-item gugus-school-empty">Belum ada data sekolah binaan.</li>
              )}
            </ul>
          </div>
        </div>

        {/* GPS Map */}
        <div id="gugus-map-leaflet" className="gugus-leaflet-wrap reveal-on-scroll" style={{ marginTop: '40px' }}>
          <DistrictMap
            onSchoolClick={(s) => { toast.info(`Menampilkan data ${s.name} pada popup peta.`); }}
          />
        </div>
      </section>

      {/* ── SECTION: TIM PENGAWAS ── */}
      <div className="section-glow-divider" aria-hidden="true" />
      <section id="pengawas-section" className="officials-section-premium">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-landmark" aria-hidden="true" />
              <span>Tim Pengawasan</span>
            </div>
            <h2>
              Pejabat <GradientText colors={['#3b82f6', '#06b6d4']}>&amp; Koordinator Terkait</GradientText>
            </h2>
            <p>
              Pengawas Bina, KKKS, PGRI, dan Administrator — garda terdepan memastikan kepatuhan berkas
              se-Kecamatan Cibadak berjalan transparan dan terstruktur.
            </p>
          </div>
        </RevealOnScroll>

        {/* Dynamic Category Filter Tabs */}
        <div className="officials-filter-tabs">
          {[
            { id: 'all', label: 'Semua Pejabat', icon: 'fa-users' },
            { id: 'pengawas', label: 'Pengawas Bina', icon: 'fa-user-tie' },
            { id: 'kkks', label: 'Ketua KKKS', icon: 'fa-users-gear' },
            { id: 'pgri', label: 'Ketua PGRI', icon: 'fa-id-card' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`officials-filter-btn${activeOfficialTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveOfficialTab(tab.id as 'all' | 'pengawas' | 'kkks' | 'pgri')}
            >
              <i className={`fa-solid ${tab.icon}`} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Upgraded Grid of Cyberpunk Split Cards */}
        <div className="officials-grid">
          {supervisors
            .filter(sup => activeOfficialTab === 'all' || sup.role === activeOfficialTab)
            .map((sup, idx) => {
              const meta = getOfficialRoleMeta(sup.role);
              return (
                <article
                  key={sup.id}
                  className="staff-card reveal-on-scroll"
                  style={{ ['--role-color' as string]: meta.color, ['--reveal-delay' as string]: `${idx * 100}ms` }}
                >
                  {/* Colored top banner with watermark */}
                  <div className="staff-card-banner">
                    <i className={`fa-solid ${meta.icon} staff-card-banner-icon`} aria-hidden="true" />
                  </div>

                  {/* Avatar overlapping banner */}
                  <div className="staff-card-avatar-ring">
                    <div className="staff-card-avatar">
                      {sup.photoUrl ? (
                        <img src={sup.photoUrl} alt={sup.name} />
                      ) : (
                        <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
                      )}
                    </div>
                    <span className="staff-card-dot" aria-label="Online" />
                  </div>

                  {/* Card body */}
                  <div className="staff-card-body">
                    <span className="staff-card-role-tag">{meta.label}</span>
                    <h3 className="staff-card-name" title={sup.name}>{sup.name}</h3>
                    <p className="staff-card-sub" title={sup.title}>{sup.title}</p>

                    <span className="staff-card-sep" aria-hidden="true" />

                    <div className="staff-card-meta">
                      <span className="staff-card-meta-item">
                        <i className="fa-solid fa-location-dot" aria-hidden="true" />
                        {sup.wilayah}
                      </span>
                      {sup.nip && sup.nip !== '-' && (
                        <span className="staff-card-meta-item">
                          <i className="fa-solid fa-id-badge" aria-hidden="true" />
                          NIP. {sup.nip}
                        </span>
                      )}
                    </div>

                    {sup.phone && sup.phone !== '-' && (
                      <a
                        href={`https://wa.me/${formatPhoneForWhatsApp(sup.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="staff-card-btn"
                      >
                        <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                        Hubungi via WhatsApp
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      </section>
      <div className="section-glow-divider" aria-hidden="true" />

      {/* Compliance Leaderboard Section */}
      <section className="reveal-on-scroll" style={{ padding: '40px 8% 60px' }}>
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-trophy" aria-hidden="true" />
              <span>Papan Peringkat</span>
            </div>
            <h2>Peringkat <GradientText colors={['#3b82f6', '#06b6d4']}>Kepatuhan Sekolah</GradientText></h2>
            <p>Apresiasi untuk sekolah-sekolah yang paling responsif dan lengkap mengirimkan berkas laporan ke kecamatan.</p>
          </div>
        </RevealOnScroll>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Top 3 Podium Card */}
          <div className="card animate-fade-in" style={{ padding: '24px', background: 'var(--card-glass)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
              <i className="fa-solid fa-medal" style={{ color: '#d97706', marginRight: '6px' }}></i> Top 3 Sekolah Tercepat &amp; Lengkap
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: '20px' }}>
              {/* Rank 2 (Left) */}
              {leaderboard[1] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                  <span style={{ fontSize: '24px' }}>🥈</span>
                  <strong style={{ fontSize: '11px', textAlign: 'center', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{leaderboard[1].name.replace('SDN ', '')}</strong>
                  <div style={{
                    width: '100%',
                    height: '70px',
                    background: 'linear-gradient(to top, rgba(148, 163, 184, 0.2), rgba(148, 163, 184, 0.05))',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{leaderboard[1].progress}%</span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Lengkap</span>
                  </div>
                </div>
              )}

              {/* Rank 1 (Center) */}
              {leaderboard[0] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', transform: 'scale(1.1)' }}>
                  <span style={{ fontSize: '28px' }}>🥇</span>
                  <strong style={{ fontSize: '11px', textAlign: 'center', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>{leaderboard[0].name.replace('SDN ', '')}</strong>
                  <div style={{
                    width: '100%',
                    height: '95px',
                    background: 'linear-gradient(to top, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.05))',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(245, 158, 11, 0.15)'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>{leaderboard[0].progress}%</span>
                    <span style={{ fontSize: '8px', color: 'rgba(245, 158, 11, 0.8)' }}>Lengkap</span>
                  </div>
                </div>
              )}

              {/* Rank 3 (Right) */}
              {leaderboard[2] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                  <span style={{ fontSize: '24px' }}>🥉</span>
                  <strong style={{ fontSize: '11px', textAlign: 'center', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{leaderboard[2].name.replace('SDN ', '')}</strong>
                  <div style={{
                    width: '100%',
                    height: '55px',
                    background: 'linear-gradient(to top, rgba(180, 83, 9, 0.15), rgba(180, 83, 9, 0.05))',
                    border: '1px solid rgba(180, 83, 9, 0.2)',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{leaderboard[2].progress}%</span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Lengkap</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* List Table Card */}
          <div className="card animate-fade-in" style={{ padding: '24px', background: 'var(--card-glass)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
              <i className="fa-solid fa-list-ol" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Peringkat Kepatuhan Sekolah
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaderboard.map((sch, index) => (
                <div key={sch.npsn} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: index === 0 ? 'rgba(245, 158, 11, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                  border: index === 0 ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid var(--card-border)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.background = index === 0 ? 'rgba(245, 158, 11, 0.04)' : 'rgba(255, 255, 255, 0.01)';
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'rgba(255,255,255,0.05)',
                      color: index < 3 ? '#ffffff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sch.name}
                        {sch.badge && (
                          <span style={{
                            fontSize: '12px',
                            filter: 'drop-shadow(0 0 2px ' + sch.badge.color + ')'
                          }} title={sch.badge.name}>
                            {sch.badge.icon}
                          </span>
                        )}
                      </h4>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Gugus {sch.gugus} • NPSN {sch.npsn}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: sch.progress === 100 ? 'var(--success)' : 'var(--text-primary)' }}>
                      {sch.progress}%
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{sch.approvedCount}/{activeCategories.length} Berkas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section — Animated Counters */}
      <section id="statistik" className="reveal-on-scroll" style={{ padding: '80px 8%' }}>
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              <span>Statistik Jangkauan</span>
            </div>
            <h2>Statistik <GradientText colors={['#3b82f6', '#06b6d4']}>Portal Koryandik</GradientText></h2>
            <p>Data jangkauan pelayanan koordinasi berkas digital di wilayah Kecamatan Cibadak secara total.</p>
          </div>
        </RevealOnScroll>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {[
            { icon: 'fa-satellite-dish', label: 'Sekolah Binaan', value: totalSchoolsCount, color: '#3b82f6', suffix: '' },
            { icon: 'fa-users-viewfinder', label: 'Siswa Terdaftar', value: totalStudentsCount, color: '#8b5cf6', suffix: '' },
            { icon: 'fa-network-wired', label: 'Guru Aktif', value: totalTeachersCount, color: '#10b981', suffix: '' },
            { icon: 'fa-file-shield', label: 'Berkas Diproses', value: submissions.length, color: '#f59e0b', suffix: '+' },
          ].map((stat) => (
            <div key={stat.label} className="card animate-fade-in" style={{
              padding: '28px 24px',
              borderTop: `3px solid ${stat.color}`,
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, border-color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Glow background circle */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: stat.color,
                opacity: 0.04,
                filter: 'blur(20px)'
              }}></div>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: `${stat.color}15`,
                border: `1px solid ${stat.color}25`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: stat.color,
                flexShrink: 0
              }}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
                  {stat.value.toLocaleString('id-ID')}{stat.suffix}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3D Cityscape Visualization */}
      <section className="reveal-on-scroll" style={{ padding: '0 8% 60px' }}>
        <CityScapeChart
          title="🏙️ Progres Berkas per Gugus — 3D Visualization"
          data={GUGUS_IDS.map((gId) => {
            const gugusSchools = schools.filter(s => s.gugus === gId);
            const schoolNpsns = gugusSchools.map(s => s.npsn);
            const totalPossible = gugusSchools.length * activeCategories.length;
            const approved = submissions.filter(s => schoolNpsns.includes(s.schoolNpsn) && s.status === 'approved').length;
            return {
              label: `Gugus ${gId}`,
              value: approved,
              maxValue: totalPossible || 1,
              color: getGugusColor(gId),
              detail: `${gugusSchools.length} Sekolah`
            };
          })}
        />
      </section>

      {/* Workflow Section */}
      <section id="alur" className="workflow-section reveal-on-scroll">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-diagram-project" aria-hidden="true" />
              <span>Alur Kerja</span>
            </div>
            <h2>Alur Pengumpulan <GradientText colors={['#3b82f6', '#06b6d4']}>Berkas Laporan</GradientText></h2>
            <p>Prosedur pengunggahan, verifikasi, hingga persetujuan berkas tingkat kecamatan yang teratur.</p>
          </div>
        </RevealOnScroll>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', maxWidth: '850px', margin: '0 auto' }}>
          {/* Vertical Connecting Line */}
          <div style={{
            position: 'absolute',
            left: '38px',
            top: '20px',
            bottom: '20px',
            width: '4px',
            background: 'linear-gradient(to bottom, var(--primary), var(--accent), #f59e0b, var(--success))',
            borderRadius: '2px',
            zIndex: 0
          }} className="no-print"></div>

          {[
            { step: '1', title: 'Upload Berkas Sekolah', desc: 'Operator sekolah mengunggah tautan berkas resmi dari Google Drive pribadi ke portal kategori yang sesuai.', icon: 'fa-cloud-arrow-up', color: 'var(--primary)' },
            { step: '2', title: 'Verifikasi Koordinator Gugus', desc: 'Koordinator Gugus memeriksa validitas berkas sekolah binaan di wilayahnya dan memberikan persetujuan awal.', icon: 'fa-sitemap', color: 'var(--accent)' },
            { step: '3', title: 'Monitoring Pejabat & Pengawas', desc: 'Pengawas Bina, KKKS, dan Ketua PGRI memantau kepatuhan pelaporan serta melacak progres sekolah secara real-time.', icon: 'fa-eye', color: '#f59e0b' },
            { step: '4', title: 'Persetujuan Akhir & Bukti Cetak', desc: 'Admin Koryandik memverifikasi akhir, mengunci berkas, dan menerbitkan Bukti Tanda Terima resmi ber-QR Code.', icon: 'fa-file-shield', color: 'var(--success)' },
          ].map((item) => (
            <div key={item.step} className="card animate-fade-in" style={{
              display: 'flex',
              gap: '24px',
              padding: '24px',
              background: 'var(--card-glass)',
              borderRadius: '20px',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
              marginLeft: '20px',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.transform = 'translateX(8px)';
              e.currentTarget.style.borderColor = item.color;
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.borderColor = 'var(--card-border)';
            }}
            >
              {/* Step Badge with Icon */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--bg-space-dark)',
                border: `2px solid ${item.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
                fontSize: '16px',
                fontWeight: 'bold',
                flexShrink: 0,
                boxShadow: `0 0 10px ${item.color}22`,
                position: 'relative',
                zIndex: 2
              }}>
                <i className={`fa-solid ${item.icon}`} style={{ fontSize: '14px' }}></i>
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: item.color,
                  color: '#ffffff',
                  fontSize: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>{item.step}</span>
              </div>

              {/* Step Content */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--text-primary)' }}>{item.title}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* Kesan Operator Sekolah */}
      <section className="testimonials-section reveal-on-scroll">
        <RevealOnScroll direction="up">
          <div className="section-header-premium">
            <div className="section-eyebrow-premium">
              <i className="fa-solid fa-comments" aria-hidden="true" />
              <span>Suara dari Lapangan</span>
            </div>
            <h2>Kesan <GradientText colors={['#3b82f6', '#06b6d4']}>Operator Sekolah</GradientText></h2>
            <p>Pengalaman nyata para operator sekolah binaan setelah menggunakan portal Koryandik Cibadak.</p>
          </div>
        </RevealOnScroll>

        {testimonials.length === 0 ? (
          <div className="card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--primary)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat testimoni operator sekolah…</p>
          </div>
        ) : (
          <div className="testimonials-grid">
            {testimonials.map((t, idx) => (
              <blockquote 
                key={idx} 
                className="testimonial-card"
                style={{
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Background Large Quote Icon for high aesthetics */}
                <i 
                  className="fa-solid fa-quote-right" 
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '24px',
                    fontSize: '64px',
                    color: 'var(--primary)',
                    opacity: 0.05,
                    pointerEvents: 'none'
                  }}
                  aria-hidden="true"
                />
                
                <div className="testimonial-glow" aria-hidden="true" />
                
                <div 
                  className="testimonial-verified"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '16px'
                  }}
                >
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '12px' }} aria-hidden="true" /> Operator Terverifikasi
                </div>
                
                <div className="testimonial-stars" style={{ display: 'flex', gap: '4px', marginBottom: '14px', color: '#f59e0b', fontSize: '12px' }} aria-label="5 bintang">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <i key={s} className="fa-solid fa-star" aria-hidden="true" />
                  ))}
                </div>
                
                <p className="testimonial-quote" style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '24px', fontStyle: 'italic', fontWeight: 500 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                
                <footer className="testimonial-author" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                  <div 
                    className="testimonial-avatar" 
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    aria-hidden="true"
                  >
                    {t.avatar}
                  </div>
                  
                  <div className="testimonial-author-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 700 }}>{t.name}</strong>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>{t.school}</div>
                    <div>
                      <span 
                        className="testimonial-gugus-tag" 
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.15)'
                        }}
                      >
                        Gugus {t.gugus}
                      </span>
                    </div>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      {/* Map Lokasi Koryandik */}
      <LandingLocationMap schoolCount={schools.length} gugusCount={guguses.length} profileSettings={profileSettings} />

      <LandingFooter
        schoolCount={schools.length}
        onScrollTo={scrollToSection}
        onOpenLogin={() => setIsDrawerOpen(true)}
      />

      {/* Login Drawer */}
      <LoginDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        schools={schools}
        guguses={guguses}
        supervisors={supervisors}
      />

      {/* Floating Action Buttons Container */}
      <div className="no-print fab-container" style={{ fontFamily: 'inherit' }}>
        {/* Chat Window */}
        {chatOpen && (
          <div className="card animate-fade-in" style={{
            width: '340px',
            height: '460px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--card-border)',
            background: 'var(--card-glass)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            margin: 0
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              padding: '16px 20px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>Tanya Koryandik</h4>
                  <span style={{ fontSize: '9px', opacity: 0.8, color: '#ffffff' }}>Asisten Virtual • Online</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => {
                    const nextSpeak = !chatSpeak;
                    setChatSpeak(nextSpeak);
                    if (nextSpeak) {
                      speakText("Suara aktif. Saya akan membacakan jawaban untuk Anda.");
                      toast.success("Suara asisten aktif!");
                    } else {
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      toast.success("Suara asisten dinonaktifkan.");
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', opacity: chatSpeak ? 1 : 0.6 }}
                  title={chatSpeak ? "Bisukan suara" : "Aktifkan suara"}
                >
                  <i className={chatSpeak ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark"}></i>
                </button>
                <button 
                  onClick={() => setChatOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '16px' }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}>
                  {msg.text}
                  {msg.sender === 'bot' && (
                    <button
                      onClick={() => speakText(msg.text)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'block',
                        marginTop: '6px',
                        padding: 0,
                        textAlign: 'left'
                      }}
                    >
                      <i className="fa-solid fa-volume-low" style={{ marginRight: '4px' }}></i> Dengarkan jawaban
                    </button>
                  )}
                </div>
              ))}
              {chatTyping && (
                <div style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '10px 14px',
                  borderRadius: '12px 12px 12px 2px',
                  fontSize: '12px',
                  color: 'var(--text-muted)'
                }}>
                  <span>Mengetik...</span>
                </div>
              )}
            </div>

            {/* FAQ Options Grid */}
            <div style={{ padding: '12px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', marginLeft: '4px' }}>Pertanyaan Populer:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                {[
                  { q: '🔑 Bagaimana cara masuk portal?', a: 'Untuk masuk portal sekolah, pilih tab "Sekolah", pilih nama sekolah Anda, lalu masukkan NPSN sekolah Anda pada kolom password. Password Anda adalah nomor NPSN resmi sekolah.' },
                  { q: '📂 Format berkas apa yang didukung?', a: 'Portal ini mendukung berkas berformat PDF dengan ukuran maksimal 10MB. Pastikan link Google Drive Anda telah diatur "Dapat diakses oleh siapa saja dengan link".' },
                  { q: '⏰ Kapan batas akhir pengumpulan?', a: `Batas akhir pengumpulan berkas Triwulan II (SPJ BOS, TPG, Dapodik) adalah tanggal 15 Juli ${new Date().getFullYear()}. Anda dapat memantau hitung mundur di dashboard sekolah Anda.` },
                  { q: '📝 Apa yang harus dilakukan jika berkas ditolak?', a: 'Jika status berkas Anda "Butuh Revisi" atau "Ditolak", klik tombol revisi pada daftar berkas, periksa catatan dari verifikator/admin, perbaiki file Anda di Drive, lalu kirim ulang.' }
                ].map((faq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFaqClick(faq.q, faq.a)}
                    disabled={chatTyping}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--card-border)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      transition: 'background 0.2s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  >
                    {faq.q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAB Menu Items - Always Visible */}
        {!chatOpen && (
          <>
            <BackToTop />
            <button 
              className="fab-menu-item visible"
              onClick={() => setChatOpen(true)}
              title="Chat Asisten"
            >
              <i className="fa-solid fa-comments"></i>
            </button>
          </>
        )}
      </div>

      <CommandPalette onThemeToggle={(e) => toggleThemeWithTransition(e)} />
      
      <ParticleBackground particleCount={30} color="rgba(59, 130, 246, 0.2)" />
    </div>
  );
}
