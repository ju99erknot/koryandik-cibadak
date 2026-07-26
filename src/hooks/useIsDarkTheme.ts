import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks whether the `dark` class is present on <html>.
 *
 * Uses useSyncExternalStore + MutationObserver instead of the usual
 * useState/useEffect pair so the initial value is available on the first client
 * render (no cascading re-render, no flash of the wrong theme).
 */
export function useIsDarkTheme(defaultValue = true): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const observer = new MutationObserver(onStoreChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const getSnapshot = useCallback(
    () => document.documentElement.classList.contains('dark'),
    []
  );

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
