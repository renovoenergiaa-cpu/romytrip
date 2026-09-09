-- ==========================================
-- CORREÇÃO DE LEITURA DE MENSAGENS (RLS)
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- Permite que usuários atualizem mensagens de suas conversas (para marcar como lidas)
CREATE POLICY "Usuários podem atualizar mensagens em suas conversas" 
ON public.messages 
FOR UPDATE
USING (
  public.is_conversation_member(conversation_id)
)
WITH CHECK (
  public.is_conversation_member(conversation_id)
);
