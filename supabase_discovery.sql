-- ==========================================
-- FASE 8: Discovery Dashboard e Ajudinha
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Adiciona coluna is_free na tabela users
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- 2. Cria tabela de Eventos Locais
DROP TABLE IF EXISTS public.events CASCADE;
CREATE TABLE public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  location_name text not null,
  city text not null,
  event_time text not null,
  participants_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eventos são públicos" ON public.events FOR SELECT USING (true);

-- Inserir alguns eventos fictícios para o Dashboard
INSERT INTO public.events (title, location_name, city, event_time, participants_count) VALUES
('Tour Eiffel ao Pôr do Sol', 'Torre Eiffel', 'Paris', '18:30', 15),
('Happy Hour Le Marais', 'Le Marais', 'Paris', '19:00', 8),
('Cruzeiro no Sena', 'Pont Neuf', 'Paris', '20:00', 32);

-- 3. Cria tabela de Pedidos de Ajuda (Ajudinha)
DROP TABLE IF EXISTS public.help_requests CASCADE;
CREATE TABLE public.help_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  category text not null, -- 'Farmácia', 'Restaurante', 'Transporte', etc
  content text not null,
  city text not null,
  status text check (status in ('active', 'resolved')) default 'active' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pedidos de ajuda são públicos" ON public.help_requests FOR SELECT USING (true);
CREATE POLICY "Usuários criam seus pedidos" ON public.help_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam seus pedidos" ON public.help_requests FOR UPDATE USING (auth.uid() = user_id);

-- Inserir ajuda fictícia inicial para não começar vazio
INSERT INTO public.help_requests (user_id, category, content, city, status)
SELECT id, 'Restaurante', 'Qual o melhor lugar para comer croissant perto daqui?', 'Paris', 'active'
FROM public.users LIMIT 1;
