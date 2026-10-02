import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, FlatList, Platform, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../../src/theme';
import {
  useFeed, usePostLikes, useTogglePostLike, useCreatePost, useComments, useCreateComment, useDeleteFeedPost, useUpdatePostCaption,
} from '../../src/hooks/useFeed';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { useCurrentUserId } from '../../src/hooks/useMessenger';
import { useLocalEvents } from '../../src/hooks/useEvents';
import RomyMap from '../../src/components/RomyMap';
import CreateEventModal from '../../src/components/CreateEventModal';
import EventDetailsModal from '../../src/components/EventDetailsModal';
import CommunitiesScreen from './communities';
import HelpBoardScreen from '../help-board';
import ProximaViagemScreen from '../../src/components/ProximaViagemScreen';
import PostOptionsSheet from '../../src/components/PostOptionsSheet';
import { UploadProgressBanner, type UploadingPostData } from '../../src/components/UploadProgressBanner';
import { showError } from '../../src/lib/dialogs';
import PostCard, { type PostItemData } from '../../src/features/feed/PostCard';
import { FeedTabs, FEED_TABS_HEIGHT, type FeedTab } from '../../src/features/feed/FeedTabs';
import { CommentsSheet, ComposeSheet, EditCaptionSheet, MediaSourceSheet } from '../../src/features/feed/sheets';
import { useMusicSearch } from '../../src/features/feed/useMusicSearch';
import { displayName } from '../../src/features/feed/format';
import { ImageSquare, MapPin, WifiSlash, type Icon } from '../../src/features/onboarding/icons';

type UploadPayload = { mediaUri: string; destination: string; description: string; audio_title?: string; audio_url?: string };

// Cidade a partir do endereço devolvido pelo serviço de geocodificação
const extractCityName = (props: any) =>
  props?.city || props?.town || props?.village || props?.county || props?.municipality || props?.state || '';

// Bairro, cidade e região (não o endereço exato, por privacidade)
const formatSummarizedLocation = (props: any) => {
  if (!props) return '';
  const neighborhood = props.suburb || props.district || props.neighbourhood || props.quarter;
  const city = props.city || props.town || props.village || props.county;
  const stateOrCountry = props.state || props.country || '';
  if (neighborhood && city && neighborhood !== city) return `${neighborhood}, ${city}`;
  if (city && stateOrCountry) return `${city}, ${stateOrCountry}`;
  return city || neighborhood || '';
};

