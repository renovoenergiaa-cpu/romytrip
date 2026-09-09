import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  BadgeCheck,
  UserPlus,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  MoreVertical,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../theme';

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;
export const FEED_SNAP_HEIGHT = height - TAB_BAR_HEIGHT;

export const getShortDestination = (destinationStr?: string) => {
  if (!destinationStr) return '';
  const parts = destinationStr.split(',').map((p) => p.trim());
  const filtered = parts.filter(
    (p) =>
      !/brasil|brazil|estado|state|country|republic/i.test(p) || parts.length === 1
  );

  let result = '';
  if (filtered.length >= 2) {
    result = `${filtered[0]}, ${filtered[1]}`;
  } else if (filtered.length === 1) {
    result = filtered[0];
  } else {
    result = parts[0];
  }

  if (result.length > 25) {
    return result.substring(0, 23) + '...';
  }
  return result;
};

export interface PostItemData {
  id: string;
  user_id: string;
  media_url: string;
  photos?: string[];
  media_type?: 'image' | 'video';
  aspect_ratio?: number;
  destination: string;
  description?: string;
  created_at?: string;
  audio_title?: string;
  audio_url?: string;
  users?: {
    name?: string;
    photos?: string[];
    travel_styles?: string[];
    city?: string;
    bio?: string;
  };
  post_likes?: { count: number }[];
  comments?: { count: number }[];
  saves_count?: number;
}

interface FeedPostItemProps {
  item: PostItemData;
  isVisible: boolean;
  isLiked: boolean;
  onLike: (id: string) => void;
  onOpenComments: (id: string) => void;
  onShare: (item: PostItemData) => void;
  onUserPress: (userId: string) => void;
  onOptionsPress?: () => void;
  isOwner?: boolean;
}

