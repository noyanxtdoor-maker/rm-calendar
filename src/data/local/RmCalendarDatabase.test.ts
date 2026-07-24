import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { acknowledgeLocalPrivacyNotice, activeWorkspaceId, clearAllLocalData, createLocalDemoContact, bootstrapLocalWorkspace, createRemoteWorkspace, DEMO_WORKSPACE_ID, PRIVACY_NOTICE_KEY, removeLocalCloudWorkspace, WORKSPACE_LIFECYCLE_KEY } from './workspace'
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

  it('clears local records and acknowledgement state without silently recreating a workspace', async () => {
    await bootstrapLocalWorkspace()
    await acknowledgeLocalPrivacyNotice()
    await createLocalDemoContact({ displayName: 'Clear this device' })

    await clearAllLocalData()

    expect(await rmCalendarDb.workspaces.count()).toBe(0)
    expect(await rmCalendarDb.contacts.count()).toBe(0)
    expect(await rmCalendarDb.outboxOperations.count()).toBe(0)
    expect(await rmCalendarDb.localSettings.get(PRIVACY_NOTICE_KEY)).toBeUndefined()
    expect((await rmCalendarDb.localSettings.get(WORKSPACE_LIFECYCLE_KEY))?.valueJson.state).toBe('cleared')
    await expect(bootstrapLocalWorkspace()).resolves.toBeUndefined()
  })

  it('removes a signed-out cloud workspace without deleting the separate fictional starter workspace', async () => {
    await bootstrapLocalWorkspace()
    await createRemoteWorkspace({
      id: '6c7d1196-4246-4d7b-9a75-7f88618f3997',
      name: 'Cloud planning space',
      timezone: 'UTC',
      ownerUserId: '6c7d1196-4246-4d7b-9a75-7f88618f3998'
    })

    await removeLocalCloudWorkspace('6c7d1196-4246-4d7b-9a75-7f88618f3997')

    expect(await rmCalendarDb.workspaces.get('6c7d1196-4246-4d7b-9a75-7f88618f3997')).toBeUndefined()
    expect((await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID))?.name).toBe('Personal planning space')
    await expect(activeWorkspaceId()).resolves.toBe(DEMO_WORKSPACE_ID)
  })
})
