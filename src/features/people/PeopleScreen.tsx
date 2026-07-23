import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'

export function PeopleScreen() {
  const snapshot = useWorkspaceSnapshot()
  const [query, setQuery] = useState('')

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

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visiblePeople = snapshot.contacts.filter((person) => person.displayName.toLocaleLowerCase().includes(normalizedQuery))

  return (
    <section aria-labelledby="people-list-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">People & households</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="people-list-title">Keep context close.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">A person, their plan, and their history stay connected in this private local workspace.</p>

      <div className="mt-5 flex gap-2">
        <Link className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[var(--rm-teal)] px-3 text-sm font-semibold text-[var(--rm-ink)]" to="/people/new">Add person</Link>
        <Link className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/[0.1] px-3 text-sm font-semibold text-slate-200" to="/people/household/new">Add household</Link>
      </div>

      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-[var(--rm-surface)] px-4 py-3">
        <label className="sr-only" htmlFor="people-search">Search people</label>
        <input
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          id="people-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people"
          type="search"
          value={query}
        />
      </div>

      <section className="mt-5">
        <SectionLabel action={<span className="text-xs font-semibold text-[var(--rm-teal)]">{peopleWithPlans.size} with a plan</span>}>People with a plan</SectionLabel>
        <div className="mt-3 space-y-2">
          {visiblePeople.map((person) => {
            const planned = peopleWithPlans.has(person.id)
            const task = snapshot.tasks.find((candidate) => candidate.contactId === person.id && candidate.state === 'open')
            return (
              <Link className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3 transition hover:border-[var(--rm-teal)]/30" key={person.id} to={'/people/' + person.id}>
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
              </Link>
            )
          })}
          {!visiblePeople.length ? <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No people match this search.</p> : null}
        </div>
      </section>

      <section className="mt-5">
        <SectionLabel action={<span className="text-xs font-semibold text-[var(--rm-violet)]">{snapshot.organizations.filter((organization) => organization.kind === 'household').length} saved</span>}>Households</SectionLabel>
        <div className="mt-3 space-y-2">
          {snapshot.organizations.filter((organization) => organization.kind === 'household').length ? snapshot.organizations
            .filter((organization) => organization.kind === 'household')
            .map((household) => {
              const count = snapshot.contactOrganizations.filter((link) => link.organizationId === household.id).length
              return (
                <article className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[var(--rm-surface)] p-3" key={household.id}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--rm-gold)]/12 text-sm font-semibold text-[var(--rm-gold)]">H</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">{household.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{count} linked {count === 1 ? 'person' : 'people'}</p>
                  </div>
                </article>
              )
            }) : <p className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-sm text-slate-400">No households yet. Add one when it helps your planning context.</p>}
        </div>
      </section>
    </section>
  )
}
