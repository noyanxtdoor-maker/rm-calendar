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
  const weekEnd = new Date(today + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndDate = localIsoDate(weekEnd, snapshot.workspace.timezone)
  const weekActivities = activeActivities.filter((activity) => {
    const date = activityDate(activity, snapshot.workspace.timezone)
    return Boolean(date && date >= today && date <= weekEndDate)
  })
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
      <section className="border-y border-white/[0.12] py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Weekly command center</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white" id="today-overview-title">Keep the work moving.</h2>
          </div>
          <Link className="min-h-10 rounded-xl border border-[var(--rm-teal)]/30 px-3 text-xs font-semibold leading-10 text-[var(--rm-teal)]" to="/tools/weekly-review">Review week</Link>
        </div>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">See the people, visits, and next actions that need movement—then make the next plan.</p>

        <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-white/[0.1] border border-white/[0.1] bg-black/10">
          <div className="p-3"><p className="text-xs font-semibold text-slate-300">People in motion</p><p className="mt-1 text-2xl font-semibold text-[var(--rm-teal)]">{plannedPeople.length}</p></div>
          <div className="p-3"><p className="text-xs font-semibold text-slate-300">Planned this week</p><p className="mt-1 text-2xl font-semibold text-[var(--rm-gold)]">{weekActivities.length}</p></div>
          <div className="p-3"><p className="text-xs font-semibold text-slate-300">Today’s visits</p><p className="mt-1 text-2xl font-semibold text-white">{todayActivities.length}</p></div>
          <div className="p-3"><p className="text-xs font-semibold text-slate-300">Open next actions</p><p className="mt-1 text-2xl font-semibold text-[var(--rm-violet)]">{openTasks.length}</p></div>
        </div>
      </section>

      <section>
        <SectionLabel>Action hub</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden border border-white/[0.1] bg-white/[0.1]">
        <Link
          className="min-h-20 bg-[var(--rm-surface)] px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/[0.06]"
          to="/calendar/new"
        >
          <span className="block text-[var(--rm-teal)]">Plan a visit</span><span className="mt-1 block text-xs font-normal text-slate-400">Add it to the day</span>
        </Link>
        <Link
          className="min-h-20 bg-[var(--rm-surface)] px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/[0.06]"
          to="/people/new"
        >
          <span className="block text-[var(--rm-gold)]">Add a person</span><span className="mt-1 block text-xs font-normal text-slate-400">Keep context connected</span>
        </Link>
        <Link
          className="min-h-20 bg-[var(--rm-surface)] px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/[0.06]"
          to="/capture"
        >
          <span className="block text-[var(--rm-violet)]">Quick capture</span><span className="mt-1 block text-xs font-normal text-slate-400">Record an unplanned visit</span>
        </Link>
        <Link className="min-h-20 bg-[var(--rm-surface)] px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/[0.06]" to="/tools">
          <span className="block text-slate-200">Open tools</span><span className="mt-1 block text-xs font-normal text-slate-400">Tasks, review, sync, and data</span>
        </Link>
        </div>
      </section>

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
                  className="flex items-center gap-3 border-b border-white/[0.08] py-3 transition hover:bg-white/[0.03]"
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
            <p className="border-y border-dashed border-white/[0.12] py-4 text-sm text-slate-400">No one needs attention right now.</p>
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
                className="flex gap-3 border-b border-white/[0.08] py-3 transition hover:bg-white/[0.03]"
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
            <p className="border-y border-dashed border-white/[0.12] py-4 text-sm text-slate-400">Nothing is planned for today.</p>
          )}
        </div>
      </section>

      <section>
        <SectionLabel action={<Link className="text-xs font-semibold text-[var(--rm-teal)]" to="/tools">Open tasks</Link>}>
          Next actions
        </SectionLabel>
        <div className="mt-3 space-y-2">
          {openTasks.slice(0, 3).map((task) => (
            <Link className="flex items-center gap-3 border-b border-white/[0.08] py-3 transition hover:bg-white/[0.03]" key={task.id} to="/tools">
              <span className={task.priority === 'high' ? 'h-8 w-1 shrink-0 rounded-full bg-red-300' : 'h-8 w-1 shrink-0 rounded-full bg-[var(--rm-teal)]'} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{task.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{task.dueDate ? 'Due ' + task.dueDate : 'No due date'}</span>
              </span>
            </Link>
          ))}
          {!openTasks.length ? <p className="border-y border-dashed border-white/[0.12] py-4 text-sm text-slate-400">Your next actions will appear here.</p> : null}
        </div>
      </section>
    </section>
  )
}
