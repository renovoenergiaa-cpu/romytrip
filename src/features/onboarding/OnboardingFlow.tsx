import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CaretLeft, Flag, ImageSquare, MapPin, ShieldCheck, Warning, X } from './icons';
import { useOnboardingStore, type OnboardingData } from '../../store/onboardingStore';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CityAutocomplete } from '../../components/CityAutocomplete';
import { CustomDatePicker } from '../../components/CustomDatePicker';
import { useTheme, type ThemeColors } from '../../theme';
import { BigInput, ChoiceChip, OptionRow, ProfilePreview } from './components';
import {
  BIO_STARTERS, BUDGET_OPTIONS, COMPANION_OPTIONS, GENDER_OPTIONS, GENDER_PREF_OPTIONS, INTENTION_OPTIONS,
  INTEREST_OPTIONS, LANGUAGE_OPTIONS, SOCIAL_OPTIONS, TRAVEL_STYLE_OPTIONS, labelFor,
} from './options';
import { ageFromDob, saveProfile } from './saveProfile';

/* ─── Roteiro: uma pergunta por tela, em três capítulos ────────────────────── */

const CHAPTERS = ['Você', 'Sua viagem', 'Conexões'] as const;

const STEPS = [
  { id: 'name', chapter: 0 }, { id: 'dob', chapter: 0 }, { id: 'sex', chapter: 0 },
  { id: 'city', chapter: 0 }, { id: 'photos', chapter: 0 }, { id: 'bio', chapter: 0 },
  { id: 'languages', chapter: 0 },
  { id: 'destination', chapter: 1 }, { id: 'dates', chapter: 1 }, { id: 'companions', chapter: 1 },
  { id: 'styles', chapter: 1 }, { id: 'interests', chapter: 1 }, { id: 'budget', chapter: 1 },
  { id: 'social', chapter: 2 }, { id: 'intentions', chapter: 2 }, { id: 'genderPref', chapter: 2 },
  { id: 'pact', chapter: 2 },
] as const;
type StepId = (typeof STEPS)[number]['id'];

const MIN_INTERESTS = 3;
const MIN_BIO = 20;
const MAX_BIO = 300;
const MAX_PHOTOS = 4;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

function copyFor(id: StepId, d: OnboardingData): { title: string; subtitle?: string } {
  const n = firstName(d.name);
  switch (id) {
    case 'name': return { title: 'Como a galera vai te chamar?', subtitle: 'Pode ser apelido. É assim que você aparece para outros viajantes.' };
    case 'dob': return { title: n ? `Prazer, ${n}! Quando você nasceu?` : 'Quando você nasceu?', subtitle: 'O Romy é só para maiores de 18. No perfil aparece só a sua idade.' };
    case 'sex': return { title: 'Como você se identifica?' };
    case 'city': return { title: 'Onde fica a sua base?', subtitle: 'A cidade onde você mora. Nunca mostramos sua localização exata.' };
    case 'photos': return { title: 'Mostre seu lado viajante', subtitle: 'De 1 a 4 fotos. A primeira vira a capa do seu perfil.' };
    case 'bio': return { title: 'Conte algo que só quem viaja com você sabe', subtitle: 'Um pouco de personalidade ajuda a puxar conversa.' };
    case 'languages': return { title: 'Em quais idiomas você se vira?', subtitle: 'Ajuda a encontrar gente pra trocar ideia em qualquer lugar.' };
    case 'destination': return { title: 'Pra onde é a próxima?', subtitle: 'Plano certo ou sonho, vale os dois. A gente aproxima quem vai pro mesmo lugar.' };
    case 'dates': return { title: d.destination ? `E quando você vai pra ${d.destination.split(',')[0]}?` : 'E quando você vai?' };
    case 'companions': return { title: 'Com quem você costuma viajar?' };
    case 'styles': return { title: 'Qual é o seu jeito de viajar?', subtitle: 'Escolha quantos quiser.' };
    case 'interests': return { title: 'O que não pode faltar numa viagem?', subtitle: `Escolha pelo menos ${MIN_INTERESTS}. Quanto mais, melhores as sugestões.` };
    case 'budget': return { title: 'Quanto você costuma gastar por dia?', subtitle: 'Serve pra te aproximar de quem viaja num ritmo parecido com o seu.' };
    case 'social': return { title: 'O que você topa na estrada?', subtitle: 'Escolha quantos quiser.' };
    case 'intentions': return { title: 'O que você procura no Romy?', subtitle: 'Escolha quantos quiser.' };
    case 'genderPref': return { title: 'Quem você quer ver primeiro?', subtitle: 'Você pode mudar isso quando quiser nas configurações.' };
    case 'pact': return { title: n ? `Último passo, ${n}` : 'Último passo', subtitle: 'Aqui todo mundo segue o mesmo combinado.' };
  }
}

