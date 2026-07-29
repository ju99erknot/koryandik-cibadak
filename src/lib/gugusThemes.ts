export interface GugusTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  primaryGlow: string;
  accentGlow: string;
}

export const GUGUS_THEMES: Record<string, GugusTheme> = {
  'I': {
    id: 'I',
    name: 'Gugus I - Cibadak',
    primary: '#3b82f6',
    accent: '#60a5fa',
    primaryGlow: 'rgba(59, 130, 246, 0.15)',
    accentGlow: 'rgba(96, 165, 250, 0.15)'
  },
  'II': {
    id: 'II',
    name: 'Gugus II - Karangtengah',
    primary: '#10b981',
    accent: '#34d399',
    primaryGlow: 'rgba(16, 185, 129, 0.15)',
    accentGlow: 'rgba(52, 211, 153, 0.15)'
  },
  'III': {
    id: 'III',
    name: 'Gugus III - Pamuruyan',
    primary: '#f59e0b',
    accent: '#fbbf24',
    primaryGlow: 'rgba(245, 158, 11, 0.15)',
    accentGlow: 'rgba(251, 191, 36, 0.15)'
  },
  'IV': {
    id: 'IV',
    name: 'Gugus IV - Batununggal',
    primary: '#8b5cf6',
    accent: '#a78bfa',
    primaryGlow: 'rgba(139, 92, 246, 0.15)',
    accentGlow: 'rgba(167, 139, 250, 0.15)'
  },
  'V': {
    id: 'V',
    name: 'Gugus V - Pamuruyan Swasta',
    primary: '#ec4899',
    accent: '#f472b6',
    primaryGlow: 'rgba(236, 72, 153, 0.15)',
    accentGlow: 'rgba(244, 114, 182, 0.15)'
  },
  'default': {
    id: 'default',
    name: 'Default Theme',
    primary: '#3b82f6',
    accent: '#60a5fa',
    primaryGlow: 'rgba(59, 130, 246, 0.15)',
    accentGlow: 'rgba(96, 165, 250, 0.15)'
  }
};

export function getGugusTheme(gugusId?: string): GugusTheme {
  return GUGUS_THEMES[gugusId || 'default'] || GUGUS_THEMES['default'];
}

/** Primary brand color for a gugus — single source of truth for charts, badges, maps */
export function getGugusColor(gugusId: string): string {
  return getGugusTheme(gugusId).primary;
}

export const GUGUS_IDS = ['I', 'II', 'III', 'IV', 'V'] as const;
export type GugusId = (typeof GUGUS_IDS)[number];

export function applyGugusTheme(theme: GugusTheme) {
  const root = document.documentElement;
  
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--primary-glow', theme.primaryGlow);
  root.style.setProperty('--accent-glow', theme.accentGlow);
}

export function saveGugusThemePreference(gugusId: string, themeId: string) {
  localStorage.setItem(`koryandik_gugus_theme_${gugusId}`, themeId);
}

export function getGugusThemePreference(gugusId: string): string {
  return localStorage.getItem(`koryandik_gugus_theme_${gugusId}`) || gugusId;
}
