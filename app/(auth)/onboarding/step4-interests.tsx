import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

const interestsList = [
  'Trilhas', 'Praia', 'Museus', 'Balada', 'Fotografia', 'Gastronomia local',
  'Esportes', 'Passeios históricos', 'Shows', 'Eventos culturais', 'Vida noturna',
  'Café', 'Surf', 'Yoga', 'Networking', 'Mergulho', 'Escalada', 'Ciclismo',
  'Camping', 'Meditação', 'Workshops', 'Arte urbana', 'Arquitetura', 'Vinhos',
  'Cervejarias', 'Festivais', 'Teatro', 'Cinema', 'Compras', 'Spa & Wellness',
  'Voluntariado', 'Culinária', 'Dança', 'Karaokê', 'Mercados locais', 'Bares'
];

export default function Step4InterestsScreen() {
  const router = useRouter();
  const { interests, toggleArrayItem } = useOnboardingStore();

  const handleNext = () => {
    if (interests.length === 0) {
      Alert.alert('Aviso', 'Por favor, selecione pelo menos um interesse.');
      return;
    }
    router.push('/(auth)/onboarding/step5-social');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar totalSteps={5} currentStep={4} />
        
        <Text style={styles.title}>Seus Interesses</Text>
        <Text style={styles.subtitle}>O que você gosta de fazer?</Text>
        
        <View style={styles.grid}>
          {interestsList.map((item) => (
            <View key={item} style={styles.chipWrapper}>
              <Chip
                label={item}
                size="small"
                selected={interests.includes(item)}
                onPress={() => toggleArrayItem('interests', item)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>Próximo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrapper: {
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '600',
  },
});
