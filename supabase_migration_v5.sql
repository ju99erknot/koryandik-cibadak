-- ============================================================
-- Koryandik Cibadak — Migration v5
-- Memastikan tabel supervisors sudah lengkap dan mendukung
-- fitur Kelola Pengawas di halaman Admin Settings.
-- ============================================================

-- Pastikan tabel supervisors ada (idempotent)
CREATE TABLE IF NOT EXISTS supervisors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nip TEXT,
  passcode TEXT,
  role TEXT NOT NULL CHECK (role IN ('pengawas', 'kkks', 'pgri', 'admin')),
  title TEXT,
  wilayah TEXT,
  photo_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambahkan kolom updated_at jika belum ada (safe migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supervisors' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE supervisors ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Index untuk pencarian berdasarkan role
CREATE INDEX IF NOT EXISTS idx_supervisors_role ON supervisors (role);

-- Trigger auto-update updated_at saat data diubah
CREATE OR REPLACE FUNCTION update_supervisors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supervisors_updated_at ON supervisors;

CREATE TRIGGER trg_supervisors_updated_at
  BEFORE UPDATE ON supervisors
  FOR EACH ROW EXECUTE FUNCTION update_supervisors_updated_at();

-- Pastikan RLS aktif
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan anon key akses penuh (sesuaikan untuk production)
DROP POLICY IF EXISTS "Allow all for anon" ON supervisors;
CREATE POLICY "Allow all for anon" ON supervisors
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA — Data default pengawas, KKKS, PGRI, dan Admin
-- Hanya akan dimasukkan jika ID belum ada (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO supervisors (id, name, nip, passcode, role, title, wilayah, photo_url, phone) VALUES
  ('admin-1', 'Administrator Koryandik', '-', 'admin123', 'admin', 'Super Administrator', 'Kecamatan Cibadak', '/admin.png', '-'),
  ('pengawas-1', 'AHMAD YANI, S.Pd', '196512151986031005', '196512151986031005', 'pengawas', 'Pengawas Sekolah', 'Kecamatan Cibadak', '/pengawas.png', '+6285759123456'),
  ('kkks-1', 'KURNIAWAN, S.Pd', '197003121992032008', '197003121992032008', 'kkks', 'Ketua KKKS', 'Kecamatan Cibadak', '/kkks.png', '+6281234567890'),
  ('pgri-1', 'ACENG MUSTOPA, S.Pd', '196808081990011003', '196808081990011003', 'pgri', 'Ketua PGRI Kec. Cibadak', 'Kecamatan Cibadak', '/ketua-pgri.png', '+6281398765432')
ON CONFLICT (id) DO NOTHING;
