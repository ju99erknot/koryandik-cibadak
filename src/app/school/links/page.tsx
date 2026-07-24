'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell, { LoadingScreen } from '@/components/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import CommandPalette from '@/components/CommandPalette';
import { toggleThemeWithTransition } from '@/lib/theme';
import { getRelatedLinks } from '@/lib/db';
import type { RelatedLink } from '@/lib/types';
import type { School } from '@/lib/schoolsData';

export default function SchoolLinks() {
  const router = useRouter();
  const { user, loading, logout } = useAuth('school');
  usePresence(user, '/school/links');
  const school = (user?.details as School | undefined) ?? null;
  const [relatedLinks, setRelatedLinks] = useState<RelatedLink[]>([]);

  useEffect(() => {
    if (!user) return;
    getRelatedLinks().then(setRelatedLinks);
  }, [user]);

  if (loading || !user || !school) return <LoadingScreen />;

  return (
    <DashboardShell
      user={user}
      onLogout={logout}
      brandTitle={school.name}
      brandSubtitle={`NPSN: ${school.npsn}`}
      headerTitle="Tautan Terkait"
      headerSubtitle="Kumpulan tautan layanan pendidikan penting"
      headerActions={<CommandPalette currentUser={user} onThemeToggle={() => toggleThemeWithTransition()} />}
    >
      <div className="content-area">
        <div className="card animate-fade-in">
          <div className="card-body">
            {relatedLinks.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {relatedLinks.map((link, index) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target={link.target}
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '18px',
                      background: 'var(--card-glass)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '16px',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-glow)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary-glow) 0%, var(--card-glass) 100%)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--card-border)';
                      e.currentTarget.style.background = 'var(--card-glass)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--primary-glow) 0%, rgba(59, 130, 246, 0.1) 100%)',
                      border: '1px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i 
                        className={`${link.icon.includes('google') || link.icon.includes('youtube') || link.icon.includes('facebook') || link.icon.includes('instagram') || link.icon.includes('twitter') || link.icon.includes('whatsapp') ? 'fa-brands' : 'fa-solid'} ${link.icon}`} 
                        style={{ fontSize: '20px', color: 'var(--primary)' }}
                      ></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        margin: 0, 
                        color: 'var(--text-primary)', 
                        lineHeight: '1.3',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{link.title}</h3>
                      <p style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-secondary)', 
                        margin: '6px 0 0 0', 
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>{link.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <i className="fa-solid fa-link-slash" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
                <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>Belum Ada Tautan Terkait</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Tautan layanan pendidikan akan ditampilkan di sini oleh admin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
