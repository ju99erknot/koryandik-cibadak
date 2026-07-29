-- ============================================================
-- Koryandik Cibadak — Migration V13: Complete System & Portal Sync
-- Jalankan file ini di Supabase SQL Editor jika ingin memastikan
-- seluruh tabel & kolom terbaru 100% sinkron.
-- ============================================================

-- 1. TAMBAH KOLOM TERBARU KE TABEL SCHOOLS (Jika belum ada)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS accreditation TEXT DEFAULT 'B';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Negeri';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_avatar_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS operator_avatar_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS stempel_color TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ks_phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS operator_phone TEXT;

-- 2. TABEL SCHOOL FACILITIES
CREATE TABLE IF NOT EXISTS school_facilities (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'fa-chalkboard',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_facilities_npsn ON school_facilities(school_npsn);
ALTER TABLE school_facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON school_facilities;
CREATE POLICY "Allow all for anon" ON school_facilities FOR ALL USING (true) WITH CHECK (true);

-- 3. TABEL SCHOOL ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS school_achievements (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  category TEXT NOT NULL DEFAULT 'akademik' CHECK (category IN ('akademik', 'olahraga', 'seni', 'keagamaan', 'lainnya')),
  icon TEXT NOT NULL DEFAULT 'fa-trophy',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_achievements_npsn ON school_achievements(school_npsn);
ALTER TABLE school_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON school_achievements;
CREATE POLICY "Allow all for anon" ON school_achievements FOR ALL USING (true) WITH CHECK (true);

-- 4. TABEL GALLERY & PENYESUAIAN KOLOM
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
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_gallery_school_npsn ON gallery(school_npsn);
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON gallery;
CREATE POLICY "Allow all for anon" ON gallery FOR ALL USING (true) WITH CHECK (true);

-- 5. SEED SAMPLE DATA UNTUK DUA SEKOLAH CONTOH
INSERT INTO school_facilities (id, school_npsn, name, icon, description, sort_order) VALUES
  ('fac-001', '20202645', 'Ruang Kelas', 'fa-chalkboard', '12 ruang kelas dengan AC dan proyektor', 1),
  ('fac-002', '20202645', 'Perpustakaan', 'fa-book-open', 'Koleksi 2.500+ buku dan ruang baca nyaman', 2),
  ('fac-003', '20202645', 'Lab Komputer', 'fa-desktop', '20 unit komputer dengan akses internet', 3),
  ('fac-004', '20202645', 'Lapangan Olahraga', 'fa-futbol', 'Lapangan serbaguna untuk olahraga dan upacara', 4),
  ('fac-005', '20202645', 'Musholla', 'fa-mosque', 'Musholla untuk kegiatan keagamaan', 5),
  ('fac-006', '20202645', 'UKS', 'fa-kit-medical', 'Unit Kesehatan Sekolah lengkap', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO school_achievements (id, school_npsn, title, description, year, category, icon) VALUES
  ('ach-001', '20202645', 'Juara 1 Olimpiade Matematika', 'Tingkat Kabupaten Sukabumi', 2024, 'akademik', 'fa-calculator'),
  ('ach-002', '20202645', 'Juara 2 Lomba Cerdas Cermat', 'Tingkat Kecamatan Cibadak', 2024, 'akademik', 'fa-brain'),
  ('ach-003', '20202645', 'Juara 1 Lomba Futsal', 'Tingkat Kecamatan Cibadak', 2023, 'olahraga', 'fa-futbol'),
  ('ach-004', '20202645', 'Sekolah Adiwiyata', 'Penghargaan Sekolah Berwawasan Lingkungan', 2023, 'lainnya', 'fa-leaf')
ON CONFLICT (id) DO NOTHING;
