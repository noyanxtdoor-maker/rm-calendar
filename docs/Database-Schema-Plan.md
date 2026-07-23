# RM Calendar — Database and Sync Schema Plan

**Version:** 0.1  
**Status:** Phase 3 blueprint; local migration foundation verified, hosted application still gated  
**Last updated:** 2026-07-24  
**Depends on:** [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md), [Domain Model](Domain-Model.md), [Business Rules](Business-Rules.md), [Data and Sync Architecture](Data-Sync-Architecture.md)

## 1. Purpose and boundaries

This document maps the approved conceptual domain into local IndexedDB tables and remote Supabase/Postgres tables. It is deliberately detailed enough for a migration author to implement without inventing product behavior, but it is not SQL yet.

The beta is one private owner per workspace. The schema retains `workspace_memberships` so a future team model is possible, but no beta screen or API exposes sharing, invitations, roles beyond owner, or official Church data.

## 2. Naming and data conventions

| Convention | Decision |
| --- | --- |
| IDs | UUID generated on the client with `crypto.randomUUID()` before local write |
| Database names | `snake_case`; TypeScript names use `camelCase` adapters |
| Time | `timestamptz` remotely; ISO strings/`Date` values locally; all-day values are ISO dates separate from instants |
| Soft deletion | `deleted_at` tombstone, never immediate physical delete in beta |
| Revision | Positive server-owned `bigint`; client sends `base_revision` only in mutation operation |
| Client mutation time | `client_updated_at` is set by the local command and stored with the canonical record for user-facing ordering/diagnostics; it never overrides a revision conflict |
| Ownership | Every workspace-scoped synchronizable record has non-null `workspace_id`; `workspaces` uses its own `id` as the scope root and `profiles` is an identity exception |
| Sensitive text | Notes/outcomes/objectives live in canonical records only; sync diagnostics/logs never include their bodies |
| Multi-workspace safety | Every relationship must link rows with the same `workspace_id`; client validation is backed by server constraint/trigger/RPC validation |

### Record envelope

Every workspace-scoped synchronizable entity includes this envelope in addition to domain fields. `profiles` and the root `workspaces` row use their documented identity/root fields instead of pretending to belong to another workspace:

```text
id, workspace_id, created_at, created_by, updated_at, updated_by,
client_updated_at, deleted_at, revision
```

The local representation adds:

```text
sync_state: synced | pending | failed | needs_attention
pending_base_revision?: number
last_local_mutation_id?: UUID
```

`sync_state`, `pending_base_revision`, and retry metadata are local implementation fields. They do not replace the remote revision model.

## 3. Remote Postgres tables

### 3.1 Identity and workspace

| Table | Required columns | Constraints and notes |
| --- | --- | --- |
| `profiles` | `id` FK `auth.users`, `display_name`, envelope fields | Created from authenticated user; only profile owner can read/update in beta |
| `workspaces` | `id`, `owner_user_id`, `name`, `timezone`, `terminology_json`, envelope fields | Exactly one owner at beta creation and one beta workspace per owner via unique `owner_user_id`; timezone is an IANA zone; `owner_user_id` is non-null and set only by the workspace bootstrap RPC |
| `workspace_memberships` | `id`, `workspace_id`, `user_id`, `role`, `created_at` | Beta `CHECK (role = 'owner')`, unique `(workspace_id, user_id)`, and unique `(workspace_id)`; a deferred constraint trigger requires the sole row’s `user_id` to equal `workspaces.owner_user_id` |

`terminology_json` supports user-owned labels later without changing the domain: for example, display “Visit” while retaining internal `Activity` semantics.

### 3.2 People, households, and places

