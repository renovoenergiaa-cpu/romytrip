import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { sendPushNotification } from '../services/notifications';
import { CACHE_FOREVER, shrinkImage } from '../lib/media';
export interface ConversationLastMessage {
  text: string;
  created_at: string;
  sender_id: string;
  audio_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  sender?: { name?: string | null } | null;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  other_participant?: { id: string; name: string | null; photos: string[] | null } | null;
  /** Quantas pessoas há na conversa, você incluído (útil em grupos). */
  member_count: number;
  last_message?: ConversationLastMessage | null;
  unread_count?: number;
  is_archived?: boolean;
  is_muted?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  audio_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  read_at: string | null;
  sender?: any;
}

// A sessão já vem do AuthContext: sem consulta extra ao servidor a cada tela.
export const useCurrentUserId = () => useAuth().session?.user?.id ?? null;

export const useConversations = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: async (): Promise<Conversation[]> => {
      if (!userId) return [];

      const { data: myParticipants, error: partErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id, is_archived, is_muted')
        .eq('user_id', userId);
      if (partErr) throw partErr;
      if (!myParticipants || myParticipants.length === 0) return [];

      const convIds = myParticipants.map((p) => p.conversation_id);

      const [convRes, partsRes, unreadRes, lastRes] = await Promise.all([
        supabase.from('conversations').select('*').in('id', convIds),
        // Os outros participantes (nome e foto aparecem na lista)
        supabase
          .from('conversation_participants')
          .select('conversation_id, users(id, name, photos)')
          .in('conversation_id', convIds)
          .neq('user_id', userId),
        // Só as não lidas, sem as mensagens de sistema das chamadas
        supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .is('read_at', null)
          .neq('sender_id', userId)
          .not('text', 'like', '[SYS:%'),
        // Última mensagem de cada conversa: uma busca de 1 linha cada, em vez de baixar todo o histórico
        Promise.all(
          convIds.map((id) =>
            supabase
              .from('messages')
              .select('conversation_id, text, created_at, sender_id, audio_url, image_url, video_url, sender:users(name)')
              .eq('conversation_id', id)
              .order('created_at', { ascending: false })
              .limit(1),
          ),
        ),
      ]);

      // Erro aqui não pode virar "nenhuma conversa": a tela mostra o erro e deixa tentar de novo
      if (convRes.error) throw convRes.error;
      if (partsRes.error) throw partsRes.error;
      if (unreadRes.error) throw unreadRes.error;

      const unreadByConv = new Map<string, number>();
      (unreadRes.data ?? []).forEach((m: any) => {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      });

      const lastByConv = new Map<string, ConversationLastMessage>();
      lastRes.forEach((res) => {
        if (res.error) console.warn('Erro ao buscar a última mensagem:', res.error);
        const row: any = res.data?.[0];
        if (row) lastByConv.set(row.conversation_id, row);
      });

      return (convRes.data ?? [])
        .map((conv: any): Conversation => {
          const others = (partsRes.data ?? []).filter((p: any) => p.conversation_id === conv.id);
          const myPart = myParticipants.find((p) => p.conversation_id === conv.id);
          return {
            ...conv,
            other_participant: (others[0] as any)?.users ?? null,
            member_count: others.length + 1,
            last_message: lastByConv.get(conv.id) ?? null,
            unread_count: unreadByConv.get(conv.id) ?? 0,
            is_archived: myPart?.is_archived || false,
            is_muted: myPart?.is_muted || false,
          };
        })
        .sort((a, b) => {
          const timeA = new Date(a.last_message?.created_at ?? a.created_at).getTime();
          const timeB = new Date(b.last_message?.created_at ?? b.created_at).getTime();
          return timeB - timeA;
        });
    },
    enabled: !!userId,
  });
};