// Endereço de um ponto do mapa (web): rua e número, bairro e cidade
async function lookupAddress(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`);
    const props = (await res.json())?.features?.[0]?.properties;
    if (!props) return 'Local no mapa';
    const street = props.street ? (props.housenumber ? `${props.street}, ${props.housenumber}` : props.street) : '';
    const first = props.name && props.name !== props.street ? props.name : street;
    return [first, props.district || props.suburb, props.city || props.town || props.county].filter(Boolean).join(', ') || 'Local no mapa';
  } catch {
    return 'Local no mapa';
  }
}

export default function RomyFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const currentUserId = useCurrentUserId();
  const { destination: userNextDestination } = useOnboardingStore();

  const [activeTab, setActiveTab] = useState<FeedTab>('aqui');
  const overMedia = activeTab === 'aqui' || activeTab === 'rolando';
  const topSpace = insets.top + FEED_TABS_HEIGHT;

  /* ─── Onde a pessoa está (filtra o feed "Estou aqui" e prepara o mapa) ─── */
  const [currentGpsCity, setCurrentGpsCity] = useState('');
  const [userCityOnly, setUserCityOnly] = useState('');
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [locationState, setLocationState] = useState<'pending' | 'denied' | 'ready'>('pending');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationState('denied'); return; }
      try {
        const location = await Location.getCurrentPositionAsync({});
        setMapRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        setLocationState('ready');
        const res = await fetch(`https://photon.komoot.io/reverse?lon=${location.coords.longitude}&lat=${location.coords.latitude}`);
        const data = await res.json();
        if (data.features?.length > 0) {
          const props = data.features[0].properties;
          setUserCityOnly(extractCityName(props));
          setCurrentGpsCity(formatSummarizedLocation(props));
        }
      } catch (e) {
        console.warn('Erro ao obter a localização:', e);
        setLocationState((prev) => (prev === 'pending' ? 'denied' : prev));
      }
    })();
  }, []);

  const destinationFilter = activeTab === 'aqui' ? userCityOnly || currentGpsCity || '' : userNextDestination || '';

  /* ─── Feed ─── */
  const { data: posts, isLoading, isError, refetch: refetchFeed } = useFeed(destinationFilter);
  const { data: likedPostsMap } = usePostLikes();
  const { mutate: toggleLike } = useTogglePostLike();
  const { mutate: createPost } = useCreatePost();
  const { mutateAsync: deleteFeedPost } = useDeleteFeedPost();
  const { mutate: updateCaption, isPending: isUpdatingCaption } = useUpdatePostCaption();

  const [feedHeight, setFeedHeight] = useState(0);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<any>>(null);
  const pendingScrollToPostId = useRef<string | null>(null);

  const scrollToPostIndex = useCallback((index: number) => {
    setActivePostIndex(index);
    setTimeout(() => {
      try { listRef.current?.scrollToIndex({ index, animated: true }); }
      catch { listRef.current?.scrollToOffset({ offset: index * feedHeight, animated: true }); }
    }, 80);
  }, [feedHeight]);

  const tryScrollToPost = useCallback((targetId: string, list: any[] | undefined) => {
    const index = list?.findIndex((p: any) => p.id === targetId) ?? -1;
    if (index === -1) return false;
    pendingScrollToPostId.current = null;
    scrollToPostIndex(index);
    return true;
  }, [scrollToPostIndex]);

  // "Ver no feed" a partir do perfil
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToPost', ({ postId }: { postId: string }) => {
      if (!postId) return;
      setActiveTab('aqui');
      pendingScrollToPostId.current = postId;
      if (tryScrollToPost(postId, posts)) return;
      refetchFeed().then((res) => tryScrollToPost(postId, res.data));
    });
    return () => sub.remove();
  }, [posts, refetchFeed, tryScrollToPost]);

  useEffect(() => {
    if (pendingScrollToPostId.current && posts?.length) tryScrollToPost(pendingScrollToPostId.current, posts);
  }, [posts, tryScrollToPost]);

  // O FlatList exige que estes dois não mudem entre renders
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) setActivePostIndex(viewableItems[0].index ?? 0);
  }, []);
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetchFeed(); } finally { setRefreshing(false); }
  };

  const handleLike = (postId: string) => toggleLike({ postId, isLiked: likedPostsMap?.[postId] || false });

  const handleShare = async (post: PostItemData) => {
    try {
      await Share.share({ message: `Olha este post de ${displayName(post.users?.name)} no Romy! Destino: ${post.destination}.` });
    } catch { /* cancelou ou o navegador não compartilha */ }
  };

  /* ─── Comentários ─── */
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const { data: comments, isLoading: loadingComments, isError: commentsFailed, refetch: refetchComments } = useComments(activePostId);
  const { mutate: createComment, isPending: sendingComment } = useCreateComment();

  const closeComments = () => { setActivePostId(null); setCommentText(''); };
  const sendComment = () => {
    if (!commentText.trim() || !activePostId) return;
    createComment({ postId: activePostId, content: commentText.trim() }, {
      onSuccess: () => setCommentText(''),
      onError: () => showError('Não foi possível comentar', 'Tente de novo em instantes.'),
    });
  };

  /* ─── Opções e edição de legenda ─── */
  const [optionsPost, setOptionsPost] = useState<any>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editedCaption, setEditedCaption] = useState('');

  /* ─── Publicar ─── */
  const [sourceOpen, setSourceOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const [place, setPlace] = useState('');
  const [locating, setLocating] = useState(false);
  const [description, setDescription] = useState('');
  const [song, setSong] = useState<{ title: string; url: string } | null>(null);
  const music = useMusicSearch();
  const [uploadingPost, setUploadingPost] = useState<UploadingPostData | null>(null);
  const lastUpload = useRef<UploadPayload | null>(null);

  const processSelectedMedia = useCallback(async (uri: string, isVideo: boolean) => {
    setMediaUri(uri);
    setMediaIsVideo(isVideo);
    setPlace(currentGpsCity);
    setLocating(true);
    setComposeOpen(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') status = (await Location.requestForegroundPermissionsAsync()).status;
      if (status !== 'granted') return;
      const location = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (!location) return;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://photon.komoot.io/reverse?lon=${location.coords.longitude}&lat=${location.coords.latitude}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      const found = data.features?.length > 0 ? formatSummarizedLocation(data.features[0].properties) : '';
      // Não sobrescreve o que a pessoa já digitou
      if (found) setPlace((prev) => prev || found);
    } catch (e) {
      console.warn('Não foi possível obter o local da publicação:', e);
    } finally {
      setLocating(false);
    }
  }, [currentGpsCity]);

  // Recupera a foto caso o Android tenha reiniciado a tela da câmera por falta de memória
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ImagePicker.getPendingResultAsync().then((res: any) => {
      const asset = res && !res.canceled && Array.isArray(res.assets) ? res.assets[0] : null;
      if (asset) processSelectedMedia(asset.uri, asset.type === 'video');
    }).catch((e) => console.warn('getPendingResultAsync:', e));
  }, [processSelectedMedia]);

  const openPicker = async (source: 'photo' | 'video' | 'gallery') => {
    try {
      const permission = source === 'gallery' ? await ImagePicker.requestMediaLibraryPermissionsAsync() : await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Permissão necessária', source === 'gallery' ? 'Permita o acesso às suas fotos para escolher uma publicação.' : 'Permita o acesso à câmera para registrar o momento.');
        return;
      }
      // Fecha a folha antes de abrir a câmera nativa, para liberar a janela
      setSourceOpen(false);
      await new Promise((r) => setTimeout(r, 200));
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: source === 'photo' ? ['images'] : source === 'video' ? ['videos'] : ['images', 'videos'],
        allowsEditing: Platform.OS === 'ios' && source !== 'video', // no Android o recorte abre outra tela e pode reiniciar o app
        quality: 0.7,
        // Vídeo curto e em qualidade média: cada visualização no feed conta no limite de tráfego do Supabase
        videoMaxDuration: 30,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      };
      const result = source === 'gallery' ? await ImagePicker.launchImageLibraryAsync(options) : await ImagePicker.launchCameraAsync(options);
      const asset = !result.canceled ? result.assets?.[0] : null;
      if (asset) processSelectedMedia(asset.uri, asset.type === 'video');
    } catch (err: any) {
      setSourceOpen(false);
      console.warn('Erro ao escolher a mídia:', err);
      showError('Não foi possível abrir', source === 'gallery' ? 'Não foi possível acessar a galeria.' : 'Não foi possível abrir a câmera.');
    }
  };

  const publish = (payload: UploadPayload) => {
    lastUpload.current = payload;
    setUploadingPost({ id: String(Date.now()), mediaUri: payload.mediaUri, destination: payload.destination, description: payload.description, status: 'uploading' });
    createPost(payload, {
      onSuccess: async () => {
        setUploadingPost((prev) => (prev ? { ...prev, status: 'success' } : null));
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await refetchFeed();
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        setActivePostIndex(0);
        setTimeout(() => setUploadingPost((prev) => (prev?.status === 'success' ? null : prev)), 2200);
      },
      onError: (err: any) => {
        setUploadingPost((prev) => (prev ? { ...prev, status: 'error', errorMessage: err?.message } : null));
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      },
    });
  };

  const submitPost = () => {
    if (!mediaUri || !place.trim()) return;
    const payload: UploadPayload = {
      mediaUri,
      destination: place.trim(),
      description: description.trim(),
      audio_title: song?.title,
      audio_url: song?.url,
    };
    // Fecha na hora: o envio continua em segundo plano, com o aviso no topo
    setComposeOpen(false);
    setMediaUri(null);
    setPlace('');
    setDescription('');
    setSong(null);
    music.reset();
    setActiveTab('aqui');
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setActivePostIndex(0);
    publish(payload);
  };

  const closeCompose = () => { setComposeOpen(false); setMediaUri(null); setPlace(''); setDescription(''); setSong(null); };

  // Botão "+" da barra de abas
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('openCreatePost', () => setSourceOpen(true));
    return () => sub.remove();
  }, []);

  /* ─── Mapa e eventos ("Tá rolando") ─── */
  const [isDraftingEvent, setIsDraftingEvent] = useState(false);
  const [draftEventLocation, setDraftEventLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [draftLocationName, setDraftLocationName] = useState('Buscando local…');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [createEventVisible, setCreateEventVisible] = useState(false);
  const [eventDetailsVisible, setEventDetailsVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const { data: localEvents } = useLocalEvents(mapRegion?.latitude, mapRegion?.longitude, 50);

  const handleLongPressMap = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setDraftEventLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude });
    setIsDraftingEvent(true);
    if (Platform.OS === 'web') {
      // No web o endereço vem de uma busca pelo ponto onde a pessoa segurou
      setDraftLocationName('Buscando endereço…');
      lookupAddress(coordinate.latitude, coordinate.longitude).then(setDraftLocationName);
      return;
    }
    mapRef.current?.animateToRegion({ latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
  };

  const handleRegionChangeComplete = async (region: any) => {
    if (!isDraftingEvent) return;
    setDraftEventLocation({ latitude: region.latitude, longitude: region.longitude });
    // No web o endereço já foi buscado no toque longo
    if (Platform.OS === 'web') return;
    setDraftLocationName('Buscando local…');
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: region.latitude, longitude: region.longitude });
      const addr = result?.[0];
      if (!addr) { setDraftLocationName('Local no mapa'); return; }
      if (addr.name && addr.name !== addr.streetNumber && addr.name !== addr.street) setDraftLocationName(addr.name);
      else if (addr.street) setDraftLocationName(addr.streetNumber ? `${addr.street}, ${addr.streetNumber}` : addr.street);
      else setDraftLocationName(addr.district || addr.subregion || 'Local no mapa');
    } catch {
      setDraftLocationName('Local no mapa');
    }
  };

  const confirmDraftLocation = () => {
    if (!draftEventLocation) return;
    setSelectedLocation({ lat: draftEventLocation.latitude, lng: draftEventLocation.longitude, name: draftLocationName });
    setIsDraftingEvent(false);
    setDraftEventLocation(null);
    setCreateEventVisible(true);
  };

  const cancelDraftLocation = () => { setIsDraftingEvent(false); setDraftEventLocation(null); };

  /* ─── Telas ─── */
  const renderFeed = () => {
    if (isLoading || feedHeight === 0) {
      return <View style={s.center}><ActivityIndicator size="large" color="#FFFFFF" accessibilityLabel="Carregando o feed" /></View>;
    }
    if (isError && !posts) {
      return <FeedMessage icon={WifiSlash} title="Não conseguimos carregar o feed" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => refetchFeed()} top={topSpace} />;
    }
    if (!posts || posts.length === 0) {
      return (
        <FeedMessage
          icon={ImageSquare}
          title="Nada por aqui ainda"
          text={destinationFilter ? `Ninguém publicou em ${destinationFilter.split(',')[0]} ainda. Que tal ser a primeira pessoa?` : 'Ainda não há publicações. Que tal ser a primeira pessoa?'}
          action="Publicar"
          onAction={() => setSourceOpen(true)}
          top={topSpace}
        />
      );
    }
    return (
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PostCard
            item={item}
            height={feedHeight}
            isVisible={index === activePostIndex}
            isLiked={likedPostsMap?.[item.id] || false}
            onLike={handleLike}
            onOpenComments={setActivePostId}
            onShare={handleShare}
            onUserPress={(userId) => router.push(`/user/${userId}`)}
            onOptionsPress={() => setOptionsPost(item)}
            isOwner={item.user_id === currentUserId}
          />
        )}
        pagingEnabled
        snapToInterval={feedHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        windowSize={3}
        maxToRenderPerBatch={2}
        getItemLayout={(_, index) => ({ length: feedHeight, offset: feedHeight * index, index })}
        onScrollToIndexFailed={(info) => listRef.current?.scrollToOffset({ offset: info.index * feedHeight, animated: true })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" progressViewOffset={topSpace} />}
      />
    );
  };

  const renderMap = () => {
    if (locationState === 'denied') {
      return <FeedMessage icon={MapPin} title="Ative a localização" text="Para ver o que está rolando por perto, o Romy precisa saber onde você está." top={topSpace} />;
    }
    if (!mapRegion) {
      return <View style={s.center}><ActivityIndicator size="large" color="#FFFFFF" accessibilityLabel="Carregando o mapa" /></View>;
    }
    return (
      <View style={{ flex: 1, paddingTop: topSpace }}>
        <RomyMap
          ref={mapRef}
          style={s.map}
          mapRegion={mapRegion}
          onLongPress={handleLongPressMap}
          onRegionChangeComplete={handleRegionChangeComplete}
          localEvents={localEvents}
          draftPin={isDraftingEvent ? draftEventLocation : null}
          onSelectEvent={(event: any) => { setSelectedEvent(event); setEventDetailsVisible(true); }}
        />
        {isDraftingEvent && Platform.OS !== 'web' && (
          <View style={s.pinWrap} pointerEvents="none">
            <View style={s.pinTip}><Text style={s.pinTipText} numberOfLines={1}>{draftLocationName}</Text></View>
            <MapPin size={44} weight="fill" color={colors.primary} />
          </View>
        )}
        {isDraftingEvent && Platform.OS === 'web' ? (
          <View style={s.addressTip} pointerEvents="none">
            <MapPin size={18} weight="fill" color={colors.primary} />
            <Text style={s.addressTipText} numberOfLines={2}>{draftLocationName}</Text>
          </View>
        ) : null}
        {isDraftingEvent ? (
          <View style={s.draftBar}>
            <Pressable onPress={cancelDraftLocation} accessibilityRole="button" style={[s.draftBtn, s.draftCancel]}><Text style={s.draftCancelText}>Cancelar</Text></Pressable>
            <Pressable onPress={confirmDraftLocation} accessibilityRole="button" style={[s.draftBtn, s.draftConfirm]}><Text style={s.draftConfirmText}>Confirmar local</Text></Pressable>
          </View>
        ) : (
          <View style={[s.mapHint, Platform.OS === 'web' ? { top: topSpace + 12 } : { bottom: 24 }]} pointerEvents="none">
            <Text style={s.mapHintText}>Segure no endereço onde o evento vai acontecer</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: overMedia ? '#000' : colors.background }]} onLayout={(e) => setFeedHeight(e.nativeEvent.layout.height)}>
      <UploadProgressBanner
        post={uploadingPost}
        topOffset={FEED_TABS_HEIGHT}
        onDismiss={() => setUploadingPost(null)}
        onRetry={() => lastUpload.current && publish(lastUpload.current)}
      />

      <FeedTabs active={activeTab} onChange={setActiveTab} overMedia={overMedia} />

      {activeTab === 'aqui' ? renderFeed()
        : activeTab === 'rolando' ? renderMap()
        : activeTab === 'comunidades' ? <View style={{ flex: 1, paddingTop: topSpace }}><CommunitiesScreen /></View>
        : activeTab === 'ajudinha' ? <View style={{ flex: 1, paddingTop: topSpace }}><HelpBoardScreen isEmbedded city={userCityOnly || currentGpsCity} /></View>
        : <View style={{ flex: 1, paddingTop: topSpace }}><ProximaViagemScreen originCity={userCityOnly || currentGpsCity} /></View>}

      <CommentsSheet
        visible={!!activePostId}
        onClose={closeComments}
        comments={comments}
        loading={loadingComments}
        failed={commentsFailed}
        onRetry={() => refetchComments()}
        text={commentText}
        onChangeText={setCommentText}
        onSend={sendComment}
        sending={sendingComment}
      />

      <MediaSourceSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onPhoto={() => openPicker('photo')}
        onVideo={() => openPicker('video')}
        onGallery={() => openPicker('gallery')}
      />

      <ComposeSheet
        visible={composeOpen}
        onClose={closeCompose}
        mediaUri={mediaUri}
        isVideo={mediaIsVideo}
        place={place}
        onChangePlace={setPlace}
        locating={locating}
        song={song}
        onClearSong={() => setSong(null)}
        onPickSong={(m) => setSong({ title: `${m.trackName} - ${m.artistName}`, url: m.previewUrl })}
        description={description}
        onChangeDescription={setDescription}
        onPublish={submitPost}
        publishing={false}
        music={music}
      />

      <EditCaptionSheet
        visible={!!editingPostId}
        onClose={() => setEditingPostId(null)}
        value={editedCaption}
        onChange={setEditedCaption}
        saving={isUpdatingCaption}
        onSave={() => {
          if (!editingPostId) return;
          updateCaption({ postId: editingPostId, description: editedCaption }, {
            onSuccess: () => setEditingPostId(null),
            onError: () => showError('Não foi possível salvar', 'Tente de novo em instantes.'),
          });
        }}
      />

      <PostOptionsSheet
        visible={!!optionsPost}
        onClose={() => setOptionsPost(null)}
        post={optionsPost}
        onEditCaption={(post) => { setEditingPostId(post.id); setEditedCaption(post.description || post.caption || ''); }}
        onDelete={async (postId) => { await deleteFeedPost({ postId }); }}
        isOwner={optionsPost?.user_id === currentUserId}
      />

      <CreateEventModal
        visible={createEventVisible}
        onClose={() => setCreateEventVisible(false)}
        latitude={selectedLocation?.lat || null}
        longitude={selectedLocation?.lng || null}
        locationName={selectedLocation?.name || ''}
      />
      <EventDetailsModal visible={eventDetailsVisible} event={selectedEvent} onClose={() => setEventDetailsVisible(false)} currentUserId={currentUserId} />
    </View>
  );
}

