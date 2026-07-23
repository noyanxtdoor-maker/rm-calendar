import {
  createActivityInputSchema,
  createContactInputSchema,
  createFollowUpInputSchema,
  createHouseholdInputSchema,
  createNoteInputSchema,
  createPlaceInputSchema,
  createTaskInputSchema,
  completeActivityInputSchema,
  normalizeDisplayName,
  type ActivityScheduleInput,
  type CreateActivityInput,
  type CreateFollowUpInput,
  type CreateNoteInput,
  type CreateTaskInput,
  type QuickCaptureActivityInput,
  type UpdateActivityInput,
  quickCaptureActivityInputSchema,
  updateActivityInputSchema
} from '../../domain/schemas'
import type {
  ActivityContactRecord,
  ActivityHistoryRecord,
  ActivityRecord,
  ContactOrganizationRecord,
  ContactRecord,
  DraftRecord,
  FollowUpRecord,
  NoteRecord,
  OrganizationRecord,
  OutboxOperationRecord,
  PlaceRecord,
  TaskHistoryRecord,
  TaskRecord,
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

function taskHistoryFor(
  task: TaskRecord,
  eventType: TaskHistoryRecord['eventType'],
  timestamp: string,
  previousState?: TaskRecord['state']
): TaskHistoryRecord {
  return {
    ...localEnvelope(createLocalId(), task.workspaceId, timestamp),
    taskId: task.id,
    eventType,
    previousState,
    newState: task.state,
    eventAt: timestamp,
    eventPayloadJson: {
      dueDate: task.dueDate,
      dueAt: task.dueAt
    }
  }
}

async function requireWorkspaceContact(workspace: WorkspaceRecord, contactId: string | undefined) {
  if (!contactId) {
    return undefined
  }
  const contact = await rmCalendarDb.contacts.get(contactId)
  if (!contact || contact.workspaceId !== workspace.id || contact.deletedAt) {
    throw new Error('The selected person is not available in this workspace.')
  }
  return contact
}

async function requireWorkspacePlace(workspace: WorkspaceRecord, placeId: string | undefined) {
  if (!placeId) {
    return undefined
  }
  const place = await rmCalendarDb.places.get(placeId)
  if (!place || place.workspaceId !== workspace.id || place.deletedAt) {
    throw new Error('The selected place is not available in this workspace.')
  }
  return place
}

export async function completeActivity(input: { activityId: string; outcomeText?: string }) {
  const data = completeActivityInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()

  await rmCalendarDb.transaction(
    'rw',
    ['activities', 'activityContacts', 'contacts', 'activityHistory', 'outboxOperations'],
    async () => {
      const activity = await rmCalendarDb.activities.get(data.activityId)
      if (!activity || activity.workspaceId !== workspace.id || activity.deletedAt) {
        throw new Error('This activity is not available in the local workspace.')
      }
      if (activity.state !== 'scheduled' && activity.state !== 'draft') {
        throw new Error('Only a planned or draft activity can be completed.')
      }

      const completed: ActivityRecord = {
        ...activity,
        state: 'completed',
        actualCompletedAt: timestamp,
        outcomeText: cleanedOptional(data.outcomeText),
        updatedAt: timestamp,
        clientUpdatedAt: timestamp,
        revision: activity.revision + 1,
        pendingBaseRevision: activity.revision,
        syncState: 'pending'
      }
      await rmCalendarDb.activities.put(completed)

      const links = await rmCalendarDb.activityContacts.where('[workspaceId+activityId]').equals([workspace.id, activity.id]).toArray()
      for (const link of links) {
        const contact = await rmCalendarDb.contacts.get(link.contactId)
        if (contact && !contact.deletedAt) {
          await rmCalendarDb.activityContacts.update(link.id, {
            contactDisplayNameSnapshot: contact.displayName,
            updatedAt: timestamp,
            clientUpdatedAt: timestamp
          })
        }
      }

      await rmCalendarDb.activityHistory.add(historyFor(completed, 'completed', timestamp, activity.state))
      await enqueueOperation(workspace.id, 'complete_activity', completed.id)
    }
  )
}

export async function reopenActivity(activityId: string) {
  const workspace = await activeWorkspace()
  const timestamp = nowIso()

  await rmCalendarDb.transaction('rw', ['activities', 'activityHistory', 'outboxOperations'], async () => {
    const activity = await rmCalendarDb.activities.get(activityId)
    if (!activity || activity.workspaceId !== workspace.id || activity.deletedAt) {
      throw new Error('This activity is not available in the local workspace.')
    }
    const hasTimedSchedule = Boolean(activity.scheduledStartAt && activity.scheduledEndAt && activity.scheduleTimezone)
    const hasAllDaySchedule = Boolean(activity.scheduledDate && activity.scheduleTimezone)
    if (activity.state !== 'completed' || (!hasTimedSchedule && !hasAllDaySchedule)) {
      throw new Error('Only a completed activity with an existing schedule can be reopened.')
    }

    const reopened: ActivityRecord = {
      ...activity,
      state: 'scheduled',
      actualCompletedAt: undefined,
      updatedAt: timestamp,
      clientUpdatedAt: timestamp,
      revision: activity.revision + 1,
      pendingBaseRevision: activity.revision,
      syncState: 'pending'
    }
    await rmCalendarDb.activities.put(reopened)
    await rmCalendarDb.activityHistory.add(historyFor(reopened, 'reopened', timestamp, activity.state))
    await enqueueOperation(workspace.id, 'reopen_activity', reopened.id)
  })
}

export async function quickCaptureActivity(input: QuickCaptureActivityInput) {
  const data = quickCaptureActivityInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const activity: ActivityRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    title: data.title,
    activityType: data.activityType,
    state: 'completed',
    actualCompletedAt: timestamp,
    outcomeText: cleanedOptional(data.outcomeText)
  }

  await rmCalendarDb.transaction(
    'rw',
    ['contacts', 'activities', 'activityContacts', 'activityHistory', 'outboxOperations'],
    async () => {
      const contact = await requireWorkspaceContact(workspace, data.contactId)
      await rmCalendarDb.activities.add(activity)
      await replacePrimaryActivityContact(workspace, activity, contact, timestamp)
      await rmCalendarDb.activityHistory.add(historyFor(activity, 'completed', timestamp))
      await enqueueOperation(workspace.id, 'quick_capture_activity', activity.id)
    }
  )

  return activity
}

