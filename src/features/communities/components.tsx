import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useTheme, type ThemeColors } from '../../theme';
import { Sheet } from '../../components/Sheet';
import { Avatar } from '../onboarding/components';
import { showError } from '../../lib/dialogs';
import { timeAgo, displayName } from '../feed/format';
import { DotsThree, ImageSquare, X, type Icon } from '../onboarding/icons';

export type Member = { user_id: string; role?: string | null; users?: { name?: string | null; photos?: string[] | null } | null };

const firstPhoto = (photos?: string[] | null) => photos?.find(Boolean) || undefined;

/* ─── Publicação do mural ──────────────────────────────────────────────────── */

export function CommunityPost({ post, canManage, busy, onAuthor, onOptions, onOpenImage }: {
  post: any;
  canManage: boolean;
  busy: boolean;
  onAuthor: () => void;
  onOptions: () => void;
  onOpenImage: (uri: string) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => postStyles(colors), [colors]);
  const name = displayName(post.users?.name);
  const when = timeAgo(post.created_at);

  return (
    <View style={[s.card, busy && { opacity: 0.5 }]}>
      <View style={s.head}>
        <Pressable onPress={onAuthor} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} style={({ pressed }) => [s.author, pressed && { opacity: 0.7 }]}>
          <Avatar photo={firstPhoto(post.users?.photos)} name={name} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{name}</Text>
            {when ? <Text style={s.when}>{when}</Text> : null}
          </View>
        </Pressable>
        {canManage && (
          busy ? <ActivityIndicator color={colors.textMuted} /> : (
            <Pressable onPress={onOptions} hitSlop={8} accessibilityRole="button" accessibilityLabel="Opções da publicação" style={({ pressed }) => [s.more, pressed && { backgroundColor: colors.surface }]}>
              <DotsThree size={24} weight="bold" color={colors.textSecondary} />
            </Pressable>
          )
        )}
      </View>

      {post.content ? <Text style={s.text} selectable>{post.content}</Text> : null}

      {post.media_url ? (
        <Pressable onPress={() => onOpenImage(post.media_url)} accessibilityRole="imagebutton" accessibilityLabel="Ampliar foto">
          <ExpoImage source={{ uri: post.media_url }} style={s.photo} contentFit="cover" cachePolicy="memory-disk" />
        </Pressable>
      ) : null}
    </View>
  );
}

const postStyles = (c: ThemeColors) => StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },
  when: { fontSize: 13, color: c.textMuted, marginTop: 1 },
  more: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, lineHeight: 23, color: c.textPrimary },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: c.surface },
});

/* ─── Rostos de quem está no grupo ─────────────────────────────────────────── */

export function MemberFaces({ members, size = 32 }: { members: Member[]; size?: number }) {
  const { colors } = useTheme();
  const shown = members.slice(0, 4);
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((m, i) => (
        <View key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -10, borderRadius: size, borderWidth: 2, borderColor: colors.background }}>
          <Avatar photo={firstPhoto(m.users?.photos)} name={displayName(m.users?.name)} size={size} />
        </View>
      ))}
    </View>
  );
}

/* ─── Lista de membros ─────────────────────────────────────────────────────── */