/** null = pode avançar; string = o que falta (aparece acima do botão). */
function missingFor(id: StepId, d: OnboardingData, dobText: string): string | null {
  switch (id) {
    case 'name': return d.name.trim().length >= 2 ? null : 'Digite como quer ser chamado(a)';
    case 'dob': {
      if (dobText.length < 10) return 'Digite a data completa';
      const age = ageFromDob(d.dob);
      if (age === null) return 'Essa data não existe';
      if (age < 18) return 'O Romy é só para maiores de 18 anos';
      if (age > 110) return 'Confira o ano de nascimento';
      return null;
    }
    case 'sex': return d.sex ? null : 'Escolha uma opção';
    case 'city': return d.city.trim() ? null : 'Escolha sua cidade';
    case 'photos': return d.photos.length > 0 ? null : 'Adicione pelo menos uma foto';
    case 'bio': {
      const len = d.bio.trim().length;
      return len >= MIN_BIO ? null : `Mais ${MIN_BIO - len} ${MIN_BIO - len === 1 ? 'caractere' : 'caracteres'}`;
    }
    case 'languages': return d.languages.length ? null : 'Escolha pelo menos um idioma';
    case 'destination': return d.destination.trim() ? null : 'Escolha um destino';
    case 'dates': {
      if (d.isFlexible) return null;
      if (!d.checkIn || !d.checkOut) return 'Escolha ida e volta, ou marque que ainda não sabe';
      return new Date(d.checkOut) >= new Date(d.checkIn) ? null : 'A volta precisa ser depois da ida';
    }
    case 'companions': return d.companions ? null : 'Escolha uma opção';
    case 'styles': return d.travelStyles.length ? null : 'Escolha pelo menos um';
    case 'interests': {
      const left = MIN_INTERESTS - d.interests.length;
      return left <= 0 ? null : `Falta${left > 1 ? 'm' : ''} ${left}`;
    }
    case 'budget': return d.budget ? null : 'Escolha uma faixa';
    case 'social': return d.costSplit || d.group || d.onePerson || d.invitations ? null : 'Escolha pelo menos um';
    case 'intentions': return d.connectionIntentions.length ? null : 'Escolha pelo menos um';
    case 'genderPref': return d.genderPreference ? null : 'Escolha uma opção';
    case 'pact': return null;
  }
}

const isoToBr = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');
const maskDate = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
};
const brToIso = (br: string) => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const valid = date.getFullYear() === Number(yyyy) && date.getMonth() === Number(mm) - 1 && date.getDate() === Number(dd);
  return valid ? `${yyyy}-${mm}-${dd}` : 'invalid';
};

/* ─── Tela ─────────────────────────────────────────────────────────────────── */

