# RM Calendar - Sync Contract

**Status:** Local contract implemented; remote service not provisioned  
**Last updated:** 2026-07-24  
**Depends on:** [Data and Sync Architecture](Data-Sync-Architecture.md), [Database Schema Plan](Database-Schema-Plan.md), and [Phase 4 Milestone 4 Prep](Phase-4-Milestone-4-Prep.md)

## 1. Purpose

This contract fixes the shape and safety rules for future authenticated synchronization before any database, account provider, or remote endpoint is enabled.

It has two explicit RPC-style operations:

~~~text
pull_changes(workspace_id, after_cursor, page_size)
apply_sync_batch(workspace_id, operations[])
~~~

The browser's local Coordinator and contract types already use these concepts through an injected transport. No live transport is configured in the product.

## 2. Operation envelope

Every pushed operation is immutable and retry-safe:

~~~json
{
  "operationId": "device-generated UUID",
  "workspaceId": "device-generated UUID",
  "sequence": 42,
  "kind": "complete_activity",
  "entityType": "activity",
  "entityId": "device-generated UUID",
  "baseRevision": 7,
  "dependsOnOperationIds": ["prior-operation-id"],
  "payload": {
    "record": { "canonical-record-fields-only": true },
    "context": { "only-when-the-command-needs-linked-records": true }
  }
}
~~~

The operation ID is an idempotency key. Retrying the same ID must return the original result rather than create a second mutation.

The base revision is the observed server revision before the mutation. An operation that depends on an acknowledged earlier mutation is updated locally to that newer server revision before it is sent.

### Current locally proven server slice

The local Supabase test database currently accepts these remote-safe creation
operations: `create_contact`, `create_household`, `create_place`,
`create_activity`, `quick_capture_activity`, `create_task`, and `create_note`.
Activity creates preserve an optional primary-person link and append immutable
history; Task creates append immutable history. Each successful operation also
has a change-log row and an idempotency receipt.

The remaining operation kinds are intentionally rejected for now. In
particular, a remote `create_follow_up` must not be enabled until the client can
acknowledge the source, target, and link atomically without leaving either local
target falsely pending.

## 3. Compound follow-up operation

Create-follow-up is one logical remote operation, not a generic insert of unrelated rows.

Its payload includes:

- the Follow-up link;
- the completed source Activity;
- the carried source primary Contact when present;
- exactly one target Task or Activity; and
- the source revision expected by the compound command.

The future server RPC must atomically create the target, Follow-up link, required history/change-log rows, and mutation receipt. If any invariant fails, it must create none of them.

## 4. Batch response

Each submitted operation receives one outcome:

~~~text
applied            The server committed the operation and returns a server revision.
already_applied    The immutable operation ID was previously acknowledged; return its prior revision.
retry              Transient service/transport issue; retain queued work with retry metadata.
conflict           A stale semantic edit; keep local and remote versions for a user decision.
rejected           Authentication, authorization, validation, or dependency failure; block the operation.
~~~

Batch-level authentication/transport failure must never delete local operations. A mixed batch reports outcomes per operation so one rejected operation does not hide the state of unrelated work.

## 5. Pull contract

Pull uses an opaque cursor rather than raw record IDs:

~~~json
{
  "changes": [
    {
      "changeId": "opaque server change identifier",
      "entityType": "activity",
      "entityId": "UUID",
      "revision": 8,
      "changedAt": "ISO 8601 timestamp",
      "record": { "canonical-record-fields-only": true }
    }
  ],
  "nextCursor": "opaque cursor",
  "hasMore": false
}
~~~

The local cursor may advance only after the entire page is durably committed to IndexedDB. Incoming data must never silently overwrite a locally pending semantic edit; it becomes a visible needs-attention conflict instead.

## 6. Privacy and diagnostics

Canonical synchronization payloads can contain user-owned record content because a remote service cannot reproduce a mutation without the record data. They remain private transport data.

Diagnostics are intentionally narrower:

~~~text
operation ID, workspace ID, sequence, operation kind, entity type/ID,
attempt count, status, and error code
~~~

They must never include a person name, note body, objective, outcome, address, authentication token, or raw payload body.

## 7. Transport boundary

The client contract exposes a transport with:

~~~text
applySyncBatch(request) -> batch response
pullChanges(request) -> cursor page
~~~

The current tests inject a local fake transport. A future Supabase adapter must be the only implementation that knows about Supabase RPC/auth details. It must use the authenticated browser session and a publishable key only; service-role credentials never belong in the web application.

## 8. External-service gate

This contract does not authorize or imply:

- creating a Supabase project;
- enabling email OTP or configuring SMTP;
- transmitting local records;
- adding real users, real data, domains, or credentials.

Those steps require explicit founder authorization and the RLS/migration/consent gates in the implementation plan.
