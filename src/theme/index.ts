import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';

export const lightColors = {
  // Brand Colors
  primary: '#6338FA',
  primaryLight: '#8A6AFB',
  primaryDark: '#4A25CD',
  primarySoft: 'rgba(99, 56, 250, 0.10)', // fundo de chips/estados selecionados
  accent: '#D936B4',                      // fim do gradiente premium
  onPrimary: '#FFFFFF',                   // texto/ícone sobre primary

  // Neutral Colors (Backgrounds and Surfaces)
  background: '#FAFAFA',
  surface: '#F2F2F5', // inputs, chips, áreas secundárias
  inputBackground: '#F2F2F5',
  card: '#FFFFFF',
  overlay: 'rgba(10, 10, 12, 0.55)',

  // Text Colors (contraste AA sobre background/card)
  textPrimary: '#17171A',
  textSecondary: '#5C5C66', // 6.6:1
  textMuted: '#71717A',     // 4.8:1 — mínimo para placeholder/legenda

  // Status Colors
  success: '#15803D',
  error: '#DC2626',
  warning: '#B45309',
  info: '#0369A1',
  errorSoft: 'rgba(220, 38, 38, 0.08)',
  successSoft: 'rgba(21, 128, 61, 0.10)',

  // Borders and Dividers
  border: '#E7E7EC',
};

export const darkColors = {
  // Brand Colors
  primary: '#7C5CFF', // um pouco mais claro: #6338FA some sobre fundo quase preto
  primaryLight: '#9C84FF',
  primaryDark: '#6338FA',
  primarySoft: 'rgba(124, 92, 255, 0.16)',
  accent: '#E04FC0',
  onPrimary: '#FFFFFF',

  // Neutral Colors
  background: '#0A0A0A',
  surface: '#1A1A1D',
  inputBackground: '#1A1A1D',
  card: '#141416',
  overlay: 'rgba(0, 0, 0, 0.65)',

  // Text Colors
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA', // 7.6:1
  textMuted: '#8A8A93',     // 5.5:1

  // Status Colors
  success: '#22C55E',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#38BDF8',
  errorSoft: 'rgba(248, 113, 113, 0.12)',
  successSoft: 'rgba(34, 197, 94, 0.12)',

  // Borders and Dividers
  border: '#26262B',
};

export type ThemeColors = typeof lightColors;

/** Gradiente premium da marca (#6338FA → #D936B4) */
export const brandGradient = ['#6338FA', '#D936B4'] as const;

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

/** Escala tipográfica de produto (razão ~1.2). Use estas em vez de fontSize solto. */
export const typography = {
  // lineHeight fica de fora dos estilos antigos: muitas telas sobrescrevem só o fontSize.
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  title: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.1 },
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
