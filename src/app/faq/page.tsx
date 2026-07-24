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
        .faq-search-wrap {
          border-radius: 100px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .faq-search-wrap:focus-within {
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.15), 0 0 0 3px var(--primary-glow) !important;
          transform: translateY(-2px);
        }
        .faq-category-pill {
          border-radius: 14px !important;
          transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        .faq-category-pill:hover {
          transform: translateY(-2px);
        }
        .faq-category-pill.is-active {
          box-shadow: 0 8px 20px color-mix(in srgb, var(--pill-color, var(--primary)) 20%, transparent) !important;
        }
        .faq-item {
          background: var(--card-glass) !important;
          border-radius: 18px !important;
          border-left: 4px solid var(--faq-accent, var(--primary)) !important;
          margin-bottom: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        .faq-item:hover {
          transform: translateX(6px) translateY(-2px) !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05), 0 0 20px color-mix(in srgb, var(--faq-accent, var(--primary)) 15%, transparent) !important;
        }
        .faq-item.is-expanded {
          background: var(--bg-space-dark) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08) !important;
        }
        .faq-item-trigger {
          font-weight: 750 !important;
          font-size: 14.5px !important;
        }
        .faq-item-icon {
          transition: transform 0.3s ease;
        }
        .faq-item:hover .faq-item-icon {
          transform: scale(1.1) rotate(5deg);
        }
        .faq-cta-card {
          border-radius: 28px !important;
          background: linear-gradient(135deg, var(--primary-glow), var(--accent-glow)) !important;
          border: 1px solid rgba(59, 130, 246, 0.15) !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05) !important;
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
          <h1 style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 50%,#ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900, fontSize: 'clamp(2.2rem,5vw,3.5rem)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Pertanyaan yang Sering Ditanyakan
          </h1>
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
