import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { OutboxOperationRecord } from '../../domain/models'
import { completeActivity, createActivity, createContact, createFollowUp, updateActivity } from '../local/commands'
import { deleteRmCalendarDatabase, rmCalendarDb } from '../local/RmCalendarDatabase'
import { bootstrapLocalWorkspace, DEMO_WORKSPACE_ID } from '../local/workspace'
import type { PullChangesResponse, SyncBatchRequest, SyncBatchResponse, SyncTransport } from './contracts'
import { runLocalSyncCycle } from './localCoordinator'
import { buildSyncOperationEnvelope, syncDiagnosticForOperation } from './operationPayload'

const firstAttempt = '2026-07-24T00:00:00.000Z'

function successfulTransport(requests: SyncBatchRequest[], firstRevision = 10): SyncTransport {
  return {
    async applySyncBatch(request) {
      requests.push(request)
      return {
        results: request.operations.map((operation, index) => ({
          operationId: operation.operationId,
          disposition: 'applied' as const,
          serverRevision: firstRevision + index + requests.length - 1
        }))
      }
    },
    async pullChanges(): Promise<PullChangesResponse> {
      return { changes: [], hasMore: false }
    }
  }
}

function operationForKind(operations: OutboxOperationRecord[], kind: string) {
  const operation = operations.find((candidate) => candidate.kind === kind)
  if (!operation) {
    throw new Error('Expected outbox operation: ' + kind)
  }
  return operation
}

