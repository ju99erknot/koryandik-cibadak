// ============================================================
// Koryandik Cibadak — Supabase Database Layer with LocalStorage Fallback
// ============================================================

import { supabase } from './supabaseClient';
import { schoolsData, categories as initialCategories, gugusData, supervisorData } from './schoolsData';
import type { School, Category, GugusData, PengawasData } from './schoolsData';
import type { NotificationTargetRole, SubmissionStatus, NotificationType, FaqItem, DownloadItem, ProfileSettings, CalendarEvent, GalleryItem, RelatedLink, Notification, SchoolFacility, SchoolAchievement, AchievementCategory } from './types';
import { SUPERVISOR_ROLE_ORDER } from './types';
import { emitNotificationsUpdated, maybeNotifyCurrentUser } from './notificationEvents';
import { DEFAULT_FAQS, DEFAULT_DOWNLOADS, DEFAULT_PROFILE, DEFAULT_CALENDAR_EVENTS, DEFAULT_GALLERY, DEFAULT_RELATED_LINKS } from './dbSeeds';
import { archiveSubmissionToDrive } from './driveArchive';
import { logger } from './logger';

export interface Submission {
  id: string;
  schoolNpsn: string;
  categoryId: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notes?: string | null;
  fileName?: string | null;
  driveLink?: string | null;
}

export interface LogEntry {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  details?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
  priority: 'low' | 'normal' | 'high';
}

export interface AppSetting {
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}

// ========== HELPERS & LOCAL STORAGE FALLBACKS ==========
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// In-memory cache for app settings to avoid repeated Supabase queries
let _appSettingsMemCache: { data: Record<string, AppSetting>; ts: number } | null = null;
const APP_SETTINGS_CACHE_TTL = 60_000; // 60 seconds

function invalidateAppSettingsCache(): void {
  _appSettingsMemCache = null;
}

function setAppSettingsCache(settings: Record<string, AppSetting>): void {
  if (typeof window === 'undefined') return;
  setStorageItem('koryandik_app_settings', settings);
}

export async function getAppSettings(): Promise<Record<string, AppSetting>> {
  let settings: Record<string, AppSetting> = {};

  // Return from in-memory cache if fresh
  if (_appSettingsMemCache && (Date.now() - _appSettingsMemCache.ts < APP_SETTINGS_CACHE_TTL)) {
    return _appSettingsMemCache.data;
  }

  let useLocalFallback = false;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      if (!error && data) {
        for (const row of data as Array<Record<string, unknown>>) {
          const key = String(row.key);
          settings[key] = {
            key,
            value: row.value as unknown,
            description: row.description as string | undefined,
            updatedAt: String(row.updated_at)
          };
        }
        setAppSettingsCache(settings);
      } else {
        useLocalFallback = true;
        if (error) logger.warn('Fallback to local app settings due to Supabase error', { error });
      }
    } catch (err) {
      useLocalFallback = true;
      logger.warn('Fallback to local app settings', { error: err });
    }
  } else {
    useLocalFallback = true;
  }

  if (useLocalFallback) {
    settings = getStorageItem<Record<string, AppSetting>>('koryandik_app_settings', {});
  }

  // Update in-memory cache
  _appSettingsMemCache = { data: settings, ts: Date.now() };

  return settings;
}

export async function getAppSetting<T>(key: string, fallback: T): Promise<T> {
  const settings = await getAppSettings();
  const record = settings[key];
  return record ? (record.value as T) : fallback;
}

export async function upsertAppSetting(
  key: string,
  value: unknown,
  description?: string
): Promise<AppSetting> {
  const updatedAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ key, value, description, updated_at: updatedAt }, { onConflict: 'key' })
        .select()
        .single();
      if (!error && data) {
        const created: AppSetting = {
          key: String(data.key),
          value: data.value as unknown,
          description: data.description as string | undefined,
          updatedAt: String(data.updated_at)
        };
        invalidateAppSettingsCache();
        const settings = await getAppSettings();
        settings[key] = created;
        setAppSettingsCache(settings);
        return created;
      }
      if (error) {
        logger.warn('Fallback to local app setting upsert due to Supabase error', { error });
      }
    } catch (err) {
      logger.warn('Fallback to local app setting upsert', { error: err });
    }
  }

  invalidateAppSettingsCache();
  const settings = await getAppSettings();
  const created: AppSetting = {
    key,
    value,
    description,
    updatedAt
  };
  settings[key] = created;
  setAppSettingsCache(settings);
  return created;
}

// Helper to check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50
  );
};

function mapSchoolRow(s: Record<string, unknown>): School {
  const npsn = s.npsn as string;
  return {
    npsn: npsn,
    name: s.name as string,
    level: s.level as 'SD' | 'SMP',
    address: (s.address as string | null) ?? null,
    gugus: s.gugus_id as string,
    principalName: (s.principal_name as string | null) ?? null,
    operatorName: (s.operator_name as string | null) ?? null,
    studentCount: (s.student_count as number) ?? 0,
    teacherCount: (s.teacher_count as number) ?? 0,
    logoUrl: (s.logo_url as string | undefined) ?? undefined,
    lat: (s.lat as number | null) ?? null,
    lng: (s.lng as number | null) ?? null,
    signatureUrl: (s.signature_url as string | undefined) ?? undefined,
    stempelColor: (s.stempel_color as string | undefined) ?? undefined,
    // Avatar fields
    principalAvatarUrl: (s.principal_avatar_url as string | undefined) ?? undefined,
    operatorAvatarUrl: (s.operator_avatar_url as string | undefined) ?? undefined,
    // Social Media & Branding
    website: (s.website as string | undefined) ?? undefined,
    instagram: (s.instagram as string | undefined) ?? undefined,
    facebook: (s.facebook as string | undefined) ?? undefined,
    youtube: (s.youtube as string | undefined) ?? undefined,
    tiktok: (s.tiktok as string | undefined) ?? undefined,
    twitter: (s.twitter as string | undefined) ?? undefined,
    linkedin: (s.linkedin as string | undefined) ?? undefined,
    email: (s.email as string | undefined) ?? undefined,
    whatsapp: (s.whatsapp as string | undefined) ?? undefined,
    telegram: (s.telegram as string | undefined) ?? undefined,
    ksPhone: (s.ks_phone as string | null) ?? null,
    operatorPhone: (s.operator_phone as string | null) ?? null,
    vision: (s.vision as string | null) ?? null,
    mission: (s.mission as string | null) ?? null,
    accreditation: (s.accreditation as string | null) ?? null,
    status: (s.status as string | null) ?? null,
  };
}

function mapSubmissionRow(s: Record<string, unknown>): Submission {
  return {
    id: s.id as string,
    schoolNpsn: s.school_npsn as string,
    categoryId: s.category_id as string,
    status: s.status as SubmissionStatus,
    submittedAt: s.submitted_at as string,
    reviewedAt: (s.reviewed_at as string | null) ?? null,
    reviewedBy: (s.reviewed_by as string | null) ?? null,
    notes: (s.notes as string | null) ?? null,
    fileName: (s.file_name as string | null) ?? null,
    driveLink: (s.drive_link as string | null) ?? null,
  };
}

