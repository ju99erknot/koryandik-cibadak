'use client';

import React from 'react';

interface SkeletonProps {
  style?: React.CSSProperties;
}

export function SkeletonItem({ style }: SkeletonProps) {
  return (
    <div
      className="shimmer-pulse"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        height: '16px',
        width: '100%',
        ...style
      }}
    />
  );
}

export function SkeletonStats() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '20px',
            background: 'var(--card-glass)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px'
          }}
        >
          {/* Mock Icon */}
          <div className="shimmer-pulse" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <SkeletonItem style={{ width: '60%', height: '12px' }} />
            <SkeletonItem style={{ width: '40%', height: '24px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '20px', overflow: 'hidden' }}>
      <div className="card-header" style={{ padding: '20px 24px', display: 'flex', gap: '14px', alignItems: 'center' }}>
        <SkeletonItem style={{ width: '25%', height: '18px' }} />
      </div>
      <div className="card-body" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Mock */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {Array.from({ length: cols }).map((_, i) => (
              <SkeletonItem key={i} style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '4px 0' }} />
          {/* Rows Mock */}
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {Array.from({ length: cols }).map((_, c) => (
                <SkeletonItem key={c} style={{ flex: 1, height: '14px' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card" style={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '220px', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', height: '100%', padding: '0 20px' }}>
          {[60, 40, 80, 50, 90, 70, 45, 85].map((h, i) => (
            <div
              key={i}
              className="shimmer-pulse"
              style={{
                flex: 1,
                height: `${h}%`,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
