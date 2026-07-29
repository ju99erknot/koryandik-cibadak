/**
 * Pelacak status sinkronisasi data.
 *
 * MASALAH YANG DIATASI
 * Seluruh operasi tulis di db.ts memakai pola:
 *
 *     try { ...tulis ke Supabase... } catch { logger.warn(...) }
 *     // lalu diam-diam jatuh ke localStorage dan mengembalikan "sukses"
 *
 * Akibatnya operator menekan Simpan, melihat notifikasi "Berhasil disimpan!",
 * padahal datanya tidak pernah sampai ke server — hanya tersimpan di peramban
 * miliknya sendiri. Kegagalan baru ketahuan berhari-hari kemudian ketika
 * pengawas bilang berkasnya belum masuk.
 *
 * Modul ini mencatat setiap kegagalan tulis agar antarmuka dapat memberi tahu
 * pengguna dengan jujur, tanpa mengubah perilaku fallback (data tetap aman di
 * localStorage sehingga pekerjaan tidak hilang).
 */

export type SyncState = 'ok' | 'degraded';

export interface SyncFailure {
  /** Nama operasi, mis. "updateSubmission". */
  operation: string;
  /** Keterangan singkat untuk pengguna. */
  label: string;
  at: number;
}

const LISTENERS = new Set<(state: SyncState, failures: SyncFailure[]) => void>();
const failures: SyncFailure[] = [];
const MAX_TRACKED = 20;

/** Rentang waktu sebuah kegagalan dianggap masih relevan (5 menit). */
const FAILURE_TTL_MS = 5 * 60 * 1000;

function activeFailures(): SyncFailure[] {
  const now = Date.now();
  return failures.filter((f) => now - f.at < FAILURE_TTL_MS);
}

function emit() {
  const active = activeFailures();
  const state: SyncState = active.length > 0 ? 'degraded' : 'ok';
  LISTENERS.forEach((fn) => fn(state, active));
}

/**
 * Catat bahwa sebuah operasi tulis gagal mencapai server.
 * Dipanggil dari db.ts pada setiap jalur fallback.
 */
export function reportSyncFailure(operation: string, label: string): void {
  failures.push({ operation, label, at: Date.now() });
  if (failures.length > MAX_TRACKED) failures.shift();
  emit();
}

/** Tandai bahwa sebuah operasi berhasil kembali. */
export function reportSyncSuccess(operation: string): void {
  const before = failures.length;
  for (let i = failures.length - 1; i >= 0; i--) {
    if (failures[i].operation === operation) failures.splice(i, 1);
  }
  if (failures.length !== before) emit();
}

/** Hapus seluruh catatan (mis. setelah pengguna memuat ulang). */
export function clearSyncFailures(): void {
  failures.length = 0;
  emit();
}

export function getSyncState(): SyncState {
  return activeFailures().length > 0 ? 'degraded' : 'ok';
}

export function getSyncFailures(): SyncFailure[] {
  return activeFailures();
}

/** Berlangganan perubahan status. Mengembalikan fungsi pembatal. */
export function subscribeSyncStatus(
  fn: (state: SyncState, failures: SyncFailure[]) => void
): () => void {
  LISTENERS.add(fn);
  return () => LISTENERS.delete(fn);
}
