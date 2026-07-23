-- RM Calendar: the first restricted apply_sync_batch slice.
--
-- This migration deliberately accepts only simple create operations. It is not
-- wired into the browser yet. Lifecycle and compound follow-up operation kinds
-- are added only after this idempotency boundary has database tests.

create or replace function public.sync_camel_to_snake_json(p_value jsonb)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_value jsonb;
  v_result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_value) <> 'object' then
    raise exception 'A sync record must be a JSON object.' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_value) loop
    v_result := v_result || jsonb_build_object(
      lower(regexp_replace(v_key, '([A-Z])', '_\1', 'g')),
      v_value
    );
  end loop;

  return v_result;
end;
$$;

create or replace function public.sync_prepare_insert_record(
  p_record jsonb,
  p_entity_id uuid,
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_defaults jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record jsonb := public.sync_camel_to_snake_json(p_record);
  v_client_updated_at timestamptz;
begin
  if v_record ->> 'id' is distinct from p_entity_id::text then
    raise exception 'The operation entity ID must match its record ID.' using errcode = '22023';
  end if;

  if v_record ->> 'workspace_id' is distinct from p_workspace_id::text then
    raise exception 'The operation workspace must match its record workspace.' using errcode = '22023';
  end if;

  v_client_updated_at := coalesce(
    nullif(v_record ->> 'client_updated_at', '')::timestamptz,
    timezone('utc', now())
  );

  v_record := v_record - array[
    'id',
    'workspace_id',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
    'client_updated_at',
    'deleted_at',
    'revision',
    'sync_state',
    'pending_base_revision',
    'last_local_mutation_id'
  ];

  return coalesce(p_defaults, '{}'::jsonb)
    || v_record
    || jsonb_build_object(
      'id', p_entity_id,
      'workspace_id', p_workspace_id,
      'created_at', timezone('utc', now()),
      'created_by', p_actor_user_id,
      'updated_at', timezone('utc', now()),
      'updated_by', p_actor_user_id,
      'client_updated_at', v_client_updated_at,
      'deleted_at', null,
      'revision', 1
    );
end;
$$;

create or replace function public.sync_insert_simple_record(
  p_table text,
  p_record jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_table not in ('contacts', 'organizations', 'places') then
    raise exception 'Unsupported simple sync table.' using errcode = '22023';
  end if;

  execute format(
    'insert into public.%1$I select (jsonb_populate_record(null::public.%1$I, $1)).*',
    p_table
  ) using p_record;
end;
$$;

create or replace function public.sync_append_change(
  p_workspace_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_revision bigint,
  p_operation_id uuid,
  p_deleted_at timestamptz default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.change_log (
    workspace_id,
    entity_type,
    entity_id,
    revision,
    operation_id,
    deleted_at
  )
  values (
    p_workspace_id,
    p_entity_type,
    p_entity_id,
    p_revision,
    p_operation_id,
    p_deleted_at
  );
$$;

create or replace function public.sync_store_receipt(
  p_operation_id uuid,
  p_workspace_id uuid,
  p_operation_kind text,
  p_entity_ids jsonb,
  p_server_revision bigint
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.mutation_receipts (
    operation_id,
    workspace_id,
    operation_kind,
    entity_ids_json,
    result_code,
    result_json
  )
  values (
    p_operation_id,
    p_workspace_id,
    p_operation_kind,
    p_entity_ids,
    'applied',
    jsonb_build_object('serverRevision', p_server_revision)
  );
$$;

create or replace function public.sync_apply_simple_operation(
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
  v_operation_id uuid;
  v_operation_workspace_id uuid;
  v_kind text;
  v_entity_type text;
  v_entity_id uuid;
  v_base_revision bigint;
  v_record jsonb;
  v_prepared_record jsonb;
  v_receipt_workspace_id uuid;
  v_receipt_result jsonb;
  v_table text;
begin
  v_operation_id := (p_operation ->> 'operationId')::uuid;
  v_operation_workspace_id := (p_operation ->> 'workspaceId')::uuid;
  v_kind := p_operation ->> 'kind';
  v_entity_type := p_operation ->> 'entityType';
  v_entity_id := (p_operation ->> 'entityId')::uuid;
  v_base_revision := coalesce((p_operation ->> 'baseRevision')::bigint, 0);
  v_record := p_operation #> '{payload,record}';

  if v_operation_workspace_id <> p_workspace_id then
    return jsonb_build_object(
      'operationId', coalesce(p_operation ->> 'operationId', ''),
      'disposition', 'rejected',
      'errorCode', 'FORBIDDEN'
    );
  end if;

  if jsonb_typeof(v_record) <> 'object' then
    return jsonb_build_object(
      'operationId', v_operation_id,
      'disposition', 'rejected',
      'errorCode', 'VALIDATION_FAILED'
    );
  end if;

  select workspace_id, result_json
    into v_receipt_workspace_id, v_receipt_result
    from public.mutation_receipts
   where operation_id = v_operation_id;

  if found then
    if v_receipt_workspace_id <> p_workspace_id then
      return jsonb_build_object(
        'operationId', v_operation_id,
        'disposition', 'rejected',
        'errorCode', 'FORBIDDEN'
      );
    end if;

    return jsonb_build_object(
      'operationId', v_operation_id,
      'disposition', 'already_applied',
      'serverRevision', (v_receipt_result ->> 'serverRevision')::bigint
    );
  end if;

  if v_base_revision <> 0 then
    return jsonb_build_object(
      'operationId', v_operation_id,
      'disposition', 'rejected',
      'errorCode', 'VALIDATION_FAILED'
    );
  end if;

  case v_kind
    when 'create_contact' then
      if v_entity_type <> 'contact' then
        raise exception 'Operation/entity mismatch.' using errcode = '22023';
      end if;
      v_table := 'contacts';
      v_prepared_record := public.sync_prepare_insert_record(
        v_record,
        v_entity_id,
        p_workspace_id,
        p_actor_user_id,
        jsonb_build_object('phone_json', '[]'::jsonb, 'email_json', '[]'::jsonb)
      );
    when 'create_household' then
      if v_entity_type <> 'organization' then
        raise exception 'Operation/entity mismatch.' using errcode = '22023';
      end if;
      v_table := 'organizations';
      v_prepared_record := public.sync_prepare_insert_record(
        v_record,
        v_entity_id,
        p_workspace_id,
        p_actor_user_id
      );
    when 'create_place' then
      if v_entity_type <> 'place' then
        raise exception 'Operation/entity mismatch.' using errcode = '22023';
      end if;
      v_table := 'places';
      v_prepared_record := public.sync_prepare_insert_record(
        v_record,
        v_entity_id,
        p_workspace_id,
        p_actor_user_id
      );
    else
      return jsonb_build_object(
        'operationId', v_operation_id,
        'disposition', 'rejected',
        'errorCode', 'VALIDATION_FAILED'
      );
  end case;

  perform public.sync_insert_simple_record(v_table, v_prepared_record);
  perform public.sync_append_change(p_workspace_id, v_entity_type, v_entity_id, 1, v_operation_id, null);
  perform public.sync_store_receipt(
    v_operation_id,
    p_workspace_id,
    v_kind,
    jsonb_build_array(v_entity_id),
    1
  );

  return jsonb_build_object(
    'operationId', v_operation_id,
    'disposition', 'applied',
    'serverRevision', 1
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'operationId', coalesce(p_operation ->> 'operationId', ''),
      'disposition', 'conflict',
      'errorCode', 'REVISION_CONFLICT',
      'remoteRecord', public.canonical_record_for_change(p_workspace_id, v_entity_type, v_entity_id)
    );
  when foreign_key_violation then
    return jsonb_build_object(
      'operationId', coalesce(p_operation ->> 'operationId', ''),
      'disposition', 'rejected',
      'errorCode', 'DEPENDENCY_MISSING'
    );
  when check_violation or not_null_violation or invalid_text_representation or invalid_parameter_value then
    return jsonb_build_object(
      'operationId', coalesce(p_operation ->> 'operationId', ''),
      'disposition', 'rejected',
      'errorCode', 'VALIDATION_FAILED'
    );
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
    raise exception 'The requested workspace is not available to this user.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_operations) <> 'array'
     or jsonb_array_length(p_operations) > 50 then
    raise exception 'A sync batch must contain between 0 and 50 operations.'
      using errcode = '22023';
  end if;

  for v_operation in select value from jsonb_array_elements(p_operations) loop
    v_results := v_results || jsonb_build_array(
      public.sync_apply_simple_operation(p_workspace_id, v_actor_user_id, v_operation)
    );
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

revoke all on function public.sync_camel_to_snake_json(jsonb) from public;
revoke all on function public.sync_prepare_insert_record(jsonb, uuid, uuid, uuid, jsonb) from public;
revoke all on function public.sync_insert_simple_record(text, jsonb) from public;
revoke all on function public.sync_append_change(uuid, text, uuid, bigint, uuid, timestamptz) from public;
revoke all on function public.sync_store_receipt(uuid, uuid, text, jsonb, bigint) from public;
revoke all on function public.sync_apply_simple_operation(uuid, uuid, jsonb) from public;
revoke all on function public.apply_sync_batch(uuid, jsonb) from public;
grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated;