export function MembersSheet({ visible, onClose, members, creatorId, myId, onPick }: {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  creatorId?: string | null;
  myId: string | null;
  onPick: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => rowStyles(colors), [colors]);

  return (
    <Sheet visible={visible} onClose={onClose} title={members.length === 1 ? '1 membro' : `${members.length} membros`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {members.map((m) => {
          const name = displayName(m.users?.name);
          const note = m.user_id === creatorId ? 'Criou a comunidade' : m.role === 'admin' ? 'Organiza' : null;
          return (
            <Pressable key={m.user_id} onPress={() => onPick(m.user_id)} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} style={({ pressed }) => [s.row, pressed && s.pressed]}>
              <Avatar photo={firstPhoto(m.users?.photos)} name={name} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.label} numberOfLines={1}>{m.user_id === myId ? `${name} (você)` : name}</Text>
                {note ? <Text style={s.sub}>{note}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

/* ─── Opções (capa, ícone, sair, excluir) ──────────────────────────────────── */

export type SheetAction = { key: string; label: string; icon: Icon; onPress: () => void; danger?: boolean };

export function ActionsSheet({ visible, onClose, title, actions }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  actions: SheetAction[];
}) {
  const { colors } = useTheme();
  const s = useMemo(() => rowStyles(colors), [colors]);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {actions.map((a) => (
        <Pressable key={a.key} onPress={a.onPress} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && s.pressed]}>
          <View style={[s.tile, a.danger && s.tileDanger]}>
            <a.icon size={22} weight="duotone" color={a.danger ? colors.error : colors.textPrimary} />
          </View>
          <Text style={[s.label, a.danger && { color: colors.error }]}>{a.label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

const rowStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderRadius: 16 },
  pressed: { backgroundColor: c.surface },
  tile: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  tileDanger: { backgroundColor: c.errorSoft },
  label: { fontSize: 17, fontWeight: '600', color: c.textPrimary, letterSpacing: -0.2 },
  sub: { fontSize: 14, color: c.textSecondary, marginTop: 1 },
});

/* ─── Escrever no mural ────────────────────────────────────────────────────── */

export async function pickImage(aspect?: [number, number]) {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError('Permissão necessária', 'Permita o acesso às suas fotos para escolher uma imagem.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      // No Android o recorte abre outra tela e pode reiniciar o app
      allowsEditing: Platform.OS === 'ios',
      aspect,
    });
    return !result.canceled ? result.assets?.[0]?.uri ?? null : null;
  } catch {
    showError('Não foi possível abrir', 'Não foi possível acessar a galeria.');
    return null;
  }
}

const MAX_POST = 1000;

export function ComposePostSheet({ visible, onClose, communityName, pending, onPublish }: {
  visible: boolean;
  onClose: () => void;
  communityName: string;
  pending: boolean;
  /** Devolve true quando publicou (aí o rascunho é limpo). */
  onPublish: (text: string, imageUri: string | null) => Promise<boolean>;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => composeStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const canPublish = (text.trim().length > 0 || !!image) && !pending;

  const publish = async () => {
    if (!canPublish) return;
    if (await onPublish(text, image)) { setText(''); setImage(null); }
  };

  return (
    <Sheet visible={visible} onClose={pending ? () => {} : onClose} title={`Publicar em ${communityName}`}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Uma dica, um convite, uma pergunta para o grupo…"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        multiline
        maxLength={MAX_POST}
        autoFocus={Platform.OS !== 'web'}
        accessibilityLabel="Texto da publicação"
        style={s.input}
      />

      {image ? (
        <View style={s.preview}>
          <Image source={{ uri: image }} style={s.previewImg} resizeMode="cover" accessibilityLabel="Foto escolhida" />
          <Pressable onPress={() => setImage(null)} disabled={pending} accessibilityRole="button" accessibilityLabel="Tirar foto" style={s.removeImg}>
            <X size={16} weight="bold" color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      <View style={s.bar}>
        <Pressable onPress={async () => { const uri = await pickImage(); if (uri) setImage(uri); }} disabled={pending} accessibilityRole="button" style={({ pressed }) => [s.photoBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
          <ImageSquare size={20} weight="duotone" color={colors.primary} />
          <Text style={s.photoBtnText}>{image ? 'Trocar foto' : 'Foto'}</Text>
        </Pressable>
        {text.length > MAX_POST - 100 ? <Text style={s.count}>{`${text.length}/${MAX_POST}`}</Text> : null}
      </View>

      <Pressable onPress={publish} disabled={!canPublish} accessibilityRole="button" style={({ pressed }) => [s.cta, !canPublish && s.ctaOff, pressed && canPublish && { transform: [{ scale: 0.98 }] }]}>
        {pending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[s.ctaText, !canPublish && { color: colors.textMuted }]}>Publicar</Text>}
      </Pressable>
    </Sheet>
  );
}

const composeStyles = (c: ThemeColors) => StyleSheet.create({
  input: {
    minHeight: 120, maxHeight: 220, borderRadius: 16, padding: 14, fontSize: 16, lineHeight: 23, textAlignVertical: 'top',
    color: c.textPrimary, backgroundColor: c.surface,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  preview: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  previewImg: { width: '100%', height: 180, backgroundColor: c.surface },
  removeImg: {
    position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(10,10,12,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.primarySoft },
  photoBtnText: { fontSize: 15, fontWeight: '700', color: c.primary },
  count: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  ctaOff: { backgroundColor: c.surface },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
});
