'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export default function AnimatedText({ text, className = '', delay = 0, duration = 0.05 }: AnimatedTextProps) {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: duration, delayChildren: delay }
    })
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100
      }
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100
      }
    }
  };

  return (
    <motion.div
      className="animated-text"
      variants={container}
      initial="hidden"
      animate="visible"
      style={{ display: 'inline-block' }}
    >
      {letters.map((letter, index) => (
        <motion.span variants={child} key={index} className={className}>
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.div>
  );
}