// Aviso no centro da tela escura do feed e do mapa
function FeedMessage({ icon: MessageIcon, title, text, action, onAction, top }: {
  icon: Icon; title: string; text: string; action?: string; onAction?: () => void; top: number;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={[s.message, { paddingTop: top }]}>
      <View style={s.messageTile}><MessageIcon size={34} weight="duotone" color="#FFFFFF" /></View>
      <Text style={s.messageTitle} accessibilityRole="header">{title}</Text>
      <Text style={s.messageText}>{text}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={({ pressed }) => [s.messageBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
          <Text style={s.messageBtnText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { width: '100%', height: '100%' },

  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  messageTile: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  messageTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, textAlign: 'center' },
  messageText: { fontSize: 16, lineHeight: 23, color: 'rgba(255,255,255,0.78)', textAlign: 'center', maxWidth: 320 },
  messageBtn: { height: 52, paddingHorizontal: 28, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  messageBtnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },

  mapHint: { position: 'absolute', alignSelf: 'center', height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
  mapHintText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pinTip: { maxWidth: 260, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: c.card, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  pinTipText: { fontSize: 14, fontWeight: '600', color: c.textPrimary, textAlign: 'center' },
  addressTip: { position: 'absolute', left: 20, right: 20, bottom: 88, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: c.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  addressTipText: { flex: 1, fontSize: 15, fontWeight: '700', color: c.textPrimary },
  draftBar: { position: 'absolute', bottom: 24, left: 20, right: 20, flexDirection: 'row', gap: 12 },
  draftBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  draftCancel: { backgroundColor: 'rgba(0,0,0,0.75)' },
  draftConfirm: { backgroundColor: c.primary },
  draftCancelText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  draftConfirmText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },
});
