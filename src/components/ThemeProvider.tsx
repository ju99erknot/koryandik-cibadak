'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { initTheme, getStoredTheme, applyTheme, type Theme } from '@/lib/theme';
import { getAppSettings } from '@/lib/db';

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('koryandik_theme');if(!t){var s=localStorage.getItem('koryandik_app_settings');if(s){try{var p=JSON.parse(s);t=p?.default_theme?.value?.mode;}catch(e){t=null;}}}t=t==='light'||t==='dark'?t:'dark';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`;

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    initTheme();

    const applyDefaultThemeFromSettings = async () => {
      try {
        if (typeof window === 'undefined') return;
        const storedTheme = localStorage.getItem('koryandik_theme');
        if (storedTheme === 'light' || storedTheme === 'dark') return;

        const settings = await getAppSettings();
        const defaultTheme = settings?.default_theme?.value as { mode?: string } | undefined;
        const preferredTheme = defaultTheme?.mode === 'light' || defaultTheme?.mode === 'dark'
          ? defaultTheme.mode
          : null;

        if (preferredTheme) {
          applyTheme(preferredTheme);
          setTheme(preferredTheme);
        }
      } catch {
        // ignore failures and keep initial theme
      }
    };

    applyDefaultThemeFromSettings();

    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail) setTheme(detail);
      else setTheme(getStoredTheme());
    };

    window.addEventListener('koryandik-theme-change', handleThemeChange);
    return () => window.removeEventListener('koryandik-theme-change', handleThemeChange);
  }, []);

  return (
    <>
      <Toaster
        position="top-center"
        theme={theme}
        toastOptions={{
          style: {
            background: 'var(--card-glass)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            padding: '14px 18px',
            boxShadow: 'var(--shadow-md)',
            gap: '12px',
          },
          classNames: {
            title: 'koryandik-toast-title',
            description: 'koryandik-toast-desc',
            actionButton: 'koryandik-toast-action',
            cancelButton: 'koryandik-toast-cancel',
            success: 'koryandik-toast-success',
            error: 'koryandik-toast-error',
            warning: 'koryandik-toast-warning',
            info: 'koryandik-toast-info',
          },
        }}
      />
      {children}
    </>
  );
}
