'use client';

import React, { useState, useEffect } from 'react';
import { getGugusData, updateGugus, getSchools, updateSchool, addLog } from '@/lib/db';
import type { School, GugusData } from '@/lib/schoolsData';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';
import FancySelect from '@/components/FancySelect';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { toast } from 'sonner';
import { getGugusColor } from '@/lib/gugusThemes';

export default function AdminGugus() {
  const { user, loading, logout } = useAuth('admin');
  const [guguses, setGuguses] = useState<GugusData[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [expandedGugus, setExpandedGugus] = useState<string | null>(null);

  // Modal: ubah sekolah koordinator
  const [koordinatorModal, setKoordinatorModal] = useState<GugusData | null>(null);
  const [selectedKoordinator, setSelectedKoordinator] = useState('');
  const [gugusName, setGugusName] = useState('');
  const [gugusPasscode, setGugusPasscode] = useState('');

  // Modal: pindah sekolah antar gugus
  const [moveModal, setMoveModal] = useState<School | null>(null);
  const [targetGugus, setTargetGugus] = useState('');

  const loadData = async () => {
    const [g, s] = await Promise.all([getGugusData(), getSchools()]);
    setGuguses(g);
    setSchools(s);
  };

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    setTimeout(() => {
      if (active) loadData();
    }, 0);
    return () => {
      active = false;
    };
  }, [loading, user]);

  const getSchoolsForGugus = (gugusId: string) => {
    return schools.filter(s => s.gugus === gugusId);
  };

  const getIntiSchool = (gugus: GugusData) => {
    return schools.find(s => s.npsn === gugus.sekolahInti);
  };

  // ---- Ubah Sekolah Koordinator ----
  const openKoordinatorModal = (gugus: GugusData) => {
    setKoordinatorModal(gugus);
    setSelectedKoordinator(gugus.sekolahInti);
    setGugusName(gugus.name);
    setGugusPasscode(gugus.passcode || '');
  };

  const handleSaveKoordinator = async () => {
    if (!koordinatorModal || !selectedKoordinator || !gugusName || !gugusPasscode) {
      toast.error('Mohon lengkapi semua kolom wajib.');
      return;
    }
    const school = schools.find(s => s.npsn === selectedKoordinator);
    await updateGugus(koordinatorModal.id, {
      name: gugusName,
      sekolahInti: selectedKoordinator,
      koordinator: school?.operatorName ?? koordinatorModal.koordinator ?? '',
      passcode: gugusPasscode
    });
    await addLog({
      user: 'Admin',
      role: 'admin',
      action: 'Ubah Data Gugus',
      details: `Gugus ${koordinatorModal.id} → Nama: ${gugusName}, Sekolah Koordinator: ${school?.name || selectedKoordinator}`
    });
    toast.success(`Data Gugus ${gugusName} berhasil diperbarui!`);
    setKoordinatorModal(null);
    loadData();
  };

  // ---- Pindah Sekolah Antar Gugus ----
  const openMoveModal = (school: School) => {
    setMoveModal(school);
    setTargetGugus(school.gugus);
  };

  const handleMoveSchool = async () => {
    if (!moveModal || !targetGugus || targetGugus === moveModal.gugus) {
      toast.error('Pilih gugus tujuan yang berbeda.');
      return;
    }
    await updateSchool(moveModal.npsn, { gugus: targetGugus });
    await addLog({
      user: 'Admin',
      role: 'admin',
      action: 'Pindah Sekolah Antar Gugus',
      details: `${moveModal.name} dipindah dari Gugus ${moveModal.gugus} → Gugus ${targetGugus}`
    });
    toast.success(`${moveModal.name} berhasil dipindahkan ke Gugus ${targetGugus}!`);
    setMoveModal(null);
    loadData();
  };

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Kelola Wilayah Gugus"
      headerSubtitle="Atur sekolah koordinator dan anggota setiap gugus"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: '20px' }}>
                <i className="fa-solid fa-sitemap"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Total Gugus</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{guguses.length}</div>
              </div>
            </div>
            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '20px' }}>
                <i className="fa-solid fa-school"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Total Sekolah</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{schools.length}</div>
              </div>
            </div>
            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '20px' }}>
                <i className="fa-solid fa-star"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Sekolah Koordinator</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{guguses.filter(g => schools.some(s => s.npsn === g.sekolahInti)).length}</div>
              </div>
            </div>
          </div>

          {/* Gugus Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {guguses.map(g => {
              const memberSchools = getSchoolsForGugus(g.id);
              const intiSchool = getIntiSchool(g);
              const isExpanded = expandedGugus === g.id;
              
              const color = getGugusColor(g.id);

              return (
                <div className="card animate-fade-in" key={g.id} style={{ overflow: 'hidden' }}>
                  {/* Gugus Header */}
                  <div
                    className="card-header"
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpandedGugus(isExpanded ? null : g.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: `${color}15`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: color, fontWeight: 'bold', fontSize: '16px'
                      }}>
                        {g.id}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{g.name}</h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: '4px' }}></i>
                          Koordinator: <strong>{intiSchool?.name || '—'}</strong>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <i className="fa-solid fa-school" style={{ marginRight: '4px' }}></i>
                          {memberSchools.length} sekolah
                          <span style={{ margin: '0 8px' }}>•</span>
                          <i className="fa-solid fa-key" style={{ marginRight: '4px' }}></i>
                          Passcode: <code>{g.passcode}</code>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '6px 14px', background: color, borderColor: color }}
                        onClick={(e) => { e.stopPropagation(); openKoordinatorModal(g); }}
                      >
                        <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Gugus
                      </button>
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '14px' }}></i>
                    </div>
                  </div>

                  {/* Expanded: List Sekolah Anggota */}
                  {isExpanded && (
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ width: '50px' }}>No</th>
                              <th>Nama Sekolah</th>
                              <th>NPSN</th>
                              <th>Kepala Sekolah</th>
                              <th>Operator</th>
                              <th>Status</th>
                              <th style={{ width: '120px' }}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberSchools.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                  <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
                                  Belum ada sekolah di gugus ini.
                                </td>
                              </tr>
                            ) : (
                              memberSchools.map((s, idx) => (
                                <tr key={s.npsn}>
                                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {s.npsn === g.sekolahInti && (
                                        <i className="fa-solid fa-crown" style={{ color: '#f59e0b', fontSize: '14px' }} title="Sekolah Koordinator"></i>
                                      )}
                                      <strong>{s.name}</strong>
                                    </div>
                                  </td>
                                  <td><code>{s.npsn}</code></td>
                                  <td>
                                    <div>{s.principalName || '—'}</div>
                                    {s.ksPhone && (
                                      <a
                                        href={`https://wa.me/${formatPhoneForWhatsApp(s.ksPhone)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 600 }}
                                      >
                                        <i className="fa-brands fa-whatsapp" /> {s.ksPhone}
                                      </a>
                                    )}
                                  </td>
                                  <td>
                                    <div>{s.operatorName || '—'}</div>
                                    {s.operatorPhone && (
                                      <a
                                        href={`https://wa.me/${formatPhoneForWhatsApp(s.operatorPhone)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 600 }}
                                      >
                                        <i className="fa-brands fa-whatsapp" /> {s.operatorPhone}
                                      </a>
                                    )}
                                  </td>
                                  <td>
                                    {s.npsn === g.sekolahInti ? (
                                      <span className="badge badge-approved" style={{ fontSize: '10px' }}>
                                        <i className="fa-solid fa-crown" style={{ marginRight: '4px' }}></i> Koordinator
                                      </span>
                                    ) : (
                                      <span className="badge badge-pending" style={{ fontSize: '10px' }}>Anggota</span>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-outline btn-xs"
                                      onClick={() => openMoveModal(s)}
                                      title="Pindahkan ke gugus lain"
                                    >
                                      <i className="fa-solid fa-arrows-turn-right"></i> Pindah
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
    </DashboardShell>

      {/* Modal: Ubah Sekolah Koordinator */}
      {koordinatorModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setKoordinatorModal(null)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 'var(--z-modal)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <div 
            className="card modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '520px', width: '90%' }}
          >
            <div className="card-header">
              <h3><i className="fa-solid fa-pen-to-square" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>Edit Data Gugus</h3>
              <button className="modal-close-btn" onClick={() => setKoordinatorModal(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div className="form-group">
                <label className="form-label" htmlFor="edit-gugus-name">Nama Gugus *</label>
                <input
                  id="edit-gugus-name"
                  className="form-input"
                  value={gugusName}
                  onChange={(e) => setGugusName(e.target.value)}
                  placeholder="Nama Gugus"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-gugus-passcode">Kode Akses (Passcode) *</label>
                <input
                  id="edit-gugus-passcode"
                  className="form-input"
                  value={gugusPasscode}
                  onChange={(e) => setGugusPasscode(e.target.value)}
                  placeholder="Passcode login koordinator"
                  required
                />
              </div>

              <FancySelect
                label="Sekolah Koordinator"
                icon="fa-solid fa-crown"
                searchable
                required
                value={selectedKoordinator}
                onChange={setSelectedKoordinator}
                placeholder="— Pilih Sekolah —"
                options={[
                  { value: '', label: '— Pilih Sekolah —' },
                  ...getSchoolsForGugus(koordinatorModal.id).map((s) => ({
                    value: s.npsn,
                    label: s.name,
                    hint: s.npsn === koordinatorModal.sekolahInti ? '★ Saat ini' : s.npsn,
                  })),
                ]}
              />

              {selectedKoordinator && (() => {
                const s = schools.find(sc => sc.npsn === selectedKoordinator);
                if (!s) return null;
                return (
                  <div style={{ 
                    background: 'rgba(245, 158, 11, 0.08)', 
                    border: '1px solid rgba(245, 158, 11, 0.25)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-crown" style={{ color: '#f59e0b', fontSize: '16px' }}></i>
                      <strong style={{ fontSize: '14px' }}>{s.name}</strong>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '80px', color: 'var(--text-muted)' }}>NPSN:</span>
                        <code>{s.npsn}</code>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '80px', color: 'var(--text-muted)' }}>Kepsek:</span>
                        <span>{s.principalName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '80px', color: 'var(--text-muted)' }}>Operator:</span>
                        <span>{s.operatorName}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ 
                    padding: '10px 20px',
                    minWidth: '80px'
                  }} 
                  onClick={() => setKoordinatorModal(null)}
                >
                  Batal
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveKoordinator} 
                  disabled={!selectedKoordinator || !gugusName || !gugusPasscode}
                  style={{ padding: '10px 20px', minWidth: '80px' }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pindah Sekolah Antar Gugus */}
      {moveModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setMoveModal(null)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 'var(--z-modal)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <div 
            className="card modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '460px', width: '90%' }}
          >
            <div className="card-header">
              <h3><i className="fa-solid fa-arrows-turn-right" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>Pindah Sekolah</h3>
              <button className="modal-close-btn" onClick={() => setMoveModal(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="card-body" style={{ padding: '24px' }}>
              <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <strong>{moveModal.name}</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  NPSN: <code>{moveModal.npsn}</code> • Gugus saat ini: <strong>{moveModal.gugus}</strong>
                </div>
              </div>

              <FancySelect
                label="Pindahkan ke Gugus"
                icon="fa-solid fa-sitemap"
                value={targetGugus}
                onChange={setTargetGugus}
                options={guguses
                  .filter((g) => g.id !== moveModal.gugus)
                  .map((g) => ({
                    value: g.id,
                    label: g.name,
                    hint: `${getSchoolsForGugus(g.id).length} sekolah`,
                  }))}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setMoveModal(null)}>Batal</button>
                <button className="btn btn-primary" onClick={handleMoveSchool} disabled={targetGugus === moveModal.gugus}>
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i> Pindahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
