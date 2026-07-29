-- ============================================================
-- Koryandik Cibadak — Migration v6
-- Menambahkan kolom nomor telepon untuk Kepala Sekolah (ks_phone)
-- dan Operator Sekolah (operator_phone) pada tabel schools.
-- ============================================================

-- Tambahkan kolom ks_phone jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'ks_phone'
  ) THEN
    ALTER TABLE schools ADD COLUMN ks_phone TEXT;
  END IF;
END $$;

-- Tambahkan kolom operator_phone jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'operator_phone'
  ) THEN
    ALTER TABLE schools ADD COLUMN operator_phone TEXT;
  END IF;
END $$;

-- Catatan:
-- Kolom-kolom ini bertipe TEXT agar dapat menyimpan format nomor telepon lokal maupun internasional (+62).
-- RLS policy "Allow all for anon" sudah mencakup kolom baru ini secara otomatis.
