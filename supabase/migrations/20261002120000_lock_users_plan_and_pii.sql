-- =============================================================================
-- ROMY — Migration: trava do plano (plan) e das colunas sensíveis de public.users
-- Data: 2026-10-02
--
-- Corrige dois achados da auditoria de RLS:
--   1. Qualquer usuário logado podia fazer UPDATE users SET plan='gold' (paywall
--      grátis), pois a policy de UPDATE não restringe colunas.
--   2. pentest_fixes_round4.sql fez GRANT SELECT na tabela inteira, expondo
--      email, push_token e last_location (GPS) de TODOS os usuários a qualquer
--      usuário logado. RLS filtra linhas, não colunas.
--
-- Idempotente: pode ser executada mais de uma vez.
-- Rollback: bloco comentado no final do arquivo.
-- Aplicar: SQL Editor do Supabase (ou `supabase db push`).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. PLANO: só o servidor (service_role / postgres / funções SECURITY DEFINER)
--    pode alterar users.plan. anon e authenticated, não.
-- -----------------------------------------------------------------------------
create or replace function public.protect_users_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- current_user = role da sessão (PostgREST faz SET ROLE authenticated/anon).
  -- service_role, postgres e funções SECURITY DEFINER do dono passam livres.
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.plan := 'free';
    elsif new.plan is distinct from old.plan then
      raise exception 'Alteração de plano não permitida pelo cliente.'
        using errcode = '42501'; -- insufficient_privilege
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_users_plan on public.users;
create trigger trg_protect_users_plan
  before insert or update of plan on public.users
  for each row execute function public.protect_users_plan();

comment on function public.protect_users_plan is
  'Impede que anon/authenticated definam ou alterem users.plan; assinatura deve ser gravada por webhook/Edge Function (service_role).';

-- -----------------------------------------------------------------------------
-- 2. COLUNAS: SELECT em users só nas colunas que o app realmente usa.
--    Fora da lista (ficam ilegíveis para o cliente): email, push_token,
--    last_location. O REVOKE de tabela remove também os grants por coluna.
--
--    is_deleted entra na lista porque a policy de SELECT em posts consulta
--    users.is_deleted — foi esse o motivo do GRANT amplo do Round 4 (erro 42501).
-- -----------------------------------------------------------------------------
revoke select on public.users from anon;
revoke select on public.users from authenticated;

grant select (
  id, name, city, sex, photos, bio, destination,
  check_in, check_out, is_flexible, companions,
  travel_styles, interests, budget, cost_split,
  group_travel, one_person, invitations, is_free,
  created_at, updated_at, connection_intentions,
  gender_preference, privacy_settings, dob, plan, is_deleted
) on public.users to authenticated;

-- anon fica sem acesso à tabela: o app exige login para tudo que lê users.

notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- VERIFICAÇÃO (rode depois, uma a uma)
-- =============================================================================
-- a) Colunas legíveis por authenticated (não deve listar email, push_token, last_location):
--    select column_name from information_schema.column_privileges
--     where table_schema='public' and table_name='users'
--       and grantee='authenticated' and privilege_type='SELECT' order by 1;
--
-- b) Simular um usuário logado (deve dar "permission denied for table users"):
--    begin;
--      set local role authenticated;
--      select email from public.users limit 1;
--    rollback;
--
-- c) Mudar plano como cliente (deve dar "Alteração de plano não permitida"):
--    begin;
--      set local role authenticated;
--      select set_config('request.jwt.claims',
--        json_build_object('sub', (select id::text from public.users limit 1), 'role', 'authenticated')::text, true);
--      update public.users set plan = 'gold' where id = (select id from public.users limit 1);
--    rollback;
--
-- d) Contas que hoje têm plano pago (como não há integração de pagamento, todas
--    foram auto-atribuídas — decida se quer resetar):
--    select id, name, plan from public.users where plan is distinct from 'free';
--
-- =============================================================================
-- ROLLBACK (só se algo quebrar; reabre a exposição de PII)
-- =============================================================================
-- begin;
--   drop trigger if exists trg_protect_users_plan on public.users;
--   drop function if exists public.protect_users_plan();
--   grant select on public.users to authenticated;
-- commit;
