// ============================================================
// Koryandik Cibadak — Schools, Gugus, Pengawas, KKKS, PGRI Data
// ============================================================

export interface School {
  npsn: string;
  name: string;
  level: 'SD' | 'SMP';
  address?: string | null;
  gugus: string; // "I" | "II" | "III" | "IV" | "V"
  principalName?: string | null;
  operatorName?: string | null;
  studentCount: number;
  teacherCount: number;
  lat?: number | null;
  lng?: number | null;
  logoUrl?: string;
  signatureUrl?: string;
  stempelColor?: string;
  // Avatar fields
  principalAvatarUrl?: string;
  operatorAvatarUrl?: string;
  // Social Media & Branding
  website?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  ksPhone?: string | null;
  operatorPhone?: string | null;
  vision?: string | null;
  mission?: string | null;
  accreditation?: 'A' | 'B' | 'C' | 'Belum Terakreditasi' | string | null;
  status?: 'Negeri' | 'Swasta' | string | null;
}

export interface GugusData {
  id: string;
  name: string;
  koordinator: string;
  sekolahInti: string; // NPSN sekolah inti
  passcode: string;
}

export interface PengawasData {
  id: string;
  name: string;
  nip: string;
  passcode: string;
  role: 'pengawas' | 'kkks' | 'pgri' | 'admin';
  title: string;
  wilayah: string;
  photoUrl?: string;
  phone?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  deadline?: string;
}

// ============ 5 GUGUS ============
export const gugusData: GugusData[] = [
  { id: 'I', name: 'Gugus I - Cibadak', koordinator: '', sekolahInti: '20202645', passcode: '20202645' },
  { id: 'II', name: 'Gugus II - Karangtengah', koordinator: '', sekolahInti: '20202154', passcode: '20202154' },
  { id: 'III', name: 'Gugus III - Pamuruyan', koordinator: '', sekolahInti: '20201913', passcode: '20201913' },
  { id: 'IV', name: 'Gugus IV - Batununggal', koordinator: '', sekolahInti: '20202210', passcode: '20202210' },
  { id: 'V', name: 'Gugus V - Pamuruyan Swasta', koordinator: '', sekolahInti: '60726665', passcode: '60726665' },
];

// ============ PENGAWAS / KKKS / PGRI / ADMIN ============
export const supervisorData: PengawasData[] = [
  {
    id: 'admin-1',
    name: 'Administrator Koryandik',
    nip: '-',
    passcode: 'admin123',
    role: 'admin',
    title: 'Super Administrator',
    wilayah: 'Kecamatan Cibadak',
    photoUrl: '/admin.png',
    phone: '-'
  },
  {
    id: 'pengawas-1',
    name: 'AHMAD YANI, S.Pd',
    nip: '196512151986031005',
    passcode: '196512151986031005',
    role: 'pengawas',
    title: 'Pengawas Sekolah',
    wilayah: 'Kecamatan Cibadak',
    photoUrl: '/pengawas.png',
    phone: '+6285759123456'
  },
  {
    id: 'kkks-1',
    name: 'KURNIAWAN, S.Pd',
    nip: '197003121992032008',
    passcode: '197003121992032008',
    role: 'kkks',
    title: 'Ketua KKKS',
    wilayah: 'Kecamatan Cibadak',
    photoUrl: '/kkks.png',
    phone: '+6281234567890'
  },
  {
    id: 'pgri-1',
    name: 'ACENG MUSTOPA, S.Pd',
    nip: '196808081990011003',
    passcode: '196808081990011003',
    role: 'pgri',
    title: 'Ketua PGRI Kec. Cibadak',
    wilayah: 'Kecamatan Cibadak',
    photoUrl: '/ketua-pgri.png',
    phone: '+6281398765432'
  },
];

