import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface ProgressBarProps {
  totalSteps: number;
  currentStep: number;
}

export function ProgressBar({ totalSteps, currentStep }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index + 1 <= currentStep;
        const isCurrent = index + 1 === currentStep;
        return (
          <View
            key={index}
            style={[
              styles.segment,
              isCompleted && styles.segmentCompleted,
              isCurrent && styles.segmentCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 24,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  segmentCompleted: {
    backgroundColor: colors.primary,
  },
  segmentCurrent: {
    backgroundColor: colors.primary,
  },
});

