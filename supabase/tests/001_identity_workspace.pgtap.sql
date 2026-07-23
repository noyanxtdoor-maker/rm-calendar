begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

-- Fictional local Auth users. They exist only inside this rolled-back test.
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
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner-a@example.test',
    '',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    '',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.bootstrap_private_workspace('Unauthenticated', 'Asia/Singapore')$$,
  '28000',
  'Authentication is required before creating a workspace.',
  'workspace bootstrap requires an authenticated user'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.bootstrap_private_workspace('Owner A workspace', 'Asia/Singapore')$$,
  'an authenticated owner can bootstrap a private workspace'
);

select set_config(
  'test.workspace_a',
  public.bootstrap_private_workspace('Owner A workspace', 'Asia/Singapore')::text,
  true
);

select is(
  public.bootstrap_private_workspace('Ignored after bootstrap', 'Asia/Singapore'),
  current_setting('test.workspace_a')::uuid,
  'repeated bootstrap returns the same private workspace'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'an owner can read only their own profile'
);

select is(
  (select count(*) from public.workspaces),
  1::bigint,
  'an owner can read their one workspace'
);

select is(
  (select count(*) from public.workspace_memberships),
  1::bigint,
  'an owner can read their matching membership'
);

select throws_ok(
  $$select public.bootstrap_private_workspace('Bad timezone', 'Not/ARealTimezone')$$,
  '22023',
  'A valid IANA timezone is required.',
  'workspace bootstrap validates IANA timezones'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.bootstrap_private_workspace('Owner B workspace', 'America/Los_Angeles')$$,
  'a separate authenticated owner can bootstrap their own workspace'
);

select set_config(
  'test.workspace_b',
  public.bootstrap_private_workspace('Owner B workspace', 'America/Los_Angeles')::text,
  true
);

select is(
  (select count(*) from public.workspaces),
  1::bigint,
  'owner B cannot enumerate owner A workspaces'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(
  (
    select count(*)
      from public.workspaces
     where id = current_setting('test.workspace_b')::uuid
  ),
  0::bigint,
  'owner A cannot read owner B workspace by ID'
);

select throws_ok(
  $$select public.pull_changes(current_setting('test.workspace_b')::uuid, 0, 100)$$,
  '42501',
  'The requested workspace is not available to this user.',
  'owner A cannot pull owner B changes'
);

select throws_ok(
  $$update public.workspaces set name = 'Bypass attempt'$$,
  '42501',
  'permission denied for table workspaces',
  'browser role has no direct workspace write grant'
);

select * from finish();
rollback;
