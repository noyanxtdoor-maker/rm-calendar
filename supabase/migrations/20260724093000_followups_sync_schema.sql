-- RM Calendar: compound follow-ups plus the durable remote sync journal.
-- RPCs that write these tables are intentionally added only after the local
-- Supabase test stack is available. The schema already refuses cross-workspace
-- links and leaves the browser without direct write permissions.

create table public.follow_ups (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_activity_id uuid not null references public.activities (id) on delete restrict,
  target_kind text not null check (target_kind in ('task', 'activity')),
  target_task_id uuid references public.tasks (id) on delete restrict,
  target_activity_id uuid references public.activities (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references auth.users (id) on delete restrict,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  check (
    (target_kind = 'task' and target_task_id is not null and target_activity_id is null)
    or
    (target_kind = 'activity' and target_activity_id is not null and target_task_id is null)
  )
);

create index follow_ups_workspace_source_idx
  on public.follow_ups (workspace_id, source_activity_id);
create index follow_ups_workspace_target_task_idx
  on public.follow_ups (workspace_id, target_task_id);
create index follow_ups_workspace_target_activity_idx
  on public.follow_ups (workspace_id, target_activity_id);

create or replace function public.assert_follow_up_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_source_workspace_id uuid;
  v_source_state text;
  v_target_workspace_id uuid;
begin
  select workspace_id, state
    into v_source_workspace_id, v_source_state
    from public.activities
   where id = new.source_activity_id;

  if new.target_kind = 'task' then
    select workspace_id into v_target_workspace_id from public.tasks where id = new.target_task_id;
  else
    select workspace_id into v_target_workspace_id from public.activities where id = new.target_activity_id;
  end if;

  if v_source_workspace_id is null
     or v_target_workspace_id is null
     or v_source_workspace_id <> new.workspace_id
     or v_target_workspace_id <> new.workspace_id then
    raise exception 'Follow-up source and target must stay inside one workspace.'
      using errcode = '23514';
  end if;

  if v_source_state <> 'completed' then
    raise exception 'A follow-up source activity must be completed.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger follow_ups_require_same_workspace_completed_source
before insert or update of workspace_id, source_activity_id, target_kind, target_task_id, target_activity_id
on public.follow_ups
for each row execute function public.assert_follow_up_workspace();

create table public.change_log (
  cursor bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null check (entity_type in ('contact', 'organization', 'place', 'activity', 'task', 'note', 'follow_up')),
  entity_id uuid not null,
  revision bigint not null check (revision > 0),
  operation_id uuid not null,
  deleted_at timestamptz,
  changed_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, operation_id, entity_type, entity_id)
);

create index change_log_workspace_cursor_idx
  on public.change_log (workspace_id, cursor);

create table public.mutation_receipts (
  operation_id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  operation_kind text not null check (
    operation_kind in (
      'create_contact',
      'create_household',
      'create_place',
      'create_activity',
      'update_activity',
      'complete_activity',
      'reopen_activity',
      'quick_capture_activity',
      'create_task',
      'complete_task',
      'create_note',
      'create_follow_up'
    )
  ),
  entity_ids_json jsonb not null check (jsonb_typeof(entity_ids_json) = 'array'),
  result_code text not null check (result_code in ('applied')),
  result_json jsonb not null check (jsonb_typeof(result_json) = 'object'),
  applied_at timestamptz not null default timezone('utc', now())
);

create index mutation_receipts_workspace_applied_idx
  on public.mutation_receipts (workspace_id, applied_at);

create or replace function public.prevent_sync_journal_rewrite()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Sync journals are append-only.' using errcode = '55000';
end;
$$;

create trigger change_log_is_append_only
before update or delete on public.change_log
for each row execute function public.prevent_sync_journal_rewrite();

create trigger mutation_receipts_are_append_only
before update or delete on public.mutation_receipts
for each row execute function public.prevent_sync_journal_rewrite();

alter table public.follow_ups enable row level security;
alter table public.change_log enable row level security;
alter table public.mutation_receipts enable row level security;

create policy follow_ups_select_private_owner
on public.follow_ups
for select
to authenticated
using (public.is_active_workspace_owner(workspace_id));

-- Change journal and receipt reads go through pull_changes/apply_sync_batch;
-- they are intentionally not exposed as browser-readable tables.
revoke all on table public.follow_ups, public.change_log, public.mutation_receipts from anon, authenticated;
grant select on table public.follow_ups to authenticated;

revoke all on function public.assert_follow_up_workspace() from public;
revoke all on function public.prevent_sync_journal_rewrite() from public;
