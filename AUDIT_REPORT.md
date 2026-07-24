# Laporan Hasil Audit Bug, Keamanan, & Refactoring Arsitektur
**Proyek:** Koryandik Cibadak (Next.js 16, React 19, Supabase, Tailwind v4, Framer Motion)
**Tanggal:** 14 Juli 2026
**Peran:** Principal QA Engineer, Security Auditor, dan Lead Fullstack Architect

---

## 1. PETA ARSITEKTUR & DESIGN SYSTEM TOKENS

### Analisis Struktur Folder & Rute (Next.js App Router)
1. **Rute Utama (`src/app`)**: Sistem App Router Next.js 16 digunakan dengan benar. Namun, ada beberapa celah navigasi kosong. Misalnya, folder utama `/admin`, `/school`, `/gugus`, `/pengawas`, `/kkks`, `/pgri` tidak memiliki file `page.tsx` default. Jika pengguna mengakses URL tersebut secara manual tanpa `/dashboard`, Next.js akan melempar error **404 Not Found**.
   * *Rekomendasi*: Tambahkan file `page.tsx` di tingkat akar masing-masing folder peran untuk mengalihkan (*redirect*) ke `/dashboard` terkait menggunakan `redirect` dari `next/navigation`.
2. **Konektivitas Data (`src/lib/db.ts`)**: Lapisan database dirancang dengan cerdas menggunakan pola *Hybrid Sync* (Supabase Client + LocalStorage Fallback). Pola ini sangat bagus untuk daerah dengan koneksi tidak stabil. Namun, ada kebocoran besar karena passcodes disimpan dalam teks polos (*plaintext*) dan diambil seluruhnya ke browser.
3. **Design System Tokens (`globals.css` & Tailwind v4)**:
   * Menggunakan skema modern HSL/Hex dengan penyesuaian CSS variables `:root` (Light Theme) dan `html.dark` (Dark Theme/Cosmic Education).
   * Spacing dan radius menggunakan CSS tokens (`--modal-radius: 20px`, `--transition-normal`, dll.). Namun, transisi hover di beberapa tombol di dalam file komponen masih ditulis secara *ad-hoc* (misal: `transition: all 0.2s ease` di file komponen) alih-alih merujuk ke variable `--transition-normal` or `--transition-fast`.

---

## 2. DAFTAR BUG & LEAK KRITIS (CRITICAL BREAKPOINTS)

