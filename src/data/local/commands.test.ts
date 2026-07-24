import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  completeActivity,
  completeTask,
  createActivity,
  createContact,
  createFocusGroup,
  createFollowUp,
  createHousehold,
  createNote,
  createPlace,
  createTask,
  loadActivityDraft,
  quickCaptureActivity,
  reopenActivity,
  saveActivityDraft,
  updateActivity,
  updateFocusGroup
} from './commands'
import { deleteRmCalendarDatabase, rmCalendarDb } from './RmCalendarDatabase'
import { bootstrapLocalWorkspace, DEMO_WORKSPACE_ID } from './workspace'
import { localIsoDate } from '../../lib/time'
import { overlappingActivities } from '../../domain/overlap'

describe('Milestone 2 local planning commands', () => {
  beforeEach(async () => {
    await deleteRmCalendarDatabase()
    await bootstrapLocalWorkspace()
  })

  afterEach(async () => {
    await deleteRmCalendarDatabase()
  })

  it('creates a household, person, place, and linked scheduled activity in one local workflow', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const date = localIsoDate(new Date(), workspace.timezone)
    const household = await createHousehold({ name: 'Morgan household' })
    const person = await createContact({ displayName: 'Taylor Morgan', householdId: household.id })
    const place = await createPlace({ name: 'Fictional community room', addressText: 'Fictional address' })
    const activity = await createActivity({
      title: 'Taylor planning visit',
      activityType: 'visit',
      schedule: { kind: 'timed', date, startTime: '13:00', endTime: '13:45' },
      contactId: person.id,
      placeId: place.id
    })

    expect((await rmCalendarDb.contactOrganizations.where('[workspaceId+contactId]').equals([workspace.id, person.id]).first())?.organizationId).toBe(household.id)
    expect((await rmCalendarDb.activityContacts.where('[workspaceId+activityId]').equals([workspace.id, activity.id]).first())?.contactId).toBe(person.id)
    expect((await rmCalendarDb.activities.get(activity.id))?.primaryPlaceId).toBe(place.id)
    expect((await rmCalendarDb.activityHistory.where('[workspaceId+activityId]').equals([workspace.id, activity.id]).first())?.eventType).toBe('scheduled')
    expect((await rmCalendarDb.outboxOperations.where('workspaceId').equals(workspace.id).toArray()).map((operation) => operation.kind)).toEqual(
      expect.arrayContaining(['create_household', 'create_contact', 'create_place', 'create_activity'])
    )
  })

  it('creates a private focus group with selected people and one durable sync operation', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) throw new Error('Expected the fictional local workspace.')
    const first = await createContact({ displayName: 'Focus group one' })
    const second = await createContact({ displayName: 'Focus group two' })

    const group = await createFocusGroup({ name: 'This week', contactIds: [first.id, second.id] })
    const members = await rmCalendarDb.contactOrganizations.where('[workspaceId+organizationId]').equals([workspace.id, group.id]).toArray()
    const operation = (await rmCalendarDb.outboxOperations.where('workspaceId').equals(workspace.id).toArray()).find((candidate) => candidate.kind === 'create_focus_group')

    expect(group.kind).toBe('group')
    expect(members.map((member) => member.contactId).sort()).toEqual([first.id, second.id].sort())
    expect(operation?.dependsOnJson).toEqual(expect.arrayContaining([
      expect.any(String),
      expect.any(String)
    ]))
  })

  it('updates a focus group locally without adding a stale second operation before its first sync', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) throw new Error('Expected the fictional local workspace.')
    const first = await createContact({ displayName: 'Focus update one' })
    const second = await createContact({ displayName: 'Focus update two' })
    const group = await createFocusGroup({ name: 'First focus', contactIds: [first.id] })

    await updateFocusGroup({ groupId: group.id, name: 'Updated focus', contactIds: [second.id] })

    expect((await rmCalendarDb.organizations.get(group.id))?.name).toBe('Updated focus')
    const links = await rmCalendarDb.contactOrganizations.where('[workspaceId+organizationId]').equals([workspace.id, group.id]).toArray()
    expect(links.find((link) => link.contactId === first.id)?.deletedAt).toBeTruthy()
    expect(links.find((link) => link.contactId === second.id)?.deletedAt).toBeUndefined()
    expect((await rmCalendarDb.outboxOperations.where('workspaceId').equals(workspace.id).toArray()).filter((operation) => operation.kind === 'update_focus_group')).toHaveLength(0)
  })

  it('keeps one activity identifier, writes planning history, and warns without blocking on an overlap', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const date = localIsoDate(new Date(), workspace.timezone)
    const activity = await createActivity({
      title: 'Move me',
      activityType: 'visit',
      schedule: { kind: 'timed', date, startTime: '11:00', endTime: '11:45' }
    })

    const overlaps = overlappingActivities(
      (await rmCalendarDb.activities.where('workspaceId').equals(workspace.id).toArray()),
      { kind: 'timed', date, startTime: '11:15', endTime: '11:30' },
      workspace.timezone
    )
    expect(overlaps.map((candidate) => candidate.id)).toContain(activity.id)

    const updated = await updateActivity({
      activityId: activity.id,
      title: 'Move me',
      activityType: 'visit',
      schedule: { kind: 'timed', date, startTime: '14:00', endTime: '14:45' }
    })

    expect(updated.id).toBe(activity.id)
    expect((await rmCalendarDb.activities.get(activity.id))?.scheduledStartAt).toBe(updated.scheduledStartAt)
    expect((await rmCalendarDb.activityHistory.where('[workspaceId+activityId]').equals([workspace.id, activity.id]).toArray()).map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['scheduled', 'rescheduled'])
    )
  })

  it('creates an inline person while planning and keeps a saved draft out of the calendar', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const date = localIsoDate(new Date(), workspace.timezone)
    const scheduled = await createActivity({
      title: 'Inline person visit',
      activityType: 'visit',
      schedule: { kind: 'all-day', date },
      inlineContactName: 'Inline planning person'
    })
    const draft = await createActivity({
      title: 'Quiet planning draft',
      activityType: 'planning',
      schedule: { kind: 'draft' }
    })

    const inlineLink = await rmCalendarDb.activityContacts.where('[workspaceId+activityId]').equals([workspace.id, scheduled.id]).first()
    expect((await rmCalendarDb.contacts.get(inlineLink?.contactId ?? ''))?.displayName).toBe('Inline planning person')
    expect((await rmCalendarDb.activities.get(draft.id))?.state).toBe('draft')
    expect((await rmCalendarDb.activities.where('workspaceId').equals(workspace.id).toArray()).filter((activity) => activity.state === 'scheduled').map((activity) => activity.id)).not.toContain(draft.id)
  })

  it('keeps an incomplete activity form draft after the local database is reopened', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const draftId = 'activity-form-durable-test'
    await saveActivityDraft(workspace.id, draftId, {
      title: 'Unfinished local visit',
      activityType: 'visit',
      scheduleKind: 'timed',
      date: '2026-07-23',
      startTime: '09:00',
      endTime: '09:30',
      objectiveText: 'Keep this while I decide.',
      contactId: '',
      inlineContactName: '',
      placeId: '',
      inlinePlaceName: ''
    }, { source: 'test' })

    rmCalendarDb.close()
    await rmCalendarDb.open()

    expect((await loadActivityDraft(draftId))?.payloadJson.title).toBe('Unfinished local visit')
  })

  it('records completion separately from the planned time and can reopen a scheduled visit', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const date = localIsoDate(new Date(), workspace.timezone)
    const planned = await createActivity({
      title: 'Completion preservation visit',
      activityType: 'visit',
      schedule: { kind: 'timed', date, startTime: '09:00', endTime: '09:45' }
    })

    await completeActivity({ activityId: planned.id, outcomeText: 'A concise local outcome.' })
    const completed = await rmCalendarDb.activities.get(planned.id)
    expect(completed?.state).toBe('completed')
    expect(completed?.scheduledStartAt).toBe(planned.scheduledStartAt)
    expect(completed?.scheduledEndAt).toBe(planned.scheduledEndAt)
    expect(completed?.actualCompletedAt).toBeTruthy()
    expect(completed?.outcomeText).toBe('A concise local outcome.')

    await reopenActivity(planned.id)
    const reopened = await rmCalendarDb.activities.get(planned.id)
    expect(reopened?.state).toBe('scheduled')
    expect(reopened?.actualCompletedAt).toBeUndefined()
    expect((await rmCalendarDb.activityHistory.where('[workspaceId+activityId]').equals([workspace.id, planned.id]).toArray()).map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['completed', 'reopened'])
    )
  })

  it('creates a linked follow-up task in one local transaction and retains the source context', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const date = localIsoDate(new Date(), workspace.timezone)
    const person = await createContact({ displayName: 'Follow-up person' })
    const place = await createPlace({ name: 'Follow-up place' })
    const source = await createActivity({
      title: 'Source completed visit',
      activityType: 'visit',
      schedule: { kind: 'all-day', date },
      contactId: person.id,
      placeId: place.id
    })
    await completeActivity({ activityId: source.id })

    const result = await createFollowUp({
      sourceActivityId: source.id,
      targetKind: 'task',
      title: 'Send the next message',
      dueDate: date,
      priority: 'high'
    })

    expect(result.targetKind).toBe('task')
    const task = await rmCalendarDb.tasks.get(result.targetId)
    const link = await rmCalendarDb.followUps.where('[workspaceId+sourceActivityId]').equals([workspace.id, source.id]).first()
    expect(task).toMatchObject({
      title: 'Send the next message',
      state: 'open',
      contactId: person.id,
      placeId: place.id,
      activityId: source.id
    })
    expect(link).toMatchObject({
      sourceActivityId: source.id,
      targetTaskId: result.targetId,
      targetKind: 'task'
    })
    expect((await rmCalendarDb.activityHistory.where('[workspaceId+activityId]').equals([workspace.id, source.id]).toArray()).map((event) => event.eventType)).toContain('follow_up_created')
  })

  it('does not create a partial follow-up for an incomplete source and persists quick captures, tasks, and notes locally', async () => {
    const workspace = await rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID)
    if (!workspace) {
      throw new Error('Expected the fictional local workspace.')
    }
    const date = localIsoDate(new Date(), workspace.timezone)
    const incomplete = await createActivity({
      title: 'Not complete yet',
      activityType: 'visit',
      schedule: { kind: 'all-day', date }
    })
    const taskCountBefore = await rmCalendarDb.tasks.count()
    const followUpCountBefore = await rmCalendarDb.followUps.count()

    await expect(createFollowUp({
      sourceActivityId: incomplete.id,
      targetKind: 'task',
      title: 'This must not be created',
      dueDate: date,
      priority: 'normal'
    })).rejects.toThrow('Only a completed local activity can create a follow-up.')
    expect(await rmCalendarDb.tasks.count()).toBe(taskCountBefore)
    expect(await rmCalendarDb.followUps.count()).toBe(followUpCountBefore)

    const capture = await quickCaptureActivity({
      title: 'Unplanned local visit',
      activityType: 'visit',
      outcomeText: 'Captured without scheduling first.'
    })
    const task = await createTask({ title: 'Review capture', dueDate: date, priority: 'normal', activityId: capture.id })
    const note = await createNote({ activityId: capture.id, body: 'A private local note.' })
    await completeTask(task.id)

    expect((await rmCalendarDb.activities.get(capture.id))?.state).toBe('completed')
    expect((await rmCalendarDb.tasks.get(task.id))?.completedAt).toBeTruthy()
    expect((await rmCalendarDb.notes.get(note.id))?.activityId).toBe(capture.id)
    expect((await rmCalendarDb.taskHistory.where('[workspaceId+taskId]').equals([workspace.id, task.id]).toArray()).map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['created', 'completed'])
    )
  })
})
