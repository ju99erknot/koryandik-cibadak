'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import { toast } from 'sonner';
import { toggleThemeWithTransition } from '@/lib/theme';
import CommandPalette from '@/components/CommandPalette';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import { getSchools, getDownloads, incrementDownloadCount } from '@/lib/db';
import type { DownloadItem } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';

type DownloadCategory = 'all' | 'surat' | 'format' | 'sk';
type FileType = 'all' | 'PDF' | 'DOCX' | 'XLSX';
type SortMode = 'newest' | 'oldest' | 'name' | 'downloads';

const CATEGORIES = [
  { id: 'all', label: 'Semua Dokumen', icon: 'fa-layer-group', gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
  { id: 'surat', label: 'Surat Undangan', icon: 'fa-envelope-open-text', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  { id: 'format', label: 'Format Berkas', icon: 'fa-table-columns', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { id: 'sk', label: 'SK & Dokumen', icon: 'fa-file-signature', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
] as const;

const FILE_TYPES: { id: FileType; label: string; color: string }[] = [
  { id: 'all', label: 'Semua Tipe', color: 'var(--text-secondary)' },
  { id: 'PDF', label: 'PDF', color: '#ef4444' },
  { id: 'DOCX', label: 'Word', color: '#3b82f6' },
  { id: 'XLSX', label: 'Excel', color: '#10b981' },
];

function getFileTypeStyle(type: string) {
  switch (type) {
    case 'PDF': return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: 'fa-file-pdf' };
    case 'DOCX': return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: 'fa-file-word' };
    case 'XLSX': return { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: 'fa-file-excel' };
    default: return { bg: 'var(--primary-glow)', color: 'var(--primary)', icon: 'fa-file' };
  }
}

function getCategoryStyle(cat: string) {
  switch (cat) {
    case 'surat': return { gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', glow: 'rgba(99,102,241,0.25)' };
    case 'format': return { gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', glow: 'rgba(16,185,129,0.25)' };
    case 'sk': return { gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', glow: 'rgba(245,158,11,0.25)' };
    default: return { gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', glow: 'rgba(59,130,246,0.25)' };
  }
}

// Animated counter
function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString('id-ID')}</span>;
}

export default function UnduhanPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<DownloadCategory>('all');
  const [activeFileType, setActiveFileType] = useState<FileType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolCount, setSchoolCount] = useState(49);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DownloadItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchDownloads = useCallback(async () => {
    const data = await getDownloads();
    setDownloads(data);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [schools] = await Promise.all([getSchools(), fetchDownloads()]);
      if (schools.length > 0) setSchoolCount(schools.length);
      setLoading(false);
    };
    loadData();
  }, [fetchDownloads]);

  useScrollReveal([downloads, searchQuery, activeCategory, loading]);

  const handleDownload = async (item: DownloadItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (downloadingId === item.id) return;
    setDownloadingId(item.id);
    try {
      await incrementDownloadCount(item.id);
      await fetchDownloads();
      if (item.downloadUrl) {
        window.open(item.downloadUrl, '_blank');
        toast.success(`✅ Mengunduh: ${item.title}`);
      } else {
        toast.error('Link download tidak tersedia.');
      }
    } catch {
      toast.error('Gagal memproses unduhan berkas.');
    } finally {
      setTimeout(() => setDownloadingId(null), 1200);
    }
  };

  const openDetail = (item: DownloadItem) => {
    setSelectedDoc(item);
    setIsDetailOpen(true);
  };

  const filteredDownloads = downloads
    .filter(item => {
      const catMatch = activeCategory === 'all' || item.category === activeCategory;
      const typeMatch = activeFileType === 'all' || item.fileType === activeFileType;
      const q = searchQuery.toLowerCase();
      const searchMatch = !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      return catMatch && typeMatch && searchMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.updatedAt.localeCompare(a.updatedAt);
        case 'oldest': return a.updatedAt.localeCompare(b.updatedAt);
        case 'name': return a.title.localeCompare(b.title);
        case 'downloads': return (b.downloadCount || 0) - (a.downloadCount || 0);
        default: return 0;
      }
    });

  const totalDownloads = downloads.reduce((acc, d) => acc + (d.downloadCount || 0), 0);

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        /* ─── DL HUB DESIGN SYSTEM ─── */
        .dlhub-wrapper { min-height: 100vh; background: var(--bg-space); }

        /* HERO */
        .dlhub-hero {
          position: relative;
          padding: 20px 0 60px;
          overflow: hidden;
          text-align: center;
        }
        .dlhub-hero-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: dlOrb 8s ease-in-out infinite alternate;
        }
        @keyframes dlOrb {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.15) translate(20px, -20px); }
        }
        .dlhub-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 100px;
          background: var(--primary-glow);
          border: 1px solid rgba(59,130,246,0.3);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--primary);
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .dlhub-hero h1 {
          font-size: clamp(1.8rem, 3.8vw, 2.5rem);
          font-weight: 900;
          line-height: 1.25;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
        }
        .dlhub-hero-subtitle {
          font-size: 16px;
          color: var(--text-secondary);
          max-width: 580px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }

        /* STATS STRIP */
        .dlhub-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }
        .dlhub-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 36px;
          border-right: 1px solid var(--card-border);
        }
        .dlhub-stat-item:last-child { border-right: none; }
        .dlhub-stat-num {
          font-size: 2rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 4px;
        }
        .dlhub-stat-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* SEARCH BAR */
        .dlhub-search-wrap {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }
        .dlhub-search-input {
          width: 100%;
          padding: 16px 56px 16px 52px;
          border-radius: 100px;
          border: 1.5px solid var(--card-border);
          background: var(--card-glass);
          backdrop-filter: blur(12px);
          color: var(--text-primary);
          font-size: 15px;
          font-family: inherit;
          transition: all 0.25s ease;
          outline: none;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .dlhub-search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-glow), 0 8px 32px rgba(0,0,0,0.08);
        }
        .dlhub-search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 16px;
          pointer-events: none;
        }
        .dlhub-search-clear {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 12px;
          transition: all 0.2s;
        }
        .dlhub-search-clear:hover { background: var(--danger-glow); color: var(--danger); }

        /* LAYOUT */
        .dlhub-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
          align-items: start;
          padding: 0 0 80px;
        }
        @media (max-width: 900px) {
          .dlhub-layout { grid-template-columns: 1fr; }
          .dlhub-sidebar { position: static !important; }
        }

        /* SIDEBAR */
        .dlhub-sidebar {
          position: sticky;
          top: 90px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dlhub-sidebar-section {
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
        }
        .dlhub-sidebar-title {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 14px;
          padding-left: 4px;
        }
        .dlhub-cat-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          transition: all 0.2s ease;
          margin-bottom: 4px;
          position: relative;
          overflow: hidden;
        }
        .dlhub-cat-btn:last-child { margin-bottom: 0; }
        .dlhub-cat-btn:hover {
          background: var(--primary-glow);
          color: var(--primary);
        }
        .dlhub-cat-btn.active {
          background: var(--primary-glow);
          color: var(--primary);
        }
        .dlhub-cat-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .dlhub-cat-count {
          margin-left: auto;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          color: var(--text-muted);
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .dlhub-cat-btn.active .dlhub-cat-count {
          background: var(--primary);
          color: #fff;
          border-color: transparent;
        }

        /* FILE TYPE PILLS */
        .dlhub-type-pills {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dlhub-type-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.2s;
          text-align: left;
        }
        .dlhub-type-pill:hover { background: var(--bg-space-dark); }
        .dlhub-type-pill.active { background: var(--bg-space-dark); color: var(--text-primary); }
        .dlhub-type-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* SORT + TOOLBAR */
        .dlhub-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }
        .dlhub-results-label {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .dlhub-results-label strong {
          color: var(--text-primary);
          font-size: 15px;
        }
        .dlhub-sort-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 6px 14px;
        }
        .dlhub-sort-wrap span { font-size: 12px; color: var(--text-muted); font-weight: 600; white-space: nowrap; }
        .dlhub-sort-select {
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          outline: none;
          padding: 2px 0;
        }

        /* CARDS GRID */
        .dlhub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        /* CARD */
        .dlhub-card {
          background: var(--card-glass);
          border: 1px solid var(--card-border);
          border-radius: 22px;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease, border-color 0.3s ease;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(12px);
          position: relative;
          will-change: transform;
        }
        .dlhub-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 22px;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(59,130,246,0.04), rgba(6,182,212,0.04));
        }
        .dlhub-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(59,130,246,0.2);
          border-color: rgba(59,130,246,0.3);
        }
        .dlhub-card:hover::before { opacity: 1; }

        .dlhub-card-thumb {
          position: relative;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 22px 22px 0 0;
          flex-shrink: 0;
        }
        .dlhub-card-thumb::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3));
        }
        .dlhub-thumb-icon {
          font-size: 36px;
          color: rgba(255,255,255,0.9);
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
        }
        .dlhub-thumb-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .dlhub-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          animation: dlParticle var(--dur, 4s) ease-in-out infinite var(--del, 0s) alternate;
        }
        @keyframes dlParticle {
          from { transform: translate(0, 0) scale(1); opacity: 0.4; }
          to   { transform: translate(var(--tx, 10px), var(--ty, -12px)) scale(1.4); opacity: 0.1; }
        }

        /* CARD BADGES */
        .dlhub-card-badges {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          z-index: 2;
        }
        .dlhub-filetype-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          backdrop-filter: blur(8px);
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff;
        }
        .dlhub-hot-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 100px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          background: rgba(245,158,11,0.85);
          color: #fff;
          backdrop-filter: blur(8px);
        }

        /* CARD BODY */
        .dlhub-card-body {
          padding: 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .dlhub-card-cat-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 100px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .dlhub-card-title {
          font-size: 14px;
          font-weight: 800;
          line-height: 1.4;
          color: var(--text-primary);
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dlhub-card-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.55;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .dlhub-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .dlhub-card-meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* POPULARITY BAR */
        .dlhub-pop-bar {
          height: 3px;
          border-radius: 10px;
          background: var(--bg-space-dark);
          margin-bottom: 14px;
          overflow: hidden;
        }
        .dlhub-pop-fill {
          height: 100%;
          border-radius: 10px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          transition: width 1s ease;
        }

        /* CARD ACTIONS */
        .dlhub-card-actions {
          display: flex;
          gap: 8px;
        }
        .dlhub-btn-preview {
          flex: 1;
          padding: 9px;
          border-radius: 12px;
          border: 1.5px solid var(--card-border);
          background: transparent;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .dlhub-btn-preview:hover {
          background: var(--primary-glow);
          color: var(--primary);
          border-color: rgba(59,130,246,0.3);
        }
        .dlhub-btn-download {
          flex: 1.5;
          padding: 9px 14px;
          border-radius: 12px;
          border: none;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .dlhub-btn-download::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.1);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .dlhub-btn-download:hover::after { opacity: 1; }
        .dlhub-btn-download:active { transform: scale(0.97); }

        /* EMPTY STATE */
        .dlhub-empty {
          grid-column: 1/-1;
          text-align: center;
          padding: 80px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .dlhub-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: var(--text-muted);
          opacity: 0.7;
        }

        /* SKELETON LOADING */
        .dlhub-skeleton {
          background: var(--skeleton-base);
          border-radius: 8px;
          animation: dlSkeleton 1.5s ease-in-out infinite;
        }
        @keyframes dlSkeleton {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }

        /* DETAIL PANEL */
        .dlhub-detail-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          z-index: 2000;
          animation: dlBackdropIn 0.25s ease;
        }
        @keyframes dlBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .dlhub-detail-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 420px;
          max-width: 95vw;
          background: var(--bg-space);
          border-left: 1px solid var(--card-border);
          z-index: 2001;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: dlPanelIn 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          box-shadow: -20px 0 60px rgba(0,0,0,0.2);
        }
        @keyframes dlPanelIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .dlhub-detail-thumb {
          height: 200px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .dlhub-detail-thumb::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: linear-gradient(to top, var(--bg-space), transparent);
          pointer-events: none;
        }
        .dlhub-detail-thumb-icon {
          font-size: 60px;
          color: rgba(255,255,255,0.9);
          filter: drop-shadow(0 8px 20px rgba(0,0,0,0.4));
          position: relative;
          z-index: 1;
        }
        .dlhub-detail-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .dlhub-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .dlhub-detail-meta-card {
          background: var(--bg-space-dark);
          border: 1px solid var(--card-border);
          border-radius: 14px;
          padding: 14px;
        }
        .dlhub-detail-meta-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          font-weight: 700;
          margin-bottom: 6px;
        }
        .dlhub-detail-meta-val {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .dlhub-detail-actions {
          padding: 16px 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid var(--card-border);
          flex-shrink: 0;
        }
        .dlhub-detail-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0,0,0,0.35);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          z-index: 2;
          transition: all 0.2s;
        }
        .dlhub-detail-close:hover { background: rgba(239,68,68,0.6); }

        /* BANNER SECTION */
        .dlhub-info-banner {
          margin-top: 48px;
          border-radius: 24px;
          padding: 36px;
          background: linear-gradient(135deg, var(--primary-glow), var(--accent-glow));
          border: 1px solid rgba(59,130,246,0.2);
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .dlhub-info-banner-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--primary-glow);
          border: 1px solid rgba(59,130,246,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: var(--primary);
          flex-shrink: 0;
        }
        .dlhub-info-banner-text { flex: 1; min-width: 200px; }
        .dlhub-info-banner-text h3 {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        .dlhub-info-banner-text p {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }
      ` }} />

      {/* Background Orbs */}
      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', top: '-150px', left: '-150px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', top: '40%', right: '-80px', animationDelay: '2s' }} />
      </div>

      <LandingNav activePage="unduhan" onOpenLogin={() => router.push('/?login=1')} />

      <main className="static-page-main">
        {/* ─── HERO ─── */}
        <section className="dlhub-hero animate-fade-in">
          <div className="dlhub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-vault" />
            Perpustakaan Digital Resmi Koryandik
          </div>
          <h1 className="pub-hero-title">Pusat Unduhan Administrasi</h1>
          <p className="dlhub-hero-subtitle">
            Akses seluruh regulasi, format laporan SPJ/LPJ, surat undangan resmi, dan SK penting untuk keperluan administrasi sekolah — gratis, selalu diperbarui.
          </p>

          {/* Stats */}
          <div className="dlhub-stats">
            <div className="dlhub-stat-item">
              <div className="dlhub-stat-num"><AnimatedNumber target={downloads.length} /></div>
              <div className="dlhub-stat-label">Dokumen Tersedia</div>
            </div>
            <div className="dlhub-stat-item">
              <div className="dlhub-stat-num"><AnimatedNumber target={totalDownloads} /></div>
              <div className="dlhub-stat-label">Total Diunduh</div>
            </div>
            <div className="dlhub-stat-item">
              <div className="dlhub-stat-num"><AnimatedNumber target={schoolCount} /></div>
              <div className="dlhub-stat-label">Sekolah Binaan</div>
            </div>
            <div className="dlhub-stat-item">
              <div className="dlhub-stat-num">3</div>
              <div className="dlhub-stat-label">Kategori Dokumen</div>
            </div>
          </div>

          {/* Search */}
          <div className="dlhub-search-wrap">
            <i className="fa-solid fa-magnifying-glass dlhub-search-icon" />
            <input
              type="text"
              className="dlhub-search-input"
              placeholder="Cari regulasi, format SPJ/LPJ, surat undangan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Cari dokumen"
            />
            {searchQuery && (
              <button
                type="button"
                className="dlhub-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </section>

        {/* ─── MAIN LAYOUT ─── */}
        <div className="dlhub-layout">
          {/* ─── SIDEBAR ─── */}
          <aside className="dlhub-sidebar animate-fade-in">
            {/* Categories */}
            <div className="dlhub-sidebar-section">
              <div className="dlhub-sidebar-title">Kategori</div>
              {CATEGORIES.map(cat => {
                const count = cat.id === 'all' ? downloads.length : downloads.filter(d => d.category === cat.id).length;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`dlhub-cat-btn${isActive ? ' active' : ''}`}
                    onClick={() => setActiveCategory(cat.id as DownloadCategory)}
                  >
                    <span
                      className="dlhub-cat-icon"
                      style={{
                        background: isActive ? cat.gradient : 'var(--bg-space-dark)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                        boxShadow: isActive ? `0 4px 12px ${getCategoryStyle(cat.id).glow}` : 'none',
                      }}
                    >
                      <i className={`fa-solid ${cat.icon}`} />
                    </span>
                    <span style={{ flex: 1 }}>{cat.label}</span>
                    <span className="dlhub-cat-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* File Types */}
            <div className="dlhub-sidebar-section">
              <div className="dlhub-sidebar-title">Tipe Berkas</div>
              <div className="dlhub-type-pills">
                {FILE_TYPES.map(ft => {
                  const count = ft.id === 'all'
                    ? filteredDownloads.length
                    : downloads.filter(d => d.fileType === ft.id).length;
                  const isActive = activeFileType === ft.id;
                  return (
                    <button
                      key={ft.id}
                      type="button"
                      className={`dlhub-type-pill${isActive ? ' active' : ''}`}
                      onClick={() => setActiveFileType(ft.id)}
                    >
                      <span
                        className="dlhub-type-dot"
                        style={{ background: isActive ? ft.color : 'var(--card-border)' }}
                      />
                      <span style={{ flex: 1 }}>{ft.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="dlhub-sidebar-section" style={{ background: 'linear-gradient(135deg, var(--primary-glow), var(--accent-glow))', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)', fontSize: '16px' }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Butuh Format Baru?</span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Ajukan permohonan format berkas baru melalui forum KKKS atau hubungi admin Koryandik Cibadak.
              </p>
            </div>
          </aside>

          {/* ─── CONTENT ─── */}
          <div>
            {/* Toolbar */}
            <div className="dlhub-toolbar">
              <div className="dlhub-results-label">
                Menampilkan <strong>{filteredDownloads.length}</strong> dari <strong>{downloads.length}</strong> dokumen
                {searchQuery && <> · Pencarian: <em>"{searchQuery}"</em></>}
              </div>
              <div className="dlhub-sort-wrap">
                <span>Urutkan:</span>
                <select
                  className="dlhub-sort-select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortMode)}
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="name">Nama A–Z</option>
                  <option value="downloads">Terpopuler</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            <div className="dlhub-grid">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dlhub-card" style={{ minHeight: '320px', pointerEvents: 'none' }}>
                    <div className="dlhub-skeleton" style={{ height: '120px' }} />
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="dlhub-skeleton" style={{ height: '12px', width: '60%', borderRadius: '6px' }} />
                      <div className="dlhub-skeleton" style={{ height: '16px', width: '90%', borderRadius: '6px' }} />
                      <div className="dlhub-skeleton" style={{ height: '12px', width: '80%', borderRadius: '6px' }} />
                      <div className="dlhub-skeleton" style={{ height: '12px', width: '70%', borderRadius: '6px' }} />
                    </div>
                  </div>
                ))
              ) : filteredDownloads.length === 0 ? (
                <div className="dlhub-empty">
                  <div className="dlhub-empty-icon">
                    <i className="fa-solid fa-folder-magnifying-glass" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Dokumen tidak ditemukan
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '300px', textAlign: 'center', lineHeight: 1.6 }}>
                    Coba ubah kata kunci pencarian atau pilih kategori yang berbeda
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => { setSearchQuery(''); setActiveCategory('all'); setActiveFileType('all'); }}
                  >
                    <i className="fa-solid fa-rotate-left" /> Reset Filter
                  </button>
                </div>
              ) : (
                filteredDownloads.map((item, idx) => {
                  const catStyle = getCategoryStyle(item.category);
                  const ftStyle = getFileTypeStyle(item.fileType);
                  const isHot = (item.downloadCount || 0) >= 10;
                  const maxDownloads = Math.max(...downloads.map(d => d.downloadCount || 0), 1);
                  const popularity = Math.round(((item.downloadCount || 0) / maxDownloads) * 100);
                  const isDownloading = downloadingId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="dlhub-card reveal-on-scroll"
                      style={{ '--reveal-delay': `${idx * 60}ms` } as React.CSSProperties}
                      onClick={() => openDetail(item)}
                    >
                      {/* Thumbnail */}
                      <div
                        className="dlhub-card-thumb"
                        style={{ background: catStyle.gradient }}
                      >
                        {/* Particles */}
                        <div className="dlhub-thumb-particles">
                          {[
                            { top: '20%', left: '15%', dur: '3.5s', del: '0s', tx: '8px', ty: '-10px' },
                            { top: '60%', left: '75%', dur: '4.5s', del: '1s', tx: '-10px', ty: '-15px' },
                            { top: '35%', left: '55%', dur: '5s', del: '0.5s', tx: '12px', ty: '8px' },
                            { top: '75%', left: '30%', dur: '3s', del: '1.5s', tx: '-8px', ty: '-6px' },
                          ].map((p, pi) => (
                            <div key={pi} className="dlhub-particle" style={{
                              top: p.top, left: p.left,
                              ['--dur' as string]: p.dur,
                              ['--del' as string]: p.del,
                              ['--tx' as string]: p.tx,
                              ['--ty' as string]: p.ty,
                            }} />
                          ))}
                        </div>

                        <i className={`fa-solid ${item.icon} dlhub-thumb-icon`} />

                        {/* Badges */}
                        <div className="dlhub-card-badges">
                          <span className="dlhub-filetype-badge">
                            <i className={`fa-solid ${ftStyle.icon}`} />
                            {item.fileType}
                          </span>
                          {isHot && (
                            <span className="dlhub-hot-badge">
                              <i className="fa-solid fa-fire" />
                              POPULER
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="dlhub-card-body">
                        <span
                          className="dlhub-card-cat-tag"
                          style={{
                            background: ftStyle.bg,
                            color: ftStyle.color,
                          }}
                        >
                          <i className={`fa-solid ${CATEGORIES.find(c => c.id === item.category)?.icon || 'fa-folder'}`} />
                          {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                        </span>
                        <h3 className="dlhub-card-title">{item.title}</h3>
                        <p className="dlhub-card-desc">{item.description}</p>

                        <div className="dlhub-card-meta">
                          <span className="dlhub-card-meta-item">
                            <i className="fa-solid fa-weight-hanging" style={{ color: 'var(--text-muted)' }} />
                            {item.fileSize}
                          </span>
                          <span className="dlhub-card-meta-item" style={{ color: 'var(--success)', fontWeight: 700 }}>
                            <i className="fa-solid fa-download" />
                            {(item.downloadCount || 0).toLocaleString('id-ID')}×
                          </span>
                        </div>

                        {/* Popularity bar */}
                        <div className="dlhub-pop-bar" title={`Popularitas: ${popularity}%`}>
                          <div className="dlhub-pop-fill" style={{ width: `${popularity}%` }} />
                        </div>

                        {/* Actions */}
                        <div className="dlhub-card-actions">
                          <button
                            type="button"
                            className="dlhub-btn-preview"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedDoc(item);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <i className="fa-solid fa-eye" />
                            Preview
                          </button>
                          <button
                            type="button"
                            className="dlhub-btn-download"
                            style={{ background: catStyle.gradient, boxShadow: `0 4px 14px ${catStyle.glow}` }}
                            onClick={e => handleDownload(item, e)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <>
                                <i className="fa-solid fa-circle-notch" style={{ animation: 'spin 0.8s linear infinite' }} />
                                Mengunduh...
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-download" />
                                Unduh
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Info Banner */}
            <div className="dlhub-info-banner animate-fade-in">
              <div className="dlhub-info-banner-icon">
                <i className="fa-solid fa-shield-halved" />
              </div>
              <div className="dlhub-info-banner-text">
                <h3>Dokumen Resmi & Terverifikasi</h3>
                <p>
                  Seluruh berkas administrasi dan regulasi di atas dipelihara langsung oleh tim admin Koryandik Cibadak.
                  Jika sekolah membutuhkan format laporan khusus yang belum tersedia, koordinasikan melalui forum KKKS atau hubungi admin.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => router.push('/?login=1')}
                style={{ flexShrink: 0 }}
              >
                <i className="fa-solid fa-right-to-bracket" />
                Login Portal
              </button>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter
        schoolCount={schoolCount}
        onScrollTo={id => router.push(`/#${id}`)}
        onOpenLogin={() => router.push('/?login=1')}
      />

      <CommandPalette currentUser={null} onThemeToggle={e => toggleThemeWithTransition(e)} />

      {/* ─── DOCUMENT PREVIEW MODAL ─── */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setSelectedDoc(null); }}
        document={selectedDoc}
        onDownloadSuccess={fetchDownloads}
      />

      {/* ─── DETAIL SIDE PANEL ─── */}
      {isDetailOpen && selectedDoc && (() => {
        const catStyle = getCategoryStyle(selectedDoc.category);
        const ftStyle = getFileTypeStyle(selectedDoc.fileType);
        const isDownloading = downloadingId === selectedDoc.id;
        return (
          <>
            <div className="dlhub-detail-backdrop" onClick={() => setIsDetailOpen(false)} />
            <div className="dlhub-detail-panel" role="dialog" aria-label="Detail dokumen">
              {/* Thumbnail Header */}
              <div className="dlhub-detail-thumb" style={{ background: catStyle.gradient }}>
                <button
                  type="button"
                  className="dlhub-detail-close"
                  onClick={() => setIsDetailOpen(false)}
                  aria-label="Tutup panel"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
                <i className={`fa-solid ${selectedDoc.icon} dlhub-detail-thumb-icon`} />
              </div>

              {/* Body */}
              <div className="dlhub-detail-body">
                {/* Title & type */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: ftStyle.bg,
                        color: ftStyle.color,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <i className={`fa-solid ${ftStyle.icon}`} />
                      {selectedDoc.fileType}
                    </span>
                    {(selectedDoc.downloadCount || 0) >= 10 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 800,
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                      }}>
                        <i className="fa-solid fa-fire" /> POPULER
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1.3, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    {selectedDoc.title}
                  </h2>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    {selectedDoc.description}
                  </p>
                </div>

                {/* Meta grid */}
                <div className="dlhub-detail-grid">
                  <div className="dlhub-detail-meta-card">
                    <div className="dlhub-detail-meta-label">Ukuran File</div>
                    <div className="dlhub-detail-meta-val">{selectedDoc.fileSize}</div>
                  </div>
                  <div className="dlhub-detail-meta-card">
                    <div className="dlhub-detail-meta-label">Versi</div>
                    <div className="dlhub-detail-meta-val">v{selectedDoc.version || '1.0'}</div>
                  </div>
                  <div className="dlhub-detail-meta-card">
                    <div className="dlhub-detail-meta-label">Total Unduhan</div>
                    <div className="dlhub-detail-meta-val" style={{ color: 'var(--success)' }}>
                      {(selectedDoc.downloadCount || 0).toLocaleString('id-ID')}×
                    </div>
                  </div>
                  <div className="dlhub-detail-meta-card">
                    <div className="dlhub-detail-meta-label">Diperbarui</div>
                    <div className="dlhub-detail-meta-val" style={{ fontSize: '13px' }}>
                      {new Date(selectedDoc.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Popularity bar */}
                {(() => {
                  const maxDownloads = Math.max(...downloads.map(d => d.downloadCount || 0), 1);
                  const pop = Math.round(((selectedDoc.downloadCount || 0) / maxDownloads) * 100);
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Tingkat Popularitas</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>{pop}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '100px', background: 'var(--bg-space-dark)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pop}%`,
                          borderRadius: '100px',
                          background: catStyle.gradient,
                          boxShadow: `0 0 8px ${catStyle.glow}`,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="dlhub-detail-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ height: '46px', borderRadius: '14px', width: '100%', fontWeight: 700 }}
                  onClick={() => { setIsDetailOpen(false); setIsPreviewOpen(true); }}
                >
                  <i className="fa-solid fa-eye" /> Pratinjau Dokumen
                </button>
                <button
                  type="button"
                  className="dlhub-btn-download"
                  style={{
                    background: catStyle.gradient,
                    boxShadow: `0 6px 20px ${catStyle.glow}`,
                    height: '50px',
                    borderRadius: '14px',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                  onClick={e => handleDownload(selectedDoc, e)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <><i className="fa-solid fa-circle-notch" style={{ animation: 'spin 0.8s linear infinite' }} /> Mengunduh...</>
                  ) : (
                    <><i className="fa-solid fa-download" /> Unduh Sekarang</>
                  )}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
}
