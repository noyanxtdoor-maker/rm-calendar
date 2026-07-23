import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createActivity, createContact, createHousehold, createPlace, loadActivityDraft, saveActivityDraft, updateActivity } from './commands'
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
})
