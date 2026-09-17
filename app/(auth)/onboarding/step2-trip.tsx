import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Search, Square, CheckSquare, ChevronLeft, MapPin, Sparkles } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { CustomDatePicker } from '../../../src/components/CustomDatePicker';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { CityAutocomplete } from '../../../src/components/CityAutocomplete';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

export default function Step2TripScreen() {
  const router = useRouter();
  const { destination, checkIn, checkOut, isFlexible, companions, sex, updateField } = useOnboardingStore();
  
  const today = useMemo(() => new Date(), []);
  const minCheckOutDate = useMemo(() => checkIn ? new Date(checkIn) : today, [checkIn, today]);

  const handleNext = () => {
    if (!destination?.trim()) {
      Alert.alert('Destino Necessário', 'Informe a cidade ou país para onde você está indo ou sonha conhecer.');
      return;
    }
    if (!isFlexible && (!checkIn || !checkOut)) {
      Alert.alert('Datas da Viagem', 'Selecione as datas de check-in e check-out ou marque a opção "Ainda estou flexível com as datas".');
      return;
    }
    router.push('/(auth)/onboarding/step3-travelstyle');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>Passo 2 de 6</Text>
        <View style={{ width: 32 }} />
      </View>

      <ProgressBar totalSteps={6} currentStep={2} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Para onde vamos?</Text>
        <Text style={styles.subtitle}>
          Compartilhe sua próxima viagem planejada ou o destino dos seus sonhos para cruzar caminhos com outros viajantes.
        </Text>
      </View>
      
      {/* Destino */}
      <Text style={styles.label}>Próximo Destino</Text>
      <View style={{ zIndex: 10, marginBottom: spacing.md }}>
        <CityAutocomplete 
          placeholder="Para onde você vai? (Ex: Rio de Janeiro, Paris, Cusco...)" 
          value={destination}
          onChangeText={(t) => updateField('destination', t)}
        />
      </View>
      
      {/* Datas */}
      {!isFlexible && (
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Chegada (Check-in)</Text>
            <CustomDatePicker 
              value={checkIn}
              onChange={(date) => updateField('checkIn', date)}
              minimumDate={today}
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Partida (Check-out)</Text>
            <CustomDatePicker 
              value={checkOut}
              onChange={(date) => updateField('checkOut', date)}
              minimumDate={minCheckOutDate}
            />
          </View>
        </View>
      )}
      
      {/* Flexibilidade */}
      <TouchableOpacity 
        style={styles.checkboxContainer} 
        activeOpacity={0.7}
        onPress={() => updateField('isFlexible', !isFlexible)}
      >
        {isFlexible ? (
          <CheckSquare size={22} color={colors.primary} />
        ) : (
          <Square size={22} color={colors.textMuted} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.checkboxTitle}>Ainda estou flexível com as datas</Text>
          <Text style={styles.checkboxSub}>Aberto a planejar de acordo com as companhias ideais</Text>
        </View>
      </TouchableOpacity>
      
      {/* Companhias */}
      <Text style={[styles.label, { marginTop: spacing.md }]}>Como você costuma embarcar?</Text>
      <View style={styles.companionRow}>
        {[
          { id: 'Sozinho(a)', label: 'Viajando Solo', desc: 'Indo por conta própria' },
          { id: 'Em dupla', label: 'Em Dupla', desc: 'Com amigo(a) ou parceiro(a)' },
          { id: 'Com amigos', label: 'Em Grupo', desc: 'Com amigos ou galera' }
        ].map((item) => {
          const selected = companions === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.companionCard, selected && styles.companionCardSelected]}
              onPress={() => updateField('companions', item.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.companionTitle, selected && styles.companionTitleSelected]}>
                {item.label}
              </Text>
              <Text style={[styles.companionDesc, selected && styles.companionDescSelected]}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Destaque para mulheres */}
      {sex === 'Feminino' && (
        <View style={styles.femaleTipBox}>
          <Text style={styles.femaleTipText}>
            🌸 <Text style={{ fontWeight: '700' }}>Viajante Solo Feminina:</Text> você poderá encontrar e filtrar outras mulheres que também estarão nesse mesmo destino na mesma época!
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Continuar para Seu Ritmo →</Text>
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
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  checkboxTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  checkboxSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  companionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  companionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  companionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10', // 10% opacity
  },
  companionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  companionTitleSelected: {
    color: colors.primary,
  },
  companionDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  companionDescSelected: {
    color: colors.primaryDark,
  },
  femaleTipBox: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.xl,
  },
  femaleTipText: {
    fontSize: 12,
    color: '#9D174D',
    lineHeight: 18,
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
