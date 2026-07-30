import { useState, useEffect } from 'react';

/**
 * Hook to check if code is running on the client side.
 * Returns true after component mounts on the client, false during SSR & initial hydration.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Compute a client-only value safely after mounting.
 * Guaranteed to match SSR during hydration to prevent React Error #418.
 */
export function useClientOnce<T>(factory: () => T, serverFallback: T): T {
  const [value, setValue] = useState<T>(serverFallback);

  useEffect(() => {
    try {
      setValue(factory());
    } catch (err) {
      console.error('Error computing client value:', err);
    }
  }, []);

  return value;
}

/**
 * Hook to safely access localStorage with SSR support and zero hydration mismatch.
 * Returns the fallback during SSR & initial hydration, then syncs with localStorage after mount.
 */
export function useLocalStorage<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const readStorage = () => {
      try {
        const item = localStorage.getItem(key);
        if (item !== null) {
          setValue(JSON.parse(item) as T);
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
      }
    };

    readStorage();

    const handler = (e: StorageEvent) => {
      if (e.key === null || e.key === key) {
        readStorage();
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  return value;
}
