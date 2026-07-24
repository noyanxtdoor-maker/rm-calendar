-- RM Calendar: revision-checked lifecycle transitions.
--
-- Completion/reopen commands intentionally update only their transition fields.
-- They cannot become a backdoor for stale title, schedule, or relationship edits.

create or replace function public.sync_prepare_update_record(
  p_record jsonb,
  p_entity_id uuid,
  p_workspace_id uuid
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_record jsonb := public.sync_camel_to_snake_json(p_record);
begin
  if jsonb_typeof(p_record) <> 'object'
     or v_record ->> 'id' is distinct from p_entity_id::text
     or v_record ->> 'workspace_id' is distinct from p_workspace_id::text then
    raise exception 'The operation record does not match its entity and workspace.' using errcode = '22023';
  end if;

  return v_record - array[
    'id', 'workspace_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
    'client_updated_at', 'deleted_at', 'revision', 'sync_state',
    'pending_base_revision', 'last_local_mutation_id'
  ];
end;
$$;

create or replace function public.sync_replace_primary_activity_contact(
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
begin
  -- The local command owns one primary Contact. Links are mutable relationship
  -- state (unlike history), so replacement is safe inside this single RPC tx.
  delete from public.activity_contacts
   where workspace_id = p_workspace_id and activity_id = p_activity_id;

  if jsonb_typeof(p_link) = 'object' then
    perform public.sync_insert_primary_activity_contact(
      p_workspace_id, p_activity_id, p_actor_user_id, p_link
    );
  end if;
end;
$$;

create or replace function public.sync_insert_activity_transition_history(
  p_workspace_id uuid,
  p_activity_id uuid,
  p_actor_user_id uuid,
  p_event_type text,
  p_previous_state text,
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
    id, workspace_id, activity_id, event_type, previous_state, new_state, event_at,
    actor_user_id, event_payload_json, created_by, updated_by, client_updated_at, revision
  ) values (
    gen_random_uuid(), p_workspace_id, p_activity_id, p_event_type, p_previous_state, p_new_state, p_event_at,
    p_actor_user_id, coalesce(p_payload, '{}'::jsonb), p_actor_user_id, p_actor_user_id, p_event_at, 1
  );
$$;

create or replace function public.sync_insert_task_transition_history(
  p_workspace_id uuid,
  p_task_id uuid,
  p_actor_user_id uuid,
  p_previous_state text,
  p_new_state text,
  p_event_at timestamptz,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.task_history (
    id, workspace_id, task_id, event_type, previous_state, new_state, event_at,
    actor_user_id, event_payload_json, created_by, updated_by, client_updated_at, revision
  ) values (
    gen_random_uuid(), p_workspace_id, p_task_id, 'completed', p_previous_state, p_new_state, p_event_at,
    p_actor_user_id, coalesce(p_payload, '{}'::jsonb), p_actor_user_id, p_actor_user_id, p_event_at, 1
  );
$$;

create or replace function public.sync_apply_lifecycle_transition_operation(
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
  v_base_revision bigint := (p_operation ->> 'baseRevision')::bigint;
  v_record jsonb := p_operation #> '{payload,record}';
  v_context jsonb := p_operation #> '{payload,context}';
  v_patch jsonb;
  v_receipt_workspace_id uuid;
  v_receipt_result jsonb;
  v_activity public.activities%rowtype;
  v_task public.tasks%rowtype;
  v_updated_activity public.activities%rowtype;
  v_updated_task public.tasks%rowtype;
  v_event_type text;
  v_event_at timestamptz;
begin
  if v_operation_workspace_id <> p_workspace_id then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'FORBIDDEN');
  end if;
  if jsonb_typeof(v_record) <> 'object' or v_base_revision is null or v_base_revision < 1 then
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

  v_patch := public.sync_prepare_update_record(v_record, v_entity_id, p_workspace_id);

  if v_kind in ('update_activity', 'complete_activity', 'reopen_activity') then
    if v_entity_type <> 'activity' then raise exception 'Operation/entity mismatch.' using errcode = '22023'; end if;
    select * into v_activity from public.activities
     where id = v_entity_id and workspace_id = p_workspace_id and deleted_at is null;
    if not found or v_activity.revision <> v_base_revision then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT',
        'remoteRecord', case when found then public.canonical_record_for_change(p_workspace_id, 'activity', v_entity_id) else null end);
    end if;

    if v_kind = 'update_activity' then
      if v_activity.state not in ('draft', 'scheduled')
         or coalesce(v_patch ->> 'state', '') not in ('draft', 'scheduled') then
        return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
      end if;
      update public.activities set
        title = coalesce(nullif(v_patch ->> 'title', ''), v_activity.title),
        activity_type = coalesce(v_patch ->> 'activity_type', v_activity.activity_type),
        state = coalesce(v_patch ->> 'state', v_activity.state),
        scheduled_date = case when v_patch ? 'scheduled_date' then (v_patch ->> 'scheduled_date')::date else v_activity.scheduled_date end,
        scheduled_start_at = case when v_patch ? 'scheduled_start_at' then (v_patch ->> 'scheduled_start_at')::timestamptz else v_activity.scheduled_start_at end,
        scheduled_end_at = case when v_patch ? 'scheduled_end_at' then (v_patch ->> 'scheduled_end_at')::timestamptz else v_activity.scheduled_end_at end,
        schedule_timezone = case when v_patch ? 'schedule_timezone' then nullif(v_patch ->> 'schedule_timezone', '') else v_activity.schedule_timezone end,
        objective_text = case when v_patch ? 'objective_text' then nullif(v_patch ->> 'objective_text', '') else v_activity.objective_text end,
        primary_place_id = case when v_patch ? 'primary_place_id' then (v_patch ->> 'primary_place_id')::uuid else v_activity.primary_place_id end,
        updated_at = timezone('utc', now()), updated_by = p_actor_user_id,
        client_updated_at = coalesce(nullif(v_patch ->> 'client_updated_at', '')::timestamptz, timezone('utc', now())),
        revision = v_activity.revision + 1
      where id = v_entity_id returning * into v_updated_activity;
      v_event_type := case
        when v_activity.scheduled_date is distinct from v_updated_activity.scheduled_date
          or v_activity.scheduled_start_at is distinct from v_updated_activity.scheduled_start_at
          or v_activity.scheduled_end_at is distinct from v_updated_activity.scheduled_end_at then 'rescheduled'
        else 'updated'
      end;
      perform public.sync_replace_primary_activity_contact(p_workspace_id, v_entity_id, p_actor_user_id, v_context -> 'primaryContact');
    elsif v_kind = 'complete_activity' then
      if v_activity.state not in ('draft', 'scheduled')
         or v_patch ->> 'state' <> 'completed'
         or nullif(v_patch ->> 'actual_completed_at', '') is null then
        return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
      end if;
      update public.activities set
        state = 'completed', actual_completed_at = (v_patch ->> 'actual_completed_at')::timestamptz,
        outcome_text = case when v_patch ? 'outcome_text' then nullif(v_patch ->> 'outcome_text', '') else v_activity.outcome_text end,
        updated_at = timezone('utc', now()), updated_by = p_actor_user_id,
        client_updated_at = coalesce(nullif(v_patch ->> 'client_updated_at', '')::timestamptz, timezone('utc', now())),
        revision = v_activity.revision + 1
      where id = v_entity_id returning * into v_updated_activity;
      v_event_type := 'completed';
    else
      if v_activity.state <> 'completed' or v_patch ->> 'state' <> 'scheduled'
         or (v_patch ? 'actual_completed_at' and nullif(v_patch ->> 'actual_completed_at', '') is not null)
         or (v_activity.scheduled_date is null and v_activity.scheduled_start_at is null) then
        return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
      end if;
      update public.activities set
        state = 'scheduled', actual_completed_at = null,
        updated_at = timezone('utc', now()), updated_by = p_actor_user_id,
        client_updated_at = coalesce(nullif(v_patch ->> 'client_updated_at', '')::timestamptz, timezone('utc', now())),
        revision = v_activity.revision + 1
      where id = v_entity_id returning * into v_updated_activity;
      v_event_type := 'reopened';
    end if;

    v_event_at := coalesce(v_updated_activity.actual_completed_at, v_updated_activity.client_updated_at, timezone('utc', now()));
    perform public.sync_insert_activity_transition_history(
      p_workspace_id, v_entity_id, p_actor_user_id, v_event_type, v_activity.state,
      v_updated_activity.state, v_event_at, jsonb_build_object('kind', v_kind)
    );
    perform public.sync_append_change(p_workspace_id, 'activity', v_entity_id, v_updated_activity.revision, v_operation_id, null);
    perform public.sync_store_receipt(v_operation_id, p_workspace_id, v_kind, jsonb_build_array(v_entity_id), v_updated_activity.revision);
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'applied', 'serverRevision', v_updated_activity.revision);
  end if;

  if v_kind = 'complete_task' then
    if v_entity_type <> 'task' then raise exception 'Operation/entity mismatch.' using errcode = '22023'; end if;
    select * into v_task from public.tasks where id = v_entity_id and workspace_id = p_workspace_id and deleted_at is null;
    if not found or v_task.revision <> v_base_revision then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT',
        'remoteRecord', case when found then public.canonical_record_for_change(p_workspace_id, 'task', v_entity_id) else null end);
    end if;
    if v_task.state <> 'open' or v_patch ->> 'state' <> 'completed' or nullif(v_patch ->> 'completed_at', '') is null then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
    end if;
    update public.tasks set
      state = 'completed', completed_at = (v_patch ->> 'completed_at')::timestamptz,
      updated_at = timezone('utc', now()), updated_by = p_actor_user_id,
      client_updated_at = coalesce(nullif(v_patch ->> 'client_updated_at', '')::timestamptz, timezone('utc', now())),
      revision = v_task.revision + 1
    where id = v_entity_id returning * into v_updated_task;
    perform public.sync_insert_task_transition_history(
      p_workspace_id, v_entity_id, p_actor_user_id, v_task.state, v_updated_task.state,
      v_updated_task.completed_at, jsonb_build_object('kind', v_kind)
    );
    perform public.sync_append_change(p_workspace_id, 'task', v_entity_id, v_updated_task.revision, v_operation_id, null);
    perform public.sync_store_receipt(v_operation_id, p_workspace_id, v_kind, jsonb_build_array(v_entity_id), v_updated_task.revision);
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'applied', 'serverRevision', v_updated_task.revision);
  end if;

  return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
exception
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
  if p_operation ->> 'kind' in ('update_activity', 'complete_activity', 'reopen_activity', 'complete_task') then
    return public.sync_apply_lifecycle_transition_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  return public.sync_apply_lifecycle_create_operation(p_workspace_id, p_actor_user_id, p_operation);
end;
$$;

revoke all on function public.sync_prepare_update_record(jsonb, uuid, uuid) from public;
revoke all on function public.sync_replace_primary_activity_contact(uuid, uuid, uuid, jsonb) from public;
revoke all on function public.sync_insert_activity_transition_history(uuid, uuid, uuid, text, text, text, timestamptz, jsonb) from public;
revoke all on function public.sync_insert_task_transition_history(uuid, uuid, uuid, text, text, timestamptz, jsonb) from public;
revoke all on function public.sync_apply_lifecycle_transition_operation(uuid, uuid, jsonb) from public;
revoke all on function public.sync_apply_operation(uuid, uuid, jsonb) from public;
revoke all on function public.apply_sync_batch(uuid, jsonb) from public;
grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated;
