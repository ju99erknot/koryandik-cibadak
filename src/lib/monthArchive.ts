export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export function getCurrentMonthIndex(): number {
  return new Date().getMonth();
}

export function getMonthLabel(monthIndex: number): string {
  return MONTH_NAMES_ID[monthIndex] ?? MONTH_NAMES_ID[0];
}