export const useMessages = (conversationId: string) => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  // Fetch initial messages
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users(id, name, photos)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `public:messages:${conversationId}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          if (newMsg.sender_id !== userId) {
            const { data: senderData } = await supabase.from('users').select('id, name, photos').eq('id', newMsg.sender_id).single();
            newMsg.sender = senderData;
          }
          
          queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
            if (!oldData) return [newMsg];
            if (oldData.some((m: any) => m.id === newMsg.id)) return oldData;
            return [...oldData, newMsg];
          });
          
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, userId]);

  return query;
};

// Lê a mídia escolhida. No web o seletor devolve um blob: URL (sem extensão) e o expo-file-system não existe lá.
async function readPickedMedia(picked: string, kind: 'image' | 'video') {
  // Foto vai reduzida: cada vez que a conversa abre, ela é baixada (e conta no limite de tráfego)
  const uri = kind === 'image' ? (await shrinkImage(picked)).uri : picked;
  const fallbackExt = kind === 'image' ? 'jpg' : 'mp4';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const contentType = blob.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
    const fileExt =
      (contentType.split('/')[1] ?? '').replace('jpeg', 'jpg').replace('quicktime', 'mov').replace(/[^a-z0-9]/g, '') || fallbackExt;
    return { body: await blob.arrayBuffer(), fileExt, contentType };
  }
  // Remove ?query do URI antes de pegar a extensão (no iOS vem com ?token=...)
  const rawExt = uri.split('?')[0].split('.').pop() || fallbackExt;
  const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || fallbackExt;
  const body = decode(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }));
  const contentType = kind === 'image' ? (fileExt === 'png' ? 'image/png' : 'image/jpeg') : 'video/mp4';
  return { body, fileExt, contentType };
}

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      text, 
      audioUri, 
      imageUri, 
      videoUri 
    }: { 
      conversationId: string; 
      text: string; 
      audioUri?: string; 
      imageUri?: string; 
      videoUri?: string; 
    }) => {
      // Fetch session directly to avoid race condition with useCurrentUserId state
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      let finalAudioUrl = null;
      let finalImageUrl = null;
      let finalVideoUrl = null;

      if (audioUri) {
        let fileBody: ArrayBuffer;
        let fileExt: string;
        let contentType: string;

        if (Platform.OS === 'web') {
          // No web o gravador devolve um blob: URL (webm no Chrome, mp4 no Safari); expo-file-system não existe lá
          const blob = await (await fetch(audioUri)).blob();
          contentType = (blob.type || 'audio/webm').split(';')[0];
          fileExt = contentType.includes('mp4') ? 'm4a' : 'webm';
          fileBody = await blob.arrayBuffer();
        } else {
          fileExt = audioUri.split('.').pop() || 'm4a';
          // .m4a é AAC em MP4: o MIME padrão é audio/mp4 (audio/m4a não é reconhecido pelos navegadores)
          contentType = fileExt === 'm4a' ? 'audio/mp4' : `audio/${fileExt}`;
          fileBody = decode(await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' }));
        }

        const fileName = `${userId}/audio_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('chat_audio')
          .upload(fileName, fileBody, { contentType, upsert: true, cacheControl: CACHE_FOREVER });

        // 🔒 Bucket privado: guarda só a referência; o link assinado é gerado ao exibir (useChatMedia)
        if (!uploadErr && uploadData) finalAudioUrl = `chat_audio/${uploadData.path}`;
        if (!finalAudioUrl) throw new Error('Não foi possível enviar o áudio. Tente novamente.');
      }

      if (imageUri) {
        const { body, fileExt, contentType } = await readPickedMedia(imageUri, 'image');
        const fileName = `${userId}/img_${Date.now()}.${fileExt}`;

        // 🔒 N-05 Fix: images go to 'chat_images' bucket, not 'chat_audio'
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('chat_images')
          .upload(fileName, body, { contentType, upsert: true, cacheControl: CACHE_FOREVER });

        if (!uploadErr && uploadData) finalImageUrl = `chat_images/${uploadData.path}`;
        // Sem fallback para o URI local: ele só existe no aparelho de quem enviou
        if (!finalImageUrl) throw new Error('Não foi possível enviar a foto. Tente novamente.');
      }

      if (videoUri) {
        const { body, fileExt, contentType } = await readPickedMedia(videoUri, 'video');
        const fileName = `${userId}/vid_${Date.now()}.${fileExt}`;

        // 🔒 N-05 Fix: videos go to 'chat_videos' bucket, not 'chat_audio'
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('chat_videos')
          .upload(fileName, body, { contentType, upsert: true, cacheControl: CACHE_FOREVER });

        if (!uploadErr && uploadData) finalVideoUrl = `chat_videos/${uploadData.path}`;
        // Falha típica: vídeo acima do limite de 50 MB do bucket
        if (!finalVideoUrl) throw new Error('Não foi possível enviar o vídeo (limite: 60 s / 50 MB). Tente novamente.');
      }

      let defaultText = text;
      if (!defaultText) {
        if (finalAudioUrl) defaultText = '[Mensagem de Voz]';
        else if (finalImageUrl) defaultText = '[Foto]';
        else if (finalVideoUrl) defaultText = '[Vídeo]';
      }

      const newMessage: any = {
        conversation_id: conversationId,
        sender_id: userId,
        text: defaultText,
      };

      if (finalAudioUrl) newMessage.audio_url = finalAudioUrl;
      if (finalImageUrl) newMessage.image_url = finalImageUrl;
      if (finalVideoUrl) newMessage.video_url = finalVideoUrl;

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select('*, sender:users(id, name, photos)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(['messages', variables.conversationId], (oldData: any) => {
        if (!oldData) return [data];
        if (oldData.some((m: any) => m.id === data.id)) return oldData;
        return [...oldData, data];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Send push notification to the other participant
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find the other participant in this conversation
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', variables.conversationId)
          .neq('user_id', user.id);

        if (participants && participants.length > 0) {
          const recipientId = participants[0].user_id;
          // Get sender name
          const { data: senderData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();
          const senderName = senderData?.name || 'Alguém';
          const msgPreview = variables.text || (variables.imageUri ? '📷 Foto' : variables.audioUri ? '🎵 Áudio' : variables.videoUri ? '🎬 Vídeo' : 'Nova mensagem');

          await sendPushNotification(
            recipientId,
            senderName,
            msgPreview,
            { type: 'message', conversationId: variables.conversationId }
          );
        }
      } catch (e) {
        console.log('[NOTIF] Error sending message notification:', e);
      }
    },
  });
};

