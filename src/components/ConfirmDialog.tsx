'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: string;
}

type ConfirmResolver = (value: boolean) => void;

let globalShowConfirm: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

/** Call this anywhere to show a premium confirm dialog. Returns true if confirmed. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (globalShowConfirm) return globalShowConfirm(options);
  // Fallback if component not mounted
  return Promise.resolve(window.confirm(options.message));
}

export default function ConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    message: '',
    title: 'Konfirmasi',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    variant: 'danger',
  });
  const [resolver, setResolver] = useState<ConfirmResolver | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        title: opts.title || 'Konfirmasi',
        message: opts.message,
        confirmText: opts.confirmText || 'Hapus',
        cancelText: opts.cancelText || 'Batal',
        variant: opts.variant || 'danger',
        icon: opts.icon,
      });
      setResolver(() => resolve);
      setIsClosing(false);
      setIsOpen(true);
    });
  }, []);

  useEffect(() => {
    globalShowConfirm = showConfirm;
    return () => { globalShowConfirm = null; };
  }, [showConfirm]);

  const handleClose = (result: boolean) => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      if (resolver) resolver(result);
      setResolver(null);
    }, 280);
  };

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!isOpen) return null;

  const variantColors = {
    danger: { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    warning: { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)', btnBg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    info: { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)', btnBg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  };
  const colors = variantColors[options.variant || 'danger'];

  const defaultIcon = options.variant === 'danger' ? 'fa-trash-can' : options.variant === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
  const iconClass = options.icon || defaultIcon;

  return (
    <>
      <div className={`confirm-overlay ${isClosing ? 'closing' : ''}`} onClick={() => handleClose(false)} />
      <div className={`confirm-dialog ${isClosing ? 'closing' : ''}`}>
        {/* Glow */}
        <div className="confirm-glow" />

        {/* Icon */}
        <div className="confirm-icon-wrap">
          <div className="confirm-icon-circle">
            <i className={`fa-solid ${iconClass}`} />
          </div>
        </div>

        {/* Text */}
        <h3 className="confirm-title">{options.title}</h3>
        <p className="confirm-message">{options.message}</p>

        {/* Buttons */}
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={() => handleClose(false)}>
            {options.cancelText}
          </button>
          <button className="confirm-btn-confirm" onClick={() => handleClose(true)}>
            <i className={`fa-solid ${iconClass}`} style={{ fontSize: '12px' }} />
            {options.confirmText}
          </button>
        </div>

        <style jsx>{`
          .confirm-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(6px);
            z-index: 10100;
            animation: confirmFadeIn 0.25s ease;
          }
          .confirm-overlay.closing { animation: confirmFadeOut 0.25s ease forwards; }

          .confirm-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            max-width: calc(100vw - 32px);
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(24px);
            border: 1px solid ${colors.accent}33;
            border-radius: 24px;
            padding: 32px 28px 28px;
            z-index: 10101;
            text-align: center;
            overflow: hidden;
            animation: confirmSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .confirm-dialog.closing {
            animation: confirmSlideOut 0.25s ease forwards;
          }

          .confirm-glow {
            position: absolute;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 130px;
            background: radial-gradient(ellipse, ${colors.glow} 0%, transparent 70%);
            pointer-events: none;
          }

          .confirm-icon-wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 18px;
            position: relative;
            z-index: 1;
          }
          .confirm-icon-circle {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: ${colors.accent}18;
            border: 2px solid ${colors.accent}44;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            color: ${colors.accent};
            animation: confirmPulse 2s ease-in-out infinite;
          }

          .confirm-title {
            color: #f1f5f9;
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 10px;
            letter-spacing: -0.02em;
          }
          .confirm-message {
            color: #94a3b8;
            font-size: 13.5px;
            line-height: 1.65;
            margin: 0 0 24px;
          }

          .confirm-actions {
            display: flex;
            gap: 12px;
          }
          .confirm-btn-cancel {
            flex: 1;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .confirm-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #e2e8f0;
            border-color: rgba(255, 255, 255, 0.15);
          }
          .confirm-btn-confirm {
            flex: 1;
            padding: 12px 16px;
            background: ${colors.btnBg};
            border: none;
            border-radius: 14px;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
            box-shadow: 0 4px 16px ${colors.accent}40;
          }
          .confirm-btn-confirm:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 24px ${colors.accent}55;
          }
          .confirm-btn-confirm:active {
            transform: translateY(0);
          }

          @keyframes confirmFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes confirmFadeOut { from { opacity: 1; } to { opacity: 0; } }
          @keyframes confirmSlideIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes confirmSlideOut {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          }
          @keyframes confirmPulse {
            0%, 100% { box-shadow: 0 0 0 0 ${colors.accent}30; }
            50% { box-shadow: 0 0 0 10px ${colors.accent}00; }
          }

          :global(html.light) .confirm-dialog {
            background: rgba(255, 255, 255, 0.97);
            border-color: ${colors.accent}22;
          }
          :global(html.light) .confirm-title { color: #0f172a; }
          :global(html.light) .confirm-message { color: #64748b; }
          :global(html.light) .confirm-btn-cancel {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(0, 0, 0, 0.08);
            color: #64748b;
          }
          :global(html.light) .confirm-btn-cancel:hover {
            background: rgba(0, 0, 0, 0.06);
            color: #0f172a;
          }
        `}</style>
      </div>
    </>
  );
}
