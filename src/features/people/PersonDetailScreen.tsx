import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createNote } from '../../data/local/commands'
import { displayDate, displayTime, localIsoDate } from '../../lib/time'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

function plannedDateLabel(
  activity: { scheduledDate?: string; scheduledStartAt?: string },
  timeZone: string
) {
  if (activity.scheduledDate) {
    return displayDate(activity.scheduledDate, timeZone)
  }
  if (activity.scheduledStartAt) {
    return displayDate(localIsoDate(new Date(activity.scheduledStartAt), timeZone), timeZone) + ' · ' + displayTime(activity.scheduledStartAt, timeZone)
  }
  return 'Draft'
}

export function PersonDetailScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { contactId } = useParams()
  const [noteBody, setNoteBody] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const person = snapshot.contacts.find((contact) => contact.id === contactId)
  if (!person) {
    return (
      <section className="animate-enter rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h2 className="text-xl font-semibold text-white">Person not found</h2>
        <Link className="mt-4 inline-block text-sm font-semibold text-[var(--rm-teal)]" to="/people">Back to people</Link>
      </section>
    )
  }
  const focusPerson = person

  const household = snapshot.organizations.find((organization) => organization.kind === 'household' && snapshot.contactOrganizations.some(
    (link) => link.contactId === person.id && link.organizationId === organization.id && !link.deletedAt
  ))
  const activityIds = new Set(snapshot.activityContacts.filter((link) => link.contactId === person.id).map((link) => link.activityId))
  const activities = snapshot.activities
    .filter((activity) => activityIds.has(activity.id))
    .sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? ''))
  const history = snapshot.activityHistory
    .filter((event) => activityIds.has(event.activityId))
    .sort((left, right) => right.eventAt.localeCompare(left.eventAt))
  const notes = snapshot.notes
    .filter((note) => note.contactId === person.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  async function saveNote() {
    setBusy(true)
    setMessage(undefined)
    try {
      await createNote({ contactId: focusPerson.id, body: noteBody })
      setNoteBody('')
      setMessage('Private note saved on this device.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The note could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="person-detail-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-violet)]/20 bg-[linear-gradient(135deg,rgba(170,154,248,0.16),rgba(16,29,48,0.95)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rm-violet)]/20 text-lg font-semibold text-[var(--rm-violet)]">{person.displayName.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rm-violet)]">Person context</p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-white" id="person-detail-title">{person.displayName}</h2>
            <p className="mt-1 text-sm text-slate-300">{household?.name ?? 'No household linked yet'}</p>
          </div>
        </div>
        <Link className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)]" to={'/calendar/new?contactId=' + person.id}>
          Plan a visit
        </Link>
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h3 className="text-sm font-semibold text-white">Private notes</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Keep only information you are entitled to keep. Notes stay connected to this person and are available while planning.</p>
        <label className="sr-only" htmlFor="person-note">New private note</label>
        <textarea className="mt-4 min-h-24 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="person-note" onChange={(event) => setNoteBody(event.target.value)} placeholder="Add a concise private note" value={noteBody} />
        <button className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--rm-teal)]/30 px-4 text-sm font-semibold text-[var(--rm-teal)] disabled:cursor-wait disabled:opacity-60" disabled={busy || !noteBody.trim()} onClick={() => void saveNote()} type="button">Save private note</button>
        {message ? <p aria-live="polite" className="mt-3 rounded-2xl border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/[0.08] px-3 py-2 text-sm text-[var(--rm-teal)]">{message}</p> : null}
        <div className="mt-4 space-y-2">
          {notes.length ? notes.map((note) => <div className="rounded-2xl border border-white/[0.07] bg-[var(--rm-ink)]/45 p-3" key={note.id}><p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{note.body}</p><p className="mt-2 text-xs text-slate-500">{displayDate(localIsoDate(new Date(note.createdAt), snapshot.workspace.timezone), snapshot.workspace.timezone)}</p></div>) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-3 text-sm text-slate-400">No private notes yet.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Journey</h3>
        <div className="mt-3 space-y-2">
          {activities.length ? activities.map((activity) => (
            <Link className="block rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] p-4 transition hover:border-[var(--rm-teal)]/30" key={activity.id} to={'/calendar/' + activity.id}>
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{activity.title}</span>
                <span className={activity.state === 'scheduled' ? 'rounded-full bg-[var(--rm-teal)]/12 px-2 py-1 text-[0.62rem] font-semibold text-[var(--rm-teal)]' : 'rounded-full bg-white/[0.06] px-2 py-1 text-[0.62rem] font-semibold text-slate-400'}>{activity.state}</span>
              </span>
              <span className="mt-1 block text-xs text-slate-400">{plannedDateLabel(activity, snapshot.workspace.timezone)}</span>
            </Link>
          )) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No planned activity yet. A visit will appear here when you save it.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">History</h3>
        <div className="mt-3 space-y-2">
          {history.length ? history.map((event) => (
            <div className="rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3" key={event.id}>
              <p className="text-sm font-medium text-slate-100">{event.eventType.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-xs text-slate-400">{displayDate(localIsoDate(new Date(event.eventAt), snapshot.workspace.timezone), snapshot.workspace.timezone)} · {displayTime(event.eventAt, snapshot.workspace.timezone)}</p>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">Planning history will appear here.</p>}
        </div>
      </section>
    </section>
  )
}
