export const syncEntityTypes = [
  'contact',
  'organization',
  'place',
  'activity',
  'task',
  'note',
  'follow_up'
] as const

export type SyncEntityType = (typeof syncEntityTypes)[number]

export const syncOperationKinds = [
  'create_contact',
  'create_household',
  'create_focus_group',
  'create_place',
  'create_activity',
  'update_activity',
  'complete_activity',
  'reopen_activity',
  'quick_capture_activity',
  'create_task',
  'complete_task',
  'create_note',
  'create_follow_up'
] as const

export type SyncOperationKind = (typeof syncOperationKinds)[number]

const entityTypeByOperation: Record<SyncOperationKind, SyncEntityType> = {
  create_contact: 'contact',
  create_household: 'organization',
  create_focus_group: 'organization',
  create_place: 'place',
  create_activity: 'activity',
  update_activity: 'activity',
  complete_activity: 'activity',
  reopen_activity: 'activity',
  quick_capture_activity: 'activity',
  create_task: 'task',
  complete_task: 'task',
  create_note: 'note',
  create_follow_up: 'follow_up'
}

export function isSyncOperationKind(value: string): value is SyncOperationKind {
  return (syncOperationKinds as readonly string[]).includes(value)
}

export function syncEntityTypeForOperation(value: string): SyncEntityType | undefined {
  return isSyncOperationKind(value) ? entityTypeByOperation[value] : undefined
}

export function outboxEntityId(payload: Record<string, unknown>) {
  const entityId = payload.entityId
  return typeof entityId === 'string' && entityId.length > 0 ? entityId : undefined
}
