'use client';
import React, { useEffect, useState } from 'react';
import { playSuccessSound } from '@/lib/sound';

// For temporary toast notifications (like login success)
export function showDynamicNotification(message: string, icon?: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('koryandik-notify', { detail: { message, icon, type: 'toast' } });
    window.dispatchEvent(event);
  }
}

// For persistent sticky countdown
export function showDynamicCountdown(targetDateStr: string, message: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('koryandik-countdown', { detail: { targetDateStr, message, type: 'countdown' } });
    window.dispatchEvent(event);
  }
}

// To hide persistent countdown
export function hideDynamicCountdown() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('koryandik-countdown-hide');
    window.dispatchEvent(event);
  }
}

// Background uploading helper dispatchers
export function startDynamicUpload(fileName: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('koryandik-upload-start', { detail: { fileName } });
    window.dispatchEvent(event);
  }
}

export function updateDynamicUploadProgress(progress: number) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('koryandik-upload-progress', { detail: { progress } });
    window.dispatchEvent(event);
  }
}

export function completeDynamicUpload(success: boolean, message: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('koryandik-upload-complete', { detail: { success, message } });
    window.dispatchEvent(event);
  }
}

export default function DynamicIsland() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<'toast' | 'countdown' | 'upload'>('toast');
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState('fa-bell');
  
  // Countdown specific state
  const [countdownStr, setCountdownStr] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  // Upload specific state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleNotify = (e: any) => {
      setMessage(e.detail.message);
      if (e.detail.icon) setIcon(e.detail.icon);
      setMode('toast');
      setActive(true);
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setActive(false);
      }, 4000);
    };

    const handleCountdown = (e: any) => {
      clearTimeout(timeoutId); // Stop any toast hiding
      setMessage(e.detail.message);
      setTargetDate(new Date(e.detail.targetDateStr));
      setIcon('fa-stopwatch');
      setMode('countdown');
      setActive(true);
    };

    const handleHide = () => {
      setActive(false);
    };

    // Upload lifecycle events
    const handleUploadStart = (e: any) => {
      clearTimeout(timeoutId);
      setMessage(`Mengunggah: ${e.detail.fileName}`);
      setIcon('fa-cloud-arrow-up');
      setUploadProgress(0);
      setUploadSuccess(null);
      setMode('upload');
      setActive(true);
    };

    const handleUploadProgress = (e: any) => {
      setUploadProgress(e.detail.progress);
    };

    const handleUploadComplete = (e: any) => {
      setUploadProgress(100);
      setUploadSuccess(e.detail.success);
      setMessage(e.detail.message);
      setIcon(e.detail.success ? 'fa-circle-check' : 'fa-circle-xmark');
      
      // Play audio indicator
      if (e.detail.success) {
        try {
          playSuccessSound();
        } catch (err) {
          console.warn(err);
        }
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setActive(false);
        // Small delay to clear status
        setTimeout(() => {
          setUploadSuccess(null);
          setUploadProgress(0);
        }, 600);
      }, 3000);
    };

    window.addEventListener('koryandik-notify', handleNotify);
    window.addEventListener('koryandik-countdown', handleCountdown);
    window.addEventListener('koryandik-countdown-hide', handleHide);
    window.addEventListener('koryandik-upload-start', handleUploadStart);
    window.addEventListener('koryandik-upload-progress', handleUploadProgress);
    window.addEventListener('koryandik-upload-complete', handleUploadComplete);
    
    return () => {
      window.removeEventListener('koryandik-notify', handleNotify);
      window.removeEventListener('koryandik-countdown', handleCountdown);
      window.removeEventListener('koryandik-countdown-hide', handleHide);
      window.removeEventListener('koryandik-upload-start', handleUploadStart);
      window.removeEventListener('koryandik-upload-progress', handleUploadProgress);
      window.removeEventListener('koryandik-upload-complete', handleUploadComplete);
      clearTimeout(timeoutId);
    };
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (mode !== 'countdown' || !targetDate || !active) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdownStr('Waktu Habis');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      
      if (days > 0) {
        setCountdownStr(`${days} Hari ${pad(hours)}:${pad(mins)}:${pad(secs)}`);
      } else {
        setCountdownStr(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
      }
    };

    updateTimer(); // Initial call
    const timerId = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timerId);
  }, [mode, targetDate, active]);

  const isCountdown = mode === 'countdown';
  const isUpload = mode === 'upload';

  return (
    <div
      className={`dynamic-island ${active ? 'expanded' : ''} ${isCountdown ? 'countdown-mode' : ''} ${isUpload ? 'upload-mode' : ''} ${uploadSuccess === true ? 'upload-success' : ''} ${uploadSuccess === false ? 'upload-error' : ''}`}
      style={{ visibility: active ? 'visible' : 'hidden' }}
    >
      <div className="island-content">
        <div className="icon-wrapper">
          <i className={`fa-solid ${icon} island-icon`}></i>
        </div>
        <div className="text-wrapper">
          <span className="island-text">{message}</span>
          {isCountdown && <span className="countdown-text">{countdownStr}</span>}
          {isUpload && uploadSuccess === null && (
            <div className="progress-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', width: '100%' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                <div className="progress-bar-island" style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.1s ease-out' }}></div>
              </div>
              <span className="progress-percentage" style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>{uploadProgress}%</span>
            </div>
          )}
        </div>
        {isCountdown && (
          <button 
            onClick={() => setActive(false)}
            className="close-button"
            aria-label="Tutup pengingat"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
      <style jsx>{`
        .dynamic-island {
          position: fixed;
          top: 15px;
          left: 50%;
          transform: translateX(-50%) scale(0);
          background: #000;
          border-radius: 30px;
          width: 120px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1);
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }
        .dynamic-island::before {
          content: '';
          position: absolute;
          width: 40%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          top: 50%;
          transform: translateY(-50%);
          transition: opacity 0.3s ease;
        }
        .dynamic-island.expanded::before {
          opacity: 0;
        }
        
        /* Toast mode sizing */
        .dynamic-island.expanded {
          width: 380px;
          height: 60px;
          border-radius: 30px;
          opacity: 1;
          transform: translateX(-50%) scale(1);
          pointer-events: auto;
        }
        
        /* Countdown mode sizing */
        .dynamic-island.expanded.countdown-mode {
          width: 420px;
          height: 65px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(239, 68, 68, 0.3);
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2);
        }

        /* Upload mode sizing */
        .dynamic-island.expanded.upload-mode {
          width: 400px;
          height: 70px;
          background: rgba(9, 15, 29, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow: 0 10px 35px rgba(59, 130, 246, 0.15);
        }

        .dynamic-island.expanded.upload-success {
          border-color: rgba(34, 197, 94, 0.5);
          background: rgba(5, 46, 22, 0.95);
          box-shadow: 0 10px 35px rgba(34, 197, 94, 0.25);
        }

        .dynamic-island.expanded.upload-error {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(69, 10, 10, 0.95);
          box-shadow: 0 10px 35px rgba(239, 68, 68, 0.25);
        }

        .island-content {
          display: flex;
          align-items: center;
          gap: 15px;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          padding: 0 20px;
          width: 100%;
        }
        .dynamic-island.expanded .island-content {
          opacity: 1;
          transform: scale(1);
        }
        
        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
        }

        .island-icon {
          color: #00f0ff;
          font-size: 20px;
          animation: pulse 2s infinite;
        }
        
        .countdown-mode .island-icon {
          color: #ef4444; /* Red for urgent countdown */
          animation: pulse-urgent 1s infinite;
        }

        .upload-mode .island-icon {
          color: #3b82f6;
          animation: pulse 1.5s infinite;
        }

        .upload-success .island-icon {
          color: #22c55e;
          animation: none;
        }

        .upload-error .island-icon {
          color: #ef4444;
          animation: none;
        }

        .text-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          overflow: hidden;
        }

        .island-text {
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .countdown-mode .island-text {
          font-size: 11px;
          color: #94a3b8;
        }

        .countdown-text {
          color: #ef4444;
          font-size: 16px;
          font-weight: 700;
          font-family: monospace;
          letter-spacing: 1px;
        }

        .close-button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .close-button i {
          font-size: 14px;
        }

        @keyframes pulse {
          0% { text-shadow: 0 0 5px #00f0ff; transform: scale(1); }
          50% { text-shadow: 0 0 20px #00f0ff, 0 0 30px #00f0ff; transform: scale(1.1); }
          100% { text-shadow: 0 0 5px #00f0ff; transform: scale(1); }
        }
        
        @keyframes pulse-urgent {
          0% { text-shadow: 0 0 5px #ef4444; transform: scale(1); }
          50% { text-shadow: 0 0 15px #ef4444; transform: scale(1.15); }
          100% { text-shadow: 0 0 5px #ef4444; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
