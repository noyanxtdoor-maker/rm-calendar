import {
  createActivityInputSchema,
  createContactInputSchema,
  createHouseholdInputSchema,
  createPlaceInputSchema,
  normalizeDisplayName,
  type ActivityScheduleInput,
  type CreateActivityInput,
  type UpdateActivityInput,
  updateActivityInputSchema
} from '../../domain/schemas'
import type {
  ActivityContactRecord,
  ActivityHistoryRecord,
  ActivityRecord,
  ContactOrganizationRecord,
  ContactRecord,
  DraftRecord,
  OrganizationRecord,
  OutboxOperationRecord,
  PlaceRecord,
  WorkspaceRecord
} from '../../domain/models'
import { createLocalId } from '../../lib/ids'
import { zonedDateTimeToUtcIso } from '../../lib/time'
import { rmCalendarDb } from './RmCalendarDatabase'
import { DEMO_WORKSPACE_ID } from './workspace'

export type ActivityFormDraftPayload = {
  title: string
  activityType: ActivityRecord['activityType']
  scheduleKind: ActivityScheduleInput['kind']
  date: string
  startTime: string
  endTime: string
  objectiveText: string
  contactId: string
  inlineContactName: string
  placeId: string
  inlinePlaceName: string
}

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

function cleanedOptional(value: string | undefined) {
  const cleaned = value?.trim()
  return cleaned ? cleaned : undefined
}

async function activeWorkspace() {
  const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
  if (!workspace || workspace.deletedAt) {
    throw new Error('Create a local workspace before planning.')
  }

  return workspace
}

async function enqueueOperation(
  workspaceId: string,
  kind: string,
  entityId: string,
  dependencies: string[] = []
) {
  const prior = await rmCalendarDb.outboxOperations.where('workspaceId').equals(workspaceId).toArray()
  const sequence = prior.reduce((highest, operation) => Math.max(highest, operation.sequence), 0) + 1
  const operation: OutboxOperationRecord = {
    operationId: createLocalId(),
    workspaceId,
    sequence,
    kind,
    payloadJson: { entityId },
    dependsOnJson: dependencies,
    status: 'ready',
    attemptCount: 0,
    createdAt: nowIso()
  }
  await rmCalendarDb.outboxOperations.add(operation)
  return operation
}

function scheduleFields(schedule: ActivityScheduleInput, workspace: WorkspaceRecord): Pick<
  ActivityRecord,
  'state' | 'scheduledDate' | 'scheduledStartAt' | 'scheduledEndAt' | 'scheduleTimezone'
> {
  if (schedule.kind === 'draft') {
    return { state: 'draft' }
  }

  if (schedule.kind === 'all-day') {
    return {
      state: 'scheduled',
      scheduledDate: schedule.date,
      scheduleTimezone: workspace.timezone
    }
  }

  return {
    state: 'scheduled',
    scheduledStartAt: zonedDateTimeToUtcIso(schedule.date, schedule.startTime, workspace.timezone),
    scheduledEndAt: zonedDateTimeToUtcIso(schedule.date, schedule.endTime, workspace.timezone),
    scheduleTimezone: workspace.timezone
  }
}

function historyFor(
  activity: ActivityRecord,
  eventType: ActivityHistoryRecord['eventType'],
  timestamp: string,
  previousState?: ActivityRecord['state']
): ActivityHistoryRecord {
  return {
    ...localEnvelope(createLocalId(), activity.workspaceId, timestamp),
    activityId: activity.id,
    eventType,
    previousState,
    newState: activity.state,
    eventAt: timestamp,
    eventPayloadJson: {
      scheduledDate: activity.scheduledDate,
      scheduledStartAt: activity.scheduledStartAt,
      scheduledEndAt: activity.scheduledEndAt
    }
  }
}

async function resolveContact(
  workspace: WorkspaceRecord,
  contactId: string | undefined,
  inlineContactName: string | undefined,
  timestamp: string
) {
  if (contactId) {
    const existing = await rmCalendarDb.contacts.get(contactId)
    if (!existing || existing.workspaceId !== workspace.id || existing.deletedAt) {
      throw new Error('The selected person is not available in this workspace.')
    }

    return { contact: existing, operation: undefined as OutboxOperationRecord | undefined }
  }

  const name = cleanedOptional(inlineContactName)
  if (!name) {
    return { contact: undefined, operation: undefined as OutboxOperationRecord | undefined }
  }

  const contact: ContactRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    displayName: name,
    displayNameNormalized: normalizeDisplayName(name),
    firstSeenAt: timestamp
  }
  await rmCalendarDb.contacts.add(contact)
  const operation = await enqueueOperation(workspace.id, 'create_contact', contact.id)
  return { contact, operation }
}