// ============ KATEGORI BERKAS ============
export const categories: Category[] = [
  { id: 'cat-1', name: 'Profil Pendidik & Tenaga Kependidikan', description: 'Data guru, staf, dan tenaga kependidikan', icon: 'fa-solid fa-user-tie', deadline: 'Setiap tanggal 10' },
  { id: 'cat-2', name: 'Administrasi Kelas', description: 'RPP, silabus, jadwal pelajaran, presensi', icon: 'fa-solid fa-chalkboard', deadline: 'Setiap tanggal 12' },
  { id: 'cat-3', name: 'TPG / Sertifikasi Guru', description: 'Berkas tunjangan profesi guru & sertifikasi', icon: 'fa-solid fa-certificate', deadline: 'Setiap tanggal 15' },
  { id: 'cat-4', name: 'Data Dapodik', description: 'Data pokok pendidikan terintegrasi Kemdikbud', icon: 'fa-solid fa-database', deadline: 'Setiap tanggal 15' },
  { id: 'cat-5', name: 'SPJ Dana BOS', description: 'Surat pertanggungjawaban penggunaan dana BOS', icon: 'fa-solid fa-money-bill-wave', deadline: 'Setiap tanggal 20' },
  { id: 'cat-6', name: 'Laporan Bulanan', description: 'Laporan rutin bulanan sekolah', icon: 'fa-solid fa-calendar-check', deadline: 'Setiap akhir bulan' },
  { id: 'cat-7', name: 'SK Pembagian Tugas', description: 'Surat keputusan pembagian tugas mengajar', icon: 'fa-solid fa-file-signature', deadline: 'Setiap tanggal 5' },
  { id: 'cat-8', name: 'Dokumen Akreditasi', description: 'Berkas persiapan & hasil akreditasi sekolah', icon: 'fa-solid fa-award', deadline: 'Sesuai jadwal akreditasi' },
];

