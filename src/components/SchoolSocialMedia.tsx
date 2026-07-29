'use client';

import React from 'react';
import type { School } from '@/lib/schoolsData';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

interface SchoolSocialMediaProps {
  school: School;
  variant?: 'card' | 'list' | 'compact';
}

export default function SchoolSocialMedia({ school, variant = 'card' }: SchoolSocialMediaProps) {
  const socialLinks = [
    { key: 'website' as const, icon: 'fa-globe', label: 'Website', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { key: 'instagram' as const, icon: 'fa-instagram', label: 'Instagram', color: '#E1306C', gradient: 'linear-gradient(135deg, #E1306C, #C13584)' },
    { key: 'facebook' as const, icon: 'fa-facebook', label: 'Facebook', color: '#1877F2', gradient: 'linear-gradient(135deg, #1877F2, #0D65C9)' },
    { key: 'youtube' as const, icon: 'fa-youtube', label: 'YouTube', color: '#FF0000', gradient: 'linear-gradient(135deg, #FF0000, #CC0000)' },
    { key: 'tiktok' as const, icon: 'fa-tiktok', label: 'TikTok', color: '#000000', gradient: 'linear-gradient(135deg, #000000, #1a1a1a)' },
    { key: 'twitter' as const, icon: 'fa-twitter', label: 'Twitter/X', color: '#1DA1F2', gradient: 'linear-gradient(135deg, #1DA1F2, #0C85D0)' },
    { key: 'linkedin' as const, icon: 'fa-linkedin', label: 'LinkedIn', color: '#0A66C2', gradient: 'linear-gradient(135deg, #0A66C2, #004182)' },
    { key: 'email' as const, icon: 'fa-envelope', label: 'Email', color: '#EA4335', gradient: 'linear-gradient(135deg, #EA4335, #D33426)' },
    { key: 'whatsapp' as const, icon: 'fa-whatsapp', label: 'WhatsApp', color: '#25D366', gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
    { key: 'telegram' as const, icon: 'fa-telegram', label: 'Telegram', color: '#0088cc', gradient: 'linear-gradient(135deg, #0088cc, #006699)' },
  ];

  const availableLinks = socialLinks.filter(link => school[link.key]);

  if (availableLinks.length === 0) {
    return null;
  }

  const formatUrl = (key: string, value: string) => {
    if (!value) return '#';
    
    // Add protocol if missing
    if (key === 'website' && !value.startsWith('http')) {
      return `https://${value}`;
    }
    
    // Format social media URLs
    if (key === 'instagram' && !value.includes('instagram.com')) {
      return `https://instagram.com/${value.replace('@', '')}`;
    }
    if (key === 'facebook' && !value.includes('facebook.com')) {
      return `https://facebook.com/${value}`;
    }
    if (key === 'youtube' && !value.includes('youtube.com')) {
      return `https://youtube.com/${value}`;
    }
    if (key === 'tiktok' && !value.includes('tiktok.com')) {
      return `https://tiktok.com/@${value.replace('@', '')}`;
    }
    if (key === 'twitter' && !value.includes('twitter.com') && !value.includes('x.com')) {
      return `https://twitter.com/${value.replace('@', '')}`;
    }
    if (key === 'linkedin' && !value.includes('linkedin.com')) {
      return `https://linkedin.com/${value}`;
    }
    if (key === 'email') {
      return `mailto:${value}`;
    }
    if (key === 'whatsapp') {
      const phone = formatPhoneForWhatsApp(value);
      return `https://wa.me/${phone}`;
    }
    if (key === 'telegram') {
      const username = value.replace('@', '').replace('https://t.me/', '');
      return `https://t.me/${username}`;
    }
    
    return value;
  };

  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {availableLinks.slice(0, 5).map(link => (
          <a
            key={link.key}
            href={formatUrl(link.key, school[link.key]!)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: link.gradient,
              color: 'white',
              fontSize: '16px',
              textDecoration: 'none',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={link.label}
          >
            <i className={`fa-${link.key === 'website' || link.key === 'email' ? 'solid' : 'brands'} ${link.icon}`}></i>
          </a>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {availableLinks.map(link => (
          <a
            key={link.key}
            href={formatUrl(link.key, school[link.key]!)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${link.color}15`;
              e.currentTarget.style.borderColor = link.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <i className={`fa-${link.key === 'website' || link.key === 'email' ? 'solid' : 'brands'} ${link.icon}`} style={{ color: link.color, fontSize: '16px' }}></i>
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Social Media
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {availableLinks.map(link => (
          <a
            key={link.key}
            href={formatUrl(link.key, school[link.key]!)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: `${link.color}10`,
              border: `1px solid ${link.color}30`,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '12px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${link.color}20`;
              e.currentTarget.style.borderColor = link.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${link.color}10`;
              e.currentTarget.style.borderColor = `${link.color}30`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <i className={`fa-${link.key === 'website' || link.key === 'email' ? 'solid' : 'brands'} ${link.icon}`} style={{ color: link.color, fontSize: '14px' }}></i>
            <span style={{ fontWeight: '500' }}>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