// ========== SCHOOLS ==========
export async function getSchools(): Promise<School[]> {
  let schools: School[] = [];
  
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('gugus_id')
        .order('name');
      if (!error && data) {
        schools = data.map((s: Record<string, unknown>) => mapSchoolRow(s));
      }
    } catch (err) {
      logger.warn('Fallback to local schools', { error: err });
    }
  }

  // Fallback when Supabase is not configured, query failed, or returned empty
  if (schools.length === 0) {
    if (isSupabaseConfigured()) {
      logger.warn('Supabase returned no schools — using local fallback data');
    }
    const custom = getStorageItem<School[]>('koryandik_custom_schools', []);
    if (custom.length === 0) {
      setStorageItem('koryandik_custom_schools', schoolsData);
      schools = schoolsData.map(s => ({
        ...s,
        ksPhone: s.ksPhone ?? null,
        operatorPhone: s.operatorPhone ?? null
      }));
    } else {
      schools = custom.map(s => ({
        ...s,
        ksPhone: s.ksPhone ?? null,
        operatorPhone: s.operatorPhone ?? null
      }));
    }
  }

  // Apply consistent sorting
  const gugusOrder = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
  return schools.sort((a, b) => {
    const aGugus = gugusOrder[a.gugus as keyof typeof gugusOrder] || 99;
    const bGugus = gugusOrder[b.gugus as keyof typeof gugusOrder] || 99;
    if (aGugus !== bGugus) return aGugus - bGugus;
    return a.name.localeCompare(b.name);
  });
}

export async function getSchoolByNpsn(npsn: string): Promise<School | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('npsn', npsn)
        .single();
      if (!error && data) {
        return mapSchoolRow(data as Record<string, unknown>);
      }
    } catch (err) {
      logger.warn('Fallback to local school lookup', { error: err });
    }
  }

  const schools = await getSchools();
  return schools.find((s) => s.npsn === npsn);
}

export async function updateSchool(npsn: string, updates: Partial<School>): Promise<School | null> {
  if (isSupabaseConfigured()) {
    try {
      // Map to db column names
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.gugus !== undefined) dbUpdates.gugus_id = updates.gugus;
      if (updates.principalName !== undefined) dbUpdates.principal_name = updates.principalName;
      if (updates.operatorName !== undefined) dbUpdates.operator_name = updates.operatorName;
      if (updates.studentCount !== undefined) dbUpdates.student_count = updates.studentCount;
      if (updates.teacherCount !== undefined) dbUpdates.teacher_count = updates.teacherCount;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
      if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
      if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
      if (updates.signatureUrl !== undefined) dbUpdates.signature_url = updates.signatureUrl;
      if (updates.stempelColor !== undefined) dbUpdates.stempel_color = updates.stempelColor;
      // Avatar fields
      if (updates.principalAvatarUrl !== undefined) dbUpdates.principal_avatar_url = updates.principalAvatarUrl;
      if (updates.operatorAvatarUrl !== undefined) dbUpdates.operator_avatar_url = updates.operatorAvatarUrl;
      // Social Media & Branding
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.instagram !== undefined) dbUpdates.instagram = updates.instagram;
      if (updates.facebook !== undefined) dbUpdates.facebook = updates.facebook;
      if (updates.youtube !== undefined) dbUpdates.youtube = updates.youtube;
      if (updates.tiktok !== undefined) dbUpdates.tiktok = updates.tiktok;
      if (updates.twitter !== undefined) dbUpdates.twitter = updates.twitter;
      if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
      if (updates.telegram !== undefined) dbUpdates.telegram = updates.telegram;
      if (updates.ksPhone !== undefined) dbUpdates.ks_phone = updates.ksPhone;
      if (updates.operatorPhone !== undefined) dbUpdates.operator_phone = updates.operatorPhone;
      if (updates.vision !== undefined) dbUpdates.vision = updates.vision;
      if (updates.mission !== undefined) dbUpdates.mission = updates.mission;
      if (updates.accreditation !== undefined) dbUpdates.accreditation = updates.accreditation;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('schools')
        .update(dbUpdates)
        .eq('npsn', npsn)
        .select()
        .single();
      if (!error && data) {
        return mapSchoolRow(data as Record<string, unknown>);
      }
    } catch (err) {
      logger.warn('Fallback update school', { error: err });
    }
  }

  const schools = await getSchools();
  const idx = schools.findIndex((s) => s.npsn === npsn);
  if (idx === -1) return null;
  schools[idx] = { ...schools[idx], ...updates };
  if (!isSupabaseConfigured()) {
    setStorageItem('koryandik_custom_schools', schools);
  }
  return schools[idx];
}

export async function getSchoolsByGugus(gugusId: string): Promise<School[]> {
  const allSchools = await getSchools();
  return allSchools.filter((s) => s.gugus === gugusId);
}

export async function addSchool(school: School): Promise<School> {
  if (isSupabaseConfigured()) {
    try {
      const dbInsert: Record<string, unknown> = {
        npsn: school.npsn,
        name: school.name,
        level: school.level,
        address: school.address,
        gugus_id: school.gugus,
        principal_name: school.principalName,
        operator_name: school.operatorName,
        student_count: school.studentCount,
        teacher_count: school.teacherCount,
        logo_url: school.logoUrl,
        // Avatar fields
        principal_avatar_url: school.principalAvatarUrl,
        operator_avatar_url: school.operatorAvatarUrl,
        // Social Media & Branding
        website: school.website,
        instagram: school.instagram,
        facebook: school.facebook,
        youtube: school.youtube,
        tiktok: school.tiktok,
        twitter: school.twitter,
        linkedin: school.linkedin,
        email: school.email,
        whatsapp: school.whatsapp,
        telegram: school.telegram,
        lat: school.lat,
        lng: school.lng,
        signature_url: school.signatureUrl,
        stempel_color: school.stempelColor,
        ks_phone: school.ksPhone,
        operator_phone: school.operatorPhone,
        vision: school.vision,
        mission: school.mission,
        accreditation: school.accreditation,
        status: school.status
      };

      const { data, error } = await supabase
        .from('schools')
        .insert(dbInsert)
        .select()
        .single();
      if (!error && data) {
        return mapSchoolRow(data as Record<string, unknown>);
      }
    } catch (err) {
      logger.warn('Fallback add school', { error: err });
    }
  }

  const schools = await getSchools();
  schools.push(school);
  setStorageItem('koryandik_custom_schools', schools);
  return school;
}

export async function deleteSchool(npsn: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('schools')
        .delete()
        .eq('npsn', npsn);
      return;
    } catch (err) {
      logger.warn('Fallback delete school', { error: err });
    }
  }

  const schools = await getSchools();
  const filtered = schools.filter((s) => s.npsn !== npsn);
  setStorageItem('koryandik_custom_schools', filtered);
}

// ========== CATEGORIES ==========
export async function getCategories(): Promise<Category[]> {
  let categories: Category[] = [];
  
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (!error && data) {
        categories = data.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          description: c.description as string,
          icon: c.icon as string,
          deadline: c.deadline as string | undefined
        }));
      }
    } catch (err) {
      logger.warn('Fallback to local categories', { error: err });
    }
  }

  if (categories.length === 0) {
    const custom = getStorageItem<Category[]>('koryandik_custom_categories', []);
    if (custom.length === 0) {
      setStorageItem('koryandik_custom_categories', initialCategories);
      categories = initialCategories;
    } else {
      categories = custom;
    }
  }

  // Apply consistent sorting by name
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          icon: data.icon,
          deadline: data.deadline
        };
      }
    } catch (err) {
      logger.warn('Fallback update category', { error: err });
    }
  }

  const cats = await getCategories();
  const idx = cats.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  cats[idx] = { ...cats[idx], ...updates };
  setStorageItem('koryandik_custom_categories', cats);
  return cats[idx];
}

export async function addCategory(cat: Category): Promise<Category> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(cat)
        .select()
        .single();
      if (!error && data) {
        return data;
      }
    } catch (err) {
      logger.warn('Fallback add category', { error: err });
    }
  }

  const cats = await getCategories();
  cats.push(cat);
  setStorageItem('koryandik_custom_categories', cats);
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      return;
    } catch (err) {
      logger.warn('Fallback delete category', { error: err });
    }
  }

  const cats = await getCategories();
  const filtered = cats.filter((c) => c.id !== id);
  setStorageItem('koryandik_custom_categories', filtered);
}