export async function createTask(input: CreateTaskInput) {
  const data = createTaskInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const task: TaskRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    title: data.title,
    state: 'open',
    dueDate: data.dueDate,
    priority: data.priority,
    contactId: data.contactId,
    placeId: data.placeId,
    activityId: data.activityId
  }

  await rmCalendarDb.transaction(
    'rw',
    ['contacts', 'places', 'activities', 'tasks', 'taskHistory', 'outboxOperations'],
    async () => {
      await requireWorkspaceContact(workspace, data.contactId)
      await requireWorkspacePlace(workspace, data.placeId)
      if (data.activityId) {
        const activity = await rmCalendarDb.activities.get(data.activityId)
        if (!activity || activity.workspaceId !== workspace.id || activity.deletedAt) {
          throw new Error('The linked activity is not available in this workspace.')
        }
      }
      await rmCalendarDb.tasks.add(task)
      await rmCalendarDb.taskHistory.add(taskHistoryFor(task, 'created', timestamp))
      await enqueueOperation(workspace.id, 'create_task', task.id)
    }
  )

  return task
}

export async function completeTask(taskId: string) {
  const workspace = await activeWorkspace()
  const timestamp = nowIso()

  await rmCalendarDb.transaction('rw', ['tasks', 'taskHistory', 'outboxOperations'], async () => {
    const task = await rmCalendarDb.tasks.get(taskId)
    if (!task || task.workspaceId !== workspace.id || task.deletedAt) {
      throw new Error('This task is not available in the local workspace.')
    }
    if (task.state !== 'open') {
      throw new Error('Only an open task can be completed.')
    }
    const completed: TaskRecord = {
      ...task,
      state: 'completed',
      completedAt: timestamp,
      updatedAt: timestamp,
      clientUpdatedAt: timestamp,
      revision: task.revision + 1,
      pendingBaseRevision: task.revision,
      syncState: 'pending'
    }
    await rmCalendarDb.tasks.put(completed)
    await rmCalendarDb.taskHistory.add(taskHistoryFor(completed, 'completed', timestamp, task.state))
    await enqueueOperation(workspace.id, 'complete_task', completed.id)
  })
}

