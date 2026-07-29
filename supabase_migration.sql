-- =============================================
-- KORYANDIK CIBADAK - SUPABASE MIGRATION SCRIPT (LEGACY)
-- =============================================
-- DEPRECATED: Gunakan supabase_schema.sql untuk fresh install,
-- lalu supabase_migration_v2.sql untuk database yang sudah ada.
-- File ini dipertahankan untuk referensi historis saja.
-- =============================================

-- 1. TABEL ADMINS
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin (password: admin123 - bcrypt hash)
-- Hash di-generate dari bcrypt dengan cost 10
INSERT INTO public.admins (username, password_hash, name)
VALUES ('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator Utama')
ON CONFLICT (username) DO NOTHING;


-- 2. TABEL GUGUS
CREATE TABLE IF NOT EXISTS public.gugus (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    koordinator VARCHAR(100),
    sekolah_inti VARCHAR(20),
    passcode VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. TABEL SUPERVISORS
CREATE TABLE IF NOT EXISTS public.supervisors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nip VARCHAR(50),
    passcode VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('pengawas', 'kkks', 'pgri')),
    title VARCHAR(100),
    wilayah VARCHAR(100),
    photo_url TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. TABEL CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    deadline TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. TABEL SCHOOLS (pastikan sesuai dengan yang sudah ada)
-- Jika tabel schools sudah ada, skip CREATE TABLE dan langsung INSERT data
-- CREATE TABLE IF NOT EXISTS public.schools (
--     npsn VARCHAR(20) PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     level VARCHAR(10) NOT NULL CHECK (level IN ('SD', 'SMP')),
--     address TEXT,
--     gugus_id VARCHAR(10),
--     principal_name VARCHAR(100),
--     operator_name VARCHAR(100),
--     student_count INTEGER DEFAULT 0,
--     teacher_count INTEGER DEFAULT 0,
--     lat NUMERIC,
--     lng NUMERIC,
--     logo_url TEXT,
--     website TEXT,
--     instagram TEXT,
--     signature_url TEXT,
--     stempel_color VARCHAR(20),
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     FOREIGN KEY (gugus_id) REFERENCES public.gugus(id)
-- );


-- =============================================
-- INSERT DATA MOCK KE TABEL
-- =============================================

-- Insert data gugus
INSERT INTO public.gugus (id, name, koordinator, sekolah_inti, passcode)
VALUES 
('I', 'Gugus I - Cibadak', 'Hj. Euis Komariah, S.Pd', '20202645', '20202645'),
('II', 'Gugus II - Karangtengah', 'Drs. Agus Supriatna', '20202154', '20202154'),
('III', 'Gugus III - Pamuruyan', 'Neni Nuraeni, S.Pd.SD', '20201913', '20201913'),
('IV', 'Gugus IV - Batununggal', 'Asep Saepudin, M.Pd', '20202210', '20202210'),
('V', 'Gugus V - Pamuruyan Swasta', 'Hj. Lilis Suryani, S.Pd', '60726665', '60726665')
ON CONFLICT (id) DO NOTHING;


-- Insert data supervisors
INSERT INTO public.supervisors (id, name, nip, passcode, role, title, wilayah, photo_url, phone)
VALUES 
('pengawas-1', 'AHMAD YANI, S.Pd', '196512151986031005', '196512151986031005', 'pengawas', 'Pengawas Sekolah', 'Kecamatan Cibadak', '/pengawas.png', '+6285759123456'),
('kkks-1', 'KURNIAWAN, S.Pd', '197003121992032008', '197003121992032008', 'kkks', 'Ketua KKKS', 'Kecamatan Cibadak', '/kkks.png', '+6281234567890'),
('pgri-1', 'ACENG MUSTOPA, S.Pd', '196808081990011003', '196808081990011003', 'pgri', 'Ketua PGRI Kec. Cibadak', 'Kecamatan Cibadak', '/ketua-pgri.png', '+6281398765432')
ON CONFLICT (id) DO NOTHING;


-- Insert data categories
INSERT INTO public.categories (id, name, description, icon)
VALUES 
('cat-1', 'Profil Pendidik & Tenaga Kependidikan', 'Data guru, staf, dan tenaga kependidikan', 'fa-solid fa-user-tie'),
('cat-2', 'Administrasi Kelas', 'RPP, silabus, jadwal pelajaran, presensi', 'fa-solid fa-chalkboard'),
('cat-3', 'TPG / Sertifikasi Guru', 'Berkas tunjangan profesi guru & sertifikasi', 'fa-solid fa-certificate'),
('cat-4', 'Data Dapodik', 'Data pokok pendidikan terintegrasi Kemdikbud', 'fa-solid fa-database'),
('cat-5', 'SPJ Dana BOS', 'Surat pertanggungjawaban penggunaan dana BOS', 'fa-solid fa-money-bill-wave'),
('cat-6', 'Laporan Bulanan', 'Laporan rutin bulanan sekolah', 'fa-solid fa-calendar-check'),
('cat-7', 'SK Pembagian Tugas', 'Surat keputusan pembagian tugas mengajar', 'fa-solid fa-file-signature'),
('cat-8', 'Dokumen Akreditasi', 'Berkas persiapan & hasil akreditasi sekolah', 'fa-solid fa-award')
ON CONFLICT (id) DO NOTHING;
