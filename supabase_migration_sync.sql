-- ============================================================
-- Koryandik Cibadak — SQL Migrasi Sinkronisasi Data
-- Jalankan SQL ini di Supabase SQL Editor SETELAH supabase_schema.sql
-- ============================================================

-- ========== MIGRASI 1: Sinkronisasi Koordinator Gugus ==========
-- Mengubah kolom 'koordinator' pada tabel gugus agar selalu
-- mengambil dari 'operator_name' sekolah inti (sekolah koordinator).
-- Ini memastikan konsistensi data: satu sumber kebenaran.

UPDATE gugus g
SET koordinator = s.operator_name
FROM schools s
WHERE g.sekolah_inti = s.npsn
  AND g.koordinator != s.operator_name;

-- ========== MIGRASI 2: Sinkronisasi Passcode Gugus ==========
-- Passcode gugus harus selalu sama dengan NPSN sekolah inti.
-- Jika admin mengganti sekolah inti, passcode otomatis ikut.

UPDATE gugus
SET passcode = sekolah_inti
WHERE passcode != sekolah_inti;

-- ========== TRIGGER: Auto-Sync Koordinator saat Operator Sekolah Berubah ==========
-- Jika operator_name sekolah diubah di tabel schools, otomatis update
-- koordinator di tabel gugus yang menjadikan sekolah itu sebagai inti.

CREATE OR REPLACE FUNCTION sync_gugus_koordinator()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.operator_name IS DISTINCT FROM NEW.operator_name THEN
    UPDATE gugus
    SET koordinator = NEW.operator_name
    WHERE sekolah_inti = NEW.npsn;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_gugus_koordinator ON schools;
CREATE TRIGGER trg_sync_gugus_koordinator
  AFTER UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION sync_gugus_koordinator();

-- ========== TRIGGER: Auto-Sync Passcode saat Sekolah Inti Berubah ==========
-- Jika sekolah_inti di tabel gugus berubah, passcode otomatis ikut
-- dan koordinator diambil dari operator_name sekolah baru.

CREATE OR REPLACE FUNCTION sync_gugus_on_inti_change()
RETURNS TRIGGER AS $$
DECLARE
  new_operator TEXT;
BEGIN
  IF OLD.sekolah_inti IS DISTINCT FROM NEW.sekolah_inti THEN
    NEW.passcode := NEW.sekolah_inti;
    SELECT operator_name INTO new_operator
    FROM schools WHERE npsn = NEW.sekolah_inti;
    IF new_operator IS NOT NULL THEN
      NEW.koordinator := new_operator;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_gugus_inti_change ON gugus;
CREATE TRIGGER trg_sync_gugus_inti_change
  BEFORE UPDATE ON gugus
  FOR EACH ROW
  EXECUTE FUNCTION sync_gugus_on_inti_change();

-- ========== VIEW: Gugus dengan Info Sekolah Inti (Lengkap) ==========
-- View ini menyatukan data gugus dengan sekolah inti untuk query cepat.

CREATE OR REPLACE VIEW v_gugus_lengkap WITH (security_invoker = true) AS
SELECT
  g.id AS gugus_id,
  g.name AS gugus_name,
  g.koordinator,
  g.sekolah_inti AS sekolah_inti_npsn,
  s.name AS sekolah_inti_name,
  s.operator_name AS operator_sekolah_inti,
  s.principal_name AS kepala_sekolah_inti,
  s.address AS alamat_sekolah_inti,
  g.passcode,
  (SELECT COUNT(*) FROM schools sc WHERE sc.gugus_id = g.id) AS jumlah_sekolah
FROM gugus g
LEFT JOIN schools s ON g.sekolah_inti = s.npsn;

-- ========== VIEW: Rekap Berkas per Gugus (Dashboard) ==========
-- Agregasi status submission per gugus untuk dashboard admin.

CREATE OR REPLACE VIEW v_rekap_gugus WITH (security_invoker = true) AS
SELECT
  g.id AS gugus_id,
  g.name AS gugus_name,
  COUNT(DISTINCT sc.npsn) AS jumlah_sekolah,
  COUNT(sub.id) AS total_berkas,
  COUNT(sub.id) FILTER (WHERE sub.status = 'approved') AS berkas_disetujui,
  COUNT(sub.id) FILTER (WHERE sub.status = 'pending') AS berkas_menunggu,
  COUNT(sub.id) FILTER (WHERE sub.status = 'revision') AS berkas_revisi,
  COUNT(sub.id) FILTER (WHERE sub.status = 'rejected') AS berkas_ditolak,
  CASE
    WHEN COUNT(sub.id) > 0 THEN
      ROUND(COUNT(sub.id) FILTER (WHERE sub.status = 'approved')::NUMERIC / COUNT(sub.id) * 100, 1)
    ELSE 0
  END AS persen_disetujui
