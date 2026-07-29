'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOUR_STEPS = [
  {
    title: 'Selamat Datang di Portal Koryandik!',
    description: 'Sistem administrasi digital untuk mempermudah pemantauan dan pengumpulan berkas sekolah di Kecamatan Cibadak secara real-time.',
    icon: 'fa-solid fa-rocket',
    color: 'var(--primary)'
  },
  {
    title: 'Pencarian Global (Ctrl+K)',
    description: 'Temukan sekolah, pengumuman, atau navigasi dengan cepat dari mana saja menggunakan fitur pencarian terpadu kami.',
    icon: 'fa-solid fa-magnifying-glass',
    color: '#8b5cf6'
  },
  {
    title: 'Notifikasi Real-time',
    description: 'Dapatkan pemberitahuan instan saat ada pembaruan status berkas atau pengumuman baru dari administrator.',
    icon: 'fa-solid fa-bell',
    color: '#f59e0b'
  },
  {
    title: 'Analitik & Pelaporan',
    description: 'Pantau progres pengumpulan berkas melalui grafik interaktif dan ekspor laporan lengkap dalam format PDF atau CSV.',
    icon: 'fa-solid fa-chart-pie',
    color: '#10b981'
  }
];

export default function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has already seen the tour
    const hasSeenTour = localStorage.getItem('koryandik_onboarding_done');
    if (!hasSeenTour) {
      // Delay showing the tour slightly for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('koryandik_onboarding_done', 'true');
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <div 
          className="modal-overlay"
          style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(var(--modal-blur))',
          zIndex: 'var(--z-modal-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setIsVisible(false)}>
          <motion.div 
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="modal-card"
            style={{ 
              maxWidth: '500px', 
              width: '90%',
              padding: 0, 
              overflow: 'hidden',
              border: '1px solid var(--card-border)',
              borderRadius: '24px',
            }}
          >
            {/* Header / Graphic */}
            <div style={{ 
              height: '160px', 
              background: `linear-gradient(135deg, ${step.color}22, ${step.color}88)`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {/* Decorative elements */}
              <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', top: '-50px', right: '-50px' }}></div>
              <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: '-20px', left: '-20px' }}></div>
              
              <motion.div
                key={currentStep}
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '24px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  color: step.color,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  zIndex: 1
                }}
              >
                <i className={step.icon}></i>
              </motion.div>
            </div>

            {/* Content */}
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', justifyContent: 'center' }}>
                {TOUR_STEPS.map((_, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      height: '6px', 
                      width: currentStep === idx ? '24px' : '6px', 
                      borderRadius: '3px',
                      background: currentStep === idx ? step.color : 'var(--card-border)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>

              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{ textAlign: 'center', minHeight: '120px' }}
              >
                <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>{step.title}</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.description}</p>
              </motion.div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <button 
                  onClick={handleClose}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Lewati
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {currentStep > 0 && (
                    <button 
                      onClick={handlePrev}
                      className="btn btn-outline"
                    >
                      Kembali
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className="btn btn-primary"
                    style={{ background: step.color, boxShadow: `0 4px 14px ${step.color}66` }}
                  >
                    {currentStep < TOUR_STEPS.length - 1 ? 'Lanjut' : 'Mulai Sekarang'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
