import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ArrowLeft } from 'lucide-react-native';
import { useTheme, spacing, typography, radius } from '../../src/theme';

export default function CreateScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Automatically redirect to Feed tab and trigger post creation modal
    router.replace('/(tabs)');
    const timer = setTimeout(() => {
      DeviceEventEmitter.emit('openCreatePost');
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>Abrindo criação de post...</Text>
      
      <TouchableOpacity 
        style={[styles.manualBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          router.replace('/(tabs)');
          DeviceEventEmitter.emit('openCreatePost');
        }}
      >
        <Plus size={18} color="#FFF" />
        <Text style={styles.manualBtnText}>Criar Agora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  text: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  manualBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
