import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface IncomingCall {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  callType: 'voice' | 'video';
}

export interface InAppBanner {
  conversationId: string;
  senderName: string;
  senderPhoto: string;
  messagePreview: string;
}

interface GlobalNotificationContextType {
  incomingCall: IncomingCall | null;
  dismissCall: () => void;
  acceptCallAndNavigate: (callback: (conversationId: string, callType: 'voice' | 'video') => void) => void;
  rejectCall: () => void;
  messageBanner: InAppBanner | null;
  dismissBanner: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType>({
  incomingCall: null,
  dismissCall: () => {},
  acceptCallAndNavigate: () => {},
  rejectCall: () => {},
  messageBanner: null,
  dismissBanner: () => {},
  activeConversationId: null,
  setActiveConversationId: () => {},
});

export const useGlobalNotification = () => useContext(GlobalNotificationContext);

export function GlobalNotificationProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [messageBanner, setMessageBanner] = useState<InAppBanner | null>(null);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);

  // Refs – updated synchronously so Realtime callbacks always read the latest value
  const callChannelRef = useRef<any>(null);       // the channel used to reject/accept
  const currentUserIdRef = useRef<string | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  // Unique per-mount suffix for postgres_changes channel to avoid StrictMode conflicts
  const sessionIdRef = useRef(`${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const [userId, setUserId] = useState<string | null>(null);

  const setActiveConversationId = useCallback((id: string | null) => {
    activeConversationIdRef.current = id;
    setActiveConversationIdState(id);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Track current user id via auth listener dynamically
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id || null;
      currentUserIdRef.current = uid;
      setUserId(uid);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id || null;
      currentUserIdRef.current = uid;
      setUserId(uid);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;
    const channels: any[] = [];

    const setup = async () => {
      // ── Personal call channel ────────────────────────────────────────────────
      const callCh = supabase.channel(`user_call_${userId}`, {
        config: { broadcast: { self: false } },
      });

      callCh.on('broadcast', { event: 'call-offer' }, async (payload) => {
        if (isCancelled || !mountedRef.current) return;
        if (payload.payload.callerId === userId) return; // ignore self

        let callerPhoto = payload.payload.callerPhoto || '';
        if (!callerPhoto) {
          try {
            const { data } = await supabase
              .from('users')
              .select('photos')
              .eq('id', payload.payload.callerId)
              .single();
            callerPhoto = data?.photos?.[0] || '';
          } catch {}
        }

        if (isCancelled || !mountedRef.current) return;
        callChannelRef.current = callCh;
        setIncomingCall({
          conversationId: payload.payload.conversationId,
          callerId: payload.payload.callerId,
          callerName: payload.payload.callerName || 'Alguém',
          callerPhoto,
          callType: payload.payload.callType || 'voice',
        });
      });

      callCh.on('broadcast', { event: 'call-ended' }, () => {
        if (mountedRef.current) setIncomingCall(null);
      });

      callCh.on('broadcast', { event: 'call-rejected' }, () => {
        if (mountedRef.current) setIncomingCall(null);
      });

      callCh.on('broadcast', { event: 'call-answer' }, () => {
        if (mountedRef.current) setIncomingCall(null);
      });

      callCh.subscribe((status: string) => {
        console.log(`[GLOBAL_NOTIF] Channel user_call_${userId} status: ${status}`);
      });
      channels.push(callCh);
      if (isCancelled) return;

      // ── New messages channel ─────────────────────────────────────────────────
      const { data: myParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (!myParticipants || myParticipants.length === 0 || isCancelled) return;

      const convIdSet = new Set(myParticipants.map((p) => p.conversation_id));
      const sid = sessionIdRef.current;

      const msgCh = supabase
        .channel(`global_msgs_${sid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            if (isCancelled || !mountedRef.current) return;
            const newMsg = payload.new as any;

            if (newMsg.text?.startsWith('[SYS:CALL_OFFER]')) {
              try {
                const callPayload = JSON.parse(newMsg.text.replace('[SYS:CALL_OFFER] ', ''));
                if (callPayload.callerId === currentUserIdRef.current) return;
                
                let callerPhoto = callPayload.callerPhoto || '';
                if (!callerPhoto) {
                  try {
                    const { data } = await supabase.from('users').select('photos').eq('id', callPayload.callerId).single();
                    callerPhoto = data?.photos?.[0] || '';
                  } catch {}
                }
                
                callChannelRef.current = null; // Using DB fallback
                setIncomingCall({
                  conversationId: callPayload.conversationId,
                  callerId: callPayload.callerId,
                  callerName: callPayload.callerName || 'Alguém',
                  callerPhoto,
                  callType: callPayload.callType || 'voice',
                });
              } catch (e) {}
              return;
            }

            if (newMsg.text?.startsWith('[SYS:CALL_ENDED]') || newMsg.text?.startsWith('[SYS:CALL_REJECTED]')) {
              if (mountedRef.current) setIncomingCall(null);
              return;
            }

            if (!convIdSet.has(newMsg.conversation_id)) return;
            if (newMsg.sender_id === currentUserIdRef.current) return;
            if (newMsg.conversation_id === activeConversationIdRef.current) return;

            try {
              const { data: senderData } = await supabase
                .from('users')
                .select('name, photos')
                .eq('id', newMsg.sender_id)
                .single();

              if (isCancelled || !mountedRef.current) return;

              const senderName = senderData?.name || 'Nova mensagem';
              const senderPhoto = senderData?.photos?.[0] || '';
              const messagePreview =
                newMsg.text ||
                (newMsg.audio_url
                  ? '🎵 Mensagem de voz'
                  : newMsg.image_url
                  ? '📷 Foto'
                  : newMsg.video_url
                  ? '🎬 Vídeo'
                  : '...');

              if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
              setMessageBanner({ conversationId: newMsg.conversation_id, senderName, senderPhoto, messagePreview });
              bannerTimerRef.current = setTimeout(() => {
                if (mountedRef.current) setMessageBanner(null);
              }, 4000);
            } catch (e) {
              console.log('[GLOBAL_NOTIF] Error fetching sender info:', e);
            }
          }
        )
        .subscribe();

      channels.push(msgCh);
    };

    setup();

    return () => {
      isCancelled = true;
      channels.forEach((ch) => { try { supabase.removeChannel(ch); } catch {} });
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissCall = useCallback(() => setIncomingCall(null), []);

  const acceptCallAndNavigate = useCallback(
    (callback: (conversationId: string, callType: 'voice' | 'video') => void) => {
      if (!incomingCall) return;
      const convId = incomingCall.conversationId;
      const type = incomingCall.callType;
      const callerId = incomingCall.callerId;
      setIncomingCall(null);

      const answerPayload = { answererId: currentUserIdRef.current, conversationId: convId };

      // Send call-answer on conversation channel
      const convCh = supabase.channel(`call_${convId}`, {
        config: { broadcast: { self: false } },
      });
      convCh.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          convCh.send({
            type: 'broadcast',
            event: 'call-answer',
            payload: answerPayload,
          });
          setTimeout(() => { try { supabase.removeChannel(convCh); } catch {} }, 1500);
        }
      });

      // Send call-answer on caller's personal channel
      if (callerId) {
        const callerCh = supabase.channel(`user_call_${callerId}`, {
          config: { broadcast: { self: false } },
        });
        callerCh.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            callerCh.send({
              type: 'broadcast',
              event: 'call-answer',
              payload: answerPayload,
            });
            setTimeout(() => { try { supabase.removeChannel(callerCh); } catch {} }, 1500);
          }
        });
      }

      callback(convId, type);
    },
    [incomingCall]
  );

  const rejectCall = useCallback(() => {
    if (!incomingCall) { setIncomingCall(null); return; }
    const convId = incomingCall.conversationId;
    const callerId = incomingCall.callerId;
    setIncomingCall(null);

    const rejectPayload = { rejecterId: currentUserIdRef.current, conversationId: convId };

    // Send call-rejected on conversation channel
    const convCh = supabase.channel(`call_${convId}`, {
      config: { broadcast: { self: false } },
    });
    convCh.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        convCh.send({
          type: 'broadcast',
          event: 'call-rejected',
          payload: rejectPayload,
        });
        setTimeout(() => { try { supabase.removeChannel(convCh); } catch {} }, 1500);
      }
    });

    // Send call-rejected on caller's personal channel
    if (callerId) {
      const callerCh = supabase.channel(`user_call_${callerId}`, {
        config: { broadcast: { self: false } },
      });
      callerCh.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          callerCh.send({
            type: 'broadcast',
            event: 'call-rejected',
            payload: rejectPayload,
          });
          setTimeout(() => { try { supabase.removeChannel(callerCh); } catch {} }, 1500);
        }
      });
    }
  }, [incomingCall]);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setMessageBanner(null);
  }, []);

  return (
    <GlobalNotificationContext.Provider
      value={{
        incomingCall,
        dismissCall,
        acceptCallAndNavigate,
        rejectCall,
        messageBanner,
        dismissBanner,
        activeConversationId,
        setActiveConversationId,
      }}
    >
      {children}
    </GlobalNotificationContext.Provider>
  );
}
