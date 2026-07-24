'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CommandPalette from '@/components/CommandPalette';
import LandingNav from '@/components/LandingNav';
import LandingFooter from '@/components/LandingFooter';
import EmptyState from '@/components/EmptyState';
import { getSchools, getGugusData, getCategories, getFaqs } from '@/lib/db';
import { toggleThemeWithTransition } from '@/lib/theme';
import type { FaqItem } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const categoryConfig: Record<string, { color: string; icon: string }> = {
  Umum: { color: '#3b82f6', icon: 'fa-circle-info' },
  Penggunaan: { color: '#8b5cf6', icon: 'fa-laptop-code' },
  Teknis: { color: '#f59e0b', icon: 'fa-gear' },
  Gugus: { color: '#10b981', icon: 'fa-sitemap' },
};

export default function FaqPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [schoolCount, setSchoolCount] = useState(49);
  const [gugusCount, setGugusCount] = useState(5);
  const [categoryCount, setCategoryCount] = useState(8);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // Call scroll reveal hook
  useScrollReveal([faqs, searchQuery, activeCategory]);

  useEffect(() => {
    const loadCounts = async () => {
      const [schools, cats, loadedFaqs] = await Promise.all([
        getSchools(),
        getCategories(),
        getFaqs(),
      ]);
      // Pass existingSchools to avoid duplicate fetch inside getGugusData
      const guguses = await getGugusData(schools);
      if (schools.length > 0) setSchoolCount(schools.length);
      if (guguses.length > 0) setGugusCount(guguses.length);
      if (cats.length > 0) setCategoryCount(cats.length);
      setFaqs(loadedFaqs);
    };
    loadCounts();
  }, []);

  const faqData = useMemo(() => {
    return faqs.map((faq) => {
      let answer = faq.answer;
      answer = answer.replace(/\${schoolCount}/g, schoolCount.toString());
      answer = answer.replace(/\${gugusCount}/g, gugusCount.toString());
      answer = answer.replace(/\${categoryCount}/g, categoryCount.toString());
      return { ...faq, answer };
    });
  }, [faqs, schoolCount, gugusCount, categoryCount]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = ['Semua', ...Object.keys(categoryConfig)];

  const filteredFaqs = faqData.filter((faq) => {
    const matchesCategory = activeCategory === 'Semua' || faq.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const groupedFaqs: Record<string, FaqItem[]> = {};
  filteredFaqs.forEach((faq) => {
    if (!groupedFaqs[faq.category]) groupedFaqs[faq.category] = [];
    groupedFaqs[faq.category].push(faq);
  });

  const navigateHomeSection = (id: string) => router.push(`/#${id}`);

  return (
    <div className="landing-page static-page mesh-gradient-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Search bar: oval pill konsisten dengan galeri & sekolah ── */
        .faq-search-wrap {
          max-width: 520px !important;
          margin: 0 auto 24px !important;
        }
        .faq-search-input {
          padding: 13px 48px 13px 46px !important;
          border-radius: 99px !important;
          border: 1.5px solid var(--card-border) !important;
          background: var(--card-glass) !important;
          backdrop-filter: blur(12px);
          font-size: 14px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          box-shadow: none !important;
        }
        .faq-search-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
        }
        .faq-search-clear {
          background: var(--card-border) !important;
          width: 26px !important;
          height: 26px !important;
          font-size: 11px !important;
          transition: all 0.2s !important;
        }
        .faq-search-clear:hover {
          background: #ef4444 !important;
          color: #fff !important;
        }
        /* ── Filter pill: konsisten dengan sekolah/galeri ── */
        .faq-category-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .faq-category-pill {
          padding: 8px 16px !important;
          border-radius: 99px !important;
          border: 1.5px solid var(--card-border) !important;
          background: var(--card-glass) !important;
          backdrop-filter: blur(12px);
          color: var(--text-secondary) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1) !important;
          gap: 7px !important;
        }
        .faq-category-pill:hover {
          border-color: var(--pill-color, var(--primary)) !important;
          color: var(--pill-color, var(--primary)) !important;
          transform: translateY(-2px) !important;
        }
        .faq-category-pill.is-active {
          background: var(--pill-color, var(--primary)) !important;
          border-color: transparent !important;
          color: #fff !important;
          box-shadow: 0 6px 20px color-mix(in srgb, var(--pill-color, var(--primary)) 30%, transparent) !important;
        }
        .faq-category-count {
          background: var(--card-border) !important;
          color: var(--text-muted) !important;
          border-radius: 99px !important;
          padding: 1px 7px !important;
          font-size: 10px !important;
          font-weight: 700 !important;
        }
        .faq-category-pill.is-active .faq-category-count {
          background: rgba(255,255,255,0.22) !important;
          color: #fff !important;
        }
        /* ── Toolbar (bulk actions) ── */
        .faq-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }
        .faq-bulk-actions { display: flex; gap: 8px; }
        .faq-bulk-btn {
          padding: 7px 14px;
          border-radius: 99px;
          border: 1.5px solid var(--card-border);
          background: var(--card-glass);
          color: var(--text-secondary);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .faq-bulk-btn:hover { border-color: var(--primary); color: var(--primary); }
        /* ── FAQ Item: rapi tanpa translateX ── */
        .faq-item {
          background: var(--card-glass) !important;
          border-radius: 16px !important;
          border: 1.5px solid var(--card-border) !important;
          border-left: 4px solid var(--faq-accent, var(--primary)) !important;
          margin-bottom: 10px;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
          backdrop-filter: blur(12px);
        }
        .faq-item:hover {
          border-color: var(--faq-accent, var(--primary)) !important;
          border-left-color: var(--faq-accent, var(--primary)) !important;
          box-shadow: 0 12px 30px color-mix(in srgb, var(--faq-accent, var(--primary)) 12%, transparent) !important;
        }
        .faq-item.is-expanded {
          box-shadow: 0 16px 40px color-mix(in srgb, var(--faq-accent, var(--primary)) 15%, transparent) !important;
        }
        .faq-item-trigger {
          font-weight: 700 !important;
          font-size: 14px !important;
        }
        .faq-item-icon { transition: transform 0.3s ease; }
        .faq-item:hover .faq-item-icon { transform: scale(1.08); }
        /* ── Group heading ── */
        .faq-group-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0 14px;
        }
        .faq-group-head h2 {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }
        .faq-group-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }
        .faq-group-divider { flex: 1; height: 1px; background: var(--card-border); }
        .faq-group-count {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }
        /* ── CTA Card ── */
        .faq-cta-card {
          border-radius: 24px !important;
          background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08)) !important;
          border: 1.5px solid rgba(59,130,246,0.15) !important;
          overflow: hidden;
        }
      ` }} />
      <div className="pub-hero-mesh" aria-hidden="true">
        <div className="pub-hero-orb" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', top: '-150px', left: '-150px' }} />
        <div className="pub-hero-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)', top: '40%', right: '-80px', animationDelay: '2s' }} />
      </div>

      <LandingNav activePage="faq" onOpenLogin={() => router.push('/?login=1')} />

      <main className="static-page-main">
        <section className="pub-hero animate-fade-in">
          <div className="pub-hero-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            <i className="fa-solid fa-circle-question" />
            Pusat Bantuan Resmi
          </div>
          <h1 className="pub-hero-title">Pertanyaan yang Sering Ditanyakan</h1>
          <p className="pub-hero-subtitle">
            Temukan jawaban seputar penggunaan portal digital Koryandik Cibadak — dari login, unggah berkas, hingga koordinasi gugus wilayah.
          </p>

          {/* Stats strip */}
          <div className="pub-hero-stats">
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{faqData.length}</div>
              <div className="pub-hero-stat-label">Pertanyaan</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{schoolCount}</div>
              <div className="pub-hero-stat-label">Sekolah Binaan</div>
            </div>
            <div className="pub-hero-stat">
              <div className="pub-hero-stat-num">{categoryCount}</div>
              <div className="pub-hero-stat-label">Jenis Berkas</div>
            </div>
          </div>
        </section>

        <div className="faq-search-wrap animate-fade-in">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            className="faq-search-input"
            placeholder="Cari pertanyaan… (contoh: cara login, unggah berkas)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari pertanyaan FAQ"
          />
          {searchQuery && (
            <button
              type="button"
              className="faq-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="faq-toolbar animate-fade-in">
          <div className="faq-category-tabs" role="tablist" aria-label="Kategori FAQ">
            {categories.map((cat) => {
              const config = categoryConfig[cat];
              const isActive = activeCategory === cat;
              const count =
                cat === 'Semua' ? faqData.length : faqData.filter((f) => f.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`faq-category-pill${isActive ? ' is-active' : ''}`}
                  style={
                    config
                      ? ({ '--pill-color': config.color } as React.CSSProperties)
                      : ({ '--pill-color': 'var(--primary)' } as React.CSSProperties)
                  }
                  onClick={() => setActiveCategory(cat)}
                >
                  {config ? (
                    <i className={`fa-solid ${config.icon}`} aria-hidden="true" />
                  ) : (
                    <i className="fa-solid fa-layer-group" aria-hidden="true" />
                  )}
                  {cat}
                  <span className="faq-category-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="faq-bulk-actions">
            <button
              type="button"
              className="faq-bulk-btn"
              onClick={() => setExpandedIds(new Set(filteredFaqs.map((f) => f.id)))}
            >
              <i className="fa-solid fa-angles-down" aria-hidden="true" /> Buka Semua
            </button>
            <button type="button" className="faq-bulk-btn" onClick={() => setExpandedIds(new Set())}>
              <i className="fa-solid fa-angles-up" aria-hidden="true" /> Tutup Semua
            </button>
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-magnifying-glass"
            title="Tidak Ada Hasil"
            description={`Pertanyaan dengan kata kunci "${searchQuery}" tidak ditemukan. Coba kata kunci lain.`}
            action={{
              label: 'Hapus Pencarian',
              onClick: () => setSearchQuery('')
            }}
          />
        ) : (
          <div className="faq-groups">
            {Object.entries(groupedFaqs).map(([category, faqs]) => {
              const config = categoryConfig[category];
              return (
                <section key={category}>
                  {activeCategory === 'Semua' && (
                    <div className="faq-group-head">
                      <div
                        className="faq-group-icon"
                        style={{
                          background: `${config?.color ?? 'var(--primary)'}14`,
                          color: config?.color ?? 'var(--primary)',
                        }}
                      >
                        <i className={`fa-solid ${config?.icon ?? 'fa-folder'}`} aria-hidden="true" />
                      </div>
                      <h2>{category}</h2>
                      <div className="faq-group-divider" aria-hidden="true" />
                      <span className="faq-group-count">{faqs.length} pertanyaan</span>
                    </div>
                  )}

                  <div className="faq-accordion">
                    {faqs.map((faq, idx) => {
                      const isExpanded = expandedIds.has(faq.id);
                      const accent = config?.color ?? 'var(--primary)';
                      return (
                        <div
                          key={faq.id}
                          className="reveal-on-scroll"
                          style={{
                            ['--reveal-delay' as string]: `${idx * 70}ms`
                          } as React.CSSProperties}
                        >
                          <article
                            className={`card faq-item${isExpanded ? ' is-expanded' : ''}`}
                            style={{
                              '--faq-accent': accent,
                            } as React.CSSProperties}
                          >
                            <button
                              type="button"
                              className="faq-item-trigger"
                              onClick={() => toggleExpand(faq.id)}
                              aria-expanded={isExpanded}
                            >
                              <div
                                className="faq-item-icon"
                                style={{ background: `${accent}14`, color: accent }}
                              >
                                <i className={`fa-solid ${faq.icon}`} aria-hidden="true" />
                              </div>
                              <span className="faq-item-question">{faq.question}</span>
                              <i
                                className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} faq-item-chevron`}
                                aria-hidden="true"
                              />
                            </button>
                            {isExpanded && (
                              <div className="faq-item-answer">
                                <div className="faq-item-answer-inner">{faq.answer}</div>
                              </div>
                            )}
                          </article>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <section className="faq-cta-section">
        <div className="card faq-cta-card animate-fade-in">
          <div className="faq-cta-glow" aria-hidden="true" />
          <div className="faq-cta-icon">
            <i className="fa-solid fa-comment-dots" aria-hidden="true" />
          </div>
          <h2>Masih Ada Pertanyaan?</h2>
          <p>
            Jika pertanyaan Anda belum terjawab, silakan hubungi Sekretariat Koryandik atau gunakan
            fitur Asisten Virtual di halaman beranda.
          </p>
          <div className="faq-cta-actions">
            <button type="button" className="btn btn-primary" onClick={() => router.push('/')}>
              <i className="fa-solid fa-robot" aria-hidden="true" /> Tanya Asisten Virtual
            </button>
            <button type="button" className="btn btn-outline" onClick={() => router.push('/profil')}>
              <i className="fa-solid fa-envelope" aria-hidden="true" /> Hubungi Sekretariat
            </button>
          </div>
        </div>
      </section>

      <LandingFooter
        schoolCount={schoolCount}
        onScrollTo={navigateHomeSection}
        onOpenLogin={() => router.push('/?login=1')}
      />

      <CommandPalette currentUser={null} onThemeToggle={(e) => toggleThemeWithTransition(e)} />
    </div>
  );
}
