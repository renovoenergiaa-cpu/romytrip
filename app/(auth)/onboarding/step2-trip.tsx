import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Search, Square, CheckSquare } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { CustomDatePicker } from '../../../src/components/CustomDatePicker';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { CityAutocomplete } from '../../../src/components/CityAutocomplete';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

export default function Step2TripScreen() {
  const router = useRouter();
  const { destination, checkIn, checkOut, isFlexible, companions, updateField } = useOnboardingStore();
  
  // Memoize date references to prevent infinite render loops in DateTimePicker on Android
  const today = useMemo(() => new Date(), []);
  const minCheckOutDate = useMemo(() => checkIn ? new Date(checkIn) : today, [checkIn, today]);

  const handleNext = () => {
    if (!destination || !checkIn || !checkOut || !companions) {
      Alert.alert('Aviso', 'Por favor, preencha o destino, datas de check-in e check-out, e com quem você vai viajar.');
      return;
    }
    router.push('/(auth)/onboarding/step3-travelstyle');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ProgressBar totalSteps={5} currentStep={2} />
      
      <Text style={styles.title}>Próxima Viagem</Text>
      <Text style={styles.subtitle}>Para onde você está indo?</Text>
      
      <Text style={styles.label}>Destino</Text>
      <View style={{ zIndex: 10 }}>
        <CityAutocomplete 
          placeholder="Para onde você vai?" 
          value={destination}
          onChangeText={(t) => updateField('destination', t)}
        />
      </View>
      
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Check-in</Text>
          <CustomDatePicker 
            value={checkIn}
            onChange={(date) => updateField('checkIn', date)}
            minimumDate={today}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Check-out</Text>
          <CustomDatePicker 
            value={checkOut}
            onChange={(date) => updateField('checkOut', date)}
            minimumDate={minCheckOutDate}
          />
        </View>
      </View>
      

      <TouchableOpacity 
        style={styles.checkboxContainer} 
        activeOpacity={0.7}
        onPress={() => updateField('isFlexible', !isFlexible)}
      >
        {isFlexible ? (
          <CheckSquare size={20} color={colors.primary} />
        ) : (
          <Square size={20} color={colors.textMuted} />
        )}
        <Text style={styles.checkboxText}>Estou aberto a mudar as datas</Text>
      </TouchableOpacity>
      
      <Text style={styles.label}>Você vai:</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity 
          style={styles.radioItem} 
          onPress={() => updateField('companions', 'Sozinho(a)')}
        >
          <View style={[styles.radioCircle, companions === 'Sozinho(a)' && styles.radioCircleSelected]} />
          <Text style={styles.radioText}>Sozinho(a)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.radioItem} 
          onPress={() => updateField('companions', 'Com amigos')}
        >
          <View style={[styles.radioCircle, companions === 'Com amigos' && styles.radioCircleSelected]} />
          <Text style={styles.radioText}>Com amigos</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleNext}
      >
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
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  autocompleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    marginBottom: spacing.md,
    zIndex: 1, // needed for autocomplete dropdown
  },
  searchIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  autocompleteInput: {
    backgroundColor: 'transparent',
    height: 52,
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  listView: {
    position: 'absolute',
    top: 52,
    backgroundColor: colors.surface,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    zIndex: 0,
  },
  halfWidth: {
    flex: 1,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  checkboxText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  radioGroup: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    padding: spacing.md,
    borderRadius: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: spacing.sm,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
    borderWidth: 6,
  },
  radioText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: 40,
  },
  buttonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '600',
  },
});
