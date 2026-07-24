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
  { href: '/school/profile', label: 'Profil Sekolah', icon: 'fa-solid fa-circle-user' },
  { href: '/school/receipt', label: 'Bukti Tanda Terima', icon: 'fa-solid fa-file-invoice' },
  { href: '/school/links', label: 'Tautan Terkait', icon: 'fa-solid fa-link' },
];

const SUPERVISOR_NAV: NavItem[] = [
  { href: '', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', showBadge: true },
];

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
      return [{ href: '/gugus/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', showBadge: true }];
    case 'pengawas':
      return [{ href: '/pengawas/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', showBadge: true }];
    case 'kkks':
      return [{ href: '/kkks/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', showBadge: true }];
    case 'pgri':
      return [{ href: '/pgri/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', showBadge: true }];
    default:
      return SUPERVISOR_NAV;
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
