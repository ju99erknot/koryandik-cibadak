'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AcademicCalendar from '@/components/AcademicCalendar';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import { getSupervisors, getSchools } from '@/lib/db';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

interface Supervisor {
  id: string;
  name: string;
  nip: string;
  role: 'pengawas' | 'kkks' | 'pgri' | 'admin';
  title: string;
  wilayah: string;
  photoUrl?: string;
  phone?: string;
}

export default function KalenderPage() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [schoolCount, setSchoolCount] = useState(0);

  // Call scroll reveal hook
  useScrollReveal([supervisors]);

  useEffect(() => {
    getSupervisors().then((data) => {
      // Cast the db result to local Supervisor structure safely
      setSupervisors(data as unknown as Supervisor[]);
    });
    getSchools().then((schools) => setSchoolCount(schools.length));
  }, []);

  const getOfficialRoleMeta = (role: string) => {
    const map: Record<string, { color: string; icon: string; label: string }> = {
      admin: { color: '#8b5cf6', icon: 'fa-user-shield', label: 'Administrator' },
      pengawas: { color: '#3b82f6', icon: 'fa-user-tie', label: 'Pengawas Bina' },
      kkks: { color: '#f59e0b', icon: 'fa-users-gear', label: 'Ketua KKKS' },
      pgri: { color: '#10b981', icon: 'fa-id-card', label: 'Ketua PGRI' },
    };
    return map[role] || { color: 'var(--primary)', icon: 'fa-user', label: 'Petugas' };
  };

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        /* Extra styles for Pejabat Section on Kalender page */
        .kalender-officials-section {
          margin-top: 56px;
          padding-top: 48px;
          border-top: 1px dashed var(--card-border);
        }
        .kalender-officials-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .kalender-officials-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .kalender-officials-header p {
          font-size: 13.5px;
          color: var(--text-secondary);
          max-width: 580px;
          margin: 0 auto;
        }
        .kalender-officials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .kalender-official-card {
          position: relative;
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .kalender-official-card:hover {
          transform: translateY(-4px);
          border-color: var(--role-color);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .kalender-official-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-space-dark);
          border: 2px solid var(--role-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: var(--role-color);
          flex-shrink: 0;
          overflow: hidden;
        }
        .kalender-official-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .kalender-official-info {
          flex: 1;
          min-width: 0;
        }
        .kalender-official-role {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--role-color);
          margin-bottom: 2px;
          display: inline-block;
        }
        .kalender-official-name {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kalender-official-title {
          font-size: 11px;
          color: var(--text-secondary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kalender-official-meta {
          display: flex;
          gap: 8px;
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .kalender-official-wa {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(16,185,129,0.1);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          transition: all 0.2s;
          flex-shrink: 0;
          border: 1px solid rgba(16,185,129,0.2);
        }
        .kalender-official-wa:hover {
          background: #10b981;
          color: #fff;
          transform: scale(1.1);
        }
      ` }} />

      {/* Dynamic Background Mesh */}
      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', top: '-150px', left: '-150px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', top: '40%', right: '-80px', animationDelay: '2s' }} />
      </div>

      <LandingNav
        activePage="kalender"
        onOpenLogin={() => router.push('/?login=1')}
      />

      <main className="static-page-main">
        {/* Unified Hero Section */}
        <section className="pub-hero animate-fade-in">
          <div className="pub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-calendar-days" />
            Kalender &amp; Agenda Akademik
          </div>
          <h1 className="pub-hero-title">Jadwal &amp; Agenda Resmi</h1>
          <p className="pub-hero-subtitle">
            Agenda resmi, rapat koordinasi, tenggat pengumpulan berkas wajib, dan hari libur nasional di lingkungan Koordinator Wilayah Pelayanan Pendidikan Kecamatan Cibadak.
          </p>

          {/* Stats strip */}
          <div className="pub-hero-stats">
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">
                {(() => {
                  const d = new Date();
                  const y = d.getFullYear();
                  return d.getMonth() >= 6 ? `${y}/${String(y + 1).slice(-2)}` : `${y - 1}/${String(y).slice(-2)}`;
                })()}
              </div>
              <div className="pub-hero-stat-label">Tahun Pelajaran</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{schoolCount}</div>
              <div className="pub-hero-stat-label">Sekolah Binaan</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{supervisors.length || '—'}</div>
              <div className="pub-hero-stat-label">Koordinator</div>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Main Academic Calendar */}
          <AcademicCalendar />

          {/* Tim Pengawas & Pejabat Terkait Section */}
          {supervisors.length > 0 && (
            <div className="kalender-officials-section animate-fade-in">
              <div className="kalender-officials-header">
                <h2>
                  <i className="fa-solid fa-user-tie" style={{ marginRight: '8px', color: 'var(--primary)' }} />
                  Pejabat &amp; Koordinator Terkait
                </h2>
                <p>
                  Hubungi kontak pejabat binaan, pengawas sekolah, atau pengurus organisasi pelaksana untuk koordinasi agenda di atas.
                </p>
              </div>

              <div className="officials-grid">
                {supervisors.map((sup, idx) => {
                  const meta = getOfficialRoleMeta(sup.role);
                  return (
                    <article
                      key={sup.id}
                      className="staff-card reveal-on-scroll"
                      style={{
                        ['--role-color' as string]: meta.color,
                        ['--reveal-delay' as string]: `${idx * 100}ms`
                      }}
                    >
                      {/* Colored top banner */}
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
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
