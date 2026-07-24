import { useEffect, useCallback, useRef } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const shortcut = shortcutsRef.current.find(s => {
      const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
      
      // Adaptasi pintar untuk macOS: cmdKey dipetakan ke ctrl jika s.ctrl aktif
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const ctrlMatch = s.ctrl ? isCmdOrCtrl : !e.ctrlKey;
      
      // Jika shortcut secara eksplisit butuh meta key (Command di mac)
      const metaMatch = s.meta ? e.metaKey : (s.ctrl ? true : !e.metaKey);
      
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = s.alt ? e.altKey : !e.altKey;
      
      return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
    });

    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Common shortcuts preset
export const commonShortcuts = (actions: {
  search?: () => void;
  home?: () => void;
  refresh?: () => void;
  theme?: () => void;
  logout?: () => void;
}): Shortcut[] => {
  const shortcuts: Shortcut[] = [];

  if (actions.search) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      action: actions.search,
      description: 'Search / Command Palette'
    });
  }

  if (actions.home) {
    shortcuts.push({
      key: 'h',
      ctrl: true,
      action: actions.home,
      description: 'Go to Home'
    });
  }

  if (actions.refresh) {
    shortcuts.push({
      key: 'r',
      ctrl: true,
      action: actions.refresh,
      description: 'Refresh'
    });
  }

  if (actions.theme) {
    shortcuts.push({
      key: 'd',
      ctrl: true,
      action: actions.theme,
      description: 'Toggle Dark Mode'
    });
  }

  if (actions.logout) {
    shortcuts.push({
      key: 'q',
      ctrl: true,
      action: actions.logout,
      description: 'Logout'
    });
  }

  return shortcuts;
};

