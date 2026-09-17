import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckSquare, Square, DollarSign, Users } from 'lucide-react-native';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

const budgetOptions = [
  { val: '$', label: 'Econômico', desc: 'Hostels, comida local e transporte público' },
  { val: '$$', label: 'Moderado', desc: 'Pousadas charmosas e bistrôs' },
  { val: '$$$', label: 'Conforto', desc: 'Bons hotéis e passeios selecionados' },
  { val: '$$$$', label: 'Alto Padrão', desc: 'Experiências VIP e exclusividade' },
];

export default function Step5SocialScreen() {
  const router = useRouter();
  const state = useOnboardingStore();

  const handleNext = () => {
    if (!state.budget) {
      Alert.alert('Orçamento Médio', 'Selecione uma faixa de orçamento diário para garantir compatibilidade com seus companheiros de viagem.');
      return;
    }
    router.push('/(auth)/onboarding/step6-connections');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>Passo 5 de 6</Text>
        <View style={{ width: 32 }} />
      </View>

      <ProgressBar totalSteps={6} currentStep={5} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Sintonia Social & Orçamento</Text>
        <Text style={styles.subtitle}>
          Alinhe expectativas para evitar qualquer desconforto financeiro ou de ritmo durante a viagem.
        </Text>
      </View>

      {/* Orçamento Diário */}
      <Text style={styles.label}>Orçamento Médio Diário Esperado</Text>
      <View style={styles.budgetList}>
        {budgetOptions.map((opt) => {
          const selected = state.budget === opt.val;
          return (
            <TouchableOpacity
              key={opt.val}
              style={[styles.budgetCard, selected && styles.budgetCardSelected]}
              onPress={() => state.updateField('budget', opt.val)}
              activeOpacity={0.8}
            >
              <View style={[styles.budgetBadge, selected && styles.budgetBadgeSelected]}>
                <Text style={[styles.budgetText, selected && styles.budgetTextSelected]}>{opt.val}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.budgetTitle, selected && styles.budgetTitleSelected]}>{opt.label}</Text>
                <Text style={styles.budgetDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dinâmica Social */}
      <Text style={[styles.label, { marginTop: spacing.md }]}>Dinâmica Social & Custos</Text>
      <View style={styles.optionsList}>
        <TouchableOpacity 
          style={[styles.checkboxRow, state.costSplit && styles.checkboxRowSelected]} 
          activeOpacity={0.7}
          onPress={() => state.updateField('costSplit', !state.costSplit)}
        >
          {state.costSplit ? <CheckSquare size={20} color={colors.primary} /> : <Square size={20} color={colors.textMuted} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxText}>Aberto(a) a dividir custos</Text>
            <Text style={styles.checkboxSub}>Compartilhar despesas de hospedagem (Airbnb), aluguel de carro ou combustível</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.checkboxRow, state.group && styles.checkboxRowSelected]} 
          activeOpacity={0.7}
          onPress={() => {
            const nextValue = !state.group;
            state.updateField('group', nextValue);
            if (nextValue) state.updateField('onePerson', false);
          }}
        >
          {state.group ? <CheckSquare size={20} color={colors.primary} /> : <Square size={20} color={colors.textMuted} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxText}>Aberto(a) a formar grupo de viagem</Text>
            <Text style={styles.checkboxSub}>Viajar com pequenos grupos de 3 a 5 viajantes</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.checkboxRow, state.onePerson && styles.checkboxRowSelected]} 
          activeOpacity={0.7}
          onPress={() => {
            const nextValue = !state.onePerson;
            state.updateField('onePerson', nextValue);
            if (nextValue) state.updateField('group', false);
          }}
        >
          {state.onePerson ? <CheckSquare size={20} color={colors.primary} /> : <Square size={20} color={colors.textMuted} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxText}>Prefiro conexões individuais (dupla)</Text>
            <Text style={styles.checkboxSub}>Fazer passeios ou viagens com uma companhia por vez</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.checkboxRow, state.invitations && styles.checkboxRowSelected]} 
          activeOpacity={0.7}
          onPress={() => state.updateField('invitations', !state.invitations)}
        >
          {state.invitations ? <CheckSquare size={20} color={colors.primary} /> : <Square size={20} color={colors.textMuted} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxText}>Aberto(a) a convites de rolês locais</Text>
            <Text style={styles.checkboxSub}>Receber convites para jantar, café ou passeios de última hora</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Continuar para Conexões & Segurança →</Text>
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
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
  },
  budgetList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 12,
  },
  budgetCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  budgetBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetBadgeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  budgetTextSelected: {
    color: '#FFF',
  },
  budgetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  budgetTitleSelected: {
    color: colors.primary,
  },
  budgetDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  optionsList: {
    gap: 10,
    marginBottom: spacing.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxRowSelected: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  checkboxSub: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
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
