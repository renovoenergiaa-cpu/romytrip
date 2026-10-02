import { useMemo, useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import { spacing, typography, useTheme, type ThemeColors } from '../theme';
import { LucideIcon } from 'lucide-react-native';

interface CustomInputProps extends TextInputProps {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export function CustomInput({ label, icon: Icon, error, style, onFocus, onBlur, ...props }: CustomInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, focused && styles.inputFocused, error && styles.inputError]}>
        {Icon && <Icon size={20} color={focused ? colors.primary : colors.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 52,
    // Borda transparente reservada: o foco não desloca o layout
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  inputError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  errorText: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
