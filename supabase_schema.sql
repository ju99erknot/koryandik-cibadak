-- ============================================================
-- Koryandik Cibadak — Supabase Full Database Schema (CANONICAL)
-- Fresh install: jalankan file ini di Supabase SQL Editor.
-- Database sudah ada: jalankan supabase_migration_v2.sql setelahnya.
-- ============================================================

-- ========== 1. TABEL SCHOOLS (49 Sekolah) ==========
CREATE TABLE IF NOT EXISTS schools (
  npsn TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'SD' CHECK (level IN ('SD', 'SMP')),
  address TEXT,
  gugus_id TEXT,
  principal_name TEXT,
  operator_name TEXT,
  student_count INTEGER DEFAULT 0,
  teacher_count INTEGER DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  logo_url TEXT,
  signature_url TEXT,
  stempel_color TEXT,
  -- Social Media & Branding
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  tiktok TEXT,
  twitter TEXT,
  linkedin TEXT,
  email TEXT,
  whatsapp TEXT,
  telegram TEXT,
  ks_phone TEXT,
  operator_phone TEXT,
  -- Visi Misi
  vision TEXT,
  mission TEXT,
  -- Identity
  accreditation TEXT DEFAULT 'B',
  status TEXT DEFAULT 'Negeri',
  -- Avatar fields
  principal_avatar_url TEXT,
  operator_avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== ALTER TABLE untuk menambahkan kolom social media ke tabel yang sudah ada ==========
-- Jalankan ini jika tabel schools sudah ada sebelumnya
ALTER TABLE schools ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS youtube TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS telegram TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ks_phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS operator_phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS accreditation TEXT DEFAULT 'B';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Negeri';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_avatar_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS operator_avatar_url TEXT;

-- ========== 2. TABEL GUGUS (5 Gugus) ==========
CREATE TABLE IF NOT EXISTS gugus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  koordinator TEXT,
  sekolah_inti TEXT REFERENCES schools(npsn),
  passcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 3. TABEL SUPERVISORS (Pengawas/KKKS/PGRI/Admin) ==========
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter existing check constraint to include admin role (for existing tables)
ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS supervisors_role_check;
ALTER TABLE supervisors ADD CONSTRAINT supervisors_role_check CHECK (role IN ('pengawas', 'kkks', 'pgri', 'admin'));

-- ========== 4. TABEL CATEGORIES (8 Kategori Berkas) ==========
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  deadline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 5. TABEL SUBMISSIONS ==========
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  notes TEXT,
  file_name TEXT,
  drive_link TEXT
);

-- ========== 6. TABEL AUDIT LOGS ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  username TEXT,
  role TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details TEXT
);

-- ========== 7. TABEL APP_SETTINGS ==========
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings (key);

