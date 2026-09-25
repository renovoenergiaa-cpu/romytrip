import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  Image, 
  Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  Send, 
  Phone, 
  Video as VideoIcon, 
  MoreVertical, 
  Mic, 
  MicOff, 
  Trash2, 
  Play, 
  Pause, 
  BellOff, 
  Archive, 
  LogOut, 
  X, 
  Image as ImageIcon, 
  PhoneOff, 
  Camera, 
  CameraOff, 
  RefreshCw,
  Volume2,
  Sparkles,
  User,
  Lock
} from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import { useGlobalNotification } from '../../src/context/GlobalNotificationContext';
import { 
  createAudioPlayer, 
  AudioModule, 
  AudioRecorder, 
  RecordingPresets, 
  requestRecordingPermissionsAsync, 
  setAudioModeAsync 
} from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../src/lib/supabase';
import { sendPushNotification } from '../../src/services/notifications';
import { spacing, typography, useTheme } from '../../src/theme';
import { 
  useMessages, 
  useSendMessage, 
  useCurrentUserId, 
  useConversations, 
  useArchiveConversation, 
  useMuteConversation, 
  useLeaveConversation, 
  useDeleteConversation,
  translateText
} from '../../src/hooks/useMessenger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ChatVideoItem = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      nativeControls={true}
      contentFit="contain"
    />
  );
};

const AudioPlayer = ({ url, isSender }: { url: string; isSender: boolean }) => {
  const { colors } = useTheme();
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playSound = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (player) {
        if (isPlaying) {
          player.pause();
          setIsPlaying(false);
        } else {
          player.play();
          setIsPlaying(true);
        }
      } else {
        const newPlayer = createAudioPlayer({ uri: url });
        newPlayer.play();
        setPlayer(newPlayer);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
          player.remove?.();
        } catch (e) {}
      }
    };
  }, [player]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', width: 180, paddingVertical: 4 }}>
      <TouchableOpacity onPress={playSound}>
        {isPlaying ? (
          <Pause size={24} color={isSender ? '#FFF' : colors.primary} />
        ) : (
          <Play size={24} color={isSender ? '#FFF' : colors.primary} />
        )}
      </TouchableOpacity>
      <View style={{ flex: 1, height: 4, backgroundColor: isSender ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.1)', marginLeft: 12, borderRadius: 2 }}>
        <View style={{ width: isPlaying ? '50%' : '0%', height: '100%', backgroundColor: isSender ? '#FFF' : colors.primary, borderRadius: 2 }} />
      </View>
    </View>
  );
};

