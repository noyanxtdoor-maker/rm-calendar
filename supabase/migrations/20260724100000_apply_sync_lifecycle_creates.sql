-- RM Calendar: restricted lifecycle-create sync operations.
--
-- This adds only create-shaped lifecycle mutations. State transitions and the
-- compound follow-up operation remain intentionally unsupported until their
-- revision and multi-record acknowledgement contracts are exercised in tests.

create or replace function public.sync_insert_lifecycle_record(
  p_table text,
  p_record jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_table not in ('activities', 'tasks', 'notes') then
    raise exception 'Unsupported lifecycle sync table.' using errcode = '22023';
  end if;

  execute format(
    'insert into public.%1$I select (jsonb_populate_record(null::public.%1$I, $1)).*',
    p_table
  ) using p_record;
end;
$$;

create or replace function public.sync_insert_activity_history(
  p_workspace_id uuid,
  p_activity_id uuid,
  p_actor_user_id uuid,
  p_event_type text,
  p_new_state text,
  p_event_at timestamptz,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.activity_history (
    id, workspace_id, activity_id, event_type, new_state, event_at,
    actor_user_id, event_payload_json, created_by, updated_by,
    client_updated_at, revision
  ) values (
    gen_random_uuid(), p_workspace_id, p_activity_id, p_event_type, p_new_state, p_event_at,
    p_actor_user_id, coalesce(p_payload, '{}'::jsonb), p_actor_user_id, p_actor_user_id,
    p_event_at, 1
  );
$$;

create or replace function public.sync_insert_task_history(
  p_workspace_id uuid,
  p_task_id uuid,
  p_actor_user_id uuid,
  p_event_at timestamptz,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.task_history (
    id, workspace_id, task_id, event_type, new_state, event_at,
    actor_user_id, event_payload_json, created_by, updated_by,
    client_updated_at, revision
  ) values (
    gen_random_uuid(), p_workspace_id, p_task_id, 'created', 'open', p_event_at,
    p_actor_user_id, coalesce(p_payload, '{}'::jsonb), p_actor_user_id, p_actor_user_id,
    p_event_at, 1
  );
$$;

create or replace function public.sync_insert_primary_activity_contact(
  p_workspace_id uuid,
  p_activity_id uuid,
  p_actor_user_id uuid,
  p_link jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link jsonb := public.sync_camel_to_snake_json(p_link);
  v_link_id uuid;
  v_contact_id uuid;
  v_client_updated_at timestamptz;
begin
  if jsonb_typeof(p_link) <> 'object' then
    raise exception 'An activity contact must be an object.' using errcode = '22023';
  end if;

  v_link_id := (v_link ->> 'id')::uuid;
  v_contact_id := (v_link ->> 'contact_id')::uuid;
  v_client_updated_at := coalesce(nullif(v_link ->> 'client_updated_at', '')::timestamptz, timezone('utc', now()));

  if v_link_id is null
     or v_contact_id is null
     or v_link ->> 'workspace_id' is distinct from p_workspace_id::text
     or v_link ->> 'activity_id' is distinct from p_activity_id::text
     or coalesce((v_link ->> 'is_primary')::boolean, false) is not true then
    raise exception 'The primary activity contact does not match the operation.' using errcode = '22023';
  end if;

  insert into public.activity_contacts (
    id, workspace_id, activity_id, contact_id, is_primary,
    contact_display_name_snapshot, created_by, updated_by,
    client_updated_at, revision
  ) values (
    v_link_id, p_workspace_id, p_activity_id, v_contact_id, true,
    nullif(v_link ->> 'contact_display_name_snapshot', ''), p_actor_user_id, p_actor_user_id,
    v_client_updated_at, 1
  );
end;
$$;

create or replace function public.sync_apply_lifecycle_create_operation(
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
  v_operation_workspace_id uuid := (p_operation ->> 'workspaceId')::uuid;
  v_kind text := p_operation ->> 'kind';
  v_entity_type text := p_operation ->> 'entityType';
  v_entity_id uuid := (p_operation ->> 'entityId')::uuid;
  v_base_revision bigint := coalesce((p_operation ->> 'baseRevision')::bigint, 0);
  v_record jsonb := p_operation #> '{payload,record}';
  v_context jsonb := p_operation #> '{payload,context}';
  v_prepared_record jsonb;
  v_receipt_workspace_id uuid;
  v_receipt_result jsonb;
  v_table text;
  v_event_type text;
  v_event_at timestamptz;
begin
  if v_operation_workspace_id <> p_workspace_id then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'FORBIDDEN');
  end if;
  if jsonb_typeof(v_record) <> 'object' then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  select workspace_id, result_json into v_receipt_workspace_id, v_receipt_result
    from public.mutation_receipts where operation_id = v_operation_id;
  if found then
    if v_receipt_workspace_id <> p_workspace_id then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'FORBIDDEN');
    end if;
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'already_applied', 'serverRevision', (v_receipt_result ->> 'serverRevision')::bigint);
  end if;

  if v_base_revision <> 0 then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  case v_kind
    when 'create_activity', 'quick_capture_activity' then
      if v_entity_type <> 'activity' then raise exception 'Operation/entity mismatch.' using errcode = '22023'; end if;
      if v_kind = 'quick_capture_activity' and v_record ->> 'state' <> 'completed' then
        raise exception 'Quick capture must create a completed activity.' using errcode = '22023';
      end if;
      v_table := 'activities';
      v_prepared_record := public.sync_prepare_insert_record(v_record, v_entity_id, p_workspace_id, p_actor_user_id);
      perform public.sync_insert_lifecycle_record(v_table, v_prepared_record);
      if jsonb_typeof(v_context -> 'primaryContact') = 'object' then
        perform public.sync_insert_primary_activity_contact(p_workspace_id, v_entity_id, p_actor_user_id, v_context -> 'primaryContact');
      end if;
      v_event_type := case when v_kind = 'quick_capture_activity' then 'completed' when v_prepared_record ->> 'state' = 'draft' then 'saved_as_draft' else 'scheduled' end;
      v_event_at := coalesce((v_prepared_record ->> 'actual_completed_at')::timestamptz, (v_prepared_record ->> 'client_updated_at')::timestamptz, timezone('utc', now()));
      perform public.sync_insert_activity_history(p_workspace_id, v_entity_id, p_actor_user_id, v_event_type, v_prepared_record ->> 'state', v_event_at, jsonb_build_object('kind', v_kind));
    when 'create_task' then
      if v_entity_type <> 'task' then raise exception 'Operation/entity mismatch.' using errcode = '22023'; end if;
      v_table := 'tasks';
      v_prepared_record := public.sync_prepare_insert_record(v_record, v_entity_id, p_workspace_id, p_actor_user_id);
      if v_prepared_record ->> 'state' <> 'open' then raise exception 'A created task must be open.' using errcode = '22023'; end if;
      perform public.sync_insert_lifecycle_record(v_table, v_prepared_record);
      perform public.sync_insert_task_history(p_workspace_id, v_entity_id, p_actor_user_id, (v_prepared_record ->> 'client_updated_at')::timestamptz, jsonb_build_object('kind', v_kind));
    when 'create_note' then
      if v_entity_type <> 'note' then raise exception 'Operation/entity mismatch.' using errcode = '22023'; end if;
      v_table := 'notes';
      v_prepared_record := public.sync_prepare_insert_record(v_record, v_entity_id, p_workspace_id, p_actor_user_id);
      perform public.sync_insert_lifecycle_record(v_table, v_prepared_record);
    else
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end case;

  perform public.sync_append_change(p_workspace_id, v_entity_type, v_entity_id, 1, v_operation_id, null);
  perform public.sync_store_receipt(v_operation_id, p_workspace_id, v_kind, jsonb_build_array(v_entity_id), 1);
  return jsonb_build_object('operationId', v_operation_id, 'disposition', 'applied', 'serverRevision', 1);
exception
  when unique_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT', 'remoteRecord', public.canonical_record_for_change(p_workspace_id, v_entity_type, v_entity_id));
  when foreign_key_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'DEPENDENCY_MISSING');
  when check_violation or not_null_violation or invalid_text_representation or invalid_parameter_value then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
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
  if p_operation ->> 'kind' in ('create_contact', 'create_household', 'create_place') then
    return public.sync_apply_simple_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  return public.sync_apply_lifecycle_create_operation(p_workspace_id, p_actor_user_id, p_operation);
end;
$$;

create or replace function public.apply_sync_batch(
  p_workspace_id uuid,
  p_operations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_operation jsonb;
  v_results jsonb := '[]'::jsonb;
begin
  if v_actor_user_id is null or not public.is_active_workspace_owner(p_workspace_id) then
    raise exception 'The requested workspace is not available to this user.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_operations) <> 'array' or jsonb_array_length(p_operations) > 50 then
    raise exception 'A sync batch must contain between 0 and 50 operations.' using errcode = '22023';
  end if;
  for v_operation in select value from jsonb_array_elements(p_operations) loop
    v_results := v_results || jsonb_build_array(public.sync_apply_operation(p_workspace_id, v_actor_user_id, v_operation));
  end loop;
  return jsonb_build_object('results', v_results);
end;
$$;

revoke all on function public.sync_insert_lifecycle_record(text, jsonb) from public;
revoke all on function public.sync_insert_activity_history(uuid, uuid, uuid, text, text, timestamptz, jsonb) from public;
revoke all on function public.sync_insert_task_history(uuid, uuid, uuid, timestamptz, jsonb) from public;
revoke all on function public.sync_insert_primary_activity_contact(uuid, uuid, uuid, jsonb) from public;
revoke all on function public.sync_apply_lifecycle_create_operation(uuid, uuid, jsonb) from public;
revoke all on function public.sync_apply_operation(uuid, uuid, jsonb) from public;
revoke all on function public.apply_sync_batch(uuid, jsonb) from public;
grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated;
