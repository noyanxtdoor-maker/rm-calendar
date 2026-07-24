import { describe, expect, it } from 'vitest'
import identityMigration from '../../../supabase/migrations/20260724090000_identity_workspace.sql?raw'
import peoplePlacesMigration from '../../../supabase/migrations/20260724091000_people_places.sql?raw'
import activitiesTasksMigration from '../../../supabase/migrations/20260724092000_activities_tasks.sql?raw'
import followUpsSyncMigration from '../../../supabase/migrations/20260724093000_followups_sync_schema.sql?raw'
import pullChangesMigration from '../../../supabase/migrations/20260724094000_pull_changes.sql?raw'
import applySyncSimpleRecordsMigration from '../../../supabase/migrations/20260724095000_apply_sync_simple_records.sql?raw'
import applySyncLifecycleTransitionsMigration from '../../../supabase/migrations/20260724103000_apply_sync_lifecycle_transitions.sql?raw'
import applySyncFollowUpMigration from '../../../supabase/migrations/20260724110000_apply_sync_follow_up.sql?raw'
import pullRelatedContextMigration from '../../../supabase/migrations/20260724120000_pull_related_context.sql?raw'
import focusGroupsMigration from '../../../supabase/migrations/20260724130000_focus_groups.sql?raw'
import focusGroupUpdatesMigration from '../../../supabase/migrations/20260724140000_focus_group_updates.sql?raw'

describe('Supabase identity migration guardrails', () => {
  it('keeps the private-owner boundary and bootstrap RPC protected in source control', () => {
    const sql = identityMigration.toLocaleLowerCase()

    expect(sql).toContain('create table public.profiles')
    expect(sql).toContain('create table public.workspaces')
    expect(sql).toContain('create table public.workspace_memberships')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('create constraint trigger workspace_memberships_match_private_owner')
    expect(sql).toContain('security definer')
    expect(sql).toContain('set search_path = public, pg_temp')
    expect(sql).toContain('revoke all on function public.bootstrap_private_workspace(text, text) from public')
    expect(sql).toContain('grant execute on function public.bootstrap_private_workspace(text, text) to authenticated')
    expect(sql).not.toContain('service_role')
  })

  it('keeps each currently migrated workspace table behind RLS and browser read-only grants', () => {
    const sql = [
      identityMigration,
      peoplePlacesMigration,
      activitiesTasksMigration,
      followUpsSyncMigration,
      pullChangesMigration,
      pullRelatedContextMigration,
      focusGroupsMigration,
      focusGroupUpdatesMigration,
      applySyncSimpleRecordsMigration,
      applySyncLifecycleTransitionsMigration,
      applySyncFollowUpMigration
    ]
      .join('\n')
      .toLocaleLowerCase()

    for (const table of [
      'contacts',
      'organizations',
      'places',
      'activities',
      'tasks',
      'notes',
      'follow_ups',
      'change_log',
      'mutation_receipts'
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`)
    }

    expect(sql).toContain('revoke all on table')
    expect(sql).not.toContain('grant insert on table public.contacts to authenticated')
    expect(sql).not.toContain('grant update on table public.activities to authenticated')
    expect(sql).not.toContain('grant delete on table public.tasks to authenticated')
  })

  it('keeps pull access owner-scoped, cursor-bounded, and inaccessible to public callers', () => {
    const sql = [pullChangesMigration, pullRelatedContextMigration].join('\n').toLocaleLowerCase()

    expect(sql).toContain('create or replace function public.pull_changes')
    expect(sql).toContain('if not public.is_active_workspace_owner(p_workspace_id)')
    expect(sql).toContain('limit v_limit + 1')
    expect(sql).toContain("'nextcursor'")
    expect(sql).toContain('revoke all on function public.pull_changes(uuid, bigint, integer) from public')
    expect(sql).toContain('grant execute on function public.pull_changes(uuid, bigint, integer) to authenticated')
  })

  it('pulls the minimum Activity and Task context needed for a second device without opening direct table access', () => {
    const sql = pullRelatedContextMigration.toLocaleLowerCase()

    expect(sql).toContain('create or replace function public.sync_pull_related_context')
    expect(sql).toContain("'primarycontact'")
    expect(sql).toContain("'history'")
    expect(sql).toContain('revoke all on function public.sync_pull_related_context(uuid, text, uuid) from public')
  })

  it('limits batch mutation to the reviewed RPC and keeps receipt idempotency in the database', () => {
    const sql = [applySyncSimpleRecordsMigration, applySyncLifecycleTransitionsMigration, applySyncFollowUpMigration]
      .join('\n')
      .toLocaleLowerCase()

    expect(sql).toContain('create or replace function public.apply_sync_batch')
    expect(sql).toContain("p_table not in ('contacts', 'organizations', 'places')")
    expect(sql).toContain('insert into public.mutation_receipts')
    expect(sql).toContain("'already_applied'")
    expect(sql).toContain('revoke all on function public.apply_sync_batch(uuid, jsonb) from public')
    expect(sql).toContain('grant execute on function public.apply_sync_batch(uuid, jsonb) to authenticated')
  })

  it('keeps Follow-up application atomic and revision-aware in the reviewed migration source', () => {
    const sql = applySyncFollowUpMigration.toLocaleLowerCase()

    expect(sql).toContain('create or replace function public.sync_apply_follow_up_operation')
    expect(sql).toContain("v_source.state <> 'completed'")
    expect(sql).toContain('v_source.revision <> v_source_base_revision')
    expect(sql).toContain("'entityrevisions'")
    expect(sql).toContain('insert into public.follow_ups')
    expect(sql).toContain('insert into public.mutation_receipts')
    expect(sql).not.toContain('grant execute on function public.sync_apply_follow_up_operation')
  })

  it('keeps focus-group membership atomic, owner-scoped, and unavailable for direct browser writes', () => {
    const sql = [focusGroupsMigration, focusGroupUpdatesMigration].join('\n').toLocaleLowerCase()

    expect(sql).toContain('create or replace function public.sync_apply_focus_group_operation')
    expect(sql).toContain("p_operation ->> 'kind' <> 'create_focus_group'")
    expect(sql).toContain('insert into public.contact_organizations')
    expect(sql).toContain("'memberlinks'")
    expect(sql).toContain("'create_focus_group'")
    expect(sql).toContain('revoke all on function public.sync_apply_focus_group_operation')
    expect(sql).not.toContain('grant insert on table public.contact_organizations to authenticated')
  })

  it('keeps focus-group updates revision-checked and sends removed members as tombstones', () => {
    const sql = focusGroupUpdatesMigration.toLocaleLowerCase()

    expect(sql).toContain('create or replace function public.sync_apply_update_focus_group_operation')
    expect(sql).toContain("p_operation ->> 'kind' <> 'update_focus_group'")
    expect(sql).toContain('v_group.revision <> v_base_revision')
    expect(sql).toContain('deleted_at = v_link_deleted_at')
    expect(sql).toContain("'update_focus_group'")
    expect(sql).toContain('revoke all on function public.sync_apply_update_focus_group_operation')
    expect(sql).not.toContain('grant update on table public.contact_organizations to authenticated')
  })
})
