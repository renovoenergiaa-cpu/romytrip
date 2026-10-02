import { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../../src/theme';
import {
  useCommunity, useCommunityMembers, useCommunityPosts, useCreateCommunityPost, useDeleteCommunity,
  useDeleteCommunityPost, useJoinCommunity, useLeaveCommunity, useUpdateCommunityImage,
} from '../../src/hooks/useCommunities';
import { useCurrentUserId } from '../../src/hooks/useMessenger';
import { confirmAction, showError } from '../../src/lib/dialogs';
import { SkeletonLine } from '../../src/components/SkeletonLoader';
import { Avatar } from '../../src/features/onboarding/components';
import { ChatEmpty } from '../../src/features/chat/components';
import { ImageViewer } from '../../src/features/chat/conversation';
import { displayName, shortPlace } from '../../src/features/feed/format';
import { endsLabel, plural, soft, typeLook } from '../../src/features/communities/look';
import {
  ActionsSheet, CommunityPost, ComposePostSheet, MemberFaces, MembersSheet, pickImage, type Member, type SheetAction,
} from '../../src/features/communities/components';
import {
  Camera, CaretLeft, CaretRight, ChatCircleDots, Clock, DotsThreeVertical, ImageSquare, MapPin, SignOut, Trash, UsersThree, WifiSlash,
} from '../../src/features/onboarding/icons';

const COVER_H = 150;
const ICON = 88;

const tick = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

// Mensagens do banco em inglês (RLS, rede) viram um texto que a pessoa entende
const friendly = (e: any, fallback: string) => {
  const msg = String(e?.message ?? '');
  if (!msg || /row-level security|violates|permission denied/i.test(msg)) return fallback;
  if (/failed to fetch|network/i.test(msg)) return 'Confira sua internet e tente de novo.';
  return msg;
};

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myId = useCurrentUserId();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const community = useCommunity(id);
  const membersQ = useCommunityMembers(id);
  const postsQ = useCommunityPosts(id);
  const join = useJoinCommunity();
  const leave = useLeaveCommunity();
  const createPost = useCreateCommunityPost();
  const removeCommunity = useDeleteCommunity();
  const updateImage = useUpdateCommunityImage();
  const removePost = useDeleteCommunityPost();

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [postMenu, setPostMenu] = useState<any>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [scrollY] = useState(() => new Animated.Value(0));
  const headerOpacity = scrollY.interpolate({ inputRange: [COVER_H - 70, COVER_H - 20], outputRange: [0, 1], extrapolate: 'clamp' });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/communities'));

  const backButton = (
    <View style={[s.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable onPress={goBack} hitSlop={6} accessibilityRole="button" accessibilityLabel="Voltar" style={({ pressed }) => [s.roundBtn, pressed && s.pressed]}>
        <CaretLeft size={22} weight="bold" color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  /* ─── Carregando, erro e não encontrada ─── */
  if (community.isLoading) {
    return (
      <View style={s.screen} accessibilityLabel="Carregando comunidade">
        <SkeletonLine width="100%" height={insets.top + COVER_H} borderRadius={0} />
        <View style={[s.body, { gap: 12 }]}>
          <SkeletonLine width={ICON} height={ICON} borderRadius={28} style={{ marginTop: -ICON / 2 }} />
          <SkeletonLine width="60%" height={28} borderRadius={8} />
          <SkeletonLine width="40%" height={18} borderRadius={8} />
          <SkeletonLine width="100%" height={52} borderRadius={16} style={{ marginTop: 8 }} />
        </View>
        {backButton}
      </View>
    );
  }

  if (!community.data) {
    const failed = community.isError;
    return (
      <View style={[s.screen, { paddingTop: insets.top + 40 }]}>
        <ChatEmpty
          icon={failed ? WifiSlash : UsersThree}
          title={failed ? 'Não conseguimos carregar' : 'Comunidade não encontrada'}
          text={failed ? 'Confira sua internet e tente de novo.' : 'Ela pode ter sido excluída ou ser privada.'}
          action={failed ? 'Tentar de novo' : 'Ver comunidades'}
          onAction={failed ? () => community.refetch() : () => router.replace('/(tabs)/communities')}
          secondary={failed}
        />
        {backButton}
      </View>
    );
  }

  /* ─── Dados reais ─── */
  const c: any = community.data;
  const { color, Glyph } = typeLook(colors, c.type);
  const title = String(c.title ?? '').trim() || 'Comunidade';
  const members: Member[] = (membersQ.data as any)?.members ?? [];
  const membersKnown = !!membersQ.data;
  const isMember = !!(membersQ.data as any)?.isMember;
  const isCreator = !!myId && c.created_by === myId;
  const memberCount: number | null = membersKnown ? members.length : c.community_members?.[0]?.count ?? null;
  const posts: any[] = postsQ.data ?? [];
  const ends = c.type === 'Temporária' ? endsLabel(c.end_date) : null;
  const me = members.find((m) => m.user_id === myId);
  const updating = updateImage.isPending ? updateImage.variables?.kind : null;
  const deletingPostId = removePost.isPending ? removePost.variables?.postId : null;
  const showJoin = membersKnown && !isMember && c.type !== 'Privada';
  const summary = [
    memberCount != null ? plural(memberCount, 'membro', 'membros') : null,
    postsQ.data ? plural(posts.length, 'publicação', 'publicações') : null,
  ].filter(Boolean).join(' · ');

  /* ─── Ações ─── */
  const openProfile = (userId: string) => {
    setMembersOpen(false);
    router.push(userId === myId ? '/(tabs)/profile' : `/user/${userId}`);
  };

  const handleJoin = () => {
    join.mutate({ communityId: id }, {
      onSuccess: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
      onError: (e) => showError('Não foi possível entrar', friendly(e, 'Tente de novo em instantes.')),
    });
  };

  const changeImage = async (kind: 'icon' | 'cover') => {
    setOptionsOpen(false);
    await new Promise((r) => setTimeout(r, 200)); // a folha fecha antes da galeria abrir
    const uri = await pickImage(kind === 'icon' ? [1, 1] : [16, 9]);
    if (!uri) return;
    updateImage.mutate({ communityId: id, mediaUri: uri, kind }, {
      onError: (e) => showError(kind === 'icon' ? 'Não foi possível trocar o ícone' : 'Não foi possível trocar a capa', friendly(e, 'Tente de novo em instantes.')),
    });
  };

  const handleDelete = async () => {
    setOptionsOpen(false);
    const ok = await confirmAction({ title: 'Excluir comunidade?', message: `"${title}", o mural e o chat do grupo somem para todo mundo. Não dá para desfazer.`, confirmLabel: 'Excluir', destructive: true });
    if (!ok) return;
    removeCommunity.mutate({ communityId: id }, {
      onSuccess: () => router.replace('/(tabs)/communities'),
      onError: (e) => showError('Não foi possível excluir', friendly(e, 'Só quem criou a comunidade pode excluí-la.')),
    });
  };

  const handleLeave = async () => {
    setOptionsOpen(false);
    const isPrivate = c.type === 'Privada';
    const ok = await confirmAction({
      title: 'Sair da comunidade?',
      message: isPrivate
        ? 'Você sai do mural e do chat do grupo. Como ela é privada, não dá para voltar sozinho(a).'
        : 'Você sai do mural e do chat do grupo. Pode voltar quando quiser.',
      confirmLabel: 'Sair',
      destructive: true,
    });
    if (!ok) return;
    leave.mutate({ communityId: id, groupChatId: c.group_chat_id }, {
      onSuccess: () => { if (isPrivate) router.replace('/(tabs)/communities'); },
      onError: (e) => showError('Não foi possível sair', friendly(e, 'Tente de novo em instantes.')),
    });
  };

  const handleDeletePost = async () => {
    const post = postMenu;
    setPostMenu(null);
    if (!post) return;
    const ok = await confirmAction({ title: 'Excluir publicação?', message: 'Ela sai do mural para todo mundo.', confirmLabel: 'Excluir', destructive: true });
    if (!ok) return;
    removePost.mutate({ postId: post.id }, { onError: (e) => showError('Não foi possível excluir', friendly(e, 'Tente de novo em instantes.')) });
  };

  const handlePublish = async (text: string, imageUri: string | null) => {
    try {
      await createPost.mutateAsync({ communityId: id, content: text, mediaUri: imageUri ?? undefined });
      setComposeOpen(false);
      return true;
    } catch (e) {
      showError('Não foi possível publicar', friendly(e, 'Complete seu perfil para publicar (exclusivo para maiores de 18 anos).'));
      return false;
    }
  };

  const actions: SheetAction[] = isCreator
    ? [
        { key: 'cover', label: c.cover_url ? 'Trocar capa' : 'Adicionar capa', icon: ImageSquare, onPress: () => changeImage('cover') },
        { key: 'icon', label: c.icon_url ? 'Trocar ícone' : 'Adicionar ícone', icon: Camera, onPress: () => changeImage('icon') },
        { key: 'delete', label: 'Excluir comunidade', icon: Trash, onPress: handleDelete, danger: true },
      ]
    : isMember
      ? [{ key: 'leave', label: 'Sair da comunidade', icon: SignOut, onPress: handleLeave, danger: true }]
      : [];
  const busy = removeCommunity.isPending || leave.isPending;

  return (
    <View style={s.screen}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: (showJoin ? 112 : 40) + insets.bottom }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
      >
        {/* Capa */}
        <View style={[s.cover, { height: insets.top + COVER_H, backgroundColor: soft(color, isDark ? 0.22 : 0.16) }]}>
          {c.cover_url ? (
            <Image source={{ uri: c.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Capa de ${title}`} />
          ) : (
            <View style={s.watermark} pointerEvents="none"><Glyph size={150} weight="duotone" color={soft(color, 0.5)} /></View>
          )}
          {updating === 'cover' && <View style={[StyleSheet.absoluteFill, s.busyLayer]}><ActivityIndicator color="#FFFFFF" /></View>}
          {isCreator && !c.cover_url && !updating && (
            <Pressable onPress={() => changeImage('cover')} accessibilityRole="button" style={({ pressed }) => [s.coverPill, pressed && s.pressed]}>
              <Camera size={16} weight="bold" color={colors.textPrimary} />
              <Text style={s.coverPillText}>Adicionar capa</Text>
            </Pressable>
          )}
        </View>

        <View style={s.body}>
          {/* Ícone */}
          <Pressable
            onPress={() => changeImage('icon')}
            disabled={!isCreator || !!updating}
            accessibilityRole={isCreator ? 'button' : 'image'}
            accessibilityLabel={isCreator ? 'Trocar ícone da comunidade' : `Ícone de ${title}`}
            style={s.iconWrap}
          >
            {c.icon_url ? (
              <Image source={{ uri: c.icon_url }} style={s.icon} />
            ) : (
              <View style={[s.icon, { backgroundColor: colors.card }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: soft(color) }]} />
                <Glyph size={42} weight="duotone" color={color} />
              </View>
            )}
            {updating === 'icon' && <View style={[s.icon, s.busyLayer, { position: 'absolute' }]}><ActivityIndicator color="#FFFFFF" /></View>}
            {isCreator && !updating && <View style={s.iconBadge}><Camera size={14} weight="bold" color={colors.onPrimary} /></View>}
          </Pressable>

          <Text style={s.title} accessibilityRole="header">{title}</Text>

          <View style={s.metaRow}>
            <View style={[s.typePill, { backgroundColor: soft(color) }]}>
              <Glyph size={14} weight="fill" color={color} />
              <Text style={[s.typeText, { color }]}>{c.type ?? 'Comunidade'}</Text>
            </View>
            {c.location ? (
              <View style={s.metaItem}><MapPin size={15} weight="fill" color={colors.textMuted} /><Text style={s.metaText} numberOfLines={1}>{shortPlace(c.location)}</Text></View>
            ) : null}
            {ends ? (
              <View style={s.metaItem}><Clock size={15} weight="fill" color={colors.textMuted} /><Text style={s.metaText}>{ends}</Text></View>
            ) : null}
          </View>

          {c.description ? <Text style={s.desc}>{String(c.description).trim()}</Text> : null}

          {/* Quem está no grupo */}
          {summary ? (
            <Pressable
              onPress={() => { tick(); setMembersOpen(true); }}
              disabled={!members.length}
              accessibilityRole="button"
              accessibilityLabel={`${summary}. Ver membros`}
              style={({ pressed }) => [s.membersRow, pressed && s.pressed]}
            >
              {members.length ? <MemberFaces members={members} /> : null}
              <Text style={s.membersText} numberOfLines={1}>{summary}</Text>
              {members.length ? <CaretRight size={18} weight="bold" color={colors.textMuted} /> : null}
            </Pressable>
          ) : null}

          {isMember && c.group_chat_id ? (
            <Pressable onPress={() => { tick(); router.push(`/chat/${c.group_chat_id}`); }} accessibilityRole="button" style={({ pressed }) => [s.chatBtn, pressed && s.pressed]}>
              <ChatCircleDots size={22} weight="duotone" color={colors.onPrimary} />
              <Text style={s.chatText}>Abrir chat do grupo</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Mural */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityRole="header">Mural</Text>

          {isMember && (
            <Pressable onPress={() => { tick(); setComposeOpen(true); }} accessibilityRole="button" accessibilityLabel="Escrever no mural" style={({ pressed }) => [s.prompt, pressed && s.pressed]}>
              <Avatar photo={me?.users?.photos?.find(Boolean) || undefined} name={displayName(me?.users?.name)} size={40} />
              <Text style={s.promptText} numberOfLines={1}>Escreva algo para o grupo</Text>
              <ImageSquare size={22} weight="duotone" color={colors.primary} />
            </Pressable>
          )}

          {postsQ.isLoading ? (
            <View style={{ gap: 12 }}>
              <SkeletonLine width="100%" height={150} borderRadius={20} />
              <SkeletonLine width="100%" height={110} borderRadius={20} />
            </View>
          ) : postsQ.isError && !postsQ.data ? (
            <View style={s.note}>
              <Text style={s.noteTitle}>Não conseguimos carregar o mural</Text>
              <Pressable onPress={() => postsQ.refetch()} accessibilityRole="button" style={({ pressed }) => [s.softBtn, pressed && s.pressed]}>
                <Text style={s.softBtnText}>Tentar de novo</Text>
              </Pressable>
            </View>
          ) : posts.length === 0 ? (
            <View style={s.note}>
              <Text style={s.noteTitle}>O mural ainda está vazio</Text>
              <Text style={s.noteText}>
                {isMember ? 'Conte uma dica, marque um encontro ou mostre uma foto da viagem.' : 'Quem entra na comunidade pode publicar aqui.'}
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <CommunityPost
                key={post.id}
                post={post}
                canManage={post.user_id === myId || isCreator}
                busy={deletingPostId === post.id}
                onAuthor={() => openProfile(post.user_id)}
                onOptions={() => setPostMenu(post)}
                onOpenImage={setViewing}
              />
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Voltar e opções ficam sobre a capa; quando ela sai da tela, o topo ganha fundo e o nome */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, s.headerBg, { opacity: headerOpacity }]} pointerEvents="none" />
        <Pressable onPress={goBack} hitSlop={6} accessibilityRole="button" accessibilityLabel="Voltar" style={({ pressed }) => [s.roundBtn, pressed && s.pressed]}>
          <CaretLeft size={22} weight="bold" color={colors.textPrimary} />
        </Pressable>
        <Animated.Text style={[s.headerTitle, { opacity: headerOpacity }]} numberOfLines={1} aria-hidden>{title}</Animated.Text>
        {actions.length > 0 ? (
          <Pressable onPress={() => { tick(); setOptionsOpen(true); }} disabled={busy} hitSlop={6} accessibilityRole="button" accessibilityLabel="Opções da comunidade" style={({ pressed }) => [s.roundBtn, pressed && s.pressed]}>
            {busy ? <ActivityIndicator color={colors.textPrimary} /> : <DotsThreeVertical size={22} weight="bold" color={colors.textPrimary} />}
          </Pressable>
        ) : <View style={{ width: 44 }} />}
      </View>

      {showJoin && (
        <View style={[s.joinBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={handleJoin} disabled={join.isPending} accessibilityRole="button" style={({ pressed }) => [s.joinBtn, pressed && s.pressed]}>
            {join.isPending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.joinText}>Entrar na comunidade</Text>}
          </Pressable>
        </View>
      )}

      <ActionsSheet visible={optionsOpen} onClose={() => setOptionsOpen(false)} title={title} actions={actions} />
      <ActionsSheet
        visible={!!postMenu}
        onClose={() => setPostMenu(null)}
        title="Publicação"
        actions={[{ key: 'delete', label: 'Excluir publicação', icon: Trash, onPress: handleDeletePost, danger: true }]}
      />
      <MembersSheet visible={membersOpen} onClose={() => setMembersOpen(false)} members={members} creatorId={c.created_by} myId={myId} onPick={openProfile} />
      <ComposePostSheet visible={composeOpen} onClose={() => setComposeOpen(false)} communityName={title} pending={createPost.isPending} onPublish={handlePublish} />
      <ImageViewer uri={viewing} onClose={() => setViewing(null)} label="Foto do mural" />
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  pressed: { transform: [{ scale: 0.98 }] },

  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerBg: { backgroundColor: c.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: c.textPrimary, textAlign: 'center', letterSpacing: -0.2 },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },

  cover: { width: '100%', overflow: 'hidden' },
  watermark: { position: 'absolute', right: -18, bottom: -34, transform: [{ rotate: '-12deg' }] },
  busyLayer: { backgroundColor: 'rgba(10,10,12,0.45)', alignItems: 'center', justifyContent: 'center' },
  coverPill: {
    position: 'absolute', right: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  coverPillText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },

  body: { paddingHorizontal: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  iconWrap: { width: ICON, height: ICON, marginTop: -ICON / 2 },
  icon: {
    width: ICON, height: ICON, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: c.background,
  },
  iconBadge: {
    position: 'absolute', right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.background,
  },
  title: { fontSize: 28, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.7, marginTop: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13 },
  typeText: { fontSize: 13, fontWeight: '800' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { fontSize: 14, color: c.textSecondary, flexShrink: 1 },
  desc: { fontSize: 16, lineHeight: 24, color: c.textSecondary, marginTop: 14 },

  membersRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 18, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  membersText: { flex: 1, fontSize: 15, fontWeight: '600', color: c.textPrimary },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 12,
    borderRadius: 16, backgroundColor: c.primary,
  },
  chatText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },

  section: { paddingHorizontal: 20, marginTop: 28, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.4 },
  prompt: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 16, borderRadius: 20,
    backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  promptText: { flex: 1, fontSize: 16, color: c.textMuted },
  note: {
    alignItems: 'center', gap: 6, padding: 24, borderRadius: 20, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  noteTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  noteText: { fontSize: 15, lineHeight: 21, color: c.textSecondary, textAlign: 'center', maxWidth: 300 },
  softBtn: { height: 44, paddingHorizontal: 20, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  softBtnText: { fontSize: 15, fontWeight: '700', color: c.primary },

  joinBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: c.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  joinBtn: {
    height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    width: '100%', maxWidth: 520, alignSelf: 'center',
  },
  joinText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
});
