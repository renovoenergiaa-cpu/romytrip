import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '../src/store/themeStore';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { themeMode } = useThemeStore();
  const systemColorScheme = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';

  if (hasHydrated && systemColorScheme) {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }

  return 'light';
}
