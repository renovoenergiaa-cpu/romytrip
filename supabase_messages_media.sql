-- ==========================================
-- ADICIONAR COLUNAS DE MÍDIA À TABELA messages
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- Adiciona coluna de URL de imagem
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- Adiciona coluna de URL de áudio
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_url text;

-- Adiciona coluna de URL de vídeo  
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS video_url text;

-- Torna a coluna text opcional (era NOT NULL)
-- Necessário porque mensagens de mídia podem ter text vazio
ALTER TABLE public.messages
  ALTER COLUMN text DROP NOT NULL;

-- Adiciona constraint: deve ter pelo menos text, image, audio ou video
ALTER TABLE public.messages
  ADD CONSTRAINT messages_has_content CHECK (
    text IS NOT NULL OR image_url IS NOT NULL OR audio_url IS NOT NULL OR video_url IS NOT NULL
  );

-- Atualiza o schema cache do Supabase (às vezes necessário após ALTER TABLE)
NOTIFY pgrst, 'reload schema';
