import { useState, useEffect } from 'react';

/**
 * Hook to check if code is running on the client side.
 * Returns true after component mounts on the client, false during SSR.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Hook to safely access localStorage with SSR support.
 * Returns null during SSR, otherwise returns the stored value or fallback.
 */
export function useLocalStorage<T>(key: string, fallback: T): T {
  const isClient = useIsClient();
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    if (!isClient) return;
    
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item) as T);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key, isClient]);

  return value;
}
