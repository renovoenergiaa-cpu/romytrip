import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { useTheme, type ThemeColors } from '../src/theme';
import { SkeletonLine } from '../src/components/SkeletonLoader';
import { CityAutocomplete } from '../src/components/CityAutocomplete';
import { CustomDatePicker } from '../src/components/CustomDatePicker';
import { BigInput, ChoiceChip, OptionRow } from '../src/features/onboarding/components';
import {
  AirplaneTilt, Backpack, CaretLeft, Compass, HandCoins, Heart, ImageSquare, Quotes, Translate,
  Warning, X, type Icon,
} from '../src/features/onboarding/icons';
import {
  BUDGET_OPTIONS, COMPANION_OPTIONS, GENDER_OPTIONS, GENDER_PREF_OPTIONS, INTENTION_OPTIONS,
  INTEREST_OPTIONS, LANGUAGE_OPTIONS, SOCIAL_OPTIONS, TRAVEL_STYLE_OPTIONS, type Option,
} from '../src/features/onboarding/options';
import { uploadPhoto } from '../src/features/onboarding/saveProfile';

const MAX_PHOTOS = 4;
const MIN_BIO = 20;
const MAX_BIO = 300;
const MIN_INTERESTS = 3;

// A Editar perfil antiga gravava orçamento por extenso; o cadastro usa $…$$$$.
const LEGACY_BUDGET: Record<string, string> = { 'Econômico': '$', 'Conforto': '$$$', 'Luxo': '$$$$' };

type Draft = {
  photos: string[];
  name: string;
  bio: string;
  city: string;
  sex: string;
  languages: string[];
  destination: string;
  checkIn: string;
  checkOut: string;
  isFlexible: boolean;
  companions: string;
  travelStyles: string[];
  interests: string[];
  budget: string;
  costSplit: boolean;
  group: boolean;
  onePerson: boolean;
  invitations: boolean;
  intentions: string[];
  genderPreference: string;
};

/** Só mantém valores conhecidos: descarta o que a tela antiga gravou no campo errado. */
const known = (ids: unknown, options: Option[]) =>
  Array.isArray(ids) ? ids.filter((id): id is string => options.some((o) => o.id === id)) : [];
const knownOne = (id: unknown, options: Option[]) =>
  typeof id === 'string' && options.some((o) => o.id === id) ? id : '';

function toDraft(p: any): Draft {
  return {
    photos: (p.photos || []).filter((x: unknown) => typeof x === 'string' && x.startsWith('http')).slice(0, MAX_PHOTOS),
    name: p.name || '',
    bio: p.bio || '',
    city: p.city || '',
    sex: knownOne(p.sex, GENDER_OPTIONS),
    languages: known(p.languages, LANGUAGE_OPTIONS),
    destination: p.destination && p.destination !== 'Em casa' ? p.destination : '',
    checkIn: p.check_in || '',
    checkOut: p.check_out || '',
    isFlexible: !!p.is_flexible,
    companions: knownOne(p.companions, COMPANION_OPTIONS),
    travelStyles: known(p.travel_styles, TRAVEL_STYLE_OPTIONS),
    interests: known(p.interests, INTEREST_OPTIONS),
    budget: knownOne(LEGACY_BUDGET[p.budget] ?? p.budget, BUDGET_OPTIONS),
    costSplit: !!p.cost_split,
    group: !!p.group_travel,
    onePerson: !!p.one_person,
    invitations: !!p.invitations,
    intentions: known(p.connection_intentions, INTENTION_OPTIONS),
    genderPreference: knownOne(p.gender_preference, GENDER_PREF_OPTIONS),
  };
}

/** Primeiro item que falta, na ordem da tela (null = pode salvar). */
function firstMissing(d: Draft): string | null {
  if (d.photos.length === 0) return 'Adicione pelo menos uma foto';
  if (d.name.trim().length < 2) return 'Preencha seu nome';
  if (d.bio.trim().length < MIN_BIO) return `A bio precisa de mais ${MIN_BIO - d.bio.trim().length} caracteres`;
  if (!d.city.trim()) return 'Escolha sua cidade';
  if (!d.sex) return 'Escolha como você se identifica';
  if (!d.languages.length) return 'Escolha pelo menos um idioma';
  if (!d.destination.trim()) return 'Escolha sua próxima viagem';
  if (!d.isFlexible && (!d.checkIn || !d.checkOut)) return 'Escolha as datas ou marque que ainda não sabe';
  if (!d.isFlexible && new Date(d.checkOut) < new Date(d.checkIn)) return 'A volta precisa ser depois da ida';
  if (!d.companions) return 'Diga com quem você costuma viajar';
  if (!d.travelStyles.length) return 'Escolha pelo menos um jeito de viajar';
  if (d.interests.length < MIN_INTERESTS) return `Escolha pelo menos ${MIN_INTERESTS} interesses`;
  if (!d.budget) return 'Escolha uma faixa de orçamento';
  if (!(d.costSplit || d.group || d.onePerson || d.invitations)) return 'Escolha o que você topa na estrada';
  if (!d.intentions.length) return 'Escolha o que você procura';
  if (!d.genderPreference) return 'Escolha quem você quer ver primeiro';
  return null;
}

