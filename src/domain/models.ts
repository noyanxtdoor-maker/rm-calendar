export const syncStates = ['synced', 'pending', 'failed', 'needs_attention'] as const

export type SyncState = (typeof syncStates)[number]

export type RecordEnvelope = {
  id: string
  workspaceId: string
  createdAt: string
  updatedAt: string
  clientUpdatedAt: string
  deletedAt?: string
  revision: number
  syncState: SyncState
  pendingBaseRevision?: number
  lastLocalMutationId?: string
}

export type WorkspaceRecord = {
  id: string
  name: string
  timezone: string
  ownerUserId: string
  terminologyJson: Record<string, string>
  createdAt: string
  updatedAt: string
  clientUpdatedAt: string
  deletedAt?: string
  revision: number
  syncState: SyncState
}

export type ContactRecord = RecordEnvelope & {
  displayName: string
  displayNameNormalized: string
  firstSeenAt?: string
  preferredContactMethod?: 'phone' | 'message' | 'email' | 'in-person'
}

export type OrganizationRecord = RecordEnvelope & {
  name: string
  nameNormalized: string
  kind: 'household' | 'group' | 'other'
}

export type PlaceRecord = RecordEnvelope & {
  name: string
  nameNormalized: string
  addressText?: string
  entranceNotes?: string
  latitude?: number
  longitude?: number
}

export type ActivityState = 'draft' | 'scheduled' | 'completed' | 'cancelled'

export type ActivityType = 'visit' | 'planning' | 'service' | 'personal' | 'other'

export type ActivityRecord = RecordEnvelope & {
  title: string
  activityType: ActivityType
  state: ActivityState
  scheduledDate?: string
  scheduledStartAt?: string
  scheduledEndAt?: string
  scheduleTimezone?: string
  actualCompletedAt?: string
  objectiveText?: string
  outcomeText?: string
  primaryPlaceId?: string
  cancelReason?: string
}

export type ActivityContactRecord = RecordEnvelope & {
  activityId: string
  contactId: string
  isPrimary: boolean
  contactDisplayNameSnapshot?: string
}

export type TaskState = 'open' | 'completed' | 'cancelled'

export type TaskRecord = RecordEnvelope & {
  title: string
  state: TaskState
  dueDate?: string
  dueAt?: string
  priority: 'low' | 'normal' | 'high'
  completedAt?: string
  cancelReason?: string
  contactId?: string
  organizationId?: string
  placeId?: string
  activityId?: string
  parentTaskId?: string
}

export type GenericWorkspaceRecord = RecordEnvelope & Record<string, unknown>

export type OutboxOperationRecord = {
  operationId: string
  workspaceId: string
  sequence: number
  kind: string
  payloadJson: Record<string, unknown>
  baseRevision?: number
  dependsOnJson: string[]
  status: 'ready' | 'processing' | 'failed' | 'blocked'
  attemptCount: number
  nextRetryAt?: string
  lastErrorCode?: string
  createdAt: string
}

export type SyncMetadataRecord = {
  workspaceId: string
  pullCursor?: string
  lastSuccessAt?: string
  lastAttemptAt?: string
  lastErrorCode?: string
  syncInProgress: boolean
}

export type LocalSettingRecord = {
  key: string
  valueJson: Record<string, unknown>
  updatedAt: string
}

export type WorkspaceSnapshot = {
  workspace: WorkspaceRecord
  contacts: ContactRecord[]
  places: PlaceRecord[]
  activities: ActivityRecord[]
  tasks: TaskRecord[]
  activityContacts: ActivityContactRecord[]
}
