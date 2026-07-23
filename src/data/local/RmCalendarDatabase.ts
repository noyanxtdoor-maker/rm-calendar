import Dexie, { type Table } from 'dexie'
import type {
  ActivityContactRecord,
  ActivityHistoryRecord,
  ActivityRecord,
  ContactOrganizationRecord,
  ContactRecord,
  DraftRecord,
  FollowUpRecord,
  GenericWorkspaceRecord,
  LocalSettingRecord,
  NoteRecord,
  OrganizationRecord,
  OutboxOperationRecord,
  PlaceRecord,
  SyncMetadataRecord,
  TaskHistoryRecord,
  TaskRecord,
  WorkspaceRecord
} from '../../domain/models'

export const RM_CALENDAR_DATABASE_NAME = 'rm-calendar-local'

export class RmCalendarDatabase extends Dexie {
  workspaces!: Table<WorkspaceRecord, string>
  contacts!: Table<ContactRecord, string>
  organizations!: Table<OrganizationRecord, string>
  places!: Table<PlaceRecord, string>
  activities!: Table<ActivityRecord, string>
  tasks!: Table<TaskRecord, string>
  contactOrganizations!: Table<ContactOrganizationRecord, string>
  contactPlaces!: Table<GenericWorkspaceRecord, string>
  activityContacts!: Table<ActivityContactRecord, string>
  followUps!: Table<FollowUpRecord, string>
  notes!: Table<NoteRecord, string>
  activityHistory!: Table<ActivityHistoryRecord, string>
  taskHistory!: Table<TaskHistoryRecord, string>
  reminders!: Table<GenericWorkspaceRecord, string>
  tags!: Table<GenericWorkspaceRecord, string>
  tagAssignments!: Table<GenericWorkspaceRecord, string>
  drafts!: Table<DraftRecord, string>
  outboxOperations!: Table<OutboxOperationRecord, string>
  syncMetadata!: Table<SyncMetadataRecord, string>
  conflicts!: Table<GenericWorkspaceRecord, string>
  localSettings!: Table<LocalSettingRecord, string>

  constructor(name = RM_CALENDAR_DATABASE_NAME) {
    super(name)

    this.version(1).stores({
      workspaces: 'id, ownerUserId, deletedAt',
      contacts: 'id, workspaceId, [workspaceId+displayNameNormalized], [workspaceId+deletedAt]',
      activities:
        'id, workspaceId, [workspaceId+scheduledStartAt], [workspaceId+scheduledDate], [workspaceId+state], [workspaceId+actualCompletedAt]',
      tasks: 'id, workspaceId, [workspaceId+state], [workspaceId+dueDate], [workspaceId+dueAt]',
      localSettings: 'key, updatedAt'
    })

    this.version(2)
      .stores({
        workspaces: 'id, ownerUserId, deletedAt',
        contacts: 'id, workspaceId, [workspaceId+displayNameNormalized], [workspaceId+deletedAt]',
        organizations: 'id, workspaceId, [workspaceId+kind], [workspaceId+nameNormalized]',
        places: 'id, workspaceId, [workspaceId+nameNormalized], [workspaceId+deletedAt]',
        contactOrganizations: 'id, workspaceId, [workspaceId+contactId], [workspaceId+organizationId]',
        contactPlaces: 'id, workspaceId, [workspaceId+contactId], [workspaceId+placeId], [workspaceId+isDefault]',
        activities:
          'id, workspaceId, [workspaceId+scheduledStartAt], [workspaceId+scheduledDate], [workspaceId+state], [workspaceId+actualCompletedAt]',
        activityContacts: 'id, workspaceId, [workspaceId+activityId], [workspaceId+contactId]',
        tasks: 'id, workspaceId, [workspaceId+state], [workspaceId+dueDate], [workspaceId+dueAt]',
        followUps: 'id, workspaceId, [workspaceId+sourceActivityId], [workspaceId+targetTaskId], [workspaceId+targetActivityId]',
        notes: 'id, workspaceId, contactId, organizationId, placeId, activityId, taskId, createdAt, isPinned',
        activityHistory: 'id, workspaceId, [workspaceId+activityId], [workspaceId+eventAt]',
        taskHistory: 'id, workspaceId, [workspaceId+taskId], [workspaceId+eventAt]',
        reminders: 'id, workspaceId, remindAt, dismissedAt',
        tags: 'id, workspaceId, [workspaceId+labelNormalized]',
        tagAssignments: 'id, workspaceId, tagId, contactId, organizationId, placeId, activityId, taskId',
        drafts: 'id, workspaceId, draftKind, updatedAt',
        outboxOperations: 'operationId, workspaceId, [workspaceId+sequence], [workspaceId+status], nextRetryAt',
        syncMetadata: 'workspaceId',
        conflicts: 'id, workspaceId, [workspaceId+entityType], [workspaceId+entityId], state',
        localSettings: 'key, updatedAt'
      })
      .upgrade(async (transaction) => {
        await transaction.table('localSettings').put({
          key: 'schema-version',
          valueJson: { version: 2 },
          updatedAt: new Date().toISOString()
        })
      })
  }
}

export const rmCalendarDb = new RmCalendarDatabase()

export async function deleteRmCalendarDatabase() {
  rmCalendarDb.close()
  await Dexie.delete(RM_CALENDAR_DATABASE_NAME)
}
