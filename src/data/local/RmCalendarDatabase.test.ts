import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalDemoContact, bootstrapLocalWorkspace, DEMO_WORKSPACE_ID } from './workspace'
import { deleteRmCalendarDatabase, rmCalendarDb, RmCalendarDatabase } from './RmCalendarDatabase'

describe('Milestone 1 local workspace', () => {
  beforeEach(async () => {
    await deleteRmCalendarDatabase()
  })

  afterEach(async () => {
    await deleteRmCalendarDatabase()
  })

  it('persists a local person when the database is reopened', async () => {
    await bootstrapLocalWorkspace()
    const created = await createLocalDemoContact({ displayName: 'Persistence check' })

    rmCalendarDb.close()
    await rmCalendarDb.open()

    expect((await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID))?.name).toBe('Personal planning space')
    expect((await rmCalendarDb.contacts.get(created.id))?.displayName).toBe('Persistence check')
  })

  it('upgrades a version-one local database without dropping its core records', async () => {
    const databaseName = 'rm-calendar-upgrade-test'
    const legacy = new Dexie(databaseName)
    legacy.version(1).stores({
      workspaces: 'id, ownerUserId, deletedAt',
      contacts: 'id, workspaceId, [workspaceId+displayNameNormalized], [workspaceId+deletedAt]',
      activities:
        'id, workspaceId, [workspaceId+scheduledStartAt], [workspaceId+scheduledDate], [workspaceId+state], [workspaceId+actualCompletedAt]',
      tasks: 'id, workspaceId, [workspaceId+state], [workspaceId+dueDate], [workspaceId+dueAt]',
      localSettings: 'key, updatedAt'
    })
    await legacy.open()
    await legacy.table('contacts').add({
      id: 'legacy-person',
      workspaceId: 'legacy-workspace',
      displayName: 'Legacy person',
      displayNameNormalized: 'legacy person'
    })
    legacy.close()

    const upgraded = new RmCalendarDatabase(databaseName)
    await upgraded.open()

    expect((await upgraded.contacts.get('legacy-person'))?.displayName).toBe('Legacy person')
    expect(await upgraded.places.count()).toBe(0)

    upgraded.close()
    await Dexie.delete(databaseName)
  })
})