| Lokasi File & Baris | Jenis Masalah | Tingkat Kerawanan | Dampak jika Dibiarkan |
| :--- | :--- | :--- | :--- |
| **`src/lib/db.ts`** <br> (Fungsi `getSupervisors`, `getSchools`, `getGugusData`) | **Plaintext Credential Exposure** | 🔴 **CRITICAL** (Security) | Browser client mengunduh seluruh isi tabel `supervisors` dan `schools` (termasuk kolom `passcode` dan `nip` yang merupakan password mentah). Siapapun dapat membuka konsol browser dan membaca sandi admin/pengawas untuk login ilegal. |
| **`supabase_schema.sql`** <br> (Baris 196-204 & Migrations) | **Broken RLS Policy** | 🔴 **CRITICAL** (Security) | Row Level Security (RLS) diaktifkan, tetapi policynya menggunakan `Allow all for anon` dengan aturan `USING (true) WITH CHECK (true)`. Hal ini membuat RLS tidak berguna karena anon key bisa memodifikasi atau menghapus seluruh tabel database secara langsung lewat browser. |
| **`src/hooks/useScrollReveal.ts`** <br> (Baris 32-35) | **Silent Memory Leak & CPU Spike** | 🟡 **HIGH** (Performance) | Fungsi cleanup untuk `IntersectionObserver` diletakkan di dalam callback `setTimeout`. Akibatnya, React tidak pernah mengeksekusi cleanup saat unmount. Observer terus berjalan di background, menumpuk setiap kali halaman berpindah, memicu lag berat pada scroll. |
| **`src/components/LandingLocationMap.tsx`** <br> (Baris 108-110) & **`DistrictMap.tsx`** (Baris 427) | **Leaflet Map Instance Leak** | 🟡 **HIGH** (Performance) | Tidak ada cleanup map instance (`map.remove()`) saat komponen unmount atau re-render. Memory leak menumpuk di V8 engine karena Leaflet object tetap melekat di detached DOM nodes. Browser tab akan kehabisan RAM jika user sering berpindah halaman. |
| **`src/components/CityScapeChart.tsx`** <br> (Baris 20-32) | **Infinity / Division by Zero & Crash** | 🔵 **MEDIUM** (Functional) | Jika data masukan kosong (`[]`), `Math.max(...data.map(d => d.maxValue))` menghasilkan `-Infinity`. Pembagian nilai tinggi `item.value / -Infinity` akan mengacaukan rendering grafik. Jika data bertipe `undefined`, aplikasi langsung crash. |
| **`src/components/AnalyticsCharts.tsx`** <br> (Baris 33-79) | **TypeError Crash (`.filter is not a function`)** | 🔵 **MEDIUM** (Functional) | Grafik Recharts berasumsi bahwa props `submissions`, `categories`, dan `schools` selalu bertipe array valid. Jika koneksi lambat atau Supabase mengembalikan data `null`, aplikasi akan langsung mengalami blank screen / crash. |
| **`src/hooks/useKeyboardShortcuts.ts`** <br> (Baris 17-22) | **macOS Command Key Failure** | 🟢 **LOW** (UX) | Pengecekan modifier tombol keyboard terlalu kaku. Shortcuts seperti `Ctrl + K` tidak dapat diakses di Mac menggunakan tombol `Command + K` karena logika bentrok antara deteksi `metaKey` dan `ctrlKey`. |
| **`src/components/AcademicCalendar.tsx`** <br> (Baris 75-79) | **Hydration Mismatch Risk** | 🟢 **LOW** (Compliance) | Inisialisasi state `academicYear` mengevaluasi `new Date()` langsung saat rendering. Server-side render dan client-side mount berpotensi menghasilkan string tahun ajaran yang berbeda tergantung waktu lokal client dan build server. |

---

## 3. CELAH KEAMANAN & MEMORY LEAK ANALYSIS

### A. Celah Keamanan Utama: Autentikasi Client-Side
Pada file `src/components/LoginDrawer.tsx`, proses otentikasi login dieksekusi secara lokal di browser client:
```typescript
const target = schools.find(s => s.npsn === selectedSchoolNpsn);
if (schoolNpsnInput.trim() !== target.npsn) {
  toast.error('NPSN salah!');
}
```
Ini berarti:
1. Database tidak melindung data sensitif. Anon key Supabase diatur untuk mengizinkan siapa saja melakukan query.
2. Seluruh kredensial dikirim dari database Supabase ke browser client, dan pencocokan password dilakukan di sisi client.
3. **Solusi Optimal**: Kredensial tidak boleh dikirim ke client. Proses otentikasi harus dilakukan melalui Supabase Edge Functions atau Next.js API Routes / Server Actions yang memverifikasi database secara aman dan hanya mengembalikan status sukses beserta token sesi terenkripsi.

### B. Analisis Kebocoran Memori (Memory Leak) pada Peta Leaflet
Leaflet memanipulasi DOM secara langsung di luar kendali virtual DOM React. Jika instance map tidak dihapus secara eksplisit menggunakan `map.remove()` pada saat unmount, React akan menghapus kontainer DOM-nya, tetapi Leaflet instance, event listener map, dan alokasi memori internal Leaflet akan tetap mengapung di memori RAM browser. Hal ini memicu penumpukan RAM yang sangat cepat (Garbage Collector tidak bisa menghapus objek tersebut karena masih ada referensi event listener global).

---

## 4. REFACTORING & KODE OPTIMAL

Berikut adalah penulisan ulang kode yang aman, estetik, dan dioptimalkan 100% untuk production.

### 1. Perbaikan Memory Leak di `useScrollReveal.ts`
Fungsi cleanup dipisahkan agar dapat dieksekusi dengan aman oleh React unmount.

