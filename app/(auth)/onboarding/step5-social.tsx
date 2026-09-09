import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Square, CheckSquare } from 'lucide-react-native';
import { useState } from 'react';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';
import { supabase } from '../../../src/lib/supabase';

export default function Step5SocialScreen() {
  const router = useRouter();
  const state = useOnboardingStore();
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!state.budget) {
      Alert.alert('Aviso', 'Por favor, selecione um orçamento médio diário.');
      return;
    }
    router.push('/(auth)/onboarding/step6-connections');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgressBar totalSteps={5} currentStep={5} />
      
      <Text style={styles.title}>Estilo Social</Text>
      <Text style={styles.subtitle}>Como você prefere viajar e interagir?</Text>
      
      <Text style={styles.label}>Orçamento Médio Diário</Text>
      <View style={styles.budgetRow}>
        {['$', '$$', '$$$', '$$$$'].map((val) => (
          <TouchableOpacity 
            key={val} 
            style={[styles.budgetBox, state.budget === val && styles.budgetBoxSelected]}
            onPress={() => state.updateField('budget', val)}
          >
            <Text style={[styles.budgetText, state.budget === val && styles.budgetTextSelected]}>{val}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.label}>Disponibilidade Social</Text>
      
      <View style={styles.optionsList}>
        <TouchableOpacity 
          style={styles.checkboxRow} 
          activeOpacity={0.7}
          onPress={() => state.updateField('costSplit', !state.costSplit)}
        >
          {state.costSplit ? <CheckSquare color={colors.primary} /> : <Square color={colors.textMuted} />}
          <Text style={styles.checkboxText}>Aberto para dividir custos (hospedagem, aluguel)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow} 
          activeOpacity={0.7}
          onPress={() => {
            const nextValue = !state.group;
            state.updateField('group', nextValue);
            if (nextValue) {
              state.updateField('onePerson', false);
            }
          }}
        >
          {state.group ? <CheckSquare color={colors.primary} /> : <Square color={colors.textMuted} />}
          <Text style={styles.checkboxText}>Aberto para formar grupo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow} 
          activeOpacity={0.7}
          onPress={() => {
            const nextValue = !state.onePerson;
            state.updateField('onePerson', nextValue);
            if (nextValue) {
              state.updateField('group', false);
            }
          }}
        >
          {state.onePerson ? <CheckSquare color={colors.primary} /> : <Square color={colors.textMuted} />}
          <Text style={styles.checkboxText}>Prefiro encontrar 1 pessoa apenas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow} 
          activeOpacity={0.7}
          onPress={() => state.updateField('invitations', !state.invitations)}
        >
          {state.invitations ? <CheckSquare color={colors.primary} /> : <Square color={colors.textMuted} />}
          <Text style={styles.checkboxText}>Aberto para convites de rolês e eventos</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Próximo</Text>
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
    padding: spacing.xl,
    paddingTop: 60,
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
  label: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  budgetBox: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  budgetBoxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  budgetText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  budgetTextSelected: {
    color: colors.surface,
  },
  optionsList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: 40,
  },
  buttonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '600',
  },
});
