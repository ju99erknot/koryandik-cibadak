'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // 1. Feature detection: only activate custom cursor on devices supporting hover pointers
    const mediaQuery = window.matchMedia('(hover: hover)');
    if (!mediaQuery.matches) return;
    setIsEnabled(true);

    const handleMouseMove = (e: MouseEvent) => {
      // Direct DOM manipulation — avoids React setState re-renders (120-240fps)
      const x = e.clientX;
      const y = e.clientY;
      if (outerRef.current) {
        outerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      if (innerRef.current) {
        innerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.classList.contains('clickable') ||
        target.closest('.clickable')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      {/* Outer Ring - Smooth Follower */}
      <div
        ref={outerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '44px' : '22px',
          height: isHovering ? '44px' : '22px',
          border: isHovering ? '1.5px solid rgba(255, 255, 255, 0.4)' : '1.5px solid var(--primary)',
          background: isHovering ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          // Initial position off-screen until first mousemove
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
          // Fast easing for lagless follow effect
          transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1), height 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s, border-color 0.3s'
        }}
      />
      {/* Inner Dot - High-speed instant tracker with color inversion blend-mode */}
      <div
        ref={innerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '10px' : '6px',
          height: isHovering ? '10px' : '6px',
          background: '#ffffff',
          mixBlendMode: 'difference',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
          // No delay in translation for instant touch feedback
          transition: 'width 0.25s cubic-bezier(0.25, 1, 0.5, 1), height 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      />
    </>
  );
}
