// Shared domain types & enums — single source of truth for app ↔ DB contract

export const USER_ROLES = ['admin', 'school', 'gugus', 'pengawas', 'kkks', 'pgri'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPERVISOR_ROLES = ['admin', 'pengawas', 'kkks', 'pgri'] as const;
export type SupervisorRole = (typeof SUPERVISOR_ROLES)[number];

export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'revision'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const NOTIFICATION_TYPES = ['upload', 'approved', 'rejected', 'revision', 'announcement', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TARGET_ROLES = ['admin', 'school', 'gugus', 'pengawas', 'kkks', 'pgri'] as const;
export type NotificationTargetRole = (typeof NOTIFICATION_TARGET_ROLES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetRole?: NotificationTargetRole;
  schoolNpsn?: string;
  icon?: string;
}

export const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high'] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

/** Sort order for supervisor listing */
export const SUPERVISOR_ROLE_ORDER: Record<SupervisorRole, number> = {
  admin: 1,
  pengawas: 2,
  kkks: 3,
  pgri: 4,
};

export interface SessionUser {
  role: UserRole;
  id?: string;
  name?: string;
  npsn?: string;
  gugusId?: string;
  title?: string;
  koordinator?: string;
  avatar?: string;
  details?: unknown;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: string;
}

export interface DownloadItem {
  id: string;
  title: string;
  description: string;
  category: 'surat' | 'format' | 'sk';
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX';
  downloadUrl: string;
  icon: string;
  updatedAt: string;
  downloadCount?: number;
  version?: string;
  status?: 'active' | 'deprecated';
  previewUrl?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  category: 'submission' | 'meeting' | 'exam' | 'holiday' | 'event' | 'reporting' | 'admission' | 'national';
  targetAudience: 'all' | 'school' | 'teacher' | 'gugus' | 'principal' | 'supervisor' | 'kkks' | 'pgri';
  location?: string;
  accent?: string;
}

export interface ProfileSettings {
  address: string;
  email: string;
  phone: string;
  vision: string;
  mission: string[];
  lat: number;
  lng: number;
}

export const GALLERY_CATEGORIES = ['Rapat Ops', 'KKKS', 'Pelatihan', 'Kunjungan', 'Upacara', 'Lainnya'] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: GalleryCategory;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface RelatedLink {
  id: string;
  title: string;
  url: string;
  category: 'pendidikan' | 'layanan' | 'referensi' | 'lainnya';
  icon: string;
  description: string;
  target: '_blank' | '_self';
  isActive: boolean;
  order: number;
}

// ========== SCHOOL PORTAL TYPES ==========

export const FACILITY_ICONS = [
  'fa-chalkboard', 'fa-book-open', 'fa-desktop', 'fa-futbol',
  'fa-mosque', 'fa-kit-medical', 'fa-utensils', 'fa-building',
  'fa-flask', 'fa-music', 'fa-paint-brush', 'fa-tree',
  'fa-wifi', 'fa-toilet', 'fa-car', 'fa-dumbbell'
] as const;

export interface SchoolFacility {
  id: string;
  schoolNpsn: string;
  name: string;
  icon: string;
  description?: string;
  sortOrder: number;
}

export const ACHIEVEMENT_CATEGORIES = ['akademik', 'olahraga', 'seni', 'keagamaan', 'lainnya'] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface SchoolAchievement {
  id: string;
  schoolNpsn: string;
  title: string;
  description?: string;
  year?: number;
  category: AchievementCategory;
  icon: string;
}