// ========== GUGUS ==========
export async function getGugusData(existingSchools?: School[]): Promise<GugusData[]> {
  let rawGugus: GugusData[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('gugus')
        .select('*')
        .order('id');
      if (!error && data) {
        rawGugus = data.map((g: Record<string, unknown>) => ({
          id: g.id as string,
          name: g.name as string,
          koordinator: g.koordinator as string,
          sekolahInti: g.sekolah_inti as string,
          passcode: g.passcode as string
        }));
      }
    } catch (err) {
      logger.warn('Fallback to local gugus data', { error: err });
    }
  }

  if (rawGugus.length === 0) {
    const custom = getStorageItem<GugusData[]>('koryandik_custom_gugus', []);
    if (custom.length > 0) {
      rawGugus = custom;
    } else {
      setStorageItem('koryandik_custom_gugus', gugusData);
      rawGugus = [...gugusData];
    }
  }

  // Apply consistent sorting by ID (I, II, III, IV, V)
  const gugusOrder = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
  rawGugus.sort((a, b) => {
    const aOrder = gugusOrder[a.id as keyof typeof gugusOrder] || 99;
    const bOrder = gugusOrder[b.id as keyof typeof gugusOrder] || 99;
    return aOrder - bOrder;
  });

  // Enrich with sekolah inti passcode and koordinator
  // Koordinator SELALU diambil dari operator_name sekolah inti (single source of truth)
  try {
    const allSchools = existingSchools || await getSchools();
    return rawGugus.map((g) => {
      const school = allSchools.find((s) => s.npsn === g.sekolahInti);
      return {
        ...g,
        koordinator: school?.operatorName || g.koordinator || '',
        passcode: g.sekolahInti,
      };
    });
  } catch {
    return rawGugus;
  }
}

export async function updateGugus(gugusId: string, updates: Partial<GugusData>): Promise<GugusData | null> {
  if (updates.sekolahInti !== undefined && updates.passcode === undefined) {
    updates.passcode = updates.sekolahInti; // Sync passcode with new Sekolah Inti NPSN
  }

  if (isSupabaseConfigured()) {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.koordinator !== undefined) dbUpdates.koordinator = updates.koordinator;
      if (updates.sekolahInti !== undefined) dbUpdates.sekolah_inti = updates.sekolahInti;
      if (updates.passcode !== undefined) dbUpdates.passcode = updates.passcode;

      const { data, error } = await supabase
        .from('gugus')
        .update(dbUpdates)
        .eq('id', gugusId)
        .select()
        .single();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          koordinator: data.koordinator,
          sekolahInti: data.sekolah_inti,
          passcode: data.passcode
        };
      }
    } catch (err) {
      logger.warn('Fallback update gugus', { error: err });
    }
  }

  // localStorage fallback
  const allGugus = await getGugusData();
  const idx = allGugus.findIndex(g => g.id === gugusId);
  if (idx === -1) return null;
  allGugus[idx] = { ...allGugus[idx], ...updates };
  setStorageItem('koryandik_custom_gugus', allGugus);
  return allGugus[idx];
}

// ========== SUPERVISORS ==========
export async function getSupervisors(): Promise<PengawasData[]> {
  let supervisors: PengawasData[] = [];
  
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('supervisors')
        .select('*')
        .order('role')
        .order('name');
      if (!error && data) {
        supervisors = data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          nip: s.nip as string,
          passcode: s.passcode as string,
          role: s.role as 'pengawas' | 'kkks' | 'pgri' | 'admin',
          title: s.title as string,
          wilayah: s.wilayah as string,
          photoUrl: s.photo_url as string | undefined,
          phone: s.phone as string | undefined
        }));
      }
    } catch (err) {
      logger.warn('Fallback to local supervisors', { error: err });
    }
  }

  if (supervisors.length === 0) {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('koryandik_supervisors');
      if (local) {
        try {
          supervisors = JSON.parse(local);
        } catch {
          supervisors = [];
        }
      }
    }
    if (supervisors.length === 0) {
      supervisors = supervisorData;
    }
  }

  // Apply consistent sorting by role (admin first), then by name
  return supervisors.sort((a, b) => {
    const aRole = SUPERVISOR_ROLE_ORDER[a.role as keyof typeof SUPERVISOR_ROLE_ORDER] ?? 99;
    const bRole = SUPERVISOR_ROLE_ORDER[b.role as keyof typeof SUPERVISOR_ROLE_ORDER] ?? 99;
    if (aRole !== bRole) return aRole - bRole;
    return a.name.localeCompare(b.name);
  });
}

export async function saveSupervisors(supervisors: PengawasData[]): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const formatted = supervisors.map(s => ({
        id: s.id,
        name: s.name,
        nip: s.nip,
        passcode: s.passcode,
        role: s.role,
        title: s.title,
        wilayah: s.wilayah,
        photo_url: s.photoUrl,
        phone: s.phone
      }));
      const { error } = await supabase
        .from('supervisors')
        .upsert(formatted);
      if (error) throw error;
    } catch (err) {
      logger.error('Failed to save supervisors to Supabase', err);
    }
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('koryandik_supervisors', JSON.stringify(supervisors));
  }
}

// ========== SUBMISSIONS ==========
export async function getSubmissions(): Promise<Submission[]> {
  let submissions: Submission[] = [];
  let useLocalFallback = false;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (!error && data) {
        submissions = data.map((s: Record<string, unknown>) => mapSubmissionRow(s));
        return submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      }
      if (error) {
        useLocalFallback = true;
        logger.warn('Fallback to local submissions due to Supabase error', { error });
      }
    } catch (err) {
      useLocalFallback = true;
      logger.warn('Fallback to local submissions', { error: err });
    }
  } else {
    useLocalFallback = true;
  }

  if (useLocalFallback) {
    submissions = getStorageItem<Submission[]>('koryandik_submissions', []);
  }

  // Apply consistent sorting by date (newest first)
  return submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function getSubmissionsBySchool(npsn: string): Promise<Submission[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('school_npsn', npsn);
      if (!error && data) {
        return data.map((s: Record<string, unknown>) => mapSubmissionRow(s));
      }
    } catch (err) {
      logger.warn('Fallback to local submissions by school', { error: err });
    }
  }

  const subs = await getSubmissions();
  return subs.filter((s) => s.schoolNpsn === npsn);
}

