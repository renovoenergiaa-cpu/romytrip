import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { createAudioPlayer, AudioModule } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { usePathname } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { Avatar } from '../onboarding/components';
import { TRAVEL_STYLE_OPTIONS } from '../onboarding/options';
import {
  ChatCircle, DotsThree, Heart, MapPin, MusicNote, Pause, Play, ShareNetwork, SpeakerHigh, SpeakerSlash,
} from '../onboarding/icons';
import { displayName, shortPlace, timeAgo } from './format';

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
}

const WHITE = '#FFFFFF';
const SOFT_WHITE = 'rgba(255,255,255,0.88)';
const GLASS = 'rgba(255,255,255,0.18)';

function PostVideo({ uri, playing, muted, fit }: { uri: string; playing: boolean; muted: boolean; fit: 'cover' | 'contain' }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    if (playing) p.play();
  });
  useEffect(() => { if (playing) player.play(); else player.pause(); }, [playing, player]);
  // API do expo-video: o som se muda atribuindo ao player
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { player.muted = muted; }, [muted, player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={fit} nativeControls={false} />;
}

export default function PostCard({ item, height, isVisible, isLiked, onLike, onOpenComments, onShare, onUserPress, onOptionsPress, isOwner }: {
  item: PostItemData;
  height: number;
  isVisible: boolean;
  isLiked: boolean;
  onLike: (id: string) => void;
  onOpenComments: (id: string) => void;
  onShare: (item: PostItemData) => void;
  onUserPress: (userId: string) => void;
  onOptionsPress?: () => void;
  isOwner?: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(), []);
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  // Áudio e vídeo só tocam com o feed na tela
  const onScreen = isVisible && (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/');

  const author = item.users ?? {};
  const name = displayName(author.name);
  const photoList = item.photos && item.photos.length > 0 ? item.photos : [item.media_url];
  const isCarousel = photoList.length > 1;
  const isVideo =
    item.media_type === 'video' || /\.(mp4|mov|webm)$/i.test(item.media_url ?? '') || (item.media_url ?? '').includes('/video/');
  const likes = item.post_likes?.[0]?.count ?? 0;
  const comments = item.comments?.[0]?.count ?? 0;
  const travelStyle = TRAVEL_STYLE_OPTIONS.find((o) => o.id === author.travel_styles?.[0]);
  const StyleIcon = travelStyle?.icon;

  const [aspect, setAspect] = useState(item.aspect_ratio || 0.75);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [muteHint, setMuteHint] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<any>(null);
  const hasSound = !!item.audio_url || isVideo;
  // Pausar vale para o vídeo e para a música do post
  const playing = onScreen && !paused;

  // Proporção real da foto (muito vertical = tela cheia; o resto fica centralizado sobre um fundo desfocado)
  useEffect(() => {
    if (isVideo || !item.media_url) return;
    Image.getSize(item.media_url, (w, h) => { if (w > 0 && h > 0) setAspect(w / h); }, () => {});
  }, [item.media_url, isVideo]);

  // Música do post: toca só enquanto ele está na tela
  useEffect(() => {
    if (!item.audio_url) return;
    AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, [item.audio_url]);

  useEffect(() => {
    if (!item.audio_url) return;
    if (playing) {
      try {
        if (!playerRef.current) {
          const p = createAudioPlayer({ uri: item.audio_url });
          p.loop = true;
          p.muted = muted;
          playerRef.current = p;
        }
        playerRef.current.play();
      } catch (err) {
        console.warn('Erro ao tocar a música do post:', err);
      }
    } else {
      try { playerRef.current?.pause(); } catch { /* player já liberado */ }
    }
    return () => {
      try { playerRef.current?.pause(); playerRef.current?.release(); } catch { /* já liberado */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, item.audio_url]);

  useEffect(() => { if (playerRef.current) playerRef.current.muted = muted; }, [muted]);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const toggleMute = () => {
    if (!hasSound) return;
    setMuted((m) => !m);
  };

  // Toque numa foto com música liga e desliga o som, como antes
  const tapPhoto = () => {
    if (!item.audio_url) return;
    setMuted((m) => !m);
    setMuteHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setMuteHint(false), 1400);
  };

  const togglePause = () => setPaused((p) => !p);

  const likeScale = useSharedValue(1);
  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const like = () => {
    // API do Reanimated: valores compartilhados se mudam atribuindo a .value
    // eslint-disable-next-line react-hooks/immutability
    likeScale.value = withSequence(withSpring(1.35, { damping: 4, stiffness: 400 }), withSpring(1, { damping: 8, stiffness: 220 }));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onLike(item.id);
  };

  const fullBleed = aspect < 0.63;
  const caption = item.description?.trim() ?? '';
  const longCaption = caption.length > 90;

  return (
    <View style={[s.card, { width, height }]}>
      {/* Fundo desfocado para fotos que não preenchem a tela */}
      {!fullBleed && !isVideo && (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: photoList[photoIndex] }} style={StyleSheet.absoluteFill} blurRadius={Platform.OS === 'ios' ? 40 : 25} />
          <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={s.dim} />
        </View>
      )}

      {/* Mídia */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={isVideo ? togglePause : tapPhoto}
        accessibilityRole={isVideo || item.audio_url ? 'button' : undefined}
        accessibilityLabel={isVideo ? (paused ? 'Tocar vídeo' : 'Pausar vídeo') : item.audio_url ? (muted ? 'Ativar som' : 'Silenciar') : undefined}
      >
        {isVideo ? (
          <PostVideo uri={item.media_url} playing={playing} muted={muted} fit={fullBleed ? 'cover' : 'contain'} />
        ) : isCarousel ? (
          <FlatList
            data={photoList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item: uri }) => (
              <View style={{ width, height, justifyContent: 'center' }}>
                <Image source={{ uri }} style={{ width, height: '100%' }} resizeMode={fullBleed ? 'cover' : 'contain'} />
              </View>
            )}
          />
        ) : (
          <Image source={{ uri: item.media_url }} style={StyleSheet.absoluteFill} resizeMode={fullBleed ? 'cover' : 'contain'} accessibilityLabel={`Foto de ${name}`} />
        )}
      </Pressable>

      {(isVideo && paused) || muteHint ? (
        <View style={s.hintWrap} pointerEvents="none">
          <View style={s.hint}>
            {isVideo && paused ? <Play size={40} weight="fill" color={WHITE} /> : muted ? <SpeakerSlash size={36} weight="fill" color={WHITE} /> : <SpeakerHigh size={36} weight="fill" color={WHITE} />}
          </View>
        </View>
      ) : null}

      {isCarousel && (
        <View style={s.dots} pointerEvents="none">
          {photoList.map((_, i) => <View key={i} style={[s.dot, i === photoIndex && s.dotOn]} />)}
        </View>
      )}

      <LinearGradient colors={['rgba(0,0,0,0.38)', 'transparent']} style={s.topFade} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']} locations={[0, 0.45, 1]} style={s.bottomFade} pointerEvents="none" />

      <View style={s.overlay} pointerEvents="box-none">
        {/* Autor, lugar, legenda */}
        <View style={s.info}>
          <Pressable onPress={() => onUserPress(item.user_id)} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} style={s.author}>
            <View style={s.avatarRing}><Avatar photo={author.photos?.[0]} name={name} size={40} /></View>
            <View style={{ flexShrink: 1 }}>
              <Text style={s.name} numberOfLines={1}>{name}</Text>
              {item.created_at ? <Text style={s.when}>{timeAgo(item.created_at)}</Text> : null}
            </View>
          </Pressable>

          {item.destination ? (
            <View style={s.chip}>
              <MapPin size={14} weight="fill" color={WHITE} />
              <Text style={s.chipText} numberOfLines={1}>{shortPlace(item.destination)}</Text>
            </View>
          ) : null}

          {caption ? (
            <Pressable onPress={() => longCaption && setExpanded((e) => !e)} accessibilityRole={longCaption ? 'button' : undefined} accessibilityHint={longCaption ? 'Mostra a legenda inteira' : undefined}>
              <Text style={s.caption} numberOfLines={expanded ? undefined : 2}>{caption}</Text>
              {longCaption && !expanded ? <Text style={s.more}>mais</Text> : null}
            </Pressable>
          ) : null}

          {travelStyle ? (
            <View style={[s.chip, s.styleChip]}>
              {StyleIcon ? <StyleIcon size={14} weight="duotone" color={WHITE} /> : null}
              <Text style={s.chipText}>{travelStyle.label}</Text>
            </View>
          ) : null}

          {item.audio_title ? (
            <View style={s.sound}>
              <MusicNote size={15} weight="fill" color={WHITE} />
              <Text style={s.soundText} numberOfLines={1}>{item.audio_title}</Text>
            </View>
          ) : null}
        </View>

        {/* Ações */}
        <View style={s.actions}>
          <Pressable onPress={like} accessibilityRole="button" accessibilityLabel={`${isLiked ? 'Descurtir' : 'Curtir'}. ${likes} curtidas`} accessibilityState={{ selected: isLiked }} style={s.action}>
            <Animated.View style={likeStyle}>
              <Heart size={32} weight={isLiked ? 'fill' : 'bold'} color={isLiked ? colors.accent : WHITE} />
            </Animated.View>
            <Text style={s.count}>{likes}</Text>
          </Pressable>
          <Pressable onPress={() => onOpenComments(item.id)} accessibilityRole="button" accessibilityLabel={`Comentários. ${comments} comentários`} style={s.action}>
            <ChatCircle size={32} weight="bold" color={WHITE} />
            <Text style={s.count}>{comments}</Text>
          </Pressable>
          <Pressable onPress={() => onShare(item)} accessibilityRole="button" accessibilityLabel="Compartilhar post" style={s.action}>
            <ShareNetwork size={30} weight="bold" color={WHITE} />
            <Text style={s.count}>Enviar</Text>
          </Pressable>
          {hasSound ? (
            <Pressable onPress={toggleMute} accessibilityRole="button" accessibilityLabel={muted ? 'Ativar som' : 'Silenciar'} accessibilityState={{ selected: muted }} style={s.action}>
              {muted ? <SpeakerSlash size={30} weight="bold" color={WHITE} /> : <SpeakerHigh size={30} weight="bold" color={WHITE} />}
              <Text style={s.count}>{muted ? 'Mudo' : 'Som'}</Text>
            </Pressable>
          ) : null}
          {isVideo ? (
            <Pressable onPress={togglePause} accessibilityRole="button" accessibilityLabel={paused ? 'Tocar vídeo' : 'Pausar vídeo'} style={s.action}>
              {paused ? <Play size={30} weight="fill" color={WHITE} /> : <Pause size={30} weight="fill" color={WHITE} />}
              <Text style={s.count}>{paused ? 'Tocar' : 'Pausar'}</Text>
            </Pressable>
          ) : null}
          {isOwner && onOptionsPress ? (
            <Pressable onPress={onOptionsPress} accessibilityRole="button" accessibilityLabel="Opções da publicação" style={s.action}>
              <DotsThree size={32} weight="bold" color={WHITE} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  card: { backgroundColor: '#000', overflow: 'hidden' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 },
  hintWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hint: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { width: 18, backgroundColor: WHITE },

  overlay: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20 },
  info: { flex: 1, marginRight: 12, gap: 8, alignItems: 'flex-start' },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' },
  avatarRing: { borderRadius: 24, borderWidth: 2, borderColor: WHITE, padding: 0 },
  name: { fontSize: 18, fontWeight: '800', color: WHITE, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  when: { fontSize: 13, color: SOFT_WHITE, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: GLASS, maxWidth: '100%' },
  styleChip: { backgroundColor: 'rgba(99,56,250,0.5)' },
  chipText: { fontSize: 13, fontWeight: '700', color: WHITE, flexShrink: 1 },
  caption: { fontSize: 15, lineHeight: 21, color: WHITE, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  more: { fontSize: 14, fontWeight: '700', color: SOFT_WHITE, marginTop: 2 },
  sound: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  soundText: { fontSize: 13, fontWeight: '600', color: SOFT_WHITE, flexShrink: 1 },

  actions: { alignItems: 'center', gap: 12, paddingBottom: 2 },
  action: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  count: { fontSize: 12, fontWeight: '700', color: WHITE, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
