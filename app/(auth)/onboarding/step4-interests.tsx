import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, Check } from 'lucide-react-native';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

const interestsList = [
  '🏖️ Praia & Mar', '🥾 Trilhas & Natureza', '🏛️ Museus & História', '🎉 Baladas & Festas',
  '📸 Fotografia', '🍷 Vinhos & Bistrôs', '☕ Cafés Charmosos', '🏄 Surf & Esportes Aquáticos',
  '🧘 Yoga & Bem-estar', '🧗 Escalada & Aventura', '🎨 Arte Urbana & Galerias', '🎶 Música ao Vivo & Shows',
  '⛺ Camping & Fogueira', '🍜 Comidas de Rua', '🚲 Ciclismo & Passeios', '🍻 Cervejarias Artesanais',
  '🛍️ Feirinhas & Compras', '🌅 Pôr do Sol', '🤿 Mergulho', '🤝 Networking Nômade'
];

export default function Step4InterestsScreen() {
  const router = useRouter();
  const { interests, toggleArrayItem } = useOnboardingStore();

  const handleNext = () => {
    if (!interests || interests.length < 2) {
      Alert.alert('Selecione Interesses', 'Escolha pelo menos 2 interesses para conectar com quem curte os mesmos rolês que você.');
      return;
    }
    router.push('/(auth)/onboarding/step5-social');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>Passo 4 de 6</Text>
        <View style={{ width: 32 }} />
      </View>

      <ProgressBar totalSteps={6} currentStep={4} />
      
      <View style={styles.header}>
        <Text style={styles.title}>O que você ama viver na estrada?</Text>
        <Text style={styles.subtitle}>
          Selecione suas atividades e paixões favoritas para conectar por afinidade real (escolha pelo menos 2).
        </Text>
      </View>

      <View style={styles.grid}>
        {interestsList.map((item) => {
          const selected = interests.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleArrayItem('interests', item)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {item}
              </Text>
              {selected && (
                <View style={styles.checkIcon}>
                  <Check size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          Continuar para Orçamento ({interests.length} selecionado{interests.length === 1 ? '' : 's'}) →
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadge: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
});
