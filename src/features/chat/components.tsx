import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../../theme';
import { Avatar } from '../onboarding/components';
import {
  Archive, BellRinging, BellSlash, Camera, MagnifyingGlass, Microphone, Phone, SignOut, Trash,
  User, UsersThree, VideoCamera, X, type Icon,
} from '../onboarding/icons';
import type { Conversation } from '../../hooks/useMessenger';
import { isDeletedName, messagePreview, shortWhen, type PreviewIcon } from './format';

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/* ─── Quem é a conversa (nome e tipo de avatar) ───────────────────────────── */

export function describeConversation(chat: Conversation) {
  if (chat.is_group) return { kind: 'group' as const, name: chat.name?.trim() || 'Grupo', photo: undefined };
  const other = chat.other_participant;
  // Sem o outro participante, ele saiu da conversa (a exclusão só tira a própria pessoa da lista)
  if (!other) return { kind: 'left' as const, name: 'Conversa encerrada', photo: undefined };
  if (isDeletedName(other.name)) return { kind: 'deleted' as const, name: 'Conta excluída', photo: undefined };
  return { kind: 'person' as const, name: other.name?.trim() || 'Viajante', photo: other.photos?.[0] || undefined };
}

export function ChatAvatar({ kind, name, photo, size, colors }: {
  kind: ReturnType<typeof describeConversation>['kind'];
  name: string;
  photo?: string;
  size: number;
  colors: ThemeColors;
}) {
  if (kind === 'person') return <Avatar photo={photo} name={name} size={size} />;
  const GlyphIcon = kind === 'group' ? UsersThree : User;
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: kind === 'group' ? colors.primarySoft : colors.surface,
      }}
    >
      <GlyphIcon size={size * 0.46} weight="duotone" color={kind === 'group' ? colors.primary : colors.textMuted} />
    </View>
  );
}

const PREVIEW_ICONS: Record<PreviewIcon, Icon> = { photo: Camera, voice: Microphone, video: VideoCamera, call: Phone };

/* ─── Linha da lista ───────────────────────────────────────────────────────── */