| Table | Required domain columns | Key constraints/indexes |
| --- | --- | --- |
| `contacts` | `display_name`, `display_name_normalized`, `phone_json`, `email_json`, `preferred_contact_method`, `first_seen_at`, envelope | `(workspace_id, display_name_normalized)` index, not unique; deleted rows excluded from normal search |
| `organizations` | `name`, `name_normalized`, `kind` (`household`, `group`, `other`), envelope | `(workspace_id, kind, name_normalized)` index |
| `contact_organizations` | `contact_id`, `organization_id`, `relationship_label`, envelope | unique `(contact_id, organization_id)`; both same workspace |
| `places` | `name`, `name_normalized`, `address_text`, `latitude`, `longitude`, `entrance_notes`, envelope | coordinate pair must be both null or both non-null; `(workspace_id, name_normalized)` index |
| `contact_places` | `contact_id`, `place_id`, `relationship_label`, `is_default`, envelope | unique `(contact_id, place_id)`; max one default place per contact enforced by partial unique index/trigger |

`phone_json` and `email_json` permit a small beta set of labels/values without creating a contact-import model. They must not be logged in diagnostics.

### 3.3 Activities, tasks, and history

| Table | Required domain columns | Key constraints/indexes |
| --- | --- | --- |
| `activities` | `title`, `activity_type`, `state`, `scheduled_date`, `scheduled_start_at`, `scheduled_end_at`, `schedule_timezone`, `actual_completed_at`, `objective_text`, `outcome_text`, `primary_place_id`, `cancel_reason`, envelope | See schedule/state constraints below; indexes `(workspace_id, scheduled_date)`, `(workspace_id, scheduled_start_at)`, `(workspace_id, state)` |
| `activity_contacts` | `activity_id`, `contact_id`, `is_primary`, `contact_display_name_snapshot`, envelope | unique `(activity_id, contact_id)`; one primary contact per activity via partial unique index/trigger; snapshot is captured on Activity completion/cancellation so historical work remains readable if the Contact is later purged |
| `activity_history` | `activity_id`, `event_type`, `previous_state`, `new_state`, `event_at`, `actor_user_id`, `event_payload_json`, envelope | append-only; `(workspace_id, activity_id, event_at)` index; trigger/RPC rejects updates/deletes except retention administration; payload contains lifecycle/schedule metadata only, never note or outcome body text |
| `tasks` | `title`, `state`, `due_date`, `due_at`, `priority`, `completed_at`, `cancel_reason`, `contact_id`, `organization_id`, `place_id`, `activity_id`, `parent_task_id`, envelope | `(workspace_id, state, due_date)`, `(workspace_id, due_at)`; follow-up Task has a due date |
| `task_history` | `task_id`, `event_type`, `previous_state`, `new_state`, `event_at`, `actor_user_id`, `event_payload_json`, envelope | append-only task lifecycle audit; `(workspace_id, task_id, event_at)` index; metadata-only payload and immutable after write |
| `follow_ups` | `source_activity_id`, `target_kind`, `target_task_id`, `target_activity_id`, envelope | one source + exactly one target; target must be newly created by the same follow-up command |
| `reminders` | `activity_id`, `task_id`, `remind_at`, `delivery_preference`, `dismissed_at`, envelope | SQL check requires exactly one parent; local in-app delivery first |

#### Activity schedule constraints

An Activity is one of these forms:

| State/form | Required | Forbidden |
| --- | --- | --- |
| `Draft` | title/type/objective may be incomplete; all schedule fields are `NULL` | `scheduled_date`, `scheduled_start_at`, `scheduled_end_at`, `schedule_timezone` |
| All-day `Scheduled` | `scheduled_date`, `schedule_timezone`; no start/end instant | `scheduled_start_at`, `scheduled_end_at` |
| Timed `Scheduled` | `scheduled_start_at`, `scheduled_end_at`, `schedule_timezone`; end after start | `scheduled_date` as the sole schedule source |
| `Completed` | `actual_completed_at`; original schedule preserved | missing completion time |
| `Cancelled` | optional cancellation reason | appearance in active agenda |

Use a database check/trigger and the same client command validator. All-day dates must not be constructed by converting a local midnight to UTC.

#### Historical contact-name snapshot

When an Activity transitions to `Completed` or `Cancelled`, its command/RPC writes the then-current Contact display name to `activity_contacts.contact_display_name_snapshot` for every linked Contact in the same transaction as the lifecycle history. The snapshot is immutable once the Activity is terminal. Normal people views continue to read the live Contact record; history views fall back to the snapshot when a Contact is soft-deleted or later physically purged under an approved retention policy.

