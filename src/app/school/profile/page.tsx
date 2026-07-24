'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { School } from '@/lib/schoolsData';
import { updateSchool, getSchoolFacilities, addSchoolFacility, updateSchoolFacility, deleteSchoolFacility, getSchoolAchievements, addSchoolAchievement, updateSchoolAchievement, deleteSchoolAchievement, getGalleryBySchool, addGalleryItemBySchool, deleteGalleryItemBySchool } from '@/lib/db';
import type { SchoolFacility, SchoolAchievement, AchievementCategory, GalleryItem } from '@/lib/types';
import { FACILITY_ICONS, ACHIEVEMENT_CATEGORIES } from '@/lib/types';
import { toast } from 'sonner';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toggleThemeWithTransition } from '@/lib/theme';
import SchoolSocialMedia from '@/components/SchoolSocialMedia';

/* ═══════════════════════════════════════════════════════════
   TABS CONFIG
   ═══════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'identity',   label: 'Identitas',     icon: 'fa-solid fa-school' },
  { id: 'branding',   label: 'Branding',      icon: 'fa-solid fa-palette' },
  { id: 'social',     label: 'Media Sosial',  icon: 'fa-solid fa-share-nodes' },
  { id: 'facilities', label: 'Fasilitas',     icon: 'fa-solid fa-building' },
  { id: 'achievements', label: 'Prestasi',    icon: 'fa-solid fa-trophy' },
  { id: 'gallery',    label: 'Galeri',        icon: 'fa-solid fa-images' },
  { id: 'location',   label: 'Lokasi',        icon: 'fa-solid fa-map-location-dot' },
  { id: 'visiMisi',   label: 'Visi & Misi',   icon: 'fa-solid fa-bullseye' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ═══════════════════════════════════════════════════════════
   ICON PICKER LABELS
   ═══════════════════════════════════════════════════════════ */
const FACILITY_ICON_LABELS: Record<string, string> = {
  'fa-chalkboard': 'Ruang Kelas',
  'fa-book-open': 'Perpustakaan',
  'fa-desktop': 'Lab Komputer',
  'fa-futbol': 'Lapangan',
  'fa-mosque': 'Mushola',
  'fa-kit-medical': 'UKS',
  'fa-utensils': 'Kantin',
  'fa-building': 'Gedung',
  'fa-flask': 'Lab IPA',
  'fa-music': 'Ruang Musik',
  'fa-paint-brush': 'Ruang Seni',
  'fa-tree': 'Taman',
  'fa-wifi': 'WiFi',
  'fa-toilet': 'Toilet',
  'fa-car': 'Parkir',
  'fa-dumbbell': 'Olahraga',
};

const ACHIEVEMENT_ICON_OPTIONS = [
  'fa-trophy', 'fa-medal', 'fa-award', 'fa-star',
  'fa-crown', 'fa-certificate', 'fa-ribbon', 'fa-shield-halved',
];

