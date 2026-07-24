'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { School } from '@/lib/schoolsData';
import { getSubmissions, getSchoolCoordinatesMap, saveSchoolCoordinates, resetSchoolCoordinates, getSchools, getCategories, getOnlineUsers, getProfileSettings } from '@/lib/db';
import type { Submission, OnlinePresence } from '@/lib/db';
import type { ProfileSettings } from '@/lib/types';
import { KORYANDIK_CENTER_TUPLE } from '@/lib/mapConstants';
import { toast } from 'sonner';
import { confirmAction } from '@/components/ConfirmDialog';
import FancySelect from '@/components/FancySelect';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import 'leaflet/dist/leaflet.css';

interface DistrictMapProps {
  onSchoolClick?: (school: School) => void;
  isAdminMode?: boolean;
  showHeader?: boolean;
}

// Default fallback Lat/Lng generator based on Cibadak, Sukabumi coordinates
const getDefaultLatLng = (school: School, index: number) => {
  const seed = index * 17;
  const randLat = ((seed % 40) - 20) * 0.0008;
  const randLng = (((seed * 7) % 40) - 20) * 0.0008;
  
  // Center: Cibadak (-6.8950, 106.7900)
  switch (school.gugus) {
    case 'I': // Cibadak North
      return { lat: -6.8850 + randLat, lng: 106.7850 + randLng };
    case 'II': // Karangtengah East
      return { lat: -6.8900 + randLat, lng: 106.8050 + randLng };
    case 'III': // Pamuruyan West
      return { lat: -6.9050 + randLat, lng: 106.7750 + randLng };
    case 'IV': // Leumbursawah South
      return { lat: -6.9100 + randLat, lng: 106.7950 + randLng };
    case 'V': // Swasta / Scattered
      return { lat: -6.8980 + randLat, lng: 106.7920 + randLng };
    default:
      return { lat: -6.8950, lng: 106.7900 };
  }
};

