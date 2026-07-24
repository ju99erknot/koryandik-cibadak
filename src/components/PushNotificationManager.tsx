'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePushNotifications } from '@/lib/pushNotifications';
import { triggerBrowserNotification } from '@/lib/notificationEvents';

interface PushNotificationManagerProps {
  currentUser?: any;
}

export default function PushNotificationManager({ currentUser }: PushNotificationManagerProps) {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [showBanner, setShowBanner] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [result, setResult] = useState<'granted' | 'denied' | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isSupported || !currentUser) return;

    if (permission === 'default' && !localStorage.getItem('hide_push_prompt')) {
      if (sessionStorage.getItem('hide_push_prompt_session')) return;

      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, currentUser]);

  const handleActivate = async () => {
    const granted = await requestPermission();
    setResult(granted ? 'granted' : 'denied');
    localStorage.setItem('hide_push_prompt', 'true');
    closeTimerRef.current = setTimeout(() => handleClose(), 2000);
  };

  const handleClose = () => {
    setIsClosing(true);
    if (!result) {
      sessionStorage.setItem('hide_push_prompt_session', 'true');
    }
    hideTimerRef.current = setTimeout(() => setShowBanner(false), 400);
  };

  const handleNever = () => {
    localStorage.setItem('hide_push_prompt', 'true');
    setIsClosing(true);
    hideTimerRef.current = setTimeout(() => setShowBanner(false), 400);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className={`notif-prompt-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} />
      <div className={`notif-prompt-banner ${isClosing ? 'closing' : ''} ${result ? 'result-' + result : ''}`}>
        {/* Glow effect */}
        <div className="notif-prompt-glow" />

        {/* Close button */}
        <button className="notif-prompt-close" onClick={handleClose} aria-label="Tutup">
          <i className="fa-solid fa-xmark" />
        </button>

        {/* Icon */}
        <div className="notif-prompt-icon-wrap">
          {result === 'granted' ? (
            <i className="fa-solid fa-circle-check notif-prompt-icon success" />
          ) : result === 'denied' ? (
            <i className="fa-solid fa-circle-xmark notif-prompt-icon denied" />
          ) : (
            <i className="fa-solid fa-bell notif-prompt-icon" />
          )}
        </div>

        {/* Text */}
        <div className="notif-prompt-text">
          {result === 'granted' ? (
            <>
              <h4>Notifikasi Aktif! 🎉</h4>
              <p>Anda akan menerima pemberitahuan penting secara real-time.</p>
            </>
          ) : result === 'denied' ? (
            <>
              <h4>Notifikasi Ditolak</h4>
              <p>Anda bisa mengaktifkannya kembali di pengaturan browser.</p>
            </>
          ) : (
            <>
              <h4>Tetap Terhubung!</h4>
              <p>Aktifkan notifikasi agar tidak ketinggalan update deadline, pengumuman penting, dan perubahan status berkas.</p>
            </>
          )}
        </div>

        {/* Actions */}
        {!result && (
          <div className="notif-prompt-actions">
            <button className="notif-btn-primary" onClick={handleActivate}>
              <i className="fa-solid fa-bell" style={{ marginRight: '8px' }} />
              Aktifkan
            </button>
            <button className="notif-btn-secondary" onClick={handleNever}>
              Tidak, Terima Kasih
            </button>
          </div>
        )}

        <style jsx>{`
          .notif-prompt-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 10000;
            animation: fadeIn 0.3s ease;
          }
          .notif-prompt-overlay.closing {
            animation: fadeOut 0.3s ease forwards;
          }
          .notif-prompt-banner {
            position: fixed;
            bottom: 32px;
            right: 32px;
            width: 380px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            padding: 28px 24px 24px;
            z-index: 10001;
            animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
          }
          .notif-prompt-banner.closing {
            animation: slideDown 0.4s ease forwards;
          }
          .notif-prompt-banner.result-granted {
            border-color: rgba(34, 197, 94, 0.4);
          }
          .notif-prompt-banner.result-denied {
            border-color: rgba(239, 68, 68, 0.3);
          }
          .notif-prompt-glow {
            position: absolute;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 120px;
            background: radial-gradient(ellipse, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
            pointer-events: none;
          }
          .result-granted .notif-prompt-glow {
            background: radial-gradient(ellipse, rgba(34, 197, 94, 0.25) 0%, transparent 70%);
          }
          .notif-prompt-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(255, 255, 255, 0.06);
            border: none;
            color: rgba(255, 255, 255, 0.4);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: all 0.2s;
          }
          .notif-prompt-close:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
          }
          .notif-prompt-icon-wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 16px;
          }
          .notif-prompt-icon {
            font-size: 40px;
            color: #6366f1;
            animation: bellRing 1.5s ease-in-out infinite;
          }
          .notif-prompt-icon.success {
            color: #22c55e;
            animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .notif-prompt-icon.denied {
            color: #ef4444;
            animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .notif-prompt-text {
            text-align: center;
            margin-bottom: 20px;
          }
          .notif-prompt-text h4 {
            color: #fff;
            font-size: 17px;
            font-weight: 700;
            margin: 0 0 8px;
            letter-spacing: -0.2px;
          }
          .notif-prompt-text p {
            color: rgba(148, 163, 184, 0.9);
            font-size: 13px;
            margin: 0;
            line-height: 1.6;
          }
          .notif-prompt-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .notif-btn-primary {
            width: 100%;
            padding: 12px 20px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          }
          .notif-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 25px rgba(99, 102, 241, 0.45);
          }
          .notif-btn-primary:active {
            transform: translateY(0);
          }
          .notif-btn-secondary {
            width: 100%;
            padding: 10px 20px;
            background: transparent;
            color: rgba(148, 163, 184, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .notif-btn-secondary:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.12);
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes slideDown {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(40px) scale(0.95); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes bellRing {
            0% { transform: rotate(0deg); }
            10% { transform: rotate(14deg); }
            20% { transform: rotate(-12deg); }
            30% { transform: rotate(10deg); }
            40% { transform: rotate(-6deg); }
            50% { transform: rotate(0deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes popIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }

          @media (max-width: 480px) {
            .notif-prompt-banner {
              left: 16px;
              right: 16px;
              bottom: 16px;
              width: auto;
            }
          }
        `}</style>
      </div>
    </>
  );
}

export function triggerPushNotification(title: string, body: string, data?: Record<string, unknown>) {
  triggerBrowserNotification(title, body, data);
}
