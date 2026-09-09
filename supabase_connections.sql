-- ==========================================
-- FASE 7: Sistema de Conexões (Matches)
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Cria a tabela de Conexões (Dropa a anterior se existir para evitar conflitos)
DROP TABLE IF EXISTS public.connections CASCADE;

CREATE TABLE public.connections (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(sender_id, receiver_id) -- Impede múltiplas solicitações entre as mesmas pessoas
);

-- Habilitar RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Segurança (RLS)
-- O usuário pode ver as conexões onde ele é o remetente ou o destinatário
CREATE POLICY "Usuários veem suas próprias conexões"
  ON public.connections FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- O usuário pode enviar conexões (inserir) onde ele é o remetente
CREATE POLICY "Usuários podem solicitar conexões"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- O usuário só pode alterar o status (aceitar/recusar) se ele for o destinatário
CREATE POLICY "Destinatários podem responder solicitações"
  ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Permitir que usuários deletem conexões caso queiram desfazer
CREATE POLICY "Usuários podem desfazer conexões"
  ON public.connections FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