export default function DistrictMap({ onSchoolClick, isAdminMode = false, showHeader = true }: DistrictMapProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeGugus, setActiveGugus] = useState<string | null>(null);
  const [onlinePresenceList, setOnlinePresenceList] = useState<OnlinePresence[]>([]);
  
  // Custom Coordinates State
  const [customCoordsMap, setCustomCoordsMap] = useState<Record<string, { lat: number; lng: number }>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolNpsn, setSelectedSchoolNpsn] = useState<string>('');
  const [customSchoolsMap, setCustomSchoolsMap] = useState<Record<string, School>>({});
  
  // Split-Drawer state
  const [drawerSchool, setDrawerSchool] = useState<School | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [totalCategories, setTotalCategories] = useState(8);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const tileLayerRef = useRef<any>(null);

  // MutationObserver for theme detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  // Update tilelayer url when theme changes
  useEffect(() => {
    if (tileLayerRef.current) {
      const newTileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      tileLayerRef.current.setUrl(newTileUrl);
    }
    // Force map to invalidate size when theme changes
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
    }
  }, [isDark]);

  const loadData = async () => {
    const [submissions, customCoordsMap, onlinePresenceList, allSchools, categories] = await Promise.all([
      getSubmissions(),
      getSchoolCoordinatesMap(),
      getOnlineUsers(),
      getSchools(),
      getCategories()
    ]);
    
    setSubmissions(submissions);
    setCustomCoordsMap(customCoordsMap);
    setOnlinePresenceList(onlinePresenceList);
    
    setSchools(allSchools);
    if (allSchools.length > 0) {
      setSelectedSchoolNpsn(prev => prev || allSchools[0]?.npsn || '');
    }
    const map: Record<string, School> = {};
    allSchools.forEach(s => { map[s.npsn] = s; });
    setCustomSchoolsMap(map);
    
    setTotalCategories(categories.length || 8);
  };

  useEffect(() => {
    loadData();

    // Poll online users list every 15s
    const timer = setInterval(async () => {
      const users = await getOnlineUsers();
      setOnlinePresenceList(users);
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const getCoordinates = (school: School, index: number) => {
    if (customCoordsMap[school.npsn]) {
      return customCoordsMap[school.npsn];
    }
    return getDefaultLatLng(school, index);
  };

  const getSchoolProgress = (npsn: string) => {
    const schoolSubs = submissions.filter(s => s.schoolNpsn === npsn);
    const approved = schoolSubs.filter(s => s.status === 'approved').length;
    return Math.round((approved / (totalCategories || 1)) * 100);
  };

  const getSchoolStatusColor = (npsn: string) => {
    const progress = getSchoolProgress(npsn);
    if (progress === 100) return '#22c55e'; // Green - Complete
    if (progress > 0) return '#f59e0b';    // Orange - In Progress
    return '#ef4444';                      // Red - No approved files
  };

  // Initialize & Update Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    setMapLoaded(false);
    setMapError(null);

    // Dynamically import Leaflet to avoid SSR window errors
    (async () => {
      try {
        console.log('Loading Leaflet...');
        const L = await import('leaflet');
        console.log('Leaflet loaded successfully');
        
        // Create map instance if not existing
        if (!mapInstanceRef.current) {
          console.log('Initializing map...');
          const map = L.map(mapContainerRef.current!, {
            center: KORYANDIK_CENTER_TUPLE,
            zoom: 13,
            zoomControl: true,
            scrollWheelZoom: false, // Nonaktifkan scroll zoom default
          });

          // Aktifkan scroll zoom hanya ketika map di-klik/fokus, nonaktifkan saat mouse keluar container
          map.on('focus', () => {
            map.scrollWheelZoom.enable();
          });
          map.on('mouseout', () => {
            map.scrollWheelZoom.disable();
          });

          console.log('Adding tile layer...');
          // Use OpenStreetMap tiles as default (more reliable)
          const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          tileLayerRef.current = tileLayer;
          mapInstanceRef.current = map;
          
          // Force map to invalidate size after initialization
          setTimeout(() => {
            map.invalidateSize();
            setMapLoaded(true);
            console.log('Map initialized successfully');
          }, 100);
        }

        const map = mapInstanceRef.current;

        // Handle Map Click in Edit Mode
        map.off('click');
        if (isEditMode && selectedSchoolNpsn) {
          map.on('click', async (e: any) => {
            const newLat = parseFloat(e.latlng.lat.toFixed(6));
            const newLng = parseFloat(e.latlng.lng.toFixed(6));
            
            const updated = await saveSchoolCoordinates(selectedSchoolNpsn, newLat, newLng);
            setCustomCoordsMap(updated);
            const sch = schools.find(s => s.npsn === selectedSchoolNpsn);
            toast.success(`Lokasi ${sch?.name} diperbarui ke (${newLat}, ${newLng})`);
          });
        }

        // Clear existing markers & circles
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        circlesRef.current.forEach(c => c.remove());
        circlesRef.current = [];

        // Render Heatmap overlay if enabled
        if (isHeatmapMode) {
          // Dynamic gugus centers calculation from actual school coordinates
          const gugusNames: Record<string, string> = {
            'I': 'Gugus I (Cibadak Utara)',
            'II': 'Gugus II (Karangtengah)',
            'III': 'Gugus III (Pamuruyan)',
            'IV': 'Gugus IV (Leumbursawah)',
            'V': 'Gugus V (Swasta/Lainnya)'
          };

          // Calculate for each gugus
          ['I', 'II', 'III', 'IV', 'V'].forEach(gId => {
            const gugusSchools = schools.filter(s => s.gugus === gId);
            
            if (gugusSchools.length === 0) return;

            // Calculate dynamic center (average coordinates of all schools in gugus)
            const schoolCoords = gugusSchools.map((school, idx) => getCoordinates(school, idx));
            const avgLat = schoolCoords.reduce((sum, c) => sum + c.lat, 0) / schoolCoords.length;
            const avgLng = schoolCoords.reduce((sum, c) => sum + c.lng, 0) / schoolCoords.length;
            
            // Calculate dynamic radius based on spread of schools
            const distances = schoolCoords.map(c => {
              const dx = c.lng - avgLng;
              const dy = c.lat - avgLat;
              return Math.sqrt(dx*dx + dy*dy) * 111000; // Convert degrees to meters approx
            });
            const maxDistance = Math.max(...distances, 600); // Minimum radius 600m
            const radius = Math.min(maxDistance + 500, 1500); // Max radius 1500m

            // Calculate average progress
            const totalSubs = gugusSchools.reduce((acc, sch) => {
              const schSubs = submissions.filter(s => s.schoolNpsn === sch.npsn && s.status === 'approved').length;
              return acc + schSubs;
            }, 0);
            const maxPossible = gugusSchools.length * (totalCategories || 1);
            const avgProgress = maxPossible > 0 ? Math.round((totalSubs / maxPossible) * 100) : 0;
            
            let gColor = '#ef4444';
            if (avgProgress >= 80) gColor = '#22c55e';
            else if (avgProgress >= 50) gColor = '#f59e0b';

            const circle = L.circle([avgLat, avgLng], {
              color: gColor,
              fillColor: gColor,
              fillOpacity: 0.25,
              radius
            }).addTo(map);

            circle.bindPopup(`
              <div style="font-family: sans-serif; color: #1e293b; padding: 4px; min-width: 150px;">
                <h4 style="margin: 0 0 4px; font-weight: bold;">${gugusNames[gId]}</h4>
                <p style="margin: 0; font-size: 11px;">Rata-rata Kepatuhan: <strong style="color: ${gColor};">${avgProgress}%</strong></p>
                <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">Sekolah Binaan: ${gugusSchools.length} Sekolah</p>
                <p style="margin: 2px 0 0; font-size: 10px; color: #94a3b8;">
                  Pusat: (${avgLat.toFixed(4)}, ${avgLng.toFixed(4)})
                </p>
              </div>
            `);

            circlesRef.current.push(circle);
          });
        }

        // Render markers for each school
        schools.forEach((school, idx) => {
          const coords = getCoordinates(school, idx);
          const isGugusMatch = activeGugus ? school.gugus === activeGugus : true;
          if (!isGugusMatch) return;

          const progress = getSchoolProgress(school.npsn);
          const color = getSchoolStatusColor(school.npsn);
          const isSelectedInEdit = isEditMode && selectedSchoolNpsn === school.npsn;

          // Check if operator is online
          const schoolPresence = onlinePresenceList.find(p => p.npsn === school.npsn);
          const isOnline = schoolPresence && schoolPresence.page !== 'Offline' && (new Date().getTime() - new Date(schoolPresence.lastSeen).getTime() < 120000);

          // Custom HTML Marker Icon with real-time ping animation for active schools
          const customIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
                ${isOnline ? `
                  <div class="map-pulse-ripple" style="
                    position: absolute;
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: rgba(34, 197, 94, 0.45);
                    top: 50%;
                    left: 50%;
                    pointer-events: none;
                  "></div>
                ` : ''}
              <div style="
                position: relative;
                width: ${isSelectedInEdit ? '22px' : '14px'};
                height: ${isSelectedInEdit ? '22px' : '14px'};
                background-color: ${isSelectedInEdit ? '#3b82f6' : color};
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 10px ${isSelectedInEdit ? '#3b82f6' : color};
                cursor: pointer;
                transition: all 0.2s ease;
                z-index: 2;
              "></div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

        // Bind Popup with branding & online status details
        const customSchool = customSchoolsMap[school.npsn];
        const logoHtml = customSchool?.logoUrl 
          ? `<img src="${customSchool.logoUrl}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;float:left;margin-right:8px;" alt="Logo"/>` 
          : '';

        const presenceStatusHtml = isOnline 
          ? `<p style="margin: 4px 0 0; font-size: 10px; color: #22c55e; font-weight: bold; display: flex; align-items: center; gap: 4px;">
              <span class="live-dot" style="width: 6px; height: 6px; margin: 0;"></span> Aktif: ${schoolPresence.page === '/school/dashboard' ? 'Dashboard' : schoolPresence.page === '/school/profile' ? 'Profil' : schoolPresence.page === '/school/receipt' ? 'Tanda Terima' : 'Aktif'}
             </p>`
          : schoolPresence 
            ? `<p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">
                Offline (Terakhir aktif: ${new Date(schoolPresence.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
               </p>`
            : `<p style="margin: 4px 0 0; font-size: 10px; color: #94a3b8;">
                Offline
               </p>`;

        const socialHtml = (() => {
          const links: string[] = [];
          if (customSchool?.website) {
            const href = customSchool.website.startsWith('http') ? customSchool.website : `https://${customSchool.website}`;
            links.push(`<a href="${href}" target="_blank" style="color:#3b82f6;font-size:12px;text-decoration:none;"><i class="fa-solid fa-globe"></i></a>`);
          }
          if (customSchool?.instagram) {
            links.push(`<a href="https://instagram.com/${customSchool.instagram.replace('@','')}" target="_blank" style="color:#E1306C;font-size:12px;text-decoration:none;"><i class="fa-brands fa-instagram"></i></a>`);
          }
          if (customSchool?.facebook) {
            const href = customSchool.facebook.startsWith('http') ? customSchool.facebook : `https://facebook.com/${customSchool.facebook}`;
            links.push(`<a href="${href}" target="_blank" style="color:#1877F2;font-size:12px;text-decoration:none;"><i class="fa-brands fa-facebook"></i></a>`);
          }
          if (customSchool?.youtube) {
            const href = customSchool.youtube.startsWith('http') ? customSchool.youtube : `https://youtube.com/${customSchool.youtube}`;
            links.push(`<a href="${href}" target="_blank" style="color:#FF0000;font-size:12px;text-decoration:none;"><i class="fa-brands fa-youtube"></i></a>`);
          }
          if (customSchool?.tiktok) {
            const href = customSchool.tiktok.startsWith('http') ? customSchool.tiktok : `https://tiktok.com/@${customSchool.tiktok.replace('@','')}`;
            links.push(`<a href="${href}" target="_blank" style="color:#000000;font-size:12px;text-decoration:none;"><i class="fa-brands fa-tiktok"></i></a>`);
          }
          if (customSchool?.twitter) {
            const href = customSchool.twitter.startsWith('http') ? customSchool.twitter : `https://twitter.com/${customSchool.twitter.replace('@','')}`;
            links.push(`<a href="${href}" target="_blank" style="color:#1DA1F2;font-size:12px;text-decoration:none;"><i class="fa-brands fa-twitter"></i></a>`);
          }
          if (customSchool?.linkedin) {
            const href = customSchool.linkedin.startsWith('http') ? customSchool.linkedin : `https://linkedin.com/${customSchool.linkedin}`;
            links.push(`<a href="${href}" target="_blank" style="color:#0A66C2;font-size:12px;text-decoration:none;"><i class="fa-brands fa-linkedin"></i></a>`);
          }
          if (customSchool?.email) {
            links.push(`<a href="mailto:${customSchool.email}" target="_blank" style="color:#EA4335;font-size:12px;text-decoration:none;"><i class="fa-solid fa-envelope"></i></a>`);
          }
          if (customSchool?.whatsapp) {
            const phone = formatPhoneForWhatsApp(customSchool.whatsapp);
            links.push(`<a href="https://wa.me/${phone}" target="_blank" style="color:#25D366;font-size:12px;text-decoration:none;"><i class="fa-brands fa-whatsapp"></i></a>`);
          }
          if (customSchool?.telegram) {
            const username = customSchool.telegram.replace('@', '').replace('https://t.me/', '');
            links.push(`<a href="https://t.me/${username}" target="_blank" style="color:#0088cc;font-size:12px;text-decoration:none;"><i class="fa-brands fa-telegram"></i></a>`);
          }
          return links.length > 0 ? `<div style="border-top:1px solid #cbd5e1;padding-top:4px;margin-top:4px;display:flex;gap:8px;">${links.join('')}</div>` : '';
        })();

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; color: #1e293b; min-width: 180px;">
            <span style="font-size: 9px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
              Gugus ${school.gugus} • ${school.level}
            </span>
            <div style="margin-top:6px;overflow:hidden;">
              ${logoHtml}
              <h4 style="font-size: 13px; margin: 0 0 2px; font-weight: bold;">${school.name}</h4>
              <p style="font-size: 10px; color: #64748b; margin: 0;">NPSN: ${school.npsn}</p>
              ${presenceStatusHtml}
            </div>
            <div style="clear:both; font-size: 10px; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 6px; display: flex; justify-content: space-between;">
              <span>Siswa: <strong>${school.studentCount}</strong></span>
              <span>Guru: <strong>${school.teacherCount}</strong></span>
              <span>Status: <strong style="color: ${color}">${progress}%</strong></span>
            </div>
            ${socialHtml}
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (isEditMode) {
            setSelectedSchoolNpsn(school.npsn);
          } else {
            setDrawerSchool(school);
            onSchoolClick?.(school);
          }
        });

        markersRef.current.push(marker);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to load map');
    }
    })();
  }, [schools, isEditMode, selectedSchoolNpsn, activeGugus, isHeatmapMode, onlinePresenceList, submissions, customCoordsMap, customSchoolsMap, totalCategories]);

  const handleManualCoordChange = async (lat: number, lng: number) => {
    const updated = await saveSchoolCoordinates(selectedSchoolNpsn, lat, lng);
    setCustomCoordsMap(updated);
    toast.success(`Koordinat Bujur & Lintang disimpan!`);
  };

  const handleResetCoords = async () => {
    const confirmed = await confirmAction({
      title: 'Reset Koordinat',
      message: 'Apakah Anda yakin ingin mengembalikan semua koordinat sekolah ke lokasi default?',
      variant: 'warning',
    });
    if (confirmed) {
      await resetSchoolCoordinates();
      setCustomCoordsMap({});
      toast.info('Koordinat peta dikembalikan ke posisi awal.');
    }
  };

  const currentSelectedSchoolObj = schools.find(s => s.npsn === selectedSchoolNpsn);
  const currentSelectedCoords = currentSelectedSchoolObj ? getCoordinates(currentSelectedSchoolObj, schools.findIndex(s => s.npsn === selectedSchoolNpsn)) : { lat: 0, lng: 0 };

  return (
    <div className="card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
      <style jsx global>{`
        @keyframes map-marker-ping {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          70%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        .map-pulse-ripple {
          transform: translate(-50%, -50%);
          animation: map-marker-ping 1.5s infinite ease-out;
        }
      `}</style>
      {showHeader && (
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '16px' }}><i className="fa-solid fa-map-location-dot"></i> Peta Interaktif Leaflet (GPS Real)</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pemetaan geografis lokasi sekolah berdasarkan koordinat Lintang & Bujur Kecamatan Cibadak</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => loadData()}
              style={{ fontSize: '11px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Refresh data sekolah"
            >
              <i className="fa-solid fa-rotate"></i> Refresh
            </button>

            <button
              className={`btn btn-sm ${isHeatmapMode ? 'btn-accent' : 'btn-outline'}`}
              onClick={() => {
                setIsHeatmapMode(!isHeatmapMode);
                if (!isHeatmapMode) setActiveGugus(null); // Clear active gugus filter if enabling heatmap
              }}
              style={{ fontSize: '11px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <i className="fa-solid fa-fire"></i> Heatmap Gugus
            </button>

            {isAdminMode && (
              <button
                className={`btn btn-sm ${isEditMode ? 'btn-accent' : 'btn-outline'}`}
                onClick={() => setIsEditMode(!isEditMode)}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                <i className="fa-solid fa-location-dot"></i> {isEditMode ? 'Selesai Edit' : 'Edit Koordinat GPS'}
              </button>
            )}

            {['I', 'II', 'III', 'IV', 'V'].map(g => (
              <button
                key={g}
                className={`btn btn-sm ${activeGugus === g ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveGugus(activeGugus === g ? null : g)}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Gugus {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin Edit Controls Bar */}
      {isAdminMode && isEditMode && (
        <div style={{ background: 'var(--card-glass)', padding: '12px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ color: 'var(--accent)' }}><i className="fa-solid fa-crosshairs"></i> Mode Edit GPS Aktif:</strong>
            <span>Pilih sekolah & klik lokasi baru pada peta Leaflet</span>
          </div>

          <FancySelect
            size="sm"
            fullWidth={false}
            className="district-map-school-select"
            value={selectedSchoolNpsn}
            onChange={setSelectedSchoolNpsn}
            icon="fa-solid fa-school"
            searchable
            options={schools.map((s) => ({
              value: s.npsn,
              label: s.name,
              hint: `Gugus ${s.gugus}`,
            }))}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label>Lintang (Lat):</label>
            <input
              type="number"
              step="0.000001"
              className="form-control"
              style={{ width: '100px', padding: '2px 6px', fontSize: '12px' }}
              value={currentSelectedCoords.lat}
              onChange={(e) => handleManualCoordChange(parseFloat(e.target.value) || 0, currentSelectedCoords.lng)}
            />
            <label>Bujur (Lng):</label>
            <input
              type="number"
              step="0.000001"
              className="form-control"
              style={{ width: '100px', padding: '2px 6px', fontSize: '12px' }}
              value={currentSelectedCoords.lng}
              onChange={(e) => handleManualCoordChange(currentSelectedCoords.lat, parseFloat(e.target.value) || 0)}
            />
          </div>

          <button className="btn btn-danger btn-sm" onClick={handleResetCoords} style={{ padding: '4px 8px', fontSize: '11px', marginLeft: 'auto' }}>
            <i className="fa-solid fa-rotate-left"></i> Reset Default
          </button>
        </div>
      )}

      <div className="card-body" style={{ position: 'relative' }}>
        {/* Map Container */}
        {mapError ? (
          <div style={{ 
            width: '100%', 
            height: '420px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: '#191a1a',
            borderRadius: '8px',
            color: '#ef4444',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '32px' }}></i>
            <div>Error loading map: {mapError}</div>
            <button 
              className="btn btn-sm btn-outline" 
              onClick={() => window.location.reload()}
              style={{ marginTop: '10px' }}
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <div 
            ref={mapContainerRef} 
            style={{ 
              width: '100%', 
              height: '420px', 
              zIndex: 1, 
              background: '#191a1a',
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />
        )}

        {/* Bento Map Split-Drawer */}
        {drawerSchool && (() => {
          const drawerProgress = getSchoolProgress(drawerSchool.npsn);
          const drawerColor = getSchoolStatusColor(drawerSchool.npsn);
          const drawerPresence = onlinePresenceList.find(p => p.npsn === drawerSchool.npsn);
          const drawerIsOnline = drawerPresence && drawerPresence.page !== 'Offline' && (new Date().getTime() - new Date(drawerPresence.lastSeen).getTime() < 120000);
          const drawerCustom = customSchoolsMap[drawerSchool.npsn];
          const waPhone = drawerCustom?.whatsapp ? formatPhoneForWhatsApp(drawerCustom.whatsapp) : '';
          return (
            <div className="map-split-drawer" style={{ animation: 'slideInRight 0.3s ease-out' }}>
              {/* Close button */}
              <button
                onClick={() => setDrawerSchool(null)}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
                aria-label="Tutup drawer"
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: '14px' }}></i>
              </button>              {/* Header */}
              <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  {drawerSchool.logoUrl ? (
                    <img src={drawerSchool.logoUrl} alt={drawerSchool.name} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', border: '2px solid var(--card-border)' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary-glow), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)' }}>
                      <i className="fa-solid fa-school" style={{ fontSize: '24px', color: 'var(--primary)' }}></i>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{drawerSchool.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>NPSN: {drawerSchool.npsn}</span>
                      <span>•</span>
                      <span>Gugus {drawerSchool.gugus}</span>
                    </div>
                    {/* Social Media Row (Compact Icons) */}
                    {drawerCustom && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {drawerCustom.website && (
                          <a href={drawerCustom.website.startsWith('http') ? drawerCustom.website : `https://${drawerCustom.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '13px', transition: 'all 0.2s' }} title="Website">
                            <i className="fa-solid fa-globe"></i>
                          </a>
                        )}
                        {drawerCustom.instagram && (
                          <a href={`https://instagram.com/${drawerCustom.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', fontSize: '13px', transition: 'all 0.2s' }} title="Instagram">
                            <i className="fa-brands fa-instagram"></i>
                          </a>
                        )}
                        {drawerCustom.facebook && (
                          <a href={drawerCustom.facebook.startsWith('http') ? drawerCustom.facebook : `https://facebook.com/${drawerCustom.facebook}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2', fontSize: '13px', transition: 'all 0.2s' }} title="Facebook">
                            <i className="fa-brands fa-facebook"></i>
                          </a>
                        )}
                        {drawerCustom.youtube && (
                          <a href={drawerCustom.youtube.startsWith('http') ? drawerCustom.youtube : `https://youtube.com/${drawerCustom.youtube}`} target="_blank" rel="noopener noreferrer" style={{ color: '#FF0000', fontSize: '13px', transition: 'all 0.2s' }} title="YouTube">
                            <i className="fa-brands fa-youtube"></i>
                          </a>
                        )}
                        {drawerCustom.tiktok && (
                          <a href={drawerCustom.tiktok.startsWith('http') ? drawerCustom.tiktok : `https://tiktok.com/@${drawerCustom.tiktok.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', fontSize: '13px', transition: 'all 0.2s' }} title="TikTok">
                            <i className="fa-brands fa-tiktok"></i>
                          </a>
                        )}
                        {drawerCustom.email && (
                          <a href={`mailto:${drawerCustom.email}`} target="_blank" rel="noopener noreferrer" style={{ color: '#EA4335', fontSize: '13px', transition: 'all 0.2s' }} title="Email">
                            <i className="fa-solid fa-envelope"></i>
                          </a>
                        )}
                        {drawerCustom.telegram && (
                          <a href={`https://t.me/${drawerCustom.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0088cc', fontSize: '13px', transition: 'all 0.2s' }} title="Telegram">
                            <i className="fa-brands fa-telegram"></i>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Online status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: drawerIsOnline ? '#22c55e' : '#94a3b8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: drawerIsOnline ? '#22c55e' : '#64748b', display: 'inline-block' }}></span>
                  {drawerIsOnline ? 'Operator Sedang Aktif' : 'Operator Offline'}
                </div>
              </div>

              {/* Progress Bar (Flat, Non-circular to prevent scrollbars) */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Progres Kelengkapan</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: drawerColor }}>{drawerProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--card-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: `${drawerProgress}%`, height: '100%', background: drawerColor, borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  {submissions.filter(s => s.schoolNpsn === drawerSchool.npsn && s.status === 'approved').length} dari {totalCategories} kategori disetujui
                </p>
              </div>

              {/* Info List */}
              <div style={{ padding: '16px 20px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-graduation-cap" style={{ width: '16px', textAlign: 'center', color: 'var(--primary)' }}></i>
                  <span>Jenjang: <strong style={{ color: 'var(--text-primary)' }}>{drawerSchool.level}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-users" style={{ width: '16px', textAlign: 'center', color: 'var(--primary)' }}></i>
                  <span>Siswa: <strong style={{ color: 'var(--text-primary)' }}>{drawerSchool.studentCount}</strong> • Guru: <strong style={{ color: 'var(--text-primary)' }}>{drawerSchool.teacherCount}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-user-tie" style={{ width: '16px', textAlign: 'center', color: 'var(--primary)' }}></i>
                  <span>Kepsek: <strong style={{ color: 'var(--text-primary)' }}>{drawerSchool.principalName || '-'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-headset" style={{ width: '16px', textAlign: 'center', color: 'var(--primary)' }}></i>
                  <span>Operator: <strong style={{ color: 'var(--text-primary)' }}>{drawerSchool.operatorName || '-'}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '8px' }}>
                {waPhone && (
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '12px', padding: '10px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <i className="fa-brands fa-whatsapp"></i> WhatsApp
                  </a>
                )}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => { setDrawerSchool(null); onSchoolClick?.(drawerSchool); }}
                  style={{ flex: 1, borderRadius: '12px', padding: '10px', fontSize: '12px' }}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i> Detail
                </button>
              </div>
            </div>
          );
        })()}

        {/* Floating Map Legend Overlay */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          background: 'var(--card-glass)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '11px',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--card-border)', paddingBottom: '4px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="fa-solid fa-layer-group"></i> Keterangan Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            Lengkap (100% Disetujui)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            Progres (&gt; 0% Disetujui)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            Belum Kumpul (0%)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--card-border)', paddingTop: '6px', marginTop: '2px' }}>
            <div style={{ position: 'relative', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                position: 'absolute',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.4)',
                border: '1px solid #22c55e',
                animation: 'map-marker-ping 1.8s infinite ease-out'
              }}></span>
              <span style={{
                position: 'relative',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '1px solid #fff',
                zIndex: 2
              }}></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontWeight: '600', color: 'var(--success)' }}>Berdenyut (Sonar)</span>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Operator Sedang Aktif (Live)</span>
            </div>
          </div>
        </div>

        {/* Daftar Sekolah Binaan Gugus */}
        {activeGugus && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--card-border)', marginTop: '16px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-school-circle-check"></i>
                Sekolah Binaan {activeGugus === 'I' ? 'Gugus I (Cibadak Utara)' : activeGugus === 'II' ? 'Gugus II (Karangtengah)' : activeGugus === 'III' ? 'Gugus III (Pamuruyan)' : activeGugus === 'IV' ? 'Gugus IV (Leumbursawah)' : 'Gugus V (Swasta/Lainnya)'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--primary-glow)', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
                {schools.filter(s => s.gugus === activeGugus).length} Sekolah
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {schools.filter(s => s.gugus === activeGugus).map((school, idx) => {
                const progress = getSchoolProgress(school.npsn);
                const color = getSchoolStatusColor(school.npsn);
                return (
                  <div 
                    key={school.npsn}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--card-glass)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-glow)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--card-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => onSchoolClick?.(school)}
                  >
                    {/* Logo Sekolah */}
                    {school.logoUrl ? (
                      <img 
                        src={school.logoUrl} 
                        alt={school.name} 
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid var(--card-border)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--primary-glow), var(--accent))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--primary)'
                      }}>
                        <i className="fa-solid fa-school" style={{ fontSize: '22px', color: 'var(--primary)' }}></i>
                      </div>
                    )}
                    
                    {/* Info Sekolah */}
                    <div style={{ flex: '1', minWidth: 0 }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {school.name}
                      </h4>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span><i className="fa-solid fa-hashtag"></i> {school.npsn}</span>
                        <span><i className="fa-solid fa-layer-group"></i> {school.level}</span>
                      </p>
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                        <div style={{ flex: '1', background: 'var(--card-border)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            background: color, 
                            borderRadius: '2px' 
                          }}></div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: color, minWidth: '36px', textAlign: 'right' }}>
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
