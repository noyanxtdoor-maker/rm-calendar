import { createLocalDemoContactInputSchema, normalizeDisplayName } from '../../domain/schemas'
import type {
  ActivityContactRecord,
  ActivityHistoryRecord,
  ActivityRecord,
  ContactRecord,
  PlaceRecord,
  TaskRecord,
  WorkspaceRecord
} from '../../domain/models'
import { createLocalId } from '../../lib/ids'
import { atLocalTime, localIsoDate, localTimeZone } from '../../lib/time'
import { rmCalendarDb } from './RmCalendarDatabase'

export const DEMO_WORKSPACE_ID = 'rm-calendar-private-demo'
export const ACTIVE_WORKSPACE_KEY = 'active-workspace-id'
export const WORKSPACE_LIFECYCLE_KEY = 'workspace-lifecycle'
export const PRIVACY_NOTICE_KEY = 'privacy-notice'
export const PRIVACY_NOTICE_VERSION = 1

type WorkspaceLifecycle = 'active' | 'cleared'

function nowIso() {
  return new Date().toISOString()
}

function localEnvelope(id: string, workspaceId: string, timestamp: string) {
  return {
    id,
    workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
    clientUpdatedAt: timestamp,
    revision: 1,
    syncState: 'pending' as const,
    pendingBaseRevision: 0
  }
}

function createFictionalSeed(workspace: WorkspaceRecord, timestamp: string) {
  const today = new Date()
  const scheduledDate = localIsoDate(today, workspace.timezone)
  const people: ContactRecord[] = [
    {
      ...localEnvelope('contact-avery-brooks', workspace.id, timestamp),
      displayName: 'Avery Brooks',
      displayNameNormalized: 'avery brooks',
      firstSeenAt: timestamp,
      preferredContactMethod: 'message'
    },
    {
      ...localEnvelope('contact-jordan-lee', workspace.id, timestamp),
      displayName: 'Jordan Lee',
      displayNameNormalized: 'jordan lee',
      firstSeenAt: timestamp,
      preferredContactMethod: 'in-person'
    },
    {
      ...localEnvelope('contact-mina-santos', workspace.id, timestamp),
      displayName: 'Mina Santos',
      displayNameNormalized: 'mina santos',
      firstSeenAt: timestamp,
      preferredContactMethod: 'phone'
    }
  ]

  const place: PlaceRecord = {
    ...localEnvelope('place-community-library', workspace.id, timestamp),
    name: 'Community library',
    nameNormalized: 'community library',
    addressText: 'Fictional demo place'
  }

  const activities: ActivityRecord[] = [
    {
      ...localEnvelope('activity-avery-visit', workspace.id, timestamp),
      title: 'Avery visit',
      activityType: 'visit',
      state: 'scheduled',
      scheduledStartAt: atLocalTime(today, 10, 0),
      scheduledEndAt: atLocalTime(today, 10, 45),
      scheduleTimezone: workspace.timezone,
      objectiveText: 'Reconnect and agree on one next step.',
      primaryPlaceId: place.id
    },
    {
      ...localEnvelope('activity-weekly-focus', workspace.id, timestamp),
      title: 'Weekly focus',
      activityType: 'planning',
      state: 'scheduled',
      scheduledStartAt: atLocalTime(today, 16, 0),
      scheduledEndAt: atLocalTime(today, 16, 30),
      scheduleTimezone: workspace.timezone,
      objectiveText: 'Review the week and make a simple plan.'
    }
  ]

  const activityContacts: ActivityContactRecord[] = [
    {
      ...localEnvelope('activity-contact-avery', workspace.id, timestamp),
      activityId: 'activity-avery-visit',
      contactId: 'contact-avery-brooks',
      isPrimary: true
    }
  ]

  const activityHistory: ActivityHistoryRecord[] = activities.map((activity) => ({
    ...localEnvelope('history-' + activity.id, workspace.id, timestamp),
    activityId: activity.id,
    eventType: 'scheduled',
    newState: 'scheduled',
    eventAt: timestamp,
    eventPayloadJson: { source: 'fictional-starter-data' }
  }))

  const tasks: TaskRecord[] = [
    {
      ...localEnvelope('task-jordan-next-step', workspace.id, timestamp),
      title: 'Confirm a good time with Jordan',
      state: 'open',
      dueDate: scheduledDate,
      priority: 'normal',
      contactId: 'contact-jordan-lee'
    }
  ]

  return { people, place, activities, activityContacts, activityHistory, tasks }
}

