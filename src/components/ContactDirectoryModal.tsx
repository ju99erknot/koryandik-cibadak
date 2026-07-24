'use client';

import React, { useState, useEffect } from 'react';
import { getSchools, getSupervisors } from '@/lib/db';
import type { School } from '@/lib/schoolsData';
import type { PengawasData } from '@/lib/schoolsData';
import { getGugusColor } from '@/lib/gugusThemes';
import { SkeletonItem } from './SkeletonLoader';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

interface ContactDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDirectoryModal({ isOpen, onClose }: ContactDirectoryModalProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [supervisors, setSupervisors] = useState<PengawasData[]>([]);
  const [activeTab, setActiveTab] = useState<'schools' | 'officers'>('schools');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGugus, setFilterGugus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [s, sup] = await Promise.all([getSchools(), getSupervisors()]);
        setSchools(s);
        setSupervisors(sup);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSchools = schools.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.npsn.includes(searchTerm) ||
      (s.principalName && s.principalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.operatorName && s.operatorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGugus = filterGugus === 'all' || s.gugus === filterGugus;
    return matchSearch && matchGugus;
  });

  const filteredSupervisors = supervisors.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nip && s.nip.includes(searchTerm)) ||
      (s.title && s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = filterRole === 'all' || s.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal-full)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(var(--modal-blur))',
          transition: 'all 0.3s ease'
        }}
      />

      {/* Modal Container */}
      <div
        className="card modal-card animate-fade-in"
        style={{
          position: 'relative',
          width: '92%',
          maxWidth: '780px',
          maxHeight: '85vh',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--modal-radius)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 1
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .dir-header-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: var(--success-glow);
            color: var(--success);
            display: flex;
            align-items: center;
            justifyContent: center;
            font-size: 18px;
            border: 1px solid rgba(16, 185, 129, 0.15);
          }
          .dir-close-button {
            background: var(--card-border);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .dir-close-button:hover {
            background: rgba(0, 0, 0, 0.1);
            color: var(--text-primary);
          }
          html.dark .dir-close-button:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          .dir-toolbar {
            padding: 20px 24px;
            background: var(--bg-space-dark);
            border-bottom: 1px solid var(--card-border);
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .dir-search-input {
            width: 100%;
            padding-left: 40px !important;
            border-radius: 14px !important;
            font-size: 13px !important;
            height: 42px !important;
            background: var(--card-glass) !important;
            border: 1px solid var(--card-border) !important;
            color: var(--text-primary) !important;
            transition: all 0.2s ease !important;
          }
          .dir-search-input:focus {
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 3px var(--primary-glow) !important;
          }
          .dir-select-input {
            width: 160px;
            border-radius: 14px !important;
            height: 42px !important;
            font-size: 13px !important;
            padding: 0 16px !important;
            padding-right: 40px !important;
            background-color: var(--card-glass) !important;
            border: 1px solid var(--card-border) !important;
            color: var(--text-primary) !important;
            cursor: pointer;
            transition: all 0.2s ease !important;
          }
          @media (max-width: 576px) {
            .dir-select-input {
              width: 100%;
            }
          }
          .dir-card-item {
            background: var(--card-glass);
            border: 1px solid var(--card-border);
            border-radius: 18px;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            box-shadow: var(--shadow-sm);
          }
          .dir-card-item:hover {
            transform: translateY(-2px);
            border-color: var(--primary-glow);
            box-shadow: var(--shadow-md);
          }
          .dir-contact-box {
            background: var(--bg-space-dark);
            border: 1px solid var(--card-border);
            padding: 10px 14px;
            border-radius: 12px;
            transition: border-color 0.2s ease;
          }
          .dir-contact-box:hover {
            border-color: rgba(16, 185, 129, 0.25);
          }
          .dir-wa-badge-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: var(--success) !important;
            margin-top: 8px;
            font-weight: 700;
            background: var(--success-glow);
            padding: 5px 12px;
            border-radius: 8px;
            border: 1px solid rgba(16, 185, 129, 0.18);
            text-decoration: none;
            transition: all 0.2s ease;
          }
          .dir-wa-badge-btn:hover {
            background: rgba(16, 185, 129, 0.2);
            transform: translateY(-1px);
          }
          .dir-badge-role {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 8px;
            letter-spacing: 0.02em;
          }
          .dir-avatar-gradient {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            fontWeight: 800;
            fontSize: 16px;
            box-shadow: 0 4px 12px var(--primary-glow);
            flex-shrink: 0;
          }
        ` }} />

        {/* Header */}
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid var(--card-border)',
            background: 'var(--card-glass)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="dir-header-icon">
              <i className="fa-solid fa-address-book" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Direktori Kontak Koryandik</h3>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Hubungi operator sekolah, kepala sekolah, atau pengawas bina se-Kecamatan Cibadak
              </p>
            </div>
          </div>
          <button onClick={onClose} className="dir-close-button" aria-label="Tutup">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Toolbar & Tabs */}
        <div className="dir-toolbar">
          {/* Tab buttons */}
          <div className="static-tabs admin-tabs" style={{ maxWidth: '100%', margin: 0, padding: '4px', width: '100%' }}>
            <button
              className={`static-tab-btn ${activeTab === 'schools' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('schools');
                setSearchTerm('');
              }}
              style={{ fontSize: '12.5px', padding: '10px' }}
            >
              <i className="fa-solid fa-school fa-fw" /> Sekolah ({schools.length})
            </button>
            <button
              className={`static-tab-btn ${activeTab === 'officers' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('officers');
                setSearchTerm('');
              }}
              style={{ fontSize: '12.5px', padding: '10px' }}
            >
              <i className="fa-solid fa-user-tie fa-fw" /> Pengawas &amp; Pejabat ({supervisors.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  zIndex: 2
                }}
              />
              <input
                type="text"
                className="dir-search-input"
                placeholder={activeTab === 'schools' ? 'Cari nama sekolah, NPSN, operator...' : 'Cari pengawas, NIP, jabatan...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === 'schools' ? (
              <select
                className="dir-select-input"
                value={filterGugus}
                onChange={(e) => setFilterGugus(e.target.value)}
              >
                <option value="all">Semua Gugus</option>
                <option value="I">Gugus I</option>
                <option value="II">Gugus II</option>
                <option value="III">Gugus III</option>
                <option value="IV">Gugus IV</option>
                <option value="V">Gugus V</option>
              </select>
            ) : (
              <select
                className="dir-select-input"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">Semua Peran</option>
                <option value="pengawas">Pengawas</option>
                <option value="kkks">KKKS</option>
                <option value="pgri">PGRI</option>
                <option value="admin">Admin</option>
              </select>
            )}
          </div>
        </div>

        {/* Directory Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-space)' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--card-glass)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '18px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SkeletonItem style={{ width: '40%', height: '16px' }} />
                    <SkeletonItem style={{ width: '80px', height: '16px', borderRadius: '6px' }} />
                  </div>
                  <SkeletonItem style={{ width: '60%', height: '11px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '4px' }}>
                    <div style={{ background: 'var(--bg-space-dark)', border: '1px solid var(--card-border)', padding: '8px 12px', borderRadius: '10px' }}>
                      <SkeletonItem style={{ width: '50%', height: '10px', marginBottom: '6px' }} />
                      <SkeletonItem style={{ width: '70%', height: '14px' }} />
                    </div>
                    <div style={{ background: 'var(--bg-space-dark)', border: '1px solid var(--card-border)', padding: '8px 12px', borderRadius: '10px' }}>
                      <SkeletonItem style={{ width: '50%', height: '10px', marginBottom: '6px' }} />
                      <SkeletonItem style={{ width: '70%', height: '14px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'schools' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredSchools.map((school) => {
                const color = getGugusColor(school.gugus);
                return (
                  <div key={school.npsn} className="dir-card-item">
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{school.name}</h4>
                        <span className="badge" style={{ background: `${color}15`, color: color, border: `1px solid ${color}30`, fontSize: '10px', fontWeight: 700 }}>
                          Gugus {school.gugus}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        NPSN: <code style={{ color: 'var(--text-primary)' }}>{school.npsn}</code> • Wilayah: {school.address || 'Kecamatan Cibadak'}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '14px' }}>
                        {/* KS Contact */}
                        <div className="dir-contact-box">
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Kepala Sekolah</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{school.principalName || '—'}</div>
                          {school.ksPhone && (
                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(school.ksPhone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dir-wa-badge-btn"
                            >
                              <i className="fa-brands fa-whatsapp" /> Chat WhatsApp
                            </a>
                          )}
                        </div>

                        {/* Operator Contact */}
                        <div className="dir-contact-box">
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Operator Sekolah</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{school.operatorName || '—'}</div>
                          {school.operatorPhone && (
                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(school.operatorPhone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dir-wa-badge-btn"
                            >
                              <i className="fa-brands fa-whatsapp" /> Chat WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSchools.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-school-circle-xmark" style={{ fontSize: '36px', opacity: 0.3, marginBottom: '10px', display: 'block' }} />
                  Sekolah tidak ditemukan.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredSupervisors.map((item) => (
                <div key={item.id} className="dir-card-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid var(--card-border)' }}
                      />
                    ) : (
                      <div className="dir-avatar-gradient">
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</h4>
                        <span
                          className="dir-badge-role"
                          style={{
                            background:
                              item.role === 'admin' ? 'var(--danger-glow)' :
                              item.role === 'pengawas' ? 'var(--primary-glow)' :
                              item.role === 'kkks' ? 'var(--warning-glow)' :
                              'var(--success-glow)',
                            color:
                              item.role === 'admin' ? 'var(--danger)' :
                              item.role === 'pengawas' ? 'var(--primary)' :
                              item.role === 'kkks' ? 'var(--warning)' :
                              'var(--success)',
                            border:
                              item.role === 'admin' ? '1px solid rgba(239, 68, 68, 0.15)' :
                              item.role === 'pengawas' ? '1px solid rgba(59, 130, 246, 0.15)' :
                              item.role === 'kkks' ? '1px solid rgba(245, 158, 11, 0.15)' :
                              '1px solid rgba(16, 185, 129, 0.15)'
                          }}
                        >
                          {item.role === 'admin' ? 'Admin' : item.role === 'pengawas' ? 'Pengawas Bina' : item.role === 'kkks' ? 'KKKS' : 'PGRI'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {item.title} • Wilayah: {item.wilayah}
                      </p>
                      {item.nip && item.nip !== '-' && (
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          NIP: <code style={{ color: 'var(--text-primary)' }}>{item.nip}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.phone && (
                    <a
                      href={`https://wa.me/${formatPhoneForWhatsApp(item.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dir-wa-badge-btn"
                      style={{ marginTop: 0 }}
                    >
                      <i className="fa-brands fa-whatsapp" /> Chat WhatsApp
                    </a>
                  )}
                </div>
              ))}

              {filteredSupervisors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-user-slash" style={{ fontSize: '36px', opacity: 0.3, marginBottom: '10px', display: 'block' }} />
                  Pejabat tidak ditemukan.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
