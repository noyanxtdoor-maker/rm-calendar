import { Link } from 'react-router-dom'
import { useState } from 'react'
import { runLocalSyncCycle } from '../../data/sync/localCoordinator'
import { configuredSupabaseClient } from '../../data/sync/supabaseClient'
import { SupabaseSyncTransport } from '../../data/sync/SupabaseSyncTransport'
import { useSupabaseAuth } from '../auth/useSupabaseAuth'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'
import { useLocalSyncStatus, useLocalWorkspace } from '../workspace/useLocalWorkspace'

function readableOperationKind(kind: string) {
  return kind.replaceAll('_', ' ')
}

export function SyncStatusScreen() {
  const sync = useLocalSyncStatus()
  const { workspace } = useLocalWorkspace()
  const auth = useSupabaseAuth()
  const { client } = configuredSupabaseClient()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()

  if (!sync) {
    return <LoadingPanel label="Reading local sync status" />
  }

  const cloudWorkspace = workspace.ownerUserId !== 'local-device-owner'
  const canSync = cloudWorkspace && auth.status === 'signed_in' && Boolean(client)

  async function syncNow() {
    if (!client || !canSync) return
    setBusy(true)
    setMessage(undefined)
    try {
      const result = await runLocalSyncCycle(workspace.id, new SupabaseSyncTransport(client))
      setMessage(`${result.pulled} pulled, ${result.acknowledged} uploaded${result.conflicted ? `, ${result.conflicted} needs attention` : ''}.`)
    } catch {
      setMessage('Sync could not finish. Your local changes remain on this device for a later retry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="sync-status-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-gold)]/20 bg-[linear-gradient(135deg,rgba(248,194,91,0.12),rgba(16,29,48,0.96)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Sync health</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="sync-status-title">{canSync ? 'Private cloud workspace ready.' : cloudWorkspace ? 'Sign in before syncing.' : 'Cloud sync is not set up.'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{canSync ? 'This sends only queued records from this UUID-backed workspace and pulls approved changes for the same owner. The fictional starter workspace is never uploaded.' : 'Your planning data is still safely stored on this device. This screen is transparent about queued local changes; it does not send anything until an authenticated service is explicitly configured.'}</p>

        {canSync ? <button className="mt-4 min-h-11 rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void syncNow()} type="button">{busy ? 'Syncing…' : 'Sync now'}</button> : <Link className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-[var(--rm-teal)]/35 px-4 text-sm font-semibold text-[var(--rm-teal)]" to="/tools/cloud">Open private cloud setup</Link>}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-xl font-semibold text-white">{sync.queued}</p><p className="mt-1 text-[0.64rem] uppercase tracking-[0.1em] text-slate-400">Queued</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-xl font-semibold text-white">{sync.retrying}</p><p className="mt-1 text-[0.64rem] uppercase tracking-[0.1em] text-slate-400">Retrying</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-xl font-semibold text-white">{sync.conflicts + sync.blocked}</p><p className="mt-1 text-[0.64rem] uppercase tracking-[0.1em] text-slate-400">Attention</p></div>
        </div>
      </div>

      {message ? <p aria-live="polite" className="rounded-2xl border border-white/[0.1] bg-[var(--rm-surface)] px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      <section>
        <SectionLabel action={<Link className="text-xs font-semibold text-[var(--rm-teal)]" to="/tools">Back to tools</Link>}>Queued local operations</SectionLabel>
        <p className="mt-2 text-xs leading-5 text-slate-500">For privacy, this list never displays note, outcome, or person content.</p>
        <div className="mt-3 space-y-2">
          {sync.operations.length ? sync.operations.map((operation) => (
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] p-4" key={operation.operationId}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold capitalize text-white">{readableOperationKind(operation.kind)}</p>
                <span className={operation.status === 'blocked' ? 'rounded-full bg-red-400/10 px-2 py-1 text-[0.62rem] font-semibold text-red-200' : operation.status === 'failed' ? 'rounded-full bg-[var(--rm-gold)]/10 px-2 py-1 text-[0.62rem] font-semibold text-[var(--rm-gold)]' : 'rounded-full bg-[var(--rm-teal)]/10 px-2 py-1 text-[0.62rem] font-semibold text-[var(--rm-teal)]'}>{operation.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Operation {operation.sequence} · attempt {operation.attemptCount + 1}{operation.errorCode ? ' · ' + operation.errorCode.replaceAll('_', ' ') : ''}</p>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No local changes are waiting for a future sync.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h3 className="text-sm font-semibold text-white">What happens next?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{canSync ? 'Every sync keeps immutable operation IDs, dependency order, retry rules, and visible conflict safeguards. It never logs private record text here.' : 'A future authenticated beta will use the same operation IDs, dependency order, retry rules, and conflict safeguards shown here. It still needs an approved remote service before it can be enabled.'}</p>
      </section>
    </section>
  )
}
