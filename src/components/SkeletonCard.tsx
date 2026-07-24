'use client';

import React from 'react';

interface SkeletonCardProps {
  className?: string;
}

export default function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`skeleton-card ${className}`} style={{
      background: 'var(--card-glass)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--card-border)',
      borderRadius: '16px',
      padding: '20px',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{
        width: '60%',
        height: '20px',
        background: 'var(--text-muted)',
        borderRadius: '8px',
        opacity: 0.3,
        marginBottom: '12px'
      }} />
      <div style={{
        width: '40%',
        height: '16px',
        background: 'var(--text-muted)',
        borderRadius: '6px',
        opacity: 0.2,
        marginBottom: '16px'
      }} />
      <div style={{
        width: '100%',
        height: '60px',
        background: 'var(--text-muted)',
        borderRadius: '8px',
        opacity: 0.15
      }} />
      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
