'use client';

import React from 'react';

interface SkeletonCardProps {
  className?: string;
  /** Number of text lines to show below the header block */
  lines?: number;
  /** Show a circular avatar placeholder at the top */
  avatar?: boolean;
}

export default function SkeletonCard({ className = '', lines = 2, avatar = false }: SkeletonCardProps) {
  return (
    <div className={`skeleton-card ${className}`} style={{
      background: 'var(--card-glass)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--card-border)',
      borderRadius: '16px',
      padding: '20px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sk-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .sk-bone {
          position: relative;
          overflow: hidden;
          background: color-mix(in srgb, var(--text-muted) 18%, transparent);
          border-radius: 8px;
        }
        .sk-bone::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, var(--text-primary) 6%, transparent) 50%,
            transparent 100%
          );
          animation: sk-shimmer 1.6s ease-in-out infinite;
        }
      `}} />

      {avatar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="sk-bone" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="sk-bone" style={{ width: '55%', height: 14 }} />
            <div className="sk-bone" style={{ width: '35%', height: 11 }} />
          </div>
        </div>
      )}

      {!avatar && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div className="sk-bone" style={{ width: '62%', height: 18 }} />
          <div className="sk-bone" style={{ width: '38%', height: 13 }} />
        </div>
      )}

      <div className="sk-bone" style={{ width: '100%', height: 56, borderRadius: '10px', marginBottom: '14px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="sk-bone" style={{ width: i === lines - 1 ? '70%' : '100%', height: 12 }} />
        ))}
      </div>
    </div>
  );
}
