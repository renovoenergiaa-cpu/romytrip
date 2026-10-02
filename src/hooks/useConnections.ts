import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../services/notifications';
import { isDeletedName } from '../features/chat/format';

// Fetch a single user profile (for the public profile screen)
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      // 🔒 N-02 Fix: Never use SELECT * on users table — it bypasses column-level security
      // and can expose email, push_token, and GPS coordinates.
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, city, sex, photos, bio, destination,
          check_in, check_out, is_flexible, companions,
          travel_styles, interests, budget, cost_split,
          group_travel, one_person, invitations, is_free,
          created_at, updated_at, connection_intentions,
          gender_preference, privacy_settings
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Fetch pending connection requests received by the current user
export function usePendingRequests() {
  return useQuery({
    queryKey: ['pendingRequests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          status,
          created_at,
          sender_id,
          users!connections_sender_id_fkey (
            id,
            name,
            photos,
            city,
            bio,
            travel_styles,
            destination
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Check if there is already a connection between current user and target user
export function useConnectionStatus(targetUserId: string) {
  return useQuery({
    queryKey: ['connectionStatus', targetUserId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (user.id === targetUserId) return { status: 'self' };

      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

      if (!data) return { status: 'none' };
      
      return {
        status: data.status, // 'pending', 'accepted', 'rejected'
        isSender: data.sender_id === user.id,
      };
    },
    enabled: !!targetUserId,
  });
}

// Mutation to request a connection
export function useRequestConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiverId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('connections')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
        });

      if (error) throw error;
      return { data, senderId: user.id };
    },
    onSuccess: async (result, receiverId) => {
      queryClient.invalidateQueries({ queryKey: ['connectionStatus', receiverId] });

      // Notify receiver about the connection request
      try {
        const { data: senderData } = await supabase
          .from('users')
          .select('name')
          .eq('id', result.senderId)
          .single();
        const senderName = senderData?.name || 'Alguém';
        await sendPushNotification(
          receiverId,
          '🤝 Nova solicitação',
          `${senderName} quer se conectar com você!`,
          { type: 'connection' }
        );
      } catch (e) {
        console.log('[NOTIF] Error sending connection request notification:', e);
      }
    },
  });
}

// Mutation to accept or reject a connection
export function useRespondConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string, status: 'accepted' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🔒 N-08 Fix: Verify the current user is actually the receiver before responding.
      // Without this check, the protection relies solely on the RLS policy.
      const { data: connCheck, error: checkErr } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .eq('id', connectionId)
        .single();

      if (checkErr || !connCheck) throw new Error('Conexão não encontrada.');
      if (connCheck.receiver_id !== user.id) {
        throw new Error('Você não tem permissão para responder esta solicitação.');
      }

      // Fetch connection details before updating (to get sender_id)
      const connData = connCheck;

      const { data, error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId)
        .eq('receiver_id', user.id); // 🔒 N-08: Double-lock with DB filter

      if (error) throw error;
      return { data, status, senderId: connData?.sender_id, responderId: user.id };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['connectionStatus'] });
      queryClient.invalidateQueries({ queryKey: ['acceptedConnections'] });

      // Notify the original sender if their request was accepted
      if (result.status === 'accepted' && result.senderId) {
        try {
          const { data: responderData } = await supabase
            .from('users')
            .select('name')
            .eq('id', result.responderId)
            .single();
          const responderName = responderData?.name || 'Alguém';
          await sendPushNotification(
            result.senderId,
            '✅ Conexão aceita!',
            `${responderName} aceitou a sua solicitação de conexão!`,
            { type: 'connection_accepted' }
          );
        } catch (e) {
          console.log('[NOTIF] Error sending connection accepted notification:', e);
        }
      }
    },
  });
}

// Fetch all accepted connections for the current user
export function useAcceptedConnections() {
  return useQuery({
    queryKey: ['acceptedConnections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch connections where status is accepted and user is either sender or receiver
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          sender_id,
          receiver_id,
          sender:users!connections_sender_id_fkey(id, name, photos, city),
          receiver:users!connections_receiver_id_fkey(id, name, photos, city)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) throw error;

      // Map to return an array of the "other" user profiles
      return data.map((conn: any) => {
        const isSender = conn.sender_id === user.id;
        return isSender ? conn.receiver : conn.sender;
      });
    },
  });
}


/* ─── Descobrir ─────────────────────────────────────────────────────────────── */

export type GenderPref = 'all' | 'female' | 'male';

export interface DiscoveryFilters {
  gender: GenderPref;
  minAge: number;
  maxAge: number;
  /** 'all' ou um id de BUDGET_OPTIONS ('$' … '$$$$') */
  budget: string;
}

export type Traveler = {
  id: string;
  name: string;
  age: number;
  city?: string | null;
  sex?: string | null;
  photos?: string[] | null;
  bio?: string | null;
  destination?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  is_flexible?: boolean | null;
  travel_styles?: string[] | null;
  interests?: string[] | null;
  languages?: string[] | null;
  connection_intentions?: string[] | null;
  budget?: string | null;
  /** O que a pessoa tem igual a você (ids gravados no banco) */
  common: { styles: string[]; intentions: string[]; interests: string[]; languages: string[] };
  sameDestination: boolean;
};

const ageOf = (dob?: string | null) => {
  if (!dob) return null;
  const [y, m, d] = String(dob).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
};

