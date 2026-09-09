import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme, radius } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLine({ width = '100%', height = 16, borderRadius = radius.xs, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const baseColor = isDark ? '#2A2A2A' : '#E5E7EB';

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [1, 0.4]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return <SkeletonLine width={size} height={size} borderRadius={size / 2} />;
}

/** Pre-built skeleton for a chat row (avatar + two text lines) */
export function SkeletonChatRow() {
  return (
    <View style={skeletonStyles.chatRow}>
      <SkeletonCircle size={56} />
      <View style={skeletonStyles.chatLines}>
        <SkeletonLine width="55%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonLine width="80%" height={13} />
      </View>
    </View>
  );
}

/** Pre-built skeleton for a profile header */
export function SkeletonProfileHeader() {
  return (
    <View style={skeletonStyles.profileRow}>
      <SkeletonCircle size={96} />
      <View style={skeletonStyles.profileLines}>
        <SkeletonLine width="60%" height={20} style={{ marginBottom: 10 }} />
        <SkeletonLine width="40%" height={14} style={{ marginBottom: 10 }} />
        <SkeletonLine width={100} height={32} borderRadius={radius.xl} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    gap: 14,
  },
  chatLines: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
  },
  profileLines: {
    flex: 1,
  },
});
