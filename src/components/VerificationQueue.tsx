'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { updateSubmission } from '@/lib/db';
import type { Submission } from '@/lib/db';
import type { School, Category } from '@/lib/schoolsData';
import { formatPeriod, resolvePeriod, listPeriods, currentPeriod } from '@/lib/monthArchive';
import FancySelect from '@/components/FancySelect';
import EmptyState from '@/components/EmptyState';

/**
 * Antrean verifikasi berkas.
 *
 * Sebelumnya verifikator harus membuka sekolah satu per satu untuk mengetahui
 * ada berkas baru atau tidak. Komponen ini mengumpulkan seluruh berkas yang
 * menunggu ke dalam satu daftar yang bisa dikerjakan berurutan, dan dipakai
 * bersama oleh portal pengawas, gugus, maupun admin.
 */

interface VerificationQueueProps {
  submissions: Submission[];
  schools: School[];
  categories: Category[];
  /** Nama yang dicatat sebagai pemeriksa. */
  reviewerName: string;
  /** Batasi ke sekolah tertentu (mis. binaan satu gugus). */
  restrictToNpsns?: string[];
  onUpdated?: (updated: Submission) => void;
  title?: string;
}

export default function VerificationQueue({
  submissions,
  schools,
  categories,
  reviewerName,
  restrictToNpsns,
  onUpdated,
  title = 'Antrean Verifikasi',
}: VerificationQueueProps) {
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const periods = useMemo(() => listPeriods(submissions), [submissions]);

  const queue = useMemo(() => {
    const allowed = restrictToNpsns ? new Set(restrictToNpsns) : null;
    return submissions
      .filter((s) => s.status === 'pending')
      .filter((s) => (allowed ? allowed.has(s.schoolNpsn) : true))
      .filter((s) => resolvePeriod(s) === period)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  }, [submissions, restrictToNpsns, period]);

  const schoolName = (npsn: string) =>
    schools.find((s) => s.npsn === npsn)?.name ?? `NPSN ${npsn}`;
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? 'Berkas';

  const applyDecision = async (
    sub: Submission,
    status: 'approved' | 'revision',
    notes?: string
  ) => {
    setBusyId(sub.id);
    try {
      const updated = await updateSubmission(sub.id, {
        status,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        ...(notes !== undefined ? { notes } : {}),
      });
      if (updated) {
        onUpdated?.(updated);
        toast.success(
          status === 'approved'
            ? `Berkas ${categoryName(sub.categoryId)} disetujui.`
            : `Permintaan revisi dikirim ke ${schoolName(sub.schoolNpsn)}.`
        );
      } else {
        toast.error('Gagal memperbarui berkas. Coba lagi.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memperbarui berkas.');
    } finally {
      setBusyId(null);
      setNoteFor(null);
      setNoteText('');
    }
  };

  const submitNote = (sub: Submission) => {
    if (!noteText.trim()) {
      toast.error('Tuliskan alasan revisi terlebih dahulu.');
      return;
    }
    applyDecision(sub, 'revision', noteText.trim());
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h2>
          <i className="fa-solid fa-list-check" aria-hidden="true" /> {title}
          {queue.length > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: 10, fontSize: 11 }}>
              {queue.length} menunggu
            </span>
          )}
        </h2>
        <div style={{ minWidth: 190 }}>
          <FancySelect
            label="Periode"
            icon="fa-solid fa-calendar"
            size="sm"
            value={period}
            onChange={setPeriod}
            options={periods.map((p) => ({ value: p, label: formatPeriod(p) }))}
          />
        </div>
      </div>

      <div className="card-body">
        {queue.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-circle-check"
            title="Tidak ada berkas menunggu"
            description={`Semua berkas periode ${formatPeriod(period)} sudah diperiksa.`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map((sub) => {
              const isBusy = busyId === sub.id;
              const isNoting = noteFor === sub.id;
              return (
                <div
                  key={sub.id}
                  style={{
                    border: '1px solid var(--card-border)',
                    borderRadius: 12,
                    padding: 14,
                    background: 'var(--card-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    opacity: isBusy ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {categoryName(sub.categoryId)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        <i className="fa-solid fa-school" style={{ marginRight: 6 }} aria-hidden="true" />
                        {schoolName(sub.schoolNpsn)}
                      </div>
                      {sub.fileName && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-all' }}>
                          <i className="fa-solid fa-paperclip" style={{ marginRight: 6 }} aria-hidden="true" />
                          {sub.fileName}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
                      {sub.driveLink && (
                        <a
                          href={sub.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-xs"
                          aria-label={`Buka berkas ${categoryName(sub.categoryId)} dari ${schoolName(sub.schoolNpsn)}`}
                        >
                          <i className="fa-solid fa-up-right-from-square" aria-hidden="true" /> Lihat
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        disabled={isBusy}
                        onClick={() => applyDecision(sub, 'approved')}
                        aria-label={`Setujui berkas ${categoryName(sub.categoryId)} dari ${schoolName(sub.schoolNpsn)}`}
                      >
                        <i className="fa-solid fa-check" aria-hidden="true" /> Setujui
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        disabled={isBusy}
                        onClick={() => {
                          setNoteFor(isNoting ? null : sub.id);
                          setNoteText('');
                        }}
                        aria-label={`Minta revisi berkas ${categoryName(sub.categoryId)} dari ${schoolName(sub.schoolNpsn)}`}
                      >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Revisi
                      </button>
                    </div>
                  </div>

                  {isNoting && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        className="form-control"
                        style={{ flex: 1, minWidth: 200 }}
                        placeholder="Alasan revisi (akan dibaca operator sekolah)…"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            submitNote(sub);
                          }
                        }}
                        aria-label="Alasan revisi"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        disabled={isBusy}
                        onClick={() => submitNote(sub)}
                      >
                        Kirim
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
