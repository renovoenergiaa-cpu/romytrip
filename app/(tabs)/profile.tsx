import { useMemo, useState } from 'react';
import {
  ActivityIndicator, DeviceEventEmitter, Image, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useTheme, type ThemeColors } from '../../src/theme';
import { SkeletonLine } from '../../src/components/SkeletonLoader';
import { useDeleteFeedPost, useUpdatePostCaption } from '../../src/hooks/useFeed';
import PostOptionsSheet from '../../src/components/PostOptionsSheet';
import MomentoDetailModal from '../../src/components/MomentoDetailModal';
import { Tag } from '../../src/features/onboarding/components';
import {
  AirplaneTilt, ArrowRight, Backpack, Compass, Crown, GearSix, HandCoins, Heart, ImageSquare,
  PencilSimple, Plus, Quotes, Translate, X, type Icon,
} from '../../src/features/onboarding/icons';
import {
  BUDGET_OPTIONS, COMPANION_OPTIONS, INTENTION_OPTIONS, INTEREST_OPTIONS, LANGUAGE_OPTIONS,
  SOCIAL_OPTIONS, TRAVEL_STYLE_OPTIONS, type Option,
} from '../../src/features/onboarding/options';
import { ageFromDob } from '../../src/features/onboarding/saveProfile';

/** Valor gravado → opção de exibição (com ícone). Valores antigos fora da lista aparecem como estão. */
const toOptions = (ids: string[] | null | undefined, options: Option[]): Option[] =>
  (ids || []).map((id) => options.find((o) => o.id === id) ?? { id, label: id });

const shortDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
};

// A busca de cidades devolve "País, País" quando o destino é um país
const placeName = (v?: string | null) =>
  v ? [...new Set(String(v).split(',').map((x) => x.trim()).filter(Boolean))].join(', ') : '';

