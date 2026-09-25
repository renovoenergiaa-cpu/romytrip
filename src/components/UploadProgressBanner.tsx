import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { CheckCircle, AlertCircle, X, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../theme';

export interface UploadingPostData {
  id: string;
  mediaUri: string;
  destination: string;
  description?: string;
  status: 'uploading' | 'success' | 'error';
  progress: number; // 0 to 100
  errorMessage?: string;
}

interface UploadProgressBannerProps {
  post: UploadingPostData | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function UploadProgressBanner({ post, onDismiss, onRetry }: UploadProgressBannerProps) {
  const { colors, isDark } = useTheme();

  if (!post) return null;

  const isUploading = post.status === 'uploading';
  const isSuccess = post.status === 'success';
  const isError = post.status === 'error';

  const cardBg = isDark ? '#16161A' : '#FFFFFF';
  const borderColor = isDark ? '#26262B' : '#E5E7EB';
  const progressTrack = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  const progressColor = isSuccess ? '#10B981' : isError ? '#EF4444' : '#6338FA';

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16)}
      exiting={FadeOutUp.duration(300)}
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
        },
      ]}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: post.mediaUri }} style={styles.thumbnail} resizeMode="cover" />
      </View>

      {/* Info & Progress */}
      <View style={styles.contentWrapper}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: isSuccess ? '#10B981' : isError ? '#EF4444' : colors.textPrimary }]} numberOfLines={1}>
            {isUploading && 'Publicando no feed...'}
            {isSuccess && 'Publicado com sucesso!'}
            {isError && 'Falha ao publicar'}
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {post.destination || post.description || 'Publicação'}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: progressTrack }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, Math.max(8, post.progress))}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Right action / status icon */}
      <View style={styles.actionWrapper}>
        {isUploading && (
          <ActivityIndicator size="small" color="#6338FA" />
        )}

        {isSuccess && (
          <CheckCircle size={22} color="#10B981" />
        )}

        {isError && (
          <View style={styles.errorActions}>
            {onRetry && (
              <TouchableOpacity onPress={onRetry} style={styles.iconBtn} activeOpacity={0.7}>
                <RotateCcw size={18} color="#6338FA" />
              </TouchableOpacity>
            )}
            {onDismiss && (
              <TouchableOpacity onPress={onDismiss} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 98 : 88,
    left: 14,
    right: 14,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  thumbnailWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  contentWrapper: {
    flex: 1,
    marginHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
    marginBottom: 6,
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  actionWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
});
