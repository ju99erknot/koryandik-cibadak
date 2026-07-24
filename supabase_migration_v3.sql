-- ============================================================
-- Koryandik Cibadak — Migration v3
-- Jalankan SETELAH supabase_migration_v2.sql
-- Deadline kategori, constraint notifikasi, normalisasi data
-- ============================================================

-- ========== 1. CATEGORIES: ubah deadline dari TIMESTAMPTZ ke TEXT ==========
ALTER TABLE categories ALTER COLUMN deadline TYPE TEXT;

-- ========== 2. NOTIFICATIONS: CHECK target_role ==========
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_target_role_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_target_role_check
  CHECK (target_role IS NULL OR target_role IN (
    'admin', 'school', 'gugus', 'pengawas', 'kkks', 'pgri'
  ));

-- ========== 3. CATEGORIES: seed deadline baku ==========
UPDATE categories SET deadline = 'Setiap tanggal 10' WHERE id = 'cat-1';
UPDATE categories SET deadline = 'Setiap tanggal 12' WHERE id = 'cat-2';
UPDATE categories SET deadline = 'Setiap tanggal 15' WHERE id = 'cat-3';
UPDATE categories SET deadline = 'Setiap tanggal 15' WHERE id = 'cat-4';
UPDATE categories SET deadline = 'Setiap tanggal 20' WHERE id = 'cat-5';
UPDATE categories SET deadline = 'Setiap akhir bulan' WHERE id = 'cat-6';
UPDATE categories SET deadline = 'Setiap tanggal 5' WHERE id = 'cat-7';
UPDATE categories SET deadline = 'Sesuai jadwal akreditasi' WHERE id = 'cat-8';

-- ========== 3. GUGUS: pastikan koordinator dari seed (bukan operator) ==========
UPDATE gugus SET koordinator = 'Hj. Euis Komariah, S.Pd' WHERE id = 'I';
UPDATE gugus SET koordinator = 'Drs. Agus Supriatna' WHERE id = 'II';
UPDATE gugus SET koordinator = 'Cecep Rustandi, S.Pd' WHERE id = 'III';
UPDATE gugus SET koordinator = 'H. Dedi Mulyadi, M.Pd' WHERE id = 'IV';
UPDATE gugus SET koordinator = 'Ade Hermawan, S.Pd' WHERE id = 'V';
