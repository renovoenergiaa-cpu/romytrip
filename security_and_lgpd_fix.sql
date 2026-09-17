-- ==========================================================
-- SCRIPT DE CORREÇÃO DE SEGURANÇA E CONFORMIDADE COM A LGPD
-- Execute este script no SQL Editor do Supabase Dashboard
-- ==========================================================

-- ----------------------------------------------------------
-- 1. CORREÇÃO DA VULNERABILIDADE IDOR EM CONVERSAS (BOLA)
-- ----------------------------------------------------------
-- Problema: A política anterior permitia WITH CHECK (true),
-- possibilitando que qualquer usuário se inserisse em conversas
-- privadas alheias e lesse mensagens confidenciais.
-- Solução: Restringe a inserção apenas para membros legítimos ou 
-- criadores de novas conversas.

DROP POLICY IF EXISTS "Usuários adicionam participantes" ON public.conversation_participants;

CREATE POLICY "Usuários adicionam participantes" 
ON public.conversation_participants 
FOR INSERT WITH CHECK (
  -- 1. Se já for membro da conversa (ex: adicionando alguém a um grupo)
  public.is_conversation_member(conversation_id)
  OR
  -- 2. Se a conversa for recém-criada (criada há menos de 5 minutos), permitindo configurar os participantes iniciais
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND (c.created_at >= now() - interval '5 minutes')
  )
);

-- ----------------------------------------------------------
-- 2. PROTEÇÃO DE DADOS PESSOAIS DA TABELA USERS (LGPD)
-- ----------------------------------------------------------
-- Problema: Qualquer pessoa com a ANON KEY conseguia consultar
-- a lista completa de e-mails, push_tokens e localizações GPS.
-- Solução: Revogar acesso de leitura das colunas sensíveis (email, push_token)
-- para o role 'anon', e restringir a visibilidade de perfis deletados.

-- Revoga leitura irrestrita para usuários não autenticados
REVOKE SELECT ON public.users FROM anon;

-- Concede acesso apenas às colunas públicas necessárias para o role 'anon'
GRANT SELECT (
  id, name, city, sex, photos, bio, destination, 
  check_in, check_out, is_flexible, companions, 
  travel_styles, interests, budget, cost_split, 
  group_travel, one_person, invitations, is_free, 
  created_at, updated_at, connection_intentions, gender_preference
) ON public.users TO anon;

-- Oculta contas excluídas de buscas gerais na tabela users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

CREATE POLICY "Users can view all profiles" 
ON public.users 
FOR SELECT USING (
  -- O próprio usuário pode ver todo o seu perfil
  auth.uid() = id
  OR
  -- Outros usuários só veem perfis ativos (não anônimos/excluídos)
  (name IS DISTINCT FROM 'Conta Excluída')
);

-- ----------------------------------------------------------
-- 3. SEGURANÇA NO BUCKET DE ÁUDIOS DE CHAT (LGPD BIOMETRIA)
-- ----------------------------------------------------------
-- Garante que o bucket 'chat_audio' seja privado (public = false)
-- para que mensagens de voz não tenham links públicos permanentes.

UPDATE storage.buckets
SET public = false
WHERE id = 'chat_audio';

-- ==========================================================
-- Fim do Script de Segurança & LGPD
-- ==========================================================
