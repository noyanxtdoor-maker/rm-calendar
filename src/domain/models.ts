import type { SyncEntityType, SyncOperationKind } from './sync'

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

export type ContactOrganizationRecord = RecordEnvelope & {
  contactId: string
  organizationId: string
  relationshipLabel?: string
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

export type ActivityHistoryRecord = RecordEnvelope & {
  activityId: string
  eventType: 'created' | 'scheduled' | 'rescheduled' | 'saved_as_draft' | 'updated' | 'completed' | 'reopened' | 'follow_up_created'
  previousState?: ActivityState
  newState: ActivityState
  eventAt: string
  eventPayloadJson: Record<string, unknown>
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

export type TaskHistoryRecord = RecordEnvelope & {
  taskId: string
  eventType: 'created' | 'completed' | 'cancelled' | 'reopened'
  previousState?: TaskState
  newState: TaskState
  eventAt: string
  eventPayloadJson: Record<string, unknown>
}

export type NoteRecord = RecordEnvelope & {
  body: string
  isPinned: boolean
  contactId?: string
  organizationId?: string
  placeId?: string
  activityId?: string
  taskId?: string
}

export type FollowUpRecord = RecordEnvelope & {
  sourceActivityId: string
  targetKind: 'task' | 'activity'
  targetTaskId?: string
  targetActivityId?: string
}

export type GenericWorkspaceRecord = RecordEnvelope & Record<string, unknown>

export type DraftRecord = {
  id: string
  workspaceId: string
  draftKind: 'activity-form'
  routeContextJson: Record<string, unknown>
  payloadJson: Record<string, unknown>
  updatedAt: string
}

export type OutboxOperationRecord = {
  operationId: string
  workspaceId: string
  sequence: number
  kind: SyncOperationKind
  payloadJson: Record<string, unknown>
  baseRevision?: number
  dependsOnJson: string[]
  status: 'ready' | 'processing' | 'failed' | 'blocked'
  attemptCount: number
  nextRetryAt?: string
  lastErrorCode?: string
  createdAt: string
}

export type SyncConflictRecord = RecordEnvelope & {
  entityType: SyncEntityType
  entityId: string
  operationId: string
  state: 'needs_attention' | 'resolved'
  detectedAt: string
  errorCode: string
  localRecordJson: Record<string, unknown>
  remoteRecordJson?: Record<string, unknown>
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
  organizations: OrganizationRecord[]
  contactOrganizations: ContactOrganizationRecord[]
  places: PlaceRecord[]
  activities: ActivityRecord[]
  tasks: TaskRecord[]
  activityContacts: ActivityContactRecord[]
  activityHistory: ActivityHistoryRecord[]
  taskHistory: TaskHistoryRecord[]
  notes: NoteRecord[]
  followUps: FollowUpRecord[]
}
