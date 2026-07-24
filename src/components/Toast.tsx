'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    toasts.forEach(toast => {
      const timer = setTimeout(() => removeToast(toast.id), toast.duration);
      return () => clearTimeout(timer);
    });
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              style={{
                background: 'var(--card-glass)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '300px',
                borderLeft: `4px solid ${getToastColor(toast.type)}`
              }}
            >
              <i className={getToastIcon(toast.type)} style={{ color: getToastColor(toast.type), fontSize: '20px' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function getToastColor(type?: Toast['type']): string {
  switch (type) {
    case 'success': return 'var(--success)';
    case 'error': return 'var(--danger)';
    case 'warning': return 'var(--warning)';
    default: return 'var(--primary)';
  }
}

function getToastIcon(type?: Toast['type']): string {
  switch (type) {
    case 'success': return 'fa-solid fa-check-circle';
    case 'error': return 'fa-solid fa-times-circle';
    case 'warning': return 'fa-solid fa-exclamation-triangle';
    default: return 'fa-solid fa-info-circle';
  }
}
