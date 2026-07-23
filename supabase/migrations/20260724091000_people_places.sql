-- RM Calendar: people, households/groups, and places.
-- Browser table writes remain denied. A later reviewed RPC migration is the
-- only supported write path, so these constraints are defence in depth rather
-- than a substitute for authorization.

create table public.contacts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  display_name_normalized text not null check (char_length(btrim(display_name_normalized)) between 1 and 100),
  phone_json jsonb not null default '[]'::jsonb check (jsonb_typeof(phone_json) = 'array'),
  email_json jsonb not null default '[]'::jsonb check (jsonb_typeof(email_json) = 'array'),
  preferred_contact_method text check (preferred_contact_method in ('phone', 'message', 'email', 'in-person')),
  first_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0)
);

create index contacts_workspace_display_name_idx
  on public.contacts (workspace_id, display_name_normalized);
create index contacts_workspace_live_idx
  on public.contacts (workspace_id)
  where deleted_at is null;

create table public.organizations (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  name_normalized text not null check (char_length(btrim(name_normalized)) between 1 and 100),
  kind text not null check (kind in ('household', 'group', 'other')),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0)
);

create index organizations_workspace_kind_name_idx
  on public.organizations (workspace_id, kind, name_normalized);

create table public.places (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  name_normalized text not null check (char_length(btrim(name_normalized)) between 1 and 100),
  address_text text check (char_length(address_text) <= 280),
  entrance_notes text check (char_length(entrance_notes) <= 280),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  check (
    (latitude is null and longitude is null)
    or (
      latitude between -90 and 90
      and longitude between -180 and 180
    )
  )
);

create index places_workspace_name_idx
  on public.places (workspace_id, name_normalized);
create index places_workspace_live_idx
  on public.places (workspace_id)
  where deleted_at is null;

create table public.contact_organizations (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  relationship_label text check (char_length(relationship_label) <= 100),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  unique (contact_id, organization_id)
);

create index contact_organizations_workspace_contact_idx
  on public.contact_organizations (workspace_id, contact_id);
create index contact_organizations_workspace_organization_idx
  on public.contact_organizations (workspace_id, organization_id);

create table public.contact_places (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  place_id uuid not null references public.places (id) on delete restrict,
  relationship_label text check (char_length(relationship_label) <= 100),
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  unique (contact_id, place_id)
);

create index contact_places_workspace_contact_idx
  on public.contact_places (workspace_id, contact_id);
create index contact_places_workspace_place_idx
  on public.contact_places (workspace_id, place_id);
create unique index contact_places_one_live_default_per_contact_idx
  on public.contact_places (contact_id)
  where is_default and deleted_at is null;

create or replace function public.assert_contact_organization_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_contact_workspace_id uuid;
  v_organization_workspace_id uuid;
begin
  select workspace_id into v_contact_workspace_id from public.contacts where id = new.contact_id;
  select workspace_id into v_organization_workspace_id from public.organizations where id = new.organization_id;

  if v_contact_workspace_id is null
     or v_organization_workspace_id is null
     or new.workspace_id <> v_contact_workspace_id
     or new.workspace_id <> v_organization_workspace_id then
    raise exception 'Contact and organization links must stay inside one workspace.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger contact_organizations_require_same_workspace
before insert or update of workspace_id, contact_id, organization_id
on public.contact_organizations
for each row execute function public.assert_contact_organization_workspace();

create or replace function public.assert_contact_place_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_contact_workspace_id uuid;
  v_place_workspace_id uuid;
begin
  select workspace_id into v_contact_workspace_id from public.contacts where id = new.contact_id;
  select workspace_id into v_place_workspace_id from public.places where id = new.place_id;

  if v_contact_workspace_id is null
     or v_place_workspace_id is null
     or new.workspace_id <> v_contact_workspace_id
     or new.workspace_id <> v_place_workspace_id then
    raise exception 'Contact and place links must stay inside one workspace.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger contact_places_require_same_workspace
before insert or update of workspace_id, contact_id, place_id
on public.contact_places
for each row execute function public.assert_contact_place_workspace();

alter table public.contacts enable row level security;
alter table public.organizations enable row level security;
alter table public.places enable row level security;
alter table public.contact_organizations enable row level security;
alter table public.contact_places enable row level security;

create policy contacts_select_private_owner
on public.contacts
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy organizations_select_private_owner
on public.organizations
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy places_select_private_owner
on public.places
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy contact_organizations_select_private_owner
on public.contact_organizations
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy contact_places_select_private_owner
on public.contact_places
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

revoke all on table
  public.contacts,
  public.organizations,
  public.places,
  public.contact_organizations,
  public.contact_places
from anon, authenticated;

grant select on table
  public.contacts,
  public.organizations,
  public.places,
  public.contact_organizations,
  public.contact_places
to authenticated;

revoke all on function public.assert_contact_organization_workspace() from public;
revoke all on function public.assert_contact_place_workspace() from public;
