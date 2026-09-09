import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../services/notifications';

// Fetch a single user profile (for the public profile screen)
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
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

      // Fetch connection details before updating (to get sender_id)
      const { data: connData } = await supabase
        .from('connections')
        .select('sender_id')
        .eq('id', connectionId)
        .single();

      const { data, error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId);

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

interface DiscoveryFilters {
  gender: string;
  minAge: number;
  maxAge: number;
  budget: string;
  isTopRatedMode?: boolean;
}

export function useDiscoveryTravelers(filters: DiscoveryFilters = { gender: 'Todos', minAge: 18, maxAge: 100, budget: 'Todos' }) {
  return useQuery({
    queryKey: ['discoveryTravelers', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 0. Fetch current user data to match
      const { data: currentUserData } = await supabase
        .from('users')
        .select('travel_styles, connection_intentions')
        .eq('id', user.id)
        .single();
        
      const myStyles = currentUserData?.travel_styles || [];
      const myIntentions = currentUserData?.connection_intentions || [];

      // 1. Get connections to exclude them from discovery
      const { data: connections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      const excludedIds = new Set<string>();
      excludedIds.add(user.id);
      
      if (connections) {
        connections.forEach(conn => {
          excludedIds.add(conn.sender_id);
          excludedIds.add(conn.receiver_id);
        });
      }

      // 2. Fetch all users not in the excluded list
      const excludedArray = Array.from(excludedIds);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('id', 'in', `(${excludedArray.join(',')})`)
        .limit(30);

      if (error) throw error;
      let users = data || [];

      // ADICIONANDO USUÁRIOS DE EXEMPLO SE A LISTA FOR PEQUENA
      if (users.length < 5) {
        users.unshift({
          id: 'mock-thadeu',
          name: 'Thadeu Zan',
          dob: '1997-04-10', // 29 anos
          sex: 'Masculino',
          budget: 'Conforto',
          city: 'Cabo Frio, RJ',
          photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'],
          bio: 'Gosto de viajar solo e conhecer pessoas para explorar cafés, trilhas e a cidade.',
          connection_objective: 'Conhecer pessoas para viajar e explorar a cidade.',
          destination: 'Em casa',
          work_status: 'Trabalho remoto',
          coffee_preference: 'Gosta de café',
          common_interests: ['Café', 'Trilhas', 'Praia', 'Fotografia', 'Música'],
          languages: ['Português', 'Inglês'],
          availability: 'Fins de semana e noites',
          travel_styles: ['Café', 'Trilhas', 'Praia', 'Fotografia', 'Música'],
          connection_intentions: ['Conhecer pessoas para viajar e explorar a cidade.'],
          rating: 4.9,
          is_online: true,
          is_verified: true,
        });
        users.push(
          {
            id: 'mock-1',
            name: 'Ana Silva',
            dob: '1995-05-15', // ~31 anos
            sex: 'Feminino',
            budget: 'Econômico',
            city: 'São Paulo, Brasil',
            photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800'],
            bio: 'Adoro conhecer novas culturas e provar comidas locais!',
            travel_styles: ['Explorador(a) cultural', 'Mochileiro(a)'],
            connection_intentions: ['Fazer amizades locais', 'Companhia para eventos'],
            rating: 4.8,
            is_online: true
          },
          {
            id: 'mock-2',
            name: 'Carlos Mendes',
            dob: '1992-08-20', // ~34 anos
            sex: 'Masculino',
            budget: 'Conforto',
            city: 'Rio de Janeiro, Brasil',
            photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'],
            bio: 'Fotógrafo amador, sempre em busca da melhor paisagem.',
            travel_styles: ['Roadtrip', 'Amante da natureza'],
            connection_intentions: ['Rachar despesas', 'Troca de dicas'],
            rating: 4.5,
            is_online: true
          },
          {
            id: 'mock-3',
            name: 'Julia Santos',
            dob: '2001-11-10', // ~25 anos
            sex: 'Feminino',
            budget: 'Luxo',
            city: 'Florianópolis, Brasil',
            photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'],
            bio: 'Praia, sol e boas companhias. Explorando o mundo um passo de cada vez.',
            travel_styles: ['Férias relaxantes', 'Aventureiro(a)'],
            connection_intentions: ['Fazer amizades locais', 'Companhia para balada'],
            rating: 5.0,
            is_online: true
          },
          {
            id: 'mock-4',
            name: 'Pedro Alves',
            dob: '1985-02-25', // ~41 anos
            sex: 'Masculino',
            budget: 'Econômico',
            city: 'Belo Horizonte, Brasil',
            photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'],
            bio: 'Sempre com fome, procurando os melhores restaurantes da cidade.',
            travel_styles: ['Turismo gastronômico', 'Viajante de luxo'],
            connection_intentions: ['Fazer amizades locais', 'Explorar a cidade a pé'],
            rating: 4.2,
            is_online: false
          }
        );
      }

      // Remover mock users se já tiverem sido "passados" (estariam em excludedIds)
      users = users.filter(u => !excludedIds.has(u.id));

      // Se for Top Rated Mode, filtrar apenas online (mockado como is_online para alguns ou simulado)
      if (filters.isTopRatedMode) {
        // Simulando que todos retornados do DB teriam rating e online status. Para os mockados, já temos.
        // Para os não-mockados, vamos dar um rating aleatório baseado no nome apenas para testar.
        users = users.map(u => ({
          ...u,
          rating: u.rating || (4.0 + (u.name.length % 10) / 10), // mock rating between 4.0 and 4.9
          is_online: u.is_online !== undefined ? u.is_online : (u.name.length % 2 === 0)
        }));
        // Filtra apenas online
        users = users.filter(u => u.is_online);
      }

      // APLICANDO TODOS OS FILTROS
      const currentYear = new Date().getFullYear();
      users = users.filter(u => {
        // Filtro de Gênero
        if (filters.gender !== 'Todos') {
          const normTarget = filters.gender.toLowerCase();
          const userSex = String(u.sex || '').toLowerCase();
          if (normTarget === 'feminino' || normTarget === 'mulheres') {
            if (!userSex.startsWith('f') && userSex !== 'mulher') return false;
          } else if (normTarget === 'masculino' || normTarget === 'homens') {
            if (!userSex.startsWith('m') && userSex !== 'homem') return false;
          }
        }

        // Filtro de Orçamento
        if (filters.budget !== 'Todos') {
          const b = String(u.budget || '').toLowerCase();
          const target = filters.budget.toLowerCase();
          if (target === 'econômico' || target === 'economico') {
            if (b !== 'econômico' && b !== 'economico' && b !== '$') return false;
          } else if (target === 'conforto') {
            if (b !== 'conforto' && b !== '$$' && b !== '$$$') return false;
          } else if (target === 'luxo') {
            if (b !== 'luxo' && b !== '$$$$') return false;
          }
        }

        // Filtro de Idade
        if (u.dob) {
          const birthYear = new Date(u.dob).getFullYear();
          if (!isNaN(birthYear)) {
            const age = currentYear - birthYear;
            if (age < filters.minAge || age > filters.maxAge) return false;
          }
        }
        return true;
      });

      if (users.length === 0) return [];

      // 3. Compute match score for each user
      const scoredUsers = users.map(u => {
        const theirStyles = u.travel_styles || [];
        const theirIntentions = u.connection_intentions || [];
        
        let commonCount = 0;
        theirStyles.forEach((s: string) => {
          if (myStyles.includes(s)) commonCount++;
        });
        theirIntentions.forEach((i: string) => {
          if (myIntentions.includes(i)) commonCount++;
        });
        
        return {
          ...u,
          commonCount
        };
      });

      // 4. Sort
      if (filters.isTopRatedMode) {
        // Sort by highest rating first
        scoredUsers.sort((a, b) => b.rating - a.rating);
      } else {
        // Sort by highest common count first
        scoredUsers.sort((a, b) => b.commonCount - a.commonCount);
      }

      return scoredUsers;
    },
  });
}
