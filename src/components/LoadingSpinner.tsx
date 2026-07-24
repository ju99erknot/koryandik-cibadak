'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  type?: 'pulse' | 'spin' | 'bounce' | 'dots';
}

export default function LoadingSpinner({ 
  size = 40, 
  color = 'var(--primary)',
  type = 'spin' 
}: LoadingSpinnerProps) {
  if (type === 'pulse') {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: color,
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
    );
  }

  if (type === 'bounce') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: `${size / 3}px`,
              height: `${size / 3}px`,
              borderRadius: '50%',
              background: color,
              animation: `bounce 0.6s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: `${size / 4}px`,
              height: `${size / 4}px`,
              borderRadius: '50%',
              background: color,
              animation: `dots 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    );
  }

  // Default spin
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `3px solid ${color}20`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
  );
}
