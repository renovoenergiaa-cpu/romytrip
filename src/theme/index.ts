import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';

export const lightColors = {
  // Brand Colors
  primary: '#6338FA',
  primaryLight: '#8A6AFB',
  primaryDark: '#4A25CD',
  
  // Neutral Colors (Backgrounds and Surfaces)
  background: '#FFFFFF',
  surface: '#F3F4F6', // Equivalent to old inputBackground or light surface
  inputBackground: '#F3F4F6',
  card: '#FFFFFF',
  
  // Text Colors
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  
  // Status Colors
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  
  // Borders and Dividers
  border: '#EAEAEA',
};

export const darkColors = {
  // Brand Colors
  primary: '#6338FA',
  primaryLight: '#8A6AFB',
  primaryDark: '#4A25CD',
  
  // Neutral Colors
  background: '#0A0A0A',
  surface: '#1A1A1A',
  inputBackground: '#1A1A1A',
  card: '#1E1E1E',
  
  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#666666',
  
  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Borders and Dividers
  border: '#2A2A2A',
};

// Fallback for files not updated to use the hook yet (helps avoid crashes)
export const colors = lightColors; 

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

// ─── Design Tokens (New) ───────────────────────────────────────────────────

/** Unified border radius scale — use these instead of magic numbers */
export const radius = {
  xs: 6,
  sm: 10,
  md: 12,   // inputs, cards
  lg: 16,   // chips, badges, filter pills
  xl: 20,   // FAB, rounded buttons
  xxl: 24,  // bottom sheets, modals
  full: 999, // pills, avatars
};

/** Shadow presets — consistent elevation across platforms */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }),
};

/** Minimum touch target size per platform guidelines (44pt iOS / 48dp Android) */
export const touchTarget = {
  minSize: 44,
};

export function useTheme() {
  const { themeMode } = useThemeStore();
  const systemColorScheme = useColorScheme();
  
  const isDark = 
    themeMode === 'dark' || 
    (themeMode === 'system' && systemColorScheme === 'dark');
    
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    themeMode,
  };
}

export * from './motion';
