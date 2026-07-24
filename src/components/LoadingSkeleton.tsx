'use client';

import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
  animated?: boolean;
  style?: React.CSSProperties;
}

export default function LoadingSkeleton({
  variant = 'rectangular',
  width = '100%',
  height = '1em',
  className = '',
  count = 1,
  animated = true,
  style
}: LoadingSkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return { borderRadius: '50%' };
      case 'rounded':
        return { borderRadius: '8px' };
      case 'text':
        return { borderRadius: '4px' };
      case 'rectangular':
      default:
        return { borderRadius: '4px' };
    }
  };

  const skeleton = (
    <div
      className={`loading-skeleton ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        background: 'color-mix(in srgb, var(--text-muted) 18%, transparent)',
        ...getVariantStyles(),
        ...style
      }}
    >
      {animated && (
        <span style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--text-primary) 6%, transparent) 50%, transparent 100%)',
          animation: 'sk-shimmer 1.6s ease-in-out infinite',
        }} />
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes sk-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }` }} />
    </div>
  );

  if (count > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>{skeleton}</div>
        ))}
      </div>
    );
  }

  return skeleton;
}
