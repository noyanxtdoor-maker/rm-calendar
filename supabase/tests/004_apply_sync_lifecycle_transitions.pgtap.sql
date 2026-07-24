begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '21000000-0000-0000-0000-000000000021',
  'authenticated', 'authenticated', 'transition-owner@example.test', '', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now())
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000021', true);
select set_config('test.transition_workspace', public.bootstrap_private_workspace('Transition owner', 'Asia/Singapore')::text, true);

select is(
  public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '22000000-0000-0000-0000-000000000022', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'sequence', 1, 'kind', 'create_contact', 'entityType', 'contact', 'entityId', '23000000-0000-0000-0000-000000000023', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '23000000-0000-0000-0000-000000000023', 'workspaceId', current_setting('test.transition_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T03:00:00.000Z', 'displayName', 'Transition person', 'displayNameNormalized', 'transition person'
        ))
      ),
      jsonb_build_object(
        'operationId', '24000000-0000-0000-0000-000000000024', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'sequence', 2, 'kind', 'create_activity', 'entityType', 'activity', 'entityId', '25000000-0000-0000-0000-000000000025', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '25000000-0000-0000-0000-000000000025', 'workspaceId', current_setting('test.transition_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T03:01:00.000Z', 'title', 'Initial plan', 'activityType', 'visit', 'state', 'scheduled',
          'scheduledDate', '2026-07-25', 'scheduleTimezone', 'Asia/Singapore'
        ))
      ),
      jsonb_build_object(
        'operationId', '26000000-0000-0000-0000-000000000026', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'sequence', 3, 'kind', 'create_task', 'entityType', 'task', 'entityId', '27000000-0000-0000-0000-000000000027', 'baseRevision', 0, 'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object('record', jsonb_build_object(
          'id', '27000000-0000-0000-0000-000000000027', 'workspaceId', current_setting('test.transition_workspace')::uuid,
          'clientUpdatedAt', '2026-07-24T03:02:00.000Z', 'title', 'Initial task', 'state', 'open', 'priority', 'normal'
        ))
      )
    )
  ) -> 'results' -> 2 ->> 'disposition',
  'applied',
  'transition fixtures are created through the same restricted RPC'
);

select is(
  (public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '28000000-0000-0000-0000-000000000028', 'workspaceId', current_setting('test.transition_workspace')::uuid,
      'sequence', 4, 'kind', 'update_activity', 'entityType', 'activity', 'entityId', '25000000-0000-0000-0000-000000000025', 'baseRevision', 1, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '25000000-0000-0000-0000-000000000025', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'clientUpdatedAt', '2026-07-24T03:03:00.000Z', 'title', 'Revised plan', 'activityType', 'visit', 'state', 'scheduled',
        'scheduledDate', '2026-07-26', 'scheduleTimezone', 'Asia/Singapore'
      ))
    ))
  ) -> 'results' -> 0 ->> 'serverRevision')::bigint,
  2::bigint,
  'a current activity revision updates once and increments its revision'
);

reset role;
select is((select title from public.activities where id = '25000000-0000-0000-0000-000000000025'), 'Revised plan', 'the revised activity title is canonical');
select is((select event_type from public.activity_history where activity_id = '25000000-0000-0000-0000-000000000025' and event_payload_json ->> 'kind' = 'update_activity'), 'rescheduled', 'a schedule change has immutable reschedule history');
select is((select previous_state from public.activity_history where activity_id = '25000000-0000-0000-0000-000000000025' and event_payload_json ->> 'kind' = 'update_activity'), 'scheduled', 'transition history keeps the prior state');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000021', true);
select is(
  public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '29000000-0000-0000-0000-000000000029', 'workspaceId', current_setting('test.transition_workspace')::uuid,
      'sequence', 5, 'kind', 'complete_activity', 'entityType', 'activity', 'entityId', '25000000-0000-0000-0000-000000000025', 'baseRevision', 1, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '25000000-0000-0000-0000-000000000025', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'title', 'Stale overwrite attempt', 'state', 'completed', 'actualCompletedAt', '2026-07-24T03:04:00.000Z'
      ))
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'conflict',
  'a stale completion becomes a visible conflict instead of overwriting the activity'
);