async function resolvePlace(
  workspace: WorkspaceRecord,
  placeId: string | undefined,
  inlinePlaceName: string | undefined,
  timestamp: string
) {
  if (placeId) {
    const existing = await rmCalendarDb.places.get(placeId)
    if (!existing || existing.workspaceId !== workspace.id || existing.deletedAt) {
      throw new Error('The selected place is not available in this workspace.')
    }

    return { place: existing, operation: undefined as OutboxOperationRecord | undefined }
  }

  const name = cleanedOptional(inlinePlaceName)
  if (!name) {
    return { place: undefined, operation: undefined as OutboxOperationRecord | undefined }
  }

  const place: PlaceRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    name,
    nameNormalized: normalizeDisplayName(name)
  }
  await rmCalendarDb.places.add(place)
  const operation = await enqueueOperation(workspace.id, 'create_place', place.id)
  return { place, operation }
}

async function replacePrimaryActivityContact(
  workspace: WorkspaceRecord,
  activity: ActivityRecord,
  contact: ContactRecord | undefined,
  timestamp: string
) {
  await rmCalendarDb.activityContacts.where('[workspaceId+activityId]').equals([workspace.id, activity.id]).delete()

  if (!contact) {
    return
  }

  const link: ActivityContactRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    activityId: activity.id,
    contactId: contact.id,
    isPrimary: true
  }
  await rmCalendarDb.activityContacts.add(link)
}

export async function createContact(input: { displayName: string; householdId?: string }) {
  const data = createContactInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const contact: ContactRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    displayName: data.displayName,
    displayNameNormalized: normalizeDisplayName(data.displayName),
    firstSeenAt: timestamp
  }

  await rmCalendarDb.transaction('rw', ['contacts', 'organizations', 'contactOrganizations', 'outboxOperations'], async () => {
    if (data.householdId) {
      const household = await rmCalendarDb.organizations.get(data.householdId)
      if (!household || household.workspaceId !== workspace.id || household.deletedAt || household.kind !== 'household') {
        throw new Error('The selected household is not available in this workspace.')
      }
    }

    await rmCalendarDb.contacts.add(contact)
    if (data.householdId) {
      const link: ContactOrganizationRecord = {
        ...localEnvelope(createLocalId(), workspace.id, timestamp),
        contactId: contact.id,
        organizationId: data.householdId,
        relationshipLabel: 'household member'
      }
      await rmCalendarDb.contactOrganizations.add(link)
    }
    await enqueueOperation(workspace.id, 'create_contact', contact.id)
  })

  return contact
}

export async function createHousehold(input: { name: string }) {
  const data = createHouseholdInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const household: OrganizationRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    name: data.name,
    nameNormalized: normalizeDisplayName(data.name),
    kind: 'household'
  }

  await rmCalendarDb.transaction('rw', ['organizations', 'outboxOperations'], async () => {
    await rmCalendarDb.organizations.add(household)
    await enqueueOperation(workspace.id, 'create_household', household.id)
  })

  return household
}

export async function createPlace(input: { name: string; addressText?: string; entranceNotes?: string }) {
  const data = createPlaceInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const place: PlaceRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    name: data.name,
    nameNormalized: normalizeDisplayName(data.name),
    addressText: cleanedOptional(data.addressText),
    entranceNotes: cleanedOptional(data.entranceNotes)
  }

  await rmCalendarDb.transaction('rw', ['places', 'outboxOperations'], async () => {
    await rmCalendarDb.places.add(place)
    await enqueueOperation(workspace.id, 'create_place', place.id)
  })

  return place
}

