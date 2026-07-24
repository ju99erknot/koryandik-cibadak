'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
  particleCount?: number;
  colors?: string[];
}

export default function Confetti({ trigger, onComplete, particleCount = 100, colors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'] }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; rotation: number; scale: number }>>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger, particleCount, colors, onComplete]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }}>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: `${particle.x}%`, 
              y: '-20px', 
              rotate: particle.rotation,
              scale: particle.scale 
            }}
            animate={{ 
              x: `${particle.x + (Math.random() - 0.5) * 50}%`, 
              y: '120vh',
              rotate: particle.rotation + Math.random() * 720,
              scale: particle.scale
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2 + Math.random() * 2,
              ease: 'easeOut'
            }}
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              background: particle.color,
              borderRadius: '2px'
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