#### Follow-up invariant

`follow_ups` uses a check equivalent to:

```text
target_kind = 'task'     AND target_task_id IS NOT NULL     AND target_activity_id IS NULL
OR
target_kind = 'activity' AND target_activity_id IS NOT NULL AND target_task_id IS NULL
```

The source Activity must be `Completed`. The target record and the Follow-up link are created only through `create_follow_up` as one local and remote transaction. A generic client-side insert into `follow_ups` is not granted.

#### Task and relationship checks

- A `Completed` Task requires `completed_at`; an `Open` or `Cancelled` Task does not retain a completion timestamp.
- A Task created by `create_follow_up` requires `due_date`; an independent Task may remain undated.
- `parent_task_id`, `contact_id`, `organization_id`, `place_id`, and `activity_id` on a Task must either be null or refer to a live/snapshot-preserved record in the same workspace.
- `reminders` uses `num_nonnulls(activity_id, task_id) = 1` (or equivalent) so an in-app reminder has exactly one parent.
- `notes` and `tag_assignments` use the same “exactly one non-null parent/target” check pattern described in their table rows.
- Link tables (`activity_contacts`, `contact_organizations`, `contact_places`) and primary references (`activities.primary_place_id`) are checked by RPC/trigger against the same workspace before they can be committed.

### 3.4 Notes, tags, drafts, and settings

| Table | Required columns | Notes |
| --- | --- | --- |
| `notes` | `body`, `is_pinned`, exactly one nullable FK among `contact_id`, `organization_id`, `place_id`, `activity_id`, `task_id`, envelope | One primary owner enforced by a check constraint; query indexes per parent FK |
| `tags` | `label`, `label_normalized`, `color_key`, envelope | unique `(workspace_id, label_normalized)` for live rows |
| `tag_assignments` | `tag_id`, `contact_id`/`organization_id`/`place_id`/`activity_id`/`task_id` | exactly one target; same-workspace validation |
| `drafts` | **local only**: `id`, `workspace_id`, `draft_kind`, `route_context_json`, `payload_json`, `updated_at` | never synchronizes; expires/cleans by local policy |
| `local_settings` | **local only**: `key`, `value_json`, `updated_at` | stores UI and device-only choices |

Notes are intentionally normalized with exactly one explicit parent FK instead of an unchecked polymorphic `parent_id`. This gives the database a way to validate the parent’s workspace and prevents a note from silently belonging to ambiguous records.

### 3.5 Sync, conflict, and retention tables

| Table | Location | Required columns | Purpose |
| --- | --- | --- | --- |
| `outbox_operations` | local only | `operation_id`, `workspace_id`, `sequence`, `kind`, `payload_json`, `base_revision`, `depends_on_json`, `status`, `attempt_count`, `next_retry_at`, `last_error_code`, `created_at` | durable delivery queue |
| `sync_metadata` | local only | `workspace_id`, `pull_cursor`, `last_success_at`, `last_attempt_at`, `last_error_code`, `sync_in_progress` | sync status/recovery |
| `conflicts` | local only initially | `id`, `workspace_id`, `entity_type`, `entity_id`, `local_snapshot_json`, `server_snapshot_json`, `detected_at`, `state` | user-resolvable conflict presentation |
| `change_log` | remote | `cursor` bigserial, `workspace_id`, `entity_type`, `entity_id`, `revision`, `operation_id`, `deleted_at`, `changed_at` | ordered pull feed; no note/outcome body duplicated here |
| `mutation_receipts` | remote | `operation_id`, `workspace_id`, `operation_kind`, `entity_ids_json`, `result_code`, `applied_at` | idempotency proof; no sensitive body payload |

`change_log` is append-only through triggers/functions. Pull functions return current canonical snapshots for the logged entity IDs (including tombstones) rather than duplicating sensitive snapshots in the change log.

## 4. Local Dexie schema and indexes

