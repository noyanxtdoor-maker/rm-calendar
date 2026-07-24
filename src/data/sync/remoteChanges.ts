import type { SyncConflictRecord } from '../../domain/models'
import type { SyncEntityType } from '../../domain/sync'
import { createLocalId } from '../../lib/ids'
import { rmCalendarDb } from '../local/RmCalendarDatabase'
import type { RemoteChange } from './contracts'

const tableNameByEntity: Record<SyncEntityType, string> = {
  contact: 'contacts',
  organization: 'organizations',
  place: 'places',
  activity: 'activities',
  task: 'tasks',
  note: 'notes',
  follow_up: 'followUps'
}

const localKeyByRemoteKey: Record<string, string | undefined> = {
  workspace_id: 'workspaceId',
  display_name: 'displayName',
  display_name_normalized: 'displayNameNormalized',
  preferred_contact_method: 'preferredContactMethod',
  first_seen_at: 'firstSeenAt',
  address_text: 'addressText',
  entrance_notes: 'entranceNotes',
  activity_type: 'activityType',
  scheduled_date: 'scheduledDate',
  scheduled_start_at: 'scheduledStartAt',
  scheduled_end_at: 'scheduledEndAt',
  schedule_timezone: 'scheduleTimezone',
  actual_completed_at: 'actualCompletedAt',
  objective_text: 'objectiveText',
  outcome_text: 'outcomeText',
  primary_place_id: 'primaryPlaceId',
  cancel_reason: 'cancelReason',
  due_date: 'dueDate',
  due_at: 'dueAt',
  completed_at: 'completedAt',
  contact_id: 'contactId',
  organization_id: 'organizationId',
  relationship_label: 'relationshipLabel',
  place_id: 'placeId',
  activity_id: 'activityId',
  parent_task_id: 'parentTaskId',
  is_pinned: 'isPinned',
  source_activity_id: 'sourceActivityId',
  target_kind: 'targetKind',
  target_task_id: 'targetTaskId',
  target_activity_id: 'targetActivityId',
  is_primary: 'isPrimary',
  contact_display_name_snapshot: 'contactDisplayNameSnapshot',
  previous_state: 'previousState',
  new_state: 'newState',
  event_type: 'eventType',
  event_at: 'eventAt',
  event_payload_json: 'eventPayloadJson',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  client_updated_at: 'clientUpdatedAt',
  deleted_at: 'deletedAt',
  created_by: undefined,
  updated_by: undefined,
  actor_user_id: undefined
}

function localRecordFromRemote(record: Record<string, unknown>, workspaceId: string) {
  const local: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    const localKey = localKeyByRemoteKey[key] ?? key
    if (localKey) local[localKey] = value
  }
  if (local.workspaceId !== workspaceId || typeof local.id !== 'string') {
    throw new Error('A remote change did not belong to the active workspace.')
  }
  if (typeof local.revision !== 'number') {
    local.revision = Number(local.revision)
  }
  if (!Number.isFinite(local.revision as number)) {
    throw new Error('A remote change had an invalid revision.')
  }
  if (local.deletedAt === null) delete local.deletedAt
  local.syncState = 'synced'
  delete local.pendingBaseRevision
  delete local.lastLocalMutationId
  return local
}

function relatedRecords(change: RemoteChange, workspaceId: string) {
  const context = change.context
  if (!context || typeof context !== 'object') return []
  const values: Array<{ tableName: string; record: Record<string, unknown> }> = []
  const contextObject = context as Record<string, unknown>
  if (change.entityType === 'activity') {
    if (contextObject.primaryContact && typeof contextObject.primaryContact === 'object') {
      values.push({ tableName: 'activityContacts', record: localRecordFromRemote(contextObject.primaryContact as Record<string, unknown>, workspaceId) })
    }
    if (Array.isArray(contextObject.history)) {
      for (const entry of contextObject.history) {
        if (entry && typeof entry === 'object') values.push({ tableName: 'activityHistory', record: localRecordFromRemote(entry as Record<string, unknown>, workspaceId) })
      }
    }
  }
  if (change.entityType === 'task' && Array.isArray(contextObject.history)) {
    for (const entry of contextObject.history) {
      if (entry && typeof entry === 'object') values.push({ tableName: 'taskHistory', record: localRecordFromRemote(entry as Record<string, unknown>, workspaceId) })
    }
  }
  if (change.entityType === 'organization' && Array.isArray(contextObject.memberLinks)) {
    for (const entry of contextObject.memberLinks) {
      if (entry && typeof entry === 'object') values.push({ tableName: 'contactOrganizations', record: localRecordFromRemote(entry as Record<string, unknown>, workspaceId) })
    }
  }
  return values
}

export type RemoteApplySummary = { applied: number; conflicted: number }

/** Applies a complete pulled page in one IndexedDB transaction. */
export async function applyRemoteChanges(workspaceId: string, changes: RemoteChange[], nextCursor?: string): Promise<RemoteApplySummary> {
  const summary: RemoteApplySummary = { applied: 0, conflicted: 0 }
  const tableNames = ['contacts', 'organizations', 'places', 'activities', 'tasks', 'notes', 'followUps', 'contactOrganizations', 'activityContacts', 'activityHistory', 'taskHistory', 'conflicts', 'syncMetadata']
  await rmCalendarDb.transaction('rw', tableNames, async () => {
    for (const change of changes) {
      if (change.entityId !== change.record.id || change.record.workspace_id !== workspaceId) {
        throw new Error('A remote change did not match its envelope.')
      }
      const table = rmCalendarDb.table(tableNameByEntity[change.entityType])
      const local = await table.get(change.entityId) as Record<string, unknown> | undefined
      const remote = localRecordFromRemote(change.record, workspaceId)
      const localRevision = typeof local?.revision === 'number' ? local.revision : 0
      const hasPendingLocalWork = local?.syncState === 'pending' || local?.syncState === 'failed' || local?.syncState === 'needs_attention'

      if (hasPendingLocalWork && change.revision > localRevision) {
        const conflict: SyncConflictRecord = {
          id: createLocalId(),
          workspaceId,
          createdAt: change.changedAt,
          updatedAt: change.changedAt,
          clientUpdatedAt: change.changedAt,
          revision: 1,
          syncState: 'synced',
          entityType: change.entityType,
          entityId: change.entityId,
          operationId: `remote-change:${change.changeId}`,
          state: 'needs_attention',
          detectedAt: change.changedAt,
          errorCode: 'REVISION_CONFLICT',
          localRecordJson: local,
          remoteRecordJson: remote
        }
        await rmCalendarDb.conflicts.put(conflict)
        summary.conflicted += 1
        continue
      }
      if (!hasPendingLocalWork && localRevision > change.revision) continue

      await table.put(remote)
      for (const related of relatedRecords(change, workspaceId)) {
        await rmCalendarDb.table(related.tableName).put(related.record)
      }
      summary.applied += 1
    }

    const metadata = await rmCalendarDb.syncMetadata.get(workspaceId)
    await rmCalendarDb.syncMetadata.put({
      workspaceId,
      pullCursor: nextCursor ?? metadata?.pullCursor,
      lastSuccessAt: metadata?.lastSuccessAt,
      lastAttemptAt: metadata?.lastAttemptAt,
      lastErrorCode: metadata?.lastErrorCode,
      syncInProgress: metadata?.syncInProgress ?? false
    })
  })
  return summary
}