const goToCreatePost =(router: ReturnType<typeof useRouter>) => {
  router.navigate('/(tabs)');
  setTimeout(() => DeviceEventEmitter.emit('openCreatePost'), 120);
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
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

  const { data: userPosts } = useQuery({
    queryKey: ['myPosts', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Error fetching user posts:', error);
        return [];
      }
      return data || [];
    },
  });

  const { data: connectionsCount } = useQuery({
    queryKey: ['myConnectionsCount', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${profile!.id},receiver_id.eq.${profile!.id}`);
      return count ?? 0;
    },
  });

  // Momentos: detalhe, opções e edição de legenda
  const [selectedMomento, setSelectedMomento] = useState<any>(null);
  const [optionsPost, setOptionsPost] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editedCaptionText, setEditedCaptionText] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);

  const { mutateAsync: deleteFeedPost } = useDeleteFeedPost();
  const { mutateAsync: updatePostCaption, isPending: isUpdatingCaption } = useUpdatePostCaption();

  const handleViewInFeed = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMomento(null);
    setOptionsPost(null);
    router.navigate('/(tabs)');
    setTimeout(() => DeviceEventEmitter.emit('scrollToPost', { postId }), 150);
    setTimeout(() => DeviceEventEmitter.emit('scrollToPost', { postId }), 450);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteFeedPost({ postId });
      if (selectedMomento?.id === postId) setSelectedMomento(null);
      setOptionsPost(null);
    } catch (e) {
      console.warn('Erro ao deletar post:', e);
    }
  };

  const handleSaveCaption = async () => {
    if (!editingPost) return;
    try {
      await updatePostCaption({ postId: editingPost.id, description: editedCaptionText });
      if (selectedMomento?.id === editingPost.id) {
        setSelectedMomento((prev: any) => (prev ? { ...prev, description: editedCaptionText, caption: editedCaptionText } : null));
      }
      setEditingPost(null);
    } catch (e) {
      console.warn('Erro ao atualizar legenda:', e);
    }
  };

  const goEdit = () => {
    Haptics.selectionAsync();
    router.push('/edit-profile');
  };

  /* ─── Estados de carregamento e erro ─── */
  if (isLoading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 16 }]}>
        <SkeletonLine width="45%" height={30} borderRadius={8} />
        <SkeletonLine width="100%" height={420} borderRadius={28} />
        <SkeletonLine width="100%" height={64} borderRadius={20} />
        <SkeletonLine width="100%" height={120} borderRadius={20} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={[s.screen, s.centered, { paddingTop: insets.top }]}>
        <Text style={s.errorTitle}>Não conseguimos carregar seu perfil</Text>
        <Pressable onPress={() => refetch()} style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}>
          <Text style={s.secondaryBtnText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  /* ─── Dados reais do perfil (nada inventado quando falta algo) ─── */
  const p = profile as any;
  const photos: string[] = (p.photos || []).filter(Boolean);
  const currentPhoto = photos[Math.min(photoIndex, Math.max(photos.length - 1, 0))];
  const age = p.dob ? ageFromDob(p.dob) : null;
  const firstName = String(p.name || '').trim().split(/\s+/)[0] || 'Você';
  const cityShort = p.city ? String(p.city).split(',')[0] : null;
  const destinationShort = p.destination ? String(p.destination).split(',')[0] : null;
  const tripDates = p.is_flexible
    ? 'Datas em aberto'
    : [shortDate(p.check_in), shortDate(p.check_out)].filter(Boolean).join(' – ') || null;

  const intentions = toOptions(p.connection_intentions, INTENTION_OPTIONS);
  const styles_ = toOptions(p.travel_styles, TRAVEL_STYLE_OPTIONS);
  const interests = toOptions(p.interests, INTEREST_OPTIONS);
  const languages = toOptions(p.languages, LANGUAGE_OPTIONS);
  const social = SOCIAL_OPTIONS.filter((o) =>
    ({ costSplit: p.cost_split, group: p.group_travel, onePerson: p.one_person, invitations: p.invitations })[o.id]
  );
  const companion = COMPANION_OPTIONS.find((o) => o.id === p.companions);
  const budget = BUDGET_OPTIONS.find((o) => o.id === p.budget);
  const isPremium = p.plan === 'premium' || p.plan === 'gold';

  // "Falta pouco": só o que de fato está faltando
  const missing = [
    photos.length < 3 && `mais fotos (${photos.length} de 4)`,
    String(p.bio || '').trim().length < 60 && 'uma bio mais completa',
    languages.length === 0 && 'seus idiomas',
    interests.length < 3 && 'mais interesses',
  ].filter(Boolean) as string[];

  const momentos = userPosts || [];

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={s.header}>
          <Pressable
            onLongPress={__DEV__ ? () => router.push('/dev-seed') : undefined}
            accessibilityRole="header"
          >
            <Text style={s.headerTitle}>Meu perfil</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/settings'); }}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
            hitSlop={8}
            style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          >
            <GearSix size={22} weight="duotone" color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Cartão: como os outros te veem */}
        <View style={s.heroCard}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Foto de ${firstName}`} />
          ) : (
            <LinearGradient colors={[colors.primary, colors.accent]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          )}

          {/* Toque nas laterais para trocar de foto */}
          {photos.length > 1 && (
            <>
              <View style={s.photoBars}>
                {photos.map((_, i) => (
                  <View key={i} style={[s.photoBar, i === photoIndex && s.photoBarActive]} />
                ))}
              </View>
              <View style={s.photoTapZones}>
                <Pressable style={{ flex: 1 }} onPress={() => setPhotoIndex((i) => Math.max(i - 1, 0))} accessibilityLabel="Foto anterior" />
                <Pressable style={{ flex: 1 }} onPress={() => setPhotoIndex((i) => Math.min(i + 1, photos.length - 1))} accessibilityLabel="Próxima foto" />
              </View>
            </>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(10,10,12,0.82)']}
            locations={[0.42, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Pressable
            onPress={goEdit}
            accessibilityRole="button"
            style={({ pressed }) => [s.editPill, pressed && s.pressed]}
          >
            <PencilSimple size={16} weight="bold" color="#FFFFFF" />
            <Text style={s.editPillText}>Editar</Text>
          </Pressable>

          <View style={s.heroInfo} pointerEvents="none">
            <Text style={s.heroName} numberOfLines={1}>
              {firstName}
              {age ? <Text style={s.heroAge}>{`, ${age}`}</Text> : null}
            </Text>
            {cityShort ? <Text style={s.heroMeta}>{cityShort}</Text> : null}
            {destinationShort ? (
              <View style={s.heroTrip}>
                <AirplaneTilt size={16} weight="fill" color="#FFFFFF" />
                <Text style={s.heroTripText} numberOfLines={1}>
                  {`Próxima parada: ${destinationShort}${tripDates ? ` · ${tripDates}` : ''}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Números reais */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statValue}>{momentos.length}</Text>
            <Text style={s.statLabel}>{momentos.length === 1 ? 'momento' : 'momentos'}</Text>
          </View>
          <View style={s.statDivider} />
          <Pressable style={s.stat} onPress={() => router.navigate('/(tabs)/connections')}>
            <Text style={s.statValue}>{connectionsCount ?? '–'}</Text>
            <Text style={s.statLabel}>{connectionsCount === 1 ? 'conexão' : 'conexões'}</Text>
          </Pressable>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{languages.length}</Text>
            <Text style={s.statLabel}>{languages.length === 1 ? 'idioma' : 'idiomas'}</Text>
          </View>
        </View>

        {/* Falta pouco (só aparece se faltar algo) */}
        {missing.length > 0 && (
          <Pressable onPress={goEdit} style={({ pressed }) => [s.nudge, pressed && s.pressed]} accessibilityRole="button">
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.nudgeTitle}>Falta pouco para um perfil completo</Text>
              <Text style={s.nudgeText}>{`Adicione ${missing.join(', ')}. Perfis completos recebem mais conexões.`}</Text>
            </View>
            <ArrowRight size={18} weight="bold" color={colors.primary} />
          </Pressable>
        )}

        {/* Premium */}
        {!isPremium && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/(modals)/paywall'); }}
            style={({ pressed }) => [s.premium, pressed && s.pressed]}
            accessibilityRole="button"
          >
            <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.premiumIcon}>
              <Crown size={20} weight="fill" color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.premiumTitle}>Romy Premium</Text>
              <Text style={s.premiumText}>Tradução com IA nas conversas e recursos exclusivos</Text>
            </View>
            <ArrowRight size={18} weight="bold" color={colors.textSecondary} />
          </Pressable>
        )}

        {/* Seções do perfil */}
        <Section icon={Quotes} title="Sobre mim" onPress={goEdit} empty={!p.bio} s={s} colors={colors}>
          {p.bio ? <Text style={s.bio} selectable>{p.bio}</Text> : null}
        </Section>

        <Section icon={Compass} title="O que eu procuro" onPress={goEdit} empty={!intentions.length} s={s} colors={colors}>
          <View style={s.tags}>{intentions.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>

        <Section icon={AirplaneTilt} title="Próxima viagem" onPress={goEdit} empty={!p.destination} s={s} colors={colors}>
          <Text style={s.tripTitle}>{placeName(p.destination)}</Text>
          <Text style={s.tripMeta}>
            {[tripDates, companion?.label && `Vou ${companion.id === 'Sozinho(a)' ? 'sozinho(a)' : companion.label.toLowerCase()}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Section>

        <Section icon={Backpack} title="Meu jeito de viajar" onPress={goEdit} empty={!styles_.length} s={s} colors={colors}>
          <View style={s.tags}>{styles_.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>

        <Section icon={Heart} title="Interesses" onPress={goEdit} empty={!interests.length} s={s} colors={colors}>
          <View style={s.tags}>{interests.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>

        <Section icon={Translate} title="Idiomas" onPress={goEdit} empty={!languages.length} s={s} colors={colors}>
          <View style={s.tags}>{languages.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>

        <Section icon={HandCoins} title="Na estrada eu topo" onPress={goEdit} empty={!social.length && !budget} s={s} colors={colors}>
          {social.length > 0 && <View style={s.tags}>{social.map((o) => <Tag key={o.id} option={o} />)}</View>}
          {budget && <Text style={[s.tripMeta, social.length > 0 && { marginTop: 12 }]}>{`Orçamento ${budget.label.toLowerCase()} · ${budget.desc}`}</Text>}
        </Section>

        {/* Momentos */}
        <View style={s.momentsHeader}>
          <Text style={s.sectionTitleLarge}>Momentos</Text>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); goToCreatePost(router); }}
            accessibilityRole="button"
            accessibilityLabel="Publicar momento"
            style={({ pressed }) => [s.newMomentBtn, pressed && s.pressed]}
          >
            <Plus size={16} weight="bold" color={colors.primary} />
            <Text style={s.newMomentText}>Novo</Text>
          </Pressable>
        </View>

        {momentos.length > 0 ? (
          <View style={s.grid}>
            {momentos.map((post: any) => {
              const uri = post.media_url || post.image_url;
              return (
                <Pressable
                  key={post.id}
                  onPress={() => { Haptics.selectionAsync(); setSelectedMomento(post); }}
                  onLongPress={() => setOptionsPost(post)}
                  accessibilityRole="button"
                  accessibilityLabel={post.description || 'Momento'}
                  style={({ pressed }) => [s.gridItem, pressed && { opacity: 0.85 }]}
                >
                  {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
                    <View style={[StyleSheet.absoluteFill, s.centered]}><ImageSquare size={24} weight="duotone" color={colors.textMuted} /></View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyMoments}>
            <View style={s.emptyIcon}><ImageSquare size={28} weight="duotone" color={colors.primary} /></View>
            <Text style={s.emptyTitle}>Seus momentos aparecem aqui</Text>
            <Text style={s.emptyText}>Fotos e vídeos das suas viagens ajudam outros viajantes a puxar conversa.</Text>
            <Pressable
              onPress={() => goToCreatePost(router)}
              style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnText}>Publicar primeiro momento</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <MomentoDetailModal
        visible={!!selectedMomento}
        onClose={() => setSelectedMomento(null)}
        post={selectedMomento}
        onViewInFeed={handleViewInFeed}
        onOptionsPress={(post) => setOptionsPost(post)}
      />

      <PostOptionsSheet
        visible={!!optionsPost}
        onClose={() => setOptionsPost(null)}
        post={optionsPost}
        title="Opções do momento"
        onViewInFeed={handleViewInFeed}
        onEditCaption={(post: any) => {
          setEditingPost(post);
          setEditedCaptionText(post.description || post.caption || '');
        }}
        onDelete={handleDeletePost}
        isOwner
      />

      {/* Editar legenda */}
      <Modal visible={!!editingPost} animationType="fade" transparent onRequestClose={() => setEditingPost(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Editar legenda</Text>
              <Pressable onPress={() => setEditingPost(null)} hitSlop={8} accessibilityLabel="Fechar">
                <X size={20} weight="bold" color={colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={s.modalInput}
              multiline
              value={editedCaptionText}
              onChangeText={setEditedCaptionText}
              placeholder="Escreva a legenda…"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
            />
            <Pressable
              onPress={handleSaveCaption}
              disabled={isUpdatingCaption}
              style={({ pressed }) => [s.primaryBtn, isUpdatingCaption && { opacity: 0.6 }, pressed && s.pressed]}
            >
              {isUpdatingCaption ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.primaryBtnText}>Salvar legenda</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Section({ icon: SectionIcon, title, onPress, empty, children, s, colors }: {
  icon: Icon;
  title: string;
  onPress: () => void;
  empty: boolean;
  children?: React.ReactNode;
  s: ReturnType<typeof getStyles>;
  colors: ThemeColors;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Abre a edição do perfil" style={({ pressed }) => [s.section, pressed && s.pressed]}>
      <View style={s.sectionHeader}>
        <SectionIcon size={20} weight="duotone" color={colors.primary} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {empty ? <Text style={s.sectionEmpty}>Adicionar</Text> : children}
    </Pressable>
  );
}

const getStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  pressed: { transform: [{ scale: 0.98 }] },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },

  heroCard: {
    width: '100%', aspectRatio: 4 / 5, borderRadius: 28, overflow: 'hidden',
    backgroundColor: c.surface, justifyContent: 'flex-end',
  },
  photoBars: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 4, zIndex: 2 },
  photoBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  photoBarActive: { backgroundColor: '#FFFFFF' },
  photoTapZones: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', zIndex: 1 },
  editPill: {
    position: 'absolute', top: 26, right: 14, zIndex: 3,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 36, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: 'rgba(10,10,12,0.5)',
  },
  editPillText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  heroInfo: { padding: 22, gap: 2 },
  heroName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8 },
  heroAge: { fontWeight: '500' },
  heroMeta: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.88)' },
  heroTrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 10, paddingHorizontal: 12, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTripText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderRadius: 20,
    backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: c.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, color: c.textSecondary },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: c.border },

  nudge: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20,
    backgroundColor: c.primarySoft,
  },
  nudgeTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  nudgeText: { fontSize: 14, lineHeight: 20, color: c.textSecondary },

  premium: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20,
    backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  premiumIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  premiumText: { fontSize: 14, lineHeight: 19, color: c.textSecondary },

  section: {
    padding: 18, borderRadius: 20, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.1 },
  sectionEmpty: { fontSize: 15, fontWeight: '600', color: c.primary },
  bio: { fontSize: 16, lineHeight: 24, color: c.textPrimary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tripTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  tripMeta: { fontSize: 15, lineHeight: 21, color: c.textSecondary, marginTop: 2 },

  momentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  sectionTitleLarge: { fontSize: 22, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.4 },
  newMomentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: c.primarySoft,
  },
  newMomentText: { fontSize: 14, fontWeight: '700', color: c.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, borderRadius: 20, overflow: 'hidden' },
  gridItem: { width: '32.6%', aspectRatio: 1, backgroundColor: c.surface },
  emptyMoments: {
    alignItems: 'center', padding: 24, gap: 8, borderRadius: 20, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: c.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  emptyText: { fontSize: 15, lineHeight: 21, color: c.textSecondary, textAlign: 'center', marginBottom: 8 },

  primaryBtn: {
    height: 52, paddingHorizontal: 22, borderRadius: 16, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },
  secondaryBtn: { height: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: c.primary },
  errorTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary },

  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 20 },
  modalCard: {
    width: '100%', maxWidth: 480, alignSelf: 'center', borderRadius: 24, padding: 20, gap: 14,
    backgroundColor: c.card, shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0.5 : 0.18, shadowRadius: 24, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  modalInput: {
    minHeight: 110, borderRadius: 16, padding: 14, fontSize: 16, lineHeight: 22, textAlignVertical: 'top',
    color: c.textPrimary, backgroundColor: c.surface,
  },
});