The first Dexie version should use explicit tables and the following index intent. Exact Dexie syntax is chosen during Milestone 0 and must be migration-tested with fake IndexedDB.

| Local table | Primary key | Query indexes required in beta |
| --- | --- | --- |
| `workspaces` | `id` | `owner_user_id`, `deleted_at` |
| `contacts` | `id` | `workspace_id`, `[workspace_id+display_name_normalized]`, `[workspace_id+deleted_at]` |
| `organizations` | `id` | `workspace_id`, `[workspace_id+kind]`, `[workspace_id+name_normalized]` |
| `places` | `id` | `workspace_id`, `[workspace_id+name_normalized]`, `[workspace_id+deleted_at]` |
| `contact_organizations` | `id` | `workspace_id`, `[workspace_id+contact_id]`, `[workspace_id+organization_id]` |
| `contact_places` | `id` | `workspace_id`, `[workspace_id+contact_id]`, `[workspace_id+place_id]`, `[workspace_id+is_default]` |
| `activities` | `id` | `workspace_id`, `[workspace_id+scheduled_start_at]`, `[workspace_id+scheduled_date]`, `[workspace_id+state]`, `[workspace_id+actual_completed_at]` |
| `activity_contacts` | `id` | `workspace_id`, `[workspace_id+activity_id]`, `[workspace_id+contact_id]` |
| `tasks` | `id` | `workspace_id`, `[workspace_id+state]`, `[workspace_id+due_date]`, `[workspace_id+due_at]` |
| `follow_ups` | `id` | `workspace_id`, `[workspace_id+source_activity_id]`, `[workspace_id+target_task_id]`, `[workspace_id+target_activity_id]` |
| `notes` | `id` | `workspace_id`, parent-FK indexes, `created_at`, `is_pinned` |
| `activity_history` | `id` | `workspace_id`, `[workspace_id+activity_id]`, `[workspace_id+event_at]` |
| `task_history` | `id` | `workspace_id`, `[workspace_id+task_id]`, `[workspace_id+event_at]` |
| `reminders` | `id` | `workspace_id`, `remind_at`, `dismissed_at` |
| `tags`, `tag_assignments` | `id` | `workspace_id`, tag/target indexes |
| `drafts` | `id` | `workspace_id`, `draft_kind`, `updated_at` |
| `outbox_operations` | `operation_id` | `workspace_id`, `[workspace_id+sequence]`, `[workspace_id+status]`, `next_retry_at` |
| `sync_metadata` | `workspace_id` | none needed |
| `conflicts` | `id` | `workspace_id`, `[workspace_id+entity_type]`, `[workspace_id+entity_id]`, `state` |

Dexie transactions must cover every table affected by a command. For example, `completeActivity` needs `activities`, `activity_contacts` (for immutable name snapshots), `activity_history`, potentially `notes`, `outbox_operations`, and possibly `sync_metadata`; `completeTask` needs `tasks`, `task_history`, and `outbox_operations`; `createFollowUp` adds a target Task or Activity, `follow_ups`, the applicable target-history record, a source `follow_up_created` history event, and any carried-forward Contact/Place link/reference before its outbox operation is durable.

## 5. Remote RLS and authorization plan

### 5.1 Access policy model

- Beta owner access is determined by the unique active `workspace_memberships` row where `user_id = auth.uid()`, `role = 'owner'`, and the row matches `workspaces.owner_user_id`.
- Every workspace-scoped domain table has `workspace_id` and RLS enabled; identity/root tables use owner-specific RLS policies.
- `SELECT` policies require active membership in that workspace.
- Ordinary browser DML is not granted for lifecycle-sensitive tables; writes flow through approved RPC functions so revision/idempotency/history rules cannot be bypassed.
- `SECURITY INVOKER` is the default for RPC functions. The narrowly scoped bootstrap helper may use `SECURITY DEFINER` only to create a first private workspace/membership atomically; it must set a safe `search_path`, bind the owner to `auth.uid()`, be non-enumerating, and have a documented security review. Any later `SECURITY DEFINER` helper needs the same constraints.
- The service-role key never reaches the browser and is only allowed in server-side administration/migration tooling.

