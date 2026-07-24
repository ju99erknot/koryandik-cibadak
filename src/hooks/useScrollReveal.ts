'use client';

import { useEffect } from 'react';

/**
 * Custom hook to initiate IntersectionObserver for scroll reveal animations.
 * Dilengkapi proteksi cleanup memori 100% aman dari kebocoran saat unmount.
 */
export function useScrollReveal(dependencies: any[] = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let observer: IntersectionObserver | null = null;
    let revealElements: NodeListOf<Element> | null = null;

    // Small delay so React's DOM has committed
    const timeout = setTimeout(() => {
      observer = new IntersectionObserver(
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

      revealElements = document.querySelectorAll('.reveal-on-scroll');
      revealElements.forEach((el) => observer?.observe(el));
    }, 80);

    return () => {
      clearTimeout(timeout);
      if (observer) {
        if (revealElements) {
          revealElements.forEach((el) => observer?.unobserve(el));
        }
        observer.disconnect();
      }
    };
  }, dependencies);
}

