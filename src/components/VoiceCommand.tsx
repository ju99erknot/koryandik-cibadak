'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCommandProps {
  currentUser?: any;
  onCommand?: (command: string, params: any) => void;
  variant?: 'icon' | 'fab';
}

export default function VoiceCommand({ currentUser, onCommand, variant = 'icon' }: VoiceCommandProps) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const processCommand = useCallback((command: string) => {
    console.log('Processing command:', command);
    
    // Navigation commands
    if (command.includes('buka') || command.includes('pergi ke') || command.includes('navigasi')) {
      if (command.includes('dashboard') || command.includes('beranda')) {
        router.push('/');
      } else if (command.includes('admin')) {
        if (currentUser?.role === 'admin') {
          router.push('/admin/dashboard');
        }
      } else if (command.includes('sekolah')) {
        if (currentUser?.role === 'school') {
          router.push('/school/dashboard');
        }
      } else if (command.includes('gugus')) {
        if (currentUser?.role === 'gugus') {
          router.push('/gugus/dashboard');
        }
      }
    }
    
    // Search commands
    if (command.includes('cari') || command.includes('temukan') || command.includes('search')) {
      if (command.includes('sekolah')) {
        // Extract school name
        const schoolName = command.replace(/cari|temukan|search|sekolah/gi, '').trim();
        if (schoolName) {
          onCommand?.('search-school', { query: schoolName });
        }
      }
    }
    
    // Gugus commands
    if (command.includes('gugus') || command.includes('tampilkan')) {
      const gugusMatch = command.match(/gugus\s*(\d+|i|ii|iii|iv|v)/i);
      if (gugusMatch) {
        const gugusMap: Record<string, string> = {
          '1': 'I', 'i': 'I',
          '2': 'II', 'ii': 'II',
          '3': 'III', 'iii': 'III',
          '4': 'IV', 'iv': 'IV',
          '5': 'V', 'v': 'V'
        };
        const gugusId = gugusMap[gugusMatch[1].toLowerCase()];
        if (gugusId) {
          onCommand?.('filter-gugus', { gugusId });
        }
      }
    }
    
    // Upload commands
    if (command.includes('upload') || command.includes('unggah')) {
      onCommand?.('upload', {});
    }
    
    // Theme commands
    if (command.includes('tema') || command.includes('mode')) {
      if (command.includes('gelap') || command.includes('dark')) {
        onCommand?.('set-theme', { theme: 'dark' });
      } else if (command.includes('terang') || command.includes('light')) {
        onCommand?.('set-theme', { theme: 'light' });
      }
    }
    
    // Help command
    if (command.includes('bantuan') || command.includes('help') || command.includes('apa yang bisa')) {
      onCommand?.('help', {});
    }
  }, [router, currentUser, onCommand]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      let active = true;
      setTimeout(() => {
        if (active) setIsSupported(true);
      }, 0);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        
        setTranscript(transcriptText);
        
        if (result.isFinal) {
          processCommand(transcriptText.toLowerCase());
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;

      return () => {
        active = false;
      };
    }
  }, [processCommand]);

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) return null;

  if (variant === 'icon') {
    return (
      <>
        {/* Voice Command Button (Icon Variant for Navbar) */}
        <button
          onClick={toggleListening}
          className={`icon-action-btn icon-action-btn-voice ${isListening ? 'active' : ''}`}
          title={isListening ? 'Berhenti mendengarkan' : 'Voice Command'}
          aria-pressed={isListening}
        >
          <i className={`fa-solid ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.3)',
                pointerEvents: 'none'
              }}
            />
          )}
        </button>

        {/* Listening Indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                padding: '16px 20px',
                borderRadius: '12px',
                color: 'white',
                zIndex: 10000,
                minWidth: '200px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite'
                }}></div>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Mendengarkan...</span>
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {transcript || 'Katakan perintah...'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}</style>
      </>
    );
  }

  // FAB Variant (fallback if needed, but we won't use this)
  return (
    <>
      <motion.button
        onClick={toggleListening}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <i className={`fa-solid ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`} style={{ fontSize: '20px' }}></i>
      </motion.button>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '90px',
              right: '24px',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              padding: '16px 20px',
              borderRadius: '12px',
              color: 'white',
              zIndex: 1000,
              minWidth: '200px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                background: '#ef4444',
                borderRadius: '50%',
                animation: 'pulse 1s infinite'
              }}></div>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Mendengarkan...</span>
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {transcript || 'Katakan perintah...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}

// Voice command help text
export const VOICE_COMMANDS = [
  { command: 'Cari [nama sekolah]', description: 'Mencari sekolah tertentu' },
  { command: 'Tampilkan Gugus [I-V]', description: 'Filter berdasarkan gugus' },
  { command: 'Buka dashboard', description: 'Navigasi ke dashboard' },
  { command: 'Upload berkas', description: 'Buka form upload' },
  { command: 'Ganti tema gelap/terang', description: 'Switch tema' },
  { command: 'Bantuan', description: 'Tampilkan bantuan' }
];