function dispatchWaSimulate(schoolNpsn: string, message: string) {
  if (typeof window !== 'undefined') {
    getSchoolByNpsn(schoolNpsn).then((school) => {
      if (school) {
        const phone = school.operatorPhone || school.ksPhone || '+6285759000000';
        const event = new CustomEvent('koryandik_wa_simulated', {
          detail: {
            schoolName: school.name,
            phone: phone,
            message: message,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        });
        window.dispatchEvent(event);
      }
    });
  }
}

export async function updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | null> {
  if (isSupabaseConfigured()) {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.submittedAt !== undefined) dbUpdates.submitted_at = updates.submittedAt;
      if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;
      if (updates.reviewedBy !== undefined) dbUpdates.reviewed_by = updates.reviewedBy;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;
      if (updates.driveLink !== undefined) dbUpdates.drive_link = updates.driveLink;

      const { data, error } = await supabase
        .from('submissions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
        
      if (!error && data) {
        const submissionObj = mapSubmissionRow(data as Record<string, unknown>);

        // Add log entry & notification in parallel (fire-and-forget pattern)
        const logPromise = addLog({
          action: updates.status === 'approved' ? 'Approve berkas' : updates.status === 'rejected' ? 'Reject berkas' : 'Update berkas',
          user: updates.reviewedBy || 'System',
          role: 'admin',
          details: `Berkas ${submissionObj.fileName} status: ${updates.status}`,
        });

        if (updates.status) {
          const statusText = updates.status === 'approved' ? 'disetujui' : updates.status === 'rejected' ? 'ditolak' : 'diminta revisi';
          const reviewer = updates.reviewedBy || 'Pengawas';
          const msg = `Halo Operator ${submissionObj.schoolNpsn}, berkas "${submissionObj.fileName || 'administrasi'}" Anda telah ${statusText} oleh ${reviewer}. Catatan: ${updates.notes || '-'}`;

          const notifPromise = addNotification({
            type: updates.status as NotificationType,
            title: `Berkas ${updates.status === 'approved' ? 'Disetujui' : updates.status === 'rejected' ? 'Ditolak' : 'Butuh Revisi'}`,
            message: `Berkas ${submissionObj.fileName || 'administrasi'} Anda telah ${statusText} oleh ${reviewer}.`,
            targetRole: 'school',
            schoolNpsn: submissionObj.schoolNpsn,
            icon: updates.status === 'approved' ? 'fa-solid fa-circle-check' : updates.status === 'rejected' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-exclamation'
          });

          // Run log + notification in parallel, don't block
          await Promise.allSettled([logPromise, notifPromise]);
          dispatchWaSimulate(submissionObj.schoolNpsn, msg);
        } else {
          await logPromise;
        }

        // ➡️ Auto-archive ke Google Drive Koryandik saat berkas disetujui
        if (updates.status === 'approved' && submissionObj.driveLink) {
          triggerDriveArchive(submissionObj).catch((err) =>
            logger.warn('[DriveArchive] Gagal mengarsipkan', { error: err })
          );
        }

        return submissionObj;
      }
    } catch (err) {
      logger.warn('Fallback update submission', { error: err });
    }
  }

  const subs = await getSubmissions();
  const idx = subs.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  subs[idx] = { ...subs[idx], ...updates };
  if (!isSupabaseConfigured()) {
    setStorageItem('koryandik_submissions', subs);
  }
  addLog({
    action: updates.status === 'approved' ? 'Approve berkas' : updates.status === 'rejected' ? 'Reject berkas' : 'Update berkas',
    user: updates.reviewedBy || 'System',
    role: 'admin',
    details: `Berkas ${subs[idx].fileName} status: ${updates.status}`,
  });

  // Fallback Notification
  if (updates.status) {
    const statusText = updates.status === 'approved' ? 'disetujui' : updates.status === 'rejected' ? 'ditolak' : 'diminta revisi';
    const reviewer = updates.reviewedBy || 'Pengawas';
    const msg = `Halo Operator ${subs[idx].schoolNpsn}, berkas "${subs[idx].fileName || 'administrasi'}" Anda telah ${statusText} oleh ${reviewer}. Catatan: ${updates.notes || '-'}`;

    addNotification({
      type: updates.status as NotificationType,
      title: `Berkas ${updates.status === 'approved' ? 'Disetujui' : updates.status === 'rejected' ? 'Ditolak' : 'Butuh Revisi'}`,
      message: `Berkas ${subs[idx].fileName || 'administrasi'} Anda telah ${statusText} oleh ${reviewer}.`,
      targetRole: 'school',
      schoolNpsn: subs[idx].schoolNpsn,
      icon: updates.status === 'approved' ? 'fa-solid fa-circle-check' : updates.status === 'rejected' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-exclamation'
    });

    dispatchWaSimulate(subs[idx].schoolNpsn, msg);
  }

  // ➡️ Auto-archive ke Google Drive Koryandik saat berkas disetujui (fallback path)
  if (updates.status === 'approved' && subs[idx].driveLink) {
    triggerDriveArchive(subs[idx]).catch((err) =>
      logger.warn('[DriveArchive] Gagal mengarsipkan', { error: err })
    );
  }

  return subs[idx];
}

/**
 * Fire-and-forget: arsipkan berkas yang di-approve ke Shared Google Drive
 * Folder hierarchy: Main Folder → Gugus X → Nama Sekolah → Kategori
 */
async function triggerDriveArchive(submission: Submission): Promise<void> {
  try {
    const [schools, cats] = await Promise.all([getSchools(), getCategories()]);
    const school = schools.find((s) => s.npsn === submission.schoolNpsn);
    const schoolName = school?.name ?? `Sekolah NPSN ${submission.schoolNpsn}`;
    const gugusName = school?.gugus ? `Gugus ${school.gugus}` : 'Gugus Lainnya';

    const cat = cats.find((c) => c.id === submission.categoryId);
    const categoryName = cat?.name ?? submission.categoryId;

    const result = await archiveSubmissionToDrive({
      driveLink: submission.driveLink || '',
      fileName: `${categoryName}_${schoolName}_${new Date().toISOString().slice(0, 7)}`,
      gugusName,
      schoolName,
      categoryName,
    });

    if (result.success) {
      logger.info(`[DriveArchive] ✅ Berkas "${submission.fileName}" berhasil diarsipkan`, { archiveUrl: result.archiveUrl });
      // Tambahkan log aktivitas arsip
      await addLog({
        action: 'Arsip Google Drive',
        user: 'System',
        role: 'admin',
        details: `Berkas "${submission.fileName}" dari ${schoolName} berhasil diarsipkan ke Google Drive Koryandik Pusat`,
      });
    } else {
      logger.warn(`[DriveArchive] ⚠️ Gagal arsip "${submission.fileName}"`, { message: result.message });
    }
  } catch (err) {
    logger.error('[DriveArchive] Error', err);
  }
}

export async function addSubmission(submission: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
  const newId = generateId();
  if (isSupabaseConfigured()) {
    try {
      const dbInsert = {
        id: newId,
        school_npsn: submission.schoolNpsn,
        category_id: submission.categoryId,
        status: submission.status,
        drive_link: submission.driveLink,
        file_name: submission.fileName,
        submitted_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('submissions')
        .insert(dbInsert)
        .select()
        .single();
      if (!error && data) {
        const subObj = mapSubmissionRow(data as Record<string, unknown>);
        const schools = await getSchools();
        const school = schools.find((s) => s.npsn === subObj.schoolNpsn);
        const schoolLabel = school?.name ?? `NPSN ${subObj.schoolNpsn}`;

        addNotification({
          type: 'upload',
          title: 'Berkas Baru Diunggah',
          message: `${schoolLabel} mengunggah berkas: ${subObj.fileName || 'dokumen baru'}.`,
          targetRole: 'admin',
          schoolNpsn: subObj.schoolNpsn,
          icon: 'fa-solid fa-file-arrow-up'
        });

        if (school?.gugus) {
          addNotification({
            type: 'upload',
            title: 'Berkas Baru dari Sekolah Binaan',
            message: `${schoolLabel} mengunggah berkas: ${subObj.fileName || 'dokumen baru'}.`,
            targetRole: 'gugus',
            schoolNpsn: subObj.schoolNpsn,
            icon: 'fa-solid fa-file-arrow-up'
          });
        }

        return subObj;
      }
    } catch (err) {
      logger.warn('Fallback add submission', { error: err });
    }
  }

  const subs = await getSubmissions();
  const newSub: Submission = { ...submission, id: newId, submittedAt: new Date().toISOString() };
  subs.push(newSub);
  if (!isSupabaseConfigured()) {
    setStorageItem('koryandik_submissions', subs);
  }

  const schools = await getSchools();
  const school = schools.find((s) => s.npsn === newSub.schoolNpsn);
  const schoolLabel = school?.name ?? `NPSN ${newSub.schoolNpsn}`;

  await addNotification({
    type: 'upload',
    title: 'Berkas Baru Diunggah',
    message: `${schoolLabel} mengunggah berkas: ${newSub.fileName || 'dokumen baru'}.`,
    targetRole: 'admin',
    schoolNpsn: newSub.schoolNpsn,
    icon: 'fa-solid fa-file-arrow-up'
  });

  if (school?.gugus) {
    await addNotification({
      type: 'upload',
      title: 'Berkas Baru dari Sekolah Binaan',
      message: `${schoolLabel} mengunggah berkas: ${newSub.fileName || 'dokumen baru'}.`,
      targetRole: 'gugus',
      schoolNpsn: newSub.schoolNpsn,
      icon: 'fa-solid fa-file-arrow-up'
    });
  }

  return newSub;
}

// ========== LOGS ==========
export async function getLogs(): Promise<LogEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data) {
        return data.map((l: Record<string, unknown>) => ({
          id: String(l.id),
          action: l.action as string,
          user: l.username as string,
          role: l.role as string,
          timestamp: l.timestamp as string,
          details: l.details as string | undefined
        }));
      }
    } catch (err) {
      logger.warn('Fallback to local logs', { error: err });
    }
  }

  const logs = getStorageItem<LogEntry[]>('koryandik_logs', []);
  return logs;
}

