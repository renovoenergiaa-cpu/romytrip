-- =============================================================================
-- ROMY — Migration: função para iniciar conversa 1-a-1
-- Data: 2026-10-02
--
-- Problema: iniciar conversa falhava com
--   "new row violates row-level security policy for table conversation_participants".
-- A policy de INSERT só aceita quem já é membro OU conversa criada há < 30 s,
-- mas essa checagem lê public.conversations, cuja policy de SELECT exige ser
-- membro. Resultado: ninguém conseguia criar a primeira conversa.
--
-- Solução: o app chama esta função (rpc start_direct_conversation), que roda
-- com privilégio do dono, valida tudo e cria conversa + 2 participantes numa
-- única transação. Ela também:
--   - devolve a conversa 1-a-1 existente, se houver;
--   - recusa conversa consigo mesmo e com contas excluídas;
--   - respeita privacy_settings.allowDirectMessages = false (aí só conexões
--     aceitas podem iniciar conversa) — antes isso só existia no cliente.
--
-- Idempotente. Rollback no final.
-- =============================================================================

begin;

create or replace function public.start_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  conv_id  uuid;
  allow_dm boolean;
begin
  if me is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  if target_user_id is null or target_user_id = me then
    raise exception 'Destinatário inválido.' using errcode = '22023';
  end if;

  select coalesce((privacy_settings ->> 'allowDirectMessages')::boolean, true)
    into allow_dm
    from public.users
   where id = target_user_id
     and coalesce(is_deleted, false) = false
     and name is distinct from 'Conta Excluída';

  if not found then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

  -- Já existe conversa 1-a-1 entre os dois? Reaproveita.
  select c.id into conv_id
    from public.conversations c
    join public.conversation_participants a on a.conversation_id = c.id and a.user_id = me
    join public.conversation_participants b on b.conversation_id = c.id and b.user_id = target_user_id
   where not c.is_group
   limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  if not allow_dm and not exists (
    select 1 from public.connections
     where status = 'accepted'
       and ((sender_id = me and receiver_id = target_user_id)
         or (sender_id = target_user_id and receiver_id = me))
  ) then
    raise exception 'Esta pessoa só recebe mensagens de conexões.' using errcode = '42501';
  end if;

  insert into public.conversations (is_group) values (false) returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conv_id, me), (conv_id, target_user_id);

  return conv_id;
end;
$$;

revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
-- A função existe e só authenticated pode executar:
--   select grantee, privilege_type from information_schema.routine_privileges
--    where routine_name = 'start_direct_conversation';
-- Depois: no app, abra um perfil e toque em "Mensagem".
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- drop function if exists public.start_direct_conversation(uuid);
