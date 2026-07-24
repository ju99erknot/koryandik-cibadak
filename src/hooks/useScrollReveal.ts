'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to initiate IntersectionObserver for scroll reveal animations.
 * Uses requestAnimationFrame for reliable DOM-ready timing instead of arbitrary setTimeout.
 */
export function useScrollReveal(dependencies: unknown[] = []) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Element[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use rAF to ensure DOM is painted before querying
    const rafId = requestAnimationFrame(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
            }
          });
        },
        {
          threshold: 0.06,
          rootMargin: '0px 0px -30px 0px'
        }
      );

      const elements = document.querySelectorAll('.reveal-on-scroll');
      elementsRef.current = Array.from(elements);
      elementsRef.current.forEach((el) => observerRef.current?.observe(el));
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (observerRef.current) {
        elementsRef.current.forEach((el) => observerRef.current?.unobserve(el));
        observerRef.current.disconnect();
      }
      elementsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
