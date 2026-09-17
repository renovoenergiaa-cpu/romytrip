-- =========================================================================
-- ROMY SECURITY HARDENING - CORREÇÃO DE LÓGICA & PREVENÇÃO DE EXPLOITS
-- Execute este script no SQL Editor do Supabase Dashboard
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. BLINDAGEM DE CONEXÕES (IMPEDE FORÇAR 'ACCEPTED' SEM CONSENTIMENTO)
-- -------------------------------------------------------------------------
-- Impede que um usuário mal-intencionado force uma conexão aceita imediata.
-- Toda solicitação criada DEVE ter status 'pending'.
DROP POLICY IF EXISTS "Usuários podem solicitar conexões" ON public.connections;

CREATE POLICY "Usuários podem solicitar conexões" 
ON public.connections FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND status = 'pending'
);

-- -------------------------------------------------------------------------
-- 2. BLINDAGEM DE COMUNIDADES (PREVINE ESCALAÇÃO DE ADMIN E INVASÃO PRIVADA)
-- -------------------------------------------------------------------------
-- Regras validadas:
-- a) O criador da comunidade pode entrar como 'admin'.
-- b) Novos membros só podem entrar como 'member' em comunidades públicas/abertas.
DROP POLICY IF EXISTS "Insert community members" ON public.community_members;

CREATE POLICY "Insert community members" 
ON public.community_members FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Caso 1: O criador da comunidade configurando o admin inicial
    (
      role = 'admin' 
      AND EXISTS (
        SELECT 1 FROM public.communities 
        WHERE id = community_id AND created_by = auth.uid()
      )
    )
    OR
    -- Caso 2: Membro regular entrando em comunidade aberta
    (
      role = 'member' 
      AND EXISTS (
        SELECT 1 FROM public.communities 
        WHERE id = community_id 
        AND type IN ('Pública', 'Internacional', 'Temporária')
      )
    )
  )
);

-- -------------------------------------------------------------------------
-- 3. BLINDAGEM DE PARTICIPAÇÃO EM CONVERSAS E CHATS DE GRUPO
-- -------------------------------------------------------------------------
-- Regras validadas:
-- a) Membro existente pode adicionar participantes (em grupos).
-- b) Nova conversa criada recentemente (últimos 10 min) permite adicionar o par inicial.
-- c) Membro de uma comunidade pode entrar no chat de grupo daquela comunidade.
DROP POLICY IF EXISTS "Usuários adicionam participantes" ON public.conversation_participants;

CREATE POLICY "Usuários adicionam participantes" 
ON public.conversation_participants 
FOR INSERT WITH CHECK (
  -- Membro legítimo da conversa
  public.is_conversation_member(conversation_id)
  OR
  -- Conversa recém-criada (1-on-1)
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND (c.created_at >= now() - interval '10 minutes')
  )
  OR
  -- Membro de comunidade acessando o chat da comunidade
  EXISTS (
    SELECT 1 FROM public.communities comm
    WHERE comm.group_chat_id = conversation_participants.conversation_id
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = comm.id AND cm.user_id = auth.uid()
    )
  )
);

-- -------------------------------------------------------------------------
-- 4. BLINDAGEM DE EVENTOS LOCAIS (IMPEDE AUTO-APROVAÇÃO)
-- -------------------------------------------------------------------------
-- Todo pedido de entrada em eventos locais deve começar como 'pending'.
DROP POLICY IF EXISTS "Users can insert their own requests." ON public.event_requests;

CREATE POLICY "Users can insert their own requests." 
ON public.event_requests FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
);

-- =========================================================================
-- FIM DA BLINDAGEM
-- =========================================================================
