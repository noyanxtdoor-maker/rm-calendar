begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '31000000-0000-0000-0000-000000000031',
  '31000000-0000-0000-0000-000000000031',
  'authenticated', 'authenticated', 'follow-up-owner@example.test', '', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000031', true);
select set_config('test.follow_up_workspace', public.bootstrap_private_workspace('Follow-up owner', 'Asia/Singapore')::text, true);

select is(
  public.apply_sync_batch(
    current_setting('test.follow_up_workspace')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '32000000-0000-0000-0000-000000000032', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
        'sequence', 1, 'kind', 'create_activity', 'entityType', 'activity', 'entityId', '33000000-0000-0000-0000-000000000033', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '33000000-0000-0000-0000-000000000033', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T04:00:00.000Z', 'title', 'Completed source', 'activityType', 'visit', 'state', 'scheduled',
          'scheduledDate', '2026-07-25', 'scheduleTimezone', 'Asia/Singapore'
        ))
      ),
      jsonb_build_object(
        'operationId', '34000000-0000-0000-0000-000000000034', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
        'sequence', 2, 'kind', 'complete_activity', 'entityType', 'activity', 'entityId', '33000000-0000-0000-0000-000000000033', 'baseRevision', 1, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '33000000-0000-0000-0000-000000000033', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
          'state', 'completed', 'actualCompletedAt', '2026-07-24T04:01:00.000Z'
        ))
      )
    )
  ) -> 'results' -> 1 ->> 'disposition',
  'applied',
  'the compound source is first created and completed through restricted operations'
);

