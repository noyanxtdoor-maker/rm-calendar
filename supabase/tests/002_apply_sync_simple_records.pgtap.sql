begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'sync-owner-a@example.test',
    '',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'sync-owner-b@example.test',
    '',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select set_config(
  'test.workspace_a',
  public.bootstrap_private_workspace('Sync owner A', 'Asia/Singapore')::text,
  true
);

select is(
  public.apply_sync_batch(
    current_setting('test.workspace_a')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '50000000-0000-0000-0000-000000000005',
        'workspaceId', current_setting('test.workspace_a')::uuid,
        'sequence', 1,
        'kind', 'create_contact',
        'entityType', 'contact',
        'entityId', '60000000-0000-0000-0000-000000000006',
        'baseRevision', 0,
        'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', '60000000-0000-0000-0000-000000000006',
            'workspaceId', current_setting('test.workspace_a')::uuid,
            'createdAt', '2026-07-24T00:00:00.000Z',
            'updatedAt', '2026-07-24T00:00:00.000Z',
            'clientUpdatedAt', '2026-07-24T00:00:00.000Z',
            'revision', 1,
            'displayName', 'Alex Example',
            'displayNameNormalized', 'alex example'
          )
        )
      )
    )
  ) -> 'results' -> 0 ->> 'disposition',
  'applied',
  'a valid create-contact operation applies once'
);

reset role;
select is(
  (select display_name from public.contacts where id = '60000000-0000-0000-0000-000000000006'),
  'Alex Example',
  'the applied contact is stored canonically'
);

select is(
  (select count(*) from public.change_log where entity_id = '60000000-0000-0000-0000-000000000006'),
  1::bigint,
  'the applied contact creates one pull-journal entry'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select is(
  public.apply_sync_batch(
    current_setting('test.workspace_a')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '50000000-0000-0000-0000-000000000005',
        'workspaceId', current_setting('test.workspace_a')::uuid,
        'sequence', 1,
        'kind', 'create_contact',
        'entityType', 'contact',
        'entityId', '60000000-0000-0000-0000-000000000006',
        'baseRevision', 0,
        'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', '60000000-0000-0000-0000-000000000006',
            'workspaceId', current_setting('test.workspace_a')::uuid,
            'clientUpdatedAt', '2026-07-24T00:00:00.000Z',
            'displayName', 'Alex Example',
            'displayNameNormalized', 'alex example'
          )
        )
      )
    )
  ) -> 'results' -> 0 ->> 'disposition',
  'already_applied',
  'repeating an operation ID is idempotent'
);

reset role;
select is(
  (select count(*) from public.contacts where id = '60000000-0000-0000-0000-000000000006'),
  1::bigint,
  'idempotent retry does not create another contact'
);

select is(
  (select count(*) from public.change_log where entity_id = '60000000-0000-0000-0000-000000000006'),
  1::bigint,
  'idempotent retry does not create another journal entry'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select is(
  public.apply_sync_batch(
    current_setting('test.workspace_a')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '70000000-0000-0000-0000-000000000007',
        'workspaceId', current_setting('test.workspace_a')::uuid,
        'sequence', 2,
        'kind', 'create_contact',
        'entityType', 'contact',
        'entityId', '60000000-0000-0000-0000-000000000006',
        'baseRevision', 0,
        'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', '60000000-0000-0000-0000-000000000006',
            'workspaceId', current_setting('test.workspace_a')::uuid,
            'clientUpdatedAt', '2026-07-24T00:00:00.000Z',
            'displayName', 'Different attempt',
            'displayNameNormalized', 'different attempt'
          )
        )
      )
    )
  ) -> 'results' -> 0 ->> 'disposition',
  'conflict',
  'a new operation cannot create an existing canonical contact ID'
);

select is(
  public.apply_sync_batch(
    current_setting('test.workspace_a')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', '80000000-0000-0000-0000-000000000008',
        'workspaceId', '99999999-0000-0000-0000-000000000009',
        'sequence', 3,
        'kind', 'create_contact',
        'entityType', 'contact',
        'entityId', '90000000-0000-0000-0000-000000000009',
        'baseRevision', 0,
        'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', '90000000-0000-0000-0000-000000000009',
            'workspaceId', current_setting('test.workspace_a')::uuid,
            'clientUpdatedAt', '2026-07-24T00:00:00.000Z',
            'displayName', 'Forbidden mismatch',
            'displayNameNormalized', 'forbidden mismatch'
          )
        )
      )
    )
  ) -> 'results' -> 0 ->> 'errorCode',
  'FORBIDDEN',
  'a batch operation cannot name another workspace'
);

select is(
  public.apply_sync_batch(
    current_setting('test.workspace_a')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'operationId', 'a0000000-0000-0000-0000-00000000000a',
        'workspaceId', current_setting('test.workspace_a')::uuid,
        'sequence', 4,
        'kind', 'create_household',
        'entityType', 'organization',
        'entityId', 'b0000000-0000-0000-0000-00000000000b',
        'baseRevision', 0,
        'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', 'b0000000-0000-0000-0000-00000000000b',
            'workspaceId', current_setting('test.workspace_a')::uuid,
            'clientUpdatedAt', '2026-07-24T00:00:00.000Z',
            'name', 'Example household',
            'nameNormalized', 'example household',
            'kind', 'household'
          )
        )
      ),
      jsonb_build_object(
        'operationId', 'c0000000-0000-0000-0000-00000000000c',
        'workspaceId', current_setting('test.workspace_a')::uuid,
        'sequence', 5,
        'kind', 'create_place',
        'entityType', 'place',
        'entityId', 'd0000000-0000-0000-0000-00000000000d',
        'baseRevision', 0,
        'dependsOnOperationIds', '[]'::jsonb,
        'payload', jsonb_build_object(
          'record', jsonb_build_object(
            'id', 'd0000000-0000-0000-0000-00000000000d',
            'workspaceId', current_setting('test.workspace_a')::uuid,
            'clientUpdatedAt', '2026-07-24T00:00:00.000Z',
            'name', 'Example home',
            'nameNormalized', 'example home',
            'addressText', '1 Fictional Way'
          )
        )
      )
    )) -> 'results' -> 1 ->> 'disposition',
  'applied',
  'a dependency-free simple batch can create a household and place'
);

reset role;
select is(
  (select count(*) from public.organizations where id = 'b0000000-0000-0000-0000-00000000000b'),
  1::bigint,
  'the household is stored'
);

select is(
  (select count(*) from public.places where id = 'd0000000-0000-0000-0000-00000000000d'),
  1::bigint,
  'the place is stored'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select set_config(
  'test.workspace_b',
  public.bootstrap_private_workspace('Sync owner B', 'America/Los_Angeles')::text,
  true
);

select throws_ok(
  $$select public.apply_sync_batch(current_setting('test.workspace_a')::uuid, '[]'::jsonb)$$,
  '42501',
  'The requested workspace is not available to this user.',
  'another owner cannot apply a batch to owner A workspace'
);

select * from finish();
rollback;
