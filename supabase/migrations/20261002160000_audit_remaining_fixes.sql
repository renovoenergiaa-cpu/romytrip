-- =============================================================================
-- ROMY — Migration: itens restantes da auditoria de RLS (2026-10-02)
--
--   1. Comunidades: criar e entrar viram funções no banco (as policies de
--      INSERT em conversation_participants/community_members impediam criar
--      comunidade, criar comunidade Privada e entrar no chat do grupo).
--      Membros de comunidade Privada deixam de ser visíveis a todos.
--   2. Confirmação de leitura: função mark_conversation_read (a policy de
--      UPDATE em messages só deixa o remetente alterar, então read_at nunca
--      era gravado).
--   3. Conexões: só o status pode ser alterado (antes o destinatário podia
--      trocar sender_id e forjar conexão aceita com terceiros).
--   4. 18+: escrever (postar, comentar, conectar, mandar mensagem...) exige
--      data de nascimento preenchida e maioridade. Antes bastava deixar dob
--      vazio para contornar a trava.
--   5. Visitante sem login (anon) perde acesso a todas as tabelas de public.
--
-- Com isso o cliente não insere mais direto em conversations,
-- conversation_participants, communities e community_members: só pelas
-- funções, que validam tudo. Idempotente e transacional. Rollback no final.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Funções auxiliares (SECURITY DEFINER: não passam por RLS, evitam recursão)
-- -----------------------------------------------------------------------------
create or replace function public.is_adult(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
     where id = p_user_id
       and dob is not null
       and dob <= (current_date - interval '18 years')::date
  );
$$;

create or replace function public.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
     where community_id = p_community_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_view_community(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.communities
     where id = p_community_id
       and (type in ('Pública', 'Internacional', 'Temporária')
            or public.is_community_member(id))
  );
$$;

revoke all on function public.is_adult(uuid)               from public, anon;
revoke all on function public.is_community_member(uuid)    from public, anon;
revoke all on function public.can_view_community(uuid)     from public, anon;
grant execute on function public.is_adult(uuid)            to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.can_view_community(uuid)  to authenticated;

-- -----------------------------------------------------------------------------
-- 1. COMUNIDADES
-- -----------------------------------------------------------------------------
create or replace function public.create_community(p jsonb)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  conv_id uuid;
  c       public.communities;
begin
  if me is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if not public.is_adult(me) then
    raise exception 'Complete seu perfil para criar comunidades (exclusivo para maiores de 18 anos).' using errcode = '42501';
  end if;
  if coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'Informe o nome da comunidade.' using errcode = '22023';
  end if;
  if coalesce(p ->> 'type', '') not in ('Pública', 'Privada', 'Internacional', 'Temporária') then
    raise exception 'Tipo de comunidade inválido.' using errcode = '22023';
  end if;

  insert into public.conversations (is_group, name)
  values (true, trim(p ->> 'title'))
  returning id into conv_id;

  insert into public.communities
    (title, type, description, location, start_date, end_date, color, bg_color, created_by, group_chat_id)
  values (
    trim(p ->> 'title'),
    p ->> 'type',
    nullif(p ->> 'description', ''),
    nullif(p ->> 'location', ''),
    nullif(p ->> 'start_date', '')::timestamptz,
    nullif(p ->> 'end_date', '')::timestamptz,
    coalesce(nullif(p ->> 'color', ''), '#A855F7'),
    coalesce(nullif(p ->> 'bg_color', ''), '#F3E8FF'),
    me,
    conv_id
  )
  returning * into c;

  insert into public.community_members (community_id, user_id, role) values (c.id, me, 'admin');
  insert into public.conversation_participants (conversation_id, user_id) values (conv_id, me);

  return c;
end;
$$;