export async function createNote(input: CreateNoteInput) {
  const data = createNoteInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  const note: NoteRecord = {
    ...localEnvelope(createLocalId(), workspace.id, timestamp),
    body: data.body,
    isPinned: false,
    contactId: data.contactId,
    organizationId: data.organizationId,
    placeId: data.placeId,
    activityId: data.activityId,
    taskId: data.taskId
  }

  await rmCalendarDb.transaction(
    'rw',
    ['contacts', 'organizations', 'places', 'activities', 'tasks', 'notes', 'outboxOperations'],
    async () => {
      await requireWorkspaceContact(workspace, data.contactId)
      await requireWorkspacePlace(workspace, data.placeId)
      if (data.organizationId) {
        const organization = await rmCalendarDb.organizations.get(data.organizationId)
        if (!organization || organization.workspaceId !== workspace.id || organization.deletedAt) {
          throw new Error('The note household or group is not available in this workspace.')
        }
      }
      if (data.activityId) {
        const activity = await rmCalendarDb.activities.get(data.activityId)
        if (!activity || activity.workspaceId !== workspace.id || activity.deletedAt) {
          throw new Error('The note activity is not available in this workspace.')
        }
      }
      if (data.taskId) {
        const task = await rmCalendarDb.tasks.get(data.taskId)
        if (!task || task.workspaceId !== workspace.id || task.deletedAt) {
          throw new Error('The note task is not available in this workspace.')
        }
      }
      await rmCalendarDb.notes.add(note)
      await enqueueOperation(workspace.id, 'create_note', note.id)
    }
  )

  return note
}

export async function createFollowUp(input: CreateFollowUpInput) {
  const data = createFollowUpInputSchema.parse(input)
  const workspace = await activeWorkspace()
  const timestamp = nowIso()
  let targetId = ''

  await rmCalendarDb.transaction(
    'rw',
    ['contacts', 'places', 'activities', 'activityContacts', 'activityHistory', 'tasks', 'taskHistory', 'followUps', 'outboxOperations'],
    async () => {
      const source = await rmCalendarDb.activities.get(data.sourceActivityId)
      if (!source || source.workspaceId !== workspace.id || source.deletedAt || source.state !== 'completed') {
        throw new Error('Only a completed local activity can create a follow-up.')
      }
      const sourceLink = await rmCalendarDb.activityContacts.where('[workspaceId+activityId]').equals([workspace.id, source.id]).first()
      const contactId = data.contactId === null ? undefined : data.contactId ?? sourceLink?.contactId
      const placeId = data.placeId === null ? undefined : data.placeId ?? source.primaryPlaceId
      const contact = await requireWorkspaceContact(workspace, contactId)
      const place = await requireWorkspacePlace(workspace, placeId)
      const followUpId = createLocalId()

      if (data.targetKind === 'task') {
        const task: TaskRecord = {
          ...localEnvelope(createLocalId(), workspace.id, timestamp),
          title: data.title,
          state: 'open',
          dueDate: data.dueDate,
          priority: data.priority,
          contactId: contact?.id,
          placeId: place?.id,
          activityId: source.id
        }
        const followUp: FollowUpRecord = {
          ...localEnvelope(followUpId, workspace.id, timestamp),
          sourceActivityId: source.id,
          targetKind: 'task',
          targetTaskId: task.id
        }
        await rmCalendarDb.tasks.add(task)
        await rmCalendarDb.taskHistory.add(taskHistoryFor(task, 'created', timestamp))
        await rmCalendarDb.followUps.add(followUp)
        targetId = task.id
      } else {
        const target: ActivityRecord = {
          ...localEnvelope(createLocalId(), workspace.id, timestamp),
          title: data.title,
          activityType: data.activityType,
          ...scheduleFields(data.schedule, workspace),
          primaryPlaceId: place?.id
        }
        const followUp: FollowUpRecord = {
          ...localEnvelope(followUpId, workspace.id, timestamp),
          sourceActivityId: source.id,
          targetKind: 'activity',
          targetActivityId: target.id
        }
        await rmCalendarDb.activities.add(target)
        await replacePrimaryActivityContact(workspace, target, contact, timestamp)
        await rmCalendarDb.activityHistory.add(historyFor(target, 'scheduled', timestamp))
        await rmCalendarDb.followUps.add(followUp)
        targetId = target.id
      }

      await rmCalendarDb.activityHistory.add(historyFor(source, 'follow_up_created', timestamp, source.state))
      await enqueueOperation(workspace.id, 'create_follow_up', followUpId)
    }
  )

  return { targetId, targetKind: data.targetKind }
}
