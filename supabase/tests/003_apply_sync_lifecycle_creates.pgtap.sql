begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11000000-0000-0000-0000-000000000011',
  'authenticated', 'authenticated', 'lifecycle-owner@example.test', '', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000011', true);
select set_config('test.lifecycle_workspace', public.bootstrap_private_workspace('Lifecycle owner', 'Asia/Singapore')::text, true);

select is(
  public.apply_sync_batch(
    current_setting('test.lifecycle_workspace')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '12000000-0000-0000-0000-000000000012', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
        'sequence', 1, 'kind', 'create_contact', 'entityType', 'contact', 'entityId', '13000000-0000-0000-0000-000000000013', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '13000000-0000-0000-0000-000000000013', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T02:00:00.000Z', 'displayName', 'Lifecycle person', 'displayNameNormalized', 'lifecycle person'
        ))
      ),
      jsonb_build_object(
        'operationId', '14000000-0000-0000-0000-000000000014', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
        'sequence', 2, 'kind', 'create_activity', 'entityType', 'activity', 'entityId', '15000000-0000-0000-0000-000000000015', 'baseRevision', 0, 'dependsOnOperationIds', jsonb_build_array('12000000-0000-0000-0000-000000000012'),
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', '15000000-0000-0000-0000-000000000015', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
            'clientUpdatedAt', '2026-07-24T02:01:00.000Z', 'title', 'Plan a visit', 'activityType', 'visit', 'state', 'scheduled',
            'scheduledDate', '2026-07-25', 'scheduleTimezone', 'Asia/Singapore'
          ),
          'context', jsonb_build_object('primaryContact', jsonb_build_object(
            'id', '16000000-0000-0000-0000-000000000016', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
            'activityId', '15000000-0000-0000-0000-000000000015', 'contactId', '13000000-0000-0000-0000-000000000013',
            'isPrimary', true, 'clientUpdatedAt', '2026-07-24T02:01:00.000Z'
          ))
        )
      ),
      jsonb_build_object(
        'operationId', '17000000-0000-0000-0000-000000000017', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
        'sequence', 3, 'kind', 'create_task', 'entityType', 'task', 'entityId', '18000000-0000-0000-0000-000000000018', 'baseRevision', 0, 'dependsOnOperationIds', jsonb_build_array('14000000-0000-0000-0000-000000000014'),
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '18000000-0000-0000-0000-000000000018', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T02:02:00.000Z', 'title', 'Prepare notes', 'state', 'open', 'priority', 'normal',
          'activityId', '15000000-0000-0000-0000-000000000015'
        ))
      ),
      jsonb_build_object(
        'operationId', '19000000-0000-0000-0000-000000000019', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
        'sequence', 4, 'kind', 'create_note', 'entityType', 'note', 'entityId', '1a000000-0000-0000-0000-00000000001a', 'baseRevision', 0, 'dependsOnOperationIds', jsonb_build_array('17000000-0000-0000-0000-000000000017'),
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '1a000000-0000-0000-0000-00000000001a', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T02:03:00.000Z', 'body', 'Private note body', 'isPinned', false,
          'taskId', '18000000-0000-0000-0000-000000000018'
        ))
      )
    )
  ) -> 'results' -> 3 ->> 'disposition',
  'applied',
  'an ordered batch applies the lifecycle create chain'
);

reset role;
select is((select state from public.activities where id = '15000000-0000-0000-0000-000000000015'), 'scheduled', 'the activity is stored canonically');
select is((select count(*) from public.activity_contacts where activity_id = '15000000-0000-0000-0000-000000000015' and is_primary), 1::bigint, 'the activity primary-person link is stored');
select is((select event_type from public.activity_history where activity_id = '15000000-0000-0000-0000-000000000015'), 'scheduled', 'the activity receives immutable creation history');
select is((select event_type from public.task_history where task_id = '18000000-0000-0000-0000-000000000018'), 'created', 'the task receives immutable creation history');
select is((select body from public.notes where id = '1a000000-0000-0000-0000-00000000001a'), 'Private note body', 'the note is stored against its task');
select is((select count(*) from public.change_log where workspace_id = current_setting('test.lifecycle_workspace')::uuid), 4::bigint, 'each applied record receives one pull-journal entry');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000011', true);
select is(
  public.apply_sync_batch(
    current_setting('test.lifecycle_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '17000000-0000-0000-0000-000000000017', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
      'sequence', 3, 'kind', 'create_task', 'entityType', 'task', 'entityId', '18000000-0000-0000-0000-000000000018', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object('id', '18000000-0000-0000-0000-000000000018', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid, 'title', 'ignored'))
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'already_applied',
  'a lifecycle retry is idempotent by operation ID'
);

select is((select count(*) from public.tasks where id = '18000000-0000-0000-0000-000000000018'), 1::bigint, 'the idempotent retry does not create another task');

select is(
  public.apply_sync_batch(
    current_setting('test.lifecycle_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '1b000000-0000-0000-0000-00000000001b', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
      'sequence', 5, 'kind', 'quick_capture_activity', 'entityType', 'activity', 'entityId', '1c000000-0000-0000-0000-00000000001c', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '1c000000-0000-0000-0000-00000000001c', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
        'clientUpdatedAt', '2026-07-24T02:04:00.000Z', 'title', 'Invalid quick capture', 'activityType', 'other', 'state', 'scheduled',
        'scheduledDate', '2026-07-25', 'scheduleTimezone', 'Asia/Singapore'
      ))
    ))
  ) -> 'results' -> 0 ->> 'errorCode',
  'VALIDATION_FAILED',
  'quick capture cannot be submitted as a scheduled activity'
);

select is(
  public.apply_sync_batch(
    current_setting('test.lifecycle_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '1d000000-0000-0000-0000-00000000001d', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
      'sequence', 6, 'kind', 'create_note', 'entityType', 'note', 'entityId', '1e000000-0000-0000-0000-00000000001e', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '1e000000-0000-0000-0000-00000000001e', 'workspaceId', current_setting('test.lifecycle_workspace')::uuid,
        'clientUpdatedAt', '2026-07-24T02:05:00.000Z', 'body', 'Missing parent', 'isPinned', false,
        'taskId', '1f000000-0000-0000-0000-00000000001f'
      ))
    ))
  ) -> 'results' -> 0 ->> 'errorCode',
  'VALIDATION_FAILED',
  'a note cannot attach to a missing local-only parent'
);

select * from finish();
rollback;
