import type { FaqItem, DownloadItem, ProfileSettings, CalendarEvent, GalleryItem, RelatedLink } from './types';

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'u1',
    question: 'Apa itu Koryandik?',
    answer: 'Koryandik (Koordinator Layanan Administrasi Pendidikan) adalah portal digital terpadu untuk mengkoordinasikan pengumpulan, verifikasi, dan pemantauan berkas administrasi pendidikan se-Kecamatan Cibadak, Kabupaten Sukabumi. Sistem ini mengintegrasikan Google Drive sebagai media penyimpanan berkas utama.',
    category: 'Umum',
    icon: 'fa-circle-info'
  },
  {
    id: 'u2',
    question: 'Siapa saja yang dapat mengakses portal ini?',
    answer: 'Portal Koryandik dapat diakses oleh 6 peran berbeda: Operator Sekolah (SD se-Kecamatan), Koordinator Gugus (gugus wilayah), Pengawas Bina, Ketua KKKS, Ketua PGRI, dan Administrator Koryandik. Masing-masing memiliki dashboard dan hak akses yang disesuaikan.',
    category: 'Umum',
    icon: 'fa-users'
  },
  {
    id: 'u3',
    question: 'Apakah portal ini gratis?',
    answer: 'Ya, portal Koryandik sepenuhnya gratis untuk digunakan oleh seluruh satuan pendidikan di Kecamatan Cibadak. Tidak ada biaya langganan atau biaya tersembunyi apa pun.',
    category: 'Umum',
    icon: 'fa-hand-holding-heart'
  },
  {
    id: 'u4',
    question: 'Bagaimana cara menghubungi admin jika ada kendala?',
    answer: 'Anda dapat menghubungi Sekretariat Koryandik melalui email resmi di koryandik.cibadak@sukabumi.go.id, atau menghubungi langsung melalui WhatsApp koordinator gugus masing-masing yang tersedia di halaman beranda portal.',
    category: 'Umum',
    icon: 'fa-headset'
  },
  {
    id: 'p1',
    question: 'Bagaimana cara login sebagai operator sekolah?',
    answer: 'Klik tombol "Masuk Portal" di halaman beranda, pilih tab "Sekolah", kemudian pilih nama sekolah Anda dari daftar dropdown dan masukkan NPSN sekolah sebagai kode akses. Setelah berhasil login, Anda akan diarahkan ke dashboard sekolah.',
    category: 'Penggunaan',
    icon: 'fa-right-to-bracket'
  },
  {
    id: 'p2',
    question: 'Bagaimana cara mengunggah berkas?',
    answer: 'Dari Dashboard Sekolah, pilih kategori berkas yang ingin diunggah (misalnya SPJ Dana BOS), masukkan nama file, kemudian tempelkan tautan Google Drive berkas Anda. Pastikan tautan dimulai dengan https:// dan berkas di Google Drive sudah di-set akses "Anyone with the link can view".',
    category: 'Penggunaan',
    icon: 'fa-cloud-arrow-up'
  },
  {
    id: 'p3',
    question: 'Apa saja kategori berkas yang harus dikumpulkan?',
    answer: 'Terdapat beberapa kategori berkas wajib yang harus dilengkapi sesuai pengaturan admin. Kategori berkas dapat ditambah atau dinonaktifkan oleh Admin sesuai kebutuhan melalui panel manajemen kategori.',
    category: 'Penggunaan',
    icon: 'fa-folder-open'
  },
  {
    id: 'p4',
    question: 'Bagaimana cara mengecek status berkas saya?',
    answer: 'Ada 2 cara: (1) Login ke Dashboard Sekolah untuk melihat status detail setiap kategori berkas, atau (2) gunakan fitur "Cek Status Berkas" di halaman beranda publik — pilih nama sekolah Anda dan lihat ringkasan status tanpa perlu login.',
    category: 'Penggunaan',
    icon: 'fa-magnifying-glass'
  },
  {
    id: 'p5',
    question: 'Apa arti status berkas: Pending, Approved, Revision, Rejected?',
    answer: '• Pending (Menunggu): Berkas telah diunggah dan sedang menunggu verifikasi.\n• Approved (Disetujui): Berkas telah diverifikasi dan dinyatakan lengkap.\n• Revision (Revisi): Berkas perlu diperbaiki sesuai catatan yang diberikan.\n• Rejected (Ditolak): Berkas ditolak karena tidak memenuhi persyaratan format atau konten.',
    category: 'Penggunaan',
    icon: 'fa-list-check'
  },
  {
    id: 't1',
    question: 'Berkas saya tidak bisa diunggah, apa penyebabnya?',
    answer: 'Pastikan tautan Google Drive yang Anda tempelkan valid dan dimulai dengan http:// atau https://. Jika masih gagal, periksa apakah koneksi internet Anda stabil. Coba refresh halaman dan ulangi proses unggah.',
    category: 'Teknis',
    icon: 'fa-triangle-exclamation'
  },
  {
    id: 't2',
    question: 'Apakah data saya aman di portal ini?',
    answer: 'Ya, portal Koryandik menerapkan prinsip privasi ketat. Tautan berkas Google Drive Anda tidak ditampilkan secara publik — hanya ditandai dengan status badge terproteksi. Hanya admin dan koordinator gugus berwenang yang dapat mengakses tautan berkas Anda.',
    category: 'Teknis',
    icon: 'fa-shield-halved'
  },
  {
    id: 't3',
    question: 'Browser apa yang disarankan untuk mengakses portal?',
    answer: 'Portal Koryandik mendukung semua browser modern. Kami merekomendasikan Google Chrome (versi terbaru), Mozilla Firefox, Microsoft Edge, atau Safari. Pastikan JavaScript diaktifkan dan browser Anda sudah diperbarui ke versi terkini.',
    category: 'Teknis',
    icon: 'fa-globe'
  },
  {
    id: 't4',
    question: 'Apakah portal bisa diakses dari HP/smartphone?',
    answer: 'Ya, portal Koryandik didesain responsif dan dapat diakses dari smartphone, tablet, maupun desktop/laptop. Tampilan akan otomatis menyesuaikan dengan ukuran layar perangkat Anda.',
    category: 'Teknis',
    icon: 'fa-mobile-screen-button'
  },
  {
    id: 'g1',
    question: 'Apa peran Koordinator Gugus?',
    answer: 'Koordinator Gugus bertanggung jawab memeriksa dan memverifikasi berkas dari sekolah-sekolah binaan di wilayahnya. Koordinator gugus memberikan persetujuan awal sebelum berkas divalidasi akhir oleh Admin.',
    category: 'Gugus',
    icon: 'fa-sitemap'
  },
  {
    id: 'g2',
    question: 'Ada berapa gugus di Kecamatan Cibadak?',
    answer: 'Kecamatan Cibadak terbagi menjadi 5 gugus wilayah aktif, masing-masing dikoordinasikan oleh satu Sekolah Inti. Detail wilayah dan sekolah anggota setiap gugus dapat dilihat di halaman beranda pada bagian "Wilayah Gugus & Sekolah Koordinator".',
    category: 'Gugus',
    icon: 'fa-map-location-dot'
  },
  {
    id: 'g3',
    question: 'Bagaimana cara melihat peta sebaran sekolah per gugus?',
    answer: 'Buka halaman beranda, gulir ke bagian "Wilayah Gugus & Sekolah Koordinator", lalu klik tab gugus yang diinginkan. Anda dapat melihat daftar sekolah binaan dan peta GPS interaktif di bagian bawah section tersebut.',
    category: 'Gugus',
    icon: 'fa-map'
  }
];

