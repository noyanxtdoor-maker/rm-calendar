import type {
  ActivityContactRecord,
  ActivityHistoryRecord,
  ActivityRecord,
  ContactOrganizationRecord,
  ContactRecord,
  DraftRecord,
  FollowUpRecord,
  GenericWorkspaceRecord,
  NoteRecord,
  OrganizationRecord,
  PlaceRecord,
  TaskHistoryRecord,
  TaskRecord,
  WorkspaceRecord
} from '../../domain/models'
import { rmCalendarDb } from './RmCalendarDatabase'

export type LocalWorkspaceExportV1 = {
  format: 'rm-calendar-local-export'
  version: 1
  exportedAt: string
  privacyNotice: string
  workspace: WorkspaceRecord
  records: {
    contacts: ContactRecord[]
    organizations: OrganizationRecord[]
    places: PlaceRecord[]
    contactOrganizations: ContactOrganizationRecord[]
    contactPlaces: GenericWorkspaceRecord[]
    activities: ActivityRecord[]
    activityContacts: ActivityContactRecord[]
    tasks: TaskRecord[]
    followUps: FollowUpRecord[]
    notes: NoteRecord[]
    activityHistory: ActivityHistoryRecord[]
    taskHistory: TaskHistoryRecord[]
    reminders: GenericWorkspaceRecord[]
    tags: GenericWorkspaceRecord[]
    tagAssignments: GenericWorkspaceRecord[]
    drafts: DraftRecord[]
  }
}

function nowIso() {
  return new Date().toISOString()
}

/**
 * Creates a portable, user-owned snapshot of planning data. Local queue,
 * conflict, and browser-setting state is deliberately excluded: importing
 * those device-specific records into a future workspace could duplicate work
 * or expose stale diagnostics.
 */
export async function createLocalWorkspaceExport(workspaceId: string): Promise<LocalWorkspaceExportV1> {
  return rmCalendarDb.transaction(
    'r',
    [
      rmCalendarDb.workspaces,
      rmCalendarDb.contacts,
      rmCalendarDb.organizations,
      rmCalendarDb.places,
      rmCalendarDb.contactOrganizations,
      rmCalendarDb.contactPlaces,
      rmCalendarDb.activities,
      rmCalendarDb.activityContacts,
      rmCalendarDb.tasks,
      rmCalendarDb.followUps,
      rmCalendarDb.notes,
      rmCalendarDb.activityHistory,
      rmCalendarDb.taskHistory,
      rmCalendarDb.reminders,
      rmCalendarDb.tags,
      rmCalendarDb.tagAssignments,
      rmCalendarDb.drafts
    ],
    async () => {
      const workspace = await rmCalendarDb.workspaces.get(workspaceId)
      if (!workspace || workspace.deletedAt) {
        throw new Error('The local planning space is unavailable for export.')
      }

      const [
        contacts,
        organizations,
        places,
        contactOrganizations,
        contactPlaces,
        activities,
        activityContacts,
        tasks,
        followUps,
        notes,
        activityHistory,
        taskHistory,
        reminders,
        tags,
        tagAssignments,
        drafts
      ] = await Promise.all([
        rmCalendarDb.contacts.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.organizations.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.places.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.contactOrganizations.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.contactPlaces.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.activities.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.activityContacts.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.tasks.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.followUps.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.notes.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.activityHistory.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.taskHistory.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.reminders.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.tags.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.tagAssignments.where('workspaceId').equals(workspaceId).toArray(),
        rmCalendarDb.drafts.where('workspaceId').equals(workspaceId).toArray()
      ])

      return {
        format: 'rm-calendar-local-export',
        version: 1,
        exportedAt: nowIso(),
        privacyNotice: 'This file can contain private planning details. Store and share it only where you intend.',
        workspace,
        records: {
          contacts,
          organizations,
          places,
          contactOrganizations,
          contactPlaces,
          activities,
          activityContacts,
          tasks,
          followUps,
          notes,
          activityHistory,
          taskHistory,
          reminders,
          tags,
          tagAssignments,
          drafts
        }
      }
    }
  )
}

export function localWorkspaceExportFileName(exportedAt: string) {
  return 'rm-calendar-local-export-' + exportedAt.slice(0, 10) + '.json'
}

export function downloadLocalWorkspaceExport(data: LocalWorkspaceExportV1) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = localWorkspaceExportFileName(data.exportedAt)
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