const CATEGORY_COLORS: Record<string, string> = {
  akademik: '#3b82f6',
  olahraga: '#10b981',
  seni: '#8b5cf6',
  keagamaan: '#f59e0b',
  lainnya: '#6b7280',
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function SchoolProfile() {
  const router = useRouter();
  const { user, loading, logout } = useAuth('school');
  usePresence(user, '/school/profile');
  const [school, setSchool] = useState<School | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  // ─── Identity fields ───
  const [principalName, setPrincipalName] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [ksPhone, setKsPhone] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [address, setAddress] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [accreditation, setAccreditation] = useState<string>('B');
  const [status, setStatus] = useState<string>('Negeri');

  // ─── Branding fields ───
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [principalAvatarUrl, setPrincipalAvatarUrl] = useState('');
  const [operatorAvatarUrl, setOperatorAvatarUrl] = useState('');
  const [stempelColor, setStempelColor] = useState('#1d4ed8');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const principalAvatarRef = useRef<HTMLInputElement>(null);
  const operatorAvatarRef = useRef<HTMLInputElement>(null);

  // ─── Social media fields ───
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');

  // ─── Facilities ───
  const [facilities, setFacilities] = useState<SchoolFacility[]>([]);
  const [facilityForm, setFacilityForm] = useState({ name: '', icon: 'fa-building', description: '' });
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // ─── Achievements ───
  const [achievements, setAchievements] = useState<SchoolAchievement[]>([]);
  const [achievementForm, setAchievementForm] = useState({ title: '', description: '', year: new Date().getFullYear(), category: 'akademik' as AchievementCategory, icon: 'fa-trophy' });
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);

  // ─── Gallery (GDrive links) ───
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryForm, setGalleryForm] = useState({ title: '', description: '', imageUrl: '', category: 'Lainnya' as GalleryItem['category'] });

  // ─── Visi & Misi ───
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');

  // ─── Location ───
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  // ─── Saving state ───
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /* ─── Tab indicator animation ─── */
  const updateTabIndicator = useCallback(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  useEffect(() => {
    updateTabIndicator();
    window.addEventListener('resize', updateTabIndicator);
    return () => window.removeEventListener('resize', updateTabIndicator);
  }, [updateTabIndicator]);

  /* ─── Load school data ─── */
  useEffect(() => {
    if (loading || !user?.details) return;
    const details = user.details as unknown as School;
    setSchool(details);
    setPrincipalName(details.principalName || '');
    setOperatorName(details.operatorName || '');
    setKsPhone(details.ksPhone || '');
    setOperatorPhone(details.operatorPhone || '');
    setAddress(details.address || '');
    setStudentCount(details.studentCount);
    setTeacherCount(details.teacherCount);
    setLogoUrl(details.logoUrl || '');
    setSignatureUrl(details.signatureUrl || '');
    setPrincipalAvatarUrl(details.principalAvatarUrl || '');
    setOperatorAvatarUrl(details.operatorAvatarUrl || '');
    setWebsite(details.website || '');
    setInstagram(details.instagram || '');
    setFacebook(details.facebook || '');
    setYoutube(details.youtube || '');
    setTiktok(details.tiktok || '');
    setTwitter(details.twitter || '');
    setLinkedin(details.linkedin || '');
    setEmail(details.email || '');
    setWhatsapp(details.whatsapp || '');
    setTelegram(details.telegram || '');
    setVision(details.vision || '');
    setMission(details.mission || '');
    setLat(details.lat ?? null);
    setLng(details.lng ?? null);
    setAccreditation(details.accreditation || 'B');
    setStatus(details.status || 'Negeri');
    setStempelColor(details.stempelColor || '#1d4ed8');

    // Load facilities, achievements & gallery
    Promise.all([
      getSchoolFacilities(details.npsn),
      getSchoolAchievements(details.npsn),
      getGalleryBySchool(details.npsn),
    ]).then(([fac, ach, gal]) => {
      setFacilities(fac);
      setAchievements(ach);
      setGalleryItems(gal);
    });
  }, [loading, user]);

  /* ─── File upload helper ─── */
  const handleFileUpload = (setter: (v: string) => void, maxKb: number, label: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxKb * 1000) {
      toast.error(`Ukuran file ${label} maksimal ${maxKb} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
      setHasChanges(true);
      toast.success(`${label} berhasil diunggah! Klik Simpan untuk menyimpan.`);
    };
    reader.readAsDataURL(file);
  };

  /* ─── Save profile ─── */
  const handleSaveProfile = async () => {
    if (!school) return;
    setSaving(true);

    const updatedSchool: School = {
      ...school,
      principalName, operatorName, ksPhone, operatorPhone,
      address, studentCount, teacherCount,
      logoUrl, signatureUrl, principalAvatarUrl, operatorAvatarUrl, stempelColor,
      website, instagram, facebook, youtube, tiktok, twitter, linkedin, email, whatsapp, telegram,
      vision, mission, lat, lng, accreditation, status,
    };
    setSchool(updatedSchool);

    // Save to user session
    const stored = localStorage.getItem('koryandik_current_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.details = updatedSchool;
        parsed.name = updatedSchool.name;
        localStorage.setItem('koryandik_current_user', JSON.stringify(parsed));
      } catch (err) {
        console.error('Failed to parse current user session in profile:', err);
      }
    }

    try {
      await updateSchool(school.npsn, {
        principalName, operatorName, ksPhone, operatorPhone,
        address, studentCount, teacherCount,
        logoUrl, signatureUrl, principalAvatarUrl, operatorAvatarUrl, stempelColor,
        website, instagram, facebook, youtube, tiktok, twitter, linkedin, email, whatsapp, telegram,
        vision, mission, lat, lng, accreditation, status,
      });
      toast.success('Profil sekolah berhasil diperbarui!');
      setHasChanges(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('koryandik_user_profile_updated'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan ke database.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Facility CRUD ─── */
  const handleAddFacility = async () => {
    if (!school || !facilityForm.name.trim()) { toast.error('Nama fasilitas harus diisi.'); return; }
    try {
      const newF = await addSchoolFacility({
        schoolNpsn: school.npsn,
        name: facilityForm.name.trim(),
        icon: facilityForm.icon,
        description: facilityForm.description.trim() || undefined,
        sortOrder: facilities.length,
      });
      setFacilities(prev => [...prev, newF]);
      setFacilityForm({ name: '', icon: 'fa-building', description: '' });
      toast.success('Fasilitas berhasil ditambahkan!');
    } catch { toast.error('Gagal menambahkan fasilitas.'); }
  };

  const handleUpdateFacility = async () => {
    if (!school || !editingFacilityId || !facilityForm.name.trim()) return;
    try {
      const updated = await updateSchoolFacility(editingFacilityId, school.npsn, {
        name: facilityForm.name.trim(),
        icon: facilityForm.icon,
        description: facilityForm.description.trim() || undefined,
      });
      if (updated) {
        setFacilities(prev => prev.map(f => f.id === editingFacilityId ? updated : f));
        toast.success('Fasilitas berhasil diperbarui!');
      }
      setEditingFacilityId(null);
      setFacilityForm({ name: '', icon: 'fa-building', description: '' });
    } catch { toast.error('Gagal memperbarui fasilitas.'); }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!school) return;
    try {
      await deleteSchoolFacility(id, school.npsn);
      setFacilities(prev => prev.filter(f => f.id !== id));
      toast.success('Fasilitas berhasil dihapus!');
    } catch { toast.error('Gagal menghapus fasilitas.'); }
  };

  /* ─── Achievement CRUD ─── */
  const handleAddAchievement = async () => {
    if (!school || !achievementForm.title.trim()) { toast.error('Judul prestasi harus diisi.'); return; }
    try {
      const newA = await addSchoolAchievement({
        schoolNpsn: school.npsn,
        title: achievementForm.title.trim(),
        description: achievementForm.description.trim() || undefined,
        year: achievementForm.year,
        category: achievementForm.category,
        icon: achievementForm.icon,
      });
      setAchievements(prev => [newA, ...prev]);
      setAchievementForm({ title: '', description: '', year: new Date().getFullYear(), category: 'akademik', icon: 'fa-trophy' });
      toast.success('Prestasi berhasil ditambahkan!');
    } catch { toast.error('Gagal menambahkan prestasi.'); }
  };

  const handleUpdateAchievement = async () => {
    if (!school || !editingAchievementId || !achievementForm.title.trim()) return;
    try {
      const updated = await updateSchoolAchievement(editingAchievementId, school.npsn, {
        title: achievementForm.title.trim(),
        description: achievementForm.description.trim() || undefined,
        year: achievementForm.year,
        category: achievementForm.category,
        icon: achievementForm.icon,
      });
      if (updated) {
        setAchievements(prev => prev.map(a => a.id === editingAchievementId ? updated : a));
        toast.success('Prestasi berhasil diperbarui!');
      }
      setEditingAchievementId(null);
      setAchievementForm({ title: '', description: '', year: new Date().getFullYear(), category: 'akademik', icon: 'fa-trophy' });
    } catch { toast.error('Gagal memperbarui prestasi.'); }
  };

  const handleDeleteAchievement = async (id: string) => {
    if (!school) return;
    try {
      await deleteSchoolAchievement(id, school.npsn);
      setAchievements(prev => prev.filter(a => a.id !== id));
      toast.success('Prestasi berhasil dihapus!');
    } catch { toast.error('Gagal menghapus prestasi.'); }
  };

  /* ─── Gallery CRUD (GDrive) ─── */
  const convertGDriveUrl = (url: string): string => {
    // Convert various Google Drive share URLs to direct image/embed URLs
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    return url; // Return as-is if not a GDrive link
  };

  const handleAddGalleryItem = async () => {
    if (!school || !galleryForm.title.trim() || !galleryForm.imageUrl.trim()) {
      toast.error('Judul dan URL gambar harus diisi.'); return;
    }
    try {
      const newItem = await addGalleryItemBySchool({
        title: galleryForm.title.trim(),
        description: galleryForm.description.trim(),
        imageUrl: convertGDriveUrl(galleryForm.imageUrl.trim()),
        category: galleryForm.category,
        date: new Date().toISOString().slice(0, 10),
      }, school.npsn);
      setGalleryItems(prev => [newItem, ...prev]);
      setGalleryForm({ title: '', description: '', imageUrl: '', category: 'Lainnya' });
      toast.success('Foto galeri berhasil ditambahkan!');
    } catch { toast.error('Gagal menambahkan foto galeri.'); }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (!school) return;
    try {
      await deleteGalleryItemBySchool(id, school.npsn);
      setGalleryItems(prev => prev.filter(g => g.id !== id));
      toast.success('Foto galeri berhasil dihapus!');
    } catch { toast.error('Gagal menghapus foto galeri.'); }
  };

  // Coords Ref to keep initMap dependencies empty and prevent re-initialization on drag/click
  const coordsRef = useRef({ lat: -6.8950, lng: 106.7900 });
  useEffect(() => {
    if (lat !== null && lng !== null) {
      coordsRef.current = { lat, lng };
    }
  }, [lat, lng]);

  const updateMapMarker = (newLat: number | null, newLng: number | null) => {
    if (newLat !== null && newLng !== null && markerRef.current && mapInstanceRef.current) {
      const marker = markerRef.current as any;
      const map = mapInstanceRef.current as any;
      marker.setLatLng([newLat, newLng]);
      map.panTo([newLat, newLng]);
    }
  };

  /* ─── Map init ─── */
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;
    if (mapInstanceRef.current) return; // already initialized
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');
    const defaultLat = coordsRef.current.lat;
    const defaultLng = coordsRef.current.lng;
    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const map = L.map(mapContainerRef.current, { scrollWheelZoom: true }).setView([defaultLat, defaultLng], 15);
    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    
    const locationIcon = L.divIcon({
      html: `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#ec4899);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;box-shadow:0 4px 15px rgba(239,68,68,0.4);border:2px solid #fff;"><i class="fa-solid fa-school"></i></div>`,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const marker = L.marker([defaultLat, defaultLng], { draggable: true, icon: locationIcon }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLat(parseFloat(pos.lat.toFixed(6)));
      setLng(parseFloat(pos.lng.toFixed(6)));
      setHasChanges(true);
    });
    map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      marker.setLatLng(e.latlng);
      setLat(parseFloat(e.latlng.lat.toFixed(6)));
      setLng(parseFloat(e.latlng.lng.toFixed(6)));
      setHasChanges(true);
    });
    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, []);

  useEffect(() => {
    if (activeTab === 'location') {
      const timer = setTimeout(() => initMap(), 200);
      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          try {
            (mapInstanceRef.current as any).remove();
          } catch (e) {
            console.error('Error cleaning up map:', e);
          }
          mapInstanceRef.current = null;
          markerRef.current = null;
        }
      };
    }
  }, [activeTab, initMap]);

  /* ─── Profile completeness ─── */
  const profileCompleteness = (() => {
    if (!school) return 0;
    const checks = [
      !!principalName, !!operatorName, !!address,
      studentCount > 0, teacherCount > 0,
      !!logoUrl, !!ksPhone || !!operatorPhone,
      !!(website || instagram || facebook),
      facilities.length > 0, achievements.length > 0,
      !!vision, lat !== null && lng !== null,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  })();

  if (loading || !user || !school) return <LoadingScreen />;

  /* ═══════════════════════════════════════════════════════════
     INLINE STYLES
     ═══════════════════════════════════════════════════════════ */
  const S = {
    tabBar: {
      display: 'flex', gap: '4px', padding: '6px',
      background: 'var(--card-glass)',
      borderRadius: '16px', position: 'relative' as const,
      overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as const,
      border: '1px solid var(--card-border)',
      marginBottom: '24px',
    } as React.CSSProperties,
    tabBtn: (active: boolean) => ({
      padding: '10px 18px', borderRadius: '12px', border: 'none',
      background: 'transparent', cursor: 'pointer',
      fontSize: '13px', fontWeight: active ? 700 : 500,
      color: active ? 'var(--primary)' : 'var(--text-secondary)',
      display: 'flex', alignItems: 'center', gap: '8px',
      whiteSpace: 'nowrap' as const, position: 'relative' as const, zIndex: 2,
      transition: 'color 0.25s ease',
      flexShrink: 0,
    }) as React.CSSProperties,
    tabIndicator: {
      position: 'absolute' as const, bottom: '6px', height: 'calc(100% - 12px)',
      borderRadius: '12px', background: 'var(--primary)',
      opacity: 0.1, transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 1,
    } as React.CSSProperties,
    sectionCard: {
      borderRadius: '20px', border: '1px solid var(--card-border)',
      background: 'var(--card-glass)', backdropFilter: 'blur(20px)',
      overflow: 'hidden',
    } as React.CSSProperties,
    sectionHeader: {
      padding: '20px 24px', borderBottom: '1px solid var(--card-border)',
      display: 'flex', alignItems: 'center', gap: '12px',
    } as React.CSSProperties,
    sectionBody: { padding: '24px' } as React.CSSProperties,
    formGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px',
    } as React.CSSProperties,
    fieldLabel: {
      fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
      marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px',
    } as React.CSSProperties,
    fieldInput: {
      width: '100%', padding: '10px 14px', borderRadius: '12px',
      border: '1px solid var(--card-border)', background: 'var(--card-glass)',
      color: 'var(--text-primary)', fontSize: '14px',
      transition: 'border-color 0.2s, box-shadow 0.2s', outline: 'none',
    } as React.CSSProperties,
    uploadBox: (hasImage: boolean) => ({
      width: '100%', aspectRatio: '1', maxWidth: '140px',
      borderRadius: '16px', border: `2px dashed ${hasImage ? 'var(--primary)' : 'var(--card-border)'}`,
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', overflow: 'hidden',
      background: hasImage ? 'transparent' : 'var(--card-glass)',
      transition: 'border-color 0.2s, transform 0.2s',
      position: 'relative' as const,
    }) as React.CSSProperties,
    saveBar: {
      position: 'sticky' as const, bottom: '16px', zIndex: 50,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 24px', borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.08))',
      backdropFilter: 'blur(20px)', border: '1px solid var(--primary)',
      boxShadow: '0 8px 32px rgba(59,130,246,0.15)',
    } as React.CSSProperties,
    iconPickerOverlay: {
      position: 'fixed' as const, inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as React.CSSProperties,
    iconPickerModal: {
      background: 'var(--bg-primary)', borderRadius: '24px',
      padding: '28px', maxWidth: '420px', width: '90%',
      border: '1px solid var(--card-border)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
    } as React.CSSProperties,
    itemCard: {
      padding: '16px', borderRadius: '14px',
      border: '1px solid var(--card-border)',
      background: 'var(--card-glass)',
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      transition: 'border-color 0.2s, transform 0.2s',
    } as React.CSSProperties,
    iconBubble: (color: string) => ({
      width: '42px', height: '42px', borderRadius: '12px',
      background: `${color}15`, color: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', flexShrink: 0,
    }) as React.CSSProperties,
    miniBtn: (color: string) => ({
      padding: '6px 12px', borderRadius: '8px', border: 'none',
      background: `${color}12`, color: color,
      fontSize: '11px', fontWeight: 600, cursor: 'pointer',
      transition: 'background 0.2s',
    }) as React.CSSProperties,
    badge: (color: string) => ({
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px',
      background: `${color}12`, color: color,
      fontSize: '11px', fontWeight: 600,
    }) as React.CSSProperties,
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER HELPERS
     ═══════════════════════════════════════════════════════════ */
  const renderField = (label: string, icon: string, value: string, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; required?: boolean; fullWidth?: boolean }) => (
    <div className="form-group" style={opts?.fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <label style={S.fieldLabel}>
        <i className={icon} style={{ fontSize: '11px' }} />
        {label}
      </label>
      <input
        type={opts?.type || 'text'}
        style={S.fieldInput}
        value={value}
        onChange={(e) => { onChange(e.target.value); setHasChanges(true); }}
        placeholder={opts?.placeholder}
        required={opts?.required}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );

  const renderNumberField = (label: string, icon: string, value: number, onChange: (v: number) => void) => (
    <div className="form-group">
      <label style={S.fieldLabel}>
        <i className={icon} style={{ fontSize: '11px' }} />
        {label}
      </label>
      <input
        type="number"
        style={S.fieldInput}
        value={value}
        onChange={(e) => { onChange(parseInt(e.target.value) || 0); setHasChanges(true); }}
        required
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );

  const renderUploadBox = (
    label: string, icon: string, imageUrl: string, inputRef: React.RefObject<HTMLInputElement | null>,
    setter: (v: string) => void, maxKb = 500
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        onClick={() => inputRef.current?.click()}
        style={S.uploadBox(!!imageUrl)}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = imageUrl ? 'var(--primary)' : 'var(--card-border)'; }}
        title={`Klik untuk unggah ${label}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
            <i className={`fa-solid ${icon}`} style={{ fontSize: '24px', display: 'block', marginBottom: '8px', opacity: 0.5 }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{label}</span>
          </div>
        )}
        {imageUrl && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s', borderRadius: '14px',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
          >
            <i className="fa-solid fa-camera" style={{ color: '#fff', fontSize: '20px' }} />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload(setter, maxKb, label)}
      />
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
      {imageUrl && (
        <button
          type="button"
          onClick={() => { setter(''); setHasChanges(true); }}
          style={{ ...S.miniBtn('#ef4444'), fontSize: '10px', padding: '4px 10px' }}
        >
          <i className="fa-solid fa-trash" style={{ marginRight: '4px' }} /> Hapus
        </button>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     SOCIAL MEDIA CONFIG
     ═══════════════════════════════════════════════════════════ */
  const socialFields = [
    { key: 'website', label: 'Website', icon: 'fa-solid fa-globe', color: '#3b82f6', placeholder: 'https://sdn1cibadak.sch.id', value: website, setter: setWebsite },
    { key: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C', placeholder: '@sdn1cibadak', value: instagram, setter: setInstagram },
    { key: 'facebook', label: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2', placeholder: 'SDN 01 Cibadak', value: facebook, setter: setFacebook },
    { key: 'youtube', label: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000', placeholder: '@sdn1cibadak', value: youtube, setter: setYoutube },
    { key: 'tiktok', label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000', placeholder: '@sdn1cibadak', value: tiktok, setter: setTiktok },
    { key: 'twitter', label: 'Twitter/X', icon: 'fa-brands fa-twitter', color: '#1DA1F2', placeholder: '@sdn1cibadak', value: twitter, setter: setTwitter },
    { key: 'linkedin', label: 'LinkedIn', icon: 'fa-brands fa-linkedin', color: '#0A66C2', placeholder: 'sdn-01-cibadak', value: linkedin, setter: setLinkedin },
    { key: 'email', label: 'Email', icon: 'fa-solid fa-envelope', color: '#EA4335', placeholder: 'info@sdn1cibadak.sch.id', value: email, setter: setEmail },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: '#25D366', placeholder: '628123456789', value: whatsapp, setter: setWhatsapp },
    { key: 'telegram', label: 'Telegram', icon: 'fa-brands fa-telegram', color: '#0088cc', placeholder: '@sdn1cibadak', value: telegram, setter: setTelegram },
  ];

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      brandTitle={school.name}
      brandSubtitle={`NPSN: ${school.npsn}`}
      headerTitle="Profil Sekolah"
      headerSubtitle="Kelola data identitas & branding sekolah binaan"
      headerActions={<CommandPalette currentUser={{ role: 'school', details: school, npsn: school.npsn }} onThemeToggle={() => toggleThemeWithTransition()} />}
    >
      <div className="content-area">

        {/* ══════ HERO CARD ══════ */}
        <div className="animate-fade-in" style={{
          ...S.sectionCard, marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(16,185,129,0.04))',
        }}>
          <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Logo Preview */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '16px', flexShrink: 0,
              border: '2px solid var(--card-border)', overflow: 'hidden',
              background: logoUrl ? 'transparent' : 'var(--card-glass)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <i className="fa-solid fa-school" style={{ fontSize: '24px', color: 'var(--text-muted)' }} />
              )}
            </div>
            {/* School Info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{school.name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={S.badge('#3b82f6')}>Gugus {school.gugus}</span>
                <span style={S.badge('#10b981')}>{school.level}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NPSN: <code style={{ fontWeight: 700 }}>{school.npsn}</code></span>
              </div>
            </div>
            {/* Completeness Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="var(--card-border)" strokeWidth="5" />
                  <circle cx="30" cy="30" r="24" fill="none"
                    stroke={profileCompleteness >= 80 ? '#10b981' : profileCompleteness >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(profileCompleteness / 100) * (2 * Math.PI * 24)} ${2 * Math.PI * 24}`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <span style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 800,
                  color: profileCompleteness >= 80 ? '#10b981' : profileCompleteness >= 50 ? '#f59e0b' : '#ef4444',
                }}>{profileCompleteness}%</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Kelengkapan</span>
            </div>
            {/* Social preview */}
            <div style={{ flexShrink: 0 }}>
              <SchoolSocialMedia school={school} variant="compact" />
            </div>
          </div>
        </div>

        {/* ══════ TAB BAR ══════ */}
        <div className="animate-fade-in" style={S.tabBar}>
          <div style={{ ...S.tabIndicator, left: tabIndicator.left, width: tabIndicator.width }} />
          {TABS.map(tab => (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[tab.id] = el; }}
              onClick={() => setActiveTab(tab.id)}
              style={S.tabBtn(activeTab === tab.id)}
            >
              <i className={tab.icon} style={{ fontSize: '13px' }} />
              {tab.label}
              {tab.id === 'facilities' && facilities.length > 0 && (
                <span style={{ ...S.badge('#3b82f6'), fontSize: '10px', padding: '1px 7px' }}>{facilities.length}</span>
              )}
              {tab.id === 'achievements' && achievements.length > 0 && (
                <span style={{ ...S.badge('#f59e0b'), fontSize: '10px', padding: '1px 7px' }}>{achievements.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══════ TAB CONTENT ══════ */}

        {/* ─── TAB: IDENTITAS ─── */}
        {activeTab === 'identity' && (
          <div className="animate-fade-in" style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={S.iconBubble('#3b82f6')}>
                <i className="fa-solid fa-school" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Data Identitas Sekolah</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Informasi dasar sekolah yang akan tampil di halaman publik</p>
              </div>
            </div>
            <div style={S.sectionBody}>
              <div style={S.formGrid}>
                {renderField('Nama Kepala Sekolah', 'fa-solid fa-user-tie', principalName, setPrincipalName, { required: true })}
                {renderField('Nama Operator Sekolah', 'fa-solid fa-user-gear', operatorName, setOperatorName, { required: true })}
                {renderField('No. HP Kepala Sekolah', 'fa-brands fa-whatsapp', ksPhone, setKsPhone, { placeholder: '+628xxxxxxxxxx' })}
                {renderField('No. HP Operator', 'fa-brands fa-whatsapp', operatorPhone, setOperatorPhone, { placeholder: '+628xxxxxxxxxx' })}
                {renderField('Alamat Sekolah', 'fa-solid fa-map-pin', address, setAddress, { required: true, fullWidth: true })}
                {renderNumberField('Jumlah Siswa', 'fa-solid fa-users', studentCount, setStudentCount)}
                {renderNumberField('Jumlah Guru', 'fa-solid fa-chalkboard-user', teacherCount, setTeacherCount)}
                <div className="form-group">
                  <label style={S.fieldLabel}>
                    <i className="fa-solid fa-award" style={{ fontSize: '11px' }} />
                    Akreditasi Sekolah
                  </label>
                  <select style={{ ...S.fieldInput, cursor: 'pointer' }}
                    value={accreditation} onChange={(e) => { setAccreditation(e.target.value); setHasChanges(true); }}
                  >
                    <option value="A">Akreditasi A (Unggul)</option>
                    <option value="B">Akreditasi B (Baik)</option>
                    <option value="C">Akreditasi C (Cukup)</option>
                    <option value="Belum Terakreditasi">Belum Terakreditasi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={S.fieldLabel}>
                    <i className="fa-solid fa-building-user" style={{ fontSize: '11px' }} />
                    Status Sekolah
                  </label>
                  <select style={{ ...S.fieldInput, cursor: 'pointer' }}
                    value={status} onChange={(e) => { setStatus(e.target.value); setHasChanges(true); }}
                  >
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: BRANDING ─── */}
        {activeTab === 'branding' && (
          <div className="animate-fade-in" style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={S.iconBubble('#8b5cf6')}>
                <i className="fa-solid fa-palette" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Branding & Visual</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Logo, foto profil, dan tanda tangan digital</p>
              </div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '28px', justifyItems: 'center' }}>
                {renderUploadBox('Logo Sekolah', 'fa-graduation-cap', logoUrl, logoInputRef, setLogoUrl)}
                {renderUploadBox('Foto Kepala Sekolah', 'fa-user-tie', principalAvatarUrl, principalAvatarRef, setPrincipalAvatarUrl)}
                {renderUploadBox('Foto Operator', 'fa-user-gear', operatorAvatarUrl, operatorAvatarRef, setOperatorAvatarUrl)}
                {renderUploadBox('Tanda Tangan KS', 'fa-signature', signatureUrl, signatureInputRef, setSignatureUrl, 300)}
              </div>

              {/* Stempel Color Selector */}
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
                <label style={{ ...S.fieldLabel, marginBottom: '8px', fontSize: '13px' }}>
                  <i className="fa-solid fa-stamp" style={{ color: stempelColor }} />
                  Warna Stempel Digital Sekolah
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="color" value={stempelColor} onChange={(e) => { setStempelColor(e.target.value); setHasChanges(true); }}
                    style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid var(--card-border)', cursor: 'pointer', background: 'none' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{stempelColor}</span>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {['#1d4ed8', '#059669', '#dc2626', '#7c3aed', '#0284c7'].map(c => (
                      <button key={c} type="button" onClick={() => { setStempelColor(c); setHasChanges(true); }}
                        style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: stempelColor === c ? '2px solid #fff' : 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)' }} />
                  Format yang didukung: JPG, PNG, WebP. Maksimal 500 KB (tanda tangan: 300 KB). Gunakan gambar dengan latar belakang transparan untuk hasil terbaik.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: MEDIA SOSIAL ─── */}
        {activeTab === 'social' && (
          <div className="animate-fade-in" style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={S.iconBubble('#E1306C')}>
                <i className="fa-solid fa-share-nodes" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Media Sosial & Kontak</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Tautan media sosial yang akan ditampilkan di profil publik sekolah</p>
              </div>
            </div>
            <div style={S.sectionBody}>
              <div style={S.formGrid}>
                {socialFields.map(sf => (
                  <div key={sf.key} className="form-group">
                    <label style={{ ...S.fieldLabel, gap: '8px' }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '7px',
                        background: `linear-gradient(135deg, ${sf.color}, ${sf.color}cc)`,
                        color: sf.key === 'tiktok' ? '#fff' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', flexShrink: 0,
                      }}>
                        <i className={sf.icon} />
                      </span>
                      {sf.label}
                    </label>
                    <input
                      type={sf.key === 'email' ? 'email' : 'text'}
                      style={S.fieldInput}
                      placeholder={sf.placeholder}
                      value={sf.value}
                      onChange={(e) => { sf.setter(e.target.value); setHasChanges(true); }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = sf.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${sf.color}15`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: FASILITAS ─── */}
        {activeTab === 'facilities' && (
          <div className="animate-fade-in">
            {/* Add/Edit Form */}
            <div style={{ ...S.sectionCard, marginBottom: '20px' }}>
              <div style={S.sectionHeader}>
                <div style={S.iconBubble('#10b981')}>
                  <i className="fa-solid fa-plus" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{editingFacilityId ? 'Edit Fasilitas' : 'Tambah Fasilitas Baru'}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Fasilitas akan ditampilkan di halaman profil publik sekolah</p>
                </div>
              </div>
              <div style={S.sectionBody}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {/* Icon Selector */}
                  <div>
                    <label style={S.fieldLabel}>Ikon</label>
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(true)}
                      style={{
                        ...S.iconBubble('#10b981'),
                        width: '46px', height: '46px', cursor: 'pointer',
                        border: '2px solid var(--card-border)',
                        transition: 'border-color 0.2s, transform 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'scale(1)'; }}
                      title="Pilih ikon"
                    >
                      <i className={`fa-solid ${facilityForm.icon}`} />
                    </button>
                  </div>
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={S.fieldLabel}>Nama Fasilitas</label>
                    <input
                      style={S.fieldInput}
                      placeholder="Contoh: Lab Komputer"
                      value={facilityForm.name}
                      onChange={(e) => setFacilityForm(p => ({ ...p, name: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                  {/* Description */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={S.fieldLabel}>Deskripsi (opsional)</label>
                    <input
                      style={S.fieldInput}
                      placeholder="Contoh: 20 unit komputer terbaru"
                      value={facilityForm.description}
                      onChange={(e) => setFacilityForm(p => ({ ...p, description: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                  {/* Button */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={editingFacilityId ? handleUpdateFacility : handleAddFacility}
                      className="btn btn-primary"
                      style={{ borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 600 }}
                    >
                      <i className={`fa-solid ${editingFacilityId ? 'fa-check' : 'fa-plus'}`} style={{ marginRight: '6px' }} />
                      {editingFacilityId ? 'Perbarui' : 'Tambah'}
                    </button>
                    {editingFacilityId && (
                      <button
                        type="button"
                        onClick={() => { setEditingFacilityId(null); setFacilityForm({ name: '', icon: 'fa-building', description: '' }); }}
                        style={{ ...S.miniBtn('#6b7280'), padding: '10px 16px', borderRadius: '12px', fontSize: '13px' }}
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Facilities List */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.iconBubble('#10b981')}>
                  <i className="fa-solid fa-building" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Daftar Fasilitas</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{facilities.length} fasilitas terdaftar</p>
                </div>
              </div>
              <div style={{ ...S.sectionBody, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {facilities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-building-circle-xmark" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3, display: 'block' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Belum ada fasilitas</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Tambahkan fasilitas sekolah Anda di form di atas</p>
                  </div>
                ) : facilities.map((fac) => (
                  <div
                    key={fac.id}
                    style={S.itemCard}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={S.iconBubble('#10b981')}>
                      <i className={`fa-solid ${fac.icon}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{fac.name}</h4>
                      {fac.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{fac.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFacilityId(fac.id);
                          setFacilityForm({ name: fac.name, icon: fac.icon, description: fac.description || '' });
                        }}
                        style={S.miniBtn('#3b82f6')}
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFacility(fac.id)}
                        style={S.miniBtn('#ef4444')}
                        title="Hapus"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PRESTASI ─── */}
        {activeTab === 'achievements' && (
          <div className="animate-fade-in">
            {/* Add/Edit Form */}
            <div style={{ ...S.sectionCard, marginBottom: '20px' }}>
              <div style={S.sectionHeader}>
                <div style={S.iconBubble('#f59e0b')}>
                  <i className="fa-solid fa-plus" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{editingAchievementId ? 'Edit Prestasi' : 'Tambah Prestasi Baru'}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Catat dan tampilkan prestasi membanggakan sekolah Anda</p>
                </div>
              </div>
              <div style={S.sectionBody}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={S.fieldLabel}><i className="fa-solid fa-heading" style={{ fontSize: '11px' }} /> Judul Prestasi</label>
                    <input
                      style={S.fieldInput}
                      placeholder="Contoh: Juara 1 Lomba Cerdas Cermat Kecamatan"
                      value={achievementForm.title}
                      onChange={(e) => setAchievementForm(p => ({ ...p, title: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                  <div>
                    <label style={S.fieldLabel}><i className="fa-solid fa-calendar" style={{ fontSize: '11px' }} /> Tahun</label>
                    <input
                      type="number"
                      style={S.fieldInput}
                      value={achievementForm.year}
                      onChange={(e) => setAchievementForm(p => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                  <div>
                    <label style={S.fieldLabel}><i className="fa-solid fa-tag" style={{ fontSize: '11px' }} /> Kategori</label>
                    <select
                      style={{ ...S.fieldInput, cursor: 'pointer' }}
                      value={achievementForm.category}
                      onChange={(e) => setAchievementForm(p => ({ ...p, category: e.target.value as AchievementCategory }))}
                    >
                      {ACHIEVEMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={S.fieldLabel}><i className="fa-solid fa-icons" style={{ fontSize: '11px' }} /> Ikon</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {ACHIEVEMENT_ICON_OPTIONS.map(ico => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => setAchievementForm(p => ({ ...p, icon: ico }))}
                          style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            border: achievementForm.icon === ico ? '2px solid #f59e0b' : '1px solid var(--card-border)',
                            background: achievementForm.icon === ico ? '#f59e0b15' : 'var(--card-glass)',
                            color: achievementForm.icon === ico ? '#f59e0b' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
                          }}
                        >
                          <i className={`fa-solid ${ico}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={S.fieldLabel}><i className="fa-solid fa-align-left" style={{ fontSize: '11px' }} /> Deskripsi (opsional)</label>
                    <input
                      style={S.fieldInput}
                      placeholder="Contoh: Tingkat Kecamatan Cibadak, Kabupaten Sukabumi"
                      value={achievementForm.description}
                      onChange={(e) => setAchievementForm(p => ({ ...p, description: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={editingAchievementId ? handleUpdateAchievement : handleAddAchievement}
                    className="btn btn-primary"
                    style={{ borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 600 }}
                  >
                    <i className={`fa-solid ${editingAchievementId ? 'fa-check' : 'fa-plus'}`} style={{ marginRight: '6px' }} />
                    {editingAchievementId ? 'Perbarui' : 'Tambah Prestasi'}
                  </button>
                  {editingAchievementId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAchievementId(null);
                        setAchievementForm({ title: '', description: '', year: new Date().getFullYear(), category: 'akademik', icon: 'fa-trophy' });
                      }}
                      style={{ ...S.miniBtn('#6b7280'), padding: '10px 16px', borderRadius: '12px', fontSize: '13px' }}
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Achievements List */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.iconBubble('#f59e0b')}>
                  <i className="fa-solid fa-trophy" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Daftar Prestasi</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{achievements.length} prestasi tercatat</p>
                </div>
              </div>
              <div style={{ ...S.sectionBody, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {achievements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-trophy" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3, display: 'block' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Belum ada prestasi</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Tambahkan prestasi sekolah Anda untuk ditampilkan di profil publik</p>
                  </div>
                ) : achievements.map((ach) => {
                  const catColor = CATEGORY_COLORS[ach.category] || '#6b7280';
                  return (
                    <div
                      key={ach.id}
                      style={S.itemCard}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = catColor; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={S.iconBubble(catColor)}>
                        <i className={`fa-solid ${ach.icon}`} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{ach.title}</h4>
                          <span style={S.badge(catColor)}>{ach.category}</span>
                          {ach.year && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{ach.year}</span>}
                        </div>
                        {ach.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{ach.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAchievementId(ach.id);
                            setAchievementForm({
                              title: ach.title,
                              description: ach.description || '',
                              year: ach.year || new Date().getFullYear(),
                              category: ach.category,
                              icon: ach.icon,
                            });
                          }}
                          style={S.miniBtn('#3b82f6')}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAchievement(ach.id)}
                          style={S.miniBtn('#ef4444')}
                          title="Hapus"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: GALERI ─── */}
        {activeTab === 'gallery' && (
          <div className="animate-fade-in">
            {/* Add Form */}
            <div style={{ ...S.sectionCard, marginBottom: '20px' }}>
              <div style={S.sectionHeader}>
                <div style={S.iconBubble('#06b6d4')}>
                  <i className="fa-solid fa-plus" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Tambah Foto Galeri</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Tempelkan link Google Drive atau URL gambar langsung</p>
                </div>
              </div>
              <div style={S.sectionBody}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={S.fieldLabel}><i className="fa-solid fa-heading" style={{ fontSize: '11px' }} /> Judul</label>
                    <input style={S.fieldInput} placeholder="Contoh: Upacara Bendera"
                      value={galleryForm.title} onChange={(e) => setGalleryForm(p => ({ ...p, title: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#06b6d4'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                  <div>
                    <label style={S.fieldLabel}><i className="fa-solid fa-tag" style={{ fontSize: '11px' }} /> Kategori</label>
                    <select style={{ ...S.fieldInput, cursor: 'pointer' }}
                      value={galleryForm.category} onChange={(e) => setGalleryForm(p => ({ ...p, category: e.target.value as GalleryItem['category'] }))}
                    >
                      {['Rapat Ops', 'KKKS', 'Pelatihan', 'Kunjungan', 'Upacara', 'Lainnya'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={S.fieldLabel}><i className="fa-brands fa-google-drive" style={{ fontSize: '11px' }} /> URL Gambar (Google Drive / langsung)</label>
                    <input style={S.fieldInput}
                      placeholder="https://drive.google.com/file/d/xxx/view atau URL gambar langsung"
                      value={galleryForm.imageUrl} onChange={(e) => setGalleryForm(p => ({ ...p, imageUrl: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#06b6d4'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-circle-info" style={{ color: '#06b6d4' }} />
                      Pastikan file Google Drive di-share sebagai &quot;Anyone with the link&quot;. Link akan dikonversi otomatis.
                    </p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={S.fieldLabel}><i className="fa-solid fa-align-left" style={{ fontSize: '11px' }} /> Deskripsi (opsional)</label>
                    <input style={S.fieldInput} placeholder="Keterangan singkat tentang foto"
                      value={galleryForm.description} onChange={(e) => setGalleryForm(p => ({ ...p, description: e.target.value }))}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#06b6d4'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                    />
                  </div>
                </div>
                <button type="button" onClick={handleAddGalleryItem} className="btn btn-primary"
                  style={{ borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, marginTop: '16px' }}
                >
                  <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} /> Tambah ke Galeri
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div style={S.sectionCard}>
              <div style={S.sectionHeader}>
                <div style={S.iconBubble('#06b6d4')}><i className="fa-solid fa-images" /></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Galeri Foto Sekolah</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{galleryItems.length} foto terdokumentasi</p>
                </div>
              </div>
              <div style={{ ...S.sectionBody }}>
                {galleryItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-images" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3, display: 'block' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Belum ada foto galeri</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Tambahkan foto kegiatan sekolah lewat link Google Drive</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                    {galleryItems.map(item => (
                      <div key={item.id} style={{
                        borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--card-border)',
                        background: 'var(--card-glass)', transition: 'transform 0.2s, border-color 0.2s',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#06b6d4'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                      >
                        <div style={{ aspectRatio: '16/10', overflow: 'hidden', background: '#111' }}>
                          <img src={item.imageUrl} alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="10">No Image</text></svg>'; }}
                          />
                        </div>
                        <div style={{ padding: '12px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{item.title}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={S.badge('#06b6d4')}>{item.category}</span>
                            <button type="button" onClick={() => handleDeleteGalleryItem(item.id)}
                              style={S.miniBtn('#ef4444')} title="Hapus">
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: LOKASI ─── */}
        {activeTab === 'location' && (
          <div className="animate-fade-in" style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={S.iconBubble('#ef4444')}>
                <i className="fa-solid fa-map-location-dot" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Lokasi Sekolah</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Klik peta atau geser pin untuk menentukan titik koordinat sekolah</p>
              </div>
            </div>
            <div style={S.sectionBody}>
              {/* Map Container */}
              <div ref={mapContainerRef} style={{
                width: '100%', height: '400px', borderRadius: '16px',
                border: '1px solid var(--card-border)', overflow: 'hidden',
                marginBottom: '20px', background: '#1a1a2e',
              }} />

              {/* Coordinate Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={S.fieldLabel}>
                    <i className="fa-solid fa-location-crosshairs" style={{ fontSize: '11px' }} />
                    Garis Lintang (Latitude)
                  </label>
                  <input type="number" step="0.000001" style={S.fieldInput}
                    value={lat ?? ''} placeholder="-6.895000"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || null;
                      setLat(val);
                      setHasChanges(true);
                      updateMapMarker(val, lng);
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#ef4444'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                  />
                </div>
                <div className="form-group">
                  <label style={S.fieldLabel}>
                    <i className="fa-solid fa-location-crosshairs" style={{ fontSize: '11px' }} />
                    Garis Bujur (Longitude)
                  </label>
                  <input type="number" step="0.000001" style={S.fieldInput}
                    value={lng ?? ''} placeholder="106.790000"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || null;
                      setLng(val);
                      setHasChanges(true);
                      updateMapMarker(lat, val);
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#ef4444'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-info" style={{ color: '#ef4444' }} />
                  Koordinat ini tersinkronisasi dengan Portal Admin. Klik langsung pada peta atau geser pin marker untuk menentukan lokasi. Data akan tersimpan saat Anda mengklik &quot;Simpan Perubahan&quot;.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: VISI & MISI ─── */}
        {activeTab === 'visiMisi' && (
          <div className="animate-fade-in" style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={S.iconBubble('#8b5cf6')}>
                <i className="fa-solid fa-bullseye" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Visi & Misi Sekolah</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Tuliskan visi dan misi sekolah Anda</p>
              </div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Vision */}
                <div>
                  <label style={{ ...S.fieldLabel, marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                    }}><i className="fa-solid fa-eye" /></span>
                    Visi Sekolah
                  </label>
                  <textarea
                    style={{ ...S.fieldInput, minHeight: '100px', resize: 'vertical', lineHeight: '1.6' }}
                    placeholder="Contoh: Terwujudnya peserta didik yang beriman, bertaqwa, berilmu, cerdas, kreatif, dan berkarakter."
                    value={vision}
                    onChange={(e) => { setVision(e.target.value); setHasChanges(true); }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* Mission */}
                <div>
                  <label style={{ ...S.fieldLabel, marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                    }}><i className="fa-solid fa-list-check" /></span>
                    Misi Sekolah
                  </label>
                  <textarea
                    style={{ ...S.fieldInput, minHeight: '160px', resize: 'vertical', lineHeight: '1.6' }}
                    placeholder={"Contoh:\n1. Meningkatkan kualitas pembelajaran yang inovatif\n2. Membentuk peserta didik yang berakhlak mulia\n3. Mengembangkan potensi siswa di bidang akademik dan non-akademik"}
                    value={mission}
                    onChange={(e) => { setMission(e.target.value); setHasChanges(true); }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Preview */}
              {(vision || mission) && (
                <div style={{ marginTop: '24px', padding: '20px', borderRadius: '16px', border: '1px dashed var(--card-border)', background: 'rgba(139,92,246,0.03)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-eye" style={{ color: '#8b5cf6' }} /> Pratinjau Tampilan Publik
                  </h4>
                  {vision && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 800, color: '#8b5cf6', marginBottom: '6px' }}>VISI</h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.7', fontStyle: 'italic' }}>&ldquo;{vision}&rdquo;</p>
                    </div>
                  )}
                  {mission && (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: 800, color: '#06b6d4', marginBottom: '6px' }}>MISI</h5>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{mission}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════ STICKY SAVE BAR ══════ */}
        {(activeTab === 'identity' || activeTab === 'branding' || activeTab === 'social' || activeTab === 'location' || activeTab === 'visiMisi') && (
          <div style={{ ...S.saveBar, marginTop: '24px', opacity: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {hasChanges ? (
                <>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Ada perubahan yang belum disimpan</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Semua data tersimpan</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn btn-primary"
              style={{
                borderRadius: '12px', padding: '10px 28px', fontSize: '14px', fontWeight: 700,
                opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} /> Menyimpan...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '8px' }} /> Simpan Perubahan</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ══════ ICON PICKER MODAL ══════ */}
      {showIconPicker && (
        <div style={S.iconPickerOverlay} onClick={() => setShowIconPicker(false)}>
          <div style={S.iconPickerModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Pilih Ikon Fasilitas</h3>
              <button
                onClick={() => setShowIconPicker(false)}
                style={{ width: '32px', height: '32px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-glass)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {FACILITY_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => { setFacilityForm(p => ({ ...p, icon })); setShowIconPicker(false); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '14px 8px', borderRadius: '14px', cursor: 'pointer',
                    border: facilityForm.icon === icon ? '2px solid #10b981' : '1px solid var(--card-border)',
                    background: facilityForm.icon === icon ? '#10b98115' : 'var(--card-glass)',
                    color: facilityForm.icon === icon ? '#10b981' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (facilityForm.icon !== icon) { e.currentTarget.style.borderColor = '#10b98150'; e.currentTarget.style.background = '#10b98108'; } }}
                  onMouseLeave={(e) => { if (facilityForm.icon !== icon) { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'var(--card-glass)'; } }}
                >
                  <i className={`fa-solid ${icon}`} style={{ fontSize: '20px' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>{FACILITY_ICON_LABELS[icon] || icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
    </>
  );
}