export async function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action: entry.action,
          username: entry.user,
          role: entry.role,
          details: entry.details,
          timestamp: new Date().toISOString()
        });
      return;
    } catch (err) {
      logger.warn('Fallback add log', { error: err });
    }
  }

  const logs = await getLogs();
  logs.unshift({ ...entry, id: generateId(), timestamp: new Date().toISOString() });
  setStorageItem('koryandik_logs', logs);
}

// ========== ANNOUNCEMENTS ==========
export async function getAnnouncements(): Promise<Announcement[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((a: Record<string, unknown>) => ({
          id: String(a.id),
          title: a.title as string,
          content: a.content as string,
          createdAt: a.created_at as string,
          createdBy: a.created_by as string,
          priority: a.priority as 'low' | 'normal' | 'high'
        }));
      }
    } catch (err) {
      logger.warn('Fallback to local announcements', { error: err });
    }
  }

  const anns = getStorageItem<Announcement[]>('koryandik_announcements', []);
  return anns;
}

export async function addAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: ann.title,
          content: ann.content,
          priority: ann.priority,
          created_by: ann.createdBy,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (!error && data) {
        const created = {
          id: String(data.id),
          title: data.title,
          content: data.content,
          createdAt: data.created_at,
          createdBy: data.created_by,
          priority: data.priority
        };

        await addNotification({
          type: 'announcement',
          title: created.title,
          message: created.content.length > 180 ? `${created.content.slice(0, 180)}…` : created.content,
          targetRole: 'school',
          icon: created.priority === 'high' ? 'fa-solid fa-tower-broadcast' : 'fa-solid fa-bullhorn'
        });

        if (created.priority === 'high') {
          await addNotification({
            type: 'announcement',
            title: `[Mendesak] ${created.title}`,
            message: created.content.length > 180 ? `${created.content.slice(0, 180)}…` : created.content,
            targetRole: 'gugus',
            icon: 'fa-solid fa-tower-broadcast'
          });
        }

        return created;
      }
    } catch (err) {
      logger.warn('Fallback add announcement', { error: err });
    }
  }

  const anns = await getAnnouncements();
  const newAnn: Announcement = { ...ann, id: generateId(), createdAt: new Date().toISOString() };
  anns.unshift(newAnn);
  setStorageItem('koryandik_announcements', anns);

  await addNotification({
    type: 'announcement',
    title: newAnn.title,
    message: newAnn.content.length > 180 ? `${newAnn.content.slice(0, 180)}…` : newAnn.content,
    targetRole: 'school',
    icon: newAnn.priority === 'high' ? 'fa-solid fa-tower-broadcast' : 'fa-solid fa-bullhorn'
  });

  if (newAnn.priority === 'high') {
    await addNotification({
      type: 'announcement',
      title: `[Mendesak] ${newAnn.title}`,
      message: newAnn.content.length > 180 ? `${newAnn.content.slice(0, 180)}…` : newAnn.content,
      targetRole: 'gugus',
      icon: 'fa-solid fa-tower-broadcast'
    });
  }

  return newAnn;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      return;
    } catch (err) {
      logger.warn('Fallback delete announcement', { error: err });
    }
  }

  const anns = await getAnnouncements();
  setStorageItem('koryandik_announcements', anns.filter((a) => a.id !== id));
}

// ========== MAP COORDINATES ==========
export async function getSchoolCoordinatesMap(): Promise<Record<string, { lat: number; lng: number }>> {
  const schools = await getSchools();
  const map: Record<string, { lat: number; lng: number }> = {};
  schools.forEach((s) => {
    if (s.lat !== null && s.lng !== null && s.lat !== undefined && s.lng !== undefined) {
      map[s.npsn] = { lat: s.lat, lng: s.lng };
    }
  });
  return map;
}

export async function saveSchoolCoordinates(npsn: string, lat: number, lng: number): Promise<Record<string, { lat: number; lng: number }>> {
  await updateSchool(npsn, { lat, lng });
  return getSchoolCoordinatesMap();
}

export async function resetSchoolCoordinates(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('schools').update({ lat: null, lng: null }).neq('npsn', '');
      return;
    } catch (err) {
      logger.warn('Fallback resetSchoolCoordinates', { error: err });
    }
  }
  // LocalStorage fallback
  const schools = await getSchools();
  for (const s of schools) {
    await updateSchool(s.npsn, { lat: null, lng: null });
  }
}

// ========== NOTIFICATIONS ==========
function filterNotificationsForRole(
  allNotifs: Notification[],
  role: string,
  schoolNpsn?: string,
  gugusId?: string,
  gugusSchoolNpsns?: Set<string>
): Notification[] {
  return allNotifs.filter((n) => {
    if (n.targetRole && n.targetRole !== role) return false;

    if (role === 'school') {
      if (n.schoolNpsn && schoolNpsn && n.schoolNpsn !== schoolNpsn) return false;
      return true;
    }

    if (role === 'gugus') {
      if (n.schoolNpsn && gugusSchoolNpsns && !gugusSchoolNpsns.has(n.schoolNpsn)) {
        return false;
      }
      return true;
    }

    return true;
  });
}

export async function getNotifications(
  role?: string,
  schoolNpsn?: string,
  gugusId?: string
): Promise<Notification[]> {
  let allNotifs: Notification[] = [];
  let useLocalFallback = false;

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      // Apply server-side role filter when possible
      if (role) {
        query = query.or(`target_role.eq.${role},target_role.is.null`);
      }
      if (schoolNpsn && role === 'school') {
        query = query.or(`school_npsn.eq.${schoolNpsn},school_npsn.is.null`);
      }
      const { data, error } = await query;
      if (!error && data) {
        allNotifs = data.map((n: Record<string, unknown>) => ({
          id: String(n.id),
          type: n.type as NotificationType,
          title: n.title as string,
          message: n.message as string,
          timestamp: n.timestamp as string,
          read: n.read as boolean,
          targetRole: n.target_role as NotificationTargetRole | undefined,
          schoolNpsn: n.school_npsn as string | undefined,
          icon: n.icon as string | undefined
        }));
      } else {
        useLocalFallback = true;
        if (error) {
          logger.warn('Fallback to local notifications due to Supabase error', { error });
        } else {
          logger.warn('Fallback to local notifications because no data returned from Supabase');
        }
      }
    } catch (err) {
      useLocalFallback = true;
      logger.warn('Fallback to local notifications', { error: err });
    }
  } else {
    useLocalFallback = true;
  }

  if (useLocalFallback) {
    allNotifs = getStorageItem<Notification[]>('koryandik_notifications', []);
  }

  if (role) {
    let gugusSchoolNpsns: Set<string> | undefined;
    if (role === 'gugus' && gugusId) {
      const schools = await getSchools();
      gugusSchoolNpsns = new Set(
        schools.filter((s) => s.gugus === gugusId).map((s) => s.npsn)
      );
    }
    return filterNotificationsForRole(allNotifs, role, schoolNpsn, gugusId, gugusSchoolNpsns);
  }

  return allNotifs;
}

