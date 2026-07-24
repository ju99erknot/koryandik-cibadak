'use client';

import React, { useState, useEffect } from 'react';
import { getCalendarEvents } from '@/lib/db';
import type { CalendarEvent } from '@/lib/types';

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

const DAY_LABELS = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

// Generate academic years from 2020 to 2030
const ACADEMIC_YEARS = Array.from({ length: 11 }, (_, i) => {
  const start = 2020 + i;
  return `${start}/${start + 1}`;
});

function getCategoryMeta(cat: CalendarEvent['category']) {
  switch (cat) {
    case 'submission': return { label: 'Tenggat Berkas', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: 'fa-file-arrow-up' };
    case 'meeting':    return { label: 'Rapat Koordinasi', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'fa-handshake' };
    case 'exam':       return { label: 'Ujian/Evaluasi', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'fa-file-pen' };
    case 'holiday':    return { label: 'Hari Libur', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: 'fa-umbrella-beach' };
    case 'event':      return { label: 'Kegiatan Guru', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: 'fa-chalkboard-user' };
    case 'reporting':  return { label: 'Pembagian Rapor', color: '#eab308', bg: 'rgba(234,179,8,0.12)', icon: 'fa-book-open' };
    case 'admission':  return { label: 'Pendaftaran PPDB', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: 'fa-user-plus' };
    case 'national':   return { label: 'Hari Besar / Upacara', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', icon: 'fa-flag' };
    default:           return { label: 'Agenda', color: 'var(--primary)', bg: 'var(--primary-glow)', icon: 'fa-calendar' };
  }
}

function exportToICS(event: CalendarEvent) {
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Koryandik Cibadak//ID',
    'BEGIN:VEVENT',
    `UID:${event.id}@koryandik`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${event.startDate.replace(/-/g,'')}`,
    `DTEND;VALUE=DATE:${event.endDate.replace(/-/g,'')}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description||''}`,
    `LOCATION:${event.location||'Koryandik Cibadak'}`,
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${event.title.replace(/\s+/g,'_')}.ics`;
  a.click();
}

interface AcademicCalendarProps {
  mode?: 'view' | 'edit';
  onDateSelect?: (dateStr: string) => void;
  onEventMove?: (eventId: string, targetDateStr: string) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  refreshTrigger?: number; // allow parent to trigger refresh
}

