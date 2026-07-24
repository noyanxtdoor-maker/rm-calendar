import type { SupabaseClient } from '@supabase/supabase-js'
import type { PullChangesRequest, PullChangesResponse, SyncBatchRequest, SyncBatchResponse, SyncTransport } from './contracts'

function requireObject(value: unknown, operation: string) {
  if (!value || typeof value !== 'object') {
    throw new Error(`Supabase ${operation} returned an invalid response.`)
  }
  return value
}

/** The only sync transport aware of Supabase RPC names. */
export class SupabaseSyncTransport implements SyncTransport {
  constructor(private readonly client: SupabaseClient) {}

  async applySyncBatch(request: SyncBatchRequest): Promise<SyncBatchResponse> {
    const { data, error } = await this.client.rpc('apply_sync_batch', {
      p_workspace_id: request.workspaceId,
      p_operations: request.operations
    })
    if (error) throw error
    return requireObject(data, 'apply_sync_batch') as SyncBatchResponse
  }

  async pullChanges(request: PullChangesRequest): Promise<PullChangesResponse> {
    const { data, error } = await this.client.rpc('pull_changes', {
      p_workspace_id: request.workspaceId,
      p_after_cursor: request.cursor ? Number(request.cursor) : 0,
      p_page_size: request.limit
    })
    if (error) throw error
    return requireObject(data, 'pull_changes') as PullChangesResponse
  }
}
