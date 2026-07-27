'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CarouselProps {
  children: React.ReactNode[];
  autoPlay?: boolean;
  interval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
}

export default function Carousel({
  children,
  autoPlay = false,
  interval = 5000,
  showArrows = true,
  showDots = true,
  className = ''
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % children.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + children.length) % children.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (!autoPlay) return;
    // Advance via a functional update so the interval does not capture a stale
    // nextSlide closure (which would freeze on the slide it was created with).
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % children.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, children.length]);

  return (
    <div className={`carousel ${className}`}>
      <div className="carousel-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="carousel-slide"
          >
            {children[currentIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      {showArrows && children.length > 1 && (
        <>
          <button
            className="carousel-arrow carousel-arrow-prev"
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <button
            className="carousel-arrow carousel-arrow-next"
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </>
      )}

      {showDots && children.length > 1 && (
        <div className="carousel-dots">
          {children.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
