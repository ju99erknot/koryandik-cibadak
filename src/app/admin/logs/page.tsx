'use client';

import React, { useState, useEffect } from 'react';
import { getLogs } from '@/lib/db';
import type { LogEntry } from '@/lib/db';
import CommandPalette from '@/components/CommandPalette';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { toggleThemeWithTransition } from '@/lib/theme';

export default function AdminLogs() {
  const { user, loading, logout } = useAuth('admin');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (loading || !user) return;
    getLogs().then(setLogs);
  }, [loading, user]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || log.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalLogs = logs.length;
  const adminActions = logs.filter(l => l.role === 'admin').length;
  const schoolActions = logs.filter(l => l.role === 'school').length;
  const otherActions = totalLogs - adminActions - schoolActions;

  const getLogIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('login')) return 'fa-solid fa-right-to-bracket text-blue-500';
    if (a.includes('unggah') || a.includes('upload')) return 'fa-solid fa-cloud-arrow-up text-green-500';
    if (a.includes('setuju') || a.includes('approve')) return 'fa-solid fa-check-double text-green-600';
    if (a.includes('tolak') || a.includes('reject')) return 'fa-solid fa-xmark text-red-500';
    if (a.includes('revisi')) return 'fa-solid fa-rotate-left text-orange-500';
    if (a.includes('hapus') || a.includes('delete')) return 'fa-solid fa-trash-can text-red-600';
    if (a.includes('notifikasi')) return 'fa-solid fa-bell text-yellow-500';
    return 'fa-solid fa-bolt text-gray-400';
  };

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
    <DashboardShell
      user={user}
      onLogout={logout}
      headerTitle="Log Aktivitas Sistem (Audit Trail)"
      headerSubtitle="Jejak audit dan riwayat aksi pengguna secara waktu nyata"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={(e) => toggleThemeWithTransition(e)} />}
    >
        <div className="content-area">
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: '20px' }}>
                <i className="fa-solid fa-database"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Total Log</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalLogs}</div>
              </div>
            </div>
            
            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '20px' }}>
                <i className="fa-solid fa-user-shield"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Aksi Admin</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{adminActions}</div>
              </div>
            </div>

            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '20px' }}>
                <i className="fa-solid fa-school"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Aksi Sekolah</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{schoolActions}</div>
              </div>
            </div>
            
            <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', fontSize: '20px' }}>
                <i className="fa-solid fa-users"></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>Aksi Lainnya</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{otherActions}</div>
              </div>
            </div>
          </div>

          {/* Logs Card */}
          <div className="card animate-fade-in">
            <div className="card-header flex-col md:flex-row gap-4" style={{ alignItems: 'stretch' }}>
              <h2 style={{ display: 'flex', alignItems: 'center' }}><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px', color: 'var(--primary)' }}></i> Timeline Aktivitas</h2>
              
              <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <select 
                  className="form-control" 
                  style={{ maxWidth: '180px' }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">Semua Peran</option>
                  <option value="admin">Admin</option>
                  <option value="school">Sekolah</option>
                  <option value="gugus">Gugus</option>
                  <option value="pengawas">Pengawas</option>
                </select>
                
                <div className="input-with-icon" style={{ maxWidth: '300px', flex: 1 }}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari histori..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="card-body" style={{ padding: '30px', position: 'relative' }}>
              {filteredLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-clipboard-list" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                  <p>Tidak ada log aktivitas yang ditemukan.</p>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Timeline connecting line */}
                  <div style={{ position: 'absolute', left: '23px', top: '24px', bottom: '24px', width: '2px', background: 'var(--card-border)', zIndex: 0 }}></div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 1 }}>
                    {filteredLogs.map(log => (
                      <div key={log.id} style={{ display: 'flex', gap: '20px' }}>
                        {/* Icon Node */}
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          background: 'var(--card-glass)', 
                          border: '2px solid var(--card-border)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '18px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          <i className={getLogIcon(log.action)}></i>
                        </div>
                        
                        {/* Content */}
                        <div style={{ 
                          flex: 1, 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--card-border)',
                          borderRadius: '16px',
                          padding: '16px',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '15px' }}>{log.user}</strong>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px' }}>
                                {log.role}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-regular fa-clock"></i>
                              {new Date(log.timestamp).toLocaleString('id-ID', {
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                            {log.action}
                          </div>
                          {log.details && (
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--border)' }}>
                              {log.details}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </DashboardShell>
    </>
  );
}