select is(
  (public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '2a000000-0000-0000-0000-00000000002a', 'workspaceId', current_setting('test.transition_workspace')::uuid,
      'sequence', 6, 'kind', 'complete_activity', 'entityType', 'activity', 'entityId', '25000000-0000-0000-0000-000000000025', 'baseRevision', 2, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '25000000-0000-0000-0000-000000000025', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'title', 'Completion must not edit the plan title', 'state', 'completed', 'actualCompletedAt', '2026-07-24T03:05:00.000Z', 'outcomeText', 'A private result'
      ))
    ))
  ) -> 'results' -> 0 ->> 'serverRevision')::bigint,
  3::bigint,
  'a current completion applies and advances the activity revision'
);

reset role;
select is((select title from public.activities where id = '25000000-0000-0000-0000-000000000025'), 'Revised plan', 'completion cannot smuggle a title edit');
select is((select outcome_text from public.activities where id = '25000000-0000-0000-0000-000000000025'), 'A private result', 'completion records the submitted outcome');
select is((select event_type from public.activity_history where activity_id = '25000000-0000-0000-0000-000000000025' order by event_at desc, created_at desc limit 1), 'completed', 'completion has immutable history');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000021', true);
select is(
  (public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '2b000000-0000-0000-0000-00000000002b', 'workspaceId', current_setting('test.transition_workspace')::uuid,
      'sequence', 7, 'kind', 'reopen_activity', 'entityType', 'activity', 'entityId', '25000000-0000-0000-0000-000000000025', 'baseRevision', 3, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '25000000-0000-0000-0000-000000000025', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'state', 'scheduled', 'actualCompletedAt', null
      ))
    ))
  ) -> 'results' -> 0 ->> 'serverRevision')::bigint,
  4::bigint,
  'a completed scheduled activity can reopen against its current revision'
);

select is(
  (public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '2c000000-0000-0000-0000-00000000002c', 'workspaceId', current_setting('test.transition_workspace')::uuid,
      'sequence', 8, 'kind', 'complete_task', 'entityType', 'task', 'entityId', '27000000-0000-0000-0000-000000000027', 'baseRevision', 1, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '27000000-0000-0000-0000-000000000027', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'title', 'Completion must not edit the task title', 'state', 'completed', 'completedAt', '2026-07-24T03:06:00.000Z'
      ))
    ))
  ) -> 'results' -> 0 ->> 'serverRevision')::bigint,
  2::bigint,
  'a current task completion applies once'
);

reset role;
select is((select title from public.tasks where id = '27000000-0000-0000-0000-000000000027'), 'Initial task', 'task completion cannot smuggle a title edit');
select is((select event_type from public.task_history where task_id = '27000000-0000-0000-0000-000000000027' order by event_at desc, created_at desc limit 1), 'completed', 'task completion has immutable history');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000021', true);
select is(
  public.apply_sync_batch(
    current_setting('test.transition_workspace')::uuid,
    jsonb_build_array(jsonb_build_object(
      'operationId', '2c000000-0000-0000-0000-00000000002c', 'workspaceId', current_setting('test.transition_workspace')::uuid,
      'sequence', 8, 'kind', 'complete_task', 'entityType', 'task', 'entityId', '27000000-0000-0000-0000-000000000027', 'baseRevision', 1, 'dependsOnOperationIds', '[]'::jsonb,
      'payload', jsonb_build_object('record', jsonb_build_object(
        'id', '27000000-0000-0000-0000-000000000027', 'workspaceId', current_setting('test.transition_workspace')::uuid,
        'state', 'completed', 'completedAt', '2026-07-24T03:06:00.000Z'
      ))
    ))
  ) -> 'results' -> 0 ->> 'disposition',
  'already_applied',
  'replaying a task completion operation is exactly-once'
);

reset role;
select is((select count(*) from public.task_history where task_id = '27000000-0000-0000-0000-000000000027'), 2::bigint, 'the idempotent completion retry cannot append duplicate history');

select * from finish();
rollback;
