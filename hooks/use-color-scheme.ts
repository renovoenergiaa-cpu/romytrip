import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '../src/store/themeStore';

export function useColorScheme(): 'light' | 'dark' {
  const { themeMode } = useThemeStore();
  const systemColorScheme = useRNColorScheme();

  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  return systemColorScheme === 'dark' ? 'dark' : 'light';
}