export const DEFAULT_DOWNLOADS: DownloadItem[] = [
  {
    id: 'surat-1',
    title: 'Surat Undangan Rapat Koordinasi Gugus',
    description: 'Template surat undangan untuk rapat koordinasi gugus wilayah Kecamatan Cibadak.',
    category: 'surat',
    fileSize: '245 KB',
    fileType: 'DOCX',
    downloadUrl: 'https://docs.google.com/document/d/1KE4UIPNtWh_gHj-r4HxUtMl62qq5ejUu/export?format=docx',
    icon: 'fa-envelope-open-text',
    updatedAt: '2026-06-15',
    downloadCount: 42,
    version: '1.0',
    status: 'active',
    previewUrl: 'https://docs.google.com/document/d/1KE4UIPNtWh_gHj-r4HxUtMl62qq5ejUu/preview'
  },
  {
    id: 'surat-2',
    title: 'Surat Undangan Monitoring Berkas',
    description: 'Template surat undangan monitoring berkas untuk seluruh sekolah binaan.',
    category: 'surat',
    fileSize: '198 KB',
    fileType: 'DOCX',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_2/view',
    icon: 'fa-file-lines',
    updatedAt: '2026-06-10',
    downloadCount: 28,
    version: '1.0',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_2/preview'
  },
  {
    id: 'surat-3',
    title: 'Surat Edaran Deadline Berkas',
    description: 'Template surat edaran resmi pengingat batas akhir pengumpulan laporan berkas.',
    category: 'surat',
    fileSize: '156 KB',
    fileType: 'DOCX',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_3/view',
    icon: 'fa-bullhorn',
    updatedAt: '2026-06-08',
    downloadCount: 19,
    version: '1.1',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_3/preview'
  },
  {
    id: 'format-1',
    title: 'Format Laporan Bulanan Sekolah',
    description: 'Format lembar kerja laporan bulanan sekolah terstandar Kecamatan Cibadak.',
    category: 'format',
    fileSize: '312 KB',
    fileType: 'XLSX',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_4/view',
    icon: 'fa-table',
    updatedAt: '2026-06-20',
    downloadCount: 135,
    version: '2.4',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_4/preview'
  },
  {
    id: 'format-2',
    title: 'Format Rekapitulasi SPJ BOS',
    description: 'Format rekap lembar kerja untuk penyusunan SPJ dana BOS tahun ajaran berjalan.',
    category: 'format',
    fileSize: '287 KB',
    fileType: 'XLSX',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_5/view',
    icon: 'fa-money-bill-wave',
    updatedAt: '2026-06-18',
    downloadCount: 94,
    version: '2.0',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_5/preview'
  },
  {
    id: 'format-3',
    title: 'Format Data Dapodik Sekolah',
    description: 'Template isian data pokok pendidikan untuk keperluan sinkronisasi berkas semesteran.',
    category: 'format',
    fileSize: '425 KB',
    fileType: 'XLSX',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_6/view',
    icon: 'fa-database',
    updatedAt: '2026-06-12',
    downloadCount: 61,
    version: '1.2',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_6/preview'
  },
  {
    id: 'sk-1',
    title: 'SK Pembagian Tugas Mengajar',
    description: 'Contoh Surat Keputusan (SK) pembagian tugas mengajar guru kelas dan bidang studi.',
    category: 'sk',
    fileSize: '567 KB',
    fileType: 'PDF',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_7/view',
    icon: 'fa-file-signature',
    updatedAt: '2026-06-25',
    downloadCount: 88,
    version: '1.0',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_7/preview'
  },
  {
    id: 'sk-2',
    title: 'SK Tim Pengawas Gugus',
    description: 'Format Surat Keputusan (SK) penetapan tim pengawas gugus wilayah se-Kecamatan.',
    category: 'sk',
    fileSize: '432 KB',
    fileType: 'PDF',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_8/view',
    icon: 'fa-stamp',
    updatedAt: '2026-06-22',
    downloadCount: 54,
    version: '1.0',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_8/preview'
  },
  {
    id: 'sk-3',
    title: 'SK Kepala Sekolah Terbaru',
    description: 'Format Surat Keputusan pengangkatan & mutasi kepala sekolah tingkat dasar.',
    category: 'sk',
    fileSize: '398 KB',
    fileType: 'PDF',
    downloadUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_9/view',
    icon: 'fa-user-tie',
    updatedAt: '2026-06-19',
    downloadCount: 71,
    version: '1.0',
    status: 'active',
    previewUrl: 'https://drive.google.com/file/d/EXAMPLE_FILE_ID_9/preview'
  }
];

