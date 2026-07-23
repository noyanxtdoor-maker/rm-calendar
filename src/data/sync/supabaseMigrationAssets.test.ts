import { describe, expect, it } from 'vitest'
import identityMigration from '../../../supabase/migrations/20260724090000_identity_workspace.sql?raw'
import peoplePlacesMigration from '../../../supabase/migrations/20260724091000_people_places.sql?raw'
import activitiesTasksMigration from '../../../supabase/migrations/20260724092000_activities_tasks.sql?raw'
import followUpsSyncMigration from '../../../supabase/migrations/20260724093000_followups_sync_schema.sql?raw'

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
    const sql = [identityMigration, peoplePlacesMigration, activitiesTasksMigration, followUpsSyncMigration]
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
})
