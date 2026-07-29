-- ============================================================
-- Koryandik Cibadak — Migration v2 (Canonical Sync)
-- Jalankan SETELAH supabase_schema.sql pada database yang sudah ada.
-- Lanjutkan dengan supabase_migration_v3.sql setelah script ini.
-- Script ini menyelaraskan constraint, enum, dan kolom yang drift.
-- ============================================================

-- ========== 1. SUPERVISORS: tambah role admin + kkks + pgri ==========
ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS supervisors_role_check;
ALTER TABLE supervisors ADD CONSTRAINT supervisors_role_check
  CHECK (role IN ('admin', 'pengawas', 'kkks', 'pgri'));

-- Pastikan admin user ada (auth app memakai supervisors, bukan tabel admins)
INSERT INTO supervisors (id, name, nip, passcode, role, title, wilayah, photo_url, phone)
VALUES ('admin-1', 'Administrator Koryandik', '-', 'admin123', 'admin', 'Super Administrator', 'Kecamatan Cibadak', '/admin.png', '-')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  passcode = EXCLUDED.passcode,
  title = EXCLUDED.title;

-- ========== 2. SUBMISSIONS: pastikan status enum lengkap ==========
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'revision'));

-- ========== 3. NOTIFICATIONS: constraint type & target_role ==========
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('upload', 'approved', 'rejected', 'revision', 'announcement', 'system'));

-- Normalisasi target_role ke nilai yang dipakai aplikasi
UPDATE notifications SET target_role = 'school' WHERE target_role IS NOT NULL AND target_role NOT IN (
  'admin', 'school', 'gugus', 'pengawas', 'kkks', 'pgri'
);

-- ========== 4. ANNOUNCEMENTS: priority constraint ==========
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_priority_check
  CHECK (priority IN ('low', 'normal', 'high'));

-- ========== 5. SCHOOLS: kolom social media (idempotent) ==========
ALTER TABLE schools ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS youtube TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS telegram TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========== 6. INDEX tambahan untuk performa query ==========
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_npsn);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);

-- ========== 7. DEPRECATE tabel admins (opsional — app pakai supervisors) ==========
-- Jika tabel admins ada dari migration lama, biarkan; auth app tidak memakainya.
-- Uncomment baris di bawah jika ingin menghapus tabel legacy:
-- DROP TABLE IF EXISTS public.admins;

-- ========== 8. Verifikasi seed data wajib ==========
INSERT INTO categories (id, name, description, icon) VALUES
  ('cat-1', 'Profil Pendidik & Tenaga Kependidikan', 'Data guru, staf, dan tenaga kependidikan', 'fa-solid fa-user-tie'),
  ('cat-2', 'Administrasi Kelas', 'RPP, silabus, jadwal pelajaran, presensi', 'fa-solid fa-chalkboard'),
  ('cat-3', 'TPG / Sertifikasi Guru', 'Berkas tunjangan profesi guru & sertifikasi', 'fa-solid fa-certificate'),
  ('cat-4', 'Data Dapodik', 'Data pokok pendidikan terintegrasi Kemdikbud', 'fa-solid fa-database'),
  ('cat-5', 'SPJ Dana BOS', 'Surat pertanggungjawaban penggunaan dana BOS', 'fa-solid fa-money-bill-wave'),
  ('cat-6', 'Laporan Bulanan', 'Laporan rutin bulanan sekolah', 'fa-solid fa-calendar-check'),
  ('cat-7', 'SK Pembagian Tugas', 'Surat keputusan pembagian tugas mengajar', 'fa-solid fa-file-signature'),
  ('cat-8', 'Dokumen Akreditasi', 'Berkas persiapan & hasil akreditasi sekolah', 'fa-solid fa-award')
ON CONFLICT (id) DO NOTHING;
