-- ==========================================
-- FASE 9: Messenger & Chat
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Cria tabela de conversas
DROP TABLE IF EXISTS public.conversations CASCADE;
CREATE TABLE public.conversations (
  id uuid default gen_random_uuid() primary key,
  is_group boolean default false not null,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. Cria tabela de participantes
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
CREATE TABLE public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. Cria tabela de mensagens
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Políticas RLS
-- ==========================================

-- Usuários podem ver as conversas nas quais eles são participantes
CREATE POLICY "Usuários veem suas conversas" ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
  )
);

-- Usuários podem criar conversas
CREATE POLICY "Usuários criam conversas" ON public.conversations FOR INSERT WITH CHECK (true);

-- Usuários veem participantes de conversas onde eles estão
CREATE POLICY "Usuários veem participantes de suas conversas" ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversation_participants.conversation_id AND cp.user_id = auth.uid()
  )
);

-- Usuários podem adicionar participantes
CREATE POLICY "Usuários adicionam participantes" ON public.conversation_participants FOR INSERT WITH CHECK (true);

-- Usuários veem mensagens de conversas onde eles estão
CREATE POLICY "Usuários veem mensagens de suas conversas" ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
  )
);

-- Usuários enviam mensagens em suas conversas
CREATE POLICY "Usuários enviam mensagens em suas conversas" ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
  )
);

-- ==========================================
-- Trigger para atualizar a conversa via RPC
-- ==========================================
-- Adicionaremos Realtime na tabela messages pelo Dashboard do Supabase.
