-- RM Calendar: private focus groups with atomic initial membership.
-- A group is a user-owned organization record. Its initial person links travel
-- in the same idempotent operation so a second device sees the same planning set.

alter table public.mutation_receipts
  drop constraint if exists mutation_receipts_operation_kind_check;

alter table public.mutation_receipts
  add constraint mutation_receipts_operation_kind_check check (
    operation_kind in (
      'create_contact', 'create_household', 'create_focus_group', 'create_place',
      'create_activity', 'update_activity', 'complete_activity', 'reopen_activity',
      'quick_capture_activity', 'create_task', 'complete_task', 'create_note', 'create_follow_up'
    )
  );

create or replace function public.sync_apply_focus_group_operation(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_operation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_operation_id uuid := (p_operation ->> 'operationId')::uuid;
  v_entity_id uuid := (p_operation ->> 'entityId')::uuid;
  v_base_revision bigint := coalesce((p_operation ->> 'baseRevision')::bigint, 0);
  v_record jsonb := p_operation #> '{payload,record}';
  v_member_links jsonb := coalesce(p_operation #> '{payload,context,memberLinks}', '[]'::jsonb);
  v_link jsonb;
  v_link_id uuid;
  v_prepared_group jsonb;
  v_prepared_link jsonb;
  v_receipt_workspace_id uuid;
  v_receipt_result jsonb;
begin
  if (p_operation ->> 'workspaceId')::uuid <> p_workspace_id
     or p_operation ->> 'kind' <> 'create_focus_group'
     or p_operation ->> 'entityType' <> 'organization'
     or jsonb_typeof(v_record) <> 'object'
     or jsonb_typeof(v_member_links) <> 'array'
     or v_base_revision <> 0 then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  select workspace_id, result_json into v_receipt_workspace_id, v_receipt_result
    from public.mutation_receipts where operation_id = v_operation_id;
  if found then
    if v_receipt_workspace_id <> p_workspace_id then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'FORBIDDEN');
    end if;
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'already_applied', 'serverRevision', (v_receipt_result ->> 'serverRevision')::bigint);
  end if;

  if v_record ->> 'kind' <> 'group' then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  v_prepared_group := public.sync_prepare_insert_record(v_record, v_entity_id, p_workspace_id, p_actor_user_id);
  perform public.sync_insert_simple_record('organizations', v_prepared_group);

  for v_link in select value from jsonb_array_elements(v_member_links) loop
    v_link_id := (v_link ->> 'id')::uuid;
    if v_link_id is null
       or v_link ->> 'workspaceId' <> p_workspace_id::text
       or v_link ->> 'organizationId' <> v_entity_id::text
       or nullif(v_link ->> 'contactId', '') is null then
      raise exception 'A focus group member link is invalid.' using errcode = '22023';
    end if;
    v_prepared_link := public.sync_prepare_insert_record(v_link, v_link_id, p_workspace_id, p_actor_user_id);
    insert into public.contact_organizations
      select (jsonb_populate_record(null::public.contact_organizations, v_prepared_link)).*;
  end loop;

  perform public.sync_append_change(p_workspace_id, 'organization', v_entity_id, 1, v_operation_id, null);
  perform public.sync_store_receipt(v_operation_id, p_workspace_id, 'create_focus_group', jsonb_build_array(v_entity_id), 1);
  return jsonb_build_object('operationId', v_operation_id, 'disposition', 'applied', 'serverRevision', 1);
exception
  when unique_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT');
  when foreign_key_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'DEPENDENCY_MISSING');
  when check_violation or not_null_violation or invalid_text_representation or invalid_parameter_value then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
end;
$$;

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
    when 'organization' then
      select jsonb_build_object('memberLinks', coalesce((
        select jsonb_agg(to_jsonb(link) order by link.created_at asc)
        from public.contact_organizations as link
        where link.workspace_id = p_workspace_id and link.organization_id = p_entity_id and link.deleted_at is null
      ), '[]'::jsonb)) into v_context;
    when 'activity' then
      select jsonb_build_object(
        'primaryContact', (select to_jsonb(link) from public.activity_contacts as link where link.workspace_id = p_workspace_id and link.activity_id = p_entity_id and link.is_primary and link.deleted_at is null limit 1),
        'history', coalesce((select jsonb_agg(to_jsonb(history) order by history.event_at asc, history.created_at asc) from public.activity_history as history where history.workspace_id = p_workspace_id and history.activity_id = p_entity_id and history.deleted_at is null), '[]'::jsonb)
      ) into v_context;
    when 'task' then
      select jsonb_build_object('history', coalesce((select jsonb_agg(to_jsonb(history) order by history.event_at asc, history.created_at asc) from public.task_history as history where history.workspace_id = p_workspace_id and history.task_id = p_entity_id and history.deleted_at is null), '[]'::jsonb)) into v_context;
    else v_context := null;
  end case;
  return v_context;
end;
$$;

create or replace function public.sync_apply_operation(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_operation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_operation ->> 'kind' = 'create_focus_group' then
    return public.sync_apply_focus_group_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  if p_operation ->> 'kind' in ('create_contact', 'create_household', 'create_place') then
    return public.sync_apply_simple_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  if p_operation ->> 'kind' in ('update_activity', 'complete_activity', 'reopen_activity', 'complete_task') then
    return public.sync_apply_lifecycle_transition_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  if p_operation ->> 'kind' = 'create_follow_up' then
    return public.sync_apply_follow_up_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  return public.sync_apply_lifecycle_create_operation(p_workspace_id, p_actor_user_id, p_operation);
end;
$$;

revoke all on function public.sync_apply_focus_group_operation(uuid, uuid, jsonb) from public;
revoke all on function public.sync_pull_related_context(uuid, text, uuid) from public;
revoke all on function public.sync_apply_operation(uuid, uuid, jsonb) from public;
grant execute on function public.pull_changes(uuid, bigint, integer) to authenticated;
grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated;
