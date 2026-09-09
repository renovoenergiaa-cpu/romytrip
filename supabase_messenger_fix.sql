-- ==========================================
-- CORREÇÃO DE POLÍTICAS DE SEGURANÇA (RLS)
-- Execute este script no SQL Editor do Supabase
-- para resolver o erro "infinite recursion"
-- ==========================================

-- 1. Cria uma função segura que ignora o RLS (Security Definer) 
-- para checar se o usuário está na conversa, evitando o loop infinito.
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Remove as políticas antigas problemáticas
DROP POLICY IF EXISTS "Usuários veem participantes de suas conversas" ON public.conversation_participants;
DROP POLICY IF EXISTS "Usuários veem suas conversas" ON public.conversations;
DROP POLICY IF EXISTS "Usuários veem mensagens de suas conversas" ON public.messages;
DROP POLICY IF EXISTS "Usuários enviam mensagens em suas conversas" ON public.messages;

-- 3. Recria as políticas usando a nova função segura
CREATE POLICY "Usuários veem participantes de suas conversas" ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid() OR public.is_conversation_member(conversation_id)
);

CREATE POLICY "Usuários veem suas conversas" ON public.conversations FOR SELECT
USING (
  public.is_conversation_member(id)
);

CREATE POLICY "Usuários veem mensagens de suas conversas" ON public.messages FOR SELECT
USING (
  public.is_conversation_member(conversation_id)
);

CREATE POLICY "Usuários enviam mensagens em suas conversas" ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  public.is_conversation_member(conversation_id)
);
