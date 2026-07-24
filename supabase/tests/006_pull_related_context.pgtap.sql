begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '41000000-0000-0000-0000-000000000041', '41000000-0000-0000-0000-000000000041',
  'authenticated', 'authenticated', 'pull-owner@example.test', '', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000041', true);
select set_config('test.pull_workspace', public.bootstrap_private_workspace('Pull owner', 'Asia/Singapore')::text, true);

select is(
  public.apply_sync_batch(
    current_setting('test.pull_workspace')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '42000000-0000-0000-0000-000000000042', 'workspaceId', current_setting('test.pull_workspace')::uuid,
        'sequence', 1, 'kind', 'create_contact', 'entityType', 'contact', 'entityId', '43000000-0000-0000-0000-000000000043', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '43000000-0000-0000-0000-000000000043', 'workspaceId', current_setting('test.pull_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T05:00:00.000Z', 'displayName', 'Pulled person', 'displayNameNormalized', 'pulled person'
        ))
      ),
      jsonb_build_object(
        'operationId', '44000000-0000-0000-0000-000000000044', 'workspaceId', current_setting('test.pull_workspace')::uuid,
        'sequence', 2, 'kind', 'create_activity', 'entityType', 'activity', 'entityId', '45000000-0000-0000-0000-000000000045', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', '45000000-0000-0000-0000-000000000045', 'workspaceId', current_setting('test.pull_workspace')::uuid,
            'clientUpdatedAt', '2026-07-24T05:01:00.000Z', 'title', 'Pulled activity', 'activityType', 'visit', 'state', 'scheduled',
            'scheduledDate', '2026-07-25', 'scheduleTimezone', 'Asia/Singapore'
          ),
          'context', jsonb_build_object('primaryContact', jsonb_build_object(
            'id', '46000000-0000-0000-0000-000000000046', 'workspaceId', current_setting('test.pull_workspace')::uuid,
            'activityId', '45000000-0000-0000-0000-000000000045', 'contactId', '43000000-0000-0000-0000-000000000043',
            'isPrimary', true, 'clientUpdatedAt', '2026-07-24T05:01:00.000Z'
          ))
        )
      ),
      jsonb_build_object(
        'operationId', '47000000-0000-0000-0000-000000000047', 'workspaceId', current_setting('test.pull_workspace')::uuid,
        'sequence', 3, 'kind', 'create_task', 'entityType', 'task', 'entityId', '48000000-0000-0000-0000-000000000048', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '48000000-0000-0000-0000-000000000048', 'workspaceId', current_setting('test.pull_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T05:02:00.000Z', 'title', 'Pulled task', 'state', 'open', 'priority', 'normal'
        ))
      )
    )
  ) -> 'results' -> 2 ->> 'disposition',
  'applied',
  'pull fixtures are created through the authenticated RPC'
);

select is(
  public.pull_changes(current_setting('test.pull_workspace')::uuid) -> 'changes' -> 1 -> 'context' -> 'primaryContact' ->> 'contact_id',
  '43000000-0000-0000-0000-000000000043',
  'an Activity pull carries its primary person link'
);

select is(
  jsonb_array_length(public.pull_changes(current_setting('test.pull_workspace')::uuid) -> 'changes' -> 1 -> 'context' -> 'history'),
  1,
  'an Activity pull carries its immutable history'
);

select is(
  jsonb_array_length(public.pull_changes(current_setting('test.pull_workspace')::uuid) -> 'changes' -> 2 -> 'context' -> 'history'),
  1,
  'a Task pull carries its immutable history'
);

select * from finish();
rollback;