describe('local sync contract coordinator', () => {
  beforeEach(async () => {
    await deleteRmCalendarDatabase()
    await bootstrapLocalWorkspace()
  })

  afterEach(async () => {
    await deleteRmCalendarDatabase()
  })

  it('keeps linked writes ordered, sends remote-safe payloads, and acknowledges them once', async () => {
    const activity = await createActivity({
      title: 'Ordered local visit',
      activityType: 'visit',
      schedule: { kind: 'all-day', date: '2026-07-24' },
      inlineContactName: 'Ordered local person'
    })
    const initialOperations = await rmCalendarDb.outboxOperations.where('workspaceId').equals(DEMO_WORKSPACE_ID).toArray()
    const contactOperation = operationForKind(initialOperations, 'create_contact')
    const activityOperation = operationForKind(initialOperations, 'create_activity')
    expect(activityOperation.dependsOnJson).toContain(contactOperation.operationId)

    const requests: SyncBatchRequest[] = []
    const transport = successfulTransport(requests)
    expect(await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: firstAttempt })).toMatchObject({
      status: 'completed',
      prepared: 1,
      acknowledged: 1
    })
    expect(requests[0]?.operations.map((operation) => operation.kind)).toEqual(['create_contact'])
    expect((await rmCalendarDb.outboxOperations.get(activityOperation.operationId))?.status).toBe('ready')

    await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: '2026-07-24T00:00:10.000Z' })
    expect(requests[1]?.operations.map((operation) => operation.kind)).toEqual(['create_activity'])
    const activityEnvelope = requests[1]?.operations[0]
    expect(activityEnvelope?.entityId).toBe(activity.id)
    expect(activityEnvelope?.payload.context).toMatchObject({
      primaryContact: { contactId: expect.any(String) }
    })
    expect(JSON.stringify(activityEnvelope?.payload)).not.toContain('syncState')

    expect(await rmCalendarDb.outboxOperations.where('workspaceId').equals(DEMO_WORKSPACE_ID).count()).toBe(0)
    expect((await rmCalendarDb.activities.get(activity.id))?.syncState).toBe('synced')
  })

  it('retains retryable work, records conflicts locally, and never puts private text in diagnostics', async () => {
    const contact = await createContact({ displayName: 'Private diagnostic person' })
    const operation = operationForKind(
      await rmCalendarDb.outboxOperations.where('workspaceId').equals(DEMO_WORKSPACE_ID).toArray(),
      'create_contact'
    )
    expect(JSON.stringify(syncDiagnosticForOperation(operation))).not.toContain('Private diagnostic person')

    const retryTransport: SyncTransport = {
      async applySyncBatch(request): Promise<SyncBatchResponse> {
        return {
          results: request.operations.map((candidate) => ({
            operationId: candidate.operationId,
            disposition: 'retry' as const,
            errorCode: 'NETWORK_TIMEOUT' as const
          }))
        }
      },
      async pullChanges(): Promise<PullChangesResponse> {
        return { changes: [], hasMore: false }
      }
    }
    expect(await runLocalSyncCycle(DEMO_WORKSPACE_ID, retryTransport, { now: firstAttempt })).toMatchObject({
      retried: 1
    })

    const retriable = await rmCalendarDb.outboxOperations.get(operation.operationId)
    expect(retriable).toMatchObject({
      status: 'failed',
      attemptCount: 1,
      lastErrorCode: 'NETWORK_TIMEOUT'
    })
    expect(retriable?.nextRetryAt).toBeTruthy()
    expect((await rmCalendarDb.contacts.get(contact.id))?.syncState).toBe('failed')

    const conflictTransport: SyncTransport = {
      async applySyncBatch(request): Promise<SyncBatchResponse> {
        return {
          results: request.operations.map((candidate) => ({
            operationId: candidate.operationId,
            disposition: 'conflict' as const,
            errorCode: 'REVISION_CONFLICT' as const,
            remoteRecord: { id: contact.id, displayName: 'Remote version' }
          }))
        }
      },
      async pullChanges(): Promise<PullChangesResponse> {
        return { changes: [], hasMore: false }
      }
    }
    await runLocalSyncCycle(DEMO_WORKSPACE_ID, conflictTransport, { now: retriable?.nextRetryAt })

    expect((await rmCalendarDb.outboxOperations.get(operation.operationId))?.status).toBe('blocked')
    expect((await rmCalendarDb.contacts.get(contact.id))?.syncState).toBe('needs_attention')
    expect(await rmCalendarDb.conflicts.where('[workspaceId+entityId]').equals([DEMO_WORKSPACE_ID, contact.id]).count()).toBe(1)
  })

  it('treats an idempotent acknowledgement as safely complete', async () => {
    const contact = await createContact({ displayName: 'Idempotent local person' })
    const idempotentTransport: SyncTransport = {
      async applySyncBatch(request): Promise<SyncBatchResponse> {
        return {
          results: request.operations.map((candidate) => ({
            operationId: candidate.operationId,
            disposition: 'already_applied' as const,
            serverRevision: 31
          }))
        }
      },
      async pullChanges(): Promise<PullChangesResponse> {
        return { changes: [], hasMore: false }
      }
    }

    expect(await runLocalSyncCycle(DEMO_WORKSPACE_ID, idempotentTransport, { now: firstAttempt })).toMatchObject({
      acknowledged: 1
    })
    expect(await rmCalendarDb.outboxOperations.where('workspaceId').equals(DEMO_WORKSPACE_ID).count()).toBe(0)
    expect(await rmCalendarDb.contacts.get(contact.id)).toMatchObject({
      syncState: 'synced',
      revision: 31
    })
  })

  it('updates a dependent local operation to the server revision before it is sent', async () => {
    const activity = await createActivity({
      title: 'Revision-aware activity',
      activityType: 'visit',
      schedule: { kind: 'all-day', date: '2026-07-24' }
    })
    await updateActivity({
      activityId: activity.id,
      title: 'Revision-aware activity, revised',
      activityType: 'visit',
      schedule: { kind: 'all-day', date: '2026-07-24' }
    })
    const beforeFirstAck = await rmCalendarDb.outboxOperations.where('workspaceId').equals(DEMO_WORKSPACE_ID).toArray()
    const createOperation = operationForKind(beforeFirstAck, 'create_activity')
    const updateOperation = operationForKind(beforeFirstAck, 'update_activity')
    expect(updateOperation).toMatchObject({
      baseRevision: 0,
      dependsOnJson: expect.arrayContaining([createOperation.operationId])
    })

    const requests: SyncBatchRequest[] = []
    const transport = successfulTransport(requests, 41)
    await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: firstAttempt })
    expect((await rmCalendarDb.outboxOperations.get(updateOperation.operationId))?.baseRevision).toBe(41)

    await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: '2026-07-24T00:00:10.000Z' })
    expect(requests[1]?.operations[0]).toMatchObject({
      kind: 'update_activity',
      baseRevision: 41
    })
  })

  it('builds a compound follow-up payload and advances its source revision after completion acknowledgement', async () => {
    const source = await createActivity({
      title: 'Follow-up source',
      activityType: 'visit',
      schedule: { kind: 'all-day', date: '2026-07-24' }
    })
    await completeActivity({ activityId: source.id, outcomeText: 'A local outcome.' })
    await createFollowUp({
      sourceActivityId: source.id,
      targetKind: 'task',
      title: 'Follow-up target task',
      dueDate: '2026-07-25',
      priority: 'normal'
    })
    const operations = await rmCalendarDb.outboxOperations.where('workspaceId').equals(DEMO_WORKSPACE_ID).toArray()
    const completion = operationForKind(operations, 'complete_activity')
    const followUp = operationForKind(operations, 'create_follow_up')
    expect(followUp.dependsOnJson).toContain(completion.operationId)
    const initialFollowUpEnvelope = await buildSyncOperationEnvelope(followUp)
    expect(initialFollowUpEnvelope.payload.context).toMatchObject({
      sourceActivity: { id: source.id },
      targetTask: { title: 'Follow-up target task' },
      sourceBaseRevision: 0
    })

    const requests: SyncBatchRequest[] = []
    const transport = successfulTransport(requests, 70)
    await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: firstAttempt })
    await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: '2026-07-24T00:00:10.000Z' })
    expect((await rmCalendarDb.outboxOperations.get(followUp.operationId))?.payloadJson.sourceBaseRevision).toBe(71)

    await runLocalSyncCycle(DEMO_WORKSPACE_ID, transport, { now: '2026-07-24T00:00:20.000Z' })
    expect(requests[2]?.operations[0]?.payload.context).toMatchObject({
      sourceBaseRevision: 71
    })
  })
})