Supabase’s RLS guidance states that RLS must be enabled for exposed-schema tables and can protect browser-accessed data when combined with Auth. See [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 5.2 Cross-workspace relationship enforcement

Foreign keys alone do not prove all linked rows share a workspace. Each write function/trigger must verify, for example:

- `activity_contacts.workspace_id = activities.workspace_id = contacts.workspace_id`;
- `activities.primary_place_id` points to a Place in the same workspace;
- Task direct links and Note/Tag assignments point to same-workspace parent record;
- source/target records of a Follow-up share the same workspace.

The local command layer performs the same checks for instant feedback; the server is authoritative.

## 6. RPC contract details

### 6.0 Bootstrap private workspace

```text
bootstrap_private_workspace(
  p_workspace_name text,
  p_timezone text
) -> { workspace_id: uuid }
```

This onboarding-only RPC is available to an authenticated user. If that user already owns a beta workspace, it returns that workspace; otherwise, in one transaction it creates/updates the user profile, creates one workspace with `owner_user_id = auth.uid()`, and creates its one matching `workspace_memberships` owner row. The unique beta `owner_user_id` constraint plus a unique-violation retry that rereads the owner’s workspace makes concurrent bootstrap requests converge on the same workspace. It validates a real IANA time zone and grants no ability to name another user as owner. It is not part of the normal offline outbox because first account/bootstrap requires an authenticated online session.

### 6.1 Pull changes

```text
pull_changes(
  p_workspace_id uuid,
  p_after_cursor bigint,
  p_page_size integer
) -> {
  changes: Array<{
    cursor: bigint,
    entity_type: string,
    entity_id: uuid,
    revision: bigint,
    deleted_at: timestamptz | null,
    record: jsonb
  }>,
  next_cursor: bigint,
  has_more: boolean
}
```

Rules:

1. Verify owner membership before reading.
2. Clamp page size to a documented safe maximum.
3. Return data in cursor order and include soft-deleted canonical rows.
4. Do not return records outside the requested workspace.
5. The client advances its durable cursor only after the entire page is committed to Dexie.

### 6.2 Apply sync batch

```text
apply_sync_batch(
  p_workspace_id uuid,
  p_operations jsonb
) -> Array<{
  operation_id: uuid,
  status: 'applied' | 'duplicate' | 'conflict' | 'rejected',
  entity_ids: uuid[],
  revisions: bigint[],
  error_code?: string,
  conflict?: { entity_type, entity_id, server_record, server_revision }
}>
```

Each `p_operations` item contains `operation_id`, `kind`, `base_revision` when the operation updates an existing record, `client_updated_at`, `payload`, and optional dependency operation IDs. The function validates timestamp format and payload shape, but treats `base_revision`—not client time—as conflict authority. It processes ready operations in caller-provided dependency order, but validates every payload independently. A failed/rejected operation does not silently mark later dependent operations successful. The client stops or skips dependencies according to their `depends_on_json` relationship.

### 6.3 Initial operation kinds

| Operation kind | Atomic records written |
| --- | --- |
| `create_contact` | contact + receipt + change log |
| `update_contact` | contact revision + receipt + change log |
| `create_place` | place + receipt + change log |
| `create_activity` | activity + links/history/reminder as applicable + receipt/change log |
| `update_activity` | activity revision + history if lifecycle/schedule transition + receipt/change log |
| `complete_activity` | completed activity + linked Contact-name snapshots + history + optional note + receipt/change log |
| `create_task` | task + receipt/change log |
| `update_task` | task revision + lifecycle history if needed + receipt/change log |
| `create_note` | note with exactly one validated parent + receipt/change log |
| `update_note` | note revision with the same validated parent rule + receipt/change log |
| `create_follow_up` | target task/activity + target creation history + source `follow_up_created` history + carried Contact/Place link/reference + follow-up link + receipt/change-log rows as one transaction |
| `soft_delete` | tombstone + receipt + change log |
| `restore_record` | clears a tombstone with expected revision + receipt/change log; never silently restores separately deleted related records |
| `resolve_conflict` | chosen/merged record revision + history if relevant + receipt/change log |

No generic “execute arbitrary table mutation” RPC is permitted.

For `create_follow_up`, carried context is encoded as `tasks.contact_id`/`tasks.place_id` for a Task target, or as one primary `activity_contacts` link plus `activities.primary_place_id` for an Activity target. The command must create only the context values that still exist and that the user left selected before saving.

## 7. Revision and trigger behavior

1. `created_at`, `created_by`, and initial `revision = 1` are set server-side.
2. An accepted update must include its expected `base_revision`.
3. If expected revision does not equal the current revision, return a conflict payload; do not update the row.
4. On accepted mutation, increment revision, set `updated_at`/`updated_by`, and insert one `change_log` row for the affected record.
5. Activity and Task lifecycle changes append their respective immutable `activity_history` or `task_history` events. History payloads contain state/schedule metadata only, not note/outcome body text; terminal Activity transitions also snapshot linked Contact display names.
6. Soft deletion and explicit restoration each increment revision and produce a change-log row. Restore clears only the named record’s tombstone and requires its expected revision.
7. Duplicate operation ID returns the stored receipt result without changing revision or history.

## 8. Migration order

| Migration | Scope | Must prove |
| --- | --- | --- |
| `001_identity_workspace` | profiles, workspaces, exact-one-owner membership invariant, bootstrap RPC, RLS helper | one owner matches the workspace owner and cannot access another workspace |
| `002_people_places` | contacts, organizations, links, places, RLS | same-workspace links only |
| `003_activities_tasks` | activities, links, tasks, notes, reminders, activity/task history | state/schedule constraints and immutable history |
| `004_followups_sync` | follow-ups, change log, receipts, RPC functions | atomic follow-up and idempotent duplicate retry |
| `005_privacy_retention` | tombstone cleanup support, export/delete support, audit-safe diagnostics | deletion cannot resurrect from stale client |

Each migration must be reversible in development, reviewed as SQL, and tested against a clean local Supabase instance before it is applied to a hosted project.

## 9. Data export and deletion shape

### Export

The beta export command produces a user-owned archive of canonical workspace records in JSON plus a simple readable CSV/JSON activity summary. It must include relationship IDs and export version metadata, not authentication tokens or diagnostics.

### Account/workspace deletion

1. User asks to export first (optional) and confirms deletion online.
2. Server verifies owner identity and creates a deletion job/request record.
3. Workspace data becomes inaccessible immediately through RLS/tombstones.
4. Retention/purge behavior follows the founder-approved policy; support can report only status, not sensitive note content.
5. Local app clears workspace data and signs out after confirmation.

This is an implementation blueprint, not legal/privacy-policy text. Public wording requires owner review for the target launch countries.

## 10. Schema verification checklist

- [ ] Every remote data table has `workspace_id`, RLS, and a tested owner-isolation policy.
- [ ] Every local synchronizable record has envelope fields and is queryable by its beta screen.
- [ ] Local `create_follow_up` transaction either writes all target/link/outbox records or none.
- [ ] Remote `create_follow_up` RPC either writes all target/link/receipt/change records or none.
- [ ] Retried `operation_id` produces no duplicate record/history/follow-up.
- [ ] Every Task state transition appends one immutable `task_history` event.
- [ ] A standalone Note and a post-completion Note synchronize through explicit `create_note`/`update_note` operations without a generic table-write escape hatch.
- [ ] A terminal Activity captures immutable readable Contact-name snapshots before a linked Contact can be purged.
- [ ] Restore requires an expected revision, never silently restores related tombstones, and synchronizes once.
- [ ] A workspace has exactly one membership, it has `owner` role, and it matches `workspaces.owner_user_id`.
- [ ] A stale revision produces explicit conflict data, not last-write-wins.
- [ ] All-day activities stay on their intended workspace date.
- [ ] Soft-deleted contacts remain readable in completed history snapshots and cannot be resurrected by a stale device.
- [ ] Sync logs/receipts/change metadata do not duplicate note/outcome content.
