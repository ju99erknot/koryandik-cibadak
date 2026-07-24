-- ============================================================
-- Koryandik Cibadak — Migration V12: School Portal Updates
-- Visi & Misi fields for individual schools
-- ============================================================

ALTER TABLE schools ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS accreditation TEXT DEFAULT 'B';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Negeri';

-- ========== CREATE/ALTER GALLERY TABLE ==========
CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'Lainnya',
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memastikan kolom date & school_npsn ada jika tabel gallery sudah ada sebelumnya
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE;

-- Aktifkan Row Level Security (RLS)
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON gallery;
CREATE POLICY "Allow all for anon" ON gallery FOR ALL USING (true) WITH CHECK (true);
