import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Fetch Events
export function useLocalEvents() {
  return useQuery({
    queryKey: ['localEvents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_time', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch users who are free
export function useFreeUsers() {
  return useQuery({
    queryKey: ['freeUsers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('users')
        .select('id, name, photos, city, travel_styles, destination')
        .eq('is_free', true)
        .neq('id', user.id); // don't fetch self

      if (error) throw error;
      return data;
    },
  });
}

// Toggle free status for current user
export function useToggleFreeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isFree: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('users')
        .update({ is_free: isFree })
        .eq('id', user.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freeUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

// Fetch help requests
export function useHelpRequests(filter: 'all' | 'active' | 'resolved') {
  return useQuery({
    queryKey: ['helpRequests', filter],
    queryFn: async () => {
      let query = supabase
        .from('help_requests')
        .select(`
          *,
          users (
            name,
            photos
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'resolved') {
        query = query.eq('status', 'resolved');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Create a help request
export function useCreateHelpRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, content, city }: { category: string, content: string, city: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('help_requests')
        .insert({
          user_id: user.id,
          category,
          content,
          city,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpRequests'] });
    },
  });
}

// Update help request status
export function useResolveHelpRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string, status: 'active' | 'resolved' }) => {
      const { data, error } = await supabase
        .from('help_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpRequests'] });
    },
  });
}

// Fetch replies for a help request
export function useHelpReplies(requestId: string) {
  return useQuery({
    queryKey: ['helpReplies', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('help_replies')
        .select(`
          *,
          users (
            name,
            photos
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });
}

// Create a help reply
export function useCreateHelpReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, content }: { requestId: string, content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('help_replies')
        .insert({
          request_id: requestId,
          user_id: user.id,
          content,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['helpReplies', variables.requestId] });
    },
  });
}

// Delete a help request
export function useDeleteHelpRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('help_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpRequests'] });
    },
  });
}

// Update a help request
export function useUpdateHelpRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, content, category }: { requestId: string, content: string, category: string }) => {
      const { data, error } = await supabase
        .from('help_requests')
        .update({ content, category })
        .eq('id', requestId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpRequests'] });
    },
  });
}
