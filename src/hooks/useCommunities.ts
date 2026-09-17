import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          community_members(count),
          community_posts(count)
        `)
        .in('type', ['Pública', 'Internacional', 'Temporária'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      return data.filter(c => !c.end_date || new Date(c.end_date) >= now);
    },
  });
}

export function useMyCommunities() {
  return useQuery({
    queryKey: ['my_communities'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: memberData, error: memberErr } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;
      if (!memberData || memberData.length === 0) return [];

      const communityIds = memberData.map(m => m.community_id);

      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          community_members(count),
          community_posts(count)
        `)
        .in('id', communityIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      return data.filter(c => !c.end_date || new Date(c.end_date) >= now);
    },
  });
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: ['community', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          community_members(count)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCommunityMembers(id: string) {
  return useQuery({
    queryKey: ['community_members', id],
    queryFn: async () => {
      if (!id) return [];
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          users(name, photos)
        `)
        .eq('community_id', id);

      if (error) throw error;
      
      return {
        members: data,
        isMember: data.some(m => m.user_id === user?.id)
      };
    },
    enabled: !!id,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (community: {
      title: string;
      type: string;
      description?: string;
      location?: string;
      start_date?: string;
      end_date?: string;
      color?: string;
      bg_color?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🔒 VULN-11 Fix: Cryptographically secure UUID instead of Math.random()
      const generateSecureUUID = (): string => {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      };
      const convId = generateSecureUUID();

      // 2. Create the group conversation
      const { error: convErr } = await supabase
        .from('conversations')
        .insert({ id: convId, is_group: true, name: community.title });
        
      if (convErr) throw convErr;

      // 3. Add creator to conversation
      const { error: partErr } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: convId, user_id: user.id });
        
      if (partErr) throw partErr;

      // 4. Create Community
      const { data, error } = await supabase
        .from('communities')
        .insert({
          ...community,
          created_by: user.id,
          group_chat_id: convId,
        })
        .select()
        .single();

      if (error) throw error;

      // 5. Add creator as admin member of community
      const { error: memberErr } = await supabase
        .from('community_members')
        .insert({
          community_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberErr) throw memberErr;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, groupChatId }: { communityId: string, groupChatId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Join Community
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      // 2. Join Conversation (if exists)
      if (groupChatId) {
        // Ignore duplicate key errors if already in conversation
        await supabase
          .from('conversation_participants')
          .insert({ conversation_id: groupChatId, user_id: user.id });
      }

      return { communityId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community_members', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Feed for specific community
export function useCommunityPosts(communityId: string) {
  return useQuery({
    queryKey: ['community_posts', communityId],
    queryFn: async () => {
      if (!communityId) return [];

      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          users (
            name,
            photos,
            city,
            bio
          )
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!communityId,
  });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, mediaUri, content }: { communityId: string, mediaUri?: string, content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let publicUrl = null;

      if (mediaUri) {
        const rawExt = mediaUri.substring(mediaUri.lastIndexOf('.') + 1).toLowerCase() || 'jpg';
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
        const ext = allowedExts.includes(rawExt) ? rawExt : 'jpg';
        const fileName = `${user.id}/${Date.now()}.${ext}`;

        if (Platform.OS === 'web') {
          const response = await fetch(mediaUri);
          const blob = await response.blob();
          if (blob.size > 15 * 1024 * 1024) {
            throw new Error('A imagem selecionada é muito grande (máximo 15MB).');
          }
          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
          if (uploadError) throw uploadError;
        } else {
          const fileInfo = await FileSystem.getInfoAsync(mediaUri);
          if (fileInfo.exists && fileInfo.size && fileInfo.size > 15 * 1024 * 1024) {
            throw new Error('A imagem selecionada é muito grande (máximo 15MB).');
          }
          const base64 = await FileSystem.readAsStringAsync(mediaUri, { encoding: 'base64' });
          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, decode(base64), { 
              contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
              upsert: true 
            });
          if (uploadError) throw uploadError;
        }

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: content,
          media_url: publicUrl,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community_posts', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] }); // update post count
    },
  });
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId }: { communityId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // The backend RLS should only allow the creator to delete.
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId);

      if (error) throw error;
      return { communityId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
    },
  });
}

// Update Community Icon
export function useUpdateCommunityIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, mediaUri }: { communityId: string, mediaUri: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let publicUrl = mediaUri;

      if (mediaUri.startsWith('file://')) {
        const ext = mediaUri.substring(mediaUri.lastIndexOf('.') + 1) || 'jpg';
        const fileName = `community_${communityId}_icon_${Date.now()}.${ext}`;
        
        const base64 = await FileSystem.readAsStringAsync(mediaUri, { encoding: 'base64' });

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, decode(base64), { 
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        publicUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('communities')
        .update({ icon_url: publicUrl })
        .eq('id', communityId);

      if (error) throw error;
      return publicUrl;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['community', variables.communityId], (old: any) => ({
        ...old,
        icon_url: data
      }));
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
    },
  });
}

// Update Community Cover
export function useUpdateCommunityCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, mediaUri }: { communityId: string, mediaUri: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let publicUrl = mediaUri;

      if (mediaUri.startsWith('file://')) {
        const ext = mediaUri.substring(mediaUri.lastIndexOf('.') + 1) || 'jpg';
        const fileName = `community_${communityId}_cover_${Date.now()}.${ext}`;
        
        const base64 = await FileSystem.readAsStringAsync(mediaUri, { encoding: 'base64' });

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, decode(base64), { 
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        publicUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('communities')
        .update({ cover_url: publicUrl })
        .eq('id', communityId);

      if (error) throw error;
      return publicUrl;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['community', variables.communityId], (old: any) => ({
        ...old,
        cover_url: data
      }));
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
    },
  });
}

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return { postId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
    },
  });
}
