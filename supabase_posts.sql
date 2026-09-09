-- ==========================================
-- FASE 5.2: Tabela de Posts do Romy Feed
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Cria a tabela de Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  media_url text not null,
  destination text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Segurança (RLS) para Posts
-- Permitir leitura pública dos posts
CREATE POLICY "Posts são visíveis para todos"
  ON public.posts
  FOR SELECT USING (true);

-- Permitir que usuários autenticados criem seus próprios posts
CREATE POLICY "Usuários podem criar posts"
  ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários deletem seus próprios posts
CREATE POLICY "Usuários podem deletar próprios posts"
  ON public.posts
  FOR DELETE USING (auth.uid() = user_id);
  
-- 3. Storage Bucket para as mídias dos posts
-- OBS: Se der erro de permissão no Storage via SQL, 
-- crie o bucket 'posts' manualmente pelo painel e ative as políticas públicas de SELECT e autenticadas para INSERT.
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;