export const useStartConversation = () => {
  return useMutation({
    mutationFn: async (targetUserId: string): Promise<string> => {
      // Função no banco (SECURITY DEFINER): reaproveita a conversa 1-a-1 existente ou
      // cria conversa + participantes de forma atômica, respeitando allowDirectMessages.
      const { data, error } = await supabase.rpc('start_direct_conversation', {
        target_user_id: targetUserId,
      });
      if (error) throw error;
      return data as string;
    }
  });
};

export const useArchiveConversation = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: async ({ conversationId, isArchived }: { conversationId: string, isArchived: boolean }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_archived: isArchived })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useMuteConversation = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: async ({ conversationId, isMuted }: { conversationId: string, isMuted: boolean }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_muted: isMuted })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useLeaveConversation = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: async ({ conversationId, communityId }: { conversationId: string, communityId?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
        
      if (error) throw error;

      if (communityId) {
        await supabase
          .from('community_members')
          .delete()
          .eq('community_id', communityId)
          .eq('user_id', userId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (variables.communityId) {
        queryClient.invalidateQueries({ queryKey: ['communities'] });
        queryClient.invalidateQueries({ queryKey: ['my_communities'] });
        queryClient.invalidateQueries({ queryKey: ['community_members', variables.communityId] });
      }
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      if (!userId) throw new Error('Not authenticated');
      // For 1-on-1, deleting is essentially leaving the conversation for the current user.
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const translateText = async (text: string, targetLanguage: string = 'PT-BR') => {
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: { text, targetLang: targetLanguage }
    });

    if (error) throw error;
    
    return data.translatedText;
  } catch (err) {
    console.error('Erro ao traduzir:', err);
    return null; // Return null on error so caller knows it failed
  }
};