export const DEFAULT_PROFILE: ProfileSettings = {
  address: 'Koryandik Cibadak, Kec. Cibadak, Kab. Sukabumi, Jawa Barat',
  email: 'koryandik.cibadak@sukabumi.go.id',
  phone: '0812-3456-7890',
  vision: 'Mewujudkan tata kelola administrasi pendidikan dasar Kecamatan Cibadak yang prima, teratur, transparan, dan akuntabel berbasis teknologi informasi.',
  mission: [
    'Mengembangkan infrastruktur pelaporan berkas satu pintu secara digital.',
    'Meningkatkan disiplin dan kepatuhan administrasi sekolah binaan.',
    'Menyajikan data profil, wilayah, dan peta koordinasi yang transparan bagi publik.',
    'Memperkuat sinergi antara sekolah, koordinator gugus, pengawas bina, KKKS, dan PGRI.'
  ],
  lat: -6.89525606779202,
  lng: 106.7855092332936
};

export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Batas Pengumpulan SPJ BOS & Laporan Bulanan',
    description: 'Batas akhir pengunggahan dokumen SPJ BOS dan laporan bulanan sekolah binaan untuk diverifikasi oleh pengawas bina.',
    startDate: '2026-07-25',
    endDate: '2026-07-31',
    category: 'submission',
    targetAudience: 'school',
    location: 'Portal Koryandik Cibadak',
    accent: '#3b82f6'
  },
  {
    id: 'evt-2',
    title: 'Rapat Pleno KKKS Kecamatan Cibadak',
    description: 'Pertemuan bulanan Kepala Sekolah se-Kecamatan Cibadak untuk membahas evaluasi Kurikulum Merdeka dan RKAS.',
    startDate: '2026-08-05',
    endDate: '2026-08-05',
    category: 'meeting',
    targetAudience: 'principal',
    location: 'Aula SDN 01 Cibadak',
    accent: '#10b981'
  },
  {
    id: 'evt-3',
    title: 'Pelaksanaan Asesmen Nasional (ANBK) SD',
    description: 'Simulasi dan pelaksanaan Asesmen Nasional Berbasis Komputer (ANBK) serentak tingkat SD se-Kecamatan Cibadak.',
    startDate: '2026-10-19',
    endDate: '2026-10-24',
    category: 'exam',
    targetAudience: 'all',
    location: 'Sekolah Masing-Masing',
    accent: '#f59e0b'
  },
  {
    id: 'evt-4',
    title: 'Bimtek Peningkatan Kompetensi Guru (KKG)',
    description: 'Pelatihan pengembangan modul ajar dan asesmen pembelajaran bagi guru kelas SD se-Kecamatan Cibadak.',
    startDate: '2026-08-12',
    endDate: '2026-08-13',
    category: 'training',
    targetAudience: 'teacher',
    location: 'Sekolah Inti Gugus I',
    accent: '#6366f1'
  },
  {
    id: 'evt-5',
    title: 'Seleksi O2SN & FLS2N Tingkat Kecamatan',
    description: 'Kompetisi seni dan olahraga antar siswa SD se-Kecamatan Cibadak persiapan tingkat Kabupaten.',
    startDate: '2026-09-15',
    endDate: '2026-09-17',
    category: 'competition',
    targetAudience: 'all',
    location: 'Gelanggang Olahraga Cibadak',
    accent: '#14b8a6'
  },
  {
    id: 'evt-6',
    title: 'Supervisi Klinis & Pembinaan Pengawas',
    description: 'Monitoring administrasi dan supervisi akademik oleh Pengawas Bina ke sekolah-sekolah di Gugus I s.d. V.',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    category: 'meeting',
    targetAudience: 'supervisor',
    location: 'Sekolah Binaan Gugus I - V',
    accent: '#8b5cf6'
  },
  {
    id: 'evt-7',
    title: 'Upacara Peringatan Hari Kemerdekaan RI (HUT RI)',
    description: 'Upacara bendera HUT Kemerdekaan Republik Indonesia bersama jajaran PGRI, KKKS, dan Koryandik Cibadak.',
    startDate: '2026-08-17',
    endDate: '2026-08-17',
    category: 'national',
    targetAudience: 'all',
    location: 'Lapang Alun-Alun Cibadak',
    accent: '#ec4899'
  },
  {
    id: 'evt-8',
    title: 'Pendaftaran PPDB Tahun Ajaran Baru',
    description: 'Pelaksanaan Penerimaan Peserta Didik Baru (PPDB) tingkat Sekolah Dasar se-Kecamatan Cibadak.',
    startDate: '2026-07-01',
    endDate: '2026-07-11',
    category: 'admission',
    targetAudience: 'school',
    location: 'Sekolah Masing-Masing',
    accent: '#06b6d4'
  },
  {
    id: 'evt-9',
    title: 'Penyerahan Rapor Semester Ganjil T.A. 2026/2027',
    description: 'Pembagian Buku Laporan Hasil Belajar (Rapor) peserta didik semester ganjil.',
    startDate: '2026-12-18',
    endDate: '2026-12-19',
    category: 'reporting',
    targetAudience: 'all',
    location: 'Sekolah Masing-Masing',
    accent: '#eab308'
  },
  {
    id: 'evt-10',
    title: 'Libur Semester Ganjil T.A. 2026/2027',
    description: 'Masa libur sekolah akhir semester ganjil bagi peserta didik dan pendidik.',
    startDate: '2026-12-21',
    endDate: '2027-01-02',
    category: 'holiday',
    targetAudience: 'all',
    location: 'Kecamatan Cibadak',
    accent: '#ef4444'
  }
];