create or replace function public.join_community(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c  record;
begin
  if me is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if not public.is_adult(me) then
    raise exception 'Complete seu perfil para entrar em comunidades (exclusivo para maiores de 18 anos).' using errcode = '42501';
  end if;

  select id, type, group_chat_id into c from public.communities where id = p_community_id;
  if not found then
    raise exception 'Comunidade não encontrada.' using errcode = 'P0002';
  end if;
  if c.type not in ('Pública', 'Internacional', 'Temporária') then
    raise exception 'Esta comunidade é privada.' using errcode = '42501';
  end if;

  insert into public.community_members (community_id, user_id, role)
  values (c.id, me, 'member')
  on conflict do nothing;

  if c.group_chat_id is not null then
    insert into public.conversation_participants (conversation_id, user_id)
    values (c.group_chat_id, me)
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.create_community(jsonb)  from public, anon;
revoke all on function public.join_community(uuid)     from public, anon;
grant execute on function public.create_community(jsonb) to authenticated;
grant execute on function public.join_community(uuid)    to authenticated;

-- Quem já é membro mas ficou fora do chat do grupo (policy antiga de 30 s) entra agora.
insert into public.conversation_participants (conversation_id, user_id)
select c.group_chat_id, m.user_id
  from public.community_members m
  join public.communities c on c.id = m.community_id
 where c.group_chat_id is not null
on conflict do nothing;

-- Visibilidade sem recursão: comunidades e membros via funções auxiliares.
drop policy if exists "View communities" on public.communities;
create policy "View communities" on public.communities
  for select to authenticated
  using (type in ('Pública', 'Internacional', 'Temporária') or public.is_community_member(id));

drop policy if exists "View community members" on public.community_members;
create policy "View community members" on public.community_members
  for select to authenticated
  using (public.can_view_community(community_id));

-- -----------------------------------------------------------------------------
-- 1b. Sem INSERT direto do cliente nessas 4 tabelas (só pelas funções acima e
--     start_direct_conversation). Remove todas as policies de INSERT, inclusive
--     as de nome desconhecido criadas no painel.
-- -----------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
     where schemaname = 'public'
       and tablename in ('conversations', 'conversation_participants', 'communities', 'community_members')
       and cmd = 'INSERT'
  loop
    raise notice 'Removendo policy de INSERT: %.%', p.tablename, p.policyname;
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. CONFIRMAÇÃO DE LEITURA
-- -----------------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  n  integer;
begin
  if me is null or not exists (
    select 1 from public.conversation_participants
     where conversation_id = p_conversation_id and user_id = me
  ) then
    raise exception 'Você não participa desta conversa.' using errcode = '42501';
  end if;

  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and sender_id <> me
     and read_at is null;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. CONEXÕES: cliente só altera o status
-- -----------------------------------------------------------------------------
create or replace function public.protect_connections_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.sender_id   is distinct from old.sender_id
       or new.receiver_id is distinct from old.receiver_id
       or new.created_at  is distinct from old.created_at) then
    raise exception 'Só o status da conexão pode ser alterado.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_connections_update on public.connections;
create trigger trg_protect_connections_update
  before update on public.connections
  for each row execute function public.protect_connections_update();

-- -----------------------------------------------------------------------------
-- 4. 18+: policy RESTRITIVA (soma com AND às existentes) em todo INSERT do cliente
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'posts', 'comments', 'post_likes', 'connections', 'messages',
    'community_posts', 'help_requests', 'help_replies', 'local_events', 'event_requests'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists adults_only_insert on public.%I', t);
      execute format(
        'create policy adults_only_insert on public.%I as restrictive for insert to authenticated with check (public.is_adult())',
        t
      );
    end if;
  end loop;
end
$$;

-- Conversa direta: mesma regra, para quem inicia e para quem recebe.
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
  if not public.is_adult(me) then
    raise exception 'Complete seu perfil para enviar mensagens (exclusivo para maiores de 18 anos).' using errcode = '42501';
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

  if not found or not public.is_adult(target_user_id) then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

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

-- -----------------------------------------------------------------------------
-- 5. VISITANTE SEM LOGIN: nenhum acesso às tabelas de public (o app exige login)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- VERIFICAÇÃO (rode depois)
-- =============================================================================
-- a) Visitante sem login (esperado: erro "permission denied for table comments"):
--    begin; set local role anon; select count(*) from public.comments; rollback;
--
-- b) Funções novas existem (esperado: 6 linhas):
--    select proname from pg_proc where proname in ('is_adult','is_community_member',
--      'can_view_community','create_community','join_community','mark_conversation_read');
--
-- c) Policies de INSERT restantes nas 4 tabelas (esperado: nenhuma linha):
--    select tablename, policyname from pg_policies where schemaname='public'
--      and tablename in ('conversations','conversation_participants','communities','community_members')
--      and cmd='INSERT';
--
-- d) Usuários sem data de nascimento (não conseguirão postar/conversar até completar o perfil):
--    select count(*) from public.users where dob is null and coalesce(is_deleted,false) = false;
--
-- =============================================================================
-- ROLLBACK (parcial; reabre os problemas)
-- =============================================================================
-- begin;
--   grant select on all tables in schema public to anon;
--   drop trigger if exists trg_protect_connections_update on public.connections;
--   do $$ declare t text; begin
--     foreach t in array array['posts','comments','post_likes','connections','messages',
--       'community_posts','help_requests','help_replies','local_events','event_requests'] loop
--       if to_regclass('public.'||t) is not null then
--         execute format('drop policy if exists adults_only_insert on public.%I', t); end if;
--     end loop; end $$;
--   create policy "Insert community members" on public.community_members for insert with check (auth.uid() = user_id);
--   create policy "Usuários criam conversas" on public.conversations for insert with check (auth.uid() is not null);
--   create policy "Insert communities" on public.communities for insert with check (auth.uid() = created_by);
-- commit;
