import { useState } from 'react'
import { createLocalDemoContact, clearAllLocalData, resetFictionalWorkspace } from '../../data/local/workspace'
import { useLocalWorkspace, useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'

export function ToolsScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { restoreWorkspace } = useLocalWorkspace()
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const contactCount = snapshot.contacts.length

  async function addFictionalPerson() {
    setBusy(true)
    try {
      const nextNumber = contactCount + 1
      const contact = await createLocalDemoContact({ displayName: 'Practice person ' + nextNumber })
      setMessage(contact.displayName + ' was saved on this device.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The fictional person could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function resetWorkspace() {
    if (!window.confirm('Restore the fictional starter workspace? This replaces all local planning data on this device.')) {
      return
    }

    setBusy(true)
    try {
      await resetFictionalWorkspace()
      setMessage('Fictional starter data restored on this device.')
    } finally {
      setBusy(false)
    }
  }

  async function clearWorkspace() {
    if (!window.confirm('Clear all local RM Calendar data from this browser? This cannot be undone.')) {
      return
    }

    setBusy(true)
    try {
      await clearAllLocalData()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="tools-title" className="animate-enter space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">Workspace tools</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="tools-title">Private by default.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">This milestone is local-only. Nothing is sent to a Church system, map provider, or cloud service.</p>
      </div>

      <div aria-live="polite">
        {message ? <p className="rounded-2xl border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/[0.08] px-4 py-3 text-sm text-[var(--rm-teal)]">{message}</p> : null}
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <SectionLabel>Local workspace check</SectionLabel>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use one fictional person to confirm that IndexedDB survives a browser reload. The normal person form arrives in Milestone 2.</p>
        <button
          className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] transition hover:bg-[#83e6de] disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          onClick={() => void addFictionalPerson()}
          type="button"
        >
          Add fictional person
        </button>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <SectionLabel>Data controls</SectionLabel>
        <div className="mt-4 grid gap-2">
          <button
            className="min-h-11 rounded-2xl border border-white/[0.1] px-4 text-left text-sm font-semibold text-slate-200 transition hover:border-[var(--rm-gold)]/40"
            disabled={busy}
            onClick={() => void resetWorkspace()}
            type="button"
          >
            Restore fictional starter data
          </button>
          <button
            className="min-h-11 rounded-2xl border border-red-300/20 bg-red-400/[0.04] px-4 text-left text-sm font-semibold text-red-200 transition hover:border-red-300/40"
            disabled={busy}
            onClick={() => void clearWorkspace()}
            type="button"
          >
            Clear all local data
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--rm-gold)]/15 bg-[var(--rm-gold)]/[0.07] p-5">
        <p className="text-sm font-semibold text-[var(--rm-gold)]">Independent planning companion</p>
        <p className="mt-2 text-xs leading-5 text-slate-300">RM Calendar is independent and is not affiliated with The Church of Jesus Christ of Latter-day Saints. Do not enter official Church records or confidential information.</p>
        <button className="mt-4 text-xs font-semibold text-[var(--rm-teal)]" onClick={() => void restoreWorkspace()} type="button">
          Reopen local workspace
        </button>
      </section>
    </section>
  )
}
