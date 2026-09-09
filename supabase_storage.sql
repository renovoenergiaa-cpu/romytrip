-- 1. Cria o bucket 'avatars' caso ele não exista e define como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Garante que as políticas de segurança (RLS) estão ativadas para os arquivos
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Permite que QUALQUER PESSOA veja as fotos (Necessário para o Feed)
CREATE POLICY "Fotos públicas" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 4. Permite que usuários logados façam UPLOAD de fotos
CREATE POLICY "Upload de fotos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

-- 5. Permite que usuários logados atualizem/apaguem suas próprias fotos
CREATE POLICY "Modificar fotos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Deletar fotos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars' AND auth.uid() = owner);
