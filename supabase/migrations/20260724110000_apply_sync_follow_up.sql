-- RM Calendar: atomic compound Follow-up apply.
-- A source Activity, one newly-created target, one Follow-up link, histories,
-- change records, and the idempotency receipt either commit together or not at all.

create or replace function public.sync_apply_follow_up_operation(
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
  v_follow_up jsonb;
  v_target jsonb;
  v_target_kind text;
  v_target_id uuid;
  v_source_id uuid;
  v_source_base_revision bigint;
  v_source public.activities%rowtype;
  v_receipt_workspace_id uuid;
  v_receipt_result jsonb;
  v_event_at timestamptz;
  v_entity_revisions jsonb;
begin
  if v_operation_workspace_id <> p_workspace_id then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'FORBIDDEN');
  end if;
  if v_kind <> 'create_follow_up' or v_entity_type <> 'follow_up'
     or jsonb_typeof(v_record) <> 'object' or jsonb_typeof(v_context) <> 'object'
     or v_base_revision <> 0 then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  select workspace_id, result_json into v_receipt_workspace_id, v_receipt_result
    from public.mutation_receipts where operation_id = v_operation_id;
  if found then
    if v_receipt_workspace_id <> p_workspace_id then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'FORBIDDEN');
    end if;
    return jsonb_strip_nulls(jsonb_build_object(
      'operationId', v_operation_id,
      'disposition', 'already_applied',
      'serverRevision', (v_receipt_result ->> 'serverRevision')::bigint,
      'entityRevisions', v_receipt_result -> 'entityRevisions'
    ));
  end if;

  v_follow_up := public.sync_prepare_insert_record(v_record, v_entity_id, p_workspace_id, p_actor_user_id);
  v_source_id := (v_follow_up ->> 'source_activity_id')::uuid;
  v_target_kind := v_follow_up ->> 'target_kind';
  v_source_base_revision := (v_context ->> 'sourceBaseRevision')::bigint;
  if v_source_id is null or v_source_base_revision is null or v_source_base_revision < 1 then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  select * into v_source from public.activities
   where id = v_source_id and workspace_id = p_workspace_id and deleted_at is null;
  if not found or v_source.revision <> v_source_base_revision then
    return jsonb_build_object(
      'operationId', v_operation_id, 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT',
      'remoteRecord', case when found then public.canonical_record_for_change(p_workspace_id, 'activity', v_source_id) else null end
    );
  end if;
  if v_source.state <> 'completed' then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  if v_target_kind = 'task' and jsonb_typeof(v_context -> 'targetTask') = 'object' then
    v_target_id := (v_follow_up ->> 'target_task_id')::uuid;
    if v_target_id is null or v_follow_up ->> 'target_activity_id' is not null then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
    end if;
    v_target := public.sync_prepare_insert_record(v_context -> 'targetTask', v_target_id, p_workspace_id, p_actor_user_id);
    if v_target ->> 'state' <> 'open' then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
    end if;
    perform public.sync_insert_lifecycle_record('tasks', v_target);
    perform public.sync_insert_task_history(
      p_workspace_id, v_target_id, p_actor_user_id,
      coalesce((v_target ->> 'client_updated_at')::timestamptz, timezone('utc', now())),
      jsonb_build_object('kind', v_kind)
    );
  elsif v_target_kind = 'activity' and jsonb_typeof(v_context -> 'targetActivity') = 'object' then
    v_target_id := (v_follow_up ->> 'target_activity_id')::uuid;
    if v_target_id is null or v_follow_up ->> 'target_task_id' is not null then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
    end if;
    v_target := public.sync_prepare_insert_record(v_context -> 'targetActivity', v_target_id, p_workspace_id, p_actor_user_id);
    if v_target ->> 'state' not in ('draft', 'scheduled') then
      return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
    end if;
    perform public.sync_insert_lifecycle_record('activities', v_target);
    if jsonb_typeof(v_context -> 'targetPrimaryContact') = 'object' then
      perform public.sync_insert_primary_activity_contact(p_workspace_id, v_target_id, p_actor_user_id, v_context -> 'targetPrimaryContact');
    end if;
    perform public.sync_insert_activity_history(
      p_workspace_id, v_target_id, p_actor_user_id,
      case when v_target ->> 'state' = 'draft' then 'saved_as_draft' else 'scheduled' end,
      v_target ->> 'state',
      coalesce((v_target ->> 'client_updated_at')::timestamptz, timezone('utc', now())),
      jsonb_build_object('kind', v_kind)
    );
  else
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  insert into public.follow_ups
  select (jsonb_populate_record(null::public.follow_ups, v_follow_up)).*;

  v_event_at := coalesce((v_follow_up ->> 'client_updated_at')::timestamptz, timezone('utc', now()));
  perform public.sync_insert_activity_transition_history(
    p_workspace_id, v_source_id, p_actor_user_id, 'follow_up_created', 'completed', 'completed',
    v_event_at, jsonb_build_object('kind', v_kind, 'followUpId', v_entity_id)
  );

  perform public.sync_append_change(p_workspace_id, v_target_kind, v_target_id, 1, v_operation_id, null);
  perform public.sync_append_change(p_workspace_id, 'follow_up', v_entity_id, 1, v_operation_id, null);
  v_entity_revisions := jsonb_build_array(
    jsonb_build_object('entityType', 'follow_up', 'entityId', v_entity_id, 'serverRevision', 1),
    jsonb_build_object('entityType', v_target_kind, 'entityId', v_target_id, 'serverRevision', 1)
  );
  insert into public.mutation_receipts (
    operation_id, workspace_id, operation_kind, entity_ids_json, result_code, result_json
  ) values (
    v_operation_id, p_workspace_id, v_kind, jsonb_build_array(v_entity_id, v_target_id), 'applied',
    jsonb_build_object('serverRevision', 1, 'entityRevisions', v_entity_revisions)
  );

  return jsonb_build_object(
    'operationId', v_operation_id, 'disposition', 'applied', 'serverRevision', 1,
    'entityRevisions', v_entity_revisions
  );
exception
  when unique_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT');
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
  if p_operation ->> 'kind' = 'create_follow_up' then
    return public.sync_apply_follow_up_operation(p_workspace_id, p_actor_user_id, p_operation);
  end if;
  return public.sync_apply_lifecycle_create_operation(p_workspace_id, p_actor_user_id, p_operation);
end;
$$;

revoke all on function public.sync_apply_follow_up_operation(uuid, uuid, jsonb) from public;
revoke all on function public.sync_apply_operation(uuid, uuid, jsonb) from public;
revoke all on function public.apply_sync_batch(uuid, jsonb) from public;
grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated;
