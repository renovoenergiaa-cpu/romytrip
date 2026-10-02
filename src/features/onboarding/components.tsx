import { forwardRef, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check } from './icons';
import { brandGradient, useTheme, type ThemeColors } from '../../theme';
import type { Option } from './options';

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/* ─── Linha de opção (escolha única = rádio, múltipla = check) ─────────────── */

export function OptionRow({
  option,
  selected,
  multi,
  onPress,
  leading,
}: {
  option: Option;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => rowStyles(colors), [colors]);
  const Icon = option.icon;

  return (
    <Pressable
      onPress={() => { tick(); onPress(); }}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [s.row, selected && s.rowSelected, pressed && s.pressed]}
    >
      {leading ?? (Icon ? (
        <View style={[s.iconTile, selected && s.iconTileSelected]}>
          <Icon size={24} weight="duotone" color={selected ? colors.primary : colors.textSecondary} />
        </View>
      ) : null)}
      <View style={s.texts}>
        <Text style={[s.label, selected && s.labelSelected]}>{option.label}</Text>
        {option.desc ? <Text style={s.desc}>{option.desc}</Text> : null}
      </View>
      <View style={[multi ? s.checkbox : s.radio, selected && s.indicatorOn]}>
        {selected && (multi ? <Check size={14} weight="bold" color={colors.onPrimary} /> : <View style={s.radioDot} />)}
      </View>
    </Pressable>
  );
}

const rowStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  rowSelected: { borderColor: c.primary, backgroundColor: c.primarySoft },
  pressed: { transform: [{ scale: 0.98 }] },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSelected: { backgroundColor: c.card },
  texts: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '600', color: c.textPrimary, letterSpacing: -0.1 },
  labelSelected: { color: c.primary },
  desc: { fontSize: 14, lineHeight: 19, color: c.textSecondary },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorOn: { borderColor: c.primary, backgroundColor: c.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.onPrimary },
});

/* ─── Chip (interesses, idiomas) ───────────────────────────────────────────── */

export function ChoiceChip({ option, selected, onPress }: { option: Option; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => chipStyles(colors), [colors]);
  const Icon = option.icon;
  return (
    <Pressable
      onPress={() => { tick(); onPress(); }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [s.chip, selected && s.chipSelected, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      {Icon && <Icon size={18} weight={selected ? 'fill' : 'duotone'} color={selected ? colors.onPrimary : colors.primary} />}
      <Text style={[s.text, selected && s.textSelected]}>{option.label}</Text>
    </Pressable>
  );
}

const chipStyles = (c: ThemeColors) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  text: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  textSelected: { color: c.onPrimary },
});

/* ─── Campo grande (uma pergunta = um campo) ───────────────────────────────── */

export const BigInput = forwardRef<TextInput, TextInputProps & { invalid?: boolean }>(
  function BigInput({ invalid, style, onFocus, onBlur, ...props }, ref) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          {
            minHeight: 60,
            borderRadius: 18,
            paddingHorizontal: 18,
            fontSize: 20,
            fontWeight: '600',
            color: colors.textPrimary,
            backgroundColor: colors.card,
            borderWidth: 1.5,
            borderColor: invalid ? colors.error : focused ? colors.primary : colors.border,
            ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
          },
          style,
        ]}
        {...props}
      />
    );
  }
);

/* ─── Prévia do perfil que vai se montando ─────────────────────────────────── */

export function Avatar({ photo, name, size }: { photo?: string; name: string; size: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <LinearGradient
      colors={brandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.42, fontWeight: '700' }}>{initial}</Text>
    </LinearGradient>
  );
}

export function ProfilePreview({ name, age, city, photo, tags }: {
  name: string;
  age: number | null;
  city: string;
  photo?: string;
  tags: string[];
}) {
  const { colors, isDark } = useTheme();
  const subtitle = [age && age >= 18 ? `${age} anos` : null, city || null].filter(Boolean).join(' · ');
  return (
    <View
      accessibilityLabel="Prévia do seu perfil"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        paddingRight: 14,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.4 : 0.07,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      <Avatar photo={photo} name={name} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 }}>
          {name.trim() || 'Seu nome'}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
          {[subtitle, ...tags].filter(Boolean).join(' · ') || 'Seu perfil vai aparecendo aqui'}
        </Text>
      </View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 }}>PRÉVIA</Text>
    </View>
  );
}