export default function AcademicCalendar({
  mode = 'view',
  onDateSelect,
  onEventMove,
  onEventSelect,
  refreshTrigger = 0
}: AcademicCalendarProps) {
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [current, setCurrent]         = useState(() => new Date(2026, 6, 10)); // July 10, 2026 static fallback
  const [selectedDate, setSelected]   = useState('2026-07-10'); // static fallback
  const [catFilter, setCatFilter]     = useState<string>('all');
  const [query, setQuery]             = useState('');
  const [view, setView]               = useState<'calendar'|'list'>('calendar');
  const [academicYear, setAcademicYear] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    return d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  });

  useEffect(() => {
    setCurrent(new Date());
    setSelected(new Date().toISOString().split('T')[0]);

    // Calculate current dynamic academic year
    const d = new Date();
    const y = d.getFullYear();
    const currentDynamicYear = d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

    // Load academic year from localStorage with auto-upgrade if outdated
    const savedYear = localStorage.getItem('koryandik_academic_year');
    if (savedYear && ACADEMIC_YEARS.includes(savedYear)) {
      const savedStart = parseInt(savedYear.split('/')[0], 10);
      const currentStart = parseInt(currentDynamicYear.split('/')[0], 10);
      
      if (savedStart < currentStart) {
        setAcademicYear(currentDynamicYear);
        localStorage.setItem('koryandik_academic_year', currentDynamicYear);
      } else {
        setAcademicYear(savedYear);
      }
    } else {
      setAcademicYear(currentDynamicYear);
      localStorage.setItem('koryandik_academic_year', currentDynamicYear);
    }
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      const freshEvents = await getCalendarEvents();
      setEvents(freshEvents);
    };
    loadEvents();
  }, [refreshTrigger]);

  // Save academic year to localStorage when changed
  useEffect(() => {
    localStorage.setItem('koryandik_academic_year', academicYear);
  }, [academicYear]);

  const year  = current.getFullYear();
  const month = current.getMonth();

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDay     = new Date(year, month, 1).getDay(); // Sun=0
  const prevOffset   = firstDay === 0 ? 6 : firstDay - 1; // Mon-start grid
  const prevDays     = new Date(year, month, 0).getDate();

  // Build cells: [Mon..Sun] week start
  const cells: { day: number; dateStr: string; curr: boolean }[] = [];
  for (let i = prevOffset; i > 0; i--) {
    const d = prevDays - i + 1;
    const m = month === 0 ? 12 : month; const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, curr: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, curr: true });
  }
  const tail = 42 - cells.length;
  for (let d = 1; d <= tail; d++) {
    const m = month === 11 ? 1 : month + 2; const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, curr: false });
  }

  const getEventsFor = (dateStr: string) => {
    const [startYear] = academicYear.split('/').map(Number);
    const endYear = startYear + 1;
    
    return events.filter(e => {
      const eventYear = new Date(e.startDate).getFullYear();
      // Academic year typically runs from July to June
      const isInAcademicYear = (eventYear === startYear && new Date(e.startDate).getMonth() >= 6) ||
                               (eventYear === endYear && new Date(e.startDate).getMonth() < 6);
      return dateStr >= e.startDate && dateStr <= e.endDate && isInAcademicYear;
    });
  };

  const selectedEvts = getEventsFor(selectedDate);

  const monthlyEvts = events.filter(e => {
    const s = new Date(e.startDate);
    const inMonth = s.getMonth() === month && s.getFullYear() === year;
    const matchQ   = e.title.toLowerCase().includes(query.toLowerCase());
    const matchCat = catFilter === 'all' || e.category === catFilter;
    
    // Filter by academic year
    const [startYear] = academicYear.split('/').map(Number);
    const endYear = startYear + 1;
    const eventYear = s.getFullYear();
    const isInAcademicYear = (eventYear === startYear && s.getMonth() >= 6) ||
                             (eventYear === endYear && s.getMonth() < 6);
    
    return inMonth && matchQ && matchCat && isInAcademicYear;
  }).sort((a,b) => a.startDate.localeCompare(b.startDate));

  const today = new Date().toISOString().split('T')[0];

  const CATEGORIES = [
    { id: 'all',        label: 'Semua',         color: '#6366f1' },
    { id: 'submission', label: 'Tenggat',        color: '#3b82f6' },
    { id: 'meeting',    label: 'Rapat',          color: '#10b981' },
    { id: 'exam',       label: 'Ujian',          color: '#f59e0b' },
    { id: 'holiday',    label: 'Libur',          color: '#ef4444' },
    { id: 'event',      label: 'Kegiatan',       color: '#8b5cf6' },
    { id: 'reporting',  label: 'Rapor',          color: '#eab308' },
    { id: 'admission',  label: 'PPDB',           color: '#06b6d4' },
    { id: 'national',   label: 'Hari Besar',     color: '#ec4899' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .acal-wrap {
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 28px;
          backdrop-filter: blur(24px);
          overflow: hidden;
        }
        .acal-header {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
        }
        .acal-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 60%);
        }
        .acal-header-inner {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .acal-title-group h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .acal-title-group p {
          margin: 4px 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.75);
        }
        .acal-month-nav {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.15);
          border-radius: 40px;
          backdrop-filter: blur(8px);
          padding: 4px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .acal-nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.9);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .acal-nav-btn:hover { background: rgba(255,255,255,0.25); }
        .acal-month-label {
          font-size: 14px;
          font-weight: 800;
          color: #fff;
          min-width: 140px;
          text-align: center;
          padding: 0 4px;
        }
        .acal-view-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .acal-view-tab {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          font-size: 11.5px;
          font-weight: 700;
          color: rgba(255,255,255,0.75);
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .acal-view-tab.active {
          background: rgba(255,255,255,0.9);
          color: var(--primary);
        }
        .acal-body {
          padding: 28px 32px;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 32px;
        }
        @media (max-width: 960px) {
          .acal-body {
            grid-template-columns: 1fr;
            padding: 20px;
            gap: 24px;
          }
          .acal-header { padding: 20px; }
          .acal-title-group h2 { font-size: 17px; }
        }
        @media (max-width: 640px) {
          .acal-header-inner { flex-direction: column; align-items: flex-start; gap: 12px; }
          .acal-month-nav { align-self: flex-start; }
        }

        /* Grid */
        .acal-grid-head {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 8px;
        }
        .acal-day-label {
          text-align: center;
          font-size: 10.5px;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 6px 0;
        }
        .acal-day-label.sunday { color: #ef4444; }
        .acal-grid-cells {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .acal-cell {
          aspect-ratio: 1;
          border-radius: 14px;
          border: 1.5px solid var(--card-border);
          background: var(--bg-space-dark);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 8px 4px 4px;
          gap: 3px;
          transition: all 0.2s cubic-bezier(.4,0,.2,1);
          position: relative;
          overflow: hidden;
        }
        .acal-cell:hover {
          border-color: var(--primary);
          transform: scale(1.06);
          box-shadow: 0 4px 18px rgba(0,0,0,0.2);
          z-index: 2;
        }
        .acal-cell.drag-over {
          border-color: var(--accent) !important;
          background: rgba(6, 182, 212, 0.18) !important;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.5) !important;
          transform: scale(1.04);
          z-index: 2;
        }
        .acal-cell.today-cell {
          border-color: var(--primary) !important;
          background: var(--primary-glow) !important;
        }
        .acal-cell.selected-cell {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
          box-shadow: 0 0 20px var(--primary-glow);
        }
        .acal-cell.selected-cell .acal-cell-num {
          color: #fff !important;
        }
        .acal-cell.not-curr { opacity: 0.28; }
        .acal-cell-num {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .acal-cell-num.sunday-num { color: #ef4444; }
        .acal-cell-dots {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2px;
          max-width: 100%;
        }
        .acal-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        /* Category chips */
        .acal-cat-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding-top: 12px;
        }
        .acal-cat-chip {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 750;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }

        /* Right panel */
        .acal-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
          border-left: 1px solid var(--card-border);
          padding-left: 32px;
        }
        @media (max-width: 960px) {
          .acal-right {
            border-left: none;
            padding-left: 0;
            border-top: 1px solid var(--card-border);
            padding-top: 24px;
          }
        }

        .acal-sel-date-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--primary);
        }
        .acal-sel-date-sub {
          font-size: 19px;
          font-weight: 900;
          color: var(--text-primary);
          margin: 3px 0 0;
          letter-spacing: -0.3px;
        }

        .acal-evt-card {
          padding: 14px 16px;
          background: var(--bg-space-dark);
          border: 1.5px solid var(--card-border);
          border-radius: 16px;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .acal-evt-card:hover {
          transform: translateX(6px);
          border-color: var(--primary);
        }

        .acal-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-space-dark);
          border: 1.5px solid var(--card-border);
          border-radius: 12px;
          padding: 8px 14px;
          transition: border-color 0.2s;
        }
        .acal-search:focus-within { border-color: var(--primary); }
        .acal-search input {
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 12px;
          flex: 1;
          outline: none;
        }
        .acal-search input::placeholder { color: var(--text-secondary); }

        .acal-scroller {
          flex: 1;
          overflow-y: auto;
          max-height: 340px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 4px;
        }
        .acal-scroller::-webkit-scrollbar { width: 4px; }
        .acal-scroller::-webkit-scrollbar-track { background: transparent; }
        .acal-scroller::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 4px; }

        /* LIST VIEW */
        .acal-list-body {
          padding: 24px 32px;
        }
        @media (max-width: 640px) {
          .acal-list-body { padding: 16px; }
        }
        .acal-list-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 16px;
          background: var(--bg-space-dark);
          border: 1.5px solid var(--card-border);
          border-radius: 16px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .acal-list-item:hover {
          border-color: var(--primary);
          transform: translateX(4px);
        }
        .acal-list-date-box {
          min-width: 52px;
          padding: 8px;
          border-radius: 12px;
          text-align: center;
          flex-shrink: 0;
        }
        .acal-list-date-day { font-size: 22px; font-weight: 900; color: #fff; line-height: 1; }
        .acal-list-date-mon { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.75); text-transform: uppercase; margin-top: 2px; }
      ` }} />

      <div className="acal-wrap">
        {/* ───── HEADER ───── */}
        <div className="acal-header">
          <div className="acal-header-inner">
            <div className="acal-title-group">
              <h2>
                <i className="fa-solid fa-calendar-days" style={{ marginRight: 10 }} />
                Kalender &amp; Agenda Akademik
              </h2>
              <p>Koryandik Wilayah Kecamatan Cibadak — Tahun Pelajaran {academicYear}</p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Academic Year Selector */}
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {ACADEMIC_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {/* View Toggle */}
              <div className="acal-view-tabs">
                <button className={`acal-view-tab${view==='calendar'?' active':''}`} onClick={()=>setView('calendar')}>
                  <i className="fa-solid fa-table-cells-large" style={{ marginRight: 5 }} />Kalender
                </button>
                <button className={`acal-view-tab${view==='list'?' active':''}`} onClick={()=>setView('list')}>
                  <i className="fa-solid fa-list" style={{ marginRight: 5 }} />Daftar
                </button>
              </div>

              {/* Month Nav */}
              <div className="acal-month-nav">
                <button className="acal-nav-btn" onClick={()=>setCurrent(new Date(year,month-1,1))} aria-label="Sebelumnya">
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <span className="acal-month-label">{MONTH_NAMES[month]} {year}</span>
                <button className="acal-nav-btn" onClick={()=>setCurrent(new Date(year,month+1,1))} aria-label="Berikutnya">
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ───── CALENDAR VIEW ───── */}
        {view === 'calendar' && (
          <div className="acal-body">
            {/* LEFT: Grid + Category chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Day labels */}
              <div className="acal-grid-head">
                {DAY_LABELS.map((d,i) => (
                  <div key={d} className={`acal-day-label${i===6?' sunday':''}`}>{d}</div>
                ))}
              </div>

              {/* Cells */}
              <div className="acal-grid-cells">
                {cells.map((cell, idx) => {
                  const cellEvts = getEventsFor(cell.dateStr);
                  const isSelected = cell.dateStr === selectedDate;
                  const isToday    = cell.dateStr === today;
                  // Column index 0=Mon…6=Sun (idx % 7)
                  const isSunday   = idx % 7 === 6;
                  return (
                    <div
                      key={idx}
                      className={[
                        'acal-cell',
                        !cell.curr ? 'not-curr' : '',
                        isToday && !isSelected ? 'today-cell' : '',
                        isSelected ? 'selected-cell' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        setSelected(cell.dateStr);
                        onDateSelect?.(cell.dateStr);
                      }}
                      onDragOver={(e) => {
                        if (mode === 'edit') {
                          e.preventDefault();
                          e.currentTarget.classList.add('drag-over');
                        }
                      }}
                      onDragLeave={(e) => {
                        if (mode === 'edit') {
                          e.currentTarget.classList.remove('drag-over');
                        }
                      }}
                      onDrop={(e) => {
                        if (mode === 'edit') {
                          e.currentTarget.classList.remove('drag-over');
                          const rawData = e.dataTransfer.getData('text/plain');
                          if (rawData && onEventMove) {
                            onEventMove(rawData, cell.dateStr);
                          }
                        }
                      }}
                      onDoubleClick={() => {
                        if (mode === 'edit' && onDateSelect) {
                          setSelected(cell.dateStr);
                          onDateSelect(cell.dateStr);
                        }
                      }}
                    >
                      <span className={`acal-cell-num${isSunday&&!isSelected?' sunday-num':''}`}>
                        {cell.day}
                      </span>
                      <div className="acal-cell-dots">
                        {cellEvts.slice(0,3).map(evt => (
                          <span
                            key={evt.id}
                            className="acal-dot"
                            style={{ background: getCategoryMeta(evt.category).color }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Category filter chips */}
              <div className="acal-cat-chips">
                {CATEGORIES.map(cat => {
                  const active = catFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      className="acal-cat-chip"
                      style={{
                        background: active ? cat.color : 'var(--bg-space-dark)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        borderColor: active ? cat.color : 'var(--card-border)',
                      }}
                      onClick={() => setCatFilter(cat.id)}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', paddingTop:4 }}>
                {CATEGORIES.slice(1).map(cat=>(
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:cat.color, display:'inline-block' }} />
                    <span style={{ fontSize:'10.5px', color:'var(--text-secondary)', fontWeight:600 }}>{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Selected date + Monthly feed */}
            <div className="acal-right">
              {/* Selected date heading */}
              <div>
                <div className="acal-sel-date-title">Agenda Terpilih</div>
                <div className="acal-sel-date-sub">
                  {(() => {
                    const [y2,m2,d2] = selectedDate.split('-').map(Number);
                    const dt = new Date(y2, m2-1, d2);
                    const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dt.getDay()];
                    return `${hari}, ${d2} ${MONTH_NAMES[m2-1]} ${y2}`;
                  })()}
                </div>
              </div>

              {/* Selected date events */}
              <div>
                {selectedEvts.length > 0 ? selectedEvts.map(evt => {
                  const meta = getCategoryMeta(evt.category);
                  return (
                    <div
                      key={evt.id}
                      className="acal-evt-card"
                      style={{ borderLeft: `4px solid ${meta.color}`, marginBottom: 10, cursor: mode === 'edit' ? 'grab' : 'pointer' }}
                      draggable={mode === 'edit'}
                      onDragStart={(e) => {
                        if (mode === 'edit') {
                          e.dataTransfer.setData('text/plain', `event:${evt.id}`);
                        }
                      }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div>
                          <span style={{ fontSize:'10px', fontWeight:800, color:meta.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                            <i className={`fa-solid ${meta.icon}`} style={{ marginRight:4 }} />{meta.label}
                          </span>
                          <h4 style={{ margin:'4px 0 6px', fontSize:'13px', fontWeight:850, color:'var(--text-primary)', lineHeight:1.3 }}>
                            {evt.title}
                          </h4>
                          {evt.description && (
                            <p style={{ margin:0, fontSize:'11.5px', color:'var(--text-secondary)', lineHeight:1.5 }}>
                              {evt.description}
                            </p>
                          )}
                          {evt.location && (
                            <div style={{ marginTop:6, fontSize:'11px', color:'var(--text-secondary)' }}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight:4, color:'#ef4444' }} />
                              {evt.location}
                            </div>
                          )}
                        </div>
                        {mode === 'edit' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventSelect?.(evt);
                            }}
                            title="Edit Agenda"
                            style={{
                              border:'none', background: 'rgba(255, 255, 255, 0.15)', borderRadius:8, color: 'var(--text-primary)',
                              width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center',
                              justifyContent:'center', flexShrink:0, fontSize:13
                            }}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                        ) : (
                          <button
                            onClick={() => exportToICS(evt)}
                            title="Ekspor ke Kalender (.ics)"
                            style={{
                              border:'none', background: meta.bg, borderRadius:8, color: meta.color,
                              width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center',
                              justifyContent:'center', flexShrink:0, fontSize:13
                            }}
                          >
                            <i className="fa-solid fa-calendar-plus" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{
                    padding:'20px',
                    background:'var(--bg-space-dark)',
                    border:'1.5px dashed var(--card-border)',
                    borderRadius:16,
                    textAlign:'center',
                    color:'var(--text-secondary)',
                    fontSize:12
                  }}>
                    <i className="fa-regular fa-calendar-xmark" style={{ display:'block', fontSize:24, marginBottom:8, opacity:0.4 }} />
                    Tidak ada agenda pada tanggal ini
                  </div>
                )}
              </div>

              {/* Monthly events with search */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1, overflow:'hidden' }}>
                <div style={{ fontSize:'11px', fontWeight:800, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', borderTop:'1px solid var(--card-border)', paddingTop:16 }}>
                  Semua Agenda — {MONTH_NAMES[month]}
                </div>

                <div className="acal-search">
                  <i className="fa-solid fa-magnifying-glass" style={{ color:'var(--text-secondary)', fontSize:11 }} />
                  <input
                    placeholder="Cari agenda bulan ini..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>

                <div className="acal-scroller">
                  {monthlyEvts.length > 0 ? monthlyEvts.map(evt => {
                    const meta = getCategoryMeta(evt.category);
                    const [,em,ed] = evt.startDate.split('-').map(Number);
                    return (
                      <div
                        key={evt.id}
                        className="acal-evt-card"
                        style={{ borderLeft:`3px solid ${meta.color}`, padding:'10px 14px', cursor: mode === 'edit' ? 'grab' : 'pointer' }}
                        draggable={mode === 'edit'}
                        onDragStart={(e) => {
                          if (mode === 'edit') {
                            e.dataTransfer.setData('text/plain', `event:${evt.id}`);
                          }
                        }}
                        onClick={() => {
                          setSelected(evt.startDate);
                          onDateSelect?.(evt.startDate);
                        }}
                      >
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                          <span style={{ fontSize:'10px', fontWeight:800, color:meta.color, textTransform:'uppercase' }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize:'10px', color:'var(--text-secondary)', flexShrink:0 }}>
                            {ed} {MONTH_NAMES[em-1].slice(0,3)}
                          </span>
                        </div>
                        <div style={{ fontSize:'12px', fontWeight:750, color:'var(--text-primary)', marginTop:3 }}>
                          {evt.title}
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-secondary)', fontSize:12 }}>
                      <i className="fa-solid fa-box-open" style={{ display:'block', opacity:0.3, fontSize:20, marginBottom:8 }} />
                      Tidak ada agenda yang cocok
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── LIST VIEW ───── */}
        {view === 'list' && (
          <div className="acal-list-body">
            {/* Search + filter */}
            <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
              <div className="acal-search" style={{ flex:1, minWidth:200 }}>
                <i className="fa-solid fa-magnifying-glass" style={{ color:'var(--text-secondary)', fontSize:11 }} />
                <input placeholder="Cari agenda..." value={query} onChange={e=>setQuery(e.target.value)} />
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CATEGORIES.map(cat => {
                  const active = catFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      className="acal-cat-chip"
                      style={{
                        background: active ? cat.color : 'var(--bg-space-dark)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        borderColor: active ? cat.color : 'var(--card-border)',
                      }}
                      onClick={() => setCatFilter(cat.id)}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {monthlyEvts.length > 0 ? monthlyEvts.map(evt => {
              const meta = getCategoryMeta(evt.category);
              const [,em,ed] = evt.startDate.split('-').map(Number);
              return (
                <div
                  key={evt.id}
                  className="acal-list-item"
                  style={{ borderLeft:`4px solid ${meta.color}`, cursor: mode === 'edit' ? 'grab' : 'pointer' }}
                  draggable={mode === 'edit'}
                  onDragStart={(e) => {
                    if (mode === 'edit') {
                      e.dataTransfer.setData('text/plain', `event:${evt.id}`);
                    }
                  }}
                  onClick={() => {
                    setSelected(evt.startDate);
                    onDateSelect?.(evt.startDate);
                  }}
                >
                  <div className="acal-list-date-box" style={{ background: meta.color }}>
                    <div className="acal-list-date-day">{ed}</div>
                    <div className="acal-list-date-mon">{MONTH_NAMES[em-1].slice(0,3)}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:'10px', fontWeight:800, color:meta.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <i className={`fa-solid ${meta.icon}`} style={{ marginRight:4 }} />
                      {meta.label}
                      {evt.targetAudience !== 'all' && (
                        <span style={{ marginLeft:6, color:'var(--text-secondary)', textTransform:'none', fontWeight:600 }}>
                          · {evt.targetAudience === 'school' ? 'Sekolah Binaan' : evt.targetAudience === 'teacher' ? 'Guru' : 'Gugus'}
                        </span>
                      )}
                    </span>
                    <h4 style={{ margin:'4px 0 6px', fontSize:'14px', fontWeight:850, color:'var(--text-primary)' }}>
                      {evt.title}
                    </h4>
                    {evt.description && (
                      <p style={{ margin:0, fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.5 }}>
                        {evt.description}
                      </p>
                    )}
                    {evt.location && (
                      <div style={{ marginTop:6, fontSize:'11px', color:'var(--text-secondary)' }}>
                        <i className="fa-solid fa-location-dot" style={{ marginRight:4, color:'#ef4444' }} />
                        {evt.location}
                      </div>
                    )}
                  </div>
                  {mode === 'edit' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventSelect?.(evt);
                      }}
                      title="Edit Agenda"
                      style={{
                        border:'none', background: 'rgba(255, 255, 255, 0.15)', borderRadius:10, color: 'var(--text-primary)',
                        width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center',
                        justifyContent:'center', flexShrink:0, alignSelf:'center', fontSize:14
                      }}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                  ) : (
                    <button
                      onClick={() => exportToICS(evt)}
                      title="Ekspor .ics"
                      style={{
                        border:'none', background: meta.bg, borderRadius:10, color: meta.color,
                        width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center',
                        justifyContent:'center', flexShrink:0, alignSelf:'center', fontSize:14
                      }}
                    >
                      <i className="fa-solid fa-calendar-plus" />
                    </button>
                  )}
                </div>
              );
            }) : (
              <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-secondary)' }}>
                <i className="fa-solid fa-box-open" style={{ display:'block', fontSize:32, opacity:0.3, marginBottom:12 }} />
                <div style={{ fontSize:14, fontWeight:600 }}>Tidak ada agenda di bulan {MONTH_NAMES[month]}</div>
                <div style={{ fontSize:12, marginTop:4 }}>Coba navigasi ke bulan lain atau ubah filter</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
