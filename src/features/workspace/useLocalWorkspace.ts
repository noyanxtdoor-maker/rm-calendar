import { useContext } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadWorkspaceSnapshot } from '../../data/local/queries'
import { syncDiagnosticForOperation } from '../../data/sync/operationPayload'
import { rmCalendarDb } from '../../data/local/RmCalendarDatabase'
import { LocalWorkspaceContext } from './LocalWorkspaceContext'

export function useLocalWorkspace() {
  const context = useContext(LocalWorkspaceContext)
  if (!context) {
    throw new Error('useLocalWorkspace must be used inside LocalWorkspaceProvider.')
  }

  return context
}

export function useWorkspaceSnapshot() {
  const { workspace } = useLocalWorkspace()
  return useLiveQuery(() => loadWorkspaceSnapshot(workspace.id), [workspace.id])
}

export function useLocalSyncStatus() {
  const { workspace } = useLocalWorkspace()
  return useLiveQuery(async () => {
    const [operations, conflicts, metadata] = await Promise.all([
      rmCalendarDb.outboxOperations.where('workspaceId').equals(workspace.id).toArray(),
      rmCalendarDb.conflicts.where('workspaceId').equals(workspace.id).toArray(),
      rmCalendarDb.syncMetadata.get(workspace.id)
    ])
    const orderedOperations = operations.sort((left, right) => left.sequence - right.sequence)
    return {
      queued: orderedOperations.filter((operation) => operation.status === 'ready' || operation.status === 'processing').length,
      retrying: orderedOperations.filter((operation) => operation.status === 'failed').length,
      blocked: orderedOperations.filter((operation) => operation.status === 'blocked').length,
      conflicts: conflicts.filter((conflict) => conflict.state === 'needs_attention').length,
      lastAttemptAt: metadata?.lastAttemptAt,
      lastErrorCode: metadata?.lastErrorCode,
      operations: orderedOperations.map(syncDiagnosticForOperation)
    }
  }, [workspace.id])
}
