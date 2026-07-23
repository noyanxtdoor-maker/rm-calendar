import type { WorkspaceSnapshot } from '../../domain/models'
import { rmCalendarDb } from './RmCalendarDatabase'

export async function loadWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot | undefined> {
  const [workspace, contacts, places, activities, tasks, activityContacts] = await Promise.all([
    rmCalendarDb.workspaces.get(workspaceId),
    rmCalendarDb.contacts.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.places.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.activities.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.tasks.where('workspaceId').equals(workspaceId).toArray(),
    rmCalendarDb.activityContacts.where('workspaceId').equals(workspaceId).toArray()
  ])

  if (!workspace || workspace.deletedAt) {
    return undefined
  }

  return {
    workspace,
    contacts: contacts.filter((contact) => !contact.deletedAt).sort((left, right) => left.displayName.localeCompare(right.displayName)),
    places: places.filter((place) => !place.deletedAt).sort((left, right) => left.name.localeCompare(right.name)),
    activities: activities.filter((activity) => !activity.deletedAt),
    tasks: tasks.filter((task) => !task.deletedAt),
    activityContacts: activityContacts.filter((link) => !link.deletedAt)
  }
}