export async function createActivity(input: CreateActivityInput) {
  const data = createActivityInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const activity: ActivityRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    title: data.title,
    activityType: data.activityType,
    ...scheduleFields(data.schedule, workspace),
    objectiveText: cleanedOptional(data.objectiveText)
  }

  await rmCalendarDb.transaction(
    'rw',
    ['contacts', 'places', 'activities', 'activityContacts', 'activityHistory', 'outboxOperations'],
    async () => {
      const contactResult = await resolveContact(workspace, data.contactId, data.inlineContactName, timestamp)
      const placeResult = await resolvePlace(workspace, data.placeId, data.inlinePlaceName, timestamp)
      activity.primaryPlaceId = placeResult.place?.id

      await rmCalendarDb.activities.add(activity)
      await replacePrimaryActivityContact(workspace, activity, contactResult.contact, timestamp)
      await rmCalendarDb.activityHistory.add(
        historyFor(activity, activity.state === 'draft' ? 'saved_as_draft' : 'scheduled', timestamp)
      )
      await enqueueOperation(
        workspace.id,
        'create_activity',
        activity.id,
        [contactResult.operation?.operationId, placeResult.operation?.operationId].filter(
          (operationId): operationId is string => Boolean(operationId)
        )
      )
    }
  )

  return activity
}

export async function updateActivity(input: UpdateActivityInput) {
  const data = updateActivityInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()

  const activity = await rmCalendarDb.activities.get(data.activityId)
  if (!activity || activity.workspaceId !== workspace.id || activity.deletedAt) {
    throw new Error('This activity is not available in the local workspace.')
  }
  if (activity.state === 'completed' || activity.state === 'cancelled') {
    throw new Error('Only planned or draft activities can be edited in this milestone.')
  }

  const previousState = activity.state
  const previousSchedule = {
    scheduledDate: activity.scheduledDate,
    scheduledStartAt: activity.scheduledStartAt,
    scheduledEndAt: activity.scheduledEndAt
  }
  const updated: ActivityRecord = {
    ...activity,
    title: data.title,
    activityType: data.activityType,
    objectiveText: cleanedOptional(data.objectiveText),
    ...scheduleFields(data.schedule, workspace),
    scheduledDate: undefined,
    scheduledStartAt: undefined,
    scheduledEndAt: undefined,
    scheduleTimezone: undefined,
    updatedAt: timestamp,
    clientUpdatedAt: timestamp,
    revision: activity.revision + 1,
    pendingBaseRevision: activity.revision,
    syncState: 'pending'
  }
  Object.assign(updated, scheduleFields(data.schedule, workspace))

  await rmCalendarDb.transaction(
    'rw',
    ['contacts', 'places', 'activities', 'activityContacts', 'activityHistory', 'outboxOperations'],
    async () => {
      const contactResult = await resolveContact(workspace, data.contactId, data.inlineContactName, timestamp)
      const placeResult = await resolvePlace(workspace, data.placeId, data.inlinePlaceName, timestamp)
      updated.primaryPlaceId = placeResult.place?.id

      await rmCalendarDb.activities.put(updated)
      await replacePrimaryActivityContact(workspace, updated, contactResult.contact, timestamp)
      const scheduleChanged =
        previousSchedule.scheduledDate !== updated.scheduledDate ||
        previousSchedule.scheduledStartAt !== updated.scheduledStartAt ||
        previousSchedule.scheduledEndAt !== updated.scheduledEndAt
      await rmCalendarDb.activityHistory.add(
        historyFor(
          updated,
          updated.state === 'draft' ? 'saved_as_draft' : scheduleChanged ? 'rescheduled' : 'updated',
          timestamp,
          previousState
        )
      )
      await enqueueOperation(
        workspace.id,
        'update_activity',
        updated.id,
        [contactResult.operation?.operationId, placeResult.operation?.operationId].filter(
          (operationId): operationId is string => Boolean(operationId)
        )
      )
    }
  )

  return updated
}

export async function saveActivityDraft(
  workspaceId: string,
  draftId: string,
  payload: ActivityFormDraftPayload,
  routeContextJson: Record<string, unknown>
) {
  const draft: DraftRecord = {
    id: draftId,
    workspaceId,
    draftKind: 'activity-form',
    routeContextJson,
    payloadJson: payload as unknown as Record<string, unknown>,
    updatedAt: nowIso()
  }
  await rmCalendarDb.drafts.put(draft)
}

export async function loadActivityDraft(draftId: string) {
  return rmCalendarDb.drafts.get(draftId)
}

export async function discardActivityDraft(draftId: string) {
  await rmCalendarDb.drafts.delete(draftId)
}
