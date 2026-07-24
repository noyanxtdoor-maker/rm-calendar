import type {
  ActivityContactRecord,
  ActivityRecord,
  ContactOrganizationRecord,
  ContactRecord,
  FollowUpRecord,
  NoteRecord,
  OrganizationRecord,
  OutboxOperationRecord,
  PlaceRecord,
  TaskRecord
} from '../../domain/models'
import { outboxEntityId, syncEntityTypeForOperation, type SyncEntityType } from '../../domain/sync'
import { rmCalendarDb } from '../local/RmCalendarDatabase'
import type { SyncDiagnostic, SyncJson, SyncOperationEnvelope } from './contracts'

type SynchronizableRecord =
  | ActivityRecord
  | ContactRecord
  | FollowUpRecord
  | NoteRecord
  | OrganizationRecord
  | PlaceRecord
  | TaskRecord

export class LocalSyncPreparationError extends Error {
  readonly errorCode: 'LOCAL_RECORD_MISSING' | 'PROTOCOL_ERROR'

  constructor(errorCode: 'LOCAL_RECORD_MISSING' | 'PROTOCOL_ERROR', message: string) {
    super(message)
    this.name = 'LocalSyncPreparationError'
    this.errorCode = errorCode
  }
}

function toRemoteRecord(record: SynchronizableRecord): SyncJson {
  const remoteRecord = { ...record } as SyncJson
  delete remoteRecord.syncState
  delete remoteRecord.pendingBaseRevision
  delete remoteRecord.lastLocalMutationId
  return remoteRecord
}

function toRemoteActivityContact(record: ActivityContactRecord) {
  const remoteRecord = { ...record } as SyncJson
  delete remoteRecord.syncState
  delete remoteRecord.pendingBaseRevision
  delete remoteRecord.lastLocalMutationId
  return remoteRecord
}

function toRemoteContactOrganization(record: ContactOrganizationRecord) {
  const remoteRecord = { ...record } as SyncJson
  delete remoteRecord.syncState
  delete remoteRecord.pendingBaseRevision
  delete remoteRecord.lastLocalMutationId
  return remoteRecord
}

async function loadEntityRecord(entityType: SyncEntityType, entityId: string) {
  switch (entityType) {
    case 'contact':
      return rmCalendarDb.contacts.get(entityId)
    case 'organization':
      return rmCalendarDb.organizations.get(entityId)
    case 'place':
      return rmCalendarDb.places.get(entityId)
    case 'activity':
      return rmCalendarDb.activities.get(entityId)
    case 'task':
      return rmCalendarDb.tasks.get(entityId)
    case 'note':
      return rmCalendarDb.notes.get(entityId)
    case 'follow_up':
      return rmCalendarDb.followUps.get(entityId)
  }
}

async function primaryActivityContact(workspaceId: string, activityId: string) {
  return rmCalendarDb.activityContacts
    .where('[workspaceId+activityId]')
    .equals([workspaceId, activityId])
    .filter((link) => link.isPrimary)
    .first()
}

async function activityContext(workspaceId: string, activity: ActivityRecord) {
  const primaryContact = await primaryActivityContact(workspaceId, activity.id)
  return primaryContact ? { primaryContact: toRemoteActivityContact(primaryContact) } : undefined
}

async function focusGroupContext(workspaceId: string, group: OrganizationRecord) {
  const memberLinks = await rmCalendarDb.contactOrganizations
    .where('[workspaceId+organizationId]')
    .equals([workspaceId, group.id])
    .toArray()
  return { memberLinks: memberLinks.filter((link) => !link.deletedAt).map(toRemoteContactOrganization) }
}

function numberFromPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