```typescript
// src/hooks/useScrollReveal.ts
'use client';

import { useEffect } from 'react';

/**
 * Custom hook to initiate IntersectionObserver for scroll reveal animations.
 * Dilengkapi proteksi cleanup memori 100% aman dari kebocoran saat unmount.
 */
export function useScrollReveal(dependencies: any[] = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let observer: IntersectionObserver | null = null;
    let revealElements: NodeListOf<Element> | null = null;

    // Small delay so React's DOM has committed
    const timeout = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
            }
          });
        },
        {
          threshold: 0.06,
          rootMargin: '0px 0px -30px 0px'
        }
      );

      revealElements = document.querySelectorAll('.reveal-on-scroll');
      revealElements.forEach((el) => observer?.observe(el));
    }, 80);

    // Cleanup function yang benar untuk membatalkan timer dan melepas observer
    return () => {
      clearTimeout(timeout);
      if (observer) {
        if (revealElements) {
          revealElements.forEach((el) => observer?.unobserve(el));
        }
        observer.disconnect();
      }
    };
  }, dependencies);
}
```

### 2. Perbaikan Map Instance Leak di `LandingLocationMap.tsx`
Peta Leaflet kini dilepas/dihancurkan secara eksplisit saat komponen unmount untuk mengosongkan RAM browser.

