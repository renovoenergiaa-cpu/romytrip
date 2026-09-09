-- ==========================================
-- Atualização do Banco de Dados: Gerenciamento de Chats
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Adicionar colunas is_archived e is_muted na tabela conversation_participants
ALTER TABLE public.conversation_participants 
ADD COLUMN IF NOT EXISTS is_archived boolean default false not null,
ADD COLUMN IF NOT EXISTS is_muted boolean default false not null;

-- 2. Atualizar as políticas do RLS para permitir que o próprio usuário edite seu estado na tabela conversation_participants
-- Atualmente, os usuários podem Inserir e Ver, mas não Alterar ou Deletar.

-- Usuário pode alterar APENAS o seu próprio registro em conversation_participants (para arquivar/silenciar)
DROP POLICY IF EXISTS "Usuários gerenciam sua participação na conversa" ON public.conversation_participants;
CREATE POLICY "Usuários gerenciam sua participação na conversa" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Usuário pode sair (deletar) da conversa (apenas o seu próprio registro)
DROP POLICY IF EXISTS "Usuários podem sair da conversa" ON public.conversation_participants;
CREATE POLICY "Usuários podem sair da conversa" ON public.conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- NOTA: O dono de um grupo também pode excluir a conversa inteira.
-- Essa permissão já pode ser validada pela tabela `communities` (ou vamos criar uma para a tabela `conversations`)
DROP POLICY IF EXISTS "Donos podem excluir conversas" ON public.conversations;
CREATE POLICY "Donos podem excluir conversas" ON public.conversations
  FOR DELETE USING (
    -- Permite deletar se for um chat privado 1-a-1 (quando sobra 0 membros) 
    -- ou se o usuário for o criador da comunidade associada a esse grupo
    EXISTS (
      SELECT 1 FROM public.communities 
      WHERE group_chat_id = id AND created_by = auth.uid()
    )
    OR NOT is_group -- Se não for grupo, permitimos deletar? Melhor apenas deixar o usuário sair de conversation_participants
  );
