import { useMemo } from 'react'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'

export function PeopleScreen() {
  const snapshot = useWorkspaceSnapshot()

  const peopleWithPlans = useMemo(() => {
    if (!snapshot) {
      return new Set<string>()
    }

    return new Set([
      ...snapshot.activityContacts
        .filter((link) => snapshot.activities.some((activity) => activity.id === link.activityId && activity.state === 'scheduled'))
        .map((link) => link.contactId),
      ...snapshot.tasks.filter((task) => task.state === 'open').map((task) => task.contactId).filter((contactId): contactId is string => Boolean(contactId))
    ])
  }, [snapshot])

  if (!snapshot) {
    return <LoadingPanel />
  }

  return (
    <section aria-labelledby="people-list-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">People & households</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="people-list-title">Keep context close.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">This private workspace starts with fictional data only. Real person creation is the next workflow slice.</p>

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] px-4 py-3">
        <label className="sr-only" htmlFor="people-search">Search people</label>
        <input
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          id="people-search"
          placeholder="Search is coming with person details"
          readOnly
          type="search"
        />
      </div>

      <section className="mt-5">
        <SectionLabel action={<span className="text-xs font-semibold text-[var(--rm-teal)]">{peopleWithPlans.size} with a plan</span>}>People with a plan</SectionLabel>
        <div className="mt-3 space-y-2">
          {snapshot.contacts.map((person) => {
            const planned = peopleWithPlans.has(person.id)
            const task = snapshot.tasks.find((candidate) => candidate.contactId === person.id && candidate.state === 'open')
            return (
              <article className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3" key={person.id}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--rm-violet)]/15 text-sm font-semibold text-[var(--rm-violet)]">
                  {person.displayName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white">{person.displayName}</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{task?.title ?? (planned ? 'A visit is planned' : 'No next step yet')}</p>
                </div>
                <span className={planned ? 'rounded-full bg-[var(--rm-teal)]/12 px-2 py-1 text-[0.62rem] font-semibold text-[var(--rm-teal)]' : 'rounded-full bg-white/[0.06] px-2 py-1 text-[0.62rem] font-semibold text-slate-500'}>
                  {planned ? 'Planned' : 'Open'}
                </span>
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}
