'use client';

import React, { useRef, useState } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  style?: React.CSSProperties;
}

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(59, 130, 246, 0.15)', style }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [spotlightStyle, setSpotlightStyle] = useState({ opacity: 0, background: '', transform: '' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSpotlightStyle({
      opacity: 1,
      background: `radial-gradient(600px circle at ${x}px ${y}px, ${spotlightColor}, transparent 40%)`,
      transform: ''
    });
  };

  const handleMouseLeave = () => {
    setSpotlightStyle({ opacity: 0, background: '', transform: '' });
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        background: 'var(--card-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--card-border)',
        borderRadius: '20px',
        overflow: 'hidden',
        ...style
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: spotlightStyle.opacity,
          background: spotlightStyle.background,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}
      />
      {children}
    </div>
  );
}
