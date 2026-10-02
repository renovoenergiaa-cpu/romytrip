-- =============================================================================
-- ROMY — Migration: participantes da conversa podem ler a mídia do chat
-- Data: 2026-10-02
--
-- Problema: a mensagem guardava um link assinado que expira em 1 hora, então
-- áudios/fotos/vídeos antigos quebravam para todo mundo. Agora o app gera um
-- link novo na hora de exibir (createSignedUrl), e para isso quem RECEBEU a
-- mensagem precisa de SELECT no arquivo — antes só o dono tinha
-- (20261002130000_lock_chat_media_buckets.sql).
--
-- Regra: pode ler o arquivo quem participa de uma conversa que tem uma
-- mensagem citando esse arquivo, ENVIADA PELO DONO dele (o arquivo fica em
-- <sender_id>/...). Essa última condição impede alguém de criar uma mensagem
-- própria apontando para o arquivo de outra pessoa para ganhar acesso.
--
-- Idempotente. Rollback no final.
-- =============================================================================

begin;

create or replace function public.can_read_chat_object(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.messages m
      join public.conversation_participants cp
        on cp.conversation_id = m.conversation_id
       and cp.user_id = auth.uid()
     where m.sender_id::text = split_part(p_name, '/', 1)
       and strpos(
             coalesce(m.audio_url, '') || ' ' || coalesce(m.image_url, '') || ' ' || coalesce(m.video_url, ''),
             p_bucket || '/' || p_name
           ) > 0
  );
$$;

revoke all on function public.can_read_chat_object(text, text) from public, anon;
grant execute on function public.can_read_chat_object(text, text) to authenticated;

drop policy if exists chat_media_select_participants on storage.objects;
create policy chat_media_select_participants
  on storage.objects for select to authenticated
  using (
    bucket_id in ('chat_audio', 'chat_images', 'chat_videos')
    and public.can_read_chat_object(bucket_id, name)
  );

commit;

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
-- Visitante sem login continua sem ver nada (esperado: 0):
--   begin; set local role anon;
--   select count(*) from storage.objects where bucket_id like 'chat_%';
--   rollback;
-- Depois: no app, abra um chat com áudio/foto antigos — devem tocar/aparecer.
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- drop policy if exists chat_media_select_participants on storage.objects;
-- drop function if exists public.can_read_chat_object(text, text);
