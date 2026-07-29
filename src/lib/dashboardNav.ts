import type { UserRole } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  showBadge?: boolean;
}

export interface DashboardBrand {
  title: string;
  subtitle: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'fa-solid fa-house', showBadge: true },
  { href: '/admin/lk-bosp', label: 'LK BOSP Triwulan', icon: 'fa-solid fa-file-invoice-dollar' },
  { href: '/admin/schools', label: 'Kelola Sekolah', icon: 'fa-solid fa-school' },
  { href: '/admin/gugus', label: 'Kelola Gugus', icon: 'fa-solid fa-sitemap' },
  { href: '/admin/categories', label: 'Kategori Berkas', icon: 'fa-solid fa-folder-tree' },
  { href: '/admin/recap', label: 'Rekap Berkas', icon: 'fa-solid fa-rectangle-list' },
  { href: '/admin/calendar', label: 'Kelola Kalender', icon: 'fa-solid fa-calendar-days' },
  { href: '/admin/export', label: 'Ekspor Data', icon: 'fa-solid fa-file-export' },
  { href: '/admin/logs', label: 'Log Aktivitas', icon: 'fa-solid fa-receipt' },
  { href: '/admin/announcements', label: 'Pengumuman', icon: 'fa-solid fa-bullhorn' },
  { href: '/admin/gallery', label: 'Galeri Dokumentasi', icon: 'fa-solid fa-images' },
];

const SCHOOL_NAV: NavItem[] = [
  { href: '/school/dashboard', label: 'Dashboard', icon: 'fa-solid fa-house', showBadge: true },
  { href: '/school/lk-bosp', label: 'LK BOSP Triwulan', icon: 'fa-solid fa-file-invoice-dollar' },
  { href: '/school/profile', label: 'Profil Sekolah', icon: 'fa-solid fa-circle-user' },
  { href: '/school/receipt', label: 'Bukti Tanda Terima', icon: 'fa-solid fa-file-invoice' },
  { href: '/school/links', label: 'Tautan Terkait', icon: 'fa-solid fa-link' },
];

function supervisorNav(base: string): NavItem[] {
  const rootPath = base.replace('/dashboard', '');
  return [
    { href: base, label: 'Dashboard', icon: 'fa-solid fa-house', showBadge: true },
    { href: `${rootPath}/lk-bosp`, label: 'LK BOSP Triwulan', icon: 'fa-solid fa-file-invoice-dollar' },
  ];
}

export const DASHBOARD_BRANDS: Record<UserRole, DashboardBrand> = {
  admin: { title: 'Admin Portal', subtitle: 'Koryandik Cibadak', icon: 'fa-solid fa-user-shield' },
  school: { title: '', subtitle: '', icon: 'fa-solid fa-school' },
  gugus: { title: 'Gugus Sekolah', subtitle: 'Koryandik Cibadak', icon: 'fa-solid fa-sitemap' },
  pengawas: { title: 'Pengawas', subtitle: 'Koryandik Cibadak', icon: 'fa-solid fa-user-tie' },
  kkks: { title: 'KKKS', subtitle: 'Koryandik Cibadak', icon: 'fa-solid fa-users' },
  pgri: { title: 'PGRI', subtitle: 'Koryandik Cibadak', icon: 'fa-solid fa-handshake' },
};

export function getDashboardNav(role: UserRole): NavItem[] {
  switch (role) {
    case 'admin':
      return ADMIN_NAV;
    case 'school':
      return SCHOOL_NAV;
    case 'gugus':
      return supervisorNav('/gugus/dashboard');
    case 'pengawas':
      return supervisorNav('/pengawas/dashboard');
    case 'kkks':
      return supervisorNav('/kkks/dashboard');
    case 'pgri':
      return supervisorNav('/pgri/dashboard');
    default:
      return supervisorNav('');
  }
}

export function getDashboardBasePath(role: UserRole): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'school': return '/school';
    case 'gugus': return '/gugus';
    case 'pengawas': return '/pengawas';
    case 'kkks': return '/kkks';
    case 'pgri': return '/pgri';
    default: return '/';
  }
}
