import { Link } from 'react-router-dom'
import { localIsoDate } from '../../lib/time'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'

function activityDate(activity: { scheduledDate?: string; scheduledStartAt?: string }, timeZone: string) {
  if (activity.scheduledDate) {
    return activity.scheduledDate
  }

  return activity.scheduledStartAt ? localIsoDate(new Date(activity.scheduledStartAt), timeZone) : undefined
}

export function TodayScreen() {
  const snapshot = useWorkspaceSnapshot()

  if (!snapshot) {
    return <LoadingPanel />
  }

  const today = localIsoDate(new Date(), snapshot.workspace.timezone)
  const activeActivities = snapshot.activities.filter((activity) => activity.state === 'scheduled')
  const todayActivities = activeActivities.filter((activity) => activityDate(activity, snapshot.workspace.timezone) === today)
  const openTasks = snapshot.tasks
    .filter((task) => task.state === 'open')
    .sort((left, right) => (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31'))
  const contactsWithPlan = new Set([
    ...snapshot.activityContacts
      .filter((link) => activeActivities.some((activity) => activity.id === link.activityId))
      .map((link) => link.contactId),
    ...openTasks.map((task) => task.contactId).filter((contactId): contactId is string => Boolean(contactId))
  ])
  const contactById = new Map(snapshot.contacts.map((contact) => [contact.id, contact]))
  const plannedPeople = [...contactsWithPlan].flatMap((contactId) => {
    const contact = contactById.get(contactId)
    return contact ? [contact] : []
  })

  return (
    <section aria-labelledby="today-overview-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-teal)]/20 bg-[linear-gradient(135deg,rgba(90,215,204,0.15),rgba(16,29,48,0.92)_46%,rgba(170,154,248,0.13))] p-5 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">Your day, in focus</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white" id="today-overview-title">
          Start with what matters.
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
          Your plan lives on this device first. Keep people, visits, and the next step connected.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3">
            <p className="text-xl font-semibold text-white">{plannedPeople.length}</p>
            <p className="mt-1 text-[0.67rem] font-medium uppercase tracking-[0.12em] text-slate-400">People planned</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3">
            <p className="text-xl font-semibold text-white">{todayActivities.length}</p>
            <p className="mt-1 text-[0.67rem] font-medium uppercase tracking-[0.12em] text-slate-400">Today</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3">
            <p className="text-xl font-semibold text-white">{openTasks.length}</p>
            <p className="mt-1 text-[0.67rem] font-medium uppercase tracking-[0.12em] text-slate-400">Next actions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link
          className="rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] px-3 py-4 text-center text-xs font-semibold text-white transition hover:border-[var(--rm-teal)]/40"
          to="/calendar/new"
        >
          Plan day
        </Link>
        <Link
          className="rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] px-3 py-4 text-center text-xs font-semibold text-white transition hover:border-[var(--rm-gold)]/40"
          to="/people/new"
        >
          People
        </Link>
        <Link
          className="rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] px-3 py-4 text-center text-xs font-semibold text-white transition hover:border-[var(--rm-violet)]/40"
          to="/capture"
        >
          Capture
        </Link>
      </div>

      <section>
        <SectionLabel action={<Link className="text-xs font-semibold text-[var(--rm-teal)]" to="/people">See people</Link>}>
          People needing a next step
        </SectionLabel>
        <div className="mt-3 space-y-2">
          {plannedPeople.length ? (
            plannedPeople.map((person) => {
              const task = openTasks.find((candidate) => candidate.contactId === person.id)
              const plannedVisitLink = snapshot.activityContacts.find((link) => link.contactId === person.id && activeActivities.some((activity) => activity.id === link.activityId))
              const visit = plannedVisitLink ? activeActivities.find((activity) => activity.id === plannedVisitLink.activityId) : undefined
              return (
                <Link
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3 transition hover:border-[var(--rm-teal)]/30"
                  key={person.id}
                  to={'/people/' + person.id}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--rm-violet)]/15 text-sm font-semibold text-[var(--rm-violet)]">
                    {person.displayName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{person.displayName}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{task?.title ?? visit?.title ?? 'Plan a next step'}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-slate-500">›</span>
                </Link>
              )
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No one needs attention right now.</p>
          )}
        </div>
      </section>

      <section>
        <SectionLabel action={<Link className="text-xs font-semibold text-[var(--rm-teal)]" to="/calendar">Open calendar</Link>}>
          Today’s plan
        </SectionLabel>
        <div className="mt-3 space-y-2">
          {todayActivities.length ? (
            todayActivities.map((activity) => (
              <Link
                className="flex gap-3 rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3 transition hover:border-[var(--rm-gold)]/30"
                key={activity.id}
                to={'/calendar/' + activity.id}
              >
                <span className="mt-1 h-9 w-1 shrink-0 rounded-full bg-[var(--rm-gold)]" />
                <span>
                  <span className="block text-sm font-semibold text-white">{activity.title}</span>
                  <span className="mt-1 block text-xs text-slate-400">{activity.objectiveText ?? 'A planned activity'}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">Nothing is planned for today.</p>
          )}
        </div>
      </section>

      <section>
        <SectionLabel action={<Link className="text-xs font-semibold text-[var(--rm-teal)]" to="/tools">Open tasks</Link>}>
          Next actions
        </SectionLabel>
        <div className="mt-3 space-y-2">
          {openTasks.slice(0, 3).map((task) => (
            <Link className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3 transition hover:border-[var(--rm-teal)]/30" key={task.id} to="/tools">
              <span className={task.priority === 'high' ? 'h-8 w-1 shrink-0 rounded-full bg-red-300' : 'h-8 w-1 shrink-0 rounded-full bg-[var(--rm-teal)]'} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{task.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{task.dueDate ? 'Due ' + task.dueDate : 'No due date'}</span>
              </span>
            </Link>
          ))}
          {!openTasks.length ? <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">Your next actions will appear here.</p> : null}
        </div>
      </section>
    </section>
  )
}
