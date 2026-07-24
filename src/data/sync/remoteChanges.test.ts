import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteRmCalendarDatabase, rmCalendarDb } from '../local/RmCalendarDatabase'
import { applyRemoteChanges } from './remoteChanges'

const workspaceId = '51000000-0000-4000-8000-000000000051'

describe('remote change application', () => {
  beforeEach(async () => {
    await deleteRmCalendarDatabase()
    await rmCalendarDb.open()
    await rmCalendarDb.syncMetadata.put({ workspaceId, syncInProgress: false })
  })

  afterEach(async () => {
    await deleteRmCalendarDatabase()
  })

  it('maps server records and the related Activity context into durable local records', async () => {
    const activityId = '52000000-0000-4000-8000-000000000052'
    const contactId = '53000000-0000-4000-8000-000000000053'
    await applyRemoteChanges(workspaceId, [
      {
        changeId: '1',
        entityType: 'activity',
        entityId: activityId,
        revision: 2,
        changedAt: '2026-07-24T10:00:00.000Z',
        record: {
          id: activityId,
          workspace_id: workspaceId,
          title: 'Pulled plan',
          activity_type: 'visit',
          state: 'scheduled',
          scheduled_date: '2026-07-25',
          schedule_timezone: 'Asia/Singapore',
          created_at: '2026-07-24T09:00:00.000Z',
          updated_at: '2026-07-24T10:00:00.000Z',
          client_updated_at: '2026-07-24T10:00:00.000Z',
          revision: 2
        },
        context: {
          primaryContact: {
            id: '54000000-0000-4000-8000-000000000054',
            workspace_id: workspaceId,
            activity_id: activityId,
            contact_id: contactId,
            is_primary: true,
            created_at: '2026-07-24T09:00:00.000Z',
            updated_at: '2026-07-24T09:00:00.000Z',
            client_updated_at: '2026-07-24T09:00:00.000Z',
            revision: 1
          },
          history: [{
            id: '55000000-0000-4000-8000-000000000055',
            workspace_id: workspaceId,
            activity_id: activityId,
            event_type: 'scheduled',
            new_state: 'scheduled',
            event_at: '2026-07-24T09:00:00.000Z',
            event_payload_json: {},
            created_at: '2026-07-24T09:00:00.000Z',
            updated_at: '2026-07-24T09:00:00.000Z',
            client_updated_at: '2026-07-24T09:00:00.000Z',
            revision: 1
          }]
        }
      }
    ], '1')

    expect(await rmCalendarDb.activities.get(activityId)).toMatchObject({
      workspaceId,
      activityType: 'visit',
      scheduledDate: '2026-07-25',
      scheduleTimezone: 'Asia/Singapore',
      syncState: 'synced'
    })
    expect(await rmCalendarDb.activityContacts.where('[workspaceId+activityId]').equals([workspaceId, activityId]).first()).toMatchObject({
      contactId,
      isPrimary: true
    })
    expect(await rmCalendarDb.activityHistory.where('[workspaceId+activityId]').equals([workspaceId, activityId]).count()).toBe(1)
    expect((await rmCalendarDb.syncMetadata.get(workspaceId))?.pullCursor).toBe('1')
  })
})
