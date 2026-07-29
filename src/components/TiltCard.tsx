'use client';

import React, { useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
  style?: React.CSSProperties;
}

export default function TiltCard({ children, className = '', intensity = 15, glare = true, style }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, transform: '' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);

    if (glare) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      setGlareStyle({
        opacity: 0.4,
        transform: `translate(${glareX - 50}%, ${glareY - 50}%)`
      });
    }
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)');
    setGlareStyle({ opacity: 0, transform: '' });
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: 'transform 0.1s ease-out',
        position: 'relative',
        background: 'var(--card-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--card-border)',
        borderRadius: '20px',
        overflow: 'hidden',
        ...style
      }}
    >
      {glare && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
            opacity: glareStyle.opacity,
            transform: glareStyle.transform,
            transition: 'opacity 0.3s ease, transform 0.1s ease-out',
            pointerEvents: 'none'
          }}
        />
      )}
      {children}
    </div>
  );
}
