-- ==========================================
-- MENSAGENS DE ÁUDIO NO CHAT
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Cria o bucket 'chat_audio' caso ele não exista e define como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_audio', 'chat_audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. (Removido, o Supabase já ativa isso por padrão)

-- 3. Permite que QUALQUER PESSOA veja os áudios (Necessário para escutar)
CREATE POLICY "Audios públicos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat_audio');

-- 4. Permite que usuários logados façam UPLOAD de áudios
CREATE POLICY "Upload de audios" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat_audio');

-- 5. Adiciona a coluna de áudio na tabela de mensagens
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;