async function workspaceLifecycle() {
  const setting = await rmCalendarDb.localSettings.get(WORKSPACE_LIFECYCLE_KEY)
  return setting?.valueJson.state as WorkspaceLifecycle | undefined
}

export async function activeWorkspaceId() {
  const setting = await rmCalendarDb.localSettings.get(ACTIVE_WORKSPACE_KEY)
  const id = setting?.valueJson.workspaceId
  return typeof id === 'string' && id.trim() ? id : DEMO_WORKSPACE_ID
}

export async function setActiveWorkspaceId(workspaceId: string) {
  await rmCalendarDb.localSettings.put({
    key: ACTIVE_WORKSPACE_KEY,
    valueJson: { workspaceId },
    updatedAt: nowIso()
  })
}

/**
 * Stores a newly bootstrapped server workspace locally without copying the
 * fictional starter data. New records receive UUIDs and can be synced; the
 * original demo remains intact and local-only for safe exploration.
 */
export async function createRemoteWorkspace(input: {
  id: string
  name: string
  timezone: string
  ownerUserId: string
}) {
  const timestamp = nowIso()
  const workspace: WorkspaceRecord = {
    id: input.id,
    name: input.name,
    timezone: input.timezone,
    ownerUserId: input.ownerUserId,
    terminologyJson: {
      activity: 'Visit',
      contact: 'Person',
      organization: 'Household'
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    clientUpdatedAt: timestamp,
    revision: 1,
    syncState: 'synced'
  }

  await rmCalendarDb.transaction('rw', ['workspaces', 'syncMetadata', 'localSettings'], async () => {
    const existing = await rmCalendarDb.workspaces.get(workspace.id)
    await rmCalendarDb.workspaces.put(existing ? { ...existing, ...workspace } : workspace)
    await rmCalendarDb.syncMetadata.put({
      workspaceId: workspace.id,
      syncInProgress: false
    })
    await setActiveWorkspaceId(workspace.id)
  })

  return workspace
}

export async function acknowledgeLocalPrivacyNotice() {
  await rmCalendarDb.localSettings.put({
    key: PRIVACY_NOTICE_KEY,
    valueJson: {
      version: PRIVACY_NOTICE_VERSION,
      acknowledgedAt: nowIso()
    },
    updatedAt: nowIso()
  })
}

export async function bootstrapLocalWorkspace() {
  await rmCalendarDb.open()

  const existing = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
  if (existing && !existing.deletedAt) {
    return existing
  }

  if ((await workspaceLifecycle()) === 'cleared') {
    return undefined
  }

  const timestamp = nowIso()
  const workspace: WorkspaceRecord = {
    id: DEMO_WORKSPACE_ID,
    name: 'Personal planning space',
    timezone: localTimeZone(),
    ownerUserId: 'local-device-owner',
    terminologyJson: {
      activity: 'Visit',
      contact: 'Person',
      organization: 'Household'
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    clientUpdatedAt: timestamp,
    revision: 1,
    syncState: 'pending'
  }
  const seed = createFictionalSeed(workspace, timestamp)

  await rmCalendarDb.transaction(
    'rw',
    ['workspaces', 'contacts', 'places', 'activities', 'activityContacts', 'activityHistory', 'tasks', 'localSettings', 'syncMetadata'],
    async () => {
      await rmCalendarDb.workspaces.put(workspace)
      await rmCalendarDb.contacts.bulkPut(seed.people)
      await rmCalendarDb.places.put(seed.place)
      await rmCalendarDb.activities.bulkPut(seed.activities)
      await rmCalendarDb.activityContacts.bulkPut(seed.activityContacts)
      await rmCalendarDb.activityHistory.bulkPut(seed.activityHistory)
      await rmCalendarDb.tasks.bulkPut(seed.tasks)
      await rmCalendarDb.localSettings.put({
        key: WORKSPACE_LIFECYCLE_KEY,
        valueJson: { state: 'active' },
        updatedAt: timestamp
      })
      if (!await rmCalendarDb.localSettings.get(ACTIVE_WORKSPACE_KEY)) {
        await setActiveWorkspaceId(workspace.id)
      }
      await rmCalendarDb.localSettings.put({
        key: 'schema-version',
        valueJson: { version: 2 },
        updatedAt: timestamp
      })
      await rmCalendarDb.syncMetadata.put({
        workspaceId: workspace.id,
        syncInProgress: false
      })
    }
  )

  return workspace
}

export async function createLocalDemoContact(input: { displayName: string }) {
  const data = createLocalDemoContactInputSchema.parse(input)
  const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
  if (!workspace) {
    throw new Error('Create a local planning space before adding a person.')
  }

  const timestamp = nowIso()
  const contact: ContactRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    displayName: data.displayName,
    displayNameNormalized: normalizeDisplayName(data.displayName),
    firstSeenAt: timestamp
  }

  await rmCalendarDb.contacts.add(contact)
  return contact
}

const clearableTableNames = [
  'workspaces',
  'contacts',
  'organizations',
  'places',
  'contactOrganizations',
  'contactPlaces',
  'activities',
  'activityContacts',
  'tasks',
  'followUps',
  'notes',
  'activityHistory',
  'taskHistory',
  'reminders',
  'tags',
  'tagAssignments',
  'drafts',
  'outboxOperations',
  'syncMetadata',
  'conflicts'
] as const

const workspaceScopedTableNames = clearableTableNames.filter((tableName) => tableName !== 'workspaces' && tableName !== 'syncMetadata')

export async function clearAllLocalData() {
  const timestamp = nowIso()
  await rmCalendarDb.transaction('rw', [...clearableTableNames, 'localSettings'], async () => {
    await Promise.all(clearableTableNames.map((tableName) => rmCalendarDb.table(tableName).clear()))
    await rmCalendarDb.localSettings.clear()
    await rmCalendarDb.localSettings.put({
      key: WORKSPACE_LIFECYCLE_KEY,
      valueJson: { state: 'cleared' },
      updatedAt: timestamp
    })
  })
}

/**
 * Removes only one cloud workspace from this browser after a completed sign-out.
 * The unrelated fictional starter workspace is retained and is never uploaded.
 */
export async function removeLocalCloudWorkspace(workspaceId: string) {
  if (workspaceId === DEMO_WORKSPACE_ID) {
    throw new Error('The local starter workspace is not a cloud workspace.')
  }

  await rmCalendarDb.transaction('rw', [...clearableTableNames, 'localSettings'], async () => {
    await Promise.all(workspaceScopedTableNames.map((tableName) => rmCalendarDb.table(tableName).where('workspaceId').equals(workspaceId).delete()))
    await rmCalendarDb.syncMetadata.delete(workspaceId)
    await rmCalendarDb.workspaces.delete(workspaceId)
    await setActiveWorkspaceId(DEMO_WORKSPACE_ID)
  })
}

export async function restoreFictionalWorkspace() {
  await rmCalendarDb.localSettings.put({
    key: WORKSPACE_LIFECYCLE_KEY,
    valueJson: { state: 'active' },
    updatedAt: nowIso()
  })
  return bootstrapLocalWorkspace()
}

export async function resetFictionalWorkspace() {
  const timestamp = nowIso()
  await rmCalendarDb.transaction('rw', [...clearableTableNames, 'localSettings'], async () => {
    await Promise.all(clearableTableNames.map((tableName) => rmCalendarDb.table(tableName).clear()))
    await rmCalendarDb.localSettings.clear()
    await rmCalendarDb.localSettings.put({
      key: WORKSPACE_LIFECYCLE_KEY,
      valueJson: { state: 'active' },
      updatedAt: timestamp
    })
  })
  return bootstrapLocalWorkspace()
}
