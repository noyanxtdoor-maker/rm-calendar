import { useState } from 'react'
import { Link } from 'react-router-dom'
import { completeTask } from '../../data/local/commands'
import { displayDate } from '../../lib/time'
import { createLocalDemoContact } from '../../data/local/workspace'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'
import { useLocalSyncStatus, useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { useLocalWorkspace } from '../workspace/useLocalWorkspace'

export function ToolsScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { workspace } = useLocalWorkspace()
  const sync = useLocalSyncStatus()
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const contactCount = snapshot.contacts.length
  const openTasks = snapshot.tasks
    .filter((task) => task.state === 'open')
    .sort((left, right) => (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31'))

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

  async function markTaskComplete(taskId: string) {
    setBusy(true)
    setMessage(undefined)
    try {
      await completeTask(taskId)
      setMessage('Task completed on this device.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The task could not be completed.')
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

      {message ? <p aria-live="polite" className="rounded-2xl border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/[0.08] px-4 py-3 text-sm text-[var(--rm-teal)]">{message}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <Link className="flex min-h-20 flex-col justify-center rounded-3xl border border-[var(--rm-gold)]/25 bg-[var(--rm-gold)]/[0.07] px-4 text-left transition hover:border-[var(--rm-gold)]/50" to="/capture">
          <span className="text-sm font-semibold text-[var(--rm-gold)]">Quick capture</span>
          <span className="mt-1 text-xs leading-4 text-slate-400">Record an unplanned visit</span>
        </Link>
        <Link className="flex min-h-20 flex-col justify-center rounded-3xl border border-[var(--rm-teal)]/25 bg-[var(--rm-teal)]/[0.06] px-4 text-left transition hover:border-[var(--rm-teal)]/50" to="/tools/tasks/new">
          <span className="text-sm font-semibold text-[var(--rm-teal)]">Add task</span>
          <span className="mt-1 text-xs leading-4 text-slate-400">Keep a next action visible</span>
        </Link>
      </div>
      <Link className="flex min-h-12 items-center justify-between rounded-2xl border border-[var(--rm-violet)]/25 bg-[var(--rm-violet)]/[0.06] px-4 text-sm font-semibold text-[var(--rm-violet)] transition hover:border-[var(--rm-violet)]/50" to="/tools/weekly-review">
        <span>Weekly review</span>
        <span className="text-xs font-medium text-slate-400">See your local planning picture</span>
      </Link>
      <Link className="flex min-h-12 items-center justify-between rounded-2xl border border-[var(--rm-gold)]/25 bg-[var(--rm-gold)]/[0.06] px-4 text-sm font-semibold text-[var(--rm-gold)] transition hover:border-[var(--rm-gold)]/50" to="/tools/sync-status">
        <span>Sync status</span>
        <span className="text-xs font-medium text-slate-400">{sync ? sync.queued + sync.retrying + sync.blocked + ' local changes' : 'Checking local changes'}</span>
      </Link>
      <Link className="flex min-h-12 items-center justify-between rounded-2xl border border-[var(--rm-teal)]/25 bg-[var(--rm-teal)]/[0.06] px-4 text-sm font-semibold text-[var(--rm-teal)] transition hover:border-[var(--rm-teal)]/50" to="/tools/cloud">
        <span>{workspace.ownerUserId === 'local-device-owner' ? 'Private cloud setup' : 'Cloud workspace'}</span>
        <span className="text-xs font-medium text-slate-400">{workspace.ownerUserId === 'local-device-owner' ? 'Keep new work in sync' : 'Account and sync'}</span>
      </Link>

      <section>
        <SectionLabel action={<span className="text-xs font-semibold text-slate-500">{openTasks.length} open</span>}>Next actions</SectionLabel>
        <div className="mt-3 space-y-2">
          {openTasks.length ? openTasks.map((task) => (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] p-3" key={task.id}>
              <span className={task.priority === 'high' ? 'h-9 w-1 shrink-0 rounded-full bg-red-300' : task.priority === 'low' ? 'h-9 w-1 shrink-0 rounded-full bg-slate-600' : 'h-9 w-1 shrink-0 rounded-full bg-[var(--rm-teal)]'} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{task.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{task.dueDate ? 'Due ' + displayDate(task.dueDate, snapshot.workspace.timezone) : 'No due date'} · {task.priority} priority</span>
              </span>
              <button aria-label={'Complete task: ' + task.title} className="min-h-10 rounded-xl border border-[var(--rm-teal)]/30 px-3 text-xs font-semibold text-[var(--rm-teal)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void markTaskComplete(task.id)} type="button">Done</button>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No open tasks. Create one only when it helps you remember a next step.</p>}
        </div>
      </section>

      {workspace.ownerUserId === 'local-device-owner' ? <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <SectionLabel>Local workspace check</SectionLabel>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use a fictional person to confirm that IndexedDB survives a browser reload. This test data stays separate from real planning.</p>
        <button
          className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] transition hover:bg-[#83e6de] disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          onClick={() => void addFictionalPerson()}
          type="button"
        >
          Add fictional person
        </button>
      </section> : null}

      <Link className="flex min-h-16 items-center justify-between rounded-3xl border border-red-300/20 bg-red-400/[0.04] px-5 text-left transition hover:border-red-300/40" to="/tools/data">
        <span>
          <span className="block text-sm font-semibold text-red-100">Data controls</span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">Download a private copy, protect storage, or clear this browser</span>
        </span>
        <span aria-hidden="true" className="text-lg text-red-200">›</span>
      </Link>

      <section className="rounded-3xl border border-[var(--rm-gold)]/15 bg-[var(--rm-gold)]/[0.07] p-5">
        <p className="text-sm font-semibold text-[var(--rm-gold)]">Independent planning companion</p>
        <p className="mt-2 text-xs leading-5 text-slate-300">RM Calendar is independent and is not affiliated with The Church of Jesus Christ of Latter-day Saints. Do not enter official Church records or confidential information.</p>
      </section>
    </section>
  )
}