export function ConversationRow({ chat, myId, onPress, onLongPress }: {
  chat: Conversation;
  myId: string | null;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => rowStyles(colors), [colors]);

  const { kind, name, photo } = describeConversation(chat);
  const preview = messagePreview(chat.last_message, myId, chat.is_group);
  const PreviewGlyph = preview.icon ? PREVIEW_ICONS[preview.icon] : null;
  const when = shortWhen(chat.last_message?.created_at ?? chat.created_at);
  const unread = chat.unread_count ?? 0;
  const muted = !!chat.is_muted;

  return (
    <Pressable
      onPress={() => { tick(); onPress(); }}
      onLongPress={() => { tick(); onLongPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${name}${unread ? `, ${unread} ${unread === 1 ? 'mensagem não lida' : 'mensagens não lidas'}` : ''}, ${preview.text}, ${when}`}
      accessibilityHint="Toque e segure para mais opções"
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <ChatAvatar kind={kind} name={name} photo={photo} size={56} colors={colors} />

      <View style={s.body}>
        <View style={s.line}>
          <View style={s.nameWrap}>
            <Text style={[s.name, unread > 0 && s.nameUnread]} numberOfLines={1}>{name}</Text>
            {muted && <BellSlash size={15} weight="duotone" color={colors.textMuted} />}
          </View>
          <Text style={[s.when, unread > 0 && !muted && s.whenUnread]}>{when}</Text>
        </View>

        <View style={s.line}>
          <View style={s.previewWrap}>
            {PreviewGlyph && <PreviewGlyph size={16} weight="duotone" color={colors.textMuted} />}
            <Text style={[s.preview, unread > 0 && s.previewUnread]} numberOfLines={1}>{preview.text}</Text>
          </View>
          {unread > 0 && (
            <View style={[s.badge, muted && s.badgeMuted]}>
              <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const rowStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  pressed: { backgroundColor: c.surface },
  body: { flex: 1, minWidth: 0, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '600', color: c.textPrimary, letterSpacing: -0.2 },
  nameUnread: { fontWeight: '800' },
  when: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
  whenUnread: { color: c.primary, fontWeight: '700' },
  previewWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  preview: { flexShrink: 1, fontSize: 15, color: c.textSecondary },
  previewUnread: { color: c.textPrimary, fontWeight: '600' },
  badge: {
    minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeMuted: { backgroundColor: c.textMuted },
  badgeText: { fontSize: 12, fontWeight: '800', color: c.onPrimary, fontVariant: ['tabular-nums'] },
});

/* ─── Busca e filtros ──────────────────────────────────────────────────────── */

export function SearchField({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => fieldStyles(colors), [colors]);
  return (
    <View style={s.box}>
      <MagnifyingGlass size={20} weight="duotone" color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar conversas"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Buscar conversas"
        style={s.input}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
          <X size={18} weight="bold" color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const fieldStyles = (c: ThemeColors) => StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: c.surface,
  },
  input: {
    flex: 1, fontSize: 16, color: c.textPrimary, paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});

export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => chipStyles(colors), [colors]);
  return (
    <Pressable
      onPress={() => { tick(); onPress(); }}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={({ pressed }) => [s.chip, selected && s.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Text style={[s.text, selected && s.textOn]}>{label}</Text>
    </Pressable>
  );
}

const chipStyles = (c: ThemeColors) => StyleSheet.create({
  chip: {
    height: 38, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border,
  },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  text: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  textOn: { color: c.onPrimary },
});

/* ─── Estado vazio / erro ──────────────────────────────────────────────────── */

export function ChatEmpty({ icon: EmptyIcon, title, text, action, onAction, secondary }: {
  icon: Icon;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
  /** Botão discreto (ex.: "Limpar busca", "Tentar de novo"). */
  secondary?: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => emptyStyles(colors), [colors]);
  return (
    <View style={s.wrap}>
      <View style={s.tile}><EmptyIcon size={32} weight="duotone" color={colors.primary} /></View>
      <Text style={s.title} accessibilityRole="header">{title}</Text>
      <Text style={s.text}>{text}</Text>
      {action && onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [s.btn, secondary && s.btnSecondary, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Text style={[s.btnText, secondary && s.btnTextSecondary]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const emptyStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 56, gap: 8 },
  tile: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: c.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 23, color: c.textSecondary, textAlign: 'center', maxWidth: 320 },
  btn: {
    height: 52, paddingHorizontal: 28, borderRadius: 16, backgroundColor: c.primary, marginTop: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondary: { backgroundColor: c.primarySoft, height: 48 },
  btnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },
  btnTextSecondary: { color: c.primary },
});

/* ─── Folha inferior (nova conversa e opções) ──────────────────────────────── */

function Sheet({ visible, onClose, title, children }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => sheetStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, enter]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: enter }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <Animated.View
          style={[
            s.card,
            { paddingBottom: Math.max(insets.bottom, 12) + 12, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
          ]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
              <X size={20} weight="bold" color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const sheetStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  card: {
    width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '80%',
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10,
    backgroundColor: c.card,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: c.border, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 },
});

/* ─── Opções da conversa (toque e segure) ──────────────────────────────────── */

export function ChatActionsSheet({ chat, onClose, onArchive, onMute, onLeave, busy }: {
  chat: Conversation | null;
  onClose: () => void;
  onArchive: () => void;
  onMute: () => void;
  onLeave: () => void;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => actionStyles(colors), [colors]);
  const name = chat ? describeConversation(chat).name : '';

  const actions: { key: string; label: string; icon: Icon; onPress: () => void; danger?: boolean }[] = chat
    ? [
        { key: 'archive', label: chat.is_archived ? 'Desarquivar' : 'Arquivar', icon: Archive, onPress: onArchive },
        { key: 'mute', label: chat.is_muted ? 'Reativar notificações' : 'Silenciar', icon: chat.is_muted ? BellRinging : BellSlash, onPress: onMute },
        { key: 'leave', label: chat.is_group ? 'Sair do grupo' : 'Excluir conversa', icon: chat.is_group ? SignOut : Trash, onPress: onLeave, danger: true },
      ]
    : [];

  return (
    <Sheet visible={!!chat} onClose={onClose} title={name}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [s.row, pressed && s.pressed, busy && { opacity: 0.5 }]}
        >
          <View style={[s.tile, a.danger && s.tileDanger]}>
            <a.icon size={22} weight="duotone" color={a.danger ? colors.error : colors.textPrimary} />
          </View>
          <Text style={[s.label, a.danger && { color: colors.error }]}>{a.label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

const actionStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderRadius: 16 },
  pressed: { backgroundColor: c.surface },
  tile: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  tileDanger: { backgroundColor: c.errorSoft },
  label: { fontSize: 17, fontWeight: '600', color: c.textPrimary },
});

/* ─── Nova conversa (escolher uma conexão) ─────────────────────────────────── */

type Person = { id: string; name: string | null; photos?: string[] | null; city?: string | null };

export function NewChatSheet({ visible, onClose, people, loading, failed, pendingId, onPick, onFindTravelers, onRetry }: {
  visible: boolean;
  onClose: () => void;
  people: Person[] | undefined;
  loading: boolean;
  failed: boolean;
  pendingId: string | null;
  onPick: (person: Person) => void;
  onFindTravelers: () => void;
  onRetry: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => personStyles(colors), [colors]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Nova conversa">
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} accessibilityLabel="Carregando conexões" />
      ) : failed ? (
        <View style={s.message}>
          <Text style={s.messageText}>Não conseguimos carregar suas conexões.</Text>
          <Pressable onPress={onRetry} accessibilityRole="button" style={s.secondaryBtn}>
            <Text style={s.secondaryBtnText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : people && people.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {people.map((p) => {
            const name = p.name?.trim() || 'Viajante';
            return (
              <Pressable
                key={p.id}
                onPress={() => onPick(p)}
                disabled={pendingId !== null}
                accessibilityRole="button"
                accessibilityLabel={`Conversar com ${name}`}
                style={({ pressed }) => [s.row, pressed && s.pressed, pendingId !== null && pendingId !== p.id && { opacity: 0.5 }]}
              >
                <Avatar photo={p.photos?.[0] || undefined} name={name} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>{name}</Text>
                  {p.city ? <Text style={s.city} numberOfLines={1}>{p.city.split(',')[0]}</Text> : null}
                </View>
                {pendingId === p.id && <ActivityIndicator color={colors.primary} />}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={s.message}>
          <Text style={s.messageText}>Você ainda não tem conexões. Conecte-se com viajantes para conversar.</Text>
          <Pressable onPress={onFindTravelers} accessibilityRole="button" style={s.secondaryBtn}>
            <Text style={s.secondaryBtnText}>Encontrar viajantes</Text>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const personStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderRadius: 16 },
  pressed: { backgroundColor: c.surface },
  name: { fontSize: 17, fontWeight: '600', color: c.textPrimary, letterSpacing: -0.2 },
  city: { fontSize: 14, color: c.textSecondary },
  message: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  messageText: { fontSize: 16, lineHeight: 23, color: c.textSecondary, textAlign: 'center', maxWidth: 300 },
  secondaryBtn: { height: 48, paddingHorizontal: 22, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: c.primary },
});
