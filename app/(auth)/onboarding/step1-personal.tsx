import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Search, Upload } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { CustomDatePicker } from '../../../src/components/CustomDatePicker';
import { CustomInput } from '../../../src/components/CustomInput';
import { CityAutocomplete } from '../../../src/components/CityAutocomplete';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';

export default function Step1PersonalScreen() {
  const router = useRouter();
  const { name, dob, city, sex, photos, bio, updateField } = useOnboardingStore();
  
  // Memoize to prevent infinite loop on Android DateTimePicker
  const today = useMemo(() => new Date(), []);
  
  const handleNext = () => {
    if (!name || !dob || !city || !sex) {
      Alert.alert('Aviso', 'Por favor, preencha todos os campos obrigatórios (Nome, Data de Nascimento, Cidade e Sexo) antes de continuar.');
      return;
    }
    router.push('/(auth)/onboarding/step2-trip');
  };

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = [...photos];
      newPhotos[index] = result.assets[0].uri;
      updateField('photos', newPhotos);
    }
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ProgressBar totalSteps={5} currentStep={1} />
      
      <CustomInput 
        placeholder="Seu nome" 
        value={name}
        onChangeText={(t) => updateField('name', t)}
      />
      
      <Text style={styles.label}>Data de nascimento</Text>
      <View style={{ marginBottom: spacing.md }}>
        <CustomDatePicker 
          value={dob}
          onChange={(date) => updateField('dob', date)}
          maximumDate={today}
        />
      </View>
      <Text style={styles.label}>Cidade atual</Text>
      <View style={{ zIndex: 10 }}>
        <CityAutocomplete 
          placeholder="Ex: São Paulo, Brasil" 
          value={city}
          onChangeText={(t) => updateField('city', t)}
        />
      </View>
      
      <Text style={styles.label}>Sexo</Text>
      <View style={styles.chipRow}>
        <Chip label="Feminino" selected={sex === 'Feminino'} onPress={() => updateField('sex', 'Feminino')} />
        <Chip label="Masculino" selected={sex === 'Masculino'} onPress={() => updateField('sex', 'Masculino')} />
        <Chip label="Prefiro não dizer" selected={sex === 'Prefiro não dizer'} onPress={() => updateField('sex', 'Prefiro não dizer')} />
      </View>
      
      <Text style={styles.label}>Suas fotos (3-6)</Text>
      <View style={styles.photoGrid}>
        {[0, 1, 2].map((index) => (
          <TouchableOpacity key={index} style={styles.photoBox} onPress={() => pickImage(index)}>
            {photos[index] ? (
              <Image source={{ uri: photos[index] }} style={styles.photoImage} />
            ) : (
              <Upload size={24} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.label}>Bio (máx 300 caracteres)</Text>
      <View style={styles.bioContainer}>
        <TextInput
          style={styles.bioInput}
          multiline
          numberOfLines={4}
          placeholder="Conte um pouco sobre você e o que busca nas viagens..."
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={(t) => updateField('bio', t)}
          maxLength={300}
        />
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
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
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
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  bioContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
    minHeight: 120,
  },
  bioInput: {
    ...typography.body,
    color: colors.textPrimary,
    textAlignVertical: 'top',
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
