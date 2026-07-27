export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export function getCurrentMonthIndex(): number {
  return new Date().getMonth();
}

export function getMonthLabel(monthIndex: number): string {
  return MONTH_NAMES_ID[monthIndex] ?? MONTH_NAMES_ID[0];
}

/* ============================================================
   PERIODE PELAPORAN (YYYY-MM)
   ============================================================
   Berkas Koryandik dikumpulkan per bulan ("Setiap tanggal 5"),
   tetapi sebelumnya tidak ada penanda periode sama sekali —
   berkas Januari dan Februari tercampur dalam satu daftar.

   `period` memakai format `YYYY-MM` agar bisa diurutkan sebagai
   string biasa dan aman dibandingkan tanpa parsing tanggal.
   ============================================================ */

/** Periode (YYYY-MM) dari sebuah Date, memakai kalender lokal. */
export function toPeriod(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Periode berjalan saat ini. */
export function currentPeriod(): string {
  return toPeriod(new Date());
}

/**
 * Periode sebuah berkas.
 *
 * Memakai kolom `period` bila tersedia; bila tidak (data lama yang
 * dibuat sebelum fitur ini ada), diturunkan dari `submittedAt`
 * sehingga riwayat tetap terkelompok dengan benar.
 */
export function resolvePeriod(submission: {
  period?: string | null;
  submittedAt?: string | null;
}): string {
  if (submission.period) return submission.period;
  if (submission.submittedAt) {
    const d = new Date(submission.submittedAt);
    if (!Number.isNaN(d.getTime())) return toPeriod(d);
  }
  return currentPeriod();
}

/** Label ramah-baca, mis. "2026-07" -> "Juli 2026". */
export function formatPeriod(period: string): string {
  const [y, m] = period.split('-');
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return period;
  return `${MONTH_NAMES_ID[idx]} ${y}`;
}

/** Label pendek, mis. "2026-07" -> "Jul 2026". */
export function formatPeriodShort(period: string): string {
  const [y, m] = period.split('-');
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return period;
  return `${MONTH_NAMES_ID[idx].slice(0, 3)} ${y}`;
}

/** Geser periode sejumlah bulan (negatif = mundur). */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  const d = new Date(y, m - 1 + months, 1);
  return toPeriod(d);
}

/** Periode sebelumnya. */
export function previousPeriod(period: string = currentPeriod()): string {
  return shiftPeriod(period, -1);
}

/**
 * Daftar periode terbaru lebih dulu, untuk mengisi dropdown filter.
 * Selalu menyertakan periode berjalan walau belum ada berkas apa pun.
 */
export function listPeriods(
  submissions: Array<{ period?: string | null; submittedAt?: string | null }>,
  minCount = 6
): string[] {
  const found = new Set<string>();
  submissions.forEach((s) => found.add(resolvePeriod(s)));

  // Pastikan beberapa periode terakhir selalu tersedia sebagai pilihan.
  let p = currentPeriod();
  for (let i = 0; i < minCount; i++) {
    found.add(p);
    p = shiftPeriod(p, -1);
  }

  return [...found].sort().reverse();
}
