import { useEffect, useRef } from 'react';

type SoundType = 'click' | 'hover' | 'success' | 'error' | 'notification';

interface SoundEffects {
  click?: string;
  hover?: string;
  success?: string;
  error?: string;
  notification?: string;
}

export function useSoundEffects(enabled = true, customSounds?: SoundEffects) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && enabled) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  const playSound = (type: SoundType) => {
    if (!enabled || !audioContextRef.current) return;

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    const soundConfig = getSoundConfig(type);
    oscillator.type = soundConfig.type;
    oscillator.frequency.setValueAtTime(soundConfig.frequency, context.currentTime);
    
    gainNode.gain.setValueAtTime(soundConfig.volume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + soundConfig.duration);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + soundConfig.duration);
  };

  return { playSound };
}

function getSoundConfig(type: SoundType) {
  switch (type) {
    case 'click':
      return { type: 'sine' as OscillatorType, frequency: 800, duration: 0.1, volume: 0.1 };
    case 'hover':
      return { type: 'sine' as OscillatorType, frequency: 400, duration: 0.05, volume: 0.05 };
    case 'success':
      return { type: 'sine' as OscillatorType, frequency: 600, duration: 0.2, volume: 0.1 };
    case 'error':
      return { type: 'sawtooth' as OscillatorType, frequency: 200, duration: 0.3, volume: 0.1 };
    case 'notification':
      return { type: 'sine' as OscillatorType, frequency: 1000, duration: 0.15, volume: 0.1 };
    default:
      return { type: 'sine' as OscillatorType, frequency: 440, duration: 0.1, volume: 0.1 };
  }
}