FROM gugus g
LEFT JOIN schools sc ON sc.gugus_id = g.id
LEFT JOIN submissions sub ON sub.school_npsn = sc.npsn
GROUP BY g.id, g.name
ORDER BY g.id;

-- ========== VIEW: Rekap Berkas per Sekolah ==========
-- Agregasi status submission per sekolah untuk monitoring.

CREATE OR REPLACE VIEW v_rekap_sekolah WITH (security_invoker = true) AS
SELECT
  s.npsn,
  s.name AS nama_sekolah,
  s.gugus_id,
  s.operator_name,
  s.principal_name AS kepala_sekolah,
  COUNT(sub.id) AS total_berkas,
  COUNT(sub.id) FILTER (WHERE sub.status = 'approved') AS disetujui,
  COUNT(sub.id) FILTER (WHERE sub.status = 'pending') AS menunggu,
  COUNT(sub.id) FILTER (WHERE sub.status = 'revision') AS revisi,
  COUNT(sub.id) FILTER (WHERE sub.status = 'rejected') AS ditolak,
  CASE
    WHEN (SELECT COUNT(*) FROM categories) > 0 THEN
      ROUND(
        COUNT(sub.id) FILTER (WHERE sub.status = 'approved')::NUMERIC /
        (SELECT COUNT(*) FROM categories) * 100, 1
      )
    ELSE 0
  END AS persen_kelengkapan
FROM schools s
LEFT JOIN submissions sub ON sub.school_npsn = s.npsn
GROUP BY s.npsn, s.name, s.gugus_id, s.operator_name, s.principal_name
ORDER BY s.gugus_id, s.name;

-- ========== VIEW: Log Aktivitas Terbaru ==========
CREATE OR REPLACE VIEW v_log_terbaru WITH (security_invoker = true) AS
SELECT
  id,
  action,
  username,
  role,
  timestamp,
  details
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 100;

-- ========== FUNCTION: Statistik Dashboard Admin ==========
-- Fungsi untuk mendapatkan semua statistik dashboard admin dalam 1 query.

CREATE OR REPLACE FUNCTION fn_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sekolah', (SELECT COUNT(*) FROM schools),
    'total_gugus', (SELECT COUNT(*) FROM gugus),
    'total_kategori', (SELECT COUNT(*) FROM categories),
    'total_berkas', (SELECT COUNT(*) FROM submissions),
    'berkas_disetujui', (SELECT COUNT(*) FROM submissions WHERE status = 'approved'),
    'berkas_menunggu', (SELECT COUNT(*) FROM submissions WHERE status = 'pending'),
    'berkas_revisi', (SELECT COUNT(*) FROM submissions WHERE status = 'revision'),
    'berkas_ditolak', (SELECT COUNT(*) FROM submissions WHERE status = 'rejected'),
    'total_pengumuman', (SELECT COUNT(*) FROM announcements),
    'total_log', (SELECT COUNT(*) FROM audit_logs),
    'persen_kelengkapan', (
      CASE
        WHEN (SELECT COUNT(*) FROM schools) * (SELECT COUNT(*) FROM categories) > 0 THEN
          ROUND(
            (SELECT COUNT(*) FROM submissions WHERE status = 'approved')::NUMERIC /
            ((SELECT COUNT(*) FROM schools) * (SELECT COUNT(*) FROM categories)) * 100, 1
          )
        ELSE 0
      END
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CATATAN PENGGUNAAN:
-- ============================================================
-- 1. Jalankan supabase_schema.sql terlebih dahulu (tabel + seed data).
-- 2. Jalankan file ini (supabase_migration_sync.sql) setelahnya.
-- 3. Trigger otomatis akan menjaga konsistensi data:
--    - Ubah operator sekolah → koordinator gugus ikut berubah
--    - Ubah sekolah inti gugus → passcode & koordinator ikut berubah
-- 4. Gunakan view untuk query cepat:
--    - SELECT * FROM v_gugus_lengkap;
--    - SELECT * FROM v_rekap_gugus;
--    - SELECT * FROM v_rekap_sekolah;
--    - SELECT * FROM fn_dashboard_stats();
-- ============================================================
