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
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    scale: number;
    driftX: number;
    spin: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    if (!trigger) return;

    // Defer the state write out of the effect body so React does not have to
    // perform a cascading synchronous re-render (react-hooks/set-state-in-effect).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        // Pre-compute animation randomness here so the render pass stays pure.
        driftX: (Math.random() - 0.5) * 50,
        spin: Math.random() * 720,
        duration: 2 + Math.random() * 2
      }));
      setParticles(newParticles);

      timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
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
              x: `${particle.x + particle.driftX}%`, 
              y: '120vh',
              rotate: particle.rotation + particle.spin,
              scale: particle.scale
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: particle.duration,
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
