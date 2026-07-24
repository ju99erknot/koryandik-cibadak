'use client';

import React, { useEffect, useRef, useState } from 'react';
import { KORYANDIK_ADDRESS, KORYANDIK_CENTER } from '@/lib/mapConstants';
import type { ProfileSettings } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

interface LandingLocationMapProps {
  schoolCount?: number;
  gugusCount?: number;
  profileSettings?: ProfileSettings | null;
  compact?: boolean;
}

export default function LandingLocationMap({
  schoolCount = 0,
  gugusCount = 5,
  profileSettings,
  compact = false,
}: LandingLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const pulseRef = useRef<any>(null);
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  // Ambil data dari profileSettings atau fallback ke konstanta
  const centerLat = profileSettings?.lat ?? KORYANDIK_CENTER.lat;
  const centerLng = profileSettings?.lng ?? KORYANDIK_CENTER.lng;
  const address = profileSettings?.address ?? KORYANDIK_ADDRESS;
  const email = profileSettings?.email ?? 'koryandik.cibadak@sukabumi.go.id';
  const phone = profileSettings?.phone ?? '-';
  const centerTuple: [number, number] = [centerLat, centerLng];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    let cancelled = false;
    let localMapInstance: any = null;

    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return;

      // Clean up previous map if exists to prevent container re-initialization error
      if (mapInstance.current) {
        try {
          mapInstance.current.off();
          mapInstance.current.remove();
        } catch (e) {
          console.warn('Error during map cleanup:', e);
        }
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, {
        center: centerTuple,
        zoom: 15,
        zoomControl: false,
        scrollWheelZoom: false,
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

      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 200);
    });

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
    <section id="lokasi-koryandik" className={`landing-map-section ${compact ? 'is-compact-section' : 'reveal-on-scroll'}`}>
      {!compact && (
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
      )}

      <div className={`landing-map-shell ${ready ? 'is-ready' : ''} ${compact ? 'is-compact' : ''}`}>
        <div className="landing-map-frame">
          <div ref={mapRef} className="landing-map-canvas" aria-label="Peta lokasi Koryandik Cibadak" />
          <div className="landing-map-grid-overlay" aria-hidden="true" />
          <div className="landing-map-coords-badge">
            <i className="fa-solid fa-crosshairs" aria-hidden="true" />
            {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
          </div>
        </div>

        {!compact && (
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
        )}
      </div>
    </section>
  );
}
