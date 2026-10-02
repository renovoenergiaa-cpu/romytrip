import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../theme';
import { ArrowClockwise, CheckCircle, X } from '../features/onboarding/icons';

export interface UploadingPostData {
  id: string;
  mediaUri: string;
  destination: string;
  description?: string;
  /** Não há como medir o envio de verdade: enquanto sobe, o banner mostra "Publicando…". */
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

/** Aviso no topo enquanto a publicação sobe, termina ou falha. */
export function UploadProgressBanner({ post, topOffset = 0, onDismiss, onRetry }: {
  post: UploadingPostData | null;
  /** Espaço para não cobrir as abas do topo. */
  topOffset?: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  if (!post) return null;

  const failed = post.status === 'error';
  const done = post.status === 'success';

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(160)}
      accessibilityLiveRegion="polite"
      style={[s.card, { top: insets.top + topOffset + 8 }]}
    >
      <Image source={{ uri: post.mediaUri }} style={s.thumb} resizeMode="cover" />
      <View style={s.texts}>
        <Text style={[s.title, failed && { color: colors.error }, done && { color: colors.success }]} numberOfLines={1}>
          {failed ? 'Não foi possível publicar' : done ? 'Publicado!' : 'Publicando…'}
        </Text>
        <Text style={s.subtitle} numberOfLines={failed ? 2 : 1}>
          {failed ? post.errorMessage || 'Confira sua conexão e tente de novo.' : post.destination || post.description || 'Sua publicação'}
        </Text>
      </View>
      {post.status === 'uploading' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      {done ? <CheckCircle size={24} weight="fill" color={colors.success} /> : null}
      {failed ? (
        <View style={s.actions}>
          {onRetry ? (
            <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Tentar de novo" hitSlop={8} style={s.iconBtn}>
              <ArrowClockwise size={20} weight="bold" color={colors.primary} />
            </Pressable>
          ) : null}
          {onDismiss ? (
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fechar aviso" hitSlop={8} style={s.iconBtn}>
              <X size={20} weight="bold" color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    position: 'absolute', left: 16, right: 16, zIndex: 40, flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, paddingRight: 14, borderRadius: 20, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 8,
  },
  thumb: { width: 48, height: 48, borderRadius: 14, backgroundColor: c.surface },
  texts: { flex: 1, minWidth: 0, gap: 1 },
  title: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 13, color: c.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
