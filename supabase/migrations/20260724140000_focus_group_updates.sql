-- RM Calendar: revision-checked focus-group management.
--
-- A focus group remains private planning context. This adds safe rename and
-- member-set updates through the existing owner-scoped sync RPC; direct browser
-- writes remain unavailable.

alter table public.mutation_receipts
  drop constraint if exists mutation_receipts_operation_kind_check;

alter table public.mutation_receipts
  add constraint mutation_receipts_operation_kind_check check (
    operation_kind in (
      'create_contact', 'create_household', 'create_focus_group', 'update_focus_group', 'create_place',
      'create_activity', 'update_activity', 'complete_activity', 'reopen_activity',
      'quick_capture_activity', 'create_task', 'complete_task', 'create_note', 'create_follow_up'
    )
  );

create or replace function public.sync_apply_update_focus_group_operation(
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
  v_base_revision bigint := (p_operation ->> 'baseRevision')::bigint;
  v_record jsonb := p_operation #> '{payload,record}';
  v_member_links jsonb := coalesce(p_operation #> '{payload,context,memberLinks}', '[]'::jsonb);
  v_patch jsonb;
  v_link jsonb;
  v_link_record jsonb;
  v_link_id uuid;
  v_link_deleted_at timestamptz;
  v_receipt_workspace_id uuid;
  v_receipt_result jsonb;
  v_group public.organizations%rowtype;
  v_updated_group public.organizations%rowtype;
  v_existing_link public.contact_organizations%rowtype;
begin
  if (p_operation ->> 'workspaceId')::uuid <> p_workspace_id
     or p_operation ->> 'kind' <> 'update_focus_group'
     or p_operation ->> 'entityType' <> 'organization'
     or jsonb_typeof(v_record) <> 'object'
     or jsonb_typeof(v_member_links) <> 'array'
     or v_base_revision is null
     or v_base_revision < 1 then
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

  v_patch := public.sync_prepare_update_record(v_record, v_entity_id, p_workspace_id);
  if v_patch ->> 'kind' <> 'group'
     or nullif(btrim(v_patch ->> 'name'), '') is null
     or nullif(btrim(v_patch ->> 'name_normalized'), '') is null then
    return jsonb_build_object('operationId', v_operation_id, 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
  end if;

  select * into v_group
    from public.organizations
    where id = v_entity_id and workspace_id = p_workspace_id and deleted_at is null;
  if not found or v_group.kind <> 'group' or v_group.revision <> v_base_revision then
    return jsonb_build_object(
      'operationId', v_operation_id,
      'disposition', 'conflict',
      'errorCode', 'REVISION_CONFLICT',
      'remoteRecord', case when found then public.canonical_record_for_change(p_workspace_id, 'organization', v_entity_id) else null end
    );
  end if;

  update public.organizations set
    name = v_patch ->> 'name',
    name_normalized = v_patch ->> 'name_normalized',
    updated_at = timezone('utc', now()),
    updated_by = p_actor_user_id,
    client_updated_at = timezone('utc', now()),
    revision = v_group.revision + 1
  where id = v_entity_id
  returning * into v_updated_group;

  for v_link in select value from jsonb_array_elements(v_member_links) loop
    v_link_id := (v_link ->> 'id')::uuid;
    v_link_record := public.sync_camel_to_snake_json(v_link);
    if v_link_id is null
       or v_link_record ->> 'workspace_id' <> p_workspace_id::text
       or v_link_record ->> 'organization_id' <> v_entity_id::text
       or nullif(v_link_record ->> 'contact_id', '') is null then
      raise exception 'A focus group member link is invalid.' using errcode = '22023';
    end if;
    v_link_deleted_at := nullif(v_link_record ->> 'deleted_at', '')::timestamptz;

    select * into v_existing_link
      from public.contact_organizations
      where id = v_link_id and workspace_id = p_workspace_id;
    if found then
      if v_existing_link.contact_id::text <> (v_link_record ->> 'contact_id')
         or v_existing_link.organization_id <> v_entity_id then
        raise exception 'A focus group member link cannot be reassigned.' using errcode = '22023';
      end if;
      update public.contact_organizations set
        relationship_label = coalesce(nullif(v_link_record ->> 'relationship_label', ''), v_existing_link.relationship_label),
        deleted_at = v_link_deleted_at,
        updated_at = timezone('utc', now()),
        updated_by = p_actor_user_id,
        client_updated_at = timezone('utc', now()),
        revision = v_existing_link.revision + 1
      where id = v_link_id;
    elsif v_link_deleted_at is null then
      insert into public.contact_organizations
        select (jsonb_populate_record(
          null::public.contact_organizations,
          public.sync_prepare_insert_record(v_link, v_link_id, p_workspace_id, p_actor_user_id)
        )).*;
    end if;
  end loop;

  perform public.sync_append_change(p_workspace_id, 'organization', v_entity_id, v_updated_group.revision, v_operation_id, null);
  perform public.sync_store_receipt(v_operation_id, p_workspace_id, 'update_focus_group', jsonb_build_array(v_entity_id), v_updated_group.revision);
  return jsonb_build_object('operationId', v_operation_id, 'disposition', 'applied', 'serverRevision', v_updated_group.revision);
exception
  when unique_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'conflict', 'errorCode', 'REVISION_CONFLICT');
  when foreign_key_violation then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'DEPENDENCY_MISSING');
  when check_violation or not_null_violation or invalid_text_representation or invalid_parameter_value then
    return jsonb_build_object('operationId', coalesce(p_operation ->> 'operationId', ''), 'disposition', 'rejected', 'errorCode', 'VALIDATION_FAILED');
end;
$$;

-- Membership tombstones are returned with the group so another device can
-- remove people from its local cache instead of retaining stale members.
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
        where link.workspace_id = p_workspace_id and link.organization_id = p_entity_id
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
  if p_operation ->> 'kind' = 'update_focus_group' then
    return public.sync_apply_update_focus_group_operation(p_workspace_id, p_actor_user_id, p_operation);
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

revoke all on function public.sync_apply_update_focus_group_operation(uuid, uuid, jsonb) from public;
revoke all on function public.sync_pull_related_context(uuid, text, uuid) from public;
revoke all on function public.sync_apply_operation(uuid, uuid, jsonb) from public;
grant execute on function public.pull_changes(uuid, bigint, integer) to authenticated;
grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated;
