import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

const stylesList = [
  'Mochilão', 'Luxo', 'Econômica', 'Cultural', 'Festa', 
  'Natureza', 'Gastronômica', 'Aventura', 'Relax', 'Trabalho remoto'
];

export default function Step3TravelStyleScreen() {
  const router = useRouter();
  const { travelStyles, toggleArrayItem } = useOnboardingStore();

  const handleNext = () => {
    if (travelStyles.length === 0) {
      Alert.alert('Aviso', 'Por favor, selecione pelo menos um tipo de viagem.');
      return;
    }
    router.push('/(auth)/onboarding/step4-interests');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar totalSteps={5} currentStep={3} />
        
        <Text style={styles.title}>Tipos de Viagem</Text>
        <Text style={styles.subtitle}>Selecione seus estilos preferidos</Text>
        
        <View style={styles.grid}>
          {stylesList.map((item) => (
            <Chip
              key={item}
              label={item}
              size="large"
              selected={travelStyles.includes(item)}
              onPress={() => toggleArrayItem('travelStyles', item)}
            />
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
    justifyContent: 'space-between',
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
