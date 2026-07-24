'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface MorphingShapeProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function MorphingShape({ size = 100, color = 'var(--primary)', className = '' }: MorphingShapeProps) {
  return (
    <motion.div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
        boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)'
      }}
      animate={{
        borderRadius: [
          '30% 70% 70% 30% / 30% 30% 70% 70%',
          '53% 47% 47% 53% / 53% 30% 70% 47%',
          '30% 70% 70% 30% / 30% 30% 70% 70%'
        ],
        rotate: [0, 90, 180, 270, 360],
        scale: [1, 1.1, 1, 1.1, 1]
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
}
