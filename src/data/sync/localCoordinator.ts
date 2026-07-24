import type { OutboxOperationRecord, SyncConflictRecord, SyncState } from '../../domain/models'
import { outboxEntityId, syncEntityTypeForOperation, syncEntityTypes, type SyncEntityType } from '../../domain/sync'
import { createLocalId } from '../../lib/ids'
import { rmCalendarDb } from '../local/RmCalendarDatabase'
import type { SyncApplyResult, SyncEntityRevision, SyncErrorCode, SyncTransport } from './contracts'
import { buildSyncOperationEnvelope, LocalSyncPreparationError } from './operationPayload'

const tableNameByEntity: Record<SyncEntityType, string> = {
  contact: 'contacts',
  organization: 'organizations',
  place: 'places',
  activity: 'activities',
  task: 'tasks',
  note: 'notes',
  follow_up: 'followUps'
}

export type SyncCycleSummary = {
  status: 'completed' | 'already_running'
  prepared: number
  acknowledged: number
  retried: number
  conflicted: number
  rejected: number
  blockedLocally: number
}

export type SyncCycleOptions = {
  now?: string
  limit?: number
}

function zeroSummary(status: SyncCycleSummary['status']): SyncCycleSummary {
  return {
    status,
    prepared: 0,
    acknowledged: 0,
    retried: 0,
    conflicted: 0,
    rejected: 0,
    blockedLocally: 0
  }
}

function retryAt(now: string, attemptCount: number) {
  const delayMilliseconds = Math.min(5 * 60_000, 5_000 * 2 ** Math.max(0, attemptCount - 1))
  return new Date(new Date(now).getTime() + delayMilliseconds).toISOString()
}

function isReadyForAttempt(operation: OutboxOperationRecord, now: string) {
  if (operation.status === 'ready') {
    return true
  }
  return operation.status === 'failed' && (!operation.nextRetryAt || operation.nextRetryAt <= now)
}

function compoundTargetReference(operation: OutboxOperationRecord) {
  if (operation.kind !== 'create_follow_up') {
    return undefined
  }
  const entityId = operation.payloadJson.targetEntityId
  const entityType = operation.payloadJson.targetEntityType
  if (
    typeof entityId !== 'string' ||
    typeof entityType !== 'string' ||
    !(syncEntityTypes as readonly string[]).includes(entityType) ||
    entityType === 'follow_up'
  ) {
    return undefined
  }
  return { entityId, entityType: entityType as Exclude<SyncEntityType, 'follow_up'> }
}

function operationProducesEntity(operation: OutboxOperationRecord, entityType: SyncEntityType, entityId: string) {
  if (syncEntityTypeForOperation(operation.kind) === entityType && outboxEntityId(operation.payloadJson) === entityId) {
    return true
  }
  const compoundTarget = compoundTargetReference(operation)
  return compoundTarget?.entityType === entityType && compoundTarget.entityId === entityId
}

function selectDependencyReadyOperations(operations: OutboxOperationRecord[], now: string, limit: number) {
  const outstandingIds = new Set(operations.map((operation) => operation.operationId))
  return operations
    .filter((operation) => isReadyForAttempt(operation, now))
    .filter((operation) => operation.dependsOnJson.every((dependencyId) => !outstandingIds.has(dependencyId)))
    .sort((left, right) => left.sequence - right.sequence)
    .slice(0, limit)
}

async function setEntitySyncState(
  workspaceId: string,
  entityType: SyncEntityType,
  entityId: string,
  syncState: SyncState,
  options: { serverRevision?: number; pendingBaseRevision?: number; lastLocalMutationId?: string } = {}
) {
  const table = rmCalendarDb.table(tableNameByEntity[entityType])
  const current = await table.get(entityId) as Record<string, unknown> | undefined
  if (!current || current.workspaceId !== workspaceId) {
    return
  }

  const updated: Record<string, unknown> = {
    ...current,
    syncState
  }
  if (typeof options.serverRevision === 'number') {
    updated.revision = options.serverRevision
  }
  if (typeof options.pendingBaseRevision === 'number') {
    updated.pendingBaseRevision = options.pendingBaseRevision
  } else if (syncState === 'synced') {
    delete updated.pendingBaseRevision
  }
  if (options.lastLocalMutationId) {
    updated.lastLocalMutationId = options.lastLocalMutationId
  }

  await table.put(updated)
}

async function setOperationRetry(operation: OutboxOperationRecord, now: string, errorCode: SyncErrorCode, retryAtOverride?: string) {
  const attempted = operation.attemptCount + 1
  await rmCalendarDb.outboxOperations.put({
    ...operation,
    status: 'failed',
    attemptCount: attempted,
    nextRetryAt: retryAtOverride ?? retryAt(now, attempted),
    lastErrorCode: errorCode
  })

  const entityType = syncEntityTypeForOperation(operation.kind)
  const entityId = outboxEntityId(operation.payloadJson)
  if (entityType && entityId) {
    await setEntitySyncState(operation.workspaceId, entityType, entityId, 'failed')
  }
  const compoundTarget = compoundTargetReference(operation)
  if (compoundTarget) {
    await setEntitySyncState(operation.workspaceId, compoundTarget.entityType, compoundTarget.entityId, 'failed')
  }
}

