import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { sendPushNotification } from '../services/notifications';
export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  other_participant?: any;
  last_message?: any;
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

export const useCurrentUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  return userId;
};

export const useConversations = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Fetch participants where the user is present
      const { data: myParticipants, error: partErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id, is_archived, is_muted')
        .eq('user_id', userId);
        
      if (partErr) throw partErr;
      if (!myParticipants || myParticipants.length === 0) return [];
      
      const convIds = myParticipants.map(p => p.conversation_id);

      // 2. Fetch the conversations
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('created_at', { ascending: false });

      if (convErr) throw convErr;

      // 3. Fetch other participants info (for 1-on-1 chats)
      const { data: allParticipants, error: allPartErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id, users(id, name, photos)')
        .in('conversation_id', convIds)
        .neq('user_id', userId);
        
      // 4. Fetch latest message for each conversation
      const { data: messages, error: msgErr } = await supabase
        .from('messages')
        .select('conversation_id, text, created_at, read_at, sender_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });
        
      // 5. Map everything
      return convData.map(conv => {
        const otherParticipant = allParticipants?.find(p => p.conversation_id === conv.id)?.users;
        const convMessages = messages?.filter(m => m.conversation_id === conv.id) || [];
        const lastMessage = convMessages.length > 0 ? convMessages[0] : null;
        const unreadCount = convMessages.filter(m => m.read_at === null && m.sender_id !== userId).length;
        const myPart = myParticipants?.find(p => p.conversation_id === conv.id);
        
        return {
          ...conv,
          other_participant: otherParticipant,
          last_message: lastMessage,
          unread_count: unreadCount,
          is_archived: myPart?.is_archived || false,
          is_muted: myPart?.is_muted || false,
        };
      }).sort((a, b) => {
        const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
        const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
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
        const fileExt = audioUri.split('.').pop() || 'm4a';
        const fileName = `${userId}/audio_${Date.now()}.${fileExt}`;
        const base64File = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('chat_audio')
          .upload(fileName, decode(base64File), { contentType: `audio/${fileExt}`, upsert: true });

        if (!uploadErr && uploadData) {
          // 🔒 N-06 Fix: chat_audio is a private bucket — use signed URL, not public URL
          const { data: signedData } = await supabase.storage
            .from('chat_audio')
            .createSignedUrl(uploadData.path, 3600); // 1 hour expiry
          finalAudioUrl = signedData?.signedUrl || audioUri;
        } else {
          finalAudioUrl = audioUri;
        }
      }

      if (imageUri) {
        try {
          // Strip query params from URI before extracting extension (iOS URIs can have ?token=...)
          const cleanImageUri = imageUri.split('?')[0];
          const rawExt = cleanImageUri.split('.').pop() || 'jpg';
          const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          const fileName = `${userId}/img_${Date.now()}.${fileExt}`;
          const base64File = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
          const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

          // 🔒 N-05 Fix: images go to 'chat_images' bucket, not 'chat_audio'
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('chat_images')
            .upload(fileName, decode(base64File), { contentType, upsert: true });

          if (!uploadErr && uploadData) {
            // 🔒 N-06 Fix: use signed URL for private bucket
            const { data: signedData } = await supabase.storage
              .from('chat_images')
              .createSignedUrl(uploadData.path, 3600);
            finalImageUrl = signedData?.signedUrl || imageUri;
          } else {
            console.log('[IMAGE UPLOAD] Failed:', uploadErr?.message);
            finalImageUrl = imageUri;
          }
        } catch (err) {
          console.log('[IMAGE UPLOAD] Exception:', err);
          finalImageUrl = imageUri;
        }
      }

      if (videoUri) {
        try {
          const cleanVideoUri = videoUri.split('?')[0];
          const rawExt = cleanVideoUri.split('.').pop() || 'mp4';
          const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
          const fileName = `${userId}/vid_${Date.now()}.${fileExt}`;
          const base64File = await FileSystem.readAsStringAsync(videoUri, { encoding: 'base64' });

          // 🔒 N-05 Fix: videos go to 'chat_videos' bucket, not 'chat_audio'
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('chat_videos')
            .upload(fileName, decode(base64File), { contentType: 'video/mp4', upsert: true });

          if (!uploadErr && uploadData) {
            // 🔒 N-06 Fix: use signed URL for private bucket
            const { data: signedData } = await supabase.storage
              .from('chat_videos')
              .createSignedUrl(uploadData.path, 3600);
            finalVideoUrl = signedData?.signedUrl || videoUri;
          } else {
            console.log('[VIDEO UPLOAD] Failed:', uploadErr?.message);
            finalVideoUrl = videoUri;
          }
        } catch (err) {
          console.log('[VIDEO UPLOAD] Exception:', err);
          finalVideoUrl = videoUri;
        }
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
    mutationFn: async (targetUserId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const userId = user.id;

        // 1. Check existing shared conversations
        const { data: existingConvs, error: checkErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);
          
        if (checkErr) throw checkErr;
        
        if (existingConvs && existingConvs.length > 0) {
          const convIds = existingConvs.map(c => c.conversation_id);
          
          const { data: targetConvs, error: targetCheckErr } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', targetUserId)
            .in('conversation_id', convIds);
            
          if (targetCheckErr) throw targetCheckErr;
          
          if (targetConvs && targetConvs.length > 0) {
            const sharedConvIds = targetConvs.map(c => c.conversation_id);
            
            // Check if any of these shared conversations is a 1-on-1 (is_group = false)
            const { data: sharedConvsDetails, error: sharedConvsErr } = await supabase
              .from('conversations')
              .select('id')
              .in('id', sharedConvIds)
              .eq('is_group', false);
              
            if (sharedConvsErr) throw sharedConvsErr;
            
            if (sharedConvsDetails && sharedConvsDetails.length > 0) {
              return sharedConvsDetails[0].id;
            }
          }
        }

        // 🔒 N-07 Fix: Use crypto-secure UUID instead of Math.random()-based generator
        // Math.random() is NOT cryptographically secure and can be predictable.
        const generateSecureUUID = (): string => {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
          bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
          const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        };
        const convId = generateSecureUUID();

        // 3. Create the conversation
        const { error: createErr } = await supabase
          .from('conversations')
          .insert({ id: convId, is_group: false });
          
        if (createErr) throw createErr;
        
        // 4. Add participants
        const { error: partErr } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: convId, user_id: userId },
            { conversation_id: convId, user_id: targetUserId }
          ]);
          
        if (partErr) throw partErr;
        
        return convId;
      } catch (err) {
        console.error("Error in useStartConversation:", err);
        throw err;
      }
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
