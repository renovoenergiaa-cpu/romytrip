import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { AVATAR_MAX_SIDE, CACHE_FOREVER, PHOTO_MAX_SIDE, shrinkImage } from '../lib/media';

const IMAGE_EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_MB = 15;

// Lê a foto escolhida, já reduzida (cada download conta no limite de tráfego do Supabase).
// No web o seletor devolve um blob: URL (sem extensão) e o expo-file-system não existe lá.
async function readImage(picked: string, maxSide = PHOTO_MAX_SIDE) {
  const uri = (await shrinkImage(picked, maxSide)).uri;
  const tooBig = () => new Error(`A imagem é muito grande (máximo ${MAX_IMAGE_MB} MB).`);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    if (blob.size > MAX_IMAGE_MB * 1024 * 1024) throw tooBig();
    const ext = IMAGE_EXT_BY_MIME[blob.type] ?? 'jpg';
    return { body: blob, ext, contentType: IMAGE_EXT_BY_MIME[blob.type] ? blob.type : 'image/jpeg' };
  }
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists && info.size && info.size > MAX_IMAGE_MB * 1024 * 1024) throw tooBig();
  const raw = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
  const ext = raw === 'png' || raw === 'webp' ? raw : 'jpg';
  const body = decode(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }));
  return { body, ext, contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` };
}

// Capa e ícone da comunidade (a policy do bucket aceita nomes "community_…")
async function uploadCommunityImage(communityId: string, uri: string, kind: 'icon' | 'cover') {
  if (/^https?:\/\//.test(uri)) return uri;
  const { body, ext, contentType } = await readImage(uri, kind === 'icon' ? AVATAR_MAX_SIDE : PHOTO_MAX_SIDE);
  const fileName = `community_${communityId}_${kind}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(fileName, body, { contentType, cacheControl: CACHE_FOREVER });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
}

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
        .maybeSingle(); // sem linha = não existe mais ou é privada (null, não erro)

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
        .eq('community_id', id)
        .order('joined_at', { ascending: true });

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
      // Função no banco: cria comunidade, chat do grupo e o criador como admin de forma atômica
      const { data, error } = await supabase.rpc('create_community', { p: community });
      if (error) throw error;
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
    mutationFn: async ({ communityId }: { communityId: string }) => {
      // Função no banco: entra como membro e no chat do grupo (recusa comunidade Privada)
      const { error } = await supabase.rpc('join_community', { p_community_id: communityId });
      if (error) throw error;
      return { communityId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community_members', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, groupChatId }: { communityId: string; groupChatId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .select('user_id');
      if (error) throw error;
      if (!data?.length) throw new Error('Não foi possível sair da comunidade.');

      // Sai também do chat do grupo
      if (groupChatId) {
        const { error: chatError } = await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', groupChatId)
          .eq('user_id', user.id);
        if (chatError) throw chatError;
      }
      return { communityId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community_members', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
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
        const { body, ext, contentType } = await readImage(mediaUri);
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, body, { contentType, cacheControl: CACHE_FOREVER });
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from('posts').getPublicUrl(fileName).data.publicUrl;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: content.trim(),
          media_url: publicUrl,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community_posts', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] }); // update post count
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId }: { communityId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // A RLS só deixa o criador apagar; sem linha apagada, não deu certo
      const { data, error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId)
        .select('id');

      if (error) throw error;
      if (!data?.length) throw new Error('Só quem criou a comunidade pode excluí-la.');
      return { communityId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Troca a capa ou o ícone (só o criador, pela RLS)
export function useUpdateCommunityImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, mediaUri, kind }: { communityId: string; mediaUri: string; kind: 'icon' | 'cover' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const publicUrl = await uploadCommunityImage(communityId, mediaUri, kind);
      const column = kind === 'icon' ? 'icon_url' : 'cover_url';
      const { data, error } = await supabase
        .from('communities')
        .update({ [column]: publicUrl })
        .eq('id', communityId)
        .select('id');

      if (error) throw error;
      if (!data?.length) throw new Error('Só quem criou a comunidade pode mudar a foto.');
      return { column, publicUrl };
    },
    onSuccess: ({ column, publicUrl }, variables) => {
      queryClient.setQueryData(['community', variables.communityId], (old: any) => (old ? { ...old, [column]: publicUrl } : old));
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

      const { data, error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .select('id');

      if (error) throw error;
      if (!data?.length) throw new Error('Você não pode excluir esta publicação.');
      return { postId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      queryClient.invalidateQueries({ queryKey: ['my_communities'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}
