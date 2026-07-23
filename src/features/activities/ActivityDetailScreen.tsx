import { Link, useParams } from 'react-router-dom'
import { displayDate, displayTime, localIsoDate } from '../../lib/time'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

function activityScheduleLabel(
  activity: { scheduledDate?: string; scheduledStartAt?: string; scheduledEndAt?: string; state: string },
  timeZone: string
) {
  if (activity.scheduledDate) {
    return 'All day · ' + displayDate(activity.scheduledDate, timeZone)
  }
  if (activity.scheduledStartAt) {
    const date = localIsoDate(new Date(activity.scheduledStartAt), timeZone)
    const range = displayTime(activity.scheduledStartAt, timeZone) + (activity.scheduledEndAt ? '–' + displayTime(activity.scheduledEndAt, timeZone) : '')
    return displayDate(date, timeZone) + ' · ' + range
  }
  return activity.state === 'draft' ? 'Unscheduled draft' : 'No schedule'
}

export function ActivityDetailScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { activityId } = useParams()

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

  const contactLink = snapshot.activityContacts.find((link) => link.activityId === activity.id && link.isPrimary)
  const person = contactLink ? snapshot.contacts.find((contact) => contact.id === contactLink.contactId) : undefined
  const place = activity.primaryPlaceId ? snapshot.places.find((candidate) => candidate.id === activity.primaryPlaceId) : undefined
  const history = snapshot.activityHistory.filter((event) => event.activityId === activity.id).sort((left, right) => right.eventAt.localeCompare(left.eventAt))

  return (
    <section aria-labelledby="activity-detail-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-teal)]/20 bg-[linear-gradient(135deg,rgba(90,215,204,0.14),rgba(16,29,48,0.96)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">{activity.activityType}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="activity-detail-title">{activity.title}</h2>
        <p className="mt-2 text-sm text-slate-300">{activityScheduleLabel(activity, snapshot.workspace.timezone)}</p>
        <Link className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)]" to={'/calendar/' + activity.id + '/edit'}>Edit or reschedule</Link>
      </div>

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
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white">Planning history</h3>
        <div className="mt-3 space-y-2">
          {history.map((event) => (
            <div className="rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3" key={event.id}>
              <p className="text-sm font-medium capitalize text-slate-100">{event.eventType.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-xs text-slate-400">{displayDate(localIsoDate(new Date(event.eventAt), snapshot.workspace.timezone), snapshot.workspace.timezone)} · {displayTime(event.eventAt, snapshot.workspace.timezone)}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