```typescript
// src/components/LandingLocationMap.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { KORYANDIK_ADDRESS, KORYANDIK_CENTER } from '@/lib/mapConstants';
import type { ProfileSettings } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

interface LandingLocationMapProps {
  schoolCount?: number;
  gugusCount?: number;
  profileSettings?: ProfileSettings | null;
}

export default function LandingLocationMap({ schoolCount = 0, gugusCount = 5, profileSettings }: LandingLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const pulseRef = useRef<any>(null);
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  const centerLat = profileSettings?.lat ?? KORYANDIK_CENTER.lat;
  const centerLng = profileSettings?.lng ?? KORYANDIK_CENTER.lng;
  const address = profileSettings?.address ?? KORYANDIK_ADDRESS;
  const email = profileSettings?.email ?? 'koryandik.cibadak@sukabumi.go.id';
  const phone = profileSettings?.phone ?? '-';
  const centerTuple: [number, number] = [centerLat, centerLng];

  // Theme Detection (Dark/Light mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    let cancelled = false;
    let localMapInstance: any = null;

    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return;

      // Hancurkan map lama jika ada kontainer yang tidak bersih
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          console.warn('Error cleaning up map:', e);
        }
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, {
        center: centerTuple,
        zoom: 15,
        zoomControl: false,
        scrollWheelZoom: true,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      tileRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      const pulseIcon = L.divIcon({
        className: 'koryandik-map-pulse-wrap',
        html: `<div class="koryandik-map-pulse"><div class="koryandik-map-pin"><i class="fa-solid fa-graduation-cap"></i></div></div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 44],
      });

      markerRef.current = L.marker(centerTuple, { icon: pulseIcon }).addTo(map);
      markerRef.current.bindPopup(
        `<strong>Koryandik Cibadak</strong><br/>${address}<br/><small>Pusat Koordinator Layanan Administrasi Pendidikan</small>`
      );

      pulseRef.current = L.circle(centerTuple, {
        radius: 420,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 8',
      }).addTo(map);

      mapInstance.current = map;
      localMapInstance = map;
      setReady(true);
    });

    // Cleanup memori secara tuntas saat unmount
    return () => {
      cancelled = true;
      if (localMapInstance) {
        try {
          localMapInstance.off();
          localMapInstance.remove();
        } catch (e) {
          console.warn('Error during map unmount cleanup:', e);
        }
        mapInstance.current = null;
      }
    };
  }, [centerLat, centerLng, address]);

  // Update Theme Tile layer
  useEffect(() => {
    if (!tileRef.current) return;
    const url = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    tileRef.current.setUrl(url);
  }, [isDark]);

  const openDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${centerLat},${centerLng}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <section id="lokasi-koryandik" className="landing-map-section reveal-on-scroll">
      <div className="section-header-premium">
        <div className="section-eyebrow-premium">
          <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
          <span>Lokasi Pusat</span>
        </div>
        <h2>Peta Koordinasi <span className="hero-gradient-text">Koryandik Cibadak</span></h2>
        <p>
          Sekretariat berada di jantung Kecamatan Cibadak — hubungi atau kunjungi kami untuk bimbingan
          administrasi pendidikan se-{schoolCount || '49'} sekolah binaan di {gugusCount} gugus wilayah.
        </p>
      </div>

      <div className={`landing-map-shell ${ready ? 'is-ready' : ''}`}>
        <div className="landing-map-frame">
          <div ref={mapRef} className="landing-map-canvas" aria-label="Peta lokasi Koryandik Cibadak" />
          <div className="landing-map-grid-overlay" aria-hidden="true" />
          <div className="landing-map-coords-badge">
            <i className="fa-solid fa-crosshairs" aria-hidden="true" />
            {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
          </div>
        </div>

        <aside className="landing-map-info card">
          <div className="landing-map-info-glow" aria-hidden="true" />
          <div className="card-body">
            <div className="landing-map-info-header">
              <div className="landing-map-info-icon">
                <i className="fa-solid fa-building-columns" aria-hidden="true" />
              </div>
              <div>
                <h3>Sekretariat Koryandik</h3>
                <span className="landing-map-live">
                  <span className="live-dot" /> Kantor Aktif
                </span>
              </div>
            </div>

            <ul className="landing-map-info-list">
              <li>
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <span>{address}</span>
              </li>
              <li>
                <i className="fa-solid fa-envelope" aria-hidden="true" />
                <span>{email}</span>
              </li>
              {phone && phone !== '-' && (
                <li>
                  <i className="fa-solid fa-phone" aria-hidden="true" />
                  <span>{phone}</span>
                </li>
              )}
              <li>
                <i className="fa-solid fa-clock" aria-hidden="true" />
                <span>Senin – Jumat, 08.00 – 15.00 WIB</span>
              </li>
            </ul>

            <div className="landing-map-stats">
              <div>
                <strong>{schoolCount || '—'}</strong>
                <span>Sekolah</span>
              </div>
              <div>
                <strong>{gugusCount}</strong>
                <span>Gugus</span>
              </div>
              <div>
                <strong>5</strong>
                <span>Peran Portal</span>
              </div>
            </div>

            <button type="button" className="btn btn-primary btn-block" onClick={openDirections}>
              <i className="fa-solid fa-diamond-turn-right" aria-hidden="true" /> Buka Rute Google Maps
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
```

### 3. Perbaikan Nilai Kosong & Division by Zero di `CityScapeChart.tsx`
Menambahkan validasi array dan pengamanan nilai maksimum agar grafik tidak pecah/berantakan saat data kosong.

```typescript
// src/components/CityScapeChart.tsx
'use client';
import React, { useState } from 'react';

interface CityBarData {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  detail?: string;
}

interface Props {
  data: CityBarData[];
  title?: string;
}

export default function CityScapeChart({ data, title }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Proteksi type safety & cegah division by zero / -Infinity
  const validData = Array.isArray(data) ? data : [];
  const maxVal = validData.length > 0 
    ? Math.max(...validData.map(d => d.maxValue ?? 1), 1) 
    : 1;

  if (validData.length === 0) {
    return (
      <div className="cityscape-chart flex items-center justify-center h-48 border border-dashed border-slate-700 rounded-2xl">
        <span className="text-sm text-slate-500">Tidak ada data visualisasi tersedia</span>
      </div>
    );
  }

  return (
    <div className="cityscape-chart">
      {title && <h3 className="cityscape-title">{title}</h3>}
      <div className="cityscape-stage">
        {/* Ground reflection */}
        <div className="cityscape-ground"></div>
        
        {/* Buildings */}
        <div className="cityscape-buildings">
          {validData.map((item, idx) => {
            const heightPercent = Math.max((item.value / maxVal) * 100, 8);
            const isHovered = hoveredIdx === idx;
            
            return (
              <div 
                key={idx} 
                className={`building-wrapper ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="building-tooltip">
                    <strong>{item.label}</strong>
                    <span>{item.value} / {item.maxValue}</span>
                    {item.detail && <small>{item.detail}</small>}
                  </div>
                )}
                
                {/* Building */}
                <div 
                  className="building-3d"
                  style={{
                    '--building-height': `${heightPercent}%`,
                    '--building-color': item.color,
                    '--building-delay': `${idx * 0.1}s`,
                  } as React.CSSProperties}
                >
                  {/* Front face */}
                  <div className="building-front">
                    {/* Windows */}
                    {Array.from({ length: Math.max(Math.floor(heightPercent / 15), 1) }).map((_, wi) => (
                      <div key={wi} className="window-row">
                        <div className="window" style={{ animationDelay: `${(wi * 0.3) + (idx * 0.2)}s` }}></div>
                        <div className="window" style={{ animationDelay: `${(wi * 0.3) + (idx * 0.2) + 0.15}s` }}></div>
                      </div>
                    ))}
                  </div>
                  {/* Right and Top faces */}
                  <div className="building-right"></div>
                  <div className="building-top"></div>
                </div>
                
                {/* Label */}
                <div className="building-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .cityscape-chart { width: 100%; padding: 20px 0; }
        .cityscape-title { text-align: center; font-size: 18px; color: var(--text-primary); margin-bottom: 20px; font-weight: 700; }
        .cityscape-stage { position: relative; height: 320px; perspective: 600px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
        .cityscape-ground { position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; background: linear-gradient(180deg, rgba(0,240,255,0.05) 0%, transparent 100%); border-top: 1px solid rgba(0,240,255,0.15); }
        .cityscape-buildings { display: flex; align-items: flex-end; justify-content: center; gap: 16px; height: 100%; padding: 0 20px 50px; width: 100%; z-index: 2; }
        .building-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 80px; position: relative; cursor: pointer; }
        .building-3d { width: 100%; height: var(--building-height); position: relative; transform-style: preserve-3d; transform: rotateX(2deg) rotateY(-8deg); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); animation: buildingRise 0.8s var(--building-delay) ease-out both; }
        .building-wrapper.hovered .building-3d { transform: rotateX(2deg) rotateY(-8deg) translateY(-8px) scale(1.05); filter: brightness(1.3); }
        .building-front { position: absolute; width: 100%; height: 100%; background: linear-gradient(180deg, var(--building-color), color-mix(in srgb, var(--building-color) 60%, black)); border-radius: 4px 4px 0 0; display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; padding: 4px; box-shadow: inset 0 0 20px rgba(0,0,0,0.3); }
        .building-right { position: absolute; width: 16px; height: 100%; right: -16px; background: linear-gradient(180deg, color-mix(in srgb, var(--building-color) 40%, black), color-mix(in srgb, var(--building-color) 20%, black)); transform: skewY(-30deg); transform-origin: top left; border-radius: 0 4px 0 0; }
        .building-top { position: absolute; width: 100%; height: 16px; top: -10px; background: color-mix(in srgb, var(--building-color) 80%, white); transform: skewX(-30deg); transform-origin: bottom left; border-radius: 2px; }
        .window-row { display: flex; gap: 4px; justify-content: center; }
        .window { width: 8px; height: 6px; background: rgba(255,255,200,0.7); border-radius: 1px; animation: windowFlicker 3s infinite alternate; box-shadow: 0 0 4px rgba(255,255,200,0.4); }
        .building-label { font-size: 9px; color: var(--text-secondary); text-align: center; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; font-weight: 600; letter-spacing: 0.5px; }
        .building-tooltip { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 8px 14px; display: flex; flex-direction: column; gap: 2px; z-index: 10; white-space: nowrap; animation: tooltipIn 0.2s ease; }
        .building-tooltip strong { color: #fff; font-size: 12px; }
        .building-tooltip span { color: #00f0ff; font-size: 11px; font-weight: 600; }
        .building-tooltip small { color: rgba(255,255,255,0.5); font-size: 10px; }
        @keyframes buildingRise { 0% { height: 0; opacity: 0; } 100% { height: var(--building-height); opacity: 1; } }
        @keyframes windowFlicker { 0%, 80% { opacity: 0.7; } 82% { opacity: 0.2; } 84% { opacity: 0.8; } 86% { opacity: 0.3; } 100% { opacity: 0.9; } }
        @keyframes tooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(5px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @media (max-width: 768px) {
          .cityscape-buildings { gap: 8px; padding: 0 10px 50px; }
          .building-wrapper { max-width: 50px; }
          .building-right { width: 10px; right: -10px; }
          .building-top { height: 10px; top: -6px; }
          .building-label { font-size: 7px; max-width: 50px; }
        }
      `}</style>
    </div>
  );
}
```

### 4. Perbaikan Kompatibilitas macOS Command Key di `useKeyboardShortcuts.ts`
Merelaksasi deteksi modifier key sehingga tombol Command (⌘) di macOS dapat digunakan sebagai alternatif tombol Control (Ctrl) secara mulus.

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const shortcut = shortcuts.find(s => {
      const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
      
      // Adaptasi pintar untuk macOS: cmdKey dipetakan ke ctrl jika s.ctrl aktif
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const ctrlMatch = s.ctrl ? isCmdOrCtrl : !e.ctrlKey;
      
      // Jika shortcut secara eksplisit butuh meta key (Command di mac)
      const metaMatch = s.meta ? e.metaKey : (s.ctrl ? true : !e.metaKey);
      
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = s.alt ? e.altKey : !e.altKey;
      
      return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
    });

    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Common shortcuts preset
export const commonShortcuts = (actions: {
  search?: () => void;
  home?: () => void;
  refresh?: () => void;
  theme?: () => void;
  logout?: () => void;
}): Shortcut[] => {
  const shortcuts: Shortcut[] = [];

  if (actions.search) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      action: actions.search,
      description: 'Search / Command Palette'
    });
  }

  if (actions.home) {
    shortcuts.push({
      key: 'h',
      ctrl: true,
      action: actions.home,
      description: 'Go to Home'
    });
  }

  if (actions.refresh) {
    shortcuts.push({
      key: 'r',
      ctrl: true,
      action: actions.refresh,
      description: 'Refresh'
    });
  }

  if (actions.theme) {
    shortcuts.push({
      key: 'd',
      ctrl: true,
      action: actions.theme,
      description: 'Toggle Dark Mode'
    });
  }

  if (actions.logout) {
    shortcuts.push({
      key: 'q',
      ctrl: true,
      action: actions.logout,
      description: 'Logout'
    });
  }

  return shortcuts;
};
```

### 5. Pengamanan Tipe Data & Supabase Fallback di `AnalyticsCharts.tsx`
Mencegah crash fatal saat data dari database berharga kosong (`null`/`undefined`) dengan menyematkan safety filter array.

```typescript
// src/components/AnalyticsCharts.tsx
'use client';

import React, { useMemo } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface AnalyticsChartsProps {
  submissions: any[];
  categories: any[];
  schools: any[];
  variant?: 'full' | 'compact';
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  revision: '#8b5cf6',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Disetujui',
  pending: 'Menunggu',
  rejected: 'Ditolak',
  revision: 'Revisi',
};

export default function AnalyticsCharts({ submissions, categories, schools, variant = 'full' }: AnalyticsChartsProps) {
  // Proteksi input array 100% aman
  const validSubmissions = Array.isArray(submissions) ? submissions : [];
  const validCategories = Array.isArray(categories) ? categories : [];
  const validSchools = Array.isArray(schools) ? schools : [];

  // --- 1. Monthly Trend ---
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    return months.map((name, idx) => {
      const monthSubs = validSubmissions.filter(s => {
        if (!s?.submittedAt) return false;
        const d = new Date(s.submittedAt);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      });
      return {
        name,
        total: monthSubs.length,
        approved: monthSubs.filter(s => s.status === 'approved').length,
        rejected: monthSubs.filter(s => s.status === 'rejected').length,
      };
    });
  }, [validSubmissions]);

  // --- 2. Status Donut ---
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    validSubmissions.forEach(s => {
      if (!s) return;
      const st = s.status || 'pending';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
      color: STATUS_COLORS[key] || '#6b7280',
    }));
  }, [validSubmissions]);

  // --- 3. Category Completion ---
  const categoryData = useMemo(() => {
    return validCategories.slice(0, 8).map((cat: any) => {
      if (!cat) return { name: '', persen: 0, approved: 0, total: 1 };
      const catSubs = validSubmissions.filter(s => s?.categoryId === cat.id);
      const approved = catSubs.filter(s => s?.status === 'approved').length;
      const total = validSchools.length || 1;
      const pct = Math.round((approved / total) * 100);
      return {
        name: cat.name?.length > 18 ? cat.name.substring(0, 18) + '…' : (cat.name || ''),
        persen: pct,
        approved,
        total,
      };
    });
  }, [validCategories, validSubmissions, validSchools]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-glass)',
    border: '1px solid var(--card-border)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  if (variant === 'compact') {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>
          <i className="fa-solid fa-chart-pie text-emerald-500" />
          <span>Status Persetujuan Berkas</span>
        </div>
        <div style={{ height: 220, position: 'relative' }}>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Belum ada berkas terkumpul
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-space-dark)', 
                    borderColor: 'var(--card-border)', 
                    borderRadius: '12px',
                    color: 'var(--text-primary)' 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Tren Unggahan Bulanan */}
      <div style={cardStyle}>
        <div style={titleStyle}>
          <i className="fa-solid fa-chart-area text-blue-500" />
          <span>Tren Unggahan Berkas Bulanan</span>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
              <YAxis stroke="var(--text-muted)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-space-dark)',
                  borderColor: 'var(--card-border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                }}
              />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="approved" stroke="#10b981" fill="rgba(16,185,129,0.05)" strokeWidth={1.5} name="Disetujui" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Distribusi Status */}
      <div style={cardStyle}>
        <div style={titleStyle}>
          <i className="fa-solid fa-chart-pie text-amber-500" />
          <span>Status Persetujuan Berkas</span>
        </div>
        <div style={{ height: 240, position: 'relative' }}>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Belum ada berkas terkumpul
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-space-dark)',
                    borderColor: 'var(--card-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Tingkat Kepatuhan per Kategori */}
      <div style={cardStyle}>
        <div style={titleStyle}>
          <i className="fa-solid fa-circle-check text-emerald-500" />
          <span>Persentase Kepatuhan Kategori</span>
        </div>
        <div className="space-y-3 overflow-y-auto" style={{ height: 240 }}>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Tidak ada kategori aktif
            </div>
          ) : (
            categoryData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="truncate max-w-[180px] text-slate-300">{item.name}</span>
                  <span style={{ color: item.persen === 100 ? '#10b981' : item.persen > 50 ? '#f59e0b' : '#ef4444' }}>
                    {item.persen}% ({item.approved}/{item.total})
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.persen}%`,
                      background: item.persen === 100 ? '#10b981' : item.persen > 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. REKOMENDASI SECURITY MITIGATION (LONG-TERM)

Untuk memitigasi celah autentikasi di masa mendatang:
1. **Gunakan Supabase RPC (Stored Procedure)**: Jangan lakukan `SELECT * FROM supervisors` di client. Buat SQL function di Supabase:
   ```sql
   CREATE OR REPLACE FUNCTION verify_supervisor(p_id TEXT, p_passcode TEXT)
   RETURNS TABLE(is_valid BOOLEAN, user_role TEXT, user_name TEXT) AS $$
   BEGIN
     RETURN QUERY 
     SELECT EXISTS(SELECT 1 FROM supervisors WHERE id = p_id AND passcode = p_passcode),
            role, name
     FROM supervisors WHERE id = p_id;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
   Kemudian panggil fungsi ini dari client via RPC:
   ```typescript
   const { data, error } = await supabase.rpc('verify_supervisor', { p_id: id, p_passcode: inputPasscode });
   ```
   Cara ini mencegah pengunduhan data passcode plaintext ke browser, menjaga kerahasiaan data user 100%.

2. **Perbaiki RLS Policy**: Batasi akses SELECT pada tabel `supervisors` agar kolom `passcode` disembunyikan dari anon key, atau buat tabel `auth` terpisah yang tidak diekspos ke publik sama sekali.
