'use client';

import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  colors?: string[];
  className?: string;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
}

export default function GradientText({ 
  children, 
  colors = ['#3b82f6', '#06b6d4'],
  className = '',
  direction = 'horizontal'
}: GradientTextProps) {
  const gradientMap = {
    horizontal: 'to right',
    vertical: 'to bottom',
    diagonal: '135deg'
  };

  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(${gradientMap[direction]}, ${colors.join(', ')})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block'
      }}
    >
      {children}
    </span>
  );
}
