# RM Calendar - Phase 4, Milestone 4: Local Sync Contract Preparation

**Status:** Local preparation complete; authenticated remote sync not started  
**Completed:** 2026-07-24  
**Depends on:** [Phase 4 Milestone 3](Phase-4-Milestone-3.md), [Sync Contract](Sync-Contract.md), [Data and Sync Architecture](Data-Sync-Architecture.md), and [Database Schema Plan](Database-Schema-Plan.md)

## 1. Outcome

This is a deliberately bounded preparation slice for M4. It creates and verifies the local rules that an authenticated remote adapter must obey, without creating any external project, account flow, or network connection.

The product now has a real local contract for:

~~~text
durable outbox
  -> dependency ordering
  -> immutable operation ID
  -> canonical sync payload
  -> apply / retry / conflict / rejection result
  -> safe local acknowledgement
~~~

## 2. Delivered implementation

- Added explicit Sync operation kinds and entity types rather than free-form string operations.
- Added operation-level base revisions and entity metadata to every newly queued local operation.
- Chained mutations of the same record now depend on the prior local operation.
  - A later edit of an unsynced record retains its original server baseline.
  - After an earlier operation is acknowledged, the next dependent operation receives the returned server revision before it can be sent.
- Related local work now carries dependency links where needed:
  - newly selected unsynced Contacts/Places precede linked Activity/Task/Note work;
  - a Follow-up waits for its source completion and relevant carried context.
- Added a canonical payload builder.
  - It strips local-only sync fields before transport.
  - Activity payloads include primary Contact context.
  - Follow-up payloads include source, target, and source-revision context needed for a future atomic RPC.
- Added an injected local Sync Coordinator with no provider dependency.
  - sends only dependency-ready operations;
  - safely handles applied and idempotent acknowledgements;
  - retains retryable failures with backoff metadata;
  - writes a local needs-attention conflict rather than overwriting a pending record;
  - never logs record bodies.
- Added a phone-width Sync Status screen.
  - It transparently states that cloud sync is not configured.
  - It displays only safe operation metadata, never person/note/outcome content.

## 3. Verification evidence

The local contract test suite proves:

1. Contact and linked Activity operations dispatch in dependency order.
2. Outgoing payloads exclude local-only sync state.
3. Idempotent acknowledgements safely remove the queued operation and mark the record synced.
4. Retryable faults remain queued with an error code and retry timing.
5. Revision conflicts preserve a local conflict record and set the affected record to needs attention.
6. A follow-up carries source/target context and receives the source revision after its completion is acknowledged.
7. Sync diagnostics do not expose private text.

Commands run successfully:

~~~text
npm run verify
  typecheck: pass
  lint: pass
  Vitest: 15 passed
  production Vite build: pass
  PWA service worker and manifest: emitted

npm run test:e2e
  Playwright Chromium mobile: 4 passed
  M1, M2, and M3 offline flows remain green
  M4-prep Sync Status shows queued local work without exposing private record text
  no horizontal overflow is observed at phone width
~~~

## 4. What this does not do

This is **not** completed M4 authenticated sync. It does not:

- create or contact a Supabase project;
- contain a Supabase SDK, URL, publishable key, service-role key, email provider, or account screen;
- perform a real pull/apply network request;
- authenticate a user, create a remote workspace, execute RLS, or invite a beta user;
- claim that local records have been backed up or synchronized.

The local screen intentionally says “Cloud sync is not set up.”

## 5. Required authority before M4 can finish

The founder must explicitly authorize all of the following before external M4 work begins:

1. the named Supabase project/environment and where beta data may be stored;
2. the authentication/OTP email approach, sender, and redirect policy;
3. creating remote migrations/RLS/RPC resources;
4. use of a domain/hosting environment for authenticated testing.

After approval, the next implementation sequence is:

1. write and test Supabase migrations/RLS with fictional data;
2. implement the remote RPC adapter against [Sync Contract](Sync-Contract.md);
3. add authenticated workspace bootstrap and foreground pull/push;
4. test two isolated signed-in profiles, idempotent retry, and visible conflict recovery;
5. only then move to beta-readiness controls.
