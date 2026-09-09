import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Helper to calculate distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Fetch local events within a radius
export function useLocalEvents(latitude: number | null, longitude: number | null, radiusKm: number = 50) {
  return useQuery({
    queryKey: ['localEvents', latitude, longitude, radiusKm],
    queryFn: async () => {
      if (!latitude || !longitude) return [];
      
      const { data, error } = await supabase
        .from('local_events')
        .select(`
          *,
          users (
            name,
            photos,
            bio
          )
        `)
        .eq('is_public', true)
        // Ensure the event hasn't already finished (or give a buffer)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Filter by distance in JS since we don't have PostGIS enabled by default in standard setup
      if (data) {
        return data.filter(event => {
          const dist = getDistance(latitude, longitude, event.latitude, event.longitude);
          return dist <= radiusKm;
        });
      }
      return [];
    },
    enabled: !!latitude && !!longitude,
  });
}

// Create a new event
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      title, description, latitude, longitude, location_name, start_time, end_time, icon, is_public 
    }: {
      title: string;
      description: string;
      latitude: number;
      longitude: number;
      location_name: string;
      start_time: string;
      end_time: string;
      icon: string;
      is_public: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('local_events')
        .insert({
          user_id: user.id,
          title,
          description,
          latitude,
          longitude,
          location_name,
          start_time,
          end_time,
          icon,
          is_public
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localEvents'] });
    },
  });
}

// Request to join an event
export function useRequestJoinEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('event_requests')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'pending'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventRequests', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['userEventRequests'] });
    },
  });
}

// Fetch requests for a specific event (only creator can see this due to RLS)
export function useEventRequests(eventId: string | null) {
  return useQuery({
    queryKey: ['eventRequests', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('event_requests')
        .select(`
          *,
          users (
            name,
            photos,
            city
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

// Check if current user has already requested to join
export function useUserEventRequestStatus(eventId: string | null) {
  return useQuery({
    queryKey: ['userEventRequestStatus', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('event_requests')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? data.status : null;
    },
    enabled: !!eventId,
  });
}

// Accept or reject a request
export function useUpdateEventRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string, status: 'accepted' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('event_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventRequests'] });
    },
  });
}

// Fetch events created by the current user
export function useMyEvents() {
  return useQuery({
    queryKey: ['myEvents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('local_events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

// Update an event
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string, updates: any }) => {
      const { data, error } = await supabase
        .from('local_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEvents'] });
      queryClient.invalidateQueries({ queryKey: ['localEvents'] });
    },
  });
}

// Delete an event
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const { data, error } = await supabase
        .from('local_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEvents'] });
      queryClient.invalidateQueries({ queryKey: ['localEvents'] });
    },
  });
}
