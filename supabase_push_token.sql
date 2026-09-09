-- ==========================================
-- ADICIONAR COLUNA push_token À TABELA users
-- Execute este script no SQL Editor do Supabase
-- ==========================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;

-- Permite que o próprio usuário atualize seu push_token
-- (necessário para salvar o token via app)
CREATE POLICY IF NOT EXISTS "Usuário atualiza próprio push_token" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
