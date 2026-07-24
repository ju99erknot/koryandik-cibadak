'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  variant?: 'default' | 'search' | 'error' | 'empty';
}

const VARIANT_COLORS: Record<string, { bg: string; color: string; glow: string }> = {
  default: { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
  search:  { bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
  error:   { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444', glow: 'rgba(239,68,68,0.15)'  },
  empty:   { bg: 'rgba(16,185,129,0.08)', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
};

export default function EmptyState({
  icon = 'fa-solid fa-inbox',
  title,
  description,
  action,
  secondaryAction,
  className = '',
  variant = 'default',
}: EmptyStateProps) {
  const c = VARIANT_COLORS[variant];
  return (
    <div className={`empty-state ${className}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .empty-state-icon-wrap {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-state-icon-bg {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          animation: empty-pulse 3s ease-in-out infinite;
        }
        .empty-state-icon-ring {
          position: absolute;
          inset: -8px;
          border-radius: 32px;
          border: 1.5px dashed;
          opacity: 0.3;
          animation: empty-spin 12s linear infinite;
        }
        .empty-state-icon-inner {
          position: relative;
          font-size: 28px;
          z-index: 1;
        }
        .empty-state-dots {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-top: 20px;
        }
        .empty-state-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: empty-bounce 1.4s ease-in-out infinite;
        }
        @keyframes empty-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes empty-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes empty-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '200px', height: '200px', borderRadius: '50%',
        background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="empty-state-icon-wrap">
        <div className="empty-state-icon-bg" style={{ background: c.bg }} />
        <div className="empty-state-icon-ring" style={{ borderColor: c.color }} />
        <div className="empty-state-icon-inner" style={{ color: c.color }}>
          <i className={icon} />
        </div>
      </div>

      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}

      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
          {action && (
            <button className="btn btn-primary" onClick={action.onClick}>
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button className="btn btn-outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      <div className="empty-state-dots">
        {[0, 1, 2].map(i => (
          <div key={i} className="empty-state-dot" style={{
            background: c.color,
            animationDelay: `${i * 0.16}s`,
          }} />
        ))}
      </div>
    </div>
  );
}