export const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Rakor Operator Sekolah se-Kecamatan Cibadak',
    description: 'Pelaksanaan rapat koordinasi operator sekolah se-Kecamatan Cibadak untuk sosialisasi penggunaan portal Koryandik dan tata kelola berkas administrasi pendidikan.',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    category: 'Rakor & Rapat',
    date: '2026-06-15',
    createdAt: '2026-06-15T10:00:00Z'
  },
  {
    id: 'gal-2',
    title: 'Musyawarah KKKS Kecamatan Cibadak',
    description: 'Pertemuan Kelompok Kerja Kepala Sekolah (KKKS) membahas evaluasi kurikulum, persiapan SPJ BOS, dan program kerja semester baru.',
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
    category: 'KKKS',
    date: '2026-06-20',
    createdAt: '2026-06-20T08:00:00Z'
  },
  {
    id: 'gal-3',
    title: 'Kegiatan Kolektif KKG Guru Kelas',
    description: 'Kegiatan rutin Kelompok Kerja Guru (KKG) dalam penyusunan perangkat pembelajaran dan modul ajar Kurikulum Merdeka.',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    category: 'KKG',
    date: '2026-06-25',
    createdAt: '2026-06-25T09:00:00Z'
  },
  {
    id: 'gal-4',
    title: 'Supervisi Pembinaan Pengawas Bina',
    description: 'Kunjungan pengawas bina ke sekolah-sekolah untuk monev administrasi dan proses pembelajaran di kelas.',
    imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1200&q=80',
    category: 'Supervisi & Pengawasan',
    date: '2026-07-02',
    createdAt: '2026-07-02T10:00:00Z'
  },
  {
    id: 'gal-5',
    title: 'Peringatan Hari Pendidikan Nasional (Hardiknas)',
    description: 'Upacara bendera dan kegiatan perayaan Hardiknas bersama pengurus PGRI, KKKS, dan perwakilan sekolah se-Kecamatan.',
    imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80',
    category: 'Hari Besar & Upacara',
    date: '2026-05-02',
    createdAt: '2026-05-02T08:00:00Z'
  },
  {
    id: 'gal-6',
    title: 'Bimtek Peningkatan Kompetensi Digital Guru',
    description: 'Pelatihan pembuatan media pembelajaran interaktif dan pengelolaan RPP digital bagi guru SD se-Cibadak.',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    category: 'Bimtek & Pelatihan',
    date: '2026-07-10',
    createdAt: '2026-07-10T11:00:00Z'
  },
  {
    id: 'gal-7',
    title: 'Seleksi Lomba O2SN & FLS2N Tingkat Kecamatan',
    description: 'Pelaksanaan seleksi Olimpiade Olahraga Siswa Nasional (O2SN) dan FLS2N antar SD se-Kecamatan Cibadak.',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    category: 'Lomba & Prestasi',
    date: '2026-04-18',
    createdAt: '2026-04-18T09:00:00Z'
  },
  {
    id: 'gal-8',
    title: 'Rapat Koordinasi Gugus I Cibadak',
    description: 'Musyawarah kerja sekolah anggota Gugus I bertempat di SD Negeri Inti untuk penyelarasan kalender akademik.',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
    category: 'Kegiatan Gugus',
    date: '2026-07-14',
    createdAt: '2026-07-14T08:30:00Z'
  }
];