export async function getUnreadNotificationCount(
  role?: string,
  schoolNpsn?: string,
  gugusId?: string
): Promise<number> {
  const notifs = await getNotifications(role, schoolNpsn, gugusId);
  return notifs.filter((n) => !n.read).length;
}

export async function addNotification(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
  const finalize = async (created: Notification) => {
    emitNotificationsUpdated(created);
    await maybeNotifyCurrentUser(created);
    return created;
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          type: notif.type,
          title: notif.title,
          message: notif.message,
          target_role: notif.targetRole,
          school_npsn: notif.schoolNpsn,
          icon: notif.icon,
          read: false,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      if (!error && data) {
        return await finalize({
          id: String(data.id),
          type: data.type,
          title: data.title,
          message: data.message,
          timestamp: data.timestamp,
          read: data.read,
          targetRole: data.target_role,
          schoolNpsn: data.school_npsn,
          icon: data.icon
        });
      }
    } catch (err) {
      logger.warn('Fallback add notification', { error: err });
    }
  }

  const notifications = await getNotifications();
  const newNotif: Notification = {
    ...notif,
    id: generateId(),
    timestamp: new Date().toISOString(),
    read: false
  };
  notifications.unshift(newNotif);
  if (notifications.length > 100) notifications.splice(100);
  setStorageItem('koryandik_notifications', notifications);
  return await finalize(newNotif);
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      emitNotificationsUpdated();
      return;
    } catch (err) {
      logger.warn('Fallback mark notification read', { error: err });
    }
  }

  const notifications = await getNotifications();
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    setStorageItem('koryandik_notifications', notifications);
    emitNotificationsUpdated();
  }
}

export async function markAllNotificationsRead(
  role?: string,
  schoolNpsn?: string,
  gugusId?: string
): Promise<void> {
  const scoped = await getNotifications(role, schoolNpsn, gugusId);
  const unreadIds = scoped.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length === 0) return;

  if (isSupabaseConfigured()) {
    try {
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      }
      emitNotificationsUpdated();
      return;
    } catch (err) {
      logger.warn('Fallback mark all notifications read', { error: err });
    }
  }

  const all = getStorageItem<Notification[]>('koryandik_notifications', []);
  const idSet = new Set(unreadIds);
  all.forEach((n) => {
    if (idSet.has(n.id)) n.read = true;
  });
  setStorageItem('koryandik_notifications', all);
  emitNotificationsUpdated();
}

export async function checkAndCreateDeadlineReminders(
  schoolNpsn: string,
  categories: Category[],
  submissions: Submission[]
): Promise<void> {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const notifications = await getNotifications('school', schoolNpsn);

  // Pre-fetch all settings once to avoid N+1 queries inside the loop
  const allSettings = await getAppSettings();
  const reminderConfigSetting = allSettings['deadline_reminder_days'];
  const reminderConfig = reminderConfigSetting 
    ? (reminderConfigSetting.value as { before: number; after: number }) 
    : { before: 7, after: 2 };
  const defaultDeadlineSetting = allSettings['submission_deadline_default'];
  const defaultDeadline = defaultDeadlineSetting 
    ? (defaultDeadlineSetting.value as { day: number; type: string }) 
    : { day: 15, type: 'monthly' };

  for (const cat of categories) {
    // Check if school already has an approved or pending submission for this category in the current month
    const hasSubmission = submissions.some(
      s => s.categoryId === cat.id && 
           s.schoolNpsn === schoolNpsn && 
           (s.status === 'approved' || s.status === 'pending') &&
           new Date(s.submittedAt).getMonth() === currentMonth &&
           new Date(s.submittedAt).getFullYear() === currentYear
    );

    if (hasSubmission) continue;

    // Parse deadline day
    let deadlineDay = 15; // default fallback
    const reminderBefore = reminderConfig.before ?? 7;
    const reminderAfter = reminderConfig.after ?? 2;

    if (cat.deadline) {
      const match = cat.deadline.match(/tanggal\s+(\d+)/i);
      if (match) {
        deadlineDay = parseInt(match[1]);
      }
    } else {
      if (typeof defaultDeadline?.day === 'number') {
        deadlineDay = defaultDeadline.day;
      }
    }

    const deadlineDate = new Date(currentYear, currentMonth, deadlineDay);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If within reminder window, trigger a reminder
    if (diffDays <= reminderBefore && diffDays >= -reminderAfter) {
      const reminderTitle = `Batas Waktu: ${cat.name}`;
      
      // Avoid duplicate reminders created in the last 24 hours
      const hasRecentReminder = notifications.some(
        n => n.title === reminderTitle &&
             (today.getTime() - new Date(n.timestamp).getTime()) < (24 * 60 * 60 * 1000)
      );

      if (!hasRecentReminder) {
        await addNotification({
          type: 'system',
          title: reminderTitle,
          message: `Segera lengkapi berkas "${cat.name}". Batas waktu pengumpulan adalah tanggal ${deadlineDay} bulan ini (${diffDays === 0 ? 'Hari ini' : diffDays < 0 ? 'Terlambat ' + Math.abs(diffDays) + ' hari' : diffDays + ' hari lagi'}).`,
          targetRole: 'school',
          schoolNpsn,
          icon: 'fa-solid fa-clock'
        });
      }
    }
  }
}

// ============================================================

export async function getFaqs(): Promise<FaqItem[]> {
  return getAppSetting<FaqItem[]>('page_faqs', DEFAULT_FAQS);
}

export async function saveFaqs(faqs: FaqItem[]): Promise<void> {
  await upsertAppSetting('page_faqs', faqs, 'Daftar data tanya jawab FAQ halaman bantuan.');
}

// === DOWNLOAD CENTER FUNCTIONS ===
export async function getDownloads(): Promise<DownloadItem[]> {
  return getAppSetting<DownloadItem[]>('page_downloads', DEFAULT_DOWNLOADS);
}

export async function saveDownloads(downloads: DownloadItem[]): Promise<void> {
  await upsertAppSetting('page_downloads', downloads, 'Daftar data berkas unduhan publik.');
}

export async function incrementDownloadCount(id: string): Promise<void> {
  const list = await getDownloads();
  const updated = list.map(item => {
    if (item.id === id) {
      return { ...item, downloadCount: (item.downloadCount || 0) + 1 };
    }
    return item;
  });
  await saveDownloads(updated);
}

export async function addDownloadItem(item: Omit<DownloadItem, 'id' | 'updatedAt' | 'downloadCount'>): Promise<DownloadItem> {
  const list = await getDownloads();
  const newItem: DownloadItem = {
    ...item,
    id: 'dl-' + generateId(),
    updatedAt: new Date().toISOString().split('T')[0],
    downloadCount: 0
  };
  list.unshift(newItem);
  await saveDownloads(list);
  return newItem;
}

export async function updateDownloadItem(item: DownloadItem): Promise<void> {
  const list = await getDownloads();
  const updated = list.map(i => (i.id === item.id ? { ...item, updatedAt: new Date().toISOString().split('T')[0] } : i));
  await saveDownloads(updated);
}

