import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, typography, radius } from '../theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  /** Optional right-side element (icon button, text, etc.) */
  right?: React.ReactNode;
  /** When true the header has no bottom border (e.g. over a dark background) */
  transparent?: boolean;
}

/**
 * Standardised screen header used by settings, profile, chat, connections, etc.
 * Handles safe area, Android status bar offset, and dark mode automatically.
 */
export function ScreenHeader({ title, onBack, right, transparent = false }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop =
    Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 0) + spacing.sm
      : insets.top + spacing.xs;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          backgroundColor: transparent ? 'transparent' : colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* Left — back button or spacer */}
      {onBack ? (
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Right — custom node or spacer */}
      <View style={styles.iconBtn}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});
