-- ============================================================
-- Koryandik Cibadak — Migration v11: Performance Indexes & Missing Seed Data
-- Tanggal: 21 Juli 2026
-- Tujuan: 
--   1. Menambah index pada foreign key yang belum terindeks
--   2. Seed data default untuk halaman publik (FAQ, Unduhan, Profil, Galeri, dll.)
--      menggunakan ON CONFLICT DO NOTHING agar data yang sudah diedit user TIDAK tertimpa
-- ============================================================

-- ========== 1. PERFORMANCE INDEXES ==========

-- Index untuk gugus.sekolah_inti (FK ke schools.npsn) 
CREATE INDEX IF NOT EXISTS idx_gugus_sekolah_inti ON gugus(sekolah_inti);

-- Index untuk online_presence queries
CREATE INDEX IF NOT EXISTS idx_online_presence_npsn ON online_presence(npsn);
CREATE INDEX IF NOT EXISTS idx_online_presence_gugus_id ON online_presence(gugus_id);

-- Index untuk notifications role-based filtering
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_school_npsn ON notifications(school_npsn);

-- Index untuk submissions school-based lookup
CREATE INDEX IF NOT EXISTS idx_submissions_school_npsn ON submissions(school_npsn);
CREATE INDEX IF NOT EXISTS idx_submissions_category_id ON submissions(category_id);

-- ========== 2. SEED DATA UNTUK HALAMAN PUBLIK ==========
-- ON CONFLICT DO NOTHING menjamin data yang sudah diedit user TIDAK akan tertimpa
-- Menggunakan $$ dollar-quoting agar JSON dengan double-quotes tidak error

-- FAQ Page
INSERT INTO app_settings (key, value, description, updated_at) VALUES (
  'page_faqs',
  $$[
    {"id":"faq-1","question":"Apa itu Koryandik Cibadak?","answer":"Koryandik (Koordinator Layanan Administrasi Pendidikan) adalah portal digital layanan administrasi pendidikan di Kecamatan Cibadak, Kabupaten Sukabumi. Portal ini memfasilitasi pengumpulan, verifikasi, dan rekap berkas administrasi sekolah secara digital."},
    {"id":"faq-2","question":"Siapa saja yang dapat menggunakan portal ini?","answer":"Portal ini dapat digunakan oleh 6 peran: Operator Sekolah, Koordinator Gugus, Pengawas Sekolah, Ketua KKKs, Ketua PGRI Kecamatan, dan Admin Kecamatan Cibadak."},
    {"id":"faq-3","question":"Bagaimana cara login ke portal?","answer":"Klik tombol Login di halaman utama, pilih peran Anda, lalu masukkan NPSN sekolah (untuk operator) atau passcode yang diberikan admin (untuk peran lainnya)."},
    {"id":"faq-4","question":"Berapa jumlah sekolah yang terdaftar?","answer":"Saat ini terdapat 49 sekolah (SD dan SMP) yang terdaftar di 5 Gugus Wilayah binaan Kecamatan Cibadak."},
    {"id":"faq-5","question":"Kapan batas waktu pengumpulan berkas?","answer":"Batas waktu pengumpulan berkas administrasi secara default adalah tanggal 15 setiap bulannya. Namun, admin dapat mengatur batas waktu berbeda untuk setiap kategori berkas."}
  ]$$::jsonb,
  'Data halaman FAQ publik',
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- Downloads Page
INSERT INTO app_settings (key, value, description, updated_at) VALUES (
  'page_downloads',
  $$[
    {"id":"dl-1","title":"Format Laporan BOS","description":"Template laporan penggunaan Dana BOS Reguler terbaru sesuai Permendikbud.","url":"#","category":"template","fileSize":"245 KB","downloadCount":0},
    {"id":"dl-2","title":"Format Profil Sekolah","description":"Template isian profil sekolah lengkap untuk pemutakhiran data Dapodik.","url":"#","category":"template","fileSize":"180 KB","downloadCount":0},
    {"id":"dl-3","title":"Panduan Penggunaan Portal","description":"Buku panduan lengkap penggunaan Portal Koryandik untuk semua peran pengguna.","url":"#","category":"panduan","fileSize":"1.2 MB","downloadCount":0}
  ]$$::jsonb,
  'Data halaman unduhan publik',
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- Profile Page
INSERT INTO app_settings (key, value, description, updated_at) VALUES (
  'page_profile',
  $${
    "name": "Koryandik Cibadak",
    "fullName": "Koordinator Layanan Administrasi Pendidikan Kecamatan Cibadak",
    "address": "Jl. Perintis Kemerdekaan No. 1, Kec. Cibadak, Kab. Sukabumi, Jawa Barat 43351",
    "phone": "-",
    "email": "koryandik.cibadak@sukabumi.go.id",
    "lat": -6.8789,
    "lng": 106.7768,
    "vision": "Menjadi pusat koordinasi layanan administrasi pendidikan yang profesional, transparan, dan akuntabel di Kecamatan Cibadak.",
    "missions": [
      "Memfasilitasi pengumpulan dan verifikasi berkas administrasi sekolah secara digital",
      "Meningkatkan efisiensi dan transparansi layanan administrasi pendidikan",
      "Mendukung digitalisasi tata kelola pendidikan di tingkat kecamatan"
    ]
  }$$::jsonb,
  'Data halaman profil lembaga',
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- Gallery Page
INSERT INTO app_settings (key, value, description, updated_at) VALUES (
  'page_gallery',
  '[]'::jsonb,
  'Data halaman galeri foto kegiatan',
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- Calendar Events
INSERT INTO app_settings (key, value, description, updated_at) VALUES (
  'page_calendar_events',
  '[]'::jsonb,
  'Data event kalender akademik',
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- Related Links
INSERT INTO app_settings (key, value, description, updated_at) VALUES (
  'page_related_links',
  $$[
    {"id":"link-1","title":"Dinas Pendidikan Kab. Sukabumi","url":"https://disdik.sukabumikab.go.id","icon":"fa-solid fa-building-columns","category":"instansi"},
    {"id":"link-2","title":"Data Pokok Pendidikan (Dapodik)","url":"https://dapo.kemdikbud.go.id","icon":"fa-solid fa-database","category":"data"},
    {"id":"link-3","title":"SIPDA Kemendikbud","url":"https://sipda.kemdikbud.go.id","icon":"fa-solid fa-chart-line","category":"data"}
  ]$$::jsonb,
  'Data tautan terkait publik',
  NOW()
) ON CONFLICT (key) DO NOTHING;
