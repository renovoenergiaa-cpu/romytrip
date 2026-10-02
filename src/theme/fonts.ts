import { Platform, type TextStyle } from 'react-native';

// Fonte do Romy: Plus Jakarta Sans, 4 pesos (carregados em app/_layout.tsx).
// Com fonte própria, `fontWeight` não escolhe o arquivo no Android nem no web:
// cada peso é uma família separada. Os componentes de src/components/ui/Text
// trocam o fontWeight dos estilos pela família certa automaticamente.

export const FONT_FILES = {
  400: 'PlusJakartaSans_400Regular',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
} as const;

type LoadedWeight = keyof typeof FONT_FILES;

// Pesos que o app não carrega vão para o mais próximo (500 fica mais perto do 600 no desenho)
const NEAREST: Record<string, LoadedWeight> = {
  normal: 400, '100': 400, '200': 400, '300': 400, '400': 400,
  '500': 600, '600': 600,
  bold: 700, '700': 700,
  '800': 800, '900': 800,
};

// No web, se a fonte não carregar, cai na fonte do sistema (sem isso o navegador usaria Times)
const WEB_FALLBACK = ', system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Família do arquivo para um peso (ex.: '700' → PlusJakartaSans_700Bold). */
export function fontFamilyFor(weight?: TextStyle['fontWeight'] | number | null): string {
  const file = FONT_FILES[NEAREST[String(weight ?? '400')] ?? 400];
  return Platform.OS === 'web' ? `${file}${WEB_FALLBACK}` : file;
}
