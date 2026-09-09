import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, SafeAreaView, Platform, FlatList, Dimensions, Share, ActivityIndicator, Modal, TextInput, Alert, Image, KeyboardAvoidingView, ScrollView, DeviceEventEmitter, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, MapPin, Navigation, Plane, UserPlus, BadgeCheck, Plus, X, Send, Camera, Film, Image as ImageIcon, Music, Search, Play, Pause, MessageSquare } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useState, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFeed, usePostLikes, useTogglePostLike, useCreatePost, useComments, useCreateComment, useDeleteFeedPost, useUpdatePostCaption } from '../../src/hooks/useFeed';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { colors, spacing, typography } from '../../src/theme';
import { useCurrentUserId } from '../../src/hooks/useMessenger';
import { EmptyState } from '../../src/components/EmptyState';

import { useRouter } from 'expo-router';

import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRef } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useLocalEvents } from '../../src/hooks/useEvents';
import CreateEventModal, { AVAILABLE_EVENT_ICONS } from '../../src/components/CreateEventModal';
import EventDetailsModal from '../../src/components/EventDetailsModal';
import CommunitiesScreen from './communities';
import HelpBoardScreen from '../../app/help-board';
import ProximaViagemScreen from '../../src/components/ProximaViagemScreen';
import FeedPostItem, { FEED_SNAP_HEIGHT, PostItemData } from '../../src/components/FeedPostItem';

const { width, height } = Dimensions.get('window');
const SNAP_HEIGHT = FEED_SNAP_HEIGHT;

interface ITunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl60: string;
}


// Event Marker Component to fix Android clipping bug
const EventMarker = ({ event, onPress }: { event: any, onPress: () => void }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  
  useEffect(() => {
    // Android map rendering often clips complex views if tracked continuously.
    // Disabling tracking after the initial layout pass takes a perfect snapshot.
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const iconObj = AVAILABLE_EVENT_ICONS.find(i => i.id === event.icon);
  const IconComp = iconObj?.component;

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ position: 'absolute', fontSize: 56, color: colors.primary, textAlign: 'center', includeFontPadding: false }}>●</Text>
        <Text style={{ position: 'absolute', fontSize: 48, color: '#FFF', textAlign: 'center', includeFontPadding: false }}>●</Text>
        {IconComp ? (
          <IconComp size={22} color={colors.primary} />
        ) : (
          <Text style={styles.markerIcon}>{event.icon}</Text>
        )}
      </View>
    </Marker>
  );
};

