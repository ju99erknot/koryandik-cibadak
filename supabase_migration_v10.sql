-- ============================================================
-- Koryandik Cibadak — Migration V10: School Portal Tables
-- ============================================================

-- ========== 1. TABEL SCHOOL FACILITIES ==========
CREATE TABLE IF NOT EXISTS school_facilities (
  id TEXT PRIMARY KEY,
  school_npsn TEXT NOT NULL REFERENCES schools(npsn) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'fa-building',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_facilities_npsn ON school_facilities(school_npsn);

-- ========== 2. TABEL SCHOOL ACHIEVEMENTS ==========
CREATE TABLE IF NOT EXISTS school_achievements (
  id TEXT PRIMARY KEY,
  school_npsn TEXT NOT NULL REFERENCES schools(npsn) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  category TEXT DEFAULT 'akademik' CHECK (category IN ('akademik', 'olahraga', 'seni', 'keagamaan', 'lainnya')),
  icon TEXT DEFAULT 'fa-trophy',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_achievements_npsn ON school_achievements(school_npsn);

-- ========== 3. TAMBAH school_npsn KE GALLERY ==========
-- Menambahkan kolom school_npsn (nullable) agar galeri bisa per-sekolah
-- NULL = galeri umum Koryandik, NOT NULL = galeri sekolah tertentu
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gallery' AND column_name = 'school_npsn'
  ) THEN
    -- Check if gallery table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gallery') THEN
      ALTER TABLE gallery ADD COLUMN school_npsn TEXT REFERENCES schools(npsn) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_gallery_school ON gallery(school_npsn);
    END IF;
  END IF;
END $$;

-- ========== 4. RLS POLICIES ==========
ALTER TABLE school_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON school_facilities;
DROP POLICY IF EXISTS "Allow all for anon" ON school_achievements;

CREATE POLICY "Allow all for anon" ON school_facilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON school_achievements FOR ALL USING (true) WITH CHECK (true);

-- ========== 5. SEED: SAMPLE FACILITIES (beberapa sekolah) ==========
INSERT INTO school_facilities (id, school_npsn, name, icon, description, sort_order) VALUES
  ('fac-001', '20202645', 'Ruang Kelas', 'fa-chalkboard', '12 ruang kelas dengan AC dan proyektor', 1),
  ('fac-002', '20202645', 'Perpustakaan', 'fa-book-open', 'Koleksi 2.500+ buku dan ruang baca nyaman', 2),
  ('fac-003', '20202645', 'Lab Komputer', 'fa-desktop', '20 unit komputer dengan akses internet', 3),
  ('fac-004', '20202645', 'Lapangan Olahraga', 'fa-futbol', 'Lapangan serbaguna untuk olahraga dan upacara', 4),
  ('fac-005', '20202645', 'Musholla', 'fa-mosque', 'Musholla untuk kegiatan keagamaan', 5),
  ('fac-006', '20202645', 'UKS', 'fa-kit-medical', 'Unit Kesehatan Sekolah lengkap', 6),
  ('fac-007', '20202154', 'Ruang Kelas', 'fa-chalkboard', '18 ruang kelas ber-AC', 1),
  ('fac-008', '20202154', 'Perpustakaan', 'fa-book-open', 'Perpustakaan digital dan konvensional', 2),
  ('fac-009', '20202154', 'Lab Komputer', 'fa-desktop', '25 unit komputer', 3),
  ('fac-010', '20202154', 'Kantin Sehat', 'fa-utensils', 'Kantin dengan standar kebersihan tinggi', 4)
ON CONFLICT (id) DO NOTHING;

-- ========== 6. SEED: SAMPLE ACHIEVEMENTS ==========
INSERT INTO school_achievements (id, school_npsn, title, description, year, category, icon) VALUES
  ('ach-001', '20202645', 'Juara 1 Olimpiade Matematika', 'Tingkat Kabupaten Sukabumi', 2024, 'akademik', 'fa-calculator'),
  ('ach-002', '20202645', 'Juara 2 Lomba Cerdas Cermat', 'Tingkat Kecamatan Cibadak', 2024, 'akademik', 'fa-brain'),
  ('ach-003', '20202645', 'Juara 1 Lomba Futsal', 'Tingkat Kecamatan Cibadak', 2023, 'olahraga', 'fa-futbol'),
  ('ach-004', '20202645', 'Sekolah Adiwiyata', 'Penghargaan Sekolah Berwawasan Lingkungan', 2023, 'lainnya', 'fa-leaf'),
  ('ach-005', '20202154', 'Juara 1 Lomba Pramuka', 'Tingkat Kabupaten Sukabumi', 2024, 'lainnya', 'fa-campground'),
  ('ach-006', '20202154', 'Juara 3 Olimpiade IPA', 'Tingkat Kecamatan Cibadak', 2024, 'akademik', 'fa-flask'),
  ('ach-007', '20202154', 'Akreditasi A', 'Akreditasi dari BAN-S/M', 2023, 'akademik', 'fa-award')
ON CONFLICT (id) DO NOTHING;