async function followUpContext(workspaceId: string, followUp: FollowUpRecord, sourceBaseRevision?: number) {
  const sourceActivity = await rmCalendarDb.activities.get(followUp.sourceActivityId)
  if (!sourceActivity || sourceActivity.workspaceId !== workspaceId) {
    throw new LocalSyncPreparationError('LOCAL_RECORD_MISSING', 'The follow-up source activity is not available locally.')
  }

  const sourcePrimaryContact = await primaryActivityContact(workspaceId, sourceActivity.id)
  if (followUp.targetKind === 'task') {
    const targetTask = followUp.targetTaskId ? await rmCalendarDb.tasks.get(followUp.targetTaskId) : undefined
    if (!targetTask || targetTask.workspaceId !== workspaceId) {
      throw new LocalSyncPreparationError('LOCAL_RECORD_MISSING', 'The follow-up task target is not available locally.')
    }

    return {
      sourceActivity: toRemoteRecord(sourceActivity),
      sourcePrimaryContact: sourcePrimaryContact ? toRemoteActivityContact(sourcePrimaryContact) : undefined,
      targetTask: toRemoteRecord(targetTask),
      ...(typeof sourceBaseRevision === 'number' ? { sourceBaseRevision } : {})
    }
  }

  const targetActivity = followUp.targetActivityId ? await rmCalendarDb.activities.get(followUp.targetActivityId) : undefined
  if (!targetActivity || targetActivity.workspaceId !== workspaceId) {
    throw new LocalSyncPreparationError('LOCAL_RECORD_MISSING', 'The follow-up activity target is not available locally.')
  }
  const targetPrimaryContact = await primaryActivityContact(workspaceId, targetActivity.id)

  return {
    sourceActivity: toRemoteRecord(sourceActivity),
    sourcePrimaryContact: sourcePrimaryContact ? toRemoteActivityContact(sourcePrimaryContact) : undefined,
    targetActivity: toRemoteRecord(targetActivity),
    targetPrimaryContact: targetPrimaryContact ? toRemoteActivityContact(targetPrimaryContact) : undefined,
    ...(typeof sourceBaseRevision === 'number' ? { sourceBaseRevision } : {})
  }
}

export async function buildSyncOperationEnvelope(operation: OutboxOperationRecord): Promise<SyncOperationEnvelope> {
  const entityType = syncEntityTypeForOperation(operation.kind)
  const entityId = outboxEntityId(operation.payloadJson)
  if (!entityType || !entityId) {
    throw new LocalSyncPreparationError('PROTOCOL_ERROR', 'The local sync operation has no supported entity reference.')
  }

  const entity = await loadEntityRecord(entityType, entityId)
  if (!entity || entity.workspaceId !== operation.workspaceId) {
    throw new LocalSyncPreparationError('LOCAL_RECORD_MISSING', 'The local record for this sync operation is unavailable.')
  }

  let context: SyncJson | undefined
  if (entityType === 'activity') {
    context = await activityContext(operation.workspaceId, entity as ActivityRecord)
  } else if (operation.kind === 'create_focus_group') {
    context = await focusGroupContext(operation.workspaceId, entity as OrganizationRecord)
  } else if (entityType === 'follow_up') {
    context = await followUpContext(
      operation.workspaceId,
      entity as FollowUpRecord,
      numberFromPayload(operation.payloadJson, 'sourceBaseRevision')
    )
  }

  return {
    operationId: operation.operationId,
    workspaceId: operation.workspaceId,
    sequence: operation.sequence,
    kind: operation.kind,
    entityType,
    entityId,
    baseRevision: operation.baseRevision ?? entity.pendingBaseRevision ?? 0,
    dependsOnOperationIds: operation.dependsOnJson,
    payload: {
      record: toRemoteRecord(entity),
      ...(context ? { context } : {})
    }
  }
}

export function syncDiagnosticForOperation(operation: OutboxOperationRecord): SyncDiagnostic {
  return {
    operationId: operation.operationId,
    workspaceId: operation.workspaceId,
    sequence: operation.sequence,
    kind: operation.kind,
    entityType: syncEntityTypeForOperation(operation.kind),
    entityId: outboxEntityId(operation.payloadJson),
    status: operation.status,
    attemptCount: operation.attemptCount,
    errorCode: operation.lastErrorCode
  }
}
