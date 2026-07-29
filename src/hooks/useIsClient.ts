import { useCallback, useRef, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hook to check if code is running on the client side.
 * Returns true after component mounts on the client, false during SSR.
 *
 * Implemented with useSyncExternalStore so the client/server split is resolved
 * during hydration instead of via a setState-in-effect cascade render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Compute a client-only value exactly once per component instance.
 *
 * Useful for non-deterministic values (Date.now(), crypto ids, Math.random())
 * that must not run during render — calling them in the render pass is impure
 * and causes hydration mismatches, while a setState-in-effect would force an
 * extra cascading render.
 */
export function useClientOnce<T>(factory: () => T, serverFallback: T): T {
  const box = useRef<{ value: T } | null>(null);
  const factoryRef = useRef(factory);

  const getSnapshot = useCallback((): T => {
    if (box.current === null) box.current = { value: factoryRef.current() };
    return box.current.value;
  }, []);

  const getServerSnapshot = useCallback(() => serverFallback, [serverFallback]);

  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to safely access localStorage with SSR support.
 * Returns the fallback during SSR, otherwise the stored value or fallback.
 *
 * Reads are done through useSyncExternalStore and cached so the snapshot stays
 * referentially stable between renders (required to avoid infinite loops).
 */
export function useLocalStorage<T>(key: string, fallback: T): T {
  const cache = useRef<{ raw: string | null; parsed: T }>({
    raw: null,
    parsed: fallback,
  });

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handler = (e: StorageEvent) => {
      if (e.key === null || e.key === key) onStoreChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  const getSnapshot = useCallback((): T => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return fallback;
    }

    // Return the memoised value when the underlying string has not changed,
    // otherwise JSON.parse would hand back a new object on every render.
    if (raw === cache.current.raw) return cache.current.parsed;

    let parsed = fallback;
    if (raw !== null) {
      try {
        parsed = JSON.parse(raw) as T;
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
      }
    }

    cache.current = { raw, parsed };
    return parsed;
  }, [key, fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
