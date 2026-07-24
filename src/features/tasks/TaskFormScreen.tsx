import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createTask } from '../../data/local/commands'
import type { TaskRecord } from '../../domain/models'
import { localIsoDate } from '../../lib/time'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

export function TaskFormScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskRecord['priority']>('normal')
  const [contactId, setContactId] = useState(() => searchParams.get('contactId') ?? '')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const requestedReturnPath = searchParams.get('returnTo')
  const returnPath = requestedReturnPath && requestedReturnPath.startsWith('/') && !requestedReturnPath.startsWith('//')
    ? requestedReturnPath
    : '/tools'

  async function saveTask() {
    setBusy(true)
    setMessage(undefined)
    try {
      await createTask({ title, dueDate: dueDate || undefined, priority, contactId: contactId || undefined })
      navigate(returnPath)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The task could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="task-form-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Tasks</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="task-form-title">Add a task</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Tasks stay out of the calendar until you decide they need a time block.</p>
      <div className="mt-5 space-y-4 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <div><label className="text-sm font-semibold text-slate-100" htmlFor="task-title">Task</label><input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="task-title" onChange={(event) => setTitle(event.target.value)} placeholder="For example, send a message" value={title} /></div>
        <div><label className="text-sm font-semibold text-slate-100" htmlFor="task-date">Due date (optional)</label><input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="task-date" min={localIsoDate(new Date(), snapshot.workspace.timezone)} onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} /></div>
        <div><label className="text-sm font-semibold text-slate-100" htmlFor="task-priority">Priority</label><select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="task-priority" onChange={(event) => setPriority(event.target.value as TaskRecord['priority'])} value={priority}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></div>
        <div><label className="text-sm font-semibold text-slate-100" htmlFor="task-person">Person (optional)</label><select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="task-person" onChange={(event) => setContactId(event.target.value)} value={contactId}><option value="">No person linked</option>{snapshot.contacts.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></div>
        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}
        <div className="flex gap-2"><button className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => navigate(returnPath)} type="button">Cancel</button><button className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void saveTask()} type="button">Save task</button></div>
      </div>
    </section>
  )
}
