-- =============================================================================
-- ROMY — Migration: idiomas no perfil (usados no cadastro e na compatibilidade)
-- Data: 2026-10-02
-- Idempotente. Rollback no final.
-- =============================================================================

begin;

alter table public.users
  add column if not exists languages text[] not null default '{}';

-- users usa GRANT por coluna (20261002120000): coluna nova precisa ser liberada.
grant select (languages) on public.users to authenticated;

notify pgrst, 'reload schema';

commit;

-- VERIFICAÇÃO (esperado: 1 linha "languages"):
--   select column_name from information_schema.column_privileges
--    where table_name = 'users' and grantee = 'authenticated' and column_name = 'languages';
--
-- ROLLBACK:
--   alter table public.users drop column if exists languages;
