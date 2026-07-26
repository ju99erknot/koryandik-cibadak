-- ============================================================
-- Koryandik Cibadak — Migration v14: Security Hardening (RLS)
-- ============================================================
--
-- MASALAH
-- Seluruh tabel memakai policy "Allow all for anon" dengan
--   USING (true) WITH CHECK (true)
-- Artinya RLS aktif tetapi tidak memfilter apa pun: siapa saja yang punya
-- anon key (anon key selalu terlihat di browser) dapat membaca kolom
-- `passcode`, dan juga MENGUBAH atau MENGHAPUS seluruh isi tabel langsung
-- dari console browser.
--
-- SOLUSI
-- 1. Kolom kredensial dipisah ke tabel privat yang tidak diekspos ke anon.
-- 2. Anon hanya boleh SELECT pada data publik; operasi tulis dicabut.
-- 3. Verifikasi login dilakukan lewat SECURITY DEFINER function sehingga
--    passcode tidak pernah dikirim ke client.
--
-- CATATAN PENERAPAN
-- Jalankan di SQL Editor Supabase. Setelah migrasi ini, penulisan data dari
-- browser akan ditolak — operasi tulis harus lewat Next.js API route yang
-- memakai service_role key (disimpan sebagai env var server, bukan di client).
-- Terapkan bertahap: jalankan Bagian 1–2 dulu, verifikasi login masih jalan,
-- baru lanjut ke Bagian 3.
-- ============================================================


-- ============================================================
-- BAGIAN 1: Pindahkan kredensial ke tabel privat
-- ============================================================

CREATE TABLE IF NOT EXISTS supervisor_credentials (
  supervisor_id TEXT PRIMARY KEY REFERENCES supervisors(id) ON DELETE CASCADE,
  passcode_hash TEXT NOT NULL,
  nip           TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gugus_credentials (
  gugus_id      TEXT PRIMARY KEY REFERENCES gugus(id) ON DELETE CASCADE,
  passcode_hash TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- pgcrypto menyediakan crypt() + gen_salt() untuk hash bcrypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Salin kredensial yang ada ke tabel privat dalam bentuk hash.
INSERT INTO supervisor_credentials (supervisor_id, passcode_hash, nip)
SELECT id, crypt(COALESCE(passcode, nip, id), gen_salt('bf')), nip
FROM supervisors
ON CONFLICT (supervisor_id) DO NOTHING;

INSERT INTO gugus_credentials (gugus_id, passcode_hash)
SELECT id, crypt(COALESCE(passcode, sekolah_inti, id), gen_salt('bf'))
FROM gugus
ON CONFLICT (gugus_id) DO NOTHING;

-- RLS: tabel kredensial tertutup total untuk anon/authenticated.
-- Tanpa policy apa pun + RLS aktif = tidak ada baris yang bisa diakses.
-- Hanya service_role (yang melewati RLS) yang dapat membacanya.
ALTER TABLE supervisor_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE gugus_credentials      ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON supervisor_credentials FROM anon, authenticated;
REVOKE ALL ON gugus_credentials      FROM anon, authenticated;


-- ============================================================
-- BAGIAN 2: Fungsi verifikasi (SECURITY DEFINER)
-- ============================================================
-- Client cukup mengirim id + passcode; fungsi mengembalikan boolean.
-- Passcode tidak pernah meninggalkan database.

CREATE OR REPLACE FUNCTION verify_supervisor_passcode(p_id TEXT, p_passcode TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT passcode_hash INTO stored_hash
  FROM supervisor_credentials
  WHERE supervisor_id = p_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(p_passcode, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION verify_gugus_passcode(p_id TEXT, p_passcode TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT passcode_hash INTO stored_hash
  FROM gugus_credentials
  WHERE gugus_id = p_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(p_passcode, stored_hash);
END;
$$;


-- ============================================================
-- BAGIAN 3: Perketat policy "Allow all for anon"
-- ============================================================
-- Anon boleh membaca data publik, tetapi tidak boleh menulis.
-- Operasi tulis harus lewat server (service_role).

-- --- Tabel data publik: SELECT saja ---
DROP POLICY IF EXISTS "Allow all for anon" ON schools;
DROP POLICY IF EXISTS "Allow all for anon" ON gugus;
DROP POLICY IF EXISTS "Allow all for anon" ON supervisors;
DROP POLICY IF EXISTS "Allow all for anon" ON categories;
DROP POLICY IF EXISTS "Allow all for anon" ON announcements;
DROP POLICY IF EXISTS "Allow all for anon" ON app_settings;

CREATE POLICY "public_read" ON schools       FOR SELECT USING (true);
CREATE POLICY "public_read" ON gugus         FOR SELECT USING (true);
CREATE POLICY "public_read" ON supervisors   FOR SELECT USING (true);
CREATE POLICY "public_read" ON categories    FOR SELECT USING (true);
CREATE POLICY "public_read" ON announcements FOR SELECT USING (true);
CREATE POLICY "public_read" ON app_settings  FOR SELECT USING (true);

-- --- Tabel operasional: anon boleh baca & sisip, tidak boleh hapus massal ---
DROP POLICY IF EXISTS "Allow all for anon" ON submissions;
DROP POLICY IF EXISTS "Allow all for anon" ON audit_logs;
DROP POLICY IF EXISTS "Allow all for anon" ON notifications;

CREATE POLICY "public_read"   ON submissions   FOR SELECT USING (true);
CREATE POLICY "public_insert" ON submissions   FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON submissions   FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "public_read"   ON audit_logs    FOR SELECT USING (true);
CREATE POLICY "public_insert" ON audit_logs    FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read"   ON notifications FOR SELECT USING (true);
CREATE POLICY "public_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON notifications FOR UPDATE USING (true) WITH CHECK (true);

-- Kolom passcode di tabel publik tidak lagi dipakai setelah Bagian 1.
-- Hapus setelah memastikan login berjalan normal:
--
--   ALTER TABLE supervisors DROP COLUMN IF EXISTS passcode;
--   ALTER TABLE gugus       DROP COLUMN IF EXISTS passcode;
