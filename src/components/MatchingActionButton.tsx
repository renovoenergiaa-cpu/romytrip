import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Star, Handshake } from 'lucide-react-native';
import { useTheme, motion } from '../theme';

export type MatchingActionType = 'reject' | 'favorite' | 'connect';

export interface MatchingActionButtonProps {
  type: MatchingActionType;
  size?: number;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  accessibilityLabel: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MatchingActionButton({
  type,
  size,
  onPress,
  disabled = false,
  active = false,
  accessibilityLabel,
}: MatchingActionButtonProps) {
  const { colors, isDark } = useTheme();

  // Default sizes matching the original layout geometry
  const defaultSize = type === 'connect' ? 70 : type === 'reject' ? 60 : 50;
  const buttonSize = size || defaultSize;
  const iconSize = type === 'connect' ? 32 : type === 'reject' ? 28 : 24;

  // Shared animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const starScale = useSharedValue(1);
  const starRotate = useSharedValue(0); // in degrees

  const [isPressed, setIsPressed] = useState(false);

  // Star active trigger: scale 0.8 -> 1.08 -> 1, rotation -5° -> 3° -> 0° (~260ms)
  useEffect(() => {
    if (type === 'favorite' && active) {
      starScale.value = withSequence(
        withTiming(0.8, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(1.08, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(1, motion.springs.micro)
      );

      starRotate.value = withSequence(
        withTiming(-5, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(3, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(0, motion.springs.micro)
      );
    }
  }, [active, type]);

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);

    // Physical pressed feel: scale 0.94, translateY 1px
    scale.value = withSpring(motion.button.pressedScale, motion.springs.button);
    translateY.value = withSpring(motion.button.pressedTranslateY, motion.springs.button);

    // Light haptic on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    if (disabled) return;
    setIsPressed(false);

    // Release: short, controlled spring
    scale.value = withSpring(1, motion.springs.button);
    translateY.value = withSpring(0, motion.springs.button);
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
    };
  });

  const animatedStarIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: starScale.value },
        { rotate: `${starRotate.value}deg` },
      ],
    };
  });

  // Calculate dynamic colors based on type, idle vs pressed/active state
  const isStateActive = active || isPressed;

  let backgroundColor = colors.surface;
  let borderColor = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)';
  let iconColor = colors.textSecondary;
  let iconFill = 'transparent';
  let shadowColor = '#000000';
  let shadowOpacity = isPressed ? 0.03 : isDark ? 0.25 : 0.08;
  let shadowRadius = isPressed ? 2 : 6;
  let elevation = isPressed ? 1 : 3;

  if (type === 'reject') {
    if (isStateActive) {
      backgroundColor = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2';
      borderColor = 'rgba(239, 68, 68, 0.35)';
      iconColor = '#EF4444';
    } else {
      // Idle: neutral surface, very subtle neutral border
      backgroundColor = colors.surface;
      borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
      iconColor = isDark ? '#D4D4D8' : '#71717A';
    }
  } else if (type === 'favorite') {
    if (isStateActive) {
      backgroundColor = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FEF3C7';
      borderColor = 'rgba(245, 158, 11, 0.35)';
      iconColor = '#F59E0B';
      iconFill = '#F59E0B';
    } else {
      // Idle: neutral outline
      backgroundColor = colors.surface;
      borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
      iconColor = isDark ? '#D4D4D8' : '#71717A';
      iconFill = 'transparent';
    }
  } else if (type === 'connect') {
    if (isStateActive) {
      // Romy purple active / pressed
      backgroundColor = colors.primary;
      borderColor = colors.primaryDark || colors.primary;
      iconColor = '#FFFFFF';
      iconFill = 'transparent';
      shadowColor = colors.primary;
      shadowOpacity = 0.35;
      shadowRadius = 10;
      elevation = 6;
    } else {
      // Idle: neutral surface with subtle brand purple border
      backgroundColor = colors.surface;
      borderColor = isDark ? 'rgba(99, 56, 250, 0.32)' : 'rgba(99, 56, 250, 0.22)';
      iconColor = colors.primary;
      iconFill = 'transparent';
      shadowColor = isDark ? '#000000' : 'rgba(99, 56, 250, 0.2)';
      shadowOpacity = isDark ? 0.25 : 0.12;
      shadowRadius = 7;
      elevation = 4;
    }
  }

  if (disabled) {
    opacity: 0.45;
  }

  const renderIcon = () => {
    switch (type) {
      case 'reject':
        return <X size={iconSize} color={iconColor} strokeWidth={2.4} />;
      case 'favorite':
        return (
          <Animated.View style={animatedStarIconStyle}>
            <Star size={iconSize} color={iconColor} fill={iconFill} strokeWidth={2.2} />
          </Animated.View>
        );
      case 'connect':
        return <Handshake size={iconSize} color={iconColor} strokeWidth={2.2} />;
      default:
        return null;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.baseButton,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor,
          borderColor,
          borderWidth: isPressed ? 1.5 : 1,
          shadowColor,
          shadowOpacity,
          shadowRadius,
          elevation,
          opacity: disabled ? 0.45 : 1,
        },
        animatedButtonStyle,
      ]}
    >
      {renderIcon()}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
  },
});
