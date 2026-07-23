import type { WorkspaceSnapshot } from '../../domain/models'
import { rmCalendarDb } from './RmCalendarDatabase'

export async function loadWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot | undefined> {
  const [workspace, contacts, organizations, contactOrganizations, places, activities, tasks, activityContacts, activityHistory, taskHistory, notes, followUps] = await Promise.all([
    rmCalendarDb.workspaces.get(workspaceId),
    rmCalendarDb.contacts.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.organizations.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.contactOrganizations.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.places.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.activities.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.tasks.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.activityContacts.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.activityHistory.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.taskHistory.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.notes.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.followUps.where('workspaceId').equals(workspaceId).toArray()
  ])

  if (!workspace || workspace.deletedAt) {
    return undefined
  }

  return {
    workspace,
    contacts: contacts.filter((contact) => !contact.deletedAt).sort((left, right) => left.displayName.localeCompare(right.displayName)),
    organizations: organizations.filter((organization) => !organization.deletedAt).sort((left, right) => left.name.localeCompare(right.name)),
    contactOrganizations: contactOrganizations.filter((link) => !link.deletedAt),
    places: places.filter((place) => !place.deletedAt).sort((left, right) => left.name.localeCompare(right.name)),
    activities: activities.filter((activity) => !activity.deletedAt),
    tasks: tasks.filter((task) => !task.deletedAt),
    activityContacts: activityContacts.filter((link) => !link.deletedAt),
    activityHistory: activityHistory.filter((history) => !history.deletedAt),
    taskHistory: taskHistory.filter((history) => !history.deletedAt),
    notes: notes.filter((note) => !note.deletedAt),
    followUps: followUps.filter((followUp) => !followUp.deletedAt)
  }
}
