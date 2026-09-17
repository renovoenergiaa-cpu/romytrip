import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Upload, ShieldCheck, Sparkles, Plus, Trash2, ChevronLeft } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { BirthDatePicker } from '../../../src/components/BirthDatePicker';
import { CustomInput } from '../../../src/components/CustomInput';
import { CityAutocomplete } from '../../../src/components/CityAutocomplete';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';
import { supabase } from '../../../src/lib/supabase';

export default function Step1PersonalScreen() {
  const router = useRouter();
  const { name, dob, city, sex, photos, bio, updateField, reset: resetOnboarding } = useOnboardingStore();

  const handleCancelOnboarding = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao encerrar sessão:', e);
    }
    resetOnboarding();
    router.replace('/(auth)/login');
  };
  
  // Função para cálculo exato de idade
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 0;
    const todayDate = new Date();
    let calculatedAge = todayDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = todayDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && todayDate.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  };

  // Trava de maioridade: máximo de hoje menos 18 anos
  const maxAdultBirthDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear() - 18, d.getMonth(), d.getDate(), 12, 0, 0);
  }, []);
  const minBirthDate = useMemo(() => new Date(1900, 0, 1, 12, 0, 0), []);
  
  const handleNext = () => {
    if (!name?.trim() || !dob || !city?.trim() || !sex) {
      const msg = 'Preencha seu nome, data de nascimento, cidade base e gênero para continuar.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Aviso: ${msg}`);
      } else {
        Alert.alert('Aviso', msg);
      }
      return;
    }

    // 🔒 SEGURANÇA & CONFORMIDADE: Bloqueio estrito de cadastro para menores de 18 anos
    const age = calculateAge(dob);
    if (age < 18) {
      const title = 'Cadastro Proibido para Menores';
      const msg = 'O Romy é uma comunidade exclusiva para maiores de 18 anos. Menores de idade não podem criar uma conta.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`${title}: ${msg}`);
      } else {
        Alert.alert(title, msg);
      }
      return;
    }

    if (!photos || photos.length === 0 || !photos[0]) {
      const msg = 'Adicione pelo menos uma foto sua para que seus futuros companheiros de viagem te reconheçam.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Foto Obrigatória: ${msg}`);
      } else {
        Alert.alert('Foto Obrigatória', msg);
      }
      return;
    }
    router.push('/(auth)/onboarding/step2-trip');
  };

  const pickImage = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const newPhotos = [...(photos || [])];
        newPhotos[index] = result.assets[0].uri;
        updateField('photos', newPhotos);
      }
    } catch (e) {
      console.warn('Erro ao selecionar foto:', e);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...(photos || [])];
    newPhotos.splice(index, 1);
    updateField('photos', newPhotos);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={handleCancelOnboarding} accessibilityLabel="Voltar ao login">
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>Passo 1 de 6</Text>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelOnboarding} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>Desistir</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar totalSteps={6} currentStep={1} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Quem é você no mundo?</Text>
        <Text style={styles.subtitle}>
          Crie seu perfil autêntico para se conectar com pessoas com a sua mesma energia de viagem.
        </Text>
      </View>

      {/* Nome */}
      <Text style={styles.label}>Como quer ser chamado(a)?</Text>
      <CustomInput 
        placeholder="Seu nome ou apelido" 
        value={name}
        onChangeText={(t) => updateField('name', t)}
      />
      
      {/* Data de Nascimento */}
      <View style={styles.dobLabelRow}>
        <Text style={styles.label}>Data de nascimento</Text>
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>🔞 Maior de 18 anos</Text>
        </View>
      </View>
      <BirthDatePicker 
        value={dob}
        onChange={(date) => updateField('dob', date)}
      />
      <Text style={styles.helperText}>Informe dia, mês e ano de nascimento (obrigatório 18+ anos).</Text>

      {/* Cidade Base */}
      <Text style={styles.label}>Sua cidade base</Text>
      <Text style={styles.helperText}>Onde você mora quando não está na estrada (nunca exibimos sua localização exata).</Text>
      <View style={{ zIndex: 10, marginBottom: spacing.md }}>
        <CityAutocomplete 
          placeholder="Ex: Florianópolis, Brasil" 
          value={city}
          onChangeText={(t) => updateField('city', t)}
        />
      </View>
      
      {/* Gênero */}
      <Text style={styles.label}>Identidade de gênero</Text>
      <View style={styles.chipRow}>
        <Chip label="Feminino" selected={sex === 'Feminino'} onPress={() => updateField('sex', 'Feminino')} />
        <Chip label="Masculino" selected={sex === 'Masculino'} onPress={() => updateField('sex', 'Masculino')} />
        <Chip label="Não-binário" selected={sex === 'Não-binário'} onPress={() => updateField('sex', 'Não-binário')} />
        <Chip label="Prefiro não dizer" selected={sex === 'Prefiro não dizer'} onPress={() => updateField('sex', 'Prefiro não dizer')} />
      </View>

      {/* Banner de Segurança para Mulheres */}
      {sex === 'Feminino' && (
        <View style={styles.womenSafetyCard}>
          <View style={styles.safetyHeader}>
            <ShieldCheck size={20} color="#E11D48" />
            <Text style={styles.safetyTitle}>Espaço Seguro Romy para Mulheres</Text>
          </View>
          <Text style={styles.safetyDesc}>
            Você terá controle total nas próximas etapas para conectar exclusivamente com outras mulheres, encontrar companheiras de hospedagem e viajar com total tranquilidade.
          </Text>
        </View>
      )}

      {/* Fotos de Viagem */}
      <Text style={styles.label}>Suas fotos de viagem (1 a 4 fotos)</Text>
      <Text style={styles.helperText}>A primeira foto será a capa do seu perfil. Escolha fotos sorrindo ou em viagens!</Text>
      <View style={styles.photoGrid}>
        {[0, 1, 2, 3].map((index) => {
          const uri = photos?.[index];
          const isMain = index === 0;
          return (
            <View key={index} style={[styles.photoBox, isMain && styles.photoBoxMain]}>
              {uri ? (
                <>
                  <Image source={{ uri }} style={styles.photoImage} />
                  {isMain && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Capa</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                    <Trash2 size={14} color="#FFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.uploadPlaceholder} onPress={() => pickImage(index)} activeOpacity={0.7}>
                  <Plus size={22} color={colors.primary} />
                  <Text style={styles.uploadText}>{isMain ? 'Foto Principal' : 'Adicionar'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
      
      {/* Bio */}
      <Text style={styles.label}>Bio de viajante (máx. 300 caracteres)</Text>
      <View style={styles.bioContainer}>
        <TextInput
          style={styles.bioInput}
          multiline
          numberOfLines={3}
          placeholder="Ex: Apaixonado(a) por provar comidas de rua, ver o nascer do sol e nunca recuso um convite para uma trilha ou café local..."
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={(t) => updateField('bio', t)}
          maxLength={300}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Continuar para Próxima Viagem →</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.cancelLinkWrapper} 
        onPress={handleCancelOnboarding}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelLinkText}>
          Colocou o e-mail errado? <Text style={styles.cancelLinkHighlight}>Desistir e voltar ao login</Text>
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
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  },
  helperText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  womenSafetyCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9F1239',
  },
  safetyDesc: {
    fontSize: 12,
    color: '#881337',
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg,
  },
  photoBox: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  photoBoxMain: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  mainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  uploadText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bioContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.xl,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioInput: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'top',
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
  dobLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ageBadge: {
    backgroundColor: 'rgba(99, 56, 250, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 56, 250, 0.3)',
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelLinkWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: -8,
    marginBottom: spacing.xl,
  },
  cancelLinkText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelLinkHighlight: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
