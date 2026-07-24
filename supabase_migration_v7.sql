-- ============================================================
-- Koryandik Cibadak — Migration v7
-- Mengaktifkan RLS dan membuat policy untuk tabel app_settings
-- agar data dinamis (Galeri, FAQ, Unduhan, dll) bisa disimpan.
-- ============================================================

-- 1. Aktifkan Row Level Security (RLS) pada tabel app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Hapus policy lama jika ada untuk menghindari konflik
DROP POLICY IF EXISTS "Allow all for anon" ON app_settings;

-- 3. Buat policy agar anon/public bisa melakukan SELECT, INSERT, UPDATE, dan DELETE
CREATE POLICY "Allow all for anon" ON app_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);