export const DEFAULT_RELATED_LINKS: RelatedLink[] = [
  {
    id: 'link-1',
    title: 'Dapodik Kemdikbud',
    url: 'https://dapo.kemdikbud.go.id/',
    category: 'pendidikan',
    icon: 'fa-graduation-cap',
    description: 'Portal Data Pokok Pendidikan Nasional',
    target: '_blank',
    isActive: true,
    order: 1
  },
  {
    id: 'link-2',
    title: 'BOS Kemdikbud',
    url: 'https://bos.kemdikbud.go.id/',
    category: 'layanan',
    icon: 'fa-money-bill-wave',
    description: 'Informasi dan layanan Bantuan Operasional Sekolah',
    target: '_blank',
    isActive: true,
    order: 2
  },
  {
    id: 'link-3',
    title: 'GTK Kemdikbud',
    url: 'https://gtk.kemdikbud.go.id/',
    category: 'pendidikan',
    icon: 'fa-chalkboard-user',
    description: 'Portal Guru dan Tenaga Kependidikan',
    target: '_blank',
    isActive: true,
    order: 3
  },
  {
    id: 'link-4',
    title: 'Kemenag RI',
    url: 'https://www.kemenag.go.id/',
    category: 'pendidikan',
    icon: 'fa-building-columns',
    description: 'Kementerian Agama Republik Indonesia',
    target: '_blank',
    isActive: true,
    order: 4
  },
  {
    id: 'link-5',
    title: 'Google Drive',
    url: 'https://drive.google.com/',
    category: 'layanan',
    icon: 'fa-google-drive',
    description: 'Layanan penyimpanan berkas cloud',
    target: '_blank',
    isActive: true,
    order: 5
  },
  {
    id: 'link-6',
    title: 'Google Classroom',
    url: 'https://classroom.google.com/',
    category: 'layanan',
    icon: 'fa-school',
    description: 'Platform pembelajaran daring Google',
    target: '_blank',
    isActive: true,
    order: 6
  },
  {
    id: 'link-7',
    title: 'Panduan SPJ BOS',
    url: '#',
    category: 'referensi',
    icon: 'fa-file-pdf',
    description: 'Panduan teknis penyusunan Surat Pertanggungjawaban BOS',
    target: '_blank',
    isActive: true,
    order: 7
  }
];
