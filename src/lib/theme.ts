export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'koryandik_theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored as Theme;
  }

  try {
    const appSettings = localStorage.getItem('koryandik_app_settings');
    if (appSettings) {
      const parsed = JSON.parse(appSettings) as Record<string, { value: unknown }>;
      const defaultTheme = parsed?.default_theme?.value as { mode?: string } | undefined;
      if (defaultTheme?.mode === 'dark' || defaultTheme?.mode === 'light') {
        return defaultTheme.mode as Theme;
      }
    }
  } catch {
    // ignore parse errors and fall back to dark
  }

  return 'dark';
}

export function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  html.classList.remove('light', 'dark');
  html.classList.add(theme);
  html.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('koryandik-theme-change', { detail: theme }));
}

export function initTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

export function toggleThemeWithTransition(e?: React.MouseEvent | MouseEvent) {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  const nextTheme: Theme = isDark ? 'light' : 'dark';

  const doApply = () => applyTheme(nextTheme);

  if (!document.startViewTransition || !e) {
    doApply();
    return;
  }

  const x = 'clientX' in e ? e.clientX : window.innerWidth / 2;
  const y = 'clientY' in e ? e.clientY : window.innerHeight / 2;

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(doApply);

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    document.documentElement.animate(
      {
        clipPath: isDark ? [...clipPath].reverse() : clipPath,
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        pseudoElement: isDark
          ? '::view-transition-old(root)'
          : '::view-transition-new(root)',
      }
    );
  });
}