export async function deleteDownloadItem(id: string): Promise<void> {
  const list = await getDownloads();
  const filtered = list.filter(i => i.id !== id);
  await saveDownloads(filtered);
}

// === CALENDAR FUNCTIONS ===
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return getAppSetting<CalendarEvent[]>('page_calendar_events', DEFAULT_CALENDAR_EVENTS);
}

export async function saveCalendarEvents(events: CalendarEvent[]): Promise<void> {
  await upsertAppSetting('page_calendar_events', events, 'Daftar agenda dan kalender akademik terpadu.');
}

export async function addCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const list = await getCalendarEvents();
  const newEvent: CalendarEvent = {
    ...event,
    id: 'evt-' + generateId()
  };
  list.push(newEvent);
  await saveCalendarEvents(list);
  return newEvent;
}

export async function updateCalendarEvent(event: CalendarEvent): Promise<void> {
  const list = await getCalendarEvents();
  const updated = list.map(e => (e.id === event.id ? event : e));
  await saveCalendarEvents(updated);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const list = await getCalendarEvents();
  const filtered = list.filter(e => e.id !== id);
  await saveCalendarEvents(filtered);
}

export async function getProfileSettings(): Promise<ProfileSettings> {
  return getAppSetting<ProfileSettings>('page_profile', DEFAULT_PROFILE);
}

export async function saveProfileSettings(profile: ProfileSettings): Promise<void> {
  await upsertAppSetting('page_profile', profile, 'Profil informasi Koryandik, alamat, kontak, visi & misi.');
}

// === GALLERY DOCUMENTATION FUNCTIONS ===
export async function getGalleryItems(): Promise<GalleryItem[]> {
  return getAppSetting<GalleryItem[]>('page_gallery', DEFAULT_GALLERY);
}

export async function saveGalleryItems(items: GalleryItem[]): Promise<void> {
  await upsertAppSetting('page_gallery', items, 'Daftar foto galeri dokumentasi kegiatan.');
}

// === RELATED LINKS FUNCTIONS ===
export async function getRelatedLinks(): Promise<RelatedLink[]> {
  const links = await getAppSetting<RelatedLink[]>('page_related_links', DEFAULT_RELATED_LINKS);
  return links
    .filter(link => link.isActive)
    .sort((a, b) => a.order - b.order);
}

export async function getAllRelatedLinks(): Promise<RelatedLink[]> {
  return getAppSetting<RelatedLink[]>('page_related_links', DEFAULT_RELATED_LINKS);
}

export async function saveRelatedLinks(links: RelatedLink[]): Promise<void> {
  await upsertAppSetting('page_related_links', links, 'Daftar tautan terkait yang ditampilkan di portal sekolah.');
}

export async function addRelatedLink(link: Omit<RelatedLink, 'id'>): Promise<RelatedLink> {
  const list = await getAllRelatedLinks();
  const newLink: RelatedLink = {
    ...link,
    id: 'link-' + generateId()
  };
  list.push(newLink);
  await saveRelatedLinks(list);
  return newLink;
}

export async function updateRelatedLink(link: RelatedLink): Promise<void> {
  const list = await getAllRelatedLinks();
  const updated = list.map(l => (l.id === link.id ? link : l));
  await saveRelatedLinks(updated);
}

export async function deleteRelatedLink(id: string): Promise<void> {
  const list = await getAllRelatedLinks();
  const filtered = list.filter(l => l.id !== id);
  await saveRelatedLinks(filtered);
}


// ========== ONLINE PRESENCE (Tracking user yang sedang aktif) ==========

export interface OnlinePresence {
  id: string;         // "school-20201234" atau "pengawas-1"
  role: string;
  userName: string;
  npsn?: string | null;
  gugusId?: string | null;
  lastSeen: string;
  page?: string;
}

/** Kirim heartbeat: upsert presence row agar admin tahu user masih online */
export async function updatePresence(data: {
  id: string;
  role: string;
  userName: string;
  npsn?: string | null;
  gugusId?: string | null;
  page?: string;
}): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('online_presence')
        .upsert({
          id: data.id,
          role: data.role,
          user_name: data.userName,
          npsn: data.npsn || null,
          gugus_id: data.gugusId || null,
          last_seen: new Date().toISOString(),
          page: data.page || '/dashboard',
        }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      console.warn('[Presence] Supabase fallback:', err);
    }
  }

  // LocalStorage fallback
  const list = getStorageItem<OnlinePresence[]>('koryandik_presence', []);
  const now = new Date().toISOString();
  const idx = list.findIndex(p => p.id === data.id);
  const entry: OnlinePresence = {
    id: data.id,
    role: data.role,
    userName: data.userName,
    npsn: data.npsn,
    gugusId: data.gugusId,
    lastSeen: now,
    page: data.page || '/dashboard',
  };
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  setStorageItem('koryandik_presence', list);
}

/** Ubah status presence menjadi 'Offline' saat user logout */
export async function removePresence(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('online_presence')
        .update({ page: 'Offline', last_seen: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      console.warn('[Presence] Remove fallback:', err);
    }
  }

  const list = getStorageItem<OnlinePresence[]>('koryandik_presence', []);
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) {
    list[idx].page = 'Offline';
    list[idx].lastSeen = new Date().toISOString();
    setStorageItem('koryandik_presence', list);
  }
}

/**
 * Ambil daftar user yang online (last_seen dalam 2 menit terakhir).
 * Digunakan oleh Admin Dashboard untuk widget "Sekolah Online".
 */
export async function getOnlineUsers(): Promise<OnlinePresence[]> {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('online_presence')
        .select('*')
        .gte('last_seen', twoMinutesAgo)
        .order('last_seen', { ascending: false });

      if (error) throw new Error(error.message);

      if (data) {
        return (data as Array<Record<string, unknown>>).map(row => ({
          id: String(row.id),
          role: String(row.role),
          userName: String(row.user_name),
          npsn: row.npsn ? String(row.npsn) : null,
          gugusId: row.gugus_id ? String(row.gugus_id) : null,
          lastSeen: String(row.last_seen),
          page: row.page ? String(row.page) : '/dashboard',
        }));
      }
    } catch (err) {
      logger.warn('[Presence] Get online fallback', { error: err });
    }
  }

  // LocalStorage fallback
  const list = getStorageItem<OnlinePresence[]>('koryandik_presence', []);
  return list.filter(p => p.lastSeen >= twoMinutesAgo);
}

/** Ambil seluruh daftar data presence (aktif maupun offline sebelumnya) */
export async function getAllPresence(): Promise<OnlinePresence[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('online_presence')
        .select('*')
        .order('last_seen', { ascending: false });

      if (error) throw new Error(error.message);

      if (data) {
        return (data as Array<Record<string, unknown>>).map(row => ({
          id: String(row.id),
          role: String(row.role),
          userName: String(row.user_name),
          npsn: row.npsn ? String(row.npsn) : null,
          gugusId: row.gugus_id ? String(row.gugus_id) : null,
          lastSeen: String(row.last_seen),
          page: row.page ? String(row.page) : '/dashboard',
        }));
      }
    } catch (err) {
      logger.warn('[Presence] Get all presence fallback', { error: err });
    }
  }

  // LocalStorage fallback
  return getStorageItem<OnlinePresence[]>('koryandik_presence', []);
}

// ========== SCHOOL PORTAL: FACILITIES ==========

