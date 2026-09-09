-- ==========================================
-- DEPLOY COMPLETO DAS POLÍTICAS RLS DO ROMY
-- Execute este script no SQL Editor do Supabase
-- Ele foi desenhado para ser seguro e não deletar seus dados.
-- ==========================================

-- 1. FUNÇÕES DE AUXÍLIO
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. TABELA DE USUÁRIOS (users)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. TABELA DE POSTS (posts)
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts são visíveis para todos" ON public.posts;
DROP POLICY IF EXISTS "Usuários podem criar posts" ON public.posts;
DROP POLICY IF EXISTS "Usuários podem deletar próprios posts" ON public.posts;

CREATE POLICY "Posts são visíveis para todos" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar próprios posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- 4. TABELA DE CURTIDAS (post_likes) E COMENTÁRIOS (comments)
ALTER TABLE IF EXISTS public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Curtidas são visíveis para todos" ON public.post_likes;
DROP POLICY IF EXISTS "Usuários podem curtir posts" ON public.post_likes;
DROP POLICY IF EXISTS "Usuários podem descurtir posts" ON public.post_likes;
CREATE POLICY "Curtidas são visíveis para todos" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Usuários podem curtir posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem descurtir posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comentários são visíveis para todos" ON public.comments;
DROP POLICY IF EXISTS "Usuários podem comentar em posts" ON public.comments;
DROP POLICY IF EXISTS "Usuários podem deletar próprios comentários" ON public.comments;
CREATE POLICY "Comentários são visíveis para todos" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Usuários podem comentar em posts" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar próprios comentários" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- 5. TABELA DE COMUNIDADES (communities, community_members, community_posts)
ALTER TABLE IF EXISTS public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View communities" ON public.communities;
DROP POLICY IF EXISTS "Insert communities" ON public.communities;
DROP POLICY IF EXISTS "Delete communities" ON public.communities;
CREATE POLICY "View communities" ON public.communities FOR SELECT USING (
  type IN ('Pública', 'Internacional', 'Temporária') OR 
  EXISTS (SELECT 1 FROM public.community_members WHERE community_id = id AND user_id = auth.uid())
);
CREATE POLICY "Insert communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Delete communities" ON public.communities FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "View community members" ON public.community_members;
DROP POLICY IF EXISTS "Insert community members" ON public.community_members;
CREATE POLICY "View community members" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Insert community members" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "View community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Insert community posts" ON public.community_posts;
CREATE POLICY "View community posts" ON public.community_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.communities WHERE id = community_posts.community_id AND type IN ('Pública', 'Internacional', 'Temporária'))
  OR EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_posts.community_id AND user_id = auth.uid())
);
CREATE POLICY "Insert community posts" ON public.community_posts FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_posts.community_id AND user_id = auth.uid())
);

-- 6. CONEXÕES (connections)
ALTER TABLE IF EXISTS public.connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários veem suas próprias conexões" ON public.connections;
DROP POLICY IF EXISTS "Usuários podem solicitar conexões" ON public.connections;
DROP POLICY IF EXISTS "Destinatários podem responder solicitações" ON public.connections;
DROP POLICY IF EXISTS "Usuários podem desfazer conexões" ON public.connections;

CREATE POLICY "Usuários veem suas próprias conexões" ON public.connections FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Usuários podem solicitar conexões" ON public.connections FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Destinatários podem responder solicitações" ON public.connections FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Usuários podem desfazer conexões" ON public.connections FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 7. EVENTOS E PEDIDOS DE AJUDA (events, help_requests)
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.help_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eventos são públicos" ON public.events;
CREATE POLICY "Eventos são públicos" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pedidos de ajuda são públicos" ON public.help_requests;
DROP POLICY IF EXISTS "Usuários criam seus pedidos" ON public.help_requests;
DROP POLICY IF EXISTS "Usuários atualizam seus pedidos" ON public.help_requests;
CREATE POLICY "Pedidos de ajuda são públicos" ON public.help_requests FOR SELECT USING (true);
CREATE POLICY "Usuários criam seus pedidos" ON public.help_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam seus pedidos" ON public.help_requests FOR UPDATE USING (auth.uid() = user_id);

