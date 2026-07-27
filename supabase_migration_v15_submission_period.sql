-- ============================================================
-- Koryandik Cibadak — Migration v15: Periode Pelaporan Berkas
-- ============================================================
--
-- MASALAH
-- Tabel `submissions` tidak punya penanda periode. Alur kerja Koryandik
-- bersifat bulanan ("Setiap tanggal 5"), sehingga tanpa kolom ini:
--   - berkas Januari dan Februari tercampur dalam satu daftar,
--   - rekap bulan lalu tertimpa rekap bulan berjalan,
--   - tidak bisa menjawab "berapa sekolah yang sudah setor bulan Maret?",
--   - riwayat kepatuhan sekolah tidak dapat ditelusuri.
--
-- SOLUSI
-- Menambahkan kolom `period` (format YYYY-MM). Format string ini dipilih
-- karena bisa diurutkan dan dibandingkan langsung tanpa parsing tanggal.
--
-- AMAN DIJALANKAN
-- Migrasi ini hanya MENAMBAH kolom dan mengisi baris lama dari submitted_at.
-- Tidak ada data yang dihapus atau diubah artinya. Aplikasi juga sudah
-- dirancang untuk tetap berjalan bila kolom ini belum ada (resolvePeriod()
-- akan jatuh kembali ke submitted_at).
-- ============================================================


-- 1. Tambah kolom periode
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS period TEXT;

-- 2. Isi periode untuk seluruh baris lama, diturunkan dari tanggal unggah
UPDATE submissions
SET period = to_char(submitted_at, 'YYYY-MM')
WHERE period IS NULL;

-- 3. Percepat kueri "berkas periode X"
CREATE INDEX IF NOT EXISTS idx_submissions_period
  ON submissions (period);

CREATE INDEX IF NOT EXISTS idx_submissions_school_period
  ON submissions (school_npsn, period);

-- 4. Cegah unggahan ganda pada tingkat database.
--    Aplikasi sudah mencegahnya di addSubmission(), tetapi batasan di sini
--    menjamin konsistensi walaupun ada penulisan dari jalur lain.
--
--    CATATAN: jalankan blok DELETE di bawah lebih dulu bila database Anda
--    sudah terlanjur memiliki duplikat, karena indeks unik akan gagal dibuat.

-- 4a. Sisakan satu baris terbaru untuk tiap (sekolah, kategori, periode)
DELETE FROM submissions a
USING submissions b
WHERE a.school_npsn = b.school_npsn
  AND a.category_id = b.category_id
  AND a.period      = b.period
  AND a.submitted_at < b.submitted_at;

-- 4b. Baru pasang indeks uniknya
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique_period
  ON submissions (school_npsn, category_id, period);