function mapFacilityRow(row: Record<string, unknown>): SchoolFacility {
  return {
    id: String(row.id),
    schoolNpsn: String(row.school_npsn),
    name: String(row.name),
    icon: (row.icon as string) || 'fa-building',
    description: (row.description as string | undefined) ?? undefined,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

export async function getSchoolFacilities(npsn: string): Promise<SchoolFacility[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('school_facilities')
        .select('*')
        .eq('school_npsn', npsn)
        .order('sort_order');
      if (!error && data) {
        return data.map((r: Record<string, unknown>) => mapFacilityRow(r));
      }
    } catch (err) {
      logger.warn('Fallback to local facilities', { error: err });
    }
  }
  return getStorageItem<SchoolFacility[]>(`koryandik_facilities_${npsn}`, []);
}

// ========== SCHOOL PORTAL: ACHIEVEMENTS ==========

function mapAchievementRow(row: Record<string, unknown>): SchoolAchievement {
  return {
    id: String(row.id),
    schoolNpsn: String(row.school_npsn),
    title: String(row.title),
    description: (row.description as string | undefined) ?? undefined,
    year: (row.year as number | undefined) ?? undefined,
    category: (row.category as AchievementCategory) || 'lainnya',
    icon: (row.icon as string) || 'fa-trophy',
  };
}

export async function getSchoolAchievements(npsn: string): Promise<SchoolAchievement[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('school_achievements')
        .select('*')
        .eq('school_npsn', npsn)
        .order('year', { ascending: false });
      if (!error && data) {
        return data.map((r: Record<string, unknown>) => mapAchievementRow(r));
      }
    } catch (err) {
      logger.warn('Fallback to local achievements', { error: err });
    }
  }
  return getStorageItem<SchoolAchievement[]>(`koryandik_achievements_${npsn}`, []);
}

// ========== SCHOOL PORTAL: GALLERY PER SCHOOL ==========

export async function getGalleryBySchool(npsn: string): Promise<GalleryItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('school_npsn', npsn)
        .order('date', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          title: String(row.title),
          description: (row.description as string) || '',
          imageUrl: String(row.image_url),
          category: (row.category as GalleryItem['category']) || 'Lainnya',
          date: String(row.date),
          createdAt: String(row.created_at),
        }));
      }
    } catch (err) {
      logger.warn('Fallback gallery by school', { error: err });
    }
  }
  return getStorageItem<GalleryItem[]>(`koryandik_gallery_${npsn}`, []);
}

// ========== SCHOOL PORTAL: FACILITY CRUD ==========

export async function addSchoolFacility(facility: Omit<SchoolFacility, 'id'>): Promise<SchoolFacility> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('school_facilities')
        .insert({
          school_npsn: facility.schoolNpsn,
          name: facility.name,
          icon: facility.icon,
          description: facility.description || null,
          sort_order: facility.sortOrder,
        })
        .select()
        .single();
      if (!error && data) return mapFacilityRow(data as Record<string, unknown>);
    } catch (err) {
      logger.warn('Fallback add facility', { error: err });
    }
  }
  const newFacility: SchoolFacility = { ...facility, id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId()) };
  const key = `koryandik_facilities_${facility.schoolNpsn}`;
  const existing = getStorageItem<SchoolFacility[]>(key, []);
  existing.push(newFacility);
  setStorageItem(key, existing);
  return newFacility;
}

export async function updateSchoolFacility(id: string, schoolNpsn: string, updates: Partial<SchoolFacility>): Promise<SchoolFacility | null> {
  if (isSupabaseConfigured()) {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      const { data, error } = await supabase
        .from('school_facilities')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return mapFacilityRow(data as Record<string, unknown>);
    } catch (err) {
      logger.warn('Fallback update facility', { error: err });
    }
  }
  const key = `koryandik_facilities_${schoolNpsn}`;
  const items = getStorageItem<SchoolFacility[]>(key, []);
  const idx = items.findIndex(f => f.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates };
  setStorageItem(key, items);
  return items[idx];
}

export async function deleteSchoolFacility(id: string, schoolNpsn: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('school_facilities').delete().eq('id', id);
      return;
    } catch (err) {
      logger.warn('Fallback delete facility', { error: err });
    }
  }
  const key = `koryandik_facilities_${schoolNpsn}`;
  const items = getStorageItem<SchoolFacility[]>(key, []);
  setStorageItem(key, items.filter(f => f.id !== id));
}

// ========== SCHOOL PORTAL: ACHIEVEMENT CRUD ==========

export async function addSchoolAchievement(achievement: Omit<SchoolAchievement, 'id'>): Promise<SchoolAchievement> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('school_achievements')
        .insert({
          school_npsn: achievement.schoolNpsn,
          title: achievement.title,
          description: achievement.description || null,
          year: achievement.year || null,
          category: achievement.category,
          icon: achievement.icon,
        })
        .select()
        .single();
      if (!error && data) return mapAchievementRow(data as Record<string, unknown>);
    } catch (err) {
      logger.warn('Fallback add achievement', { error: err });
    }
  }
  const newAch: SchoolAchievement = { ...achievement, id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId()) };
  const key = `koryandik_achievements_${achievement.schoolNpsn}`;
  const existing = getStorageItem<SchoolAchievement[]>(key, []);
  existing.push(newAch);
  setStorageItem(key, existing);
  return newAch;
}

export async function updateSchoolAchievement(id: string, schoolNpsn: string, updates: Partial<SchoolAchievement>): Promise<SchoolAchievement | null> {
  if (isSupabaseConfigured()) {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.year !== undefined) dbUpdates.year = updates.year;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      const { data, error } = await supabase
        .from('school_achievements')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return mapAchievementRow(data as Record<string, unknown>);
    } catch (err) {
      logger.warn('Fallback update achievement', { error: err });
    }
  }
  const key = `koryandik_achievements_${schoolNpsn}`;
  const items = getStorageItem<SchoolAchievement[]>(key, []);
  const idx = items.findIndex(a => a.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates };
  setStorageItem(key, items);
  return items[idx];
}

export async function deleteSchoolAchievement(id: string, schoolNpsn: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('school_achievements').delete().eq('id', id);
      return;
    } catch (err) {
      logger.warn('Fallback delete achievement', { error: err });
    }
  }
  const key = `koryandik_achievements_${schoolNpsn}`;
  const items = getStorageItem<SchoolAchievement[]>(key, []);
  setStorageItem(key, items.filter(a => a.id !== id));
}

// ========== SCHOOL PORTAL: GALLERY CRUD ==========

export async function addGalleryItemBySchool(item: Omit<GalleryItem, 'id' | 'createdAt'>, schoolNpsn: string): Promise<GalleryItem> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .insert({
          title: item.title,
          description: item.description || null,
          image_url: item.imageUrl,
          category: item.category,
          date: item.date,
          school_npsn: schoolNpsn,
        })
        .select()
        .single();
      if (!error && data) {
        return {
          id: String(data.id),
          title: String(data.title),
          description: (data.description as string) || '',
          imageUrl: String(data.image_url),
          category: (data.category as GalleryItem['category']) || 'Lainnya',
          date: String(data.date),
          createdAt: String(data.created_at),
        };
      }
    } catch (err) {
      logger.warn('Fallback add gallery item', { error: err });
    }
  }
  const newItem: GalleryItem = { 
    ...item, 
    id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId()),
    createdAt: new Date().toISOString()
  };
  const key = `koryandik_gallery_${schoolNpsn}`;
  const existing = getStorageItem<GalleryItem[]>(key, []);
  existing.push(newItem);
  setStorageItem(key, existing);
  return newItem;
}

export async function deleteGalleryItemBySchool(id: string, schoolNpsn: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('gallery').delete().eq('id', id);
      return;
    } catch (err) {
      logger.warn('Fallback delete gallery item', { error: err });
    }
  }
  const key = `koryandik_gallery_${schoolNpsn}`;
  const items = getStorageItem<GalleryItem[]>(key, []);
  setStorageItem(key, items.filter(a => a.id !== id));
}
