'use client';

import React, { useState, useEffect } from 'react';
import { GUGUS_THEMES, getGugusTheme, applyGugusTheme, saveGugusThemePreference } from '@/lib/gugusThemes';
import { motion, AnimatePresence } from 'framer-motion';

interface GugusThemeSelectorProps {
  currentGugusId?: string;
  onThemeChange?: (themeId: string) => void;
}

export default function GugusThemeSelector({ currentGugusId, onThemeChange }: GugusThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(currentGugusId || 'default');

  useEffect(() => {
    if (currentGugusId) {
      const savedTheme = localStorage.getItem(`koryandik_gugus_theme_${currentGugusId}`);
      if (savedTheme) {
        setSelectedTheme(savedTheme);
        applyGugusTheme(GUGUS_THEMES[savedTheme] || GUGUS_THEMES['default']);
      } else {
        setSelectedTheme(currentGugusId);
        applyGugusTheme(GUGUS_THEMES[currentGugusId] || GUGUS_THEMES['default']);
      }
    }
  }, [currentGugusId]);

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    applyGugusTheme(GUGUS_THEMES[themeId] || GUGUS_THEMES['default']);
    
    if (currentGugusId) {
      saveGugusThemePreference(currentGugusId, themeId);
    }
    
    onThemeChange?.(themeId);
    setIsOpen(false);
  };

  const currentTheme = GUGUS_THEMES[selectedTheme] || GUGUS_THEMES['default'];

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          background: 'var(--card-glass)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px'
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: currentTheme.primary,
          boxShadow: `0 0 10px ${currentTheme.primary}`
        }}></div>
        <span>Theme</span>
        <i className="fa-solid fa-chevron-down" style={{ fontSize: '10px' }}></i>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'var(--card-glass)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '12px',
              minWidth: '200px',
              zIndex: 1000,
              backdropFilter: 'blur(20px)'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Pilih Theme Gugus
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(GUGUS_THEMES).map(([id, theme]) => (
                <motion.button
                  key={id}
                  onClick={() => handleThemeSelect(id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: selectedTheme === id ? `2px solid ${theme.primary}` : '1px solid var(--card-border)',
                    background: selectedTheme === id ? `${theme.primary}15` : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: theme.primary,
                    boxShadow: `0 0 8px ${theme.primary}`
                  }}></div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {theme.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {theme.primary}
                    </div>
                  </div>
                  {selectedTheme === id && (
                    <i className="fa-solid fa-check" style={{ color: theme.primary, marginLeft: 'auto' }}></i>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
