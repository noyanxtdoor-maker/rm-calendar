import { Link } from 'react-router-dom'
import { displayDate, localIsoDate } from '../../lib/time'
import type { ActivityRecord } from '../../domain/models'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'

function addDays(date: string, days: number, timeZone: string) {
  const value = new Date(date + 'T12:00:00')
  value.setDate(value.getDate() + days)
  return localIsoDate(value, timeZone)
}

function weekStart(date: string, timeZone: string) {
  const local = new Date(date + 'T12:00:00')
  const daysSinceMonday = (local.getDay() + 6) % 7
  return addDays(date, -daysSinceMonday, timeZone)
}

function scheduledDate(activity: ActivityRecord, timeZone: string) {
  if (activity.scheduledDate) {
    return activity.scheduledDate
  }
  return activity.scheduledStartAt ? localIsoDate(new Date(activity.scheduledStartAt), timeZone) : undefined
}

function inWindow(date: string | undefined, start: string, end: string) {
  return Boolean(date && date >= start && date <= end)
}

export function WeeklyReviewScreen() {
  const snapshot = useWorkspaceSnapshot()

  if (!snapshot) {
    return <LoadingPanel />
  }

  const today = localIsoDate(new Date(), snapshot.workspace.timezone)
  const start = weekStart(today, snapshot.workspace.timezone)
  const end = addDays(start, 6, snapshot.workspace.timezone)
  const scheduledThisWeek = snapshot.activities.filter((activity) => activity.state === 'scheduled' && inWindow(scheduledDate(activity, snapshot.workspace.timezone), start, end))
  const completedThisWeek = snapshot.activities.filter((activity) => activity.state === 'completed' && inWindow(activity.actualCompletedAt ? localIsoDate(new Date(activity.actualCompletedAt), snapshot.workspace.timezone) : undefined, start, end))
  const completedTasksThisWeek = snapshot.tasks.filter((task) => task.state === 'completed' && inWindow(task.completedAt ? localIsoDate(new Date(task.completedAt), snapshot.workspace.timezone) : undefined, start, end))
  const openTasks = snapshot.tasks.filter((task) => task.state === 'open')
  const nextActivities = snapshot.activities
    .filter((activity) => activity.state === 'scheduled')
    .sort((left, right) => (left.scheduledStartAt ?? left.scheduledDate ?? '').localeCompare(right.scheduledStartAt ?? right.scheduledDate ?? ''))
    .slice(0, 4)

  return (
    <section aria-labelledby="weekly-review-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-violet)]/20 bg-[linear-gradient(135deg,rgba(170,154,248,0.16),rgba(16,29,48,0.96)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">Derived from your local plan</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="weekly-review-title">Weekly review</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{displayDate(start, snapshot.workspace.timezone, { month: 'short', day: 'numeric' })} to {displayDate(end, snapshot.workspace.timezone, { month: 'short', day: 'numeric' })}. This is a personal reflection, not official reporting.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-2xl font-semibold text-white">{completedThisWeek.length}</p><p className="mt-1 text-xs text-slate-400">Visits completed</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-2xl font-semibold text-white">{completedTasksThisWeek.length}</p><p className="mt-1 text-xs text-slate-400">Tasks completed</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-2xl font-semibold text-white">{scheduledThisWeek.length}</p><p className="mt-1 text-xs text-slate-400">Visits in plan</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--rm-ink)]/45 p-3"><p className="text-2xl font-semibold text-white">{openTasks.length}</p><p className="mt-1 text-xs text-slate-400">Open next actions</p></div>
        </div>
      </div>

      <section>
        <SectionLabel action={<Link className="text-xs font-semibold text-[var(--rm-teal)]" to="/calendar">Open calendar</Link>}>Upcoming visits</SectionLabel>
        <div className="mt-3 space-y-2">
          {nextActivities.length ? nextActivities.map((activity) => (
            <Link className="block rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] p-4 transition hover:border-[var(--rm-teal)]/35" key={activity.id} to={'/calendar/' + activity.id}>
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{activity.title}</span>
                <span className="rounded-full bg-[var(--rm-teal)]/12 px-2 py-1 text-[0.62rem] font-semibold text-[var(--rm-teal)]">{scheduledDate(activity, snapshot.workspace.timezone) ?? 'Draft'}</span>
              </span>
              <span className="mt-1 block text-xs text-slate-400">{activity.objectiveText ?? 'A planned activity'}</span>
            </Link>
          )) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">Nothing is scheduled yet. A small, realistic plan is enough.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--rm-gold)]/15 bg-[var(--rm-gold)]/[0.06] p-5">
        <h3 className="text-sm font-semibold text-[var(--rm-gold)]">A simple close-out</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">Review the people who still need a next action, complete what actually happened, and make only the next follow-up that is useful. The record stays on this device.</p>
        <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--rm-gold)]/30 px-4 text-sm font-semibold text-[var(--rm-gold)]" to="/tools">Review next actions</Link>
      </section>
    </section>
  )
}
