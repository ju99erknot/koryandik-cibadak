'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/db';
import type { Notification } from '@/lib/types';
import type { SessionUser } from '@/lib/types';
import { NOTIFICATIONS_UPDATED_EVENT } from '@/lib/notificationEvents';

function timeAgo(timestamp: string): string {
  const now = new Date().getTime();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function getTypeColor(type: Notification['type']): string {
  switch (type) {
    case 'upload': return '#3b82f6';
    case 'approved': return '#10b981';
    case 'rejected': return '#ef4444';
    case 'revision': return '#f59e0b';
    case 'announcement': return '#8b5cf6';
    case 'system': return '#64748b';
    default: return '#64748b';
  }
}

function getTypeLabel(type: Notification['type']): string {
  switch (type) {
    case 'upload': return 'Unggah';
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'revision': return 'Revisi';
    case 'announcement': return 'Pengumuman';
    case 'system': return 'Sistem';
    default: return 'Info';
  }
}

export default function NotificationCenter({ currentUser }: { currentUser?: SessionUser }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = useCallback(async () => {
    const role = currentUser?.role;
    const npsn = currentUser?.npsn;
    const gugusId = role === 'gugus' ? currentUser?.id : undefined;
    const notifications = await getNotifications(role, npsn, gugusId);
    setNotifications(notifications);
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, loadNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, loadNotifications);
    };
  }, [loadNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    const role = currentUser?.role;
    const npsn = currentUser?.npsn;
    const gugusId = role === 'gugus' ? currentUser?.id : undefined;
    await markAllNotificationsRead(role, npsn, gugusId);
    loadNotifications();
  };

  const handleClickNotif = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      loadNotifications();
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
        className={`icon-action-btn icon-action-btn-bell ${isOpen ? 'active' : ''}`}
        title="Notifikasi"
      >
        <i className="fa-solid fa-bell" style={{ 
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(-15deg)' : 'rotate(0deg)'
        }}></i>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 8px var(--danger-glow)',
            animation: 'notif-pulse 2s ease-in-out infinite'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panel notifikasi"
          aria-live="polite"
          style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: '0',
          width: '360px',
          maxHeight: '480px',
          background: 'var(--card-glass, rgba(30, 30, 40, 0.95))',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 'var(--z-notification)' as any,
          overflow: 'hidden',
          animation: 'notif-slide-in 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>
                <i className="fa-solid fa-bell" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
                Notifikasi
              </h3>
              {unreadCount > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {unreadCount} belum dibaca
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background 0.15s'
                }}
              >
                <i className="fa-solid fa-check-double" style={{ marginRight: '4px' }}></i>
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-bell-slash" style={{ fontSize: '28px', display: 'block', marginBottom: '10px', opacity: 0.4 }}></i>
                <p style={{ fontSize: '13px' }}>Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.map((notif, idx) => {
                const typeColor = getTypeColor(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotif(notif)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: idx < notifications.length - 1 ? '1px solid var(--card-border)' : 'none',
                      cursor: 'pointer',
                      background: notif.read ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      position: 'relative'
                    }}
                  >
                    {/* Unread dot */}
                    {!notif.read && (
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        boxShadow: '0 0 6px var(--primary)'
                      }}></div>
                    )}
                    
                    {/* Icon */}
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: `${typeColor}18`,
                      color: typeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                      <i className={notif.icon || 'fa-solid fa-info-circle'}></i>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: typeColor,
                          background: `${typeColor}15`,
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {getTypeLabel(notif.type)}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(notif.timestamp)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                        margin: '4px 0 0',
                        lineHeight: '1.4',
                        fontWeight: notif.read ? 'normal' : '500'
                      }}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes notif-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
