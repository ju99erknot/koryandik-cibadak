'use client';

import React, { useState, useEffect } from 'react';
import { getUnreadNotificationCount } from '@/lib/db';
import { NOTIFICATIONS_UPDATED_EVENT } from '@/lib/notificationEvents';

interface NotificationBadgeProps {
  role?: string;
  npsn?: string;
  gugusId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function NotificationBadge({ role, npsn, gugusId, className, style }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount(role, npsn, gugusId);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    const handleUpdate = () => loadUnreadCount();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdate);
    };
  }, [role, npsn, gugusId]);

  if (unreadCount === 0) return null;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--primary, #3b82f6)',
        color: '#ffffff',
        fontSize: '10px',
        fontWeight: 'bold',
        borderRadius: '8px',
        padding: '2px 6px',
        minWidth: '18px',
        height: '16px',
        marginLeft: 'auto',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
        animation: 'badge-pulse 2s ease-in-out infinite',
        ...style
      }}
    >
      {unreadCount > 9 ? '9+' : unreadCount}

      <style jsx global>{`
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </span>
  );
}
