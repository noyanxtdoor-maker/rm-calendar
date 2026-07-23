-- RM Calendar: Milestone 4 remote foundation
--
-- This migration deliberately creates only the authenticated identity and
-- private-workspace boundary. Domain records are added in later migrations
-- after this boundary has been exercised on a clean local Supabase instance.
-- It contains no application credentials and no production data.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workspaces (
  id uuid primary key,
  owner_user_id uuid not null unique references auth.users (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  timezone text not null check (char_length(btrim(timezone)) between 1 and 100),
  terminology_json jsonb not null default '{}'::jsonb check (jsonb_typeof(terminology_json) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  client_updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0)
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  role text not null check (role = 'owner'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

-- A beta workspace is deliberately private: it has exactly one membership,
-- that membership has the owner role, and it names the workspace owner.
-- The deferred checks allow the bootstrap RPC to insert the root row and its
-- membership in one transaction without temporarily breaking the invariant.
create or replace function public.assert_private_workspace_ownership(p_workspace_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_membership_count integer;
begin
  if not exists (select 1 from public.workspaces where id = p_workspace_id) then
    return;
  end if;

  select count(*)
    into v_membership_count
    from public.workspace_memberships
   where workspace_id = p_workspace_id;

  if v_membership_count <> 1 then
    raise exception 'A private workspace must have exactly one owner membership.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
      from public.workspaces as workspace
      join public.workspace_memberships as membership
        on membership.workspace_id = workspace.id
     where workspace.id = p_workspace_id
       and (
         membership.user_id <> workspace.owner_user_id
         or membership.role <> 'owner'
       )
  ) then
    raise exception 'The private workspace membership must match its owner.'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.assert_private_membership_trigger()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.assert_private_workspace_ownership(old.workspace_id);
  else
    perform public.assert_private_workspace_ownership(new.workspace_id);
  end if;
  return null;
end;
$$;

create or replace function public.assert_private_workspace_trigger()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.assert_private_workspace_ownership(old.id);
  else
    perform public.assert_private_workspace_ownership(new.id);
  end if;
  return null;
end;
$$;

create constraint trigger workspace_memberships_match_private_owner
after insert or update or delete on public.workspace_memberships
deferrable initially deferred
for each row execute function public.assert_private_membership_trigger();

create constraint trigger workspaces_have_private_owner_membership
after insert or update of owner_user_id or delete on public.workspaces
deferrable initially deferred
for each row execute function public.assert_private_workspace_trigger();

-- This helper is used by row-level policies in later migrations. It is kept
-- intentionally narrow: the caller only learns whether *they* own the given
-- workspace, and it is safe from search-path hijacking.
create or replace function public.is_active_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.workspaces as workspace
      join public.workspace_memberships as membership
        on membership.workspace_id = workspace.id
     where workspace.id = p_workspace_id
       and workspace.deleted_at is null
       and workspace.owner_user_id = auth.uid()
       and membership.user_id = auth.uid()
       and membership.role = 'owner'
  );
$$;

-- Account bootstrap is the one narrowly scoped SECURITY DEFINER entry point.
-- It never accepts an owner ID, so the authenticated caller can only create or
-- recover their own single private workspace.
create or replace function public.bootstrap_private_workspace(
  p_workspace_name text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_workspace_name text := btrim(coalesce(p_workspace_name, ''));
  v_timezone text := btrim(coalesce(p_timezone, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication is required before creating a workspace.'
      using errcode = '28000';
  end if;

  if char_length(v_workspace_name) not between 1 and 100 then
    raise exception 'Workspace name must be between 1 and 100 characters.'
      using errcode = '22023';
  end if;

  if not exists (select 1 from pg_timezone_names where name = v_timezone) then
    raise exception 'A valid IANA timezone is required.'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do update
    set updated_at = timezone('utc', now());

  select id
    into v_workspace_id
    from public.workspaces
   where owner_user_id = v_user_id;

  if v_workspace_id is null then
    begin
      insert into public.workspaces (
        id,
        owner_user_id,
        name,
        timezone,
        terminology_json,
        client_updated_at
      )
      values (
        gen_random_uuid(),
        v_user_id,
        v_workspace_name,
        v_timezone,
        '{}'::jsonb,
        timezone('utc', now())
      )
      returning id into v_workspace_id;
    exception
      when unique_violation then
        select id
          into v_workspace_id
          from public.workspaces
         where owner_user_id = v_user_id;
    end;
  end if;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner')
  on conflict (workspace_id) do update
    set user_id = excluded.user_id,
        role = excluded.role;

  return v_workspace_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy workspaces_select_private_owner
on public.workspaces
for select
to authenticated
using (public.is_active_workspace_owner(id));

create policy workspace_memberships_select_private_owner
on public.workspace_memberships
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

-- Browser clients may read their own identity/root data, but they cannot
-- insert, change, or delete workspace membership data through table APIs.
revoke all on table public.profiles, public.workspaces, public.workspace_memberships from anon, authenticated;
grant select, update (display_name) on table public.profiles to authenticated;
grant select on table public.workspaces, public.workspace_memberships to authenticated;

revoke all on function public.is_active_workspace_owner(uuid) from public;
grant execute on function public.is_active_workspace_owner(uuid) to authenticated;

revoke all on function public.bootstrap_private_workspace(text, text) from public;
grant execute on function public.bootstrap_private_workspace(text, text) to authenticated;
