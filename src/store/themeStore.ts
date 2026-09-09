import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'system', // Defaults to system as requested by the user
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'romy-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