export default function RomyFeedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'aqui' | 'rolando' | 'comunidades' | 'proximo' | 'ajudinha'>('aqui');
  const { destination: userNextDestination } = useOnboardingStore();
  
  const [currentGpsCity, setCurrentGpsCity] = useState<string>('');
  const [destinationFilter, setDestinationFilter] = useState('');
  
  const [discoveryModalVisible, setDiscoveryModalVisible] = useState(false);
  
  // Map and Events State
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name: string} | null>(null);
  const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
  const [eventDetailsVisible, setEventDetailsVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const currentUserId = useCurrentUserId();
  const insets = useSafeAreaInsets();
  // Height of the floating top nav bar.
  // Android: paddingTop:40 already clears the status bar, so don't add insets.top again.
  // iOS: paddingTop is only 10, so we need insets.top for the notch.
  const NAV_BAR_HEIGHT = (Platform.OS === 'android' ? 40 : insets.top + 10) + 38;
  
  const { data: localEvents } = useLocalEvents(mapRegion?.latitude, mapRegion?.longitude, 50);

  // Pulse animation for Add button
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedPlusStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }]
    };
  });

  // Removed manual currentUserId fetch, handled by useCurrentUserId hook

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('openCreatePost', () => {
      handleAddPostClick();
    });
    return () => sub.remove();
  }, []);

  // Update feed filter when tab or location changes
  const [userCityOnly, setUserCityOnly] = useState<string>('');

  const extractCityName = (props: any) => {
    if (!props) return '';
    return props.city || props.town || props.village || props.county || props.municipality || props.state || '';
  };

  useEffect(() => {
    if (activeTab === 'aqui') {
      setDestinationFilter(userCityOnly || currentGpsCity || '');
    } else {
      setDestinationFilter(userNextDestination || '');
    }
  }, [activeTab, currentGpsCity, userCityOnly, userNextDestination]);

  const { data: posts, isLoading, refetch: refetchFeed } = useFeed(destinationFilter);
  const { data: likedPostsMap } = usePostLikes();
  const { mutate: toggleLike } = useTogglePostLike();
  const { mutate: createPost, isPending: isCreatingPost } = useCreatePost();
  const { mutate: deleteFeedPost } = useDeleteFeedPost();
  const { mutate: updateCaption, isPending: isUpdatingCaption } = useUpdatePostCaption();

  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false);

  const handleFeedRefresh = async () => {
    setIsFeedRefreshing(true);
    try {
      await refetchFeed();
    } finally {
      setIsFeedRefreshing(false);
    }
  };

  const [editCaptionModalVisible, setEditCaptionModalVisible] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editedCaption, setEditedCaption] = useState('');
  
  // Map Draft Event States
  const [isDraftingEvent, setIsDraftingEvent] = useState(false);
  const [draftEventLocation, setDraftEventLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [draftLocationName, setDraftLocationName] = useState<string>('Buscando local...');
  const mapRef = useRef<any>(null);

  // Post Creation States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [mediaOptionModalVisible, setMediaOptionModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newPostDestination, setNewPostDestination] = useState('');
  const [newPostDescription, setNewPostDescription] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: string, title: string, url: string } | null>(null);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [searchResults, setSearchResults] = useState<ITunesSong[]>([]);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Clean up sound when modal closes
  useEffect(() => {
    if (!musicModalVisible && previewSound) {
      previewSound.unloadAsync();
      setPreviewSound(null);
      setPlayingTrackId(null);
    }
  }, [musicModalVisible]);

  // Comments States
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  
  const { data: comments, isLoading: isLoadingComments } = useComments(activePostId);
  const { mutate: createComment, isPending: isCreatingComment } = useCreateComment();

  // Helper for summarized location (bairro / cidade / região para privacidade)
  const formatSummarizedLocation = (props: any) => {
    if (!props) return 'Região Próxima';
    const neighborhood = props.suburb || props.district || props.neighbourhood || props.quarter;
    const city = props.city || props.town || props.village || props.county;
    const stateOrCountry = props.state || props.country || '';

    if (neighborhood && city && neighborhood !== city) {
      return `${neighborhood}, ${city}`;
    } else if (city && stateOrCountry) {
      return `${city}, ${stateOrCountry}`;
    } else if (city) {
      return city;
    } else if (neighborhood) {
      return neighborhood;
    }
    return 'Região Próxima';
  };

  const formatExactLocation = (props: any) => {
    if (!props) return 'Local Desconhecido';
    if (props.name) return props.name;
    const street = props.street || props.road || props.pedestrian;
    const number = props.housenumber;
    if (street && number) return `${street}, ${number}`;
    if (street) return street;
    return formatSummarizedLocation(props);
  };

  // Fetch user location in background for "Estou aqui" tab
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      try {
        let location = await Location.getCurrentPositionAsync({});
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        const res = await fetch(`https://photon.komoot.io/reverse?lon=${location.coords.longitude}&lat=${location.coords.latitude}`);
        const data = await res.json();
        
        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          const cityOnly = extractCityName(props);
          setUserCityOnly(cityOnly);
          const locStr = formatSummarizedLocation(props);
          setCurrentGpsCity(locStr);
        }
      } catch (e) {
        console.log('Location error:', e);
      }
    })();
  }, []);

  const handleLike = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isLiked = likedPostsMap?.[postId] || false;
    toggleLike({ postId, isLiked });
  };

  const handleShare = async (post: any) => {
    try {
      await Share.share({
        message: `Olha este post de ${post.users?.name || 'alguém'} no Romy! Destino: ${post.destination}.`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleOpenComments = (postId: string) => {
    setActivePostId(postId);
    setCommentsModalVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsModalVisible(false);
    setActivePostId(null);
    setNewCommentText('');
  };

  const handleSubmitComment = () => {
    if (!newCommentText.trim() || !activePostId) return;
    
    createComment({
      postId: activePostId,
      content: newCommentText.trim()
    }, {
      onSuccess: () => {
        setNewCommentText('');
      },
      onError: (err) => {
        Alert.alert('Erro', 'Não foi possível enviar o comentário.');
      }
    });
  };

  const handleLongPressMap = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setDraftEventLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude });
    setIsDraftingEvent(true);
    mapRef.current?.animateToRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
  };

  const handleConfirmDraftLocation = () => {
    if (!draftEventLocation) return;
    setSelectedLocation({ lat: draftEventLocation.latitude, lng: draftEventLocation.longitude, name: draftLocationName });
    setIsDraftingEvent(false);
    setDraftEventLocation(null);
    setCreateEventModalVisible(true);
  };

  const handleCancelDraftLocation = () => {
    setIsDraftingEvent(false);
    setDraftEventLocation(null);
  };

  const handleAddPostClick = () => {
    setMediaOptionModalVisible(true);
  };

  const processSelectedMedia = async (uri: string) => {
    setSelectedImage(uri);
    setIsLocating(true);
    setCreateModalVisible(true);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos do GPS para publicar de um local real.');
        setCreateModalVisible(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const res = await fetch(`https://photon.komoot.io/reverse?lon=${location.coords.longitude}&lat=${location.coords.latitude}`);
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const locStr = formatSummarizedLocation(data.features[0].properties);
        setNewPostDestination(locStr);
      } else {
        setNewPostDestination('Região Próxima');
      }
    } catch (error) {
      setNewPostDestination('Região Próxima');
    } finally {
      setIsLocating(false);
    }
  };

  const handleTakeCameraPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão Negada', 'Precisamos da sua permissão para acessar a câmera.');
        setMediaOptionModalVisible(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      setMediaOptionModalVisible(false);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTimeout(() => {
          processSelectedMedia(result.assets[0].uri);
        }, 800);
      }
    } catch (err: any) {
      setMediaOptionModalVisible(false);
      Alert.alert('Erro', 'Não foi possível abrir a câmera: ' + (err?.message || err));
    }
  };

  const handleRecordCameraVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão Negada', 'Precisamos da sua permissão para gravar vídeos.');
        setMediaOptionModalVisible(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });
      setMediaOptionModalVisible(false);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTimeout(() => {
          processSelectedMedia(result.assets[0].uri);
        }, 800);
      }
    } catch (err: any) {
      setMediaOptionModalVisible(false);
      Alert.alert('Erro', 'Não foi possível gravar o vídeo: ' + (err?.message || err));
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão Negada', 'Precisamos de permissão para acessar a galeria de fotos.');
        setMediaOptionModalVisible(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });
      setMediaOptionModalVisible(false);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTimeout(() => {
          processSelectedMedia(result.assets[0].uri);
        }, 800);
      }
    } catch (err: any) {
      setMediaOptionModalVisible(false);
      Alert.alert('Erro', 'Não foi possível selecionar a mídia: ' + (err?.message || err));
    }
  };

  const handleSubmitPost = () => {
    if (!selectedImage || !newPostDestination) {
      Alert.alert('Erro', 'Por favor, aguarde sua localização e insira uma imagem.');
      return;
    }

    createPost({
      mediaUri: selectedImage,
      destination: newPostDestination,
      description: newPostDescription,
      audio_title: selectedSong ? selectedSong.title : undefined,
      audio_url: selectedSong ? selectedSong.url : undefined,
    }, {
      onSuccess: () => {
        setCreateModalVisible(false);
        setSelectedImage(null);
        setNewPostDestination('');
        setNewPostDescription('');
        setSelectedSong(null);
        setMusicSearchQuery('');
        setSearchResults([]);
        Alert.alert('Sucesso', 'Post publicado com sucesso!');
      },
      onError: (err) => {
        Alert.alert('Erro', 'Ocorreu um erro ao publicar: ' + err.message);
      }
    });
  };

  let searchTimeout: any = null;
  const searchiTunesMusic = (query: string) => {
    setMusicSearchQuery(query);
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearchingMusic(true);
    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`);
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.log('Error searching iTunes:', err);
      } finally {
        setIsSearchingMusic(false);
      }
    }, 500);
  };

  const handlePreviewSong = async (item: ITunesSong) => {
    if (previewSound) {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
      setPreviewSound(null);
    }
    
    if (playingTrackId === item.trackId.toString()) {
      setPlayingTrackId(null);
      return; // Just paused
    }

    setPlayingTrackId(item.trackId.toString());
    
    // Auto-select the song so if they close the modal, it's saved
    setSelectedSong({
      id: item.trackId.toString(),
      title: `${item.trackName} - ${item.artistName}`,
      url: item.previewUrl
    });

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: item.previewUrl },
        { shouldPlay: true }
      );
      setPreviewSound(sound);
    } catch (e) {
      console.log('Error previewing sound', e);
    }
  };

  const renderComment = ({ item }: { item: any }) => {
    const author = item.users || {};
    const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';
    const avatarImage = author.photos && author.photos.length > 0 ? author.photos[0] : defaultAvatar;

    return (
      <View style={styles.commentItem}>
        <Image source={{ uri: avatarImage }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <Text style={styles.commentName}>{author.name || 'Viajante'}</Text>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const [activePostIndex, setActivePostIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActivePostIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const handlePostOptions = (item: any) => {
    Alert.alert(
      'Opções da Publicação',
      '',
      [
        { 
          text: 'Editar Legenda', 
          onPress: () => {
            setEditingPostId(item.id);
            setEditedCaption(item.description || '');
            setEditCaptionModalVisible(true);
          }
        },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            Alert.alert(
              'Excluir Publicação',
              'Tem certeza que deseja apagar esta publicação?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Excluir',
                  style: 'destructive',
                  onPress: () => {
                    deleteFeedPost({ postId: item.id }, {
                      onSuccess: () => Alert.alert('Sucesso', 'Publicação excluída.')
                    });
                  }
                }
              ]
            );
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const renderPost = ({ item, index }: { item: any; index: number }) => {
    const isLiked = likedPostsMap?.[item.id] || false;

    return (
      <FeedPostItem
        item={item}
        isVisible={index === activePostIndex}
        isLiked={isLiked}
        onLike={handleLike}
        onOpenComments={handleOpenComments}
        onShare={handleShare}
        onUserPress={(userId) => router.push(`/user/${userId}`)}
        onOptionsPress={() => handlePostOptions(item)}
        isOwner={item.user_id === currentUserId}
      />
    );
  };

  return (
    <View style={styles.container}>
      
      <SafeAreaView style={styles.safeAreaAbsolute}>
        <View style={styles.topNavWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.topNavContainer}
            style={{ flex: 1, marginRight: spacing.sm }}
          >
            <TouchableOpacity 
              style={styles.tabWrapper}
              activeOpacity={0.8}
              onPress={() => { 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('aqui');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'aqui' && styles.tabTextActive]}>Estou aqui</Text>
              {activeTab === 'aqui' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabWrapper}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('rolando');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'rolando' && styles.tabTextActive]}>Tá rolando</Text>
              {activeTab === 'rolando' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabWrapper}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('comunidades');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'comunidades' && styles.tabTextActive]}>Comunidades</Text>
              {activeTab === 'comunidades' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabWrapper}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('ajudinha');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'ajudinha' && styles.tabTextActive]}>Ajudinha</Text>
              {activeTab === 'ajudinha' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabWrapper}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('proximo');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'proximo' && styles.tabTextActive]}>Próxima viagem</Text>
              {activeTab === 'proximo' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Main Feed Content */}
      {activeTab === 'aqui' ? (
        isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : posts && posts.length > 0 ? (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={FEED_SNAP_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={
              <RefreshControl
                refreshing={isFeedRefreshing}
                onRefresh={handleFeedRefresh}
                tintColor="#FFFFFF"
                colors={['#6338FA']}
                progressBackgroundColor="#111"
              />
            }
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: '#111' }}>
            <EmptyState
              icon={MessageSquare}
              title="Nenhum post por aqui"
              subtitle="Seja o primeiro a publicar neste destino. Toque no (+) abaixo!"
            />
          </View>
        )
      ) : activeTab === 'rolando' ? (
        <View style={[styles.mapContainer, { paddingTop: NAV_BAR_HEIGHT }]}>
          {mapRegion ? (
            <View style={{ flex: 1 }}>
              <MapView 
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                showsUserLocation={true}
                onLongPress={handleLongPressMap}
                onRegionChangeComplete={async (region) => {
                  if (isDraftingEvent) {
                    setDraftEventLocation({ latitude: region.latitude, longitude: region.longitude });
                    setDraftLocationName('Buscando local...');
                    try {
                      const geocodeResult = await Location.reverseGeocodeAsync({
                        latitude: region.latitude,
                        longitude: region.longitude,
                      });
                      if (geocodeResult && geocodeResult.length > 0) {
                        const addr = geocodeResult[0];
                        let name = '';
                        if (addr.name && addr.name !== addr.streetNumber && addr.name !== addr.street) {
                          name = addr.name;
                        } else if (addr.street) {
                          name = addr.streetNumber ? `${addr.street}, ${addr.streetNumber}` : addr.street;
                        } else {
                          name = addr.district || addr.subregion || 'Local no Mapa';
                        }
                        setDraftLocationName(name);
                      } else {
                        setDraftLocationName('Local no Mapa');
                      }
                    } catch (e) {
                      setDraftLocationName('Local no Mapa');
                    }
                  }
                }}
              >
                {localEvents?.map((event: any) => (
                  <EventMarker 
                    key={event.id}
                    event={event}
                    onPress={() => {
                      setSelectedEvent(event);
                      setEventDetailsVisible(true);
                    }}
                  />
                ))}
              </MapView>
              {isDraftingEvent && (
                <View style={styles.fixedPinContainer} pointerEvents="none">
                  <View style={styles.draftTooltip}>
                    <Text style={styles.draftTooltipText} numberOfLines={1}>{draftLocationName}</Text>
                  </View>
                  <View style={styles.fixedPin}>
                    <MapPin size={40} color={colors.primary} fill={colors.primary} />
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          
          {isDraftingEvent ? (
            <View style={styles.draftConfirmContainer}>
              <TouchableOpacity style={styles.draftCancelButton} onPress={handleCancelDraftLocation}>
                <Text style={styles.draftCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.draftConfirmButton} onPress={handleConfirmDraftLocation}>
                <Text style={styles.draftConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapHintContainer}>
              <Text style={styles.mapHintText}>Segure no mapa para criar um evento</Text>
            </View>
          )}
        </View>
      ) : activeTab === 'comunidades' ? (
        <View style={{ flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 100 : 90 }}>
          <CommunitiesScreen />
        </View>
      ) : activeTab === 'ajudinha' ? (
        <View style={{ flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 100 : 90 }}>
          <HelpBoardScreen isEmbedded={true} />
        </View>
      ) : (
        <ProximaViagemScreen />
      )}

      {/* Comments Modal */}
      <Modal visible={commentsModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { height: height * 0.75, paddingBottom: 0 }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Comentários</Text>
              <TouchableOpacity onPress={handleCloseComments} accessibilityLabel="Fechar comentários" accessibilityRole="button">
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {isLoadingComments ? (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : comments && comments.length > 0 ? (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, ...typography.body }}>
                  Nenhum comentário ainda. Seja o primeiro!
                </Text>
              </View>
            )}

            <View style={styles.commentInputWrapper}>
              <TextInput
                style={styles.commentInput}
                placeholder="Adicionar um comentário..."
                placeholderTextColor={colors.textMuted}
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity 
                style={[styles.sendCommentBtn, !newCommentText.trim() && { opacity: 0.5 }]} 
                onPress={handleSubmitComment}
                disabled={!newCommentText.trim() || isCreatingComment}
              >
                {isCreatingComment ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Send size={18} color={colors.surface} style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Media Source Choice Modal */}
      <Modal visible={mediaOptionModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMediaOptionModalVisible(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Criar Publicação</Text>
              <TouchableOpacity onPress={() => setMediaOptionModalVisible(false)} accessibilityLabel="Fechar" accessibilityRole="button">
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handleTakeCameraPhoto}>
              <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(99, 56, 250, 0.15)' }]}>
                <Camera size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Tirar Foto na hora</Text>
                <Text style={styles.pickerOptionSub}>Abra a câmera para registrar o momento</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handleRecordCameraVideo}>
              <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(255, 42, 84, 0.15)' }]}>
                <Film size={24} color="#FF2A54" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Gravar Vídeo na hora</Text>
                <Text style={styles.pickerOptionSub}>Grave um vídeo para o feed Romy</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handlePickFromGallery}>
              <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ImageIcon size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Escolher da Galeria</Text>
                <Text style={styles.pickerOptionSub}>Selecione fotos ou vídeos salvos</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
{/* Create Post Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, musicModalVisible && { height: height * 0.6 }]}>
            {musicModalVisible ? (
              <View style={{ flex: 1, minHeight: 400 }}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Selecionar Música</Text>
                  <TouchableOpacity onPress={() => setMusicModalVisible(false)}>
                    <X size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.gpsInputContainer}>
                  <Search size={20} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                  <TextInput
                    style={styles.gpsInputText}
                    placeholder="Pesquise por música ou artista..."
                    placeholderTextColor={colors.textMuted}
                    value={musicSearchQuery}
                    onChangeText={searchiTunesMusic}
                    autoCapitalize="none"
                    autoFocus
                  />
                  {isSearchingMusic && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                {searchResults.length === 0 && musicSearchQuery.length < 2 && (
                   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
                      <Music size={48} color={colors.textMuted} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                         Digite o nome da música ou artista para buscar no Apple Music.
                      </Text>
                   </View>
                )}
                
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.trackId.toString()}
                  contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: 40 }}
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: spacing.md,
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: selectedSong?.id === item.trackId.toString() ? colors.primary : 'transparent'
                      }}
                      onPress={() => {
                        if (item.previewUrl) {
                          handlePreviewSong(item);
                        } else {
                          Alert.alert('Aviso', 'Esta música não tem prévia disponível.');
                        }
                      }}
                    >
                      <View style={{ position: 'relative', marginRight: spacing.md }}>
                        {item.artworkUrl60 ? (
                          <Image source={{ uri: item.artworkUrl60 }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                        ) : (
                          <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(99, 56, 250, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                            <Music size={20} color={colors.primary} />
                          </View>
                        )}
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: playingTrackId === item.trackId.toString() ? 'rgba(0,0,0,0.5)' : 'transparent', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                          {playingTrackId === item.trackId.toString() ? (
                            <Pause size={20} color="#FFF" fill="#FFF" />
                          ) : (
                            <Play size={20} color="#FFF" fill="#FFF" style={{ opacity: 0.8 }} />
                          )}
                        </View>
                      </View>
                      
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '600', marginBottom: 2 }} numberOfLines={1}>{item.trackName}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{item.artistName}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={{ padding: 8, backgroundColor: selectedSong?.id === item.trackId.toString() ? colors.primary : 'rgba(255,255,255,0.1)', borderRadius: 20 }}
                        onPress={() => {
                          setSelectedSong({
                            id: item.trackId.toString(),
                            title: `${item.trackName} - ${item.artistName}`,
                            url: item.previewUrl
                          });
                          setMusicModalVisible(false);
                        }}
                      >
                        {selectedSong?.id === item.trackId.toString() ? (
                          <BadgeCheck size={20} color="#FFF" />
                        ) : (
                          <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600', paddingHorizontal: 4 }}>Usar</Text>
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setCreateModalVisible(false)}>
                  <X size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                
                <Text style={styles.modalTitle}>Novo Post</Text>
                
                {selectedImage && (
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                )}
                
                <Text style={styles.modalLabel}>Localização GPS (Obrigatória)</Text>
                <View style={styles.gpsInputContainer}>
                  <MapPin size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ flex: 1 }} />
                  ) : (
                    <TextInput
                      style={styles.gpsInputText}
                      value={newPostDestination}
                      editable={false}
                      placeholder="Buscando seu local real..."
                      placeholderTextColor={colors.textMuted}
                    />
                  )}
                </View>

                <Text style={styles.modalLabel}>Música de Fundo (Opcional)</Text>
                <TouchableOpacity 
                  style={[styles.gpsInputContainer, { marginBottom: spacing.md, paddingVertical: 12, backgroundColor: selectedSong ? 'rgba(99, 56, 250, 0.1)' : colors.surface }]} 
                  onPress={() => setMusicModalVisible(true)}
                >
                  <Music size={20} color={selectedSong ? colors.primary : colors.textMuted} style={{ marginRight: spacing.sm }} />
                  <Text style={{ flex: 1, color: selectedSong ? colors.textPrimary : colors.textMuted, fontSize: 14 }}>
                    {selectedSong ? selectedSong.title : 'Escolher Música'}
                  </Text>
                  {selectedSong && (
                    <TouchableOpacity onPress={() => setSelectedSong(null)} style={{ padding: 4 }}>
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <Text style={styles.modalLabel}>Descrição (Opcional)</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Escreva algo sobre este lugar..."
                  multiline
                  numberOfLines={3}
                  value={newPostDescription}
                  onChangeText={setNewPostDescription}
                />

                <TouchableOpacity 
                  style={[styles.submitButton, (isCreatingPost || isLocating) && { opacity: 0.7 }]} 
                  onPress={handleSubmitPost}
                  disabled={isCreatingPost || isLocating}
                >
                  {isCreatingPost ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.submitButtonText}>Publicar Post</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Event Modals */}
      <CreateEventModal 
        visible={createEventModalVisible}
        onClose={() => setCreateEventModalVisible(false)}
        latitude={selectedLocation?.lat || null}
        longitude={selectedLocation?.lng || null}
        locationName={selectedLocation?.name || ''}
      />
      <EventDetailsModal
        visible={eventDetailsVisible}
        event={selectedEvent}
        onClose={() => setEventDetailsVisible(false)}
        currentUserId={currentUserId}
      />

      {/* Edit Caption Modal */}
      <Modal visible={editCaptionModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: spacing.xxl }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Editar Legenda</Text>
              <TouchableOpacity onPress={() => setEditCaptionModalVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top', marginTop: spacing.md }]}
              placeholder="Sua legenda aqui..."
              multiline
              placeholderTextColor={colors.textMuted}
              value={editedCaption}
              onChangeText={setEditedCaption}
            />

            <TouchableOpacity 
              style={[styles.submitButton, { marginTop: spacing.lg }]} 
              onPress={() => {
                if (!editingPostId) return;
                updateCaption({ postId: editingPostId, description: editedCaption }, {
                  onSuccess: () => {
                    setEditCaptionModalVisible(false);
                  }
                });
              }}
              disabled={isUpdatingCaption}
            >
              {isUpdatingCaption ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  feedItem: {
    height: SNAP_HEIGHT,
    width: width,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow removed to prevent clipping
  },
  markerIcon: {
    fontSize: 20,
  },
  mapHintContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapHintText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeAreaAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topNavWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: spacing.md,
  },
  topNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Decreased gap so the 4th item can peek into view
    paddingRight: 40,
  },
  tabWrapper: {
    paddingVertical: spacing.sm,
    paddingBottom: 2,
  },
  tabText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabUnderline: {
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    marginTop: 3,
    alignSelf: 'center',
    width: '70%',
  },
  topAddButtonContainer: {
    marginLeft: 'auto',
    paddingLeft: spacing.sm,
  },
  topAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginLeft: spacing.xs,
  },
  topAddGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.sm,
    backgroundColor: '#333',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    ...typography.body,
    color: colors.surface,
    lineHeight: 20,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  dateButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  actionBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  actionText: {
    ...typography.caption,
    color: colors.surface,
    marginTop: 4,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  closeModalButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  gpsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.md,
    opacity: 0.8,
  },
  gpsInputText: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
    backgroundColor: '#eee',
  },
  commentContent: {
    flex: 1,
  },
  commentName: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    height: 40,
    ...typography.body,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 40,
    width: '100%',
  },
  pickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    gap: 14,
  },
  pickerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pickerOptionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  draftConfirmContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  draftCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftCancelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  draftConfirmText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  fixedPinContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedPin: {
    marginTop: -10, // Adjust relative to tooltip and center
  },
  draftTooltip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 250,
  },
  draftTooltipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
