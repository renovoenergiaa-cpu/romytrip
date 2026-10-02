import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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
  Phone,
  Mic,
  MicOff,
  PhoneOff,
  Camera,
  CameraOff,
  RefreshCw,
  Volume2
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../src/lib/supabase';
import { sendPushNotification } from '../../src/services/notifications';
import { confirmAction, showError } from '../../src/lib/dialogs';
import { spacing, useTheme } from '../../src/theme';
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
import { Avatar } from '../../src/features/onboarding/components';
import { ChatActionsSheet, describeConversation } from '../../src/features/chat/components';
import {
  CallNote, Composer, ConversationHeader, DaySeparator, ImageViewer, LockedBar, MessageBubble,
} from '../../src/features/chat/conversation';
import { dayLabel, isDeletedName } from '../../src/features/chat/format';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Foto de quem está na chamada; sem foto, a inicial do nome (nunca uma foto de banco de imagens)
const CallPhoto = ({ uri, name, size, style }: { uri?: string; name: string; size: number; style: any }) =>
  uri ? (
    <Image source={{ uri }} style={style} />
  ) : (
    <View style={{ marginBottom: StyleSheet.flatten(style)?.marginBottom }}>
      <Avatar name={name} size={size} />
    </View>
  );

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
  const MAX_AUDIO_SECONDS = 120;
  const MAX_VIDEO_SECONDS = 60;
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
      showError('Tradução indisponível', 'Não foi possível traduzir esta mensagem agora.');
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

  const nameParam = typeof name === 'string' ? name : '';
  // Enquanto a lista de conversas não chega, usa o nome que veio na rota
  const who: ReturnType<typeof describeConversation> = conversation
    ? describeConversation(conversation)
    : isDeletedName(nameParam)
      ? { kind: 'deleted', name: 'Conta excluída', photo: undefined }
      : { kind: 'person', name: nameParam || 'Viajante', photo: undefined };
  const isDeletedAccount = who.kind === 'deleted';
  // Direto e sem o outro participante: a pessoa saiu da conversa
  const isLocked = who.kind === 'deleted' || who.kind === 'left';

  const myPhoto = myProfile?.photos?.[0] || '';
  const myName = myProfile?.name || 'Você';
  const recipientName = who.name;
  const recipientPhoto = who.photo;

  if (conversation?.other_participant?.id) {
    recipientIdRef.current = conversation.other_participant.id;
  }

  const { mutate: archiveChat, isPending: isArchiving } = useArchiveConversation();
  const { mutate: muteChat, isPending: isMuting } = useMuteConversation();
  const { mutate: leaveChat, isPending: isLeaving } = useLeaveConversation();
  const { mutate: deleteChat, isPending: isDeleting } = useDeleteConversation();

  const { colors } = useTheme();
  const styles = getStyles(colors);
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
          if (!callerPhoto) {
            try {
              const { data: callerProfile } = await supabase
                .from('users')
                .select('photos')
                .eq('id', payload.payload.callerId)
                .single();
              callerPhoto = callerProfile?.photos?.[0] || recipientPhotoRef.current || '';
            } catch {
              callerPhoto = recipientPhotoRef.current || '';
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

  const { data: messages, isLoading, isError, refetch: refetchMessages } = useMessages(id as string);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

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
            showError('Não foi possível enviar o áudio', error.message);
          }
        });
      }
    }
  };

  // Ao atingir o limite, para e envia o áudio automaticamente
  useEffect(() => {
    if (!isRecording) return;
    const timeout = setTimeout(() => sendRecording(), MAX_AUDIO_SECONDS * 1000);
    return () => clearTimeout(timeout);
  }, [isRecording]);

  const handleSendText = () => {
    if (messageText.trim() === '' || isSending) return;

    sendMessage({ conversationId: id as string, text: messageText.trim() }, {
      onSuccess: () => {
        setMessageText('');
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      onError: () => showError('Mensagem não enviada', 'Confira sua conexão e tente de novo.'),
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
          // duration vem em milissegundos (pode ser null no web; aí o limite de tamanho do servidor vale)
          if (asset.duration && asset.duration > MAX_VIDEO_SECONDS * 1000) {
            showError('Vídeo muito longo', `Envie vídeos de até ${MAX_VIDEO_SECONDS} segundos.`);
            return;
          }
          sendMessage({ conversationId: id as string, text: '', videoUri: asset.uri }, {
            onSuccess: () => {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            },
            onError: (err) => showError('Não foi possível enviar o vídeo', err.message)
          });
        } else {
          sendMessage({ conversationId: id as string, text: '', imageUri: asset.uri }, {
            onSuccess: () => {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            },
            onError: (err) => showError('Não foi possível enviar a foto', err.message)
          });
        }
      }
    } catch (err) {
      showError('Galeria indisponível', 'Não foi possível acessar suas fotos e vídeos.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Permissão necessária', 'Permita o acesso à câmera para tirar fotos ou gravar vídeos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        videoMaxDuration: MAX_VIDEO_SECONDS,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.type === 'video') {
          sendMessage({ conversationId: id as string, text: '', videoUri: asset.uri }, {
            onError: (err) => showError('Não foi possível enviar o vídeo', err.message),
          });
        } else {
          sendMessage({ conversationId: id as string, text: '', imageUri: asset.uri }, {
            onError: (err) => showError('Não foi possível enviar a foto', err.message),
          });
        }
      }
    } catch (err) {
      showError('Câmera indisponível', 'Não foi possível abrir a câmera.');
    }
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
        // Função no banco: a policy de UPDATE em messages só permite ao remetente alterar
        supabase.rpc('mark_conversation_read', { p_conversation_id: id as string })
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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat'));

  const handleToggleArchive = () => {
    archiveChat({ conversationId: id as string, isArchived: !isArchived }, {
      onSuccess: () => {
        setIsSettingsVisible(false);
        if (!isArchived) goBack();
      },
      onError: () => showError('Não foi possível arquivar', 'Tente de novo em instantes.'),
    });
  };

  const handleToggleMute = () => {
    muteChat({ conversationId: id as string, isMuted: !isMuted }, {
      onSuccess: () => setIsSettingsVisible(false),
      onError: () => showError('Não foi possível alterar as notificações', 'Tente de novo em instantes.'),
    });
  };

  const handleDeleteOrLeave = async () => {
    const ok = await confirmAction(
      isGroup
        ? { title: 'Sair do grupo?', message: 'Você deixa de receber as mensagens deste grupo.', confirmLabel: 'Sair', destructive: true }
        : { title: 'Excluir conversa?', message: 'Ela sai da sua lista e o histórico some para você.', confirmLabel: 'Excluir', destructive: true },
    );
    if (!ok) return;
    const done = {
      onSuccess: () => router.replace('/(tabs)/chat'),
      onError: () => showError('Não foi possível concluir', 'Tente de novo em instantes.'),
    };
    if (isGroup) leaveChat({ conversationId: id as string }, done);
    else deleteChat({ conversationId: id as string }, done);
  };

  // Linhas da conversa: separador de dia, avisos de chamada e mensagens agrupadas por quem enviou
  type Row =
    | { kind: 'day'; key: string; label: string }
    | { kind: 'call'; key: string; text: string }
    | { kind: 'msg'; key: string; msg: any; mine: boolean; first: boolean; last: boolean };
  const rows: Row[] = [];
  let lastDay = '';
  let lastMineId: string | null = null;
  uniqueMessages.forEach((msg: any) => {
    if (msg.text?.startsWith('[SYS:')) {
      const text = msg.text.includes('CALL_ENDED') ? 'Chamada encerrada' : msg.text.includes('CALL_REJECTED') ? 'Chamada recusada' : '';
      if (text) rows.push({ kind: 'call', key: msg.id, text });
      return;
    }
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDay) {
      lastDay = day;
      rows.push({ kind: 'day', key: `day-${day}`, label: dayLabel(msg.created_at) });
    }
    const mine = msg.sender_id === currentUserId;
    if (mine) lastMineId = msg.id;
    rows.push({ kind: 'msg', key: msg.id, msg, mine, first: true, last: true });
  });
  // Mensagens seguidas da mesma pessoa (até 5 min entre elas) formam um grupo
  const sameGroup = (a: Row | undefined, b: Row | undefined) =>
    a?.kind === 'msg' && b?.kind === 'msg' && a.msg.sender_id === b.msg.sender_id &&
    Math.abs(new Date(b.msg.created_at).getTime() - new Date(a.msg.created_at).getTime()) < 5 * 60_000;
  rows.forEach((row, i) => {
    if (row.kind !== 'msg') return;
    row.first = !sameGroup(rows[i - 1], row);
    row.last = !sameGroup(row, rows[i + 1]);
  });

  const subtitle =
    who.kind === 'group' ? `${conversation?.member_count ?? ''} pessoas`.trim()
    : who.kind === 'deleted' ? 'Indisponível'
    : who.kind === 'left' ? 'Saiu da conversa'
    : undefined;
  // Chamadas ao vivo dependem de áudio e arquivos nativos; no web elas não funcionam
  const canCall = Platform.OS !== 'web' && who.kind === 'person';

  return (
    <View style={styles.container}>
      <ConversationHeader
        who={who}
        subtitle={subtitle}
        onBack={goBack}
        onCall={canCall ? () => initiateCall('voice') : undefined}
        onVideo={canCall ? () => initiateCall('video') : undefined}
        onMore={conversation ? () => setIsSettingsVisible(true) : undefined}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando mensagens" />
          ) : isError && !messages ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Não conseguimos carregar as mensagens</Text>
              <TouchableOpacity onPress={() => refetchMessages()} style={styles.noticeBtn} accessibilityRole="button">
                <Text style={styles.noticeBtnText}>Tentar de novo</Text>
              </TouchableOpacity>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>{isLocked ? 'Nenhuma mensagem' : 'Comece a conversa'}</Text>
              {!isLocked && <Text style={styles.noticeText}>{`Mande a primeira mensagem para ${who.name.split(' ')[0]}.`}</Text>}
            </View>
          ) : (
            rows.map((row) => {
              if (row.kind === 'day') return <DaySeparator key={row.key} label={row.label} />;
              if (row.kind === 'call') return <CallNote key={row.key} text={row.text} />;
              return (
                <MessageBubble
                  key={row.key}
                  msg={row.msg}
                  mine={row.mine}
                  firstInGroup={row.first}
                  lastInGroup={row.last}
                  showRead={row.msg.id === lastMineId && !!row.msg.read_at}
                  translation={translatedMessages[row.msg.id]}
                  translating={translatingId === row.msg.id}
                  onTranslate={() => handleTranslate(row.msg.id, row.msg.text)}
                  onOpenImage={setSelectedImage}
                />
              );
            })
          )}
        </ScrollView>

        {isLocked ? (
          <LockedBar text={isDeletedAccount ? 'Esta conta foi excluída. Não é possível responder a esta conversa.' : 'Esta pessoa saiu da conversa. Não é possível responder.'} />
        ) : (
          <Composer
            value={messageText}
            onChange={setMessageText}
            onSend={handleSendText}
            sending={isSending}
            recording={isRecording}
            seconds={recordingDuration}
            maxSeconds={MAX_AUDIO_SECONDS}
            onPickMedia={handlePickMedia}
            onTakePhoto={handleTakePhoto}
            onStartRecording={startRecording}
            onCancelRecording={cancelRecording}
            onSendRecording={sendRecording}
          />
        )}
      </KeyboardAvoidingView>

      {/* Call Screen Modal */}
      <Modal visible={callState !== 'idle'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.callContainer}>
          {/* Incoming Call Screen */}
          {callState === 'incoming' && (
            <View style={styles.callCenterContent}>
              <View style={styles.avatarPulseRing}>
                <CallPhoto uri={incomingCallerPhoto || recipientPhoto} name={incomingCallerName || recipientName} size={120} style={styles.callAvatar} />
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
                <CallPhoto uri={recipientPhoto} name={recipientName} size={120} style={styles.callAvatar} />
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
                      <CallPhoto uri={recipientPhoto} name={recipientName} size={110} style={styles.videoAvatarCenter} />
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
                  <CallPhoto uri={recipientPhoto} name={recipientName} size={130} style={styles.callAvatarLarge} />
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

      <ImageViewer uri={selectedImage} onClose={() => setSelectedImage(null)} />

      <ChatActionsSheet
        chat={isSettingsVisible && conversation ? conversation : null}
        onClose={() => setIsSettingsVisible(false)}
        onArchive={handleToggleArchive}
        onMute={handleToggleMute}
        onLeave={handleDeleteOrLeave}
        busy={isArchiving || isMuting || isLeaving || isDeleting}
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  notice: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  noticeTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  noticeText: { fontSize: 15, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' },
  noticeBtn: { height: 48, paddingHorizontal: 22, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  noticeBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
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
});