-- ========== 8. TABEL ANNOUNCEMENTS ==========
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 8. TABEL NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('upload', 'approved', 'rejected', 'revision', 'announcement', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  target_role TEXT CHECK (target_role IS NULL OR target_role IN ('admin', 'school', 'gugus', 'pengawas', 'kkks', 'pgri')),
  school_npsn TEXT,
  icon TEXT
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_submissions_school ON submissions(school_npsn);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_schools_gugus ON schools(gugus_id);

-- ========== AUTO-UPDATE updated_at ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== ROW LEVEL SECURITY ==========
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE gugus ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read/write for anon key (adjust as needed for production)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for anon" ON schools;
DROP POLICY IF EXISTS "Allow all for anon" ON gugus;
DROP POLICY IF EXISTS "Allow all for anon" ON supervisors;
DROP POLICY IF EXISTS "Allow all for anon" ON categories;
DROP POLICY IF EXISTS "Allow all for anon" ON submissions;
DROP POLICY IF EXISTS "Allow all for anon" ON audit_logs;
DROP POLICY IF EXISTS "Allow all for anon" ON announcements;
DROP POLICY IF EXISTS "Allow all for anon" ON notifications;
DROP POLICY IF EXISTS "Allow all for anon" ON app_settings;

CREATE POLICY "Allow all for anon" ON schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON gugus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON supervisors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- SEED DATA
-- ============================================================

-- ========== SEED: 49 SEKOLAH ==========
INSERT INTO schools (npsn, name, level, address, gugus_id, principal_name, operator_name, student_count, teacher_count) VALUES
  -- Gugus I - Cibadak (12 sekolah)
  ('20202645', 'SD NEGERI 01 CIBADAK', 'SD', 'Jl. Raya Cibadak No. 1', 'I', 'H. Ade Kamaluddin, M.Pd', 'Yayan Ruhian', 367, 12),
  ('20202659', 'SD NEGERI 02 CIBADAK', 'SD', 'Jl. Raya Cibadak No. 15', 'I', 'Iwan Setiawan, S.Pd', 'Tina Marlina', 385, 12),
  ('20202660', 'SD NEGERI 03 CIBADAK', 'SD', 'Kp. Pasirkuda RT 02/05', 'I', 'Nining Suningsih, S.Pd', 'Siti Nurjanah', 167, 6),
  ('20202661', 'SD NEGERI 04 CIBADAK', 'SD', 'Kp. Ciheulang RT 01/03', 'I', 'Ade Suryaman, S.Pd', 'Neng Ai', 218, 7),
  ('20202663', 'SD NEGERI 07 CIBADAK', 'SD', 'Jl. Siliwangi No. 22', 'I', 'Dadan Ramdani, S.Pd', 'Fitri Yani', 167, 6),
  ('20202655', 'SD NEGERI 08 CIBADAK', 'SD', 'Kp. Cisalak RT 05/01', 'I', 'Entin Supriatin, S.Pd', 'Ai Rosita', 153, 6),
  ('20202654', 'SD NEGERI 09 CIBADAK', 'SD', 'Kp. Neglasari RT 02/04', 'I', 'Usep Saepuloh, S.Pd', 'Yeni Mulyani', 417, 12),
  ('20202658', 'SD NEGERI 10 CIBADAK', 'SD', 'Jl. Bhayangkara No. 5', 'I', 'Iis Aisyah, S.Pd.SD', 'Lina Herlina', 392, 13),
  ('69758169', 'SD NEGERI 12 CIBADAK', 'SD', 'Jl. Raya Cibadak KM. 2', 'I', 'Tati Mulyati, M.Pd', 'Asep Supriadi', 290, 9),
  ('20202662', 'SD NEGERI 5 CIBADAK', 'SD', 'Jl. Perintis Kemerdekaan No. 9', 'I', 'H. Dedi Mulyadi, M.Pd', 'Irwan Setiawan', 379, 12),
  ('20202822', 'SD NEGERI ANGGAYUDA', 'SD', 'Kp. Anggayuda RT 02/03', 'I', 'Ade Hermawan, S.Pd', 'Eni Nuraeni', 178, 6),
  ('20202757', 'SD NEGERI BABAKANSIRNA', 'SD', 'Kp. Babakansirna RT 04/01', 'I', 'Yuyun Yuningsih, S.Pd', 'Dadang Hermawan', 175, 6),
  -- Gugus II - Karangtengah (9 sekolah)
  ('20202154', 'SD NEGERI 01 KARANGTENGAH', 'SD', 'Jl. Raya Karangtengah No. 1', 'II', 'Drs. Agus Supriatna', 'Rina Mariana', 732, 18),
  ('20202155', 'SD NEGERI 02 KARANGTENGAH', 'SD', 'Kp. Sukamanah RT 01/02', 'II', 'Hj. Teti Suhaeti, S.Pd', 'Santi Agustina', 464, 12),
  ('20202156', 'SD NEGERI 03 KARANGTENGAH', 'SD', 'Kp. Pasirlaja RT 03/01', 'II', 'Cecep Rustandi, S.Pd', 'Nani Suryani', 191, 6),
  ('20202152', 'SD NEGERI 04 KARANGTENGAH', 'SD', 'Jl. Sukamaju No. 12', 'II', 'Yayah Mariah, S.Pd.SD', 'Enung Nurhasanah', 318, 11),
  ('20202153', 'SD NEGERI 05 KARANGTENGAH', 'SD', 'Kp. Cijambe RT 04/03', 'II', 'Undang Suryana, S.Pd', 'Ade Irma', 329, 12),
  ('20202148', 'SD NEGERI 06 KARANGTENGAH', 'SD', 'Kp. Cimanggu RT 02/05', 'II', 'Neni Sumartini, S.Pd', 'Tuti Alawiyah', 280, 8),
  ('20202147', 'SD NEGERI 09 KARANGTENGAH', 'SD', 'Kp. Cibodas RT 05/02', 'II', 'Oman Sulaeman, S.Pd.SD', 'Nining Yuningsih', 428, 12),
  ('20202145', 'SD NEGERI KEBON KAI GIRANG', 'SD', 'Kp. Kebon Kai RT 01/04', 'II', 'Yaya Sunarya, S.Pd', 'Cepi Herdiana', 161, 6),
  ('20202117', 'SD NEGERI KEBONBERA', 'SD', 'Kp. Kebonbera RT 02/03', 'II', 'Imas Masruroh, S.Pd', 'Evi Sovianti', 115, 6),
  -- Gugus III - Pamuruyan (9 sekolah)
  ('20201913', 'SD NEGERI 01 PAMURUYAN', 'SD', 'Jl. Raya Pamuruyan No. 1', 'III', 'Hj. Lilis Suryani, S.Pd', 'Ade Sumarni', 174, 7),
  ('20201915', 'SD NEGERI 02 PAMURUYAN', 'SD', 'Kp. Pasireurih RT 02/01', 'III', 'Endang Rusmiati, S.Pd', 'Nia Kurniati', 200, 6),
  ('20201929', 'SD NEGERI 03 PAMURUYAN', 'SD', 'Kp. Cisande RT 01/04', 'III', 'Aang Kunaefi, S.Pd.SD', 'Eli Nurlaeli', 458, 15),
  ('20201923', 'SD NEGERI 07 PAMURUYAN', 'SD', 'Kp. Bongas RT 03/02', 'III', 'Yayah Juariah, S.Pd', 'Siti Julaeha', 251, 6),
  ('20201922', 'SD NEGERI 08 PAMURUYAN', 'SD', 'Jl. Siliwangi No. 33', 'III', 'Nandang Kusnadi, S.Pd', 'Dedeh Kurniasih', 125, 6),
  ('20201914', 'SD NEGERI 10 PAMURUYAN', 'SD', 'Kp. Cibarengkok RT 04/05', 'III', 'Hj. Iis Aisyah, S.Pd', 'Evi Sovianti', 240, 8),
  ('20201930', 'SD NEGERI 4 PAMURUYAN', 'SD', 'Kp. Sukaresmi RT 02/03', 'III', 'Asep Hidayat, S.Pd.SD', 'Lilis Karlina', 307, 11),
  ('20201931', 'SD NEGERI 5 PAMURUYAN', 'SD', 'Kp. Ciomas RT 05/01', 'III', 'Wida Widaningsih, S.Pd', 'Neng Imas', 216, 7),
  ('20201921', 'SD NEGERI 9 PAMURUYAN', 'SD', 'Jl. Pamuruyan No. 12', 'III', 'Dr. H. Suherman, M.Pd', 'Irfan Maulana', 171, 6),
  -- Gugus IV - Batununggal (12 sekolah)
  ('20202210', 'SD NEGERI 03 LEUMBURSAWAH', 'SD', 'Kp. Leumbursawah RT 01/01', 'IV', 'Ade Rustandi, S.Pd', 'Kurniawan', 266, 8),
  ('20202781', 'SD NEGERI BANTARBADAK', 'SD', 'Kp. Bantarbadak RT 02/02', 'IV', 'Hj. Cucun, S.Pd', 'Agus Setiawan', 183, 6),
  ('20202771', 'SD NEGERI BARUSAWAH', 'SD', 'Kp. Barusawah RT 01/03', 'IV', 'Mamat Rahmat, S.Pd', 'Deden Hermansyah', 198, 7),
  ('20202843', 'SD NEGERI BOJONGKONENG', 'SD', 'Kp. Bojongkoneng RT 03/02', 'IV', 'Ujang Saepul, S.Pd', 'Tati Sumiati', 200, 6),
  ('20203099', 'SD NEGERI CILENGO', 'SD', 'Kp. Cilengo RT 04/01', 'IV', 'Dedi Supriadi, S.Pd', 'Rudi Wijaya', 213, 7),
  ('20202216', 'SD NEGERI LEUWEUNG DATAR', 'SD', 'Kp. Leuweung Datar RT 02/02', 'IV', 'Cecep Rustam, M.Pd', 'Mulyana', 284, 10),
  ('20202245', 'SD NEGERI MALINGGUT', 'SD', 'Kp. Malinggut RT 01/04', 'IV', 'Sri Wahyuni, S.Pd', 'Eneng Maryani', 290, 12),
  ('20201918', 'SD NEGERI PANENJOAN', 'SD', 'Kp. Panenjoan RT 03/03', 'IV', 'Onih Sukaenih, S.Pd', 'Asep Kurnia', 204, 7),
  ('20201941', 'SD NEGERI PARIS', 'SD', 'Kp. Paris RT 02/05', 'IV', 'Wawan Setiawan, S.Pd', 'Yeni Rahmawati', 114, 6),
  ('20202055', 'SD NEGERI PASIR KOLOTOK', 'SD', 'Kp. Pasirkolotok RT 01/02', 'IV', 'Oman Sulaeman, S.Pd', 'Lia Amelia', 152, 6),
  ('20201997', 'SD NEGERI PASIRJATI', 'SD', 'Kp. Pasirjati RT 03/01', 'IV', 'Yayah Rokayah, S.Pd', 'Mimin Aminah', 148, 6),
  ('20202430', 'SD NEGERI SELAGOMBONG', 'SD', 'Kp. Selagombong RT 01/01', 'IV', 'Dedi Rosadi, S.Pd', 'Ade Irawan', 138, 6),
  -- Gugus V - Swasta (7 sekolah)
  ('60726665', 'SD ISLAM ATTARBIYAH', 'SD', 'Jl. Siliwangi No. 120', 'V', 'Hj. Imas Masruroh, S.Pd', 'Rini Astuti', 162, 6),
  ('70011585', 'SD ISLAM TERPADU AL-ALAWI', 'SD', 'Jl. Pembangunan No. 44', 'V', 'Asep Saepudin, M.Pd', 'Ani Suryani', 138, 6),
  ('20253126', 'SD MARDIYUANA', 'SD', 'Jl. Merdeka No. 45', 'V', 'Drs. Ohan Suhandinata', 'Tina Marlina', 146, 6),
  ('20253128', 'SDIT AD-DAWAH', 'SD', 'Jl. Bhayangkara No. 90', 'V', 'Nia Kurniawati, S.Pd', 'Siti Aisyah', 345, 14),
  ('20253127', 'SDIT AL UMMAH', 'SD', 'Jl. Sukajadi No. 5', 'V', 'Wida Widaningsih, S.Pd', 'Neng Imas', 250, 12),
  ('20270783', 'SDIT SULAMUT TAUFIK', 'SD', 'Kp. Cisande RT 02/01', 'V', 'Asep Hidayat, S.Pd', 'Eli Nurlaeli', 30, 6),
  ('70062390', 'SEKOLAH DASAR FIRDAUS', 'SD', 'Jl. Perintis Kemerdekaan KM. 4', 'V', 'Hj. Lilis Suryani, S.Pd', 'Agus Supriatna', 0, 0)
ON CONFLICT (npsn) DO NOTHING;

-- ========== SEED: 5 GUGUS ==========
INSERT INTO gugus (id, name, koordinator, sekolah_inti, passcode) VALUES
  ('I', 'Gugus I - Cibadak', 'Hj. Euis Komariah, S.Pd', '20202645', '20202645'),
  ('II', 'Gugus II - Karangtengah', 'Drs. Agus Supriatna', '20202154', '20202154'),
  ('III', 'Gugus III - Pamuruyan', 'Neni Nuraeni, S.Pd.SD', '20201913', '20201913'),
  ('IV', 'Gugus IV - Batununggal', 'Asep Saepudin, M.Pd', '20202210', '20202210'),
  ('V', 'Gugus V - Pamuruyan Swasta', 'Hj. Lilis Suryani, S.Pd', '60726665', '60726665')
ON CONFLICT (id) DO NOTHING;

-- ========== SEED: ADMIN USER ==========
INSERT INTO supervisors (id, name, nip, passcode, role, title, wilayah, photo_url, phone) VALUES
  ('admin-1', 'Administrator Koryandik', '-', 'admin123', 'admin', 'Super Administrator', 'Kecamatan Cibadak', '/admin.png', '-')
ON CONFLICT (id) DO NOTHING;

-- ========== SEED: 3 SUPERVISORS ==========
INSERT INTO supervisors (id, name, nip, passcode, role, title, wilayah, photo_url, phone) VALUES
  ('pengawas-1', 'AHMAD YANI, S.Pd', '196512151986031005', '196512151986031005', 'pengawas', 'Pengawas Sekolah', 'Kecamatan Cibadak', '/pengawas.png', '+6285759123456'),
  ('kkks-1', 'KURNIAWAN, S.Pd', '197003121992032008', '197003121992032008', 'kkks', 'Ketua KKKS', 'Kecamatan Cibadak', '/kkks.png', '+6281234567890'),
  ('pgri-1', 'ACENG MUSTOPA, S.Pd', '196808081990011003', '196808081990011003', 'pgri', 'Ketua PGRI Kec. Cibadak', 'Kecamatan Cibadak', '/ketua-pgri.png', '+6281398765432')
ON CONFLICT (id) DO NOTHING;

-- ========== SEED: 8 KATEGORI BERKAS ==========
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

-- ========== 10. TABEL ONLINE PRESENCE (Tracking user aktif) ==========
CREATE TABLE IF NOT EXISTS online_presence (
  id TEXT PRIMARY KEY,              -- Format: role-npsn/id (e.g. "school-20201234", "pengawas-1")
  role TEXT NOT NULL,
  user_name TEXT NOT NULL,
  npsn TEXT,                        -- NPSN sekolah (null untuk non-school)
  gugus_id TEXT,                    -- Gugus ID (untuk filter)
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT DEFAULT '/dashboard',   -- Halaman yang sedang dibuka
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat: siapa yang online dalam 2 menit terakhir
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON online_presence (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_presence_role ON online_presence (role);

-- Enable RLS with anon policies for client-side heartbeat
ALTER TABLE online_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select" ON online_presence;
DROP POLICY IF EXISTS "presence_insert" ON online_presence;
DROP POLICY IF EXISTS "presence_update" ON online_presence;
DROP POLICY IF EXISTS "presence_delete" ON online_presence;

CREATE POLICY "presence_select" ON online_presence FOR SELECT TO anon USING (true);
CREATE POLICY "presence_insert" ON online_presence FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "presence_update" ON online_presence FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "presence_delete" ON online_presence FOR DELETE TO anon USING (true);

-- ========== 11. TABEL SCHOOL FACILITIES ==========
CREATE TABLE IF NOT EXISTS school_facilities (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_facilities_npsn ON school_facilities(school_npsn);
ALTER TABLE school_facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON school_facilities;
CREATE POLICY "Allow all for anon" ON school_facilities FOR ALL USING (true) WITH CHECK (true);

-- ========== 12. TABEL SCHOOL ACHIEVEMENTS ==========
CREATE TABLE IF NOT EXISTS school_achievements (
  id TEXT PRIMARY KEY,
  school_npsn TEXT REFERENCES schools(npsn) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  category TEXT NOT NULL CHECK (category IN ('akademik', 'olahraga', 'seni', 'keagamaan', 'lainnya')),
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_achievements_npsn ON school_achievements(school_npsn);
ALTER TABLE school_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON school_achievements;
CREATE POLICY "Allow all for anon" ON school_achievements FOR ALL USING (true) WITH CHECK (true);

-- ========== 13. TABEL GALLERY ==========
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
CREATE INDEX IF NOT EXISTS idx_gallery_school_npsn ON gallery(school_npsn);
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON gallery;
CREATE POLICY "Allow all for anon" ON gallery FOR ALL USING (true) WITH CHECK (true);


