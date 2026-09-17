import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Compass, Check } from 'lucide-react-native';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

const stylesList = [
  { id: 'Mochilão & Roots', desc: 'Hostels, economia e aventura autêntica' },
  { id: 'Conforto & Relax', desc: 'Pousadas charmosas, praia e calmaria' },
  { id: 'Luxo & Exclusivo', desc: 'Experiências VIP, alta gastronomia e sofisticação' },
  { id: 'Natureza & Trilhas', desc: 'Montanhas, cachoeiras, ecoturismo e camping' },
  { id: 'Festas & Vida Noturna', desc: 'Baladas, festivais, bares e curtição até tarde' },
  { id: 'Cultural & Histórico', desc: 'Museus, passeios guiados, arquitetura e arte' },
  { id: 'Gastronômica', desc: 'Comidas de rua, vinícolas e bistrôs locais' },
  { id: 'Nômade Digital', desc: 'Trabalho remoto, cafés e boa internet na estrada' },
  { id: 'Mulheres na Estrada', desc: 'Conexões e parcerias de viagem femininas' },
];

export default function Step3TravelStyleScreen() {
  const router = useRouter();
  const { travelStyles, toggleArrayItem } = useOnboardingStore();

  const handleNext = () => {
    if (travelStyles.length === 0) {
      Alert.alert('Selecione seu Estilo', 'Escolha pelo menos um estilo de viagem para encontrarmos pessoas com a sua mesma vibe.');
      return;
    }
    router.push('/(auth)/onboarding/step4-interests');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>Passo 3 de 6</Text>
        <View style={{ width: 32 }} />
      </View>

      <ProgressBar totalSteps={6} currentStep={3} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Qual é o seu ritmo de viagem?</Text>
        <Text style={styles.subtitle}>
          Selecione os estilos que combinam com seu jeito de viver a estrada (escolha quantos quiser).
        </Text>
      </View>

      <View style={styles.list}>
        {stylesList.map((item) => {
          const selected = travelStyles.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => toggleArrayItem('travelStyles', item.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                  {item.id}
                </Text>
                <Text style={[styles.cardDesc, selected && styles.cardDescSelected]}>
                  {item.desc}
                </Text>
              </View>
              <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
                {selected && <Check size={14} color="#FFF" />}
              </View>
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
          Continuar para Interesses ({travelStyles.length} selecionado{travelStyles.length === 1 ? '' : 's'}) →
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
  list: {
    gap: 10,
    marginBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10', // 10% primary tint
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: colors.primary,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardDescSelected: {
    color: colors.textSecondary,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
