import 'server-only';

/**
 * Pembatas laju sederhana berbasis memori (sliding window).
 *
 * Endpoint AI memakai GEMINI_API_KEY milik pemilik portal dan dapat dipanggil
 * tanpa login. Tanpa pembatas, satu skrip dapat menghabiskan kuota harian
 * sehingga fitur AI mati untuk seluruh operator sekolah — atau menimbulkan
 * tagihan bila penagihan aktif.
 *
 * CATATAN: penyimpanan di memori berarti hitungan tidak dibagi antar-instance
 * serverless dan hilang saat instance didaur ulang. Ini cukup untuk mencegah
 * penyalahgunaan kasar pada penyebaran kecil; untuk jaminan ketat gunakan
 * penyimpanan bersama (mis. Upstash Redis).
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Buang entri kedaluwarsa agar Map tidak tumbuh tanpa batas. */
function sweep(now: number, windowMs: number) {
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

let lastSweep = 0;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Detik hingga slot berikutnya tersedia (0 bila masih diizinkan). */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Bersihkan berkala, bukan setiap panggilan, agar tetap murah.
  if (now - lastSweep > windowMs) {
    sweep(now, windowMs);
    lastSweep = now;
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfter: 0 };
}

/**
 * Identitas pemanggil untuk keperluan pembatasan.
 * Memakai header proksi yang diisi Vercel; kembali ke 'unknown' bila tidak ada.
 */
export function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
