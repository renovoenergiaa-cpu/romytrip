import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useCurrentUserId } from './useMessenger';

// Fetch posts for the Feed
export function useFeed(destination?: string) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['feed', destination],
    enabled: !!userId,
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          users (
            name,
            photos,
            city,
            bio,
            travel_styles
          ),
          post_likes(count),
          comments(count)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      // Optionally filter by destination if provided
      if (destination) {
        query = query.ilike('destination', `%${destination}%`);
      }

      // Erro precisa chegar na tela: antes virava lista vazia e parecia "ninguém postou"
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).filter((post: any) =>
        post.users &&
        post.users.name !== 'Conta Excluída' &&
        post.users.name !== 'Usuário Romy'
      );
    },
  });
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
const VIDEO_EXTS = ['mp4', 'mov', 'webm'];
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

// No web o seletor devolve um blob: URL sem extensão; aí o tipo vem do próprio arquivo.
function describeMedia(uri: string, mime?: string) {
  const clean = uri.split('?')[0];
  const rawExt = clean.includes('.') ? clean.substring(clean.lastIndexOf('.') + 1).toLowerCase() : '';
  const ext = (mime && EXT_BY_MIME[mime]) || ([...IMAGE_EXTS, ...VIDEO_EXTS].includes(rawExt) ? rawExt : 'jpg');
  const isVideo = VIDEO_EXTS.includes(ext);
  const contentType = isVideo ? `video/${ext === 'mov' ? 'quicktime' : ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return { ext, isVideo, contentType, maxMb: isVideo ? 50 : 15 };
}

// Create a new post
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaUri, destination, description, audio_title, audio_url }: { mediaUri: string, destination: string, description: string, audio_title?: string, audio_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let fileName: string;

      if (Platform.OS === 'web') {
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const media = describeMedia(mediaUri, blob.type);
        if (blob.size > media.maxMb * 1024 * 1024) {
          throw new Error(`O arquivo é muito grande (máximo ${media.maxMb} MB).`);
        }
        fileName = `${user.id}/${Date.now()}.${media.ext}`;
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, blob, { contentType: media.contentType });
        if (uploadError) throw uploadError;
      } else {
        const media = describeMedia(mediaUri);
        const fileInfo = await FileSystem.getInfoAsync(mediaUri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > media.maxMb * 1024 * 1024) {
          throw new Error(`O arquivo é muito grande (máximo ${media.maxMb} MB).`);
        }
        fileName = `${user.id}/${Date.now()}.${media.ext}`;
        const base64 = await FileSystem.readAsStringAsync(mediaUri, { encoding: 'base64' });
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, decode(base64), { contentType: media.contentType, upsert: true });
        if (uploadError) throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          destination: destination,
          description: description,
          audio_title: audio_title || null,
          audio_url: audio_url || null,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    },
  });
}

// Fetch likes given by the current user to posts
export function usePostLikes() {
  return useQuery({
    queryKey: ['postLikes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const likesMap: Record<string, boolean> = {};
      data?.forEach((like) => {
        likesMap[like.post_id] = true;
      });
      
      return likesMap;
    },
  });
}

// Mutation to toggle a like on a post
export function useTogglePostLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string, isLiked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: postId, user_id: user.id });
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        if (error && error.code !== '23505') throw error;
      }
      return { postId, isLiked: !isLiked };
    },
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['postLikes'] });
      const previousLikes = queryClient.getQueryData(['postLikes']);

      queryClient.setQueryData(['postLikes'], (old: any) => {
        const newMap = { ...old };
        if (isLiked) {
          delete newMap[postId];
        } else {
          newMap[postId] = true;
        }
        return newMap;
      });

      return { previousLikes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['postLikes'], context?.previousLikes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['postLikes'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// Fetch comments for a specific post
export function useComments(postId: string | null) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!postId) return [];
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users (
            name,
            photos
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!postId, // Only run if we have a postId
  });
}

// Create a new comment
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string, content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] }); // To update comments count
    },
  });
}

// Delete a feed post
export function useDeleteFeedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // 🔒 VULN-07 Fix: client-side author validation

      if (error) throw error;
      return { postId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    },
  });
}

// Update a feed post caption
export function useUpdatePostCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, description }: { postId: string, description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .update({ description })
        .eq('id', postId)
        .eq('user_id', user.id) // 🔒 N-01 Fix: only allow editing own posts
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    },
  });
}