async function setOperationRejected(operation: OutboxOperationRecord, errorCode: SyncErrorCode) {
  await rmCalendarDb.outboxOperations.put({
    ...operation,
    status: 'blocked',
    lastErrorCode: errorCode,
    nextRetryAt: undefined
  })

  const entityType = syncEntityTypeForOperation(operation.kind)
  const entityId = outboxEntityId(operation.payloadJson)
  if (entityType && entityId) {
    await setEntitySyncState(operation.workspaceId, entityType, entityId, 'failed')
  }
  const compoundTarget = compoundTargetReference(operation)
  if (compoundTarget) {
    await setEntitySyncState(operation.workspaceId, compoundTarget.entityType, compoundTarget.entityId, 'failed')
  }
}

async function setOperationConflict(
  operation: OutboxOperationRecord,
  errorCode: Extract<SyncErrorCode, 'REVISION_CONFLICT'>,
  localRecordJson: Record<string, unknown>,
  remoteRecordJson: Record<string, unknown> | undefined,
  now: string
) {
  const entityType = syncEntityTypeForOperation(operation.kind)
  const entityId = outboxEntityId(operation.payloadJson)
  if (!entityType || !entityId) {
    await setOperationRejected(operation, 'PROTOCOL_ERROR')
    return
  }

  const conflict: SyncConflictRecord = {
    id: createLocalId(),
    workspaceId: operation.workspaceId,
    createdAt: now,
    updatedAt: now,
    clientUpdatedAt: now,
    revision: 1,
    syncState: 'synced',
    entityType,
    entityId,
    operationId: operation.operationId,
    state: 'needs_attention',
    detectedAt: now,
    errorCode,
    localRecordJson,
    remoteRecordJson
  }
  await rmCalendarDb.outboxOperations.put({
    ...operation,
    status: 'blocked',
    lastErrorCode: errorCode,
    nextRetryAt: undefined
  })
  await rmCalendarDb.conflicts.add(conflict)
  await setEntitySyncState(operation.workspaceId, entityType, entityId, 'needs_attention')
  const compoundTarget = compoundTargetReference(operation)
  if (compoundTarget) {
    await setEntitySyncState(operation.workspaceId, compoundTarget.entityType, compoundTarget.entityId, 'needs_attention')
  }
}

async function acknowledgeEntityRevision(
  operation: OutboxOperationRecord,
  entityRevision: SyncEntityRevision
) {
  const outstandingOperations = await rmCalendarDb.outboxOperations.where('workspaceId').equals(operation.workspaceId).toArray()
  const remainingOperations = outstandingOperations
    .filter((candidate) => operationProducesEntity(candidate, entityRevision.entityType, entityRevision.entityId))
    .sort((left, right) => left.sequence - right.sequence)
  const nextOperation = remainingOperations[0]
  if (nextOperation) {
    await rmCalendarDb.outboxOperations.put({
      ...nextOperation,
      baseRevision: entityRevision.serverRevision
    })
    await setEntitySyncState(operation.workspaceId, entityRevision.entityType, entityRevision.entityId, 'pending', {
      serverRevision: entityRevision.serverRevision,
      pendingBaseRevision: entityRevision.serverRevision,
      lastLocalMutationId: operation.operationId
    })
    return
  }

  if (entityRevision.entityType === 'activity') {
    const dependentFollowUps = outstandingOperations.filter(
      (candidate) =>
        candidate.dependsOnJson.includes(operation.operationId) &&
        candidate.payloadJson.sourceActivityId === entityRevision.entityId
    )
    for (const dependent of dependentFollowUps) {
      await rmCalendarDb.outboxOperations.put({
        ...dependent,
        payloadJson: {
          ...dependent.payloadJson,
          sourceBaseRevision: entityRevision.serverRevision
        }
      })
    }
  }

  await setEntitySyncState(operation.workspaceId, entityRevision.entityType, entityRevision.entityId, 'synced', {
    serverRevision: entityRevision.serverRevision,
    lastLocalMutationId: operation.operationId
  })
}

async function acknowledgeOperation(
  operation: OutboxOperationRecord,
  serverRevision: number,
  entityRevisions?: SyncEntityRevision[]
) {
  const entityType = syncEntityTypeForOperation(operation.kind)
  const entityId = outboxEntityId(operation.payloadJson)
  await rmCalendarDb.outboxOperations.delete(operation.operationId)
  if (!entityType || !entityId) {
    return
  }

  const revisions = entityRevisions?.length
    ? entityRevisions
    : [{ entityType, entityId, serverRevision }]
  const uniqueRevisions = revisions.filter(
    (revision, index) =>
      revisions.findIndex(
        (candidate) => candidate.entityType === revision.entityType && candidate.entityId === revision.entityId
      ) === index
  )
  for (const revision of uniqueRevisions) {
    await acknowledgeEntityRevision(operation, revision)
  }
}

