import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Sheet } from './Sheet';
import { useTheme, type ThemeColors } from '../theme';
import { Eye, MapPin, PencilSimple, Trash, Warning, type Icon } from '../features/onboarding/icons';

export interface PostOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    media_url?: string;
    image_url?: string;
    destination?: string;
    description?: string;
    caption?: string;
    created_at?: string;
    user_id?: string;
  } | null;
  onViewInFeed?: (postId: string) => void;
  onEditCaption?: (post: any) => void;
  onDelete?: (postId: string) => Promise<void> | void;
  isOwner?: boolean;
  title?: string;
}

const tick = (style: 'Light' | 'Medium' | 'Warning') => {
  if (Platform.OS === 'web') return;
  if (style === 'Warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]).catch(() => {});
};

export default function PostOptionsSheet({
  visible, onClose, post, onViewInFeed, onEditCaption, onDelete, isOwner = true, title = 'Opções da publicação',
}: PostOptionsSheetProps) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  const close = () => { setConfirming(false); setDeleting(false); setError(false); onClose(); };

  const confirmDelete = async () => {
    if (!onDelete || !post) return;
    setDeleting(true);
    setError(false);
    tick('Warning');
    try {
      await onDelete(post.id);
      close();
    } catch {
      setDeleting(false);
      setError(true);
    }
  };

  const media = post?.media_url || post?.image_url;
  const caption = (post?.description || post?.caption || '').trim();

  const actions: { key: string; icon: Icon; label: string; text: string; danger?: boolean; onPress: () => void }[] = [];
  if (post && onViewInFeed) {
    actions.push({ key: 'feed', icon: Eye, label: 'Ver no feed', text: 'Abrir esta publicação no feed', onPress: () => { tick('Light'); close(); onViewInFeed(post.id); } });
  }
  if (post && isOwner && onEditCaption) {
    actions.push({ key: 'edit', icon: PencilSimple, label: 'Editar legenda', text: 'Mudar o texto da publicação', onPress: () => { tick('Light'); close(); onEditCaption(post); } });
  }
  if (post && isOwner && onDelete) {
    actions.push({ key: 'delete', icon: Trash, label: 'Excluir publicação', text: 'Remove do seu perfil e do feed', danger: true, onPress: () => { tick('Medium'); setConfirming(true); } });
  }

  return (
    <Sheet visible={visible && !!post} onClose={close} title={confirming ? 'Excluir publicação?' : title}>
      {confirming ? (
        <View style={s.confirm}>
          <View style={s.warnTile}><Warning size={30} weight="duotone" color={colors.error} /></View>
          <Text style={s.confirmText}>Isso não pode ser desfeito. A publicação some do feed e do seu perfil.</Text>
          {error ? <Text style={s.errorText}>Não conseguimos excluir agora. Tente de novo.</Text> : null}
          <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button" style={({ pressed }) => [s.dangerBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
            {deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.dangerText}>Sim, excluir</Text>}
          </Pressable>
          <Pressable onPress={() => { setConfirming(false); setError(false); }} disabled={deleting} accessibilityRole="button" style={s.keepBtn}>
            <Text style={s.keepText}>Manter publicação</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {media || caption || post?.destination ? (
            <View style={s.preview}>
              {media ? <Image source={{ uri: media }} style={s.thumb} accessibilityLabel="Foto da publicação" /> : null}
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={s.previewTitle} numberOfLines={1}>{caption || 'Sem legenda'}</Text>
                {post?.destination ? (
                  <View style={s.place}>
                    <MapPin size={14} weight="fill" color={colors.textSecondary} />
                    <Text style={s.placeText} numberOfLines={1}>{post.destination}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {actions.map((a) => (
            <Pressable key={a.key} onPress={a.onPress} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && s.pressed]}>
              <View style={[s.tile, a.danger && s.tileDanger]}>
                <a.icon size={22} weight="duotone" color={a.danger ? colors.error : colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, a.danger && { color: colors.error }]}>{a.label}</Text>
                <Text style={s.hint}>{a.text}</Text>
              </View>
            </Pressable>
          ))}
        </>
      )}
    </Sheet>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: c.surface, marginBottom: 8 },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.border },
  previewTitle: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  placeText: { fontSize: 13, color: c.textSecondary, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderRadius: 16 },
  pressed: { backgroundColor: c.surface },
  tile: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  tileDanger: { backgroundColor: c.errorSoft },
  label: { fontSize: 17, fontWeight: '600', color: c.textPrimary },
  hint: { fontSize: 14, color: c.textSecondary, marginTop: 1 },
  confirm: { alignItems: 'center', gap: 12, paddingTop: 4 },
  warnTile: { width: 64, height: 64, borderRadius: 22, backgroundColor: c.errorSoft, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 16, lineHeight: 23, color: c.textSecondary, textAlign: 'center', maxWidth: 320 },
  errorText: { fontSize: 14, fontWeight: '600', color: c.error, textAlign: 'center' },
  dangerBtn: { alignSelf: 'stretch', height: 52, borderRadius: 16, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  dangerText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  keepBtn: { alignSelf: 'stretch', height: 48, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  keepText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
});
