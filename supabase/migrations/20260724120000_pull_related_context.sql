-- RM Calendar: preserve the context needed to render a pulled Activity/Task
-- on a second signed-in device. This remains owner-scoped through pull_changes;
-- it is not a direct browser table grant.

create or replace function public.sync_pull_related_context(
  p_workspace_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_context jsonb;
begin
  case p_entity_type
    when 'activity' then
      select jsonb_build_object(
        'primaryContact', (
          select to_jsonb(link)
          from public.activity_contacts as link
          where link.workspace_id = p_workspace_id
            and link.activity_id = p_entity_id
            and link.is_primary
            and link.deleted_at is null
          limit 1
        ),
        'history', coalesce((
          select jsonb_agg(to_jsonb(history) order by history.event_at asc, history.created_at asc)
          from public.activity_history as history
          where history.workspace_id = p_workspace_id
            and history.activity_id = p_entity_id
            and history.deleted_at is null
        ), '[]'::jsonb)
      ) into v_context;
    when 'task' then
      select jsonb_build_object(
        'history', coalesce((
          select jsonb_agg(to_jsonb(history) order by history.event_at asc, history.created_at asc)
          from public.task_history as history
          where history.workspace_id = p_workspace_id
            and history.task_id = p_entity_id
            and history.deleted_at is null
        ), '[]'::jsonb)
      ) into v_context;
    else
      v_context := null;
  end case;

  return v_context;
end;
$$;

create or replace function public.pull_changes(
  p_workspace_id uuid,
  p_after_cursor bigint default 0,
  p_page_size integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := least(greatest(coalesce(p_page_size, 100), 1), 100);
  v_after_cursor bigint := greatest(coalesce(p_after_cursor, 0), 0);
  v_changes jsonb;
  v_next_cursor bigint;
  v_has_more boolean;
begin
  if not public.is_active_workspace_owner(p_workspace_id) then
    raise exception 'The requested workspace is not available to this user.'
      using errcode = '42501';
  end if;

  with selected as (
    select
      entry.cursor,
      entry.entity_type,
      entry.entity_id,
      entry.revision,
      entry.changed_at,
      public.canonical_record_for_change(entry.workspace_id, entry.entity_type, entry.entity_id) as record,
      public.sync_pull_related_context(entry.workspace_id, entry.entity_type, entry.entity_id) as context
    from public.change_log as entry
    where entry.workspace_id = p_workspace_id
      and entry.cursor > v_after_cursor
    order by entry.cursor asc
    limit v_limit + 1
  ),
  page as (
    select *
    from selected
    order by cursor asc
    limit v_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'changeId', cursor::text,
          'entityType', entity_type,
          'entityId', entity_id,
          'revision', revision,
          'changedAt', changed_at,
          'record', record,
          'context', context
        )
        order by cursor
      ),
      '[]'::jsonb
    ),
    coalesce(max(cursor), v_after_cursor),
    (select count(*) > v_limit from selected)
  into v_changes, v_next_cursor, v_has_more
  from page;

  return jsonb_build_object(
    'changes', v_changes,
    'nextCursor', v_next_cursor::text,
    'hasMore', coalesce(v_has_more, false)
  );
end;
$$;

revoke all on function public.sync_pull_related_context(uuid, text, uuid) from public;
revoke all on function public.pull_changes(uuid, bigint, integer) from public;
grant execute on function public.pull_changes(uuid, bigint, integer) to authenticated;
