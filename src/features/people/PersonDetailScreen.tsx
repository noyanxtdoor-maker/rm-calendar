import { Link, useParams } from 'react-router-dom'
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
