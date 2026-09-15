import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Square, CheckSquare, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Chip } from '../../../src/components/Chip';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';
import { supabase } from '../../../src/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const INTENTIONS = [
  'Fazer Amizades',
  'Networking',
  'Parceria de Passeio',
  'Dividir Custos',
  'Apenas Dicas Locais',
  'Romance / Dates',
];

const GENDER_PREFS = [
  { label: 'Todos', value: 'all' },
  { label: 'Apenas Mulheres', value: 'female' },
  { label: 'Apenas Homens', value: 'male' },
];

export default function Step6ConnectionsScreen() {
  const router = useRouter();
  const state = useOnboardingStore();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (state.connectionIntentions.length === 0 || !state.genderPreference) {
      const msg = 'Por favor, selecione pelo menos uma intenção de conexão e a sua preferência de gênero.';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert('Aviso', msg);
      }
      return;
    }
    setLoading(true);
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const msg = 'Usuário não autenticado.';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert('Erro', msg);
      }
      setLoading(false);
      return;
    }

    let parsedDob = null;
    if (state.dob) {
      try {
        const d = new Date(state.dob);
        if (!isNaN(d.getTime())) {
          parsedDob = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }

    // Prepare photos for upload
    let finalPhotos: string[] = [];
    if (state.photos && state.photos.length > 0) {
      try {
        for (let i = 0; i < state.photos.length; i++) {
          const uri = state.photos[i];
          if (uri && !uri.startsWith('http')) {
            const cleanUri = uri.split('?')[0];
            const ext = cleanUri.substring(cleanUri.lastIndexOf('.') + 1).toLowerCase() || 'jpg';
            const fileName = `${user.id}/${Date.now()}_${i}.${ext}`;
            
            try {
              let fileBody: any = null;
              if (Platform.OS === 'web') {
                const res = await fetch(uri);
                fileBody = await res.blob();
              } else {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                fileBody = decode(base64);
              }

              const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, fileBody, {
                  contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                  upsert: true
                });

              if (uploadError) {
                console.warn('Upload image failed (storage bucket might need creation):', uploadError);
                finalPhotos.push(uri);
              } else {
                const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalPhotos.push(publicUrlData.publicUrl);
              }
            } catch (singleErr) {
              console.warn('Single image upload exception:', singleErr);
              finalPhotos.push(uri);
            }
          } else if (uri) {
            finalPhotos.push(uri);
          }
        }
      } catch (err) {
        console.warn('Image processing warning:', err);
      }
    }

    // Prepare data to upsert in Supabase
    const updateData = {
      id: user.id,
      email: user.email,
      name: state.name,
      dob: parsedDob,
      city: state.city,
      sex: state.sex,
      bio: state.bio,
      photos: finalPhotos.length > 0 ? finalPhotos : undefined,
      
      destination: state.destination,
      is_flexible: state.isFlexible,
      companions: state.companions,
      
      travel_styles: state.travelStyles,
      interests: state.interests,
      
      budget: state.budget,
      cost_split: state.costSplit,
      group_travel: state.group,
      one_person: state.onePerson,
      invitations: state.invitations,

      connection_intentions: state.connectionIntentions,
      gender_preference: state.genderPreference,
    };

    const { error } = await supabase
      .from('users')
      .upsert(updateData);

    if (error) {
      const msg = 'Falha ao salvar seu perfil: ' + error.message;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert('Erro', msg);
      }
      setLoading(false);
    } else {
      state.reset(); // Clear onboarding state
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgressBar totalSteps={6} currentStep={6} />
      
      <Text style={styles.title}>Conexões</Text>
      <Text style={styles.subtitle}>O que você busca ao se conectar com outros viajantes?</Text>
      
      <View style={styles.chipContainer}>
        {INTENTIONS.map(intention => (
          <Chip 
            key={intention} 
            label={intention} 
            selected={state.connectionIntentions.includes(intention)}
            onPress={() => state.toggleArrayItem('connectionIntentions', intention)}
          />
        ))}
      </View>
      
      <Text style={styles.label}>Preferência de Gênero</Text>
      <Text style={styles.helperText}>Quem você gostaria de ver no feed de descobertas?</Text>
      
      <View style={styles.optionsList}>
        {GENDER_PREFS.map(pref => (
          <TouchableOpacity 
            key={pref.value}
            style={[
              styles.checkboxRow, 
              state.genderPreference === pref.value && styles.checkboxRowSelected
            ]} 
            activeOpacity={0.7}
            onPress={() => state.updateField('genderPreference', pref.value)}
          >
            {state.genderPreference === pref.value ? <CheckSquare color={colors.surface} /> : <Square color={colors.textMuted} />}
            <Text style={[
              styles.checkboxText, 
              state.genderPreference === pref.value && styles.checkboxTextSelected
            ]}>
              {pref.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleFinish}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <>
            <Sparkles size={20} color={colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Finalizar e Entrar</Text>
          </>
        )}
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
    marginTop: spacing.md,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
  checkboxRowSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    flex: 1,
  },
  checkboxTextSelected: {
    color: colors.surface,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
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