-- 8. EVENTOS LOCAIS (local_events, event_requests)
ALTER TABLE IF EXISTS public.local_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public events are viewable by everyone." ON public.local_events;
DROP POLICY IF EXISTS "Users can view their own private events." ON public.local_events;
DROP POLICY IF EXISTS "Users can insert their own events." ON public.local_events;
DROP POLICY IF EXISTS "Users can update their own events." ON public.local_events;
DROP POLICY IF EXISTS "Users can delete their own events." ON public.local_events;

CREATE POLICY "Public events are viewable by everyone." ON public.local_events FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own private events." ON public.local_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events." ON public.local_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events." ON public.local_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events." ON public.local_events FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Event creators can view requests for their events." ON public.event_requests;
DROP POLICY IF EXISTS "Users can view their own requests." ON public.event_requests;
DROP POLICY IF EXISTS "Users can insert their own requests." ON public.event_requests;
DROP POLICY IF EXISTS "Only event creators can update request status." ON public.event_requests;
DROP POLICY IF EXISTS "Users can delete their own requests." ON public.event_requests;

CREATE POLICY "Event creators can view requests for their events." ON public.event_requests FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.local_events WHERE id = event_id));
CREATE POLICY "Users can view their own requests." ON public.event_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own requests." ON public.event_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Only event creators can update request status." ON public.event_requests FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.local_events WHERE id = event_id));
CREATE POLICY "Users can delete their own requests." ON public.event_requests FOR DELETE USING (auth.uid() = user_id);

-- 9. MENSAGEIRO E CHATS (conversations, conversation_participants, messages)
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem suas conversas" ON public.conversations;
DROP POLICY IF EXISTS "Usuários criam conversas" ON public.conversations;
DROP POLICY IF EXISTS "Donos podem excluir conversas" ON public.conversations;
CREATE POLICY "Usuários veem suas conversas" ON public.conversations FOR SELECT USING (public.is_conversation_member(id));
CREATE POLICY "Usuários criam conversas" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Donos podem excluir conversas" ON public.conversations FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.communities WHERE group_chat_id = id AND created_by = auth.uid()) OR NOT is_group
);

DROP POLICY IF EXISTS "Usuários veem participantes de suas conversas" ON public.conversation_participants;
DROP POLICY IF EXISTS "Usuários adicionam participantes" ON public.conversation_participants;
DROP POLICY IF EXISTS "Usuários gerenciam sua participação na conversa" ON public.conversation_participants;
DROP POLICY IF EXISTS "Usuários podem sair da conversa" ON public.conversation_participants;

CREATE POLICY "Usuários veem participantes de suas conversas" ON public.conversation_participants FOR SELECT USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id));
CREATE POLICY "Usuários adicionam participantes" ON public.conversation_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuários gerenciam sua participação na conversa" ON public.conversation_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Usuários podem sair da conversa" ON public.conversation_participants FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários veem mensagens de suas conversas" ON public.messages;
DROP POLICY IF EXISTS "Usuários enviam mensagens em suas conversas" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem atualizar mensagens em suas conversas" ON public.messages;

CREATE POLICY "Usuários veem mensagens de suas conversas" ON public.messages FOR SELECT USING (public.is_conversation_member(conversation_id));
CREATE POLICY "Usuários enviam mensagens em suas conversas" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id));
CREATE POLICY "Usuários podem atualizar mensagens em suas conversas" ON public.messages FOR UPDATE USING (public.is_conversation_member(conversation_id)) WITH CHECK (public.is_conversation_member(conversation_id));

-- 10. STORAGE BUCKETS POLICIES (Fotos e Áudios)
-- Aviso: Políticas para a tabela storage.objects devem ser gerenciadas
-- através do painel do Supabase (seção Storage -> Policies) 
-- para evitar erros de permissão "must be owner of table objects".
