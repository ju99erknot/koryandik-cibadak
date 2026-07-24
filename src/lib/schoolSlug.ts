// ============================================================
// School Slug Utility — URL-friendly slug generator for school names
// ============================================================

/**
 * Generate a URL-friendly slug from school name.
 * Examples:
 *   "SD NEGERI 01 CIBADAK"        → "sdn-01-cibadak"
 *   "SD NEGERI 5 CIBADAK"         → "sdn-5-cibadak"
 *   "SDIT AD-DAWAH"               → "sdit-ad-dawah"
 *   "SDIT AL UMMAH"               → "sdit-al-ummah"
 *   "SD ISLAM TERPADU AL-ALAWI"   → "sd-islam-terpadu-al-alawi"
 *   "SD NEGERI ANGGAYUDA"         → "sdn-anggayuda"
 *   "SEKOLAH DASAR FIRDAUS"       → "sd-firdaus"
 *   "SD NEGERI KEBON KAI GIRANG"  → "sdn-kebon-kai-girang"
 */
export function generateSchoolSlug(name: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    // Replace "sd negeri" → "sdn"
    .replace(/^sd\s+negeri\b/i, 'sdn')
    .replace(/^smp\s+negeri\b/i, 'smpn')
    // Replace "sekolah dasar" → "sd"
    .replace(/^sekolah\s+dasar\b/i, 'sd')
    // Replace multiple spaces/hyphens
    .replace(/[\s]+/g, '-')
    // Remove non-alphanumeric except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple hyphens
    .replace(/-{2,}/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  return slug;
}

/**
 * Find a school by slug from a list of schools.
 * Generates slug for each school and matches.
 */
export function findSchoolBySlug(
  schools: Array<{ name: string; npsn: string }>,
  slug: string
): { name: string; npsn: string } | undefined {
  return schools.find((s) => generateSchoolSlug(s.name) === slug);
}

/**
 * Generate a full URL path for a school profile page.
 */
export function getSchoolProfileUrl(name: string): string {
  return `/sekolah/${generateSchoolSlug(name)}`;
}