// ============ 49 SEKOLAH (DATA REAL KORYANDIK CIBADAK) ============
export const schoolsData: School[] = [
  // Gugus I - Cibadak (12 sekolah)
  { npsn: '20202645', name: 'SD NEGERI 01 CIBADAK', level: 'SD', address: 'Jl. Raya Cibadak No. 1', gugus: 'I', principalName: 'H. Ade Kamaluddin, M.Pd', operatorName: 'Hj. Euis Komariah, S.Pd', studentCount: 367, teacherCount: 12 },
  { npsn: '20202659', name: 'SD NEGERI 02 CIBADAK', level: 'SD', address: 'Jl. Raya Cibadak No. 15', gugus: 'I', principalName: 'Iwan Setiawan, S.Pd', operatorName: 'Tina Marlina', studentCount: 385, teacherCount: 12 },
  { npsn: '20202660', name: 'SD NEGERI 03 CIBADAK', level: 'SD', address: 'Kp. Pasirkuda RT 02/05', gugus: 'I', principalName: 'Nining Suningsih, S.Pd', operatorName: 'Siti Nurjanah', studentCount: 167, teacherCount: 6 },
  { npsn: '20202661', name: 'SD NEGERI 04 CIBADAK', level: 'SD', address: 'Kp. Ciheulang RT 01/03', gugus: 'I', principalName: 'Ade Suryaman, S.Pd', operatorName: 'Neng Ai', studentCount: 218, teacherCount: 7 },
  { npsn: '20202663', name: 'SD NEGERI 07 CIBADAK', level: 'SD', address: 'Jl. Siliwangi No. 22', gugus: 'I', principalName: 'Dadan Ramdani, S.Pd', operatorName: 'Fitri Yani', studentCount: 167, teacherCount: 6 },
  { npsn: '20202655', name: 'SD NEGERI 08 CIBADAK', level: 'SD', address: 'Kp. Cisalak RT 05/01', gugus: 'I', principalName: 'Entin Supriatin, S.Pd', operatorName: 'Ai Rosita', studentCount: 153, teacherCount: 6 },
  { npsn: '20202654', name: 'SD NEGERI 09 CIBADAK', level: 'SD', address: 'Kp. Neglasari RT 02/04', gugus: 'I', principalName: 'Usep Saepuloh, S.Pd', operatorName: 'Yeni Mulyani', studentCount: 417, teacherCount: 12 },
  { npsn: '20202658', name: 'SD NEGERI 10 CIBADAK', level: 'SD', address: 'Jl. Bhayangkara No. 5', gugus: 'I', principalName: 'Iis Aisyah, S.Pd.SD', operatorName: 'Lina Herlina', studentCount: 392, teacherCount: 13 },
  { npsn: '69758169', name: 'SD NEGERI 12 CIBADAK', level: 'SD', address: 'Jl. Raya Cibadak KM. 2', gugus: 'I', principalName: 'Tati Mulyati, M.Pd', operatorName: 'Asep Supriadi', studentCount: 290, teacherCount: 9 },
  { npsn: '20202662', name: 'SD NEGERI 5 CIBADAK', level: 'SD', address: 'Jl. Perintis Kemerdekaan No. 9', gugus: 'I', principalName: 'H. Dedi Mulyadi, M.Pd', operatorName: 'Irwan Setiawan', studentCount: 379, teacherCount: 12 },
  { npsn: '20202822', name: 'SD NEGERI ANGGAYUDA', level: 'SD', address: 'Kp. Anggayuda RT 02/03', gugus: 'I', principalName: 'Ade Hermawan, S.Pd', operatorName: 'Eni Nuraeni', studentCount: 178, teacherCount: 6 },
  { npsn: '20202757', name: 'SD NEGERI BABAKANSIRNA', level: 'SD', address: 'Kp. Babakansirna RT 04/01', gugus: 'I', principalName: 'Yuyun Yuningsih, S.Pd', operatorName: 'Dadang Hermawan', studentCount: 175, teacherCount: 6 },

  // Gugus II - Karangtengah (9 sekolah)
  { npsn: '20202154', name: 'SD NEGERI 01 KARANGTENGAH', level: 'SD', address: 'Jl. Raya Karangtengah No. 1', gugus: 'II', principalName: 'Drs. Agus Supriatna', operatorName: 'Drs. Agus Supriatna', studentCount: 732, teacherCount: 18 },
  { npsn: '20202155', name: 'SD NEGERI 02 KARANGTENGAH', level: 'SD', address: 'Kp. Sukamanah RT 01/02', gugus: 'II', principalName: 'Hj. Teti Suhaeti, S.Pd', operatorName: 'Santi Agustina', studentCount: 464, teacherCount: 12 },
  { npsn: '20202156', name: 'SD NEGERI 03 KARANGTENGAH', level: 'SD', address: 'Kp. Pasirlaja RT 03/01', gugus: 'II', principalName: 'Cecep Rustandi, S.Pd', operatorName: 'Nani Suryani', studentCount: 191, teacherCount: 6 },
  { npsn: '20202152', name: 'SD NEGERI 04 KARANGTENGAH', level: 'SD', address: 'Jl. Sukamaju No. 12', gugus: 'II', principalName: 'Yayah Mariah, S.Pd.SD', operatorName: 'Enung Nurhasanah', studentCount: 318, teacherCount: 11 },
  { npsn: '20202153', name: 'SD NEGERI 05 KARANGTENGAH', level: 'SD', address: 'Kp. Cijambe RT 04/03', gugus: 'II', principalName: 'Undang Suryana, S.Pd', operatorName: 'Ade Irma', studentCount: 329, teacherCount: 12 },
  { npsn: '20202148', name: 'SD NEGERI 06 KARANGTENGAH', level: 'SD', address: 'Kp. Cimanggu RT 02/05', gugus: 'II', principalName: 'Neni Sumartini, S.Pd', operatorName: 'Tuti Alawiyah', studentCount: 280, teacherCount: 8 },
  { npsn: '20202147', name: 'SD NEGERI 09 KARANGTENGAH', level: 'SD', address: 'Kp. Cibodas RT 05/02', gugus: 'II', principalName: 'Oman Sulaeman, S.Pd.SD', operatorName: 'Nining Yuningsih', studentCount: 428, teacherCount: 12 },
  { npsn: '20202145', name: 'SD NEGERI KEBON KAI GIRANG', level: 'SD', address: 'Kp. Kebon Kai RT 01/04', gugus: 'II', principalName: 'Yaya Sunarya, S.Pd', operatorName: 'Cepi Herdiana', studentCount: 161, teacherCount: 6 },
  { npsn: '20202117', name: 'SD NEGERI KEBONBERA', level: 'SD', address: 'Kp. Kebonbera RT 02/03', gugus: 'II', principalName: 'Imas Masruroh, S.Pd', operatorName: 'Evi Sovianti', studentCount: 115, teacherCount: 6 },

  // Gugus III - Pamuruyan (9 sekolah)
  { npsn: '20201913', name: 'SD NEGERI 01 PAMURUYAN', level: 'SD', address: 'Jl. Raya Pamuruyan No. 1', gugus: 'III', principalName: 'Hj. Lilis Suryani, S.Pd', operatorName: 'Cecep Rustandi, S.Pd', studentCount: 174, teacherCount: 7 },
  { npsn: '20201915', name: 'SD NEGERI 02 PAMURUYAN', level: 'SD', address: 'Kp. Pasireurih RT 02/01', gugus: 'III', principalName: 'Endang Rusmiati, S.Pd', operatorName: 'Nia Kurniati', studentCount: 200, teacherCount: 6 },
  { npsn: '20201929', name: 'SD NEGERI 03 PAMURUYAN', level: 'SD', address: 'Kp. Cisande RT 01/04', gugus: 'III', principalName: 'Aang Kunaefi, S.Pd.SD', operatorName: 'Eli Nurlaeli', studentCount: 458, teacherCount: 15 },
  { npsn: '20201923', name: 'SD NEGERI 07 PAMURUYAN', level: 'SD', address: 'Kp. Bongas RT 03/02', gugus: 'III', principalName: 'Yayah Juariah, S.Pd', operatorName: 'Siti Julaeha', studentCount: 251, teacherCount: 6 },
  { npsn: '20201922', name: 'SD NEGERI 08 PAMURUYAN', level: 'SD', address: 'Jl. Siliwangi No. 33', gugus: 'III', principalName: 'Nandang Kusnadi, S.Pd', operatorName: 'Dedeh Kurniasih', studentCount: 125, teacherCount: 6 },
  { npsn: '20201914', name: 'SD NEGERI 10 PAMURUYAN', level: 'SD', address: 'Kp. Cibarengkok RT 04/05', gugus: 'III', principalName: 'Hj. Iis Aisyah, S.Pd', operatorName: 'Evi Sovianti', studentCount: 240, teacherCount: 8 },
  { npsn: '20201930', name: 'SD NEGERI 4 PAMURUYAN', level: 'SD', address: 'Kp. Sukaresmi RT 02/03', gugus: 'III', principalName: 'Asep Hidayat, S.Pd.SD', operatorName: 'Lilis Karlina', studentCount: 307, teacherCount: 11 },
  { npsn: '20201931', name: 'SD NEGERI 5 PAMURUYAN', level: 'SD', address: 'Kp. Ciomas RT 05/01', gugus: 'III', principalName: 'Wida Widaningsih, S.Pd', operatorName: 'Neng Imas', studentCount: 216, teacherCount: 7 },
  { npsn: '20201921', name: 'SD NEGERI 9 PAMURUYAN', level: 'SD', address: 'Jl. Pamuruyan No. 12', gugus: 'III', principalName: 'Dr. H. Suherman, M.Pd', operatorName: 'Irfan Maulana', studentCount: 171, teacherCount: 6 },

  // Gugus IV - Cibadak Pedesaan (11 sekolah)
  { npsn: '20202210', name: 'SD NEGERI 03 LEUMBURSAWAH', level: 'SD', address: 'Kp. Leumbursawah RT 01/01', gugus: 'IV', principalName: 'Ade Rustandi, S.Pd', operatorName: 'H. Dedi Mulyadi, M.Pd', studentCount: 266, teacherCount: 8 },
  { npsn: '20202781', name: 'SD NEGERI BANTARBADAK', level: 'SD', address: 'Kp. Bantarbadak RT 02/02', gugus: 'IV', principalName: 'Hj. Cucun, S.Pd', operatorName: 'Agus Setiawan', studentCount: 183, teacherCount: 6 },
  { npsn: '20202771', name: 'SD NEGERI BARUSAWAH', level: 'SD', address: 'Kp. Barusawah RT 01/03', gugus: 'IV', principalName: 'Mamat Rahmat, S.Pd', operatorName: 'Deden Hermansyah', studentCount: 198, teacherCount: 7 },
  { npsn: '20202843', name: 'SD NEGERI BOJONGKONENG', level: 'SD', address: 'Kp. Bojongkoneng RT 03/02', gugus: 'IV', principalName: 'Ujang Saepul, S.Pd', operatorName: 'Tati Sumiati', studentCount: 200, teacherCount: 6 },
  { npsn: '20203099', name: 'SD NEGERI CILENGO', level: 'SD', address: 'Kp. Cilengo RT 04/01', gugus: 'IV', principalName: 'Dedi Supriadi, S.Pd', operatorName: 'Rudi Wijaya', studentCount: 213, teacherCount: 7 },
  { npsn: '20202216', name: 'SD NEGERI LEUWEUNG DATAR', level: 'SD', address: 'Kp. Leuweung Datar RT 02/02', gugus: 'IV', principalName: 'Cecep Rustam, M.Pd', operatorName: 'Mulyana', studentCount: 284, teacherCount: 10 },
  { npsn: '20202245', name: 'SD NEGERI MALINGGUT', level: 'SD', address: 'Kp. Malinggut RT 01/04', gugus: 'IV', principalName: 'Sri Wahyuni, S.Pd', operatorName: 'Eneng Maryani', studentCount: 290, teacherCount: 12 },
  { npsn: '20201918', name: 'SD NEGERI PANENJOAN', level: 'SD', address: 'Kp. Panenjoan RT 03/03', gugus: 'IV', principalName: 'Onih Sukaenih, S.Pd', operatorName: 'Asep Kurnia', studentCount: 204, teacherCount: 7 },
  { npsn: '20201941', name: 'SD NEGERI PARIS', level: 'SD', address: 'Kp. Paris RT 02/05', gugus: 'IV', principalName: 'Wawan Setiawan, S.Pd', operatorName: 'Yeni Rahmawati', studentCount: 114, teacherCount: 6 },
  { npsn: '20202055', name: 'SD NEGERI PASIR KOLOTOK', level: 'SD', address: 'Kp. Pasirkolotok RT 01/02', gugus: 'IV', principalName: 'Oman Sulaeman, S.Pd', operatorName: 'Lia Amelia', studentCount: 152, teacherCount: 6 },
  { npsn: '20201997', name: 'SD NEGERI PASIRJATI', level: 'SD', address: 'Kp. Pasirjati RT 03/01', gugus: 'IV', principalName: 'Yayah Rokayah, S.Pd', operatorName: 'Mimin Aminah', studentCount: 148, teacherCount: 6 },
  { npsn: '20202430', name: 'SD NEGERI SELAGOMBONG', level: 'SD', address: 'Kp. Selagombong RT 01/01', gugus: 'IV', principalName: 'Dedi Rosadi, S.Pd', operatorName: 'Ade Irawan', studentCount: 138, teacherCount: 6 },

  // Gugus V - Swasta (7 sekolah)
  { npsn: '60726665', name: 'SD ISLAM ATTARBIYAH', level: 'SD', address: 'Jl. Siliwangi No. 120', gugus: 'V', principalName: 'Hj. Imas Masruroh, S.Pd', operatorName: 'Ade Hermawan, S.Pd', studentCount: 162, teacherCount: 6 },
  { npsn: '70011585', name: 'SD ISLAM TERPADU AL-ALAWI', level: 'SD', address: 'Jl. Pembangunan No. 44', gugus: 'V', principalName: 'Asep Saepudin, M.Pd', operatorName: 'Ani Suryani', studentCount: 138, teacherCount: 6 },
  { npsn: '20253126', name: 'SD MARDIYUANA', level: 'SD', address: 'Jl. Merdeka No. 45', gugus: 'V', principalName: 'Drs. Ohan Suhandinata', operatorName: 'Tina Marlina', studentCount: 146, teacherCount: 6 },
  { npsn: '20253128', name: 'SDIT AD-DAWAH', level: 'SD', address: 'Jl. Bhayangkara No. 90', gugus: 'V', principalName: 'Nia Kurniawati, S.Pd', operatorName: 'Siti Aisyah', studentCount: 345, teacherCount: 14 },
  { npsn: '20253127', name: 'SDIT AL UMMAH', level: 'SD', address: 'Jl. Sukajadi No. 5', gugus: 'V', principalName: 'Wida Widaningsih, S.Pd', operatorName: 'Neng Imas', studentCount: 250, teacherCount: 12 },
  { npsn: '20270783', name: 'SDIT SULAMUT TAUFIK', level: 'SD', address: 'Kp. Cisande RT 02/01', gugus: 'V', principalName: 'Asep Hidayat, S.Pd', operatorName: 'Eli Nurlaeli', studentCount: 30, teacherCount: 6 },
  { npsn: '70062390', name: 'SEKOLAH DASAR FIRDAUS', level: 'SD', address: 'Jl. Perintis Kemerdekaan KM. 4', gugus: 'V', principalName: 'Hj. Lilis Suryani, S.Pd', operatorName: 'Agus Supriatna', studentCount: 0, teacherCount: 0 },
];
