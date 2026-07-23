-- RM Calendar: owner-scoped pull RPC.
-- It exposes canonical records only to the authenticated private owner and
-- never exposes the raw journal or mutation receipts as browser tables.

create or replace function public.canonical_record_for_change(
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
  v_record jsonb;
begin
  case p_entity_type
    when 'contact' then
      select to_jsonb(contact) into v_record
        from public.contacts as contact
       where contact.id = p_entity_id and contact.workspace_id = p_workspace_id;
    when 'organization' then
      select to_jsonb(organization) into v_record
        from public.organizations as organization
       where organization.id = p_entity_id and organization.workspace_id = p_workspace_id;
    when 'place' then
      select to_jsonb(place) into v_record
        from public.places as place
       where place.id = p_entity_id and place.workspace_id = p_workspace_id;
    when 'activity' then
      select to_jsonb(activity) into v_record
        from public.activities as activity
       where activity.id = p_entity_id and activity.workspace_id = p_workspace_id;
    when 'task' then
      select to_jsonb(task) into v_record
        from public.tasks as task
       where task.id = p_entity_id and task.workspace_id = p_workspace_id;
    when 'note' then
      select to_jsonb(note) into v_record
        from public.notes as note
       where note.id = p_entity_id and note.workspace_id = p_workspace_id;
    when 'follow_up' then
      select to_jsonb(follow_up) into v_record
        from public.follow_ups as follow_up
       where follow_up.id = p_entity_id and follow_up.workspace_id = p_workspace_id;
    else
      raise exception 'Unsupported sync entity type: %', p_entity_type using errcode = '22023';
  end case;

  if v_record is null then
    raise exception 'The sync journal references a missing canonical % record.', p_entity_type
      using errcode = '23503';
  end if;

  return v_record;
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
      public.canonical_record_for_change(entry.workspace_id, entry.entity_type, entry.entity_id) as record
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
          'record', record
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

revoke all on function public.canonical_record_for_change(uuid, text, uuid) from public;
revoke all on function public.pull_changes(uuid, bigint, integer) from public;
grant execute on function public.pull_changes(uuid, bigint, integer) to authenticated;