// Espera o progresso salvo carregar antes de montar o fluxo (evita piscar na pergunta 1).
export default function OnboardingFlow() {
  const { colors } = useTheme();
  const [hydrated, setHydrated] = useState(() => useOnboardingStore.persist.hasHydrated());
  useEffect(() => useOnboardingStore.persist.onFinishHydration(() => setHydrated(true)), []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Flow />;
}

function Flow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const { refreshProfile } = useAuth();

  const store = useOnboardingStore();
  const { updateField, toggleArrayItem, reset } = store;
  const data = store as OnboardingData;

  const stepIndex = Math.min(Math.max(store.stepIndex, 0), STEPS.length - 1);
  const step = STEPS[stepIndex];
  const [dobText, setDobText] = useState(() => isoToBr(store.dob));

  const [phase, setPhase] = useState<'form' | 'saving' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);

  // Entrada da pergunta: desliza no sentido da navegação (ease-out, 220ms)
  const [enter] = useState(() => new Animated.Value(1));
  const [direction, setDirection] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [stepIndex, enter]);

  const missing = missingFor(step.id, data, dobText);
  const chapterSteps = STEPS.filter((st) => st.chapter === step.chapter);
  const posInChapter = chapterSteps.findIndex((st) => st.id === step.id);

  const goTo = (index: number) => {
    setDirection(index > stepIndex ? 1 : -1);
    setError(null);
    updateField('stepIndex', index);
  };

  const leaveOnboarding = async () => {
    try { await supabase.auth.signOut(); } catch { /* sessão já encerrada */ }
    reset();
    router.replace('/(auth)/login');
  };

  const handleBack = () => {
    if (stepIndex > 0) return goTo(stepIndex - 1);
    const msg = 'Suas respostas serão apagadas.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Sair do cadastro? ${msg}`)) leaveOnboarding();
    } else {
      Alert.alert('Sair do cadastro?', msg, [
        { text: 'Continuar cadastro', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: leaveOnboarding },
      ]);
    }
  };

  const handleSubmit = async () => {
    setPhase('saving');
    setError(null);
    try {
      await saveProfile(useOnboardingStore.getState());
      await refreshProfile();
      setPhase('done');
    } catch (err: any) {
      setPhase('form');
      setError(err?.message ?? 'Algo deu errado. Tente de novo.');
    }
  };

  const handleNext = () => {
    if (missing || phase === 'saving') return;
    if (stepIndex === STEPS.length - 1) handleSubmit();
    else goTo(stepIndex + 1);
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        updateField('photos', [...data.photos, result.assets[0].uri].slice(0, MAX_PHOTOS));
      }
    } catch {
      setError('Não foi possível abrir suas fotos.');
    }
  };

  if (phase === 'done') {
    return (
      <Reveal
        data={data}
        onEnter={() => {
          reset();
          router.replace('/(tabs)');
        }}
      />
    );
  }

  const { title, subtitle } = copyFor(step.id, data);
  const age = ageFromDob(data.dob);
  const previewTags = [
    ...data.travelStyles.map((id) => labelFor(TRAVEL_STYLE_OPTIONS, id)),
    ...data.interests.map((id) => labelFor(INTEREST_OPTIONS, id)),
  ].slice(0, 2);

  const translateX = enter.interpolate({ inputRange: [0, 1], outputRange: [18 * direction, 0] });

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Topo: voltar · capítulo · progresso por capítulo */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={stepIndex === 0 ? 'Sair do cadastro' : 'Voltar'}
            hitSlop={8}
            style={({ pressed }) => [s.backBtn, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <CaretLeft size={20} weight="bold" color={colors.textPrimary} />
          </Pressable>
          <Text style={s.chapterLabel}>
            {CHAPTERS[step.chapter]}
            <Text style={s.chapterCount}>{`  ${posInChapter + 1}/${chapterSteps.length}`}</Text>
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.progressRow} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length, now: stepIndex + 1 }}>
          {CHAPTERS.map((_, ci) => {
            const steps = STEPS.filter((st) => st.chapter === ci);
            const fill = ci < step.chapter ? 1 : ci > step.chapter ? 0 : (posInChapter + 1) / steps.length;
            return (
              <View key={ci} style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${fill * 100}%` }]} />
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: enter, transform: [{ translateX }] }}>
          <Text style={s.title} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

          <View style={s.body}>
            {step.id === 'name' && (
              <BigInput
                autoFocus
                value={data.name}
                onChangeText={(t) => updateField('name', t.slice(0, 40))}
                placeholder="Seu nome ou apelido"
                autoCapitalize="words"
                autoComplete="given-name"
                returnKeyType="next"
                onSubmitEditing={handleNext}
                accessibilityLabel="Nome"
              />
            )}

            {step.id === 'dob' && (
              <>
                <BigInput
                  autoFocus
                  value={dobText}
                  onChangeText={(t) => {
                    const masked = maskDate(t);
                    setDobText(masked);
                    updateField('dob', masked.length === 10 ? brToIso(masked) : '');
                  }}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={10}
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                  accessibilityLabel="Data de nascimento"
                  invalid={dobText.length === 10 && !!missing}
                  style={{ letterSpacing: 1.5 }}
                />
                {dobText.length === 10 && !missing && age !== null && (
                  <Text style={s.dobOk}>{`Você tem ${age} anos.`}</Text>
                )}
              </>
            )}

            {step.id === 'sex' && (
              <View style={s.list}>
                {GENDER_OPTIONS.map((o) => (
                  <OptionRow key={o.id} option={o} selected={data.sex === o.id} onPress={() => updateField('sex', o.id)} />
                ))}
              </View>
            )}

            {step.id === 'city' && (
              <CityAutocomplete
                value={data.city}
                onChangeText={(t) => updateField('city', t)}
                placeholder="Busque sua cidade"
                darkTheme={isDark}
              />
            )}

            {step.id === 'photos' && (
              <View style={s.photoGrid}>
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                  const uri = data.photos[i];
                  if (uri) {
                    return (
                      <View key={i} style={s.photoTile}>
                        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        {i === 0 && <View style={s.coverBadge}><Text style={s.coverBadgeText}>Capa</Text></View>}
                        <Pressable
                          onPress={() => updateField('photos', data.photos.filter((_, j) => j !== i))}
                          accessibilityRole="button"
                          accessibilityLabel={`Remover foto ${i + 1}`}
                          hitSlop={6}
                          style={s.removePhoto}
                        >
                          <X size={14} weight="bold" color="#FFFFFF" />
                        </Pressable>
                      </View>
                    );
                  }
                  const isNext = i === data.photos.length;
                  return (
                    <Pressable
                      key={i}
                      onPress={isNext ? pickPhoto : undefined}
                      disabled={!isNext}
                      accessibilityRole="button"
                      accessibilityLabel="Adicionar foto"
                      style={({ pressed }) => [s.photoTile, s.photoEmpty, !isNext && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.97 }] }]}
                    >
                      <ImageSquare size={30} weight="duotone" color={colors.primary} />
                      {isNext && <Text style={s.photoEmptyText}>{i === 0 ? 'Foto de capa' : 'Adicionar'}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step.id === 'bio' && (
              <>
                <BigInput
                  autoFocus
                  multiline
                  value={data.bio}
                  onChangeText={(t) => updateField('bio', t.slice(0, MAX_BIO))}
                  placeholder="Ex.: vivo atrás de um bom café e de um mirante pro pôr do sol…"
                  accessibilityLabel="Bio"
                  textAlignVertical="top"
                  style={{ minHeight: 150, paddingTop: 16, fontSize: 17, fontWeight: '400', lineHeight: 24 }}
                />
                <Text style={s.counter}>{`${data.bio.length}/${MAX_BIO}`}</Text>
                <Text style={s.helperLabel}>Sem ideia? Comece por aqui</Text>
                <View style={s.chips}>
                  {BIO_STARTERS.map((starter) => (
                    <Pressable
                      key={starter}
                      onPress={() => updateField('bio', (data.bio.trim() ? `${data.bio.trim()} ` : '') + `${starter} `)}
                      style={({ pressed }) => [s.starter, pressed && { transform: [{ scale: 0.97 }] }]}
                    >
                      <Text style={s.starterText}>{`${starter}…`}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {step.id === 'languages' && (
              <View style={s.chips}>
                {LANGUAGE_OPTIONS.map((o) => (
                  <ChoiceChip key={o.id} option={o} selected={data.languages.includes(o.id)} onPress={() => toggleArrayItem('languages', o.id)} />
                ))}
              </View>
            )}

            {step.id === 'destination' && (
              <CityAutocomplete
                value={data.destination}
                onChangeText={(t) => updateField('destination', t)}
                placeholder="Cidade ou país"
                darkTheme={isDark}
              />
            )}

            {step.id === 'dates' && (
              <View style={s.list}>
                <View style={[s.datesRow, data.isFlexible && { opacity: 0.4 }]} pointerEvents={data.isFlexible ? 'none' : 'auto'}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>Ida</Text>
                    <CustomDatePicker
                      value={data.checkIn || null}
                      onChange={(v) => updateField('checkIn', v)}
                      placeholder="Escolher"
                      minimumDate={new Date()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>Volta</Text>
                    <CustomDatePicker
                      value={data.checkOut || null}
                      onChange={(v) => updateField('checkOut', v)}
                      placeholder="Escolher"
                      minimumDate={data.checkIn ? new Date(data.checkIn) : new Date()}
                    />
                  </View>
                </View>
                <OptionRow
                  multi
                  option={{ id: 'flex', label: 'Ainda não sei as datas', desc: 'Topo combinar com quem eu conhecer aqui' }}
                  selected={data.isFlexible}
                  onPress={() => updateField('isFlexible', !data.isFlexible)}
                />
              </View>
            )}

            {step.id === 'companions' && (
              <View style={s.list}>
                {COMPANION_OPTIONS.map((o) => (
                  <OptionRow key={o.id} option={o} selected={data.companions === o.id} onPress={() => updateField('companions', o.id)} />
                ))}
              </View>
            )}

            {step.id === 'styles' && (
              <View style={s.list}>
                {TRAVEL_STYLE_OPTIONS.map((o) => (
                  <OptionRow key={o.id} multi option={o} selected={data.travelStyles.includes(o.id)} onPress={() => toggleArrayItem('travelStyles', o.id)} />
                ))}
              </View>
            )}

            {step.id === 'interests' && (
              <View style={s.chips}>
                {INTEREST_OPTIONS.map((o) => (
                  <ChoiceChip key={o.id} option={o} selected={data.interests.includes(o.id)} onPress={() => toggleArrayItem('interests', o.id)} />
                ))}
              </View>
            )}

            {step.id === 'budget' && (
              <View style={s.list}>
                {BUDGET_OPTIONS.map((o) => {
                  const selected = data.budget === o.id;
                  return (
                    <OptionRow
                      key={o.id}
                      option={o}
                      selected={selected}
                      onPress={() => updateField('budget', o.id)}
                      leading={
                        <View style={[s.budgetTile, selected && { backgroundColor: colors.card }]}>
                          <Text style={[s.budgetGlyph, selected && { color: colors.primary }]}>{o.id}</Text>
                        </View>
                      }
                    />
                  );
                })}
              </View>
            )}

            {step.id === 'social' && (
              <View style={s.list}>
                {SOCIAL_OPTIONS.map((o) => (
                  <OptionRow
                    key={o.id}
                    multi
                    option={o}
                    selected={data[o.id]}
                    onPress={() => {
                      const next = !data[o.id];
                      updateField(o.id, next);
                      // Grupo e "uma companhia por vez" se excluem
                      if (next && o.id === 'group') updateField('onePerson', false);
                      if (next && o.id === 'onePerson') updateField('group', false);
                    }}
                  />
                ))}
              </View>
            )}

            {step.id === 'intentions' && (
              <View style={s.list}>
                {INTENTION_OPTIONS.map((o) => (
                  <OptionRow
                    key={o.id}
                    multi
                    option={o}
                    selected={data.connectionIntentions.includes(o.id)}
                    onPress={() => toggleArrayItem('connectionIntentions', o.id)}
                  />
                ))}
              </View>
            )}

            {step.id === 'genderPref' && (
              <View style={s.list}>
                {GENDER_PREF_OPTIONS.map((o) => (
                  <OptionRow key={o.id} option={o} selected={data.genderPreference === o.id} onPress={() => updateField('genderPreference', o.id)} />
                ))}
              </View>
            )}

            {step.id === 'pact' && (
              <View style={s.pact}>
                {[
                  { Icon: ShieldCheck, title: 'Respeito sempre', text: 'Tolerância zero com assédio, insistência ou comportamento invasivo.' },
                  { Icon: MapPin, title: 'Encontros em lugar público', text: 'E compartilhe seus planos com alguém de confiança.' },
                  { Icon: Flag, title: 'Denunciou, a gente age', text: 'Denúncias têm prioridade e podem levar a banimento imediato.' },
                ].map(({ Icon, title: ruleTitle, text }) => (
                  <View key={ruleTitle} style={s.pactRule}>
                    <View style={s.pactIcon}><Icon size={24} weight="duotone" color={colors.primary} /></View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.pactTitle}>{ruleTitle}</Text>
                      <Text style={s.pactText}>{text}</Text>
                    </View>
                  </View>
                ))}
                <Text style={s.pactNote}>Ao criar seu perfil, você concorda com o Pacto Romy e com os Termos de Uso.</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Rodapé fixo, no alcance do polegar */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        {error ? (
          <View style={s.errorBanner} accessibilityRole="alert">
            <Warning size={18} weight="duotone" color={colors.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}
        {stepIndex > 0 && data.name.trim() ? (
          <ProfilePreview name={data.name} age={age} city={data.city.split(',')[0]} photo={data.photos[0]} tags={previewTags} />
        ) : null}
        {missing && step.id !== 'pact' ? <Text style={s.missing}>{missing}</Text> : null}
        <Pressable
          onPress={handleNext}
          disabled={!!missing || phase === 'saving'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!missing || phase === 'saving' }}
          style={({ pressed }) => [s.cta, (missing || phase === 'saving') && s.ctaDisabled, pressed && !missing && { transform: [{ scale: 0.98 }] }]}
        >
          {phase === 'saving' ? (
            <View style={s.ctaInner}>
              <ActivityIndicator color={colors.onPrimary} />
              <Text style={s.ctaText}>Criando seu perfil…</Text>
            </View>
          ) : (
            <Text style={[s.ctaText, missing && s.ctaTextDisabled]}>
              {step.id === 'pact' ? 'Aceito e quero criar meu perfil' : 'Continuar'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── Revelação: o perfil pronto, como os outros vão ver ───────────────────── */

function Reveal({ data, onEnter }: { data: OnboardingData; onEnter: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [appear]);

  const age = ageFromDob(data.dob);
  const tags = data.interests.slice(0, 3).map((id) => INTEREST_OPTIONS.find((o) => o.id === id)).filter(Boolean);

  return (
    <View style={[s.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 0 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.title} accessibilityRole="header">{`Tudo pronto, ${firstName(data.name)}!`}</Text>
        <Text style={s.subtitle}>É assim que os outros viajantes vão te ver.</Text>

        <Animated.View
          style={[
            s.revealCard,
            {
              opacity: appear,
              transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            },
          ]}
        >
          {data.photos[0] ? <Image source={{ uri: data.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,12,0.78)']}
            locations={[0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.revealInfo}>
            <Text style={s.revealName}>
              {data.name.trim()}
              {age ? <Text style={s.revealAge}>{`, ${age}`}</Text> : null}
            </Text>
            <Text style={s.revealMeta}>{data.city.split(',')[0]}</Text>
            {data.destination ? (
              <Text style={s.revealMeta}>{`Próxima parada: ${data.destination.split(',')[0]}`}</Text>
            ) : null}
            <View style={[s.chips, { marginTop: 12 }]}>
              {tags.map((o) => {
                const Icon = o!.icon;
                return (
                  <View key={o!.id} style={s.revealTag}>
                    {Icon && <Icon size={16} weight="fill" color="#FFFFFF" />}
                    <Text style={s.revealTagText}>{o!.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 0 }]}>
        <Pressable
          onPress={onEnter}
          accessibilityRole="button"
          style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Text style={s.ctaText}>Explorar o Romy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 20, paddingBottom: 4, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterLabel: { fontSize: 15, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.1 },
  chapterCount: { fontWeight: '500', color: c.textMuted, fontVariant: ['tabular-nums'] },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: c.primary },

  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, lineHeight: 23, color: c.textSecondary, marginTop: 10 },
  body: { marginTop: 28 },
  list: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  dobOk: { marginTop: 12, fontSize: 15, fontWeight: '600', color: c.success },
  counter: { alignSelf: 'flex-end', marginTop: 8, fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
  helperLabel: { fontSize: 14, fontWeight: '600', color: c.textSecondary, marginTop: 20, marginBottom: 10 },
  starter: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: c.primarySoft,
  },
  starterText: { fontSize: 14, fontWeight: '600', color: c.primary },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: c.textSecondary, marginBottom: 8 },
  datesRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoTile: {
    width: '47%', flexGrow: 1, aspectRatio: 4 / 5, borderRadius: 20, overflow: 'hidden',
    backgroundColor: c.surface,
  },
  photoEmpty: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
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

  budgetTile: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  budgetGlyph: { fontSize: 15, fontWeight: '800', color: c.textSecondary, letterSpacing: -0.5 },

  pact: { gap: 18 },
  pactRule: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pactIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: c.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  pactTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  pactText: { fontSize: 15, lineHeight: 21, color: c.textSecondary },
  pactNote: { fontSize: 13, lineHeight: 19, color: c.textMuted, marginTop: 6 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center',
  },
  missing: { textAlign: 'center', fontSize: 14, color: c.textMuted },
  cta: {
    height: 56, borderRadius: 18, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4,
  },
  ctaDisabled: { backgroundColor: c.surface, shadowOpacity: 0, elevation: 0 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary, letterSpacing: -0.1 },
  ctaTextDisabled: { color: c.textMuted },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14,
    backgroundColor: c.errorSoft,
  },
  errorText: { flex: 1, fontSize: 14, fontWeight: '600', color: c.error },

  revealCard: {
    marginTop: 24, width: '100%', aspectRatio: 4 / 5, borderRadius: 28, overflow: 'hidden',
    backgroundColor: c.surface, justifyContent: 'flex-end',
  },
  revealInfo: { padding: 22 },
  revealName: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6 },
  revealAge: { fontWeight: '500' },
  revealMeta: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.88)', marginTop: 2 },
  revealTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  revealTagText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
