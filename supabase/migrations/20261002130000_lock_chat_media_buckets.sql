-- =============================================================================
-- ROMY — Migration: trava dos buckets de mídia do chat
-- Data: 2026-10-02
--
-- Corrige o achado 3 da auditoria de RLS:
--   O bucket chat_audio foi marcado como privado (security_and_lgpd_fix.sql),
--   mas a policy "Audios públicos" (supabase_audio.sql) continuou valendo para
--   QUALQUER role, inclusive anon: qualquer pessoa com a anon key listava e
--   baixava os áudios das conversas pela API do Storage. O upload também
--   aceitava qualquer caminho. As policies de chat_images/chat_videos foram
--   criadas à mão no painel e não estão versionadas.
--
-- Modelo depois desta migration (os 3 buckets):
--   - Privados, com limite de tamanho e tipo de arquivo.
--   - Upload só na pasta do próprio usuário: <user_id>/arquivo (é o que o app faz).
--   - Leitura, alteração e remoção só pelo dono do arquivo.
--   - Quem recebe a mensagem acessa pela URL assinada que o remetente gera
--     no envio (URL assinada não passa por RLS), então nada muda no app.
--
-- Idempotente. Rollback: bloco comentado no final.
-- Aplicar: SQL Editor do Supabase.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Buckets privados, com limites (cria se ainda não existir).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('chat_audio',  'chat_audio',  false, 10 * 1024 * 1024, array['audio/*']),
  ('chat_images', 'chat_images', false, 15 * 1024 * 1024, array['image/*']),
  ('chat_videos', 'chat_videos', false, 50 * 1024 * 1024, array['video/*'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Remove TODAS as policies antigas que citam esses buckets, inclusive as
--    criadas à mão no painel (nomes desconhecidos). Policies são permissivas
--    (OR), então uma antiga esquecida reabriria o acesso.
--    Se alguma policy citar também avatars/posts, aborta para não quebrar
--    esses buckets: nesse caso, me mande o NOTICE/erro.
-- -----------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname,
           coalesce(qual, '') || ' ' || coalesce(with_check, '') as expr
      from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ 'chat_(audio|images|videos)'
       and policyname not like 'chat_media_%'
  loop
    if p.expr ~ '(avatars|posts)' then
      raise exception 'Policy "%" mistura buckets do chat com avatars/posts; revise manualmente.', p.policyname;
    end if;
    raise notice 'Removendo policy antiga: %', p.policyname;
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 3. Policies novas (só authenticated; anon não tem acesso nenhum).
-- -----------------------------------------------------------------------------
drop policy if exists chat_media_insert_own_folder on storage.objects;
create policy chat_media_insert_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('chat_audio', 'chat_images', 'chat_videos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists chat_media_select_own on storage.objects;
create policy chat_media_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id in ('chat_audio', 'chat_images', 'chat_videos')
    and owner_id = (select auth.uid())::text
  );

drop policy if exists chat_media_update_own on storage.objects;
create policy chat_media_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id in ('chat_audio', 'chat_images', 'chat_videos')
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id in ('chat_audio', 'chat_images', 'chat_videos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists chat_media_delete_own on storage.objects;
create policy chat_media_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('chat_audio', 'chat_images', 'chat_videos')
    and owner_id = (select auth.uid())::text
  );

commit;

-- =============================================================================
-- VERIFICAÇÃO (rode depois)
-- =============================================================================
-- a) Visitante sem login não enxerga nenhum arquivo do chat (esperado: 0):
--    begin;
--      set local role anon;
--      select count(*) from storage.objects
--       where bucket_id in ('chat_audio','chat_images','chat_videos');
--    rollback;
--
-- b) Policies que sobraram para os buckets do chat (esperado: só as 4 chat_media_*):
--    select policyname, cmd, roles from pg_policies
--     where schemaname='storage' and tablename='objects'
--       and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'chat_(audio|images|videos)';
--
-- c) Buckets (esperado: public = false nos 3):
--    select id, public, file_size_limit, allowed_mime_types from storage.buckets
--     where id like 'chat_%';
--
-- =============================================================================
-- ROLLBACK (reabre os áudios ao público — só se algo quebrar)
-- =============================================================================
-- begin;
--   drop policy if exists chat_media_insert_own_folder on storage.objects;
--   drop policy if exists chat_media_select_own        on storage.objects;
--   drop policy if exists chat_media_update_own        on storage.objects;
--   drop policy if exists chat_media_delete_own        on storage.objects;
--   create policy "Audios públicos" on storage.objects for select using (bucket_id = 'chat_audio');
--   create policy "Upload de audios" on storage.objects for insert to authenticated with check (bucket_id = 'chat_audio');
-- commit;