// Cadastros antigos gravaram o sexo e o orçamento com outros textos
const isFemale = (sex?: string | null) => { const v = String(sex ?? '').toLowerCase(); return v.startsWith('f') || v === 'mulher'; };
const isMale = (sex?: string | null) => { const v = String(sex ?? '').toLowerCase(); return v.startsWith('masc') || v === 'homem'; };
const LEGACY_BUDGET: Record<string, string> = { 'econômico': '$', economico: '$', moderado: '$$', conforto: '$$$', 'confortável': '$$$', luxo: '$$$$' };
const budgetId = (b?: string | null) => (b ? LEGACY_BUDGET[b.toLowerCase()] ?? b : '');
const BUDGET_STEPS = ['$', '$$', '$$$', '$$$$'];

export function useDiscoveryTravelers(filters: DiscoveryFilters, enabled = true) {
  return useQuery({
    queryKey: ['discoveryTravelers', filters],
    enabled,
    queryFn: async (): Promise<Traveler[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [mine, links] = await Promise.all([
        supabase
          .from('users')
          .select('travel_styles, connection_intentions, interests, languages, destination, budget')
          .eq('id', user.id)
          .maybeSingle(),
        // Quem já tem pedido ou conexão com você (em qualquer status) não aparece de novo
        supabase
          .from('connections')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      ]);
      if (mine.error) throw mine.error;
      if (links.error) throw links.error;

      const excluded = new Set<string>([user.id]);
      (links.data ?? []).forEach((c) => { excluded.add(c.sender_id); excluded.add(c.receiver_id); });

      // 🔒 N-02: lista explícita de colunas (nunca SELECT * em users)
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, city, sex, photos, bio, destination, check_in, check_out, is_flexible,
          travel_styles, interests, languages, budget, connection_intentions, privacy_settings, dob
        `)
        .not('id', 'in', `(${[...excluded].join(',')})`)
        .not('dob', 'is', null) // sem data de nascimento o perfil está incompleto (e a trava de 18+ não se aplica)
        .limit(60);
      if (error) throw error;

      const me = mine.data;
      const my = {
        styles: (me?.travel_styles ?? []) as string[],
        intentions: (me?.connection_intentions ?? []) as string[],
        interests: (me?.interests ?? []) as string[],
        languages: (me?.languages ?? []) as string[],
      };
      const both = (a: string[] | null | undefined, b: string[]) => (a ?? []).filter((x) => b.includes(x));
      const cityOf = (v?: string | null) => (v ?? '').split(',')[0].trim().toLowerCase();
      const myDestination = cityOf(me?.destination);
      const myBudget = budgetId(me?.budget);

      const people: (Traveler & { score: number })[] = [];
      for (const u of (data ?? []) as any[]) {
        const name = String(u.name ?? '').trim();
        if (!name || isDeletedName(name)) continue;
        if (u.privacy_settings?.publicProfile === false) continue; // modo invisível
        const age = ageOf(u.dob);
        if (age == null || age < 18 || age < filters.minAge || age > filters.maxAge) continue;
        if (filters.gender === 'female' && !isFemale(u.sex)) continue;
        if (filters.gender === 'male' && !isMale(u.sex)) continue;
        if (filters.budget !== 'all' && budgetId(u.budget) !== filters.budget) continue;

        const common = {
          styles: both(u.travel_styles, my.styles),
          intentions: both(u.connection_intentions, my.intentions),
          interests: both(u.interests, my.interests),
          languages: both(u.languages, my.languages),
        };
        const sameDestination = !!myDestination && cityOf(u.destination) === myDestination;
        const gap = Math.abs(BUDGET_STEPS.indexOf(budgetId(u.budget)) - BUDGET_STEPS.indexOf(myBudget));
        const budgetBonus = BUDGET_STEPS.includes(budgetId(u.budget)) && BUDGET_STEPS.includes(myBudget) && gap <= 1 ? 2 - gap : 0;
        // Pesos maiores para o que mais pesa numa viagem juntos
        const score =
          common.styles.length * 2 + common.intentions.length * 2 + common.interests.length + common.languages.length +
          (sameDestination ? 4 : 0) + budgetBonus;

        const { privacy_settings: _privacy, dob: _dob, ...rest } = u;
        people.push({ ...rest, name, age, common, sameDestination, score });
      }

      // Mais compatíveis primeiro
      return people.sort((a, b) => b.score - a.score);
    },
  });
}

/** Quem você quer ver e modo invisível (gravados no perfil). */
export function useDiscoveryPrefs() {
  return useQuery({
    queryKey: ['discoveryPrefs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('users')
        .select('gender_preference, privacy_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      const g = data?.gender_preference;
      return {
        gender: (g === 'female' || g === 'male' ? g : 'all') as GenderPref,
        invisible: data?.privacy_settings?.publicProfile === false,
      };
    },
  });
}

export function useSaveDiscoveryPrefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gender, invisible }: { gender: GenderPref; invisible: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Mantém as outras configurações de privacidade
      const { data: row, error: readError } = await supabase
        .from('users')
        .select('privacy_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (readError) throw readError;
      const { error } = await supabase
        .from('users')
        .update({ gender_preference: gender, privacy_settings: { ...(row?.privacy_settings ?? {}), publicProfile: !invisible } })
        .eq('id', user.id);
      if (error) throw error;
      return { gender, invisible };
    },
    onSuccess: (prefs) => {
      queryClient.setQueryData(['discoveryPrefs'], prefs);
    },
  });
}
