'use client';
import React, { useEffect, useState } from 'react';
import { getLogs, getSchools } from '@/lib/db';
import type { LogEntry } from '@/lib/db';
import type { School } from '@/lib/schoolsData';

interface ActivityEvent {
  id: string;
  time: string;
  school: string;
  action: string;
  status: 'info' | 'success' | 'warning';
  icon: string;
}

export default function LiveRadar() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Load real data
    const loadData = async () => {
      const [schoolsData, logsData] = await Promise.all([
        getSchools(),
        getLogs()
      ]);
      setSchools(schoolsData);
      setLogs(logsData);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!logs.length || !schools.length) return;

    // Convert logs to activity events
    const recentLogs = logs.slice(0, 5);
    const activityEvents: ActivityEvent[] = recentLogs.map((log) => {
      // Smart school name resolution from log details
      let schoolName = 'Sistem';

      if (log.details) {
        // Try to match by NPSN first (most reliable)
        const npsnMatch = log.details.match(/\b(\d{8})\b/);
        if (npsnMatch) {
          const byNpsn = schools.find(s => s.npsn === npsnMatch[1]);
          if (byNpsn) schoolName = byNpsn.name;
        }

        // Try to extract school name from "Sekolah Koordinator: <name>" pattern
        if (schoolName === 'Sistem') {
          const koordMatch = log.details.match(/Sekolah Koordinator:\s*(.+?)(?:$|,|\n)/i);
          if (koordMatch) {
            const extractedName = koordMatch[1].trim();
            const byName = schools.find(s =>
              s.name.toLowerCase() === extractedName.toLowerCase() ||
              extractedName.toLowerCase().includes(s.name.toLowerCase().split(' ').slice(0, 3).join(' ').toLowerCase())
            );
            schoolName = byName ? byName.name : extractedName;
          }
        }

        // Fallback: partial name match against all schools
        if (schoolName === 'Sistem') {
          const byPartialName = schools.find(s =>
            log.details?.toLowerCase().includes(s.name.toLowerCase().substring(0, 12))
          );
          if (byPartialName) schoolName = byPartialName.name;
        }

        // Fallback: match by school user field
        if (schoolName === 'Sistem' && log.user && log.user !== 'Admin') {
          const byUser = schools.find(s =>
            s.operatorName?.toLowerCase().includes(log.user.toLowerCase()) ||
            log.user.toLowerCase().includes(s.npsn)
          );
          if (byUser) schoolName = byUser.name;
        }
      }

      let status: 'info' | 'success' | 'warning' = 'info';
      let icon = 'fa-circle-info';

      if (log.action.toLowerCase().includes('approve') || log.action.toLowerCase().includes('disetujui')) {
        status = 'success';
        icon = 'fa-circle-check';
      } else if (log.action.toLowerCase().includes('reject') || log.action.toLowerCase().includes('ditolak')) {
        status = 'warning';
        icon = 'fa-circle-xmark';
      } else if (log.action.toLowerCase().includes('upload') || log.action.toLowerCase().includes('unggah')) {
        status = 'success';
        icon = 'fa-file-arrow-up';
      } else if (log.action.toLowerCase().includes('ubah sekolah koordinator') || log.action.toLowerCase().includes('koordinator')) {
        status = 'info';
        icon = 'fa-school';
      } else if (log.action.toLowerCase().includes('update') || log.action.toLowerCase().includes('perbarui') || log.action.toLowerCase().includes('pindah')) {
        status = 'info';
        icon = 'fa-rotate';
      }

      // Calculate time ago
      const timeDiff = Date.now() - new Date(log.timestamp).getTime();
      let timeAgo = 'Baru saja';
      if (timeDiff > 60000) timeAgo = `${Math.floor(timeDiff / 60000)} menit lalu`;
      if (timeDiff > 3600000) timeAgo = `${Math.floor(timeDiff / 3600000)} jam lalu`;
      if (timeDiff > 86400000) timeAgo = `${Math.floor(timeDiff / 86400000)} hari lalu`;

      return {
        id: log.id,
        time: timeAgo,
        school: schoolName,
        action: log.action,
        status,
        icon
      };
    });

    setEvents(activityEvents);
  }, [logs, schools]);

  // Poll for new logs every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const logsData = await getLogs();
      setLogs(logsData);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-radar-container">
      <div className="radar-visual">
        <div className="radar-sweep"></div>
        <div className="radar-circle circle-1"></div>
        <div className="radar-circle circle-2"></div>
        <div className="radar-circle circle-3"></div>
        <div className="radar-dot dot-1"></div>
        <div className="radar-dot dot-2"></div>
        <div className="radar-dot dot-3"></div>
        <div className="radar-title">CIBADAK CLOUD RADAR</div>
      </div>

      <div className="radar-feed">
        <div className="feed-header">
          <span className="feed-badge"><span className="live-pulse"></span> LIVE MONITORING</span>
          <h4>Radar Log Aktivitas Sekolah</h4>
        </div>
        
        <div className="events-list">
          {events.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '8px' }}>
              <i className="fa-solid fa-satellite-dish" style={{ fontSize: '28px', color: 'var(--text-secondary)', opacity: 0.4 }}></i>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Belum ada aktivitas terdeteksi</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className={`event-card ${event.status}`}>
                <div className="event-icon">
                  <i className={`fa-solid ${event.icon}`}></i>
                </div>
                <div className="event-info">
                  <div className="event-meta">
                    <span className="event-school">{event.school}</span>
                    <span className="event-time">{event.time}</span>
                  </div>
                  <p className="event-action">{event.action}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .live-radar-container {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 30px;
          align-items: center;
          padding: 20px 0;
        }
        @media (max-width: 768px) {
          .live-radar-container { grid-template-columns: 1fr; }
        }
        .radar-visual {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          max-width: 280px;
          background: var(--bg-space-dark);
          border: 2px solid rgba(0, 240, 255, 0.3);
          border-radius: 50%;
          margin: 0 auto;
          overflow: hidden;
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.1);
        }
        html:not(.dark) .radar-visual {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.15);
        }
        .radar-sweep {
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background: conic-gradient(from 0deg, rgba(0, 240, 255, 0.2) 0deg, rgba(0, 240, 255, 0) 90deg);
          animation: sweep 4s infinite linear;
          transform-origin: center;
        }
        html:not(.dark) .radar-sweep {
          background: conic-gradient(from 0deg, rgba(59, 130, 246, 0.25) 0deg, rgba(59, 130, 246, 0) 90deg);
        }
        .radar-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 1px dashed rgba(0, 240, 255, 0.2);
          border-radius: 50%;
        }
        html:not(.dark) .radar-circle {
          border-color: rgba(59, 130, 246, 0.25);
        }
        .circle-1 { width: 30%; height: 30%; }
        .circle-2 { width: 60%; height: 60%; }
        .circle-3 { width: 90%; height: 90%; }
        
        .radar-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #00f0ff;
          border-radius: 50%;
          box-shadow: 0 0 10px #00f0ff, 0 0 20px #00f0ff;
          animation: ping 1.5s infinite ease-in-out;
        }
        html:not(.dark) .radar-dot {
          background: #3b82f6;
          box-shadow: 0 0 10px #3b82f6, 0 0 20px #3b82f6;
        }
        .dot-1 { top: 30%; left: 40%; animation-delay: 0.5s; }
        .dot-2 { top: 60%; left: 75%; animation-delay: 1.2s; }
        .dot-3 { top: 75%; left: 25%; animation-delay: 2.1s; }

        .radar-title {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-family: monospace;
          color: rgba(0, 240, 255, 0.6);
          letter-spacing: 2px;
          font-weight: bold;
        }
        html:not(.dark) .radar-title {
          color: rgba(59, 130, 246, 0.7);
        }

        .radar-feed {
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .feed-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .feed-badge {
          align-self: flex-start;
          font-size: 10px;
          font-weight: 800;
          color: var(--danger);
          background: var(--danger-glow);
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
        }
        .live-pulse {
          width: 6px;
          height: 6px;
          background: var(--danger);
          border-radius: 50%;
          animation: pulse 1s infinite alternate;
        }
        .feed-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 300px;
          overflow-y: auto;
        }
        .event-card {
          display: flex;
          gap: 14px;
          padding: 12px;
          background: var(--card-glass);
          border-radius: 12px;
          border-left: 3px solid transparent;
          animation: slideIn 0.3s ease;
          transition: all 0.2s ease;
        }
        .event-card.success { border-left-color: var(--success); }
        .event-card.info { border-left-color: var(--primary); }
        .event-card.warning { border-left-color: var(--warning); }
        
        .event-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .success .event-icon { background: var(--success-glow); color: var(--success); }
        .info .event-icon { background: var(--primary-glow); color: var(--primary); }
        .warning .event-icon { background: var(--warning-glow); color: var(--warning); }

        .event-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
        .event-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .event-school {
          font-weight: 700;
          color: var(--text-primary);
        }
        .event-time {
          color: var(--text-muted);
        }
        .event-action {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
        }

        @keyframes sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
