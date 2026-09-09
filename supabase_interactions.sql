-- ==========================================
-- FASE 6: Interações do Romy Feed (Likes/Comments)
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Cria a tabela de Curtidas de Posts
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(post_id, user_id) -- Impede que um usuário curta o mesmo post mais de uma vez
);

-- Habilitar RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curtidas são visíveis para todos"
  ON public.post_likes FOR SELECT USING (true);

CREATE POLICY "Usuários podem curtir posts"
  ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem descurtir posts"
  ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- 2. Cria a tabela de Comentários
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentários são visíveis para todos"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Usuários podem comentar em posts"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios comentários"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);
