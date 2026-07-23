-- RM Calendar: activities, tasks, notes, reminders, and immutable history.

create table public.activities (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 140),
  activity_type text not null check (activity_type in ('visit', 'planning', 'service', 'personal', 'other')),
  state text not null check (state in ('draft', 'scheduled', 'completed', 'cancelled')),
  scheduled_date date,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  schedule_timezone text,
  actual_completed_at timestamptz,
  objective_text text check (char_length(objective_text) <= 5000),
  outcome_text text check (char_length(outcome_text) <= 5000),
  primary_place_id uuid references public.places (id) on delete restrict,
  cancel_reason text check (char_length(cancel_reason) <= 5000),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  check (
    (scheduled_date is null and scheduled_start_at is null and scheduled_end_at is null and schedule_timezone is null)
    or (
      scheduled_date is not null
      and scheduled_start_at is null
      and scheduled_end_at is null
      and schedule_timezone is not null
    )
    or (
      scheduled_date is null
      and scheduled_start_at is not null
      and scheduled_end_at is not null
      and scheduled_end_at > scheduled_start_at
      and schedule_timezone is not null
    )
  ),
  check (
    (state = 'draft'
      and actual_completed_at is null
      and scheduled_date is null
      and scheduled_start_at is null
      and scheduled_end_at is null
      and schedule_timezone is null)
    or
    (state = 'scheduled'
      and actual_completed_at is null
      and schedule_timezone is not null
      and (scheduled_date is not null or scheduled_start_at is not null))
    or
    (state = 'completed' and actual_completed_at is not null)
    or
    (state = 'cancelled' and actual_completed_at is null)
  )
);

create index activities_workspace_start_idx
  on public.activities (workspace_id, scheduled_start_at);
create index activities_workspace_date_idx
  on public.activities (workspace_id, scheduled_date);
create index activities_workspace_state_idx
  on public.activities (workspace_id, state);
create index activities_workspace_completed_idx
  on public.activities (workspace_id, actual_completed_at);

create table public.activity_contacts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  is_primary boolean not null default false,
  contact_display_name_snapshot text check (char_length(contact_display_name_snapshot) <= 100),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  unique (activity_id, contact_id)
);

create index activity_contacts_workspace_activity_idx
  on public.activity_contacts (workspace_id, activity_id);
create index activity_contacts_workspace_contact_idx
  on public.activity_contacts (workspace_id, contact_id);
create unique index activity_contacts_one_live_primary_idx
  on public.activity_contacts (activity_id)
  where is_primary and deleted_at is null;

create table public.activity_history (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  event_type text not null check (
    event_type in ('created', 'scheduled', 'rescheduled', 'saved_as_draft', 'updated', 'completed', 'reopened', 'follow_up_created')
  ),
  previous_state text check (previous_state in ('draft', 'scheduled', 'completed', 'cancelled')),
  new_state text not null check (new_state in ('draft', 'scheduled', 'completed', 'cancelled')),
  event_at timestamptz not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  event_payload_json jsonb not null default '{}'::jsonb check (jsonb_typeof(event_payload_json) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0)
);

create index activity_history_workspace_activity_event_idx
  on public.activity_history (workspace_id, activity_id, event_at);

