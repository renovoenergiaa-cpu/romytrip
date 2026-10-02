import { createContext, forwardRef, useContext } from 'react';
import {
  Platform, StyleSheet, Text as RNText, TextInput as RNTextInput,
  type StyleProp, type TextInputProps, type TextProps, type TextStyle,
} from 'react-native';
import { fontFamilyFor } from '../../theme/fonts';

// Texto do app inteiro na fonte do Romy. Use estes no lugar dos do react-native:
// o `fontWeight` dos estilos vira o arquivo do peso (ver theme/fonts.ts).
// Quem já define `fontFamily` (ícones, monospace) fica como está.

/** Família do texto em volta: um <Text> dentro de outro herda o peso, como no react-native. */
const InheritedFamily = createContext<string | null>(null);

function resolve(style: StyleProp<TextStyle>, inherited: string | null) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (flat.fontFamily) return { flat, family: flat.fontFamily, style };
  const { fontWeight, ...rest } = flat;
  const family = fontWeight != null || !inherited ? fontFamilyFor(fontWeight) : inherited;
  return { flat, family, style: { ...rest, fontFamily: family } as TextStyle };
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  const inherited = useContext(InheritedFamily);
  const resolved = resolve(style, inherited);
  return (
    <InheritedFamily.Provider value={resolved.family}>
      <RNText ref={ref} {...props} style={resolved.style} />
    </InheritedFamily.Provider>
  );
});
// Mesmo nome como tipo, para `useRef<Text>` continuar funcionando como no react-native
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Text = RNText;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const resolved = resolve(style, null);
  // No iPhone, campo com fonte menor que 16 px faz o Safari dar zoom ao tocar
  const webStyle = Platform.OS === 'web' ? { fontSize: Math.max(16, resolved.flat.fontSize ?? 16) } : null;
  return <RNTextInput ref={ref} {...props} style={[resolved.style, webStyle]} />;
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TextInput = RNTextInput;
