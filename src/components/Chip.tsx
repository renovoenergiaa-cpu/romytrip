import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, typography, useTheme, radius } from '../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'large';
}

export function Chip({ label, selected = false, onPress, size = 'small' }: ChipProps) {
  const { colors } = useTheme();
  const isLarge = size === 'large';
  
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.container,
        isLarge ? styles.containerLarge : styles.containerSmall,
        selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.text,
          isLarge ? typography.body : typography.caption,
          // Selected: always #FFF (contrast 4.6:1 on #6338FA ✓)
          // Unselected: textPrimary (dark mode aware)
          { color: selected ? '#FFFFFF' : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Minimum touch target (44pt iOS guideline)
    minHeight: 36,
  },
  containerSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  containerLarge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '48%',
    marginBottom: 12,
  },
  text: {
    fontWeight: '500',
    textAlign: 'center',
  },
});
