import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Camera,
  User,
  FileText,
  MapPin,
  Compass,
  Handshake,
  Star,
  Globe,
  Calendar,
  Wallet,
  Check,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { spacing, useTheme } from '../src/theme';

const AVAILABLE_INTERESTS = [
  'Café',
  'Trilhas',
  'Praia',
  'Fotografia',
  'Música',
  'Gastronomia',
  'Cultura',
  'Mochilão',
  'Aventura',
  'Vida Noturna',
  'Natureza',
  'Arte',
  'História',
  'Esportes',
];

const AVAILABLE_LANGUAGES = [
  'Português',
  'Inglês',
  'Espanhol',
  'Francês',
  'Italiano',
  'Alemão',
  'Japonês',
  'Mandarim',
];

const AVAILABLE_AVAILABILITIES = [
  'Fins de semana e noites durante a semana.',
  'Totalmente flexível (qualquer dia)',
  'Apenas fins de semana',
  'Apenas dias de semana',
  'Apenas viagens de férias',
];

const AVAILABLE_BUDGETS = ['Econômico', 'Conforto', 'Luxo'];

const QUICK_OBJECTIVES = [
  'Conhecer pessoas para explorar a cidade, tomar café, fazer trilhas e trocar experiências.',
  'Fazer amizades locais e passear pela cidade.',
  'Companhia para eventos, shows e vida noturna.',
  'Companheiro(a) de viagem para dividir custos.',
];

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [destination, setDestination] = useState('');
  const [objective, setObjective] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('Conforto');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setCity(profile.city || '');
      setDestination(profile.destination || 'Em casa');
      setObjective(
        profile.connection_intentions?.[0] ||
        profile.connection_objective ||
        'Conhecer pessoas para explorar a cidade, tomar café, fazer trilhas e trocar experiências.'
      );
      setSelectedInterests(
        Array.isArray(profile.travel_styles) && profile.travel_styles.length > 0
          ? profile.travel_styles
          : ['Café', 'Trilhas', 'Praia', 'Fotografia', 'Música']
      );
      setSelectedLanguages(
        Array.isArray(profile.interests) && profile.interests.length > 0
          ? profile.interests
          : ['Português', 'Inglês']
      );
      setSelectedAvailability(
        profile.companions || 'Fins de semana e noites durante a semana.'
      );
      setSelectedBudget(profile.budget || 'Conforto');
      setPhotoUrl(profile.photos?.[0] || '');
    }
  }, [profile]);

  const toggleInterest = (item: string) => {
    Haptics.selectionAsync();
    setSelectedInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleLanguage = (item: string) => {
    Haptics.selectionAsync();
    setSelectedLanguages((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setPhotoUrl(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar em branco.');
      return;
    }

    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');

      const currentPhotos = profile?.photos || [];
      const updatedPhotos = photoUrl
        ? [photoUrl, ...currentPhotos.filter((p: string) => p !== photoUrl)]
        : currentPhotos;

      // Persist to all real columns in Supabase
      const updateData = {
        name: name.trim(),
        bio: bio.trim(),
        city: city.trim(),
        destination: destination.trim() || 'Em casa',
        connection_intentions: objective.trim() ? [objective.trim()] : [],
        travel_styles: selectedInterests,
        interests: selectedLanguages, // stored in interests text[]
        companions: selectedAvailability, // stored in companions text
        budget: selectedBudget,
        photos: updatedPhotos,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate both myProfile and discoveryTravelers so the rest of the app updates in real-time
      await queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['discoveryTravelers'] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso na base de dados!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao salvar as alterações do perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const defaultAvatar =
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6338FA" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#09090B' : '#F8F9FA' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={26} color={isDark ? '#FFFFFF' : '#111827'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={styles.saveButton}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#6338FA" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: photoUrl || defaultAvatar }} style={styles.avatar} />
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <Camera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
            <Text style={styles.changePhotoText}>Alterar foto de perfil</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Nome Completo */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <User size={15} color="#6338FA" strokeWidth={2.2} />
            <Text style={styles.label}>Nome Completo</Text>
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          />
        </View>

        {/* 2. Cidade de Origem */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <MapPin size={15} color="#6338FA" strokeWidth={2.2} />
            <Text style={styles.label}>Cidade de Origem / Localização</Text>
          </View>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ex: Cabo Frio, Rio de Janeiro, Brasil"
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          />
        </View>

        {/* 3. Sobre (Biografia) */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <FileText size={15} color="#6338FA" strokeWidth={2.2} />
            <Text style={styles.label}>Sobre (Biografia)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Fale um pouco sobre você, seu estilo de vida e viagens..."
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* 4. Objetivo da Conexão */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Handshake size={15} color="#059669" strokeWidth={2.2} />
            <Text style={styles.label}>Objetivo da Conexão</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textAreaSmall]}
            value={objective}
            onChangeText={setObjective}
            placeholder="Ex: Conhecer pessoas para explorar a cidade, tomar café e fazer trilhas..."
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          {/* Sugestões rápidas */}
          <Text style={styles.quickLabel}>Sugestões rápidas:</Text>
          <View style={styles.quickRow}>
            {QUICK_OBJECTIVES.map((sug, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.quickChip,
                  objective === sug && styles.quickChipSelected,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setObjective(sug);
                }}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    objective === sug && styles.quickChipTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {sug}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 5. Próximo Destino / Viagem Atual */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Compass size={15} color="#0D9488" strokeWidth={2.2} />
            <Text style={styles.label}>Viagem Atual / Próximo Destino</Text>
          </View>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Ex: Em casa ou Paris, França"
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          />
        </View>

        {/* 6. Interesses em Comum */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Star size={15} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.label}>Interesses em Comum</Text>
          </View>
          <Text style={styles.sublabel}>Selecione as atividades que combinam com seu estilo:</Text>
          <View style={styles.chipsWrap}>
            {AVAILABLE_INTERESTS.map((item) => {
              const selected = selectedInterests.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.selectableChip,
                    selected && styles.selectableChipActive,
                  ]}
                  onPress={() => toggleInterest(item)}
                >
                  {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                  <Text
                    style={[
                      styles.selectableChipText,
                      selected && styles.selectableChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 7. Idiomas */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Globe size={15} color="#8B5CF6" strokeWidth={2.2} />
            <Text style={styles.label}>Idiomas que você fala</Text>
          </View>
          <View style={styles.chipsWrap}>
            {AVAILABLE_LANGUAGES.map((item) => {
              const selected = selectedLanguages.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.selectableChip,
                    selected && styles.selectableChipActive,
                  ]}
                  onPress={() => toggleLanguage(item)}
                >
                  {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                  <Text
                    style={[
                      styles.selectableChipText,
                      selected && styles.selectableChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 8. Disponibilidade */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Calendar size={15} color="#0D9488" strokeWidth={2.2} />
            <Text style={styles.label}>Disponibilidade para Viagens / Encontros</Text>
          </View>
          <View style={styles.optionsCol}>
            {AVAILABLE_AVAILABILITIES.map((avail) => {
              const selected = selectedAvailability === avail;
              return (
                <TouchableOpacity
                  key={avail}
                  style={[
                    styles.optionRow,
                    selected && styles.optionRowActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedAvailability(avail);
                  }}
                >
                  <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                    {avail}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 9. Orçamento */}
        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Wallet size={15} color="#6338FA" strokeWidth={2.2} />
            <Text style={styles.label}>Faixa de Orçamento de Viagem</Text>
          </View>
          <View style={styles.budgetRow}>
            {AVAILABLE_BUDGETS.map((b) => {
              const selected = selectedBudget === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.budgetBtn,
                    selected && styles.budgetBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedBudget(b);
                  }}
                >
                  <Text
                    style={[
                      styles.budgetBtnText,
                      selected && styles.budgetBtnTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#222226' : '#ECEEF1',
      backgroundColor: isDark ? '#09090B' : '#FFFFFF',
    },
    backButton: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: -0.3,
    },
    saveButton: {
      backgroundColor: '#6338FA',
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 18,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 60,
      gap: 12,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 10,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 8,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: isDark ? '#27272A' : '#E5E7EB',
      borderWidth: 2,
      borderColor: isDark ? '#27272A' : '#FFFFFF',
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#6338FA',
      padding: 7,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: isDark ? '#09090B' : '#FFFFFF',
    },
    changePhotoText: {
      fontSize: 13,
      color: '#6338FA',
      fontWeight: '600',
    },
    formCard: {
      backgroundColor: isDark ? '#141416' : '#FFFFFF',
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? '#222226' : '#ECEEF1',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#111827',
    },
    sublabel: {
      fontSize: 12,
      color: isDark ? '#A1A1AA' : '#6B7280',
      marginBottom: 10,
    },
    input: {
      backgroundColor: isDark ? '#1C1C20' : '#F9FAFB',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: isDark ? '#FFFFFF' : '#111827',
      fontSize: 14,
      borderWidth: 1,
      borderColor: isDark ? '#2E2E32' : '#E5E7EB',
    },
    textArea: {
      minHeight: 75,
    },
    textAreaSmall: {
      minHeight: 60,
    },
    quickLabel: {
      fontSize: 11,
      color: isDark ? '#A1A1AA' : '#6B7280',
      marginTop: 8,
      marginBottom: 6,
      fontWeight: '600',
    },
    quickRow: {
      gap: 6,
    },
    quickChip: {
      backgroundColor: isDark ? '#222226' : '#F3F4F6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#2E2E32' : '#E5E7EB',
    },
    quickChipSelected: {
      backgroundColor: isDark ? 'rgba(99, 56, 250, 0.2)' : '#F3F0FF',
      borderColor: '#6338FA',
    },
    quickChipText: {
      fontSize: 11.5,
      color: isDark ? '#D4D4D8' : '#374151',
    },
    quickChipTextSelected: {
      color: '#6338FA',
      fontWeight: '600',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 4,
    },
    selectableChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? '#1C1C20' : '#F4F4F6',
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#2E2E32' : '#E5E7EB',
    },
    selectableChipActive: {
      backgroundColor: '#6338FA',
      borderColor: '#6338FA',
    },
    selectableChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#E4E4E7' : '#374151',
    },
    selectableChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    optionsCol: {
      gap: 8,
      marginTop: 4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? '#1C1C20' : '#F9FAFB',
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#2E2E32' : '#E5E7EB',
    },
    optionRowActive: {
      backgroundColor: isDark ? 'rgba(13, 148, 136, 0.15)' : '#F0FDF4',
      borderColor: '#0D9488',
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: isDark ? '#52525B' : '#D1D5DB',
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioCircleActive: {
      borderColor: '#0D9488',
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#0D9488',
    },
    optionText: {
      fontSize: 12.5,
      color: isDark ? '#A1A1AA' : '#4B5563',
      flex: 1,
    },
    optionTextActive: {
      color: isDark ? '#FFFFFF' : '#111827',
      fontWeight: '600',
    },
    budgetRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    budgetBtn: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? '#1C1C20' : '#F4F4F6',
      borderWidth: 1,
      borderColor: isDark ? '#2E2E32' : '#E5E7EB',
    },
    budgetBtnActive: {
      backgroundColor: '#6338FA',
      borderColor: '#6338FA',
    },
    budgetBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#4B5563',
    },
    budgetBtnTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
