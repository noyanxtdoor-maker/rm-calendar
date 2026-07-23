# RM Calendar — Supabase Environment Gate

**Status:** Local migration foundation verified — no RM Calendar cloud project is linked or configured  
**Last updated:** 2026-07-24

## What is in this repository now

- Versioned migrations for the identity/private-workspace boundary, people/places, activities/tasks/notes, and the follow-up/sync-journal schema.
- Row-level security (RLS) that lets an authenticated beta owner read only their own profile, root workspace, and membership.
- A narrowly scoped `bootstrap_private_workspace(name, timezone)` RPC. It binds ownership to `auth.uid()`, validates an IANA timezone, and atomically creates or recovers one private workspace.
- A guarded browser configuration reader. Remote sync remains off when configuration is missing or partial.
- A reviewed, locally executed `pull_changes` migration exists; `apply_sync_batch` does not exist yet and domain table writes remain denied to browser clients.
- No Supabase URL, browser key, service-role key, SMTP secret, user, user-owned content, or live database connection.

## Explicitly out of scope until a dedicated project is approved

The existing Supabase project visible in this workstation is named **PickUrVeggieFarm ERP**. It is not RM Calendar and must not be linked, migrated, or used for this project.

Before any cloud connection, the founder must either create a new RM Calendar Supabase project or explicitly identify an already dedicated empty project. Do not reuse another product's project just because it is available in the CLI.

## Safe activation sequence

1. Create or nominate a new, empty **RM Calendar** Supabase project.
2. Start Docker Desktop and run the migrations and RLS tests against a clean local Supabase instance first.
3. Review the migration SQL, RLS policies, RPC permissions, and test output.
4. Link only the approved dedicated project, then apply reviewed migrations.
5. Configure the browser-only values in a local `.env` file:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-browser-key
   ```

6. Keep all privileged credentials server-side. A `VITE_*` setting is public to browser users and must never contain a service-role key, database password, SMTP password, or other secret.
7. Configure email OTP, custom SMTP, redirect URLs, privacy copy, and deployment only after the data layer/RLS tests pass.

## Local verification evidence

On 2026-07-24, a clean local RM Calendar Supabase stack applied every migration, passed `supabase db lint --local --fail-on error`, and passed the 12-test pgTAP suite in `supabase/tests/001_identity_workspace.pgtap.sql`.

The suite uses two fictional local Auth users and proves:

- unauthenticated bootstrap is rejected;
- a private workspace is bootstrap-idempotent;
- an owner can see only their own profile, workspace, and membership;
- a second owner cannot enumerate or pull the first owner's workspace;
- direct browser-role workspace mutation is denied.

To reproduce the local verification:

```powershell
supabase start
supabase db reset
supabase db lint --local --fail-on error
supabase test db --local supabase/tests
```

The next migration will add `apply_sync_batch`. It must prove owner isolation, idempotent receipts, revision conflicts, and atomic follow-up creation with fictional data before it is connected to a hosted project.