create table public.tasks (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 140),
  state text not null check (state in ('open', 'completed', 'cancelled')),
  due_date date,
  due_at timestamptz,
  priority text not null check (priority in ('low', 'normal', 'high')),
  completed_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 5000),
  contact_id uuid references public.contacts (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  place_id uuid references public.places (id) on delete restrict,
  activity_id uuid references public.activities (id) on delete restrict,
  parent_task_id uuid references public.tasks (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  check (
    (state = 'completed' and completed_at is not null)
    or (state in ('open', 'cancelled') and completed_at is null)
  )
);

create index tasks_workspace_state_due_date_idx
  on public.tasks (workspace_id, state, due_date);
create index tasks_workspace_due_at_idx
  on public.tasks (workspace_id, due_at);

create table public.task_history (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete restrict,
  event_type text not null check (event_type in ('created', 'completed', 'cancelled', 'reopened')),
  previous_state text check (previous_state in ('open', 'completed', 'cancelled')),
  new_state text not null check (new_state in ('open', 'completed', 'cancelled')),
  event_at timestamptz not null,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  event_payload_json jsonb not null default '{}'::jsonb check (jsonb_typeof(event_payload_json) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0)
);

create index task_history_workspace_task_event_idx
  on public.task_history (workspace_id, task_id, event_at);

create table public.notes (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  is_pinned boolean not null default false,
  contact_id uuid references public.contacts (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  place_id uuid references public.places (id) on delete restrict,
  activity_id uuid references public.activities (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  check (num_nonnulls(contact_id, organization_id, place_id, activity_id, task_id) = 1)
);

create index notes_workspace_contact_idx on public.notes (workspace_id, contact_id);
create index notes_workspace_organization_idx on public.notes (workspace_id, organization_id);
create index notes_workspace_place_idx on public.notes (workspace_id, place_id);
create index notes_workspace_activity_idx on public.notes (workspace_id, activity_id);
create index notes_workspace_task_idx on public.notes (workspace_id, task_id);
create index notes_workspace_created_idx on public.notes (workspace_id, created_at);
create index notes_workspace_pinned_idx on public.notes (workspace_id, is_pinned);

create table public.reminders (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete restrict,
  remind_at timestamptz not null,
  delivery_preference text not null default 'in_app' check (delivery_preference in ('in_app', 'notification')),
  dismissed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  check (num_nonnulls(activity_id, task_id) = 1)
);

create index reminders_workspace_remind_idx on public.reminders (workspace_id, remind_at);
create index reminders_workspace_dismissed_idx on public.reminders (workspace_id, dismissed_at);

create or replace function public.assert_activity_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_place_workspace_id uuid;
begin
  if new.primary_place_id is null then
    return new;
  end if;

  select workspace_id into v_place_workspace_id from public.places where id = new.primary_place_id;
  if v_place_workspace_id is null or v_place_workspace_id <> new.workspace_id then
    raise exception 'An activity place must belong to the same workspace.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger activities_require_same_workspace_place
before insert or update of workspace_id, primary_place_id
on public.activities
for each row execute function public.assert_activity_workspace();

create or replace function public.assert_activity_contact_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_activity_workspace_id uuid;
  v_contact_workspace_id uuid;
begin
  select workspace_id into v_activity_workspace_id from public.activities where id = new.activity_id;
  select workspace_id into v_contact_workspace_id from public.contacts where id = new.contact_id;

  if v_activity_workspace_id is null
     or v_contact_workspace_id is null
     or new.workspace_id <> v_activity_workspace_id
     or new.workspace_id <> v_contact_workspace_id then
    raise exception 'Activity contacts must stay inside one workspace.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger activity_contacts_require_same_workspace
before insert or update of workspace_id, activity_id, contact_id
on public.activity_contacts
for each row execute function public.assert_activity_contact_workspace();

create or replace function public.assert_task_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_related_workspace_id uuid;
begin
  foreach v_related_workspace_id in array array[
    (select workspace_id from public.contacts where id = new.contact_id),
    (select workspace_id from public.organizations where id = new.organization_id),
    (select workspace_id from public.places where id = new.place_id),
    (select workspace_id from public.activities where id = new.activity_id),
    (select workspace_id from public.tasks where id = new.parent_task_id)
  ] loop
    if v_related_workspace_id is not null and v_related_workspace_id <> new.workspace_id then
      raise exception 'Task relationships must stay inside one workspace.'
        using errcode = '23514';
    end if;
  end loop;

  if (new.contact_id is not null and not exists (select 1 from public.contacts where id = new.contact_id))
     or (new.organization_id is not null and not exists (select 1 from public.organizations where id = new.organization_id))
     or (new.place_id is not null and not exists (select 1 from public.places where id = new.place_id))
     or (new.activity_id is not null and not exists (select 1 from public.activities where id = new.activity_id))
     or (new.parent_task_id is not null and not exists (select 1 from public.tasks where id = new.parent_task_id)) then
    raise exception 'A task relationship is unavailable.' using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger tasks_require_same_workspace_relationships
before insert or update of workspace_id, contact_id, organization_id, place_id, activity_id, parent_task_id
on public.tasks
for each row execute function public.assert_task_workspace();

create or replace function public.assert_note_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent_workspace_id uuid;
begin
  v_parent_workspace_id := case
    when new.contact_id is not null then (select workspace_id from public.contacts where id = new.contact_id)
    when new.organization_id is not null then (select workspace_id from public.organizations where id = new.organization_id)
    when new.place_id is not null then (select workspace_id from public.places where id = new.place_id)
    when new.activity_id is not null then (select workspace_id from public.activities where id = new.activity_id)
    when new.task_id is not null then (select workspace_id from public.tasks where id = new.task_id)
  end;

  if v_parent_workspace_id is null or v_parent_workspace_id <> new.workspace_id then
    raise exception 'A note parent must belong to the same workspace.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger notes_require_same_workspace_parent
before insert or update of workspace_id, contact_id, organization_id, place_id, activity_id, task_id
on public.notes
for each row execute function public.assert_note_workspace();

create or replace function public.assert_reminder_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent_workspace_id uuid;
begin
  v_parent_workspace_id := case
    when new.activity_id is not null then (select workspace_id from public.activities where id = new.activity_id)
    when new.task_id is not null then (select workspace_id from public.tasks where id = new.task_id)
  end;

  if v_parent_workspace_id is null or v_parent_workspace_id <> new.workspace_id then
    raise exception 'A reminder parent must belong to the same workspace.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger reminders_require_same_workspace_parent
before insert or update of workspace_id, activity_id, task_id
on public.reminders
for each row execute function public.assert_reminder_workspace();

create or replace function public.prevent_history_rewrite()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Lifecycle history is append-only.' using errcode = '55000';
end;
$$;

create trigger activity_history_is_append_only
before update or delete on public.activity_history
for each row execute function public.prevent_history_rewrite();

create trigger task_history_is_append_only
before update or delete on public.task_history
for each row execute function public.prevent_history_rewrite();

alter table public.activities enable row level security;
alter table public.activity_contacts enable row level security;
alter table public.activity_history enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.notes enable row level security;
alter table public.reminders enable row level security;

create policy activities_select_private_owner
on public.activities
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy activity_contacts_select_private_owner
on public.activity_contacts
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy activity_history_select_private_owner
on public.activity_history
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy tasks_select_private_owner
on public.tasks
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy task_history_select_private_owner
on public.task_history
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy notes_select_private_owner
on public.notes
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

create policy reminders_select_private_owner
on public.reminders
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

revoke all on table
  public.activities,
  public.activity_contacts,
  public.activity_history,
  public.tasks,
  public.task_history,
  public.notes,
  public.reminders
from anon, authenticated;

grant select on table
  public.activities,
  public.activity_contacts,
  public.activity_history,
  public.tasks,
  public.task_history,
  public.notes,
  public.reminders
to authenticated;

revoke all on function public.assert_activity_workspace() from public;
revoke all on function public.assert_activity_contact_workspace() from public;
revoke all on function public.assert_task_workspace() from public;
revoke all on function public.assert_note_workspace() from public;
revoke all on function public.assert_reminder_workspace() from public;
revoke all on function public.prevent_history_rewrite() from public;