const toIsoDate = (value: string) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, city, sex, photos, bio, destination,
          check_in, check_out, is_flexible, companions,
          travel_styles, interests, budget, cost_split,
          group_travel, one_person, invitations, is_free,
          created_at, updated_at, connection_intentions,
          gender_preference, privacy_settings, dob, plan, languages
        `)
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 16 }}>
        <SkeletonLine width="50%" height={28} borderRadius={8} />
        <SkeletonLine width="100%" height={260} borderRadius={20} />
        <SkeletonLine width="100%" height={60} borderRadius={18} />
        <SkeletonLine width="100%" height={140} borderRadius={18} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary }}>Não conseguimos carregar seu perfil</Text>
        <Pressable onPress={() => refetch()} style={{ paddingHorizontal: 20, height: 48, borderRadius: 16, justifyContent: 'center', backgroundColor: colors.primarySoft }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  return <EditForm profile={profile} />;
}

function EditForm({ profile }: { profile: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const initial = useMemo(() => toDraft(profile), [profile]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const missing = firstMissing(draft);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setError(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const toggle = (key: 'languages' | 'travelStyles' | 'interests' | 'intentions', id: string) =>
    set(key, draft[key].includes(id) ? draft[key].filter((x) => x !== id) : [...draft[key], id]);

  const leave = () => router.back();
  const handleBack = () => {
    if (!dirty) return leave();
    const msg = 'Suas alterações não salvas serão perdidas.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Sair sem salvar? ${msg}`)) leave();
    } else {
      Alert.alert('Sair sem salvar?', msg, [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: leave },
      ]);
    }
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) set('photos', [...draft.photos, result.assets[0].uri].slice(0, MAX_PHOTOS));
    } catch {
      setError('Não foi possível abrir suas fotos.');
    }
  };

  const makeCover = (i: number) => {
    if (i === 0) return;
    Haptics.selectionAsync();
    const next = [...draft.photos];
    const [photo] = next.splice(i, 1);
    set('photos', [photo, ...next]);
  };

  const handleSave = async () => {
    if (missing || !dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sua sessão expirou. Entre de novo para salvar.');

      // Fotos novas sobem para o Storage; nunca gravamos caminho local do aparelho.
      const photos: string[] = [];
      for (let i = 0; i < draft.photos.length; i++) {
        try {
          photos.push(await uploadPhoto(user.id, draft.photos[i], i));
        } catch (e) {
          console.warn('Falha ao enviar foto', i, e);
        }
      }
      if (photos.length === 0) throw new Error('Não conseguimos enviar suas fotos. Verifique a conexão.');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          photos,
          name: draft.name.trim(),
          bio: draft.bio.trim(),
          city: draft.city.trim(),
          sex: draft.sex,
          languages: draft.languages,
          destination: draft.destination.trim(),
          check_in: draft.isFlexible ? null : toIsoDate(draft.checkIn),
          check_out: draft.isFlexible ? null : toIsoDate(draft.checkOut),
          is_flexible: draft.isFlexible,
          companions: draft.companions,
          travel_styles: draft.travelStyles,
          interests: draft.interests,
          budget: draft.budget,
          cost_split: draft.costSplit,
          group_travel: draft.group,
          one_person: draft.onePerson,
          invitations: draft.invitations,
          connection_intentions: draft.intentions,
          gender_preference: draft.genderPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updateError) throw new Error('Não foi possível salvar. Tente de novo em instantes.');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['myProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['discoveryTravelers'] }),
      ]);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Algo deu errado. Tente de novo.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Cabeçalho */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
        >
          <CaretLeft size={20} weight="bold" color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle} accessibilityRole="header">Editar perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Fotos */}
        <SectionTitle icon={ImageSquare} title="Fotos" hint="Toque numa foto para torná-la a capa." s={s} colors={colors} />
        <View style={s.photoGrid}>
          {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
            const uri = draft.photos[i];
            if (uri) {
              return (
                <Pressable key={uri} onPress={() => makeCover(i)} accessibilityLabel={i === 0 ? 'Foto de capa' : `Tornar foto ${i + 1} a capa`} style={s.photoTile}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  {i === 0 && <View style={s.coverBadge}><Text style={s.coverBadgeText}>Capa</Text></View>}
                  <Pressable
                    onPress={() => set('photos', draft.photos.filter((_, j) => j !== i))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover foto ${i + 1}`}
                    hitSlop={6}
                    style={s.removePhoto}
                  >
                    <X size={14} weight="bold" color="#FFFFFF" />
                  </Pressable>
                </Pressable>
              );
            }
            const isNext = i === draft.photos.length;
            return (
              <Pressable
                key={`empty-${i}`}
                onPress={isNext ? pickPhoto : undefined}
                disabled={!isNext}
                accessibilityRole="button"
                accessibilityLabel="Adicionar foto"
                style={({ pressed }) => [s.photoTile, s.photoEmpty, !isNext && { opacity: 0.45 }, pressed && s.pressed]}
              >
                <ImageSquare size={28} weight="duotone" color={colors.primary} />
                {isNext && <Text style={s.photoEmptyText}>Adicionar</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Sobre você */}
        <SectionTitle icon={Quotes} title="Sobre você" s={s} colors={colors} />
        <Text style={s.label}>Nome</Text>
        <BigInput value={draft.name} onChangeText={(t) => set('name', t.slice(0, 40))} placeholder="Seu nome ou apelido" autoCapitalize="words" accessibilityLabel="Nome" style={s.input} />
        <Text style={s.label}>Bio</Text>
        <BigInput
          multiline
          value={draft.bio}
          onChangeText={(t) => set('bio', t.slice(0, MAX_BIO))}
          placeholder="Conte algo que só quem viaja com você sabe"
          accessibilityLabel="Bio"
          textAlignVertical="top"
          style={[s.input, { minHeight: 120, paddingTop: 14, fontWeight: '400', lineHeight: 23 }]}
        />
        <Text style={s.counter}>{`${draft.bio.length}/${MAX_BIO}`}</Text>
        <Text style={s.label}>Cidade onde mora</Text>
        <CityAutocomplete value={draft.city} onChangeText={(t) => set('city', t)} placeholder="Busque sua cidade" darkTheme={isDark} />
        <Text style={s.label}>Como você se identifica</Text>
        <View style={s.chips}>
          {GENDER_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.sex === o.id} onPress={() => set('sex', o.id)} />)}
        </View>

        <SectionTitle icon={Translate} title="Idiomas" s={s} colors={colors} />
        <View style={s.chips}>
          {LANGUAGE_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.languages.includes(o.id)} onPress={() => toggle('languages', o.id)} />)}
        </View>

        {/* Viagem */}
        <SectionTitle icon={AirplaneTilt} title="Próxima viagem" s={s} colors={colors} />
        <CityAutocomplete value={draft.destination} onChangeText={(t) => set('destination', t)} placeholder="Cidade ou país" darkTheme={isDark} />
        <View style={[s.datesRow, draft.isFlexible && { opacity: 0.4 }]} pointerEvents={draft.isFlexible ? 'none' : 'auto'}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Ida</Text>
            <CustomDatePicker value={draft.checkIn || null} onChange={(v) => set('checkIn', v)} placeholder="Escolher" minimumDate={new Date()} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Volta</Text>
            <CustomDatePicker value={draft.checkOut || null} onChange={(v) => set('checkOut', v)} placeholder="Escolher" minimumDate={draft.checkIn ? new Date(draft.checkIn) : new Date()} />
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          <OptionRow multi option={{ id: 'flex', label: 'Ainda não sei as datas' }} selected={draft.isFlexible} onPress={() => set('isFlexible', !draft.isFlexible)} />
        </View>
        <Text style={s.label}>Com quem você costuma viajar</Text>
        <View style={s.chips}>
          {COMPANION_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.companions === o.id} onPress={() => set('companions', o.id)} />)}
        </View>

        <SectionTitle icon={Backpack} title="Meu jeito de viajar" s={s} colors={colors} />
        <View style={s.chips}>
          {TRAVEL_STYLE_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.travelStyles.includes(o.id)} onPress={() => toggle('travelStyles', o.id)} />)}
        </View>

        <SectionTitle icon={Heart} title="Interesses" hint={`Pelo menos ${MIN_INTERESTS}.`} s={s} colors={colors} />
        <View style={s.chips}>
          {INTEREST_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.interests.includes(o.id)} onPress={() => toggle('interests', o.id)} />)}
        </View>

        <SectionTitle icon={HandCoins} title="Na estrada eu topo" s={s} colors={colors} />
        <View style={s.chips}>
          {SOCIAL_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.id}
              option={o}
              selected={draft[o.id]}
              onPress={() => {
                const next = !draft[o.id];
                setError(null);
                setDraft((d) => ({
                  ...d,
                  [o.id]: next,
                  // Grupo e "uma companhia por vez" se excluem
                  ...(next && o.id === 'group' ? { onePerson: false } : null),
                  ...(next && o.id === 'onePerson' ? { group: false } : null),
                }));
              }}
            />
          ))}
        </View>
        <Text style={s.label}>Orçamento por dia</Text>
        <View style={s.list}>
          {BUDGET_OPTIONS.map((o) => {
            const selected = draft.budget === o.id;
            return (
              <OptionRow
                key={o.id}
                option={o}
                selected={selected}
                onPress={() => set('budget', o.id)}
                leading={
                  <View style={[s.budgetTile, selected && { backgroundColor: colors.card }]}>
                    <Text style={[s.budgetGlyph, selected && { color: colors.primary }]}>{o.id}</Text>
                  </View>
                }
              />
            );
          })}
        </View>

        <SectionTitle icon={Compass} title="O que eu procuro" s={s} colors={colors} />
        <View style={s.chips}>
          {INTENTION_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.intentions.includes(o.id)} onPress={() => toggle('intentions', o.id)} />)}
        </View>
        <Text style={s.label}>Quem você quer ver primeiro</Text>
        <View style={s.chips}>
          {GENDER_PREF_OPTIONS.map((o) => <ChoiceChip key={o.id} option={o} selected={draft.genderPreference === o.id} onPress={() => set('genderPreference', o.id)} />)}
        </View>
      </ScrollView>

      {/* Rodapé fixo */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        {error ? (
          <View style={s.errorBanner} accessibilityRole="alert">
            <Warning size={18} weight="duotone" color={colors.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}
        {dirty && missing ? <Text style={s.missing}>{missing}</Text> : null}
        <Pressable
          onPress={handleSave}
          disabled={!dirty || !!missing || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !dirty || !!missing || saving }}
          style={({ pressed }) => [s.cta, (!dirty || missing || saving) && s.ctaDisabled, pressed && dirty && !missing && s.pressed]}
        >
          {saving ? (
            <View style={s.ctaInner}>
              <ActivityIndicator color={colors.onPrimary} />
              <Text style={s.ctaText}>Salvando…</Text>
            </View>
          ) : (
            <Text style={[s.ctaText, (!dirty || missing) && s.ctaTextDisabled]}>
              {dirty ? 'Salvar alterações' : 'Nenhuma alteração'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ icon: SectionIcon, title, hint, s, colors }: {
  icon: Icon;
  title: string;
  hint?: string;
  s: ReturnType<typeof getStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={s.sectionTitleWrap}>
      <View style={s.sectionTitleRow}>
        <SectionIcon size={22} weight="duotone" color={colors.primary} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {hint ? <Text style={s.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  pressed: { transform: [{ scale: 0.98 }] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },

  sectionTitleWrap: { marginTop: 32, marginBottom: 14, gap: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.4 },
  sectionHint: { fontSize: 14, color: c.textSecondary },
  label: { fontSize: 14, fontWeight: '600', color: c.textSecondary, marginTop: 18, marginBottom: 8 },
  input: { fontSize: 17 },
  counter: { alignSelf: 'flex-end', marginTop: 6, fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 10 },
  datesRow: { flexDirection: 'row', gap: 12 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoTile: { width: '48%', flexGrow: 1, aspectRatio: 4 / 5, borderRadius: 18, overflow: 'hidden', backgroundColor: c.surface },
  photoEmpty: {
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.primary, backgroundColor: c.primarySoft,
  },
  photoEmptyText: { fontSize: 14, fontWeight: '600', color: c.primary },
  coverBadge: {
    position: 'absolute', left: 10, top: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, backgroundColor: 'rgba(10,10,12,0.6)',
  },
  coverBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  removePhoto: {
    position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(10,10,12,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  budgetTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  budgetGlyph: { fontSize: 15, fontWeight: '800', color: c.textSecondary, letterSpacing: -0.5 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, backgroundColor: c.background,
  },
  missing: { textAlign: 'center', fontSize: 14, color: c.textMuted },
  cta: {
    height: 56, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4,
  },
  ctaDisabled: { backgroundColor: c.surface, shadowOpacity: 0, elevation: 0 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
  ctaTextDisabled: { color: c.textMuted },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.errorSoft },
  errorText: { flex: 1, fontSize: 14, fontWeight: '600', color: c.error },
});
