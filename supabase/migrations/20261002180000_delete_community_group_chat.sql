-- =============================================================================
-- ROMY — Migration: excluir comunidade apaga o chat do grupo (2026-10-02)
--
-- Antes: communities.group_chat_id aponta para conversations, mas excluir a
-- comunidade não apagava a conversa. O chat do grupo ficava "órfão" na lista
-- de quem era membro, sem comunidade e sem dono.
--
-- Agora: um gatilho AFTER DELETE em communities apaga a conversa do grupo.
-- Mensagens e participantes saem junto (on delete cascade). Roda como dono da
-- função (SECURITY DEFINER), porque o cliente não tem permissão de apagar
-- conversas. Se alguma outra tabela ainda apontar para a conversa, ela fica e
-- a exclusão da comunidade continua valendo (não trava).
--
-- Chats que JÁ ficaram órfãos antes desta migration não são apagados aqui:
-- veja a seção "LIMPEZA OPCIONAL" no final. Idempotente e transacional.
-- =============================================================================

begin;

create or replace function public.delete_community_group_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só apaga se nenhuma outra comunidade usa a mesma conversa
  if old.group_chat_id is not null
     and not exists (select 1 from public.communities where group_chat_id = old.group_chat_id) then
    begin
      delete from public.conversations where id = old.group_chat_id and is_group;
    exception when foreign_key_violation then
      raise notice 'Chat % não foi apagado: outra tabela ainda aponta para ele.', old.group_chat_id;
    end;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_delete_community_group_chat on public.communities;
create trigger trg_delete_community_group_chat
  after delete on public.communities
  for each row execute function public.delete_community_group_chat();

commit;

-- =============================================================================
-- VERIFICAÇÃO (rode depois)
-- =============================================================================
-- a) O gatilho existe (esperado: 1 linha):
--    select tgname from pg_trigger where tgname = 'trg_delete_community_group_chat';
--
-- b) No app: crie uma comunidade de teste, abra o chat do grupo, volte, exclua a
--    comunidade. O chat dela deve sumir da aba Chat.
--
-- =============================================================================
-- LIMPEZA OPCIONAL: chats de grupo que já ficaram sem comunidade
-- (apaga as mensagens deles para todo mundo; não dá para desfazer)
-- =============================================================================
-- 1) Veja quais são (nome, quantas mensagens, quantas pessoas ainda estão nele):
--    select c.id, c.name, c.created_at,
--           (select count(*) from public.messages m where m.conversation_id = c.id) as mensagens,
--           (select count(*) from public.conversation_participants p where p.conversation_id = c.id) as pessoas
--      from public.conversations c
--     where c.is_group
--       and not exists (select 1 from public.communities k where k.group_chat_id = c.id)
--     order by c.created_at;
--
-- 2) Se quiser apagar todos eles:
--    delete from public.conversations c
--     where c.is_group
--       and not exists (select 1 from public.communities k where k.group_chat_id = c.id);
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- begin;
--   drop trigger if exists trg_delete_community_group_chat on public.communities;
--   drop function if exists public.delete_community_group_chat();
-- commit;