async function acquireSyncRun(workspaceId: string, now: string) {
  let acquired = false
  await rmCalendarDb.transaction('rw', ['syncMetadata'], async () => {
    const metadata = await rmCalendarDb.syncMetadata.get(workspaceId)
    if (metadata?.syncInProgress) {
      return
    }
    acquired = true
    await rmCalendarDb.syncMetadata.put({
      workspaceId,
      pullCursor: metadata?.pullCursor,
      lastSuccessAt: metadata?.lastSuccessAt,
      lastAttemptAt: now,
      lastErrorCode: undefined,
      syncInProgress: true
    })
  })
  return acquired
}

async function finishSyncRun(workspaceId: string, now: string, errorCode?: string) {
  const metadata = await rmCalendarDb.syncMetadata.get(workspaceId)
  await rmCalendarDb.syncMetadata.put({
    workspaceId,
    pullCursor: metadata?.pullCursor,
    lastSuccessAt: errorCode ? metadata?.lastSuccessAt : now,
    lastAttemptAt: now,
    lastErrorCode: errorCode,
    syncInProgress: false
  })
}

export async function runLocalSyncCycle(
  workspaceId: string,
  transport: SyncTransport,
  options: SyncCycleOptions = {}
): Promise<SyncCycleSummary> {
  const now = options.now ?? new Date().toISOString()
  const limit = Math.max(1, Math.min(50, options.limit ?? 20))
  if (!await acquireSyncRun(workspaceId, now)) {
    return zeroSummary('already_running')
  }

  const summary = zeroSummary('completed')
  try {
    const outstanding = await rmCalendarDb.outboxOperations.where('workspaceId').equals(workspaceId).toArray()
    const candidates = selectDependencyReadyOperations(outstanding, now, limit)
    const prepared: Array<{ operation: OutboxOperationRecord; envelope: Awaited<ReturnType<typeof buildSyncOperationEnvelope>> }> = []

    for (const operation of candidates) {
      try {
        prepared.push({ operation, envelope: await buildSyncOperationEnvelope(operation) })
      } catch (error) {
        const code = error instanceof LocalSyncPreparationError ? error.errorCode : 'PROTOCOL_ERROR'
        await setOperationRejected(operation, code)
        summary.blockedLocally += 1
      }
    }

    if (!prepared.length) {
      await finishSyncRun(workspaceId, now)
      return summary
    }

    await rmCalendarDb.transaction('rw', ['outboxOperations'], async () => {
      for (const item of prepared) {
        await rmCalendarDb.outboxOperations.put({
          ...item.operation,
          status: 'processing',
          lastErrorCode: undefined
        })
      }
    })
    summary.prepared = prepared.length

    let response
    try {
      response = await transport.applySyncBatch({
        workspaceId,
        operations: prepared.map((item) => item.envelope)
      })
    } catch {
      await rmCalendarDb.transaction(
        'rw',
        ['contacts', 'organizations', 'places', 'activities', 'tasks', 'notes', 'followUps', 'outboxOperations'],
        async () => {
          for (const item of prepared) {
            const processing = await rmCalendarDb.outboxOperations.get(item.operation.operationId)
            if (processing) {
              await setOperationRetry(processing, now, 'SYNC_UNAVAILABLE')
            }
          }
        }
      )
      summary.retried = prepared.length
      await finishSyncRun(workspaceId, now, 'SYNC_UNAVAILABLE')
      return summary
    }

    const resultByOperationId = new Map<string, SyncApplyResult>()
    for (const result of response.results) {
      if (!resultByOperationId.has(result.operationId)) {
        resultByOperationId.set(result.operationId, result)
      }
    }

    await rmCalendarDb.transaction(
      'rw',
      ['contacts', 'organizations', 'places', 'activities', 'tasks', 'notes', 'followUps', 'outboxOperations', 'conflicts'],
      async () => {
        for (const item of prepared) {
          const processing = await rmCalendarDb.outboxOperations.get(item.operation.operationId)
          if (!processing) {
            continue
          }
          const result = resultByOperationId.get(item.operation.operationId)
          if (!result) {
            await setOperationRetry(processing, now, 'PROTOCOL_ERROR')
            summary.retried += 1
            continue
          }

          if (result.disposition === 'applied' || result.disposition === 'already_applied') {
            await acknowledgeOperation(processing, result.serverRevision, result.entityRevisions)
            summary.acknowledged += 1
          } else if (result.disposition === 'retry') {
            await setOperationRetry(processing, now, result.errorCode, result.retryAt)
            summary.retried += 1
          } else if (result.disposition === 'conflict') {
            await setOperationConflict(processing, result.errorCode, item.envelope.payload.record, result.remoteRecord, now)
            summary.conflicted += 1
          } else if (result.disposition === 'rejected') {
            await setOperationRejected(processing, result.errorCode)
            summary.rejected += 1
          }
        }
      }
    )

    await finishSyncRun(workspaceId, now)
    return summary
  } catch (error) {
    await finishSyncRun(workspaceId, now, 'PROTOCOL_ERROR')
    throw error
  }
}
