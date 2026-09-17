import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Square, CheckSquare, Sparkles, ChevronLeft, ShieldCheck, Heart, Users, MapPin, Check } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { useOnboardingStore } from '../../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../../src/theme';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const INTENTIONS = [
  { id: 'Parceria de Passeio', label: '🤝 Parceria de Passeio', desc: 'Companhia para explorar pontos turísticos, praias e cafés' },
  { id: 'Companheiro de Estrada', label: '🎒 Companheiro(a) de Estrada', desc: 'Planejar e viajar junto do início ao fim' },
  { id: 'Fazer Amizades', label: '💬 Amizades & Dicas Locais', desc: 'Fazer amigos para bater papo e trocar experiências' },
  { id: 'Dividir Custos', label: '🚗 Dividir Custos', desc: 'Compartilhar hospedagem (Airbnb/quarto), carro ou passeios' },
  { id: 'Networking', label: '💻 Networking Nômade', desc: 'Conectar com quem trabalha remoto e curte coworking' },
  { id: 'Romance / Dates', label: '✨ Conexão Especial / Romance', desc: 'Aberto(a) a romance e sintonia com viajantes' },
];

const GENDER_PREFS = [
  { label: '🌍 Todos os viajantes', value: 'all', desc: 'Ver todos no radar de descobertas' },
  { label: '🌸 Apenas Mulheres', value: 'female', desc: 'Modo seguro e exclusivo para conectar com mulheres' },
  { label: '🧔 Apenas Homens', value: 'male', desc: 'Ver viajantes homens no radar' },
];

export default function Step6ConnectionsScreen() {
  const router = useRouter();
  const state = useOnboardingStore();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pledgeAccepted, setPledgeAccepted] = useState(true); // Padrão selecionado com destaque

  const handleFinish = async () => {
    if (!state.connectionIntentions || state.connectionIntentions.length === 0) {
      Alert.alert('Intenções de Viagem', 'Selecione pelo menos uma intenção de conexão para orientar suas sintonias.');
      return;
    }
    if (!state.genderPreference) {
      Alert.alert('Preferência de Radar', 'Escolha sua preferência de visualização de gênero no feed.');
      return;
    }
    if (!pledgeAccepted) {
      Alert.alert('Pacto de Segurança', 'Por favor, aceite o Pacto Romy de Respeito e Segurança para fazer parte da comunidade.');
      return;
    }

    setLoading(true);
    
    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const msg = 'Usuário não autenticado. Por favor, faça login novamente.';
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

    let parsedCheckIn = null;
    if (state.checkIn) {
      try {
        const d = new Date(state.checkIn);
        if (!isNaN(d.getTime())) parsedCheckIn = d.toISOString().split('T')[0];
      } catch (e) {}
    }

    let parsedCheckOut = null;
    if (state.checkOut) {
      try {
        const d = new Date(state.checkOut);
        if (!isNaN(d.getTime())) parsedCheckOut = d.toISOString().split('T')[0];
      } catch (e) {}
    }

    // Processamento de fotos
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
                console.warn('Upload imagem com aviso:', uploadError);
                finalPhotos.push(uri);
              } else {
                const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalPhotos.push(publicUrlData.publicUrl);
              }
            } catch (singleErr) {
              console.warn('Foto ignorada com fallback:', singleErr);
              finalPhotos.push(uri);
            }
          } else if (uri) {
            finalPhotos.push(uri);
          }
        }
      } catch (err) {
        console.warn('Processamento de imagens com aviso:', err);
      }
    }

    // Dados consolidados para upsert
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
      check_in: parsedCheckIn,
      check_out: parsedCheckOut,
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
      state.reset(); // Limpar store
      await refreshProfile(); // Atualiza AuthContext para isProfileComplete = true
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>Passo 6 de 6</Text>
        <View style={{ width: 32 }} />
      </View>

      <ProgressBar totalSteps={6} currentStep={6} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Sintonia & Segurança</Text>
        <Text style={styles.subtitle}>
          Defina o tipo de conexões que você quer construir e suas preferências de segurança na comunidade.
        </Text>
      </View>

      {/* Intenções de Conexão */}
      <Text style={styles.label}>O que você busca de verdade?</Text>
      <View style={styles.intentionsList}>
        {INTENTIONS.map((item) => {
          const selected = state.connectionIntentions.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.intentionCard, selected && styles.intentionCardSelected]}
              onPress={() => state.toggleArrayItem('connectionIntentions', item.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.intentionLabel, selected && styles.intentionLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.intentionDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
                {selected && <Check size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Radar de Preferência de Gênero */}
      <Text style={[styles.label, { marginTop: spacing.lg }]}>Radar de Preferência & Visibilidade</Text>
      <Text style={styles.helperText}>Quem você gostaria de ver com prioridade no seu feed de descobertas?</Text>
      
      <View style={styles.genderList}>
        {GENDER_PREFS.map((pref) => {
          const selected = state.genderPreference === pref.value;
          return (
            <TouchableOpacity 
              key={pref.value}
              style={[styles.genderCard, selected && styles.genderCardSelected]} 
              activeOpacity={0.8}
              onPress={() => state.updateField('genderPreference', pref.value)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                  {pref.label}
                </Text>
                <Text style={styles.genderDesc}>{pref.desc}</Text>
              </View>
              {selected ? <CheckSquare size={20} color={colors.primary} /> : <Square size={20} color={colors.textMuted} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pacto Romy de Segurança e Respeito */}
      <View style={styles.pledgeCard}>
        <View style={styles.pledgeHeader}>
          <ShieldCheck size={22} color="#059669" />
          <Text style={styles.pledgeTitle}>Pacto Romy de Respeito & Segurança</Text>
        </View>
        <Text style={styles.pledgeRule}>1. Tolerância zero contra assédio, insistência ou comportamentos invasivos.</Text>
        <Text style={styles.pledgeRule}>2. Encontros em locais públicos e compartilhamento seguro de planos.</Text>
        <Text style={styles.pledgeRule}>3. Comunidade segura: denúncias são tratadas com prioridade e banimento imediato.</Text>

        <TouchableOpacity 
          style={styles.pledgeAcceptRow}
          onPress={() => setPledgeAccepted(!pledgeAccepted)}
          activeOpacity={0.7}
        >
          {pledgeAccepted ? <CheckSquare size={20} color="#059669" /> : <Square size={20} color="#6EE7B7" />}
          <Text style={styles.pledgeAcceptText}>
            Concordo com o Pacto de Respeito e Segurança da Comunidade
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleFinish}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Sparkles size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Finalizar Perfil e Conectar ✨</Text>
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
    marginBottom: spacing.sm,
  },
  intentionsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  intentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  intentionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  intentionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  intentionLabelSelected: {
    color: colors.primary,
  },
  intentionDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderList: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  genderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 8,
  },
  genderCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  genderLabelSelected: {
    color: colors.primary,
  },
  genderDesc: {
    fontSize: 11,
    color: colors.textMuted,
  },
  pledgeCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  pledgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pledgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  pledgeRule: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 4,
    lineHeight: 16,
  },
  pledgeAcceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  pledgeAcceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
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
