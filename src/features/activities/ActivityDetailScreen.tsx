import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createNote, reopenActivity } from '../../data/local/commands'
import { displayDate, displayTime, localIsoDate } from '../../lib/time'
import { LoadingPanel } from '../shared/LoadingPanel'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'

function activityScheduleLabel(
  activity: { scheduledDate?: string; scheduledStartAt?: string; scheduledEndAt?: string; state: string },
  timeZone: string
) {
  if (activity.scheduledDate) {
    return 'All day - ' + displayDate(activity.scheduledDate, timeZone)
  }
  if (activity.scheduledStartAt) {
    const date = localIsoDate(new Date(activity.scheduledStartAt), timeZone)
    const range = displayTime(activity.scheduledStartAt, timeZone) + (activity.scheduledEndAt ? ' to ' + displayTime(activity.scheduledEndAt, timeZone) : '')
    return displayDate(date, timeZone) + ' - ' + range
  }
  return activity.state === 'draft' ? 'Unscheduled draft' : 'No schedule'
}

function localDateTime(iso: string | undefined, timeZone: string) {
  if (!iso) {
    return undefined
  }

  return displayDate(localIsoDate(new Date(iso), timeZone), timeZone) + ' at ' + displayTime(iso, timeZone)
}

export function ActivityDetailScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { activityId } = useParams()
  const [noteBody, setNoteBody] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const activity = snapshot.activities.find((candidate) => candidate.id === activityId)
  if (!activity) {
    return (
      <section className="animate-enter rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h2 className="text-xl font-semibold text-white">Activity not found</h2>
        <Link className="mt-4 inline-block text-sm font-semibold text-[var(--rm-teal)]" to="/calendar">Back to calendar</Link>
      </section>
    )
  }

  const activityIdForDetail = activity.id
  const contactLink = snapshot.activityContacts.find((link) => link.activityId === activityIdForDetail && link.isPrimary)
  const person = contactLink ? snapshot.contacts.find((contact) => contact.id === contactLink.contactId) : undefined
  const place = activity.primaryPlaceId ? snapshot.places.find((candidate) => candidate.id === activity.primaryPlaceId) : undefined
  const history = snapshot.activityHistory
    .filter((event) => event.activityId === activityIdForDetail)
    .sort((left, right) => right.eventAt.localeCompare(left.eventAt))
  const notes = snapshot.notes
    .filter((note) => note.activityId === activityIdForDetail)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const followUps = snapshot.followUps
    .filter((followUp) => followUp.sourceActivityId === activityIdForDetail)
    .map((followUp) => {
      const target = followUp.targetKind === 'task'
        ? snapshot.tasks.find((task) => task.id === followUp.targetTaskId)
        : snapshot.activities.find((candidate) => candidate.id === followUp.targetActivityId)
      return { followUp, target }
    })
  const isCompletable = activity.state === 'scheduled' || activity.state === 'draft'
  const isCompleted = activity.state === 'completed'

  async function saveNote() {
    setBusy(true)
    setMessage(undefined)
    try {
      await createNote({ activityId: activityIdForDetail, body: noteBody })
      setNoteBody('')
      setMessage('Private note saved on this device.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The note could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function reopen() {
    setBusy(true)
    setMessage(undefined)
    try {
      await reopenActivity(activityIdForDetail)
      setMessage('The visit is back in your plan.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The visit could not be reopened.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="activity-detail-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-teal)]/20 bg-[linear-gradient(135deg,rgba(90,215,204,0.14),rgba(16,29,48,0.96)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">{activity.activityType}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="activity-detail-title">{activity.title}</h2>
          </div>
          <span className={isCompleted ? 'rounded-full bg-[var(--rm-gold)]/15 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--rm-gold)]' : 'rounded-full bg-[var(--rm-teal)]/12 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--rm-teal)]'}>
            {activity.state}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{activityScheduleLabel(activity, snapshot.workspace.timezone)}</p>
        {isCompleted && activity.actualCompletedAt ? <p className="mt-1 text-xs text-slate-400">Completed {localDateTime(activity.actualCompletedAt, snapshot.workspace.timezone)}</p> : null}

        <div className="mt-5 grid gap-2">
          {isCompletable ? <Link className="flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)]" to={'/calendar/' + activityIdForDetail + '/complete'}>Complete visit</Link> : null}
          {isCompletable ? <Link className="flex min-h-11 items-center justify-center rounded-2xl border border-white/[0.12] px-4 text-sm font-semibold text-slate-100" to={'/calendar/' + activityIdForDetail + '/edit'}>Edit or reschedule</Link> : null}
          {isCompleted ? <Link className="flex min-h-11 items-center justify-center rounded-2xl border border-[var(--rm-gold)]/30 px-4 text-sm font-semibold text-[var(--rm-gold)]" to={'/calendar/' + activityIdForDetail + '/follow-up'}>Create follow-up</Link> : null}
          {isCompleted ? <button className="min-h-11 rounded-2xl border border-white/[0.12] px-4 text-sm font-semibold text-slate-300 disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void reopen()} type="button">Reopen visit</button> : null}
        </div>
      </div>

      {message ? <p aria-live="polite" className="rounded-2xl border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/[0.08] px-4 py-3 text-sm text-[var(--rm-teal)]">{message}</p> : null}

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h3 className="text-sm font-semibold text-white">Context</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Person</dt>
            <dd className="text-right font-medium text-slate-100">{person ? <Link className="text-[var(--rm-teal)]" to={'/people/' + person.id}>{person.displayName}</Link> : 'No person linked'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Place</dt>
            <dd className="text-right font-medium text-slate-100">{place?.name ?? 'No place linked'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Objective</dt>
            <dd className="max-w-[60%] text-right font-medium text-slate-100">{activity.objectiveText ?? 'No objective yet'}</dd>
          </div>
          {isCompleted ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Outcome</dt>
              <dd className="max-w-[60%] text-right font-medium text-slate-100">{activity.outcomeText ?? 'No outcome recorded'}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h3 className="text-sm font-semibold text-white">Private notes</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Keep only information you are entitled to keep. Notes stay on this device in this milestone.</p>
        <label className="sr-only" htmlFor="activity-note">New private note</label>
        <textarea className="mt-4 min-h-24 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="activity-note" onChange={(event) => setNoteBody(event.target.value)} placeholder="Add a concise private note" value={noteBody} />
        <button className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--rm-teal)]/30 px-4 text-sm font-semibold text-[var(--rm-teal)] disabled:cursor-wait disabled:opacity-60" disabled={busy || !noteBody.trim()} onClick={() => void saveNote()} type="button">Save private note</button>
        <div className="mt-4 space-y-2">
          {notes.length ? notes.map((note) => <div className="rounded-2xl border border-white/[0.07] bg-[var(--rm-ink)]/45 p-3" key={note.id}><p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{note.body}</p><p className="mt-2 text-xs text-slate-500">{localDateTime(note.createdAt, snapshot.workspace.timezone)}</p></div>) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-3 text-sm text-slate-400">No private notes yet.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Follow-ups</h3>
        <div className="mt-3 space-y-2">
          {followUps.length ? followUps.map(({ followUp, target }) => (
            <Link className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--rm-gold)]/20 bg-[var(--rm-gold)]/[0.05] p-3 transition hover:border-[var(--rm-gold)]/45" key={followUp.id} to={followUp.targetKind === 'activity' && followUp.targetActivityId ? '/calendar/' + followUp.targetActivityId : '/tools'}>
              <span>
                <span className="block text-sm font-semibold text-slate-100">{target?.title ?? 'Follow-up saved locally'}</span>
                <span className="mt-1 block text-xs capitalize text-slate-400">{followUp.targetKind === 'activity' ? 'Scheduled visit' : 'Task'} linked to this visit</span>
              </span>
              <span aria-hidden="true" className="text-lg text-[var(--rm-gold)]">›</span>
            </Link>
          )) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No next action yet. Complete the visit, then add one when it helps.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Planning history</h3>
        <div className="mt-3 space-y-2">
          {history.map((event) => (
            <div className="rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3" key={event.id}>
              <p className="text-sm font-medium capitalize text-slate-100">{event.eventType.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-xs text-slate-400">{localDateTime(event.eventAt, snapshot.workspace.timezone)}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
