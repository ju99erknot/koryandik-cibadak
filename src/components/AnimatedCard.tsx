'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  style?: React.CSSProperties;
}

export default function AnimatedCard({ children, className = '', hover = true, delay = 0, style }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { 
        y: -4, 
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      } : {}}
      className={`card ${className}`}
      style={{
        background: 'var(--card-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}