export default function FeedPostItem({
  item,
  isVisible,
  isLiked,
  onLike,
  onOpenComments,
  onShare,
  onUserPress,
  onOptionsPress,
  isOwner,
}: FeedPostItemProps) {
  const [aspectRatio, setAspectRatio] = useState<number>(item.aspect_ratio || 0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [showMuteIcon, setShowMuteIcon] = useState(false);
  const muteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(item.saves_count || 12);
  const soundRef = useRef<Audio.Sound | null>(null);
  const videoRef = useRef<Video>(null);
  const isFocused = useIsFocused();

  const actuallyVisible = isVisible && isFocused;

  const author = item.users || {};
  const defaultAvatar =
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';
  const avatarImage =
    author.photos && author.photos.length > 0 ? author.photos[0] : defaultAvatar;

  const likesCount = item.post_likes?.[0]?.count || 0;
  const commentsCount = item.comments?.[0]?.count || 0;
  const photosList = item.photos && item.photos.length > 0 ? item.photos : [item.media_url];
  const isMultiplePhotos = photosList.length > 1;

  const isVideo =
    item.media_type === 'video' ||
    (item.media_url &&
      (item.media_url.endsWith('.mp4') ||
        item.media_url.endsWith('.mov') ||
        item.media_url.endsWith('.webm') ||
        item.media_url.includes('/video/')));

  // Enable audio playback on iOS even in silent mode
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
      } catch (e) {
        // silent catch
      }
    })();
  }, []);

  // Audio: load & play when visible, unload when not visible
  useEffect(() => {
    if (!item.audio_url) return;

    let cancelled = false;

    async function loadAndPlay() {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: item.audio_url! },
          { shouldPlay: true, isLooping: true, isMuted }
        );
        if (cancelled) {
          newSound.unloadAsync();
          return;
        }
        soundRef.current = newSound;
        await newSound.playAsync();
      } catch (err) {
        console.log('Audio load error:', err);
      }
    }

    async function unloadSound() {
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (_) {}
        soundRef.current = null;
      }
    }

    if (actuallyVisible) {
      loadAndPlay();
    } else {
      unloadSound();
    }

    return () => {
      cancelled = true;
      unloadSound();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actuallyVisible, item.audio_url]);

  // Audio: apply mute/unmute without reloading the sound
  useEffect(() => {
    if (!soundRef.current) return;
    soundRef.current.setIsMutedAsync(isMuted).catch(() => {});
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Dynamic image size calculation
  useEffect(() => {
    if (!isVideo && item.media_url) {
      Image.getSize(
        item.media_url,
        (w, h) => {
          if (w > 0 && h > 0) {
            setAspectRatio(w / h);
          }
        },
        () => {}
      );
    }
  }, [item.media_url, isVideo]);

  // Vinyl record spinning animation
  const rotation = useSharedValue(0);
  // Like button spring scale
  const likeScale = useSharedValue(1);
  // Bookmark button spring scale
  const bookmarkScale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 4500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedVinylStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const animatedLikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const animatedBookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    setShowMuteIcon(true);
    if (muteTimeout.current) clearTimeout(muteTimeout.current);
    muteTimeout.current = setTimeout(() => setShowMuteIcon(false), 1500);
  };

  const handleToggleSave = () => {
    // Spring animation on bookmark
    bookmarkScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    setIsSaved((prev) => {
      setSaveCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const handleLike = () => {
    // Spring burst animation on heart
    likeScale.value = withSequence(
      withSpring(1.5, { damping: 3, stiffness: 400 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );
    onLike(item.id);
  };

  // Determine aspect ratio mode
  // < 0.63 => Full Screen 9:16 Vertical Cover
  // >= 0.63 => TikTok Centered Edge-to-Edge Media with Ambient Backdrop
  const isFullVertical = aspectRatio < 0.63;

  return (
    <View style={styles.container}>
      {/* Background Layer: TikTok ambient blurred background for non-vertical media */}
      {!isFullVertical && (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: photosList[activePhotoIndex] }}
            style={styles.ambientImage}
            blurRadius={Platform.OS === 'ios' ? 40 : 25}
          />
          <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.ambientOverlay} />
        </View>
      )}

      {/* Main Media Content - Pure TikTok Full Width Edge-to-Edge */}
      <View style={styles.mediaContainer}>
        {isFullVertical ? (
          /* 9:16 Full Screen Vertical */
          isVideo ? (
            <TouchableOpacity
              activeOpacity={1}
              onPress={toggleMute}
              style={StyleSheet.absoluteFill}
            >
              <Video
                ref={videoRef}
                source={{ uri: item.media_url }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                isLooping
                isMuted={isMuted}
                shouldPlay={actuallyVisible}
              />
              {showMuteIcon && (
                <View style={styles.videoCenterControlsContainer} pointerEvents="none">
                  <View style={styles.playOverlay}>
                    {isMuted ? (
                      <VolumeX size={44} color="#FFF" />
                    ) : (
                      <Volume2 size={44} color="#FFF" />
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            // Portrait image — wrap so tapping the screen toggles audio mute
            <TouchableOpacity
              activeOpacity={1}
              onPress={item.audio_url ? toggleMute : undefined}
              style={StyleSheet.absoluteFill}
            >
              <Image
                source={{ uri: item.media_url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              {showMuteIcon && item.audio_url && (
                <View style={styles.videoCenterControlsContainer} pointerEvents="none">
                  <View style={styles.playOverlay}>
                    {isMuted ? (
                      <VolumeX size={44} color="#FFF" />
                    ) : (
                      <Volume2 size={44} color="#FFF" />
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )
        ) : (
          /* TikTok Proportional Media (Edge-to-Edge Width, Clean Centered, No Rounded Borders) */
          <TouchableOpacity
            activeOpacity={1}
            onPress={toggleMute}
            style={styles.fullWidthMediaWrapper}
          >
            {isVideo ? (
              <Video
                ref={videoRef}
                source={{ uri: item.media_url }}
                style={{ width: width, height: FEED_SNAP_HEIGHT }}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                isMuted={isMuted}
                shouldPlay={actuallyVisible}
              />
            ) : isMultiplePhotos ? (
              <FlatList
                data={photosList}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActivePhotoIndex(idx);
                }}
                renderItem={({ item: photoUri }) => (
                  <View style={{ width: width, height: FEED_SNAP_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: width, height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                )}
                keyExtractor={(_, index) => index.toString()}
              />
            ) : (
              // Single photo — wrap in TouchableOpacity so tapping mutes/unmutes audio
              <TouchableOpacity
                activeOpacity={1}
                onPress={item.audio_url ? toggleMute : undefined}
                style={{ width: width, height: FEED_SNAP_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
              >
                <Image
                  source={{ uri: item.media_url }}
                  style={{ width: width, height: FEED_SNAP_HEIGHT }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            {/* Mute Center Icon */}
            {showMuteIcon && (
              <View style={styles.videoCenterControlsContainer} pointerEvents="none">
                <View style={styles.playOverlay}>
                  {isMuted ? (
                    <VolumeX size={44} color="#FFF" />
                  ) : (
                    <Volume2 size={44} color="#FFF" />
                  )}
                </View>
              </View>
            )}

            {/* Pagination Dots for Photo Carousel (TikTok style) */}
            {isMultiplePhotos && (
              <View style={styles.paginationRow}>
                {photosList.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      activePhotoIndex === idx && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Top & Bottom Linear Gradients for text legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.4, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* TikTok Overlay UI Container */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* Left Side: Caption, Author info, Hashtags, Soundtrack */}
        <View style={styles.leftInfoSection}>
          <TouchableOpacity
            style={styles.authorRow}
            activeOpacity={0.85}
            onPress={() => onUserPress(item.user_id)}
          >
            <Text style={styles.authorName}>@{author.name?.toLowerCase().replace(/\s+/g, '') || 'viajante'}</Text>
            <BadgeCheck size={16} color={colors.primary} fill="#FFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {item.destination ? (
            <View style={styles.locationPill}>
              <MapPin size={11} color="#FFF" />
              <Text style={styles.locationPillText} numberOfLines={1}>
                {getShortDestination(item.destination)}
              </Text>
            </View>
          ) : null}

          {item.description ? (
            <Text style={styles.descriptionText} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          {/* Travel Style Tag */}
          <View style={styles.travelTagRow}>
            <View style={styles.travelTag}>
              <Text style={styles.travelTagText}>
                #{author.travel_styles?.[0] || 'Aventura'}
              </Text>
            </View>
          </View>

          {/* Soundtrack Row */}
          <View style={styles.soundtrackRow}>
            <Music size={14} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.soundtrackText} numberOfLines={1}>
              {item.audio_title || `Som original - ${author.name || 'Romy Feed'}`}
            </Text>
          </View>
        </View>

        {/* Right Side: TikTok Action Buttons Column */}
        <View style={styles.rightActionColumn}>
          {/* Avatar with Follow Badge */}
          <TouchableOpacity
            style={styles.avatarActionWrapper}
            activeOpacity={0.85}
            onPress={() => onUserPress(item.user_id)}
          >
            <Image source={{ uri: avatarImage }} style={styles.avatarImage} />
            <View style={styles.followBadge}>
              <UserPlus size={10} color="#FFF" strokeWidth={3} />
            </View>
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            activeOpacity={0.7}
            accessibilityLabel={`Curtir. ${likesCount} curtidas`}
            accessibilityRole="button"
          >
            <Animated.View style={animatedLikeStyle}>
              <Heart
                size={26}
                color={isLiked ? '#FF2A54' : '#FFF'}
                fill={isLiked ? '#FF2A54' : 'transparent'}
                strokeWidth={isLiked ? 0 : 2}
              />
            </Animated.View>
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>

          {/* Comments Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenComments(item.id)}
            activeOpacity={0.7}
            accessibilityLabel={`Comentários. ${commentsCount} comentários`}
            accessibilityRole="button"
          >
            <MessageCircle size={26} color="#FFF" strokeWidth={2} />
            <Text style={styles.actionText}>{commentsCount}</Text>
          </TouchableOpacity>

          {/* Bookmark / Save Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToggleSave}
            activeOpacity={0.7}
            accessibilityLabel={isSaved ? 'Remover dos salvos' : 'Salvar post'}
            accessibilityRole="button"
          >
            <Animated.View style={animatedBookmarkStyle}>
              <Bookmark
                size={26}
                color={isSaved ? '#FFD700' : '#FFF'}
                fill={isSaved ? '#FFD700' : 'transparent'}
                strokeWidth={2}
              />
            </Animated.View>
            <Text style={styles.actionText}>{saveCount}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare(item)}
            activeOpacity={0.7}
            accessibilityLabel="Compartilhar post"
            accessibilityRole="button"
          >
            <Share2 size={24} color="#FFF" strokeWidth={2} />
            <Text style={styles.actionText}>Enviar</Text>
          </TouchableOpacity>

          {/* Options Button */}
          {isOwner && onOptionsPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onOptionsPress}
              activeOpacity={0.7}
            >
              <MoreVertical size={24} color="#FFF" strokeWidth={2} />
              <Text style={styles.actionText}>Mais</Text>
            </TouchableOpacity>
          )}

          {/* TikTok Spinning Vinyl Audio Disk */}
          <Animated.View style={[styles.vinylWrapper, animatedVinylStyle]}>
            <View style={styles.vinylInner}>
              <Image source={{ uri: avatarImage }} style={styles.vinylImage} />
              <View style={styles.vinylCenterDot} />
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: FEED_SNAP_HEIGHT,
    width: width,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  ambientImage: {
    width: width,
    height: FEED_SNAP_HEIGHT,
    resizeMode: 'cover',
  },
  ambientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: FEED_SNAP_HEIGHT,
  },
  fullWidthMediaWrapper: {
    width: width,
    height: FEED_SNAP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoTagBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  photoTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoCenterControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  muteBtnAbovePause: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 6,
  },
  playOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  paginationRow: {
    position: 'absolute',
    bottom: 110,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  leftInfoSection: {
    flex: 1,
    marginRight: spacing.md,
    justifyContent: 'flex-end',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  locationPillText: {
    ...typography.caption,
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  descriptionText: {
    ...typography.body,
    fontSize: 14,
    color: '#FFF',
    lineHeight: 19,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  travelTagRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  travelTag: {
    backgroundColor: 'rgba(99, 56, 250, 0.25)',
    borderColor: 'rgba(138, 106, 251, 0.7)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  travelTagText: {
    color: '#8A6AFB',
    fontSize: 12,
    fontWeight: '700',
  },
  soundtrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  soundtrackText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  rightActionColumn: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 4,
  },
  avatarActionWrapper: {
    marginBottom: 2,
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFF',
    backgroundColor: '#333',
  },
  followBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  vinylWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#222',
    marginTop: 2,
  },
  vinylInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vinylImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  vinylCenterDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#000',
  },
});
