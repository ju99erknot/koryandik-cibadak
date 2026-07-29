'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ProgressBar({ 
  value, 
  max = 100, 
  color = 'var(--primary)',
  height = 8,
  animated = true,
  showLabel = false,
  className = '',
  style
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        {showLabel && (
          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {value} / {max}
          </span>
        )}
        {showLabel && (
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          background: 'var(--card-border)',
          borderRadius: `${height / 2}px`,
          overflow: 'hidden'
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 0.8 : 0, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color,
            borderRadius: `${height / 2}px`,
            boxShadow: `0 0 10px ${color}40`
          }}
        />
      </div>
    </div>
  );
}