export default function ChatDetailScreen() {
  const { id, name, autoAcceptCall, callType: paramCallType, recipientId: paramRecipientId } = useLocalSearchParams();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { setActiveConversationId } = useGlobalNotification();

  // Tell the global context which conversation is open so it suppresses the message banner
  useEffect(() => {
    setActiveConversationId(id as string);
    return () => setActiveConversationId(null);
  }, [id, setActiveConversationId]);

  const [messageText, setMessageText] = useState('');
  const [recording, setRecording] = useState<AudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});

  const handleTranslate = async (msgId: string, originalText: string) => {
    /* COMENTADO TEMPORARIAMENTE PARA TESTES (Liberado para todos)
    if (myProfile?.plan !== 'premium' && myProfile?.plan !== 'gold') {
      Alert.alert(
        'Recurso Premium',
        'A tradução simultânea com IA é exclusiva para assinantes Premium ou Gold.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Conhecer Planos', onPress: () => router.push('/(modals)/paywall') }
        ]
      );
      return;
    }
    */
    
    setTranslatingId(msgId);
    
    const translated = await translateText(originalText, 'PT-BR');
    if (translated) {
      setTranslatedMessages(prev => ({ ...prev, [msgId]: translated }));
    } else {
      Alert.alert('Erro', 'Não foi possível realizar a tradução.');
    }
    setTranslatingId(null);
  };

  // Call states
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callTimer, setCallTimer] = useState<number>(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true); // Forçando o Viva-Voz por padrão
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [remoteVideoFrame, setRemoteVideoFrame] = useState<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState<string>('');
  const [incomingCallerPhoto, setIncomingCallerPhoto] = useState<string>('');

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const userCallChannelRef = useRef<any>(null);
  const recipientIdRef = useRef<string | null>(
    typeof paramRecipientId === 'string' ? paramRecipientId : null
  );

  const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';

  // Fetch logged in user profile
  const { data: myProfile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('users').select('id, name, photos').eq('id', user.id).single();
      return data;
    },
  });

  const { data: conversations } = useConversations();
  const conversation = conversations?.find((c: any) => c.id === id);
  const isGroup = conversation?.is_group;
  const isArchived = conversation?.is_archived;
  const isMuted = conversation?.is_muted;

  const isDeletedAccount = !isGroup && (
    conversation?.other_participant?.name === 'Conta Excluída' ||
    conversation?.other_participant?.name === 'Usuário Romy' ||
    name === 'Conta Excluída' ||
    name === 'Usuário Romy' ||
    (conversation && !conversation.is_group && !conversation.other_participant)
  );

  const myPhoto = myProfile?.photos?.[0] || defaultAvatar;
  const myName = myProfile?.name || 'Você';
  const recipientName = isDeletedAccount 
    ? 'Conta Excluída' 
    : ((name as string) || conversation?.other_participant?.name || 'Viajante');
  const recipientPhoto = isDeletedAccount 
    ? null 
    : (conversation?.other_participant?.photos?.[0] || defaultAvatar);

  if (conversation?.other_participant?.id) {
    recipientIdRef.current = conversation.other_participant.id;
  }

  const { mutate: archiveChat, isPending: isArchiving } = useArchiveConversation();
  const { mutate: muteChat, isPending: isMuting } = useMuteConversation();
  const { mutate: leaveChat, isPending: isLeaving } = useLeaveConversation();
  const { mutate: deleteChat, isPending: isDeleting } = useDeleteConversation();

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  // Refs estáveis para evitar recriar o canal a cada render
  const recipientNameRef = useRef(recipientName);
  const recipientPhotoRef = useRef(recipientPhoto);
  useEffect(() => { recipientNameRef.current = recipientName; }, [recipientName]);
  useEffect(() => { recipientPhotoRef.current = recipientPhoto; }, [recipientPhoto]);

  // Track callState ref for unmount cleanup
  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // Refs para fila de áudio em tempo real sem engasgos
  const voiceQueueRef = useRef<string[]>([]);
  const isPlayingVoiceRef = useRef(false);

  const playNextVoiceChunk = async () => {
    if (isPlayingVoiceRef.current || voiceQueueRef.current.length === 0) return;
    isPlayingVoiceRef.current = true;
    const chunkBase64 = voiceQueueRef.current.shift();
    if (!chunkBase64) {
      isPlayingVoiceRef.current = false;
      return;
    }

    try {
      const fileUri = `${FileSystem.cacheDirectory}live_voice_${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`;
      await FileSystem.writeAsStringAsync(fileUri, chunkBase64, { encoding: 'base64' });

      const player: any = createAudioPlayer({ uri: fileUri });
      player.play();

      player.addListener('playbackStatusUpdate', async (status: any) => {
        if (status.didJustFinish) {
          try {
            player.remove?.();
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          } catch {}
          isPlayingVoiceRef.current = false;
          playNextVoiceChunk();
        }
      });
    } catch (err) {
      console.log('Error playing incoming live voice chunk:', err);
      isPlayingVoiceRef.current = false;
      setTimeout(playNextVoiceChunk, 100);
    }
  };

  const isMicMutedRef = useRef(isMicMuted);
  useEffect(() => { isMicMutedRef.current = isMicMuted; }, [isMicMuted]);

  const isChannelSubscribedRef = useRef(false);

  // Handle dynamic audio routing when speaker is toggled
  useEffect(() => {
    if (callState === 'connected') {
      setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: !isSpeakerOn,
      }).catch(() => {});
    }
  }, [isSpeakerOn, callState]);

  // Supabase Realtime Call Signaling, Audio & Video Frame Listener
  useEffect(() => {
    if (!id || !currentUserId) return;

    const channel = supabase.channel(`call_${id}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'call-offer' }, async (payload) => {
        if (payload.payload.callerId !== currentUserId) {
          setIncomingCallerName(payload.payload.callerName || recipientNameRef.current);
          setCallType(payload.payload.callType || 'voice');

          let callerPhoto = payload.payload.callerPhoto || '';
          if (!callerPhoto || callerPhoto === defaultAvatar) {
            try {
              const { data: callerProfile } = await supabase
                .from('users')
                .select('photos')
                .eq('id', payload.payload.callerId)
                .single();
              callerPhoto = callerProfile?.photos?.[0] || recipientPhotoRef.current;
            } catch {
              callerPhoto = recipientPhotoRef.current;
            }
          }
          setIncomingCallerPhoto(callerPhoto);
          setCallState('incoming');
        }
      })
      .on('broadcast', { event: 'call-answer' }, () => {
        setCallState('connected');
        setCallTimer(0);
      })
      .on('broadcast', { event: 'call-rejected' }, () => {
        Alert.alert('Chamada Recusada', `${recipientNameRef.current} não pode atender no momento.`);
        endCallLocally();
      })
      .on('broadcast', { event: 'call-ended' }, () => {
        endCallLocally();
      })
      .on('broadcast', { event: 'voice-chunk' }, (payload) => {
        if (payload.payload.senderId !== currentUserId && payload.payload.audioBase64) {
          voiceQueueRef.current.push(payload.payload.audioBase64);
          playNextVoiceChunk();
        }
      })
      .on('broadcast', { event: 'video-frame' }, (payload) => {
        if (payload.payload.senderId !== currentUserId && payload.payload.frameBase64) {
          setRemoteVideoFrame(`data:image/jpeg;base64,${payload.payload.frameBase64}`);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isChannelSubscribedRef.current = true;
        } else {
          isChannelSubscribedRef.current = false;
        }
      });

    // Fallback: Also listen to our own personal channel for call-ended in case call_id channel crashes
    const fallbackCh = supabase.channel(`fallback_user_call_${currentUserId}`, {
      config: { broadcast: { self: false } },
    });
    fallbackCh.on('broadcast', { event: 'call-ended' }, (payload) => {
      if (payload.payload.conversationId === id) {
        endCallLocally();
      }
    }).subscribe();

    // Fallback: Listen to database messages for call-ended
    const dbFallbackCh = supabase
      .channel(`db_fallback_call_${id}_${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== currentUserId && (msg.text?.startsWith('[SYS:CALL_ENDED]') || msg.text?.startsWith('[SYS:CALL_REJECTED]'))) {
          endCallLocally();
        }
      }).subscribe();

    return () => {
      isChannelSubscribedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(fallbackCh);
      supabase.removeChannel(dbFallbackCh);
    };
  }, [id, currentUserId]);

  // Unmount safety: end call if user leaves screen while active
  useEffect(() => {
    return () => {
      if (callStateRef.current !== 'idle' && currentUserId && id) {
        const payload = { senderId: currentUserId, conversationId: id as string };
        const otherId = recipientIdRef.current;
        if (otherId) {
          try {
            const userCallCh = supabase.channel(`user_call_${otherId}`, {
              config: { broadcast: { self: false } },
            });
            userCallCh.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                userCallCh.send({ type: 'broadcast', event: 'call-ended', payload });
                setTimeout(() => { try { supabase.removeChannel(userCallCh); } catch {} }, 1500);
              }
            });
          } catch {}
        }
      }
    };
  }, [id, currentUserId]);

  const AAC_AUDIO_RECORDING_OPTIONS = RecordingPresets.LOW_QUALITY;

  const getOtherUserId = async (): Promise<string | null> => {
    if (recipientIdRef.current) return recipientIdRef.current;

    if (paramRecipientId && typeof paramRecipientId === 'string') {
      recipientIdRef.current = paramRecipientId;
      return paramRecipientId;
    }

    if (conversation?.other_participant?.id) {
      recipientIdRef.current = conversation.other_participant.id;
      return conversation.other_participant.id;
    }

    if (!id || !currentUserId) return null;

    try {
      const { data } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', id);

      if (data && data.length > 0) {
        const other = data.find((p: any) => p.user_id !== currentUserId);
        if (other?.user_id) {
          recipientIdRef.current = other.user_id;
          return other.user_id;
        }
      }
    } catch {}

    try {
      const { data: msgData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('conversation_id', id)
        .neq('sender_id', currentUserId)
        .limit(1)
        .maybeSingle();

      if (msgData?.sender_id) {
        recipientIdRef.current = msgData.sender_id;
        return msgData.sender_id;
      }
    } catch {}

    return null;
  };

  // Persistent cross-device signaling channel for the other participant
  useEffect(() => {
    let ch: any = null;
    getOtherUserId().then((otherId) => {
      if (otherId) {
        ch = supabase.channel(`user_call_${otherId}`, {
          config: { broadcast: { self: true } }
        });
        ch.subscribe();
        userCallChannelRef.current = ch;
      }
    });

    return () => {
      if (ch) supabase.removeChannel(ch);
      userCallChannelRef.current = null;
    };
  }, [id, currentUserId]);

  const keepAlivePlayerRef = useRef<any>(null);

  // Keep-alive silent sound effect to pin AudioSession active during calls
  useEffect(() => {
    if (callState !== 'connected') {
      if (keepAlivePlayerRef.current) {
        try {
          keepAlivePlayerRef.current.pause();
          keepAlivePlayerRef.current.remove?.();
        } catch (e) {}
        keepAlivePlayerRef.current = null;
      }
      return;
    }

    const startKeepAliveSound = async () => {
      try {
        const silentAudioUri = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        const player = createAudioPlayer({ uri: silentAudioUri });
        player.loop = true;
        player.volume = 0.01;
        player.play();
        keepAlivePlayerRef.current = player;
      } catch (e) {}
    };

    startKeepAliveSound();

    return () => {
      if (keepAlivePlayerRef.current) {
        try {
          keepAlivePlayerRef.current.pause();
          keepAlivePlayerRef.current.remove?.();
        } catch (e) {}
        keepAlivePlayerRef.current = null;
      }
    };
  }, [callState]);

  const broadcastCallSignal = async (event: string, payload: any, targetUserId?: string | null): Promise<void> => {
    let sent = false;
    if (channelRef.current && isChannelSubscribedRef.current) {
      try {
        await channelRef.current.send({ type: 'broadcast', event, payload });
        sent = true;
      } catch (e) {}
    }

    if (userCallChannelRef.current) {
      try {
        await userCallChannelRef.current.send({ type: 'broadcast', event, payload });
        sent = true;
      } catch (e) {}
    } 
    
    if (!sent) {
      const recipientId = targetUserId || (await getOtherUserId());
      if (recipientId) {
        try {
          const tempCh = supabase.channel(`temp_user_call_${recipientId}_${Date.now()}`, {
            config: { broadcast: { self: false } },
          });
          tempCh.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              tempCh.send({ type: 'broadcast', event, payload });
              setTimeout(() => { try { supabase.removeChannel(tempCh); } catch {} }, 500);
            }
          });
        } catch (e) {}
      }
    }
    
    // DB Fallback for 100% Guaranteed Delivery (bypasses WebSockets rate limiting entirely)
    try {
      const dbEvent = event.toUpperCase().replace('-', '_'); // call-offer -> CALL_OFFER
      await supabase.from('messages').insert({
        conversation_id: id as string,
        sender_id: currentUserId,
        text: `[SYS:${dbEvent}] ${JSON.stringify(payload)}`,
      });
    } catch (e) {}
  };

  // Handle auto-connecting accepted call when navigated from IncomingCallBanner
  useEffect(() => {
    if (autoAcceptCall === 'true') {
      setCallType(paramCallType === 'video' ? 'video' : 'voice');
      setCallState('connected');
      setCallTimer(0);
      getOtherUserId().then((otherId) => {
        broadcastCallSignal('call-answer', { answererId: currentUserId, conversationId: id as string }, otherId);
      });
    }
  }, [autoAcceptCall, paramCallType, currentUserId, id]);

  const recordSingleSlice = async (): Promise<string | null> => {
    let recorder: AudioRecorder | null = null;
    try {
      recorder = new AudioModule.AudioRecorder(RecordingPresets.LOW_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      await new Promise((res) => setTimeout(res, 1200)); // Reduzido de 3000ms para 1200ms para mais fluidez
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return null;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch (e) {}
      return base64;
    } catch (e) {
      if (recorder) {
        try { await recorder.stop(); } catch (err) {}
      }
      return null;
    }
  };

  // Live Microphone Audio Transmission Loop when Connected
  useEffect(() => {
    if (callState !== 'connected') return;
    let isStreamActive = true;

    const setupLiveVoiceTransmission = async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: !isSpeakerOn,
        });

        while (isStreamActive && callState === 'connected') {
          if (!isMicMutedRef.current && isChannelSubscribedRef.current) {
            const chunkBase64 = await recordSingleSlice();
            // Aumentamos o limite para 500kb já que o trecho agora tem 3 segundos
            if (chunkBase64 && chunkBase64.length < 500_000 && isStreamActive && callState === 'connected') {
              try {
                await channelRef.current?.send({
                  type: 'broadcast',
                  event: 'voice-chunk',
                  payload: { audioBase64: chunkBase64, senderId: currentUserId },
                });
              } catch (err) {}
            }
            await new Promise((res) => setTimeout(res, 200)); // Delay to let WebSocket flush
          } else {
            await new Promise((res) => setTimeout(res, 500));
          }
        }
      } catch (err) {
        console.error('Failed to initialize live voice stream:', err);
      }
    };

    setupLiveVoiceTransmission();

    return () => {
      isStreamActive = false;
    };
  }, [callState, id, currentUserId, isSpeakerOn]);

  // Live Video Frame Transmission Loop when Video Connected
  useEffect(() => {
    let isVideoLoopActive = true;

    const setupLiveVideoTransmission = async () => {
      if (callState !== 'connected' || callType !== 'video' || isCamMuted) return;

      const transmitVideoFrame = async () => {
        if (!isVideoLoopActive || callState !== 'connected' || isCamMuted) return;

        try {
          const cam = cameraRef.current;
          if (cam) {
            const photo = await cam.takePictureAsync({
              quality: 0.05, 
              base64: true,
              shutterSound: false,
            });

            const MAX_BASE64_BYTES = 400_000; // Limite maior para que as câmeras Android não descartem o frame
            if (photo?.base64 && isVideoLoopActive && channelRef.current) {
              if (photo.base64.length < MAX_BASE64_BYTES) {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'video-frame',
                  payload: { frameBase64: photo.base64, senderId: currentUserId },
                });
              }
            }
          }
        } catch (e) {
          console.log('[VIDEO] Error capturing frame:', e);
        }

        if (isVideoLoopActive && callState === 'connected' && !isCamMuted) {
          setTimeout(transmitVideoFrame, 2500); // Throttled to 2.5s
        }
      };

      setTimeout(transmitVideoFrame, 2500);
    };

    setupLiveVideoTransmission();

    return () => {
      isVideoLoopActive = false;
    };
  }, [callState, callType, isCamMuted, id, currentUserId]);

  // Call timer effect
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Audio recording timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const initiateCall = async (type: 'voice' | 'video') => {
    if (type === 'video') {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          Alert.alert('Permissão Negada', 'Habilite a câmera nas configurações do seu aparelho para fazer chamadas de vídeo.');
        }
      }
    }
    const audioPerm = await requestRecordingPermissionsAsync();
    if (!audioPerm.granted) {
      Alert.alert('Permissão de Áudio', 'Habilite o microfone nas configurações para realizar chamadas.');
    }

    setCallType(type);
    setCallState('calling');
    setIsMicMuted(false);
    setIsCamMuted(false);

    const callPayload = {
      callerId: currentUserId,
      callerName: myName,
      callerPhoto: myPhoto,
      callType: type,
      conversationId: id as string,
    };

    const otherUserId = await getOtherUserId();
    if (otherUserId) {
      sendPushNotification(
        otherUserId,
        type === 'video' ? '📹 Chamada de vídeo recebida' : '📞 Chamada de voz recebida',
        `${myName} está ligando para você...`,
        { type: 'call', conversationId: id as string, callType: type }
      );
    }
    broadcastCallSignal('call-offer', callPayload, otherUserId);
  };

  const acceptCall = async () => {
    if (callType === 'video') {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          Alert.alert('Permissão Negada', 'Habilite a câmera nas configurações do seu aparelho para fazer chamadas de vídeo.');
        }
      }
    }
    await requestRecordingPermissionsAsync();

    setCallState('connected');
    setCallTimer(0);

    const otherId = await getOtherUserId();
    broadcastCallSignal('call-answer', { answererId: currentUserId, conversationId: id as string }, otherId);
  };

  const rejectCall = async () => {
    const otherId = await getOtherUserId();
    broadcastCallSignal('call-rejected', { rejecterId: currentUserId, conversationId: id as string }, otherId);
    endCallLocally();
  };

  const terminateCall = async () => {
    const payload = { senderId: currentUserId, conversationId: id as string };
    const otherId = await getOtherUserId();
    await broadcastCallSignal('call-ended', payload, otherId);
    
    // Give WebSocket 500ms to flush the buffer before we tear down the call state
    setTimeout(() => {
      endCallLocally();
    }, 500);
  };

  const endCallLocally = () => {
    setCallState('idle');
    setCallTimer(0);
    setIsMicMuted(false);
    setIsCamMuted(false);
    setRemoteVideoFrame(null);
    voiceQueueRef.current = [];
    isPlayingVoiceRef.current = false;
    
    setTimeout(() => {
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      }).catch(() => {});
    }, 1500);
  };

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status === 'granted') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        const rec = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
        await rec.prepareToRecordAsync();
        rec.record();
        setRecording(rec);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const cancelRecording = async () => {
    setIsRecording(false);
    if (recording) {
      try {
        await recording.stop();
      } catch (e) {}
      setRecording(null);
    }
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (e) {}
  };

  const sendRecording = async () => {
    setIsRecording(false);
    if (recording) {
      let uri: string | null = null;
      try {
        await recording.stop();
        uri = recording.uri;
      } catch (e) {}
      setRecording(null);

      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      } catch (e) {}
      
      if (uri) {
        sendMessage({ conversationId: id as string, text: '', audioUri: uri }, {
          onSuccess: () => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
          onError: (error) => {
            Alert.alert("Erro ao enviar áudio", error.message);
          }
        });
      }
    }
  };

  const { data: messages, isLoading } = useMessages(id as string);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  const handleSendText = () => {
    if (messageText.trim() === '') return;
    
    sendMessage({ conversationId: id as string, text: messageText.trim() }, {
      onSuccess: () => {
        setMessageText('');
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
  };

  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.type === 'video') {
          sendMessage({ conversationId: id as string, text: '', videoUri: asset.uri }, {
            onSuccess: () => {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            },
            onError: (err) => Alert.alert('Erro ao enviar vídeo', err.message)
          });
        } else {
          sendMessage({ conversationId: id as string, text: '', imageUri: asset.uri }, {
            onSuccess: () => {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            },
            onError: (err) => Alert.alert('Erro ao enviar foto', err.message)
          });
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível acessar a biblioteca de mídia.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Conceda permissão de câmera para capturar fotos ou vídeos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.type === 'video') {
          sendMessage({ conversationId: id as string, text: '', videoUri: asset.uri });
        } else {
          sendMessage({ conversationId: id as string, text: '', imageUri: asset.uri });
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera.');
    }
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (messages && currentUserId) {
      const unreadIds = messages
        .filter((m: any) => m.sender_id !== currentUserId && !m.read_at)
        .map((m: any) => m.id);
        
      if (unreadIds.length > 0) {
        supabase.from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['messages', id] });
          });
      }
    }
  }, [messages, currentUserId, id, queryClient]);

  const uniqueMessages = messages 
    ? Array.from(new Map(messages.map((m: any) => [m.id, m])).values()) 
    : [];

  const handleToggleArchive = () => {
    archiveChat({ conversationId: id as string, isArchived: !isArchived }, {
      onSuccess: () => {
        setIsSettingsVisible(false);
        if (!isArchived) router.back();
      }
    });
  };

  const handleToggleMute = () => {
    muteChat({ conversationId: id as string, isMuted: !isMuted }, {
      onSuccess: () => setIsSettingsVisible(false)
    });
  };

  const handleDeleteOrLeave = () => {
    const title = isGroup ? 'Sair do Grupo' : 'Excluir Conversa';
    const message = isGroup 
      ? 'Tem certeza que deseja sair deste grupo?' 
      : 'Tem certeza que deseja excluir esta conversa?';

    const executeAction = () => {
      if (isGroup) {
        leaveChat({ conversationId: id as string }, {
          onSuccess: () => router.replace('/(tabs)/chat')
        });
      } else {
        deleteChat({ conversationId: id as string }, {
          onSuccess: () => router.replace('/(tabs)/chat')
        });
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        executeAction();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: isGroup ? 'Sair' : 'Excluir', 
            style: 'destructive', 
            onPress: executeAction
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerLeft, { flex: 1 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', marginRight: 10 }}>
            {isDeletedAccount ? (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#334155' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                <User size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </View>
            ) : recipientPhoto ? (
              <Image source={{ uri: recipientPhoto }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                <User size={20} color="#FFF" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{recipientName}</Text>
            {isDeletedAccount && (
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Indisponível</Text>
            )}
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {!isDeletedAccount && (
            <>
              <TouchableOpacity style={styles.headerIcon} onPress={() => initiateCall('voice')}>
                <Phone size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon} onPress={() => initiateCall('video')}>
                <VideoIcon size={20} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.headerIcon} onPress={() => setIsSettingsVisible(true)}>
            <MoreVertical size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={{ padding: spacing.md, justifyContent: 'flex-end', flexGrow: 1 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : uniqueMessages.map((msg: any) => {
          if (msg.text?.startsWith('[SYS:')) {
            if (msg.text.includes('CALL_OFFER') || msg.text.includes('CALL_ANSWER')) return null;
            let sysText = '';
            if (msg.text.includes('CALL_ENDED')) sysText = '📞 Chamada encerrada';
            else if (msg.text.includes('CALL_REJECTED')) sysText = '📞 Chamada recusada';
            
            if (sysText) {
              return (
                <View key={msg.id} style={{ alignItems: 'center', marginVertical: spacing.sm }}>
                  <View style={{ backgroundColor: isDark ? '#333' : '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>{sysText}</Text>
                  </View>
                </View>
              );
            }
            return null;
          }

          const isSender = msg.sender_id === currentUserId;
          return (
            <View key={msg.id} style={{ alignItems: isSender ? 'flex-end' : 'flex-start', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[isSender ? styles.messageBubbleSender : styles.messageBubbleReceiver, { marginBottom: 2 }]}>
                  {msg.audio_url ? (
                    <AudioPlayer url={msg.audio_url} isSender={isSender} />
                  ) : msg.image_url ? (
                    <TouchableOpacity onPress={() => setSelectedImage(msg.image_url)} activeOpacity={0.9}>
                      <Image 
                        source={{ uri: msg.image_url }} 
                        style={styles.chatImage} 
                        resizeMode="cover" 
                      />
                      {msg.text && msg.text !== '[Foto]' && (
                        <Text style={[isSender ? styles.messageTextSender : styles.messageTextReceiver, { marginTop: 6 }]}>
                          {msg.text}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : msg.video_url ? (
                    <View style={styles.chatVideoContainer}>
                      <ChatVideoItem uri={msg.video_url} />
                      {msg.text && msg.text !== '[Vídeo]' && (
                        <Text style={[isSender ? styles.messageTextSender : styles.messageTextReceiver, { marginTop: 6 }]}>
                          {msg.text}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text style={isSender ? styles.messageTextSender : styles.messageTextReceiver}>{msg.text}</Text>
                      {translatedMessages[msg.id] && (
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }}>
                          <Text style={[isSender ? styles.messageTextSender : styles.messageTextReceiver, { fontStyle: 'italic' }]}>
                            {translatedMessages[msg.id]}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>✨ Traduzido por DeepL</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Botão de Traduzir IA para mensagens recebidas em texto */}
                {!isSender && msg.text && !msg.image_url && !msg.video_url && !msg.audio_url && !translatedMessages[msg.id] && (
                  <TouchableOpacity 
                    style={{ marginLeft: 8, padding: 6, backgroundColor: isDark ? '#333' : '#F3E8FF', borderRadius: 16 }}
                    onPress={() => handleTranslate(msg.id, msg.text)}
                  >
                    {translatingId === msg.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Sparkles size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginRight: 4, marginLeft: 4 }}>
                {formatTime(msg.created_at)}
                {isSender && msg.read_at && ` • Lido ${formatTime(msg.read_at)}`}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {isDeletedAccount ? (
          <View style={[styles.deletedNoticeBar, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderTopColor: colors.border }]}>
            <Lock size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.deletedNoticeText, { color: colors.textMuted }]}>
              Esta conta foi excluída. Não é possível responder a esta conversa.
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            {isRecording ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm }}>
                <TouchableOpacity onPress={cancelRecording} style={{ padding: 10 }}>
                  <Trash2 size={24} color="#EF4444" />
                </TouchableOpacity>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginRight: 8, opacity: recordingDuration % 2 === 0 ? 1 : 0.5 }} />
                  <Text style={{ ...typography.body, color: colors.textPrimary }}>
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                
                <TouchableOpacity onPress={sendRecording} style={styles.sendButton} disabled={isSending}>
                  {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={handlePickMedia} style={styles.attachButton}>
                  <ImageIcon size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleTakePhoto} style={styles.attachButton}>
                  <Camera size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Digite sua mensagem..."
                  placeholderTextColor={colors.textMuted}
                  value={messageText}
                  onChangeText={setMessageText}
                  onSubmitEditing={handleSendText}
                />
                {messageText.trim().length > 0 ? (
                  <TouchableOpacity style={styles.sendButton} onPress={handleSendText} disabled={isSending}>
                    {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.micButton} onPress={startRecording}>
                    <Mic size={22} color="#FFF" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Call Screen Modal */}
      <Modal visible={callState !== 'idle'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.callContainer}>
          {/* Incoming Call Screen */}
          {callState === 'incoming' && (
            <View style={styles.callCenterContent}>
              <View style={styles.avatarPulseRing}>
                <Image source={{ uri: incomingCallerPhoto || recipientPhoto }} style={styles.callAvatar} />
              </View>
              <Text style={styles.callerNameText}>{incomingCallerName || recipientName}</Text>
              <Text style={styles.callStateText}>
                Chamada de {callType === 'video' ? 'Vídeo' : 'Voz'} Recebida...
              </Text>

              <View style={styles.callActionRow}>
                <TouchableOpacity style={[styles.callActionButton, { backgroundColor: '#EF4444' }]} onPress={rejectCall}>
                  <PhoneOff size={28} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callActionButton, { backgroundColor: '#10B981' }]} onPress={acceptCall}>
                  <Phone size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Outbound Ringing Call Screen */}
          {callState === 'calling' && (
            <View style={styles.callCenterContent}>
              <View style={styles.avatarPulseRing}>
                <Image source={{ uri: recipientPhoto }} style={styles.callAvatar} />
              </View>
              <Text style={styles.callerNameText}>{recipientName}</Text>
              <Text style={styles.callStateText}>Chamando...</Text>

              <View style={styles.callActionRow}>
                <TouchableOpacity style={[styles.callActionButton, { backgroundColor: '#EF4444' }]} onPress={terminateCall}>
                  <PhoneOff size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Connected Call Screen */}
          {callState === 'connected' && (
            <View style={styles.callConnectedContent}>
              {callType === 'video' ? (
                <View style={styles.videoStreamPlaceholder}>
                  {remoteVideoFrame ? (
                    <Image source={{ uri: remoteVideoFrame }} style={styles.videoStreamOverlay} resizeMode="cover" />
                  ) : (
                    <View style={styles.videoPlaceholderBackground}>
                      <Image source={{ uri: recipientPhoto }} style={styles.videoAvatarCenter} />
                      <Text style={styles.videoWaitingText}>Aguardando vídeo de {recipientName}...</Text>
                    </View>
                  )}

                  {/* Local Camera View (Picture-in-Picture) - always on top */}
                  {!isCamMuted && (
                    <View style={styles.selfVideoCorner}>
                      {permission?.granted ? (
                        <CameraView 
                          ref={cameraRef} 
                          style={styles.selfVideoCamera} 
                          facing={facing}
                          animateShutter={false}
                        />
                      ) : (
                        <TouchableOpacity style={styles.permissionPromptCorner} onPress={requestPermission}>
                          <Camera size={20} color="#FFF" />
                          <Text style={styles.permissionPromptText}>Ativar Câmera</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.liveVideoBadge}>
                    <Text style={styles.liveVideoBadgeText}>Vídeo HD • Ao Vivo ({formatCallDuration(callTimer)})</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.audioCallCenter}>
                  <Image source={{ uri: recipientPhoto }} style={styles.callAvatarLarge} />
                  <Text style={styles.callerNameText}>{recipientName}</Text>
                  <Text style={styles.callTimerText}>{formatCallDuration(callTimer)}</Text>
                </View>
              )}

              {/* Bottom Call Controls */}
              <View style={styles.connectedControlsRow}>
                <TouchableOpacity 
                  style={[styles.controlCircle, isSpeakerOn && { backgroundColor: '#A78BFA' }]} 
                  onPress={() => setIsSpeakerOn(!isSpeakerOn)}
                >
                  <Volume2 size={24} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlCircle, isMicMuted && { backgroundColor: '#EF4444' }]}
                  onPress={() => setIsMicMuted(!isMicMuted)}
                >
                  {isMicMuted ? <MicOff size={24} color="#FFF" /> : <Mic size={24} color="#FFF" />}
                </TouchableOpacity>

                {callType === 'video' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.controlCircle, isCamMuted && { backgroundColor: '#EF4444' }]}
                      onPress={() => setIsCamMuted(!isCamMuted)}
                    >
                      {isCamMuted ? <CameraOff size={24} color="#FFF" /> : <Camera size={24} color="#FFF" />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.controlCircle}
                      onPress={toggleCameraFacing}
                    >
                      <RefreshCw size={24} color="#FFF" />
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity style={[styles.controlCircle, { backgroundColor: '#EF4444' }]} onPress={terminateCall}>
                  <PhoneOff size={26} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Full-screen Image Preview Modal */}
      <Modal visible={!!selectedImage} animationType="fade" transparent={true}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setSelectedImage(null)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} animationType="fade" transparent={true}>
        <View style={styles.settingsOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsSettingsVisible(false)} />
          <View style={styles.settingsContent}>
            <View style={styles.dragHandle} />
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Gerenciar Chat</Text>
            </View>

            <TouchableOpacity style={styles.actionRow} onPress={handleToggleArchive} disabled={isArchiving}>
              <View style={styles.actionIconContainer}>
                <Archive size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{isArchived ? 'Desarquivar' : 'Arquivar'}</Text>
              {isArchiving && <ActivityIndicator color={colors.textPrimary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={handleToggleMute} disabled={isMuting}>
              <View style={styles.actionIconContainer}>
                <BellOff size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{isMuted ? 'Ativar Notificações' : 'Silenciar'}</Text>
              {isMuting && <ActivityIndicator color={colors.textPrimary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleDeleteOrLeave} disabled={isDeleting || isLeaving}>
              <View style={[styles.actionIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                {isGroup ? <LogOut size={22} color="#EF4444" /> : <Trash2 size={22} color="#EF4444" />}
              </View>
              <Text style={[styles.actionText, { color: '#EF4444' }]}>
                {isGroup ? 'Sair do Grupo' : 'Excluir Conversa'}
              </Text>
              {(isDeleting || isLeaving) && <ActivityIndicator color="#EF4444" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  headerIcon: {
    padding: spacing.xs,
  },
  chatArea: {
    flex: 1,
    backgroundColor: isDark ? colors.background : '#F9FAFB',
  },
  messageBubbleReceiver: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    maxWidth: '80%',
  },
  messageBubbleSender: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 16,
    maxWidth: '80%',
  },
  messageTextReceiver: {
    ...typography.body,
    color: colors.textPrimary,
  },
  messageTextSender: {
    ...typography.body,
    color: '#FFFFFF',
  },
  chatImage: {
    width: 220,
    height: 180,
    borderRadius: 12,
  },
  chatVideoContainer: {
    width: 230,
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  chatVideo: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 6,
  },
  attachButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  settingsHeader: {
    marginBottom: spacing.md,
  },
  settingsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  // Call Screen Styles
  callContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  callCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  avatarPulseRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  callAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  callAvatarLarge: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: spacing.md,
  },
  callerNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  callStateText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: spacing.xxl,
  },
  callTimerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#38BDF8',
    marginBottom: spacing.xl,
  },
  callActionRow: {
    flexDirection: 'row',
    gap: 40,
    marginTop: spacing.xl,
  },
  callActionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callConnectedContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  audioCallCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoStreamPlaceholder: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E293B',
    marginTop: spacing.md,
  },
  videoStreamOverlay: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholderBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: spacing.xl,
  },
  videoAvatarCenter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: spacing.md,
  },
  videoWaitingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  selfVideoCorner: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 5,
    backgroundColor: '#000',
  },
  selfVideoCamera: {
    width: '100%',
    height: '100%',
  },
  liveVideoBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liveVideoBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  connectedControlsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: spacing.xl,
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  permissionPromptCorner: {
    flex: 1,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  permissionPromptText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  deletedNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  deletedNoticeText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