select is(
  public.apply_sync_batch(
    current_setting('test.follow_up_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '35000000-0000-0000-0000-000000000035', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
      'sequence', 3, 'kind', 'create_follow_up', 'entityType', 'follow_up', 'entityId', '36000000-0000-0000-0000-000000000036', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object(
        'record', jsonb_build_object(
          'id', '36000000-0000-0000-0000-000000000036', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T04:02:00.000Z', 'sourceActivityId', '33000000-0000-0000-0000-000000000033',
          'targetKind', 'task', 'targetTaskId', '37000000-0000-0000-0000-000000000037'
        ),
        'context', jsonb_build_object(
          'sourceBaseRevision', 2,
          'targetTask', jsonb_build_object(
            'id', '37000000-0000-0000-0000-000000000037', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
            'clientUpdatedAt', '2026-07-24T04:02:00.000Z', 'title', 'Task target', 'state', 'open', 'priority', 'normal',
            'activityId', '33000000-0000-0000-0000-000000000033'
          )
        )
      )
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'applied',
  'a task Follow-up atomically applies against the completed source revision'
);

reset role;
select is((select count(*) from public.tasks where id = '37000000-0000-0000-0000-000000000037'), 1::bigint, 'the task target is stored');
select is((select count(*) from public.follow_ups where id = '36000000-0000-0000-0000-000000000036'), 1::bigint, 'the follow-up link is stored');
select is((select count(*) from public.activity_history where activity_id = '33000000-0000-0000-0000-000000000033' and event_type = 'follow_up_created'), 1::bigint, 'the source receives immutable follow-up history');
select is((select count(*) from public.change_log where entity_id in ('36000000-0000-0000-0000-000000000036', '37000000-0000-0000-0000-000000000037')), 2::bigint, 'the link and target each receive a pull-journal entry');

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000031', true);
select is(
  jsonb_array_length(
    public.apply_sync_batch(
      current_setting('test.follow_up_workspace')::uuid,
      jsonb_build_array(jsonb_build_object(
        'operationId', '35000000-0000-0000-0000-000000000035', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
        'sequence', 3, 'kind', 'create_follow_up', 'entityType', 'follow_up', 'entityId', '36000000-0000-0000-0000-000000000036', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object('id', '36000000-0000-0000-0000-000000000036', 'workspaceId', current_setting('test.follow_up_workspace')::uuid))
      ))
    ) -> 'results' -> 0 -> 'entityRevisions'
  ),
  2,
  'an idempotent Follow-up receipt returns revisions for both local entities'
);
select is(
  public.apply_sync_batch(
    current_setting('test.follow_up_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '35000000-0000-0000-0000-000000000035', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
      'sequence', 3, 'kind', 'create_follow_up', 'entityType', 'follow_up', 'entityId', '36000000-0000-0000-0000-000000000036', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object('id', '36000000-0000-0000-0000-000000000036', 'workspaceId', current_setting('test.follow_up_workspace')::uuid))
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'already_applied',
  'replaying the compound operation is exactly-once'
);

reset role;
select is((select count(*) from public.task_history where task_id = '37000000-0000-0000-0000-000000000037'), 1::bigint, 'the task retry cannot duplicate target history');
select is((select count(*) from public.activity_history where activity_id = '33000000-0000-0000-0000-000000000033' and event_type = 'follow_up_created'), 1::bigint, 'the retry cannot duplicate source history');

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000031', true);
select is(
  public.apply_sync_batch(
    current_setting('test.follow_up_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '38000000-0000-0000-0000-000000000038', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
      'sequence', 4, 'kind', 'create_follow_up', 'entityType', 'follow_up', 'entityId', '39000000-0000-0000-0000-000000000039', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object(
        'record', jsonb_build_object(
          'id', '39000000-0000-0000-0000-000000000039', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T04:03:00.000Z', 'sourceActivityId', '33000000-0000-0000-0000-000000000033',
          'targetKind', 'activity', 'targetActivityId', '3a000000-0000-0000-0000-00000000003a'
        ),
        'context', jsonb_build_object(
          'sourceBaseRevision', 2,
          'targetActivity', jsonb_build_object(
            'id', '3a000000-0000-0000-0000-00000000003a', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
            'clientUpdatedAt', '2026-07-24T04:03:00.000Z', 'title', 'Activity target', 'activityType', 'visit', 'state', 'scheduled',
            'scheduledDate', '2026-07-26', 'scheduleTimezone', 'Asia/Singapore'
          )
        )
      )
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'applied',
  'an activity Follow-up target also commits atomically'
);

reset role;
select is((select state from public.activities where id = '3a000000-0000-0000-0000-00000000003a'), 'scheduled', 'the activity target is stored');
select is((select event_type from public.activity_history where activity_id = '3a000000-0000-0000-0000-00000000003a'), 'scheduled', 'the activity target receives its creation history');

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000031', true);
select is(
  public.apply_sync_batch(
    current_setting('test.follow_up_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '3b000000-0000-0000-0000-00000000003b', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
      'sequence', 5, 'kind', 'create_follow_up', 'entityType', 'follow_up', 'entityId', '3c000000-0000-0000-0000-00000000003c', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object(
        'record', jsonb_build_object(
          'id', '3c000000-0000-0000-0000-00000000003c', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
          'sourceActivityId', '33000000-0000-0000-0000-000000000033', 'targetKind', 'task', 'targetTaskId', '3d000000-0000-0000-0000-00000000003d'
        ),
        'context', jsonb_build_object('sourceBaseRevision', 1, 'targetTask', jsonb_build_object(
          'id', '3d000000-0000-0000-0000-00000000003d', 'workspaceId', current_setting('test.follow_up_workspace')::uuid,
          'title', 'Stale target', 'state', 'open', 'priority', 'normal'
        ))
      )
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'conflict',
  'a stale source revision cannot create a partial Follow-up'
);

reset role;
select is((select count(*) from public.tasks where id = '3d000000-0000-0000-0000-00000000003d'), 0::bigint, 'the stale compound operation creates no target');
select is((select count(*) from public.follow_ups where id = '3c000000-0000-0000-0000-00000000003c'), 0::bigint, 'the stale compound operation creates no link');

select * from finish();
rollback;
