import type { OutboxOperationRecord } from '../../domain/models'
import type { SyncEntityType, SyncOperationKind } from '../../domain/sync'

export type SyncJson = Record<string, unknown>

export type SyncOperationEnvelope = {
  operationId: string
  workspaceId: string
  sequence: number
  kind: SyncOperationKind
  entityType: SyncEntityType
  entityId: string
  baseRevision: number
  dependsOnOperationIds: string[]
  payload: {
    record: SyncJson
    context?: SyncJson
  }
}

export type SyncBatchRequest = {
  workspaceId: string
  operations: SyncOperationEnvelope[]
}

export type SyncErrorCode =
  | 'SYNC_UNAVAILABLE'
  | 'NETWORK_TIMEOUT'
  | 'PROTOCOL_ERROR'
  | 'VALIDATION_FAILED'
  | 'REVISION_CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DEPENDENCY_MISSING'
  | 'LOCAL_RECORD_MISSING'

export type SyncEntityRevision = {
  entityType: SyncEntityType
  entityId: string
  serverRevision: number
}

export type SyncApplyResult =
  | {
      operationId: string
      disposition: 'applied' | 'already_applied'
      serverRevision: number
      entityRevisions?: SyncEntityRevision[]
    }
  | {
      operationId: string
      disposition: 'retry'
      errorCode: Extract<SyncErrorCode, 'SYNC_UNAVAILABLE' | 'NETWORK_TIMEOUT' | 'PROTOCOL_ERROR'>
      retryAt?: string
    }
  | {
      operationId: string
      disposition: 'conflict'
      errorCode: Extract<SyncErrorCode, 'REVISION_CONFLICT'>
      remoteRecord?: SyncJson
    }
  | {
      operationId: string
      disposition: 'rejected'
      errorCode: Extract<SyncErrorCode, 'VALIDATION_FAILED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'DEPENDENCY_MISSING'>
    }

export type SyncBatchResponse = {
  results: SyncApplyResult[]
}

export type PullChangesRequest = {
  workspaceId: string
  cursor?: string
  limit: number
}

export type RemoteChange = {
  changeId: string
  entityType: SyncEntityType
  entityId: string
  revision: number
  changedAt: string
  record: SyncJson
}

export type PullChangesResponse = {
  changes: RemoteChange[]
  nextCursor?: string
  hasMore: boolean
}

export interface SyncTransport {
  applySyncBatch(request: SyncBatchRequest): Promise<SyncBatchResponse>
  pullChanges(request: PullChangesRequest): Promise<PullChangesResponse>
}

export type SyncDiagnostic = {
  operationId: string
  workspaceId: string
  sequence: number
  kind: string
  entityType?: string
  entityId?: string
  status: OutboxOperationRecord['status']
  attemptCount: number
  errorCode?: string
}
