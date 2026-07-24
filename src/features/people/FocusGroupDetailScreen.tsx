import { Link, useParams } from 'react-router-dom'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

export function FocusGroupDetailScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { groupId } = useParams()
  if (!snapshot) return <LoadingPanel />

  const group = snapshot.organizations.find((organization) => organization.id === groupId && organization.kind === 'group')
  if (!group) return <section className="animate-enter rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5"><h2 className="text-xl font-semibold text-white">Focus group not found</h2><Link className="mt-4 inline-block text-sm font-semibold text-[var(--rm-teal)]" to="/people">Back to people</Link></section>

  const members = snapshot.contactOrganizations
    .filter((link) => link.organizationId === group.id)
    .flatMap((link) => snapshot.contacts.filter((contact) => contact.id === link.contactId))
  const activeActivities = snapshot.activities.filter((activity) => activity.state === 'scheduled')

  return <section aria-labelledby="focus-group-detail-title" className="animate-enter space-y-5">
    <div className="rounded-3xl border border-[var(--rm-violet)]/20 bg-[linear-gradient(135deg,rgba(170,154,248,0.16),rgba(16,29,48,0.95)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">Private planning group</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="focus-group-detail-title">{group.name}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{members.length} {members.length === 1 ? 'person' : 'people'} in this focus group. This is private planning context, not an official record.</p>
      <Link className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)]" to={'/people/groups/' + group.id + '/edit'}>Edit focus group</Link>
    </div>

    <section>
      <h3 className="text-sm font-semibold text-white">People and next steps</h3>
      <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.1]">
        {members.length ? members.map((person) => {
          const task = snapshot.tasks.find((candidate) => candidate.contactId === person.id && candidate.state === 'open')
          const visit = activeActivities.find((activity) => snapshot.activityContacts.some((link) => link.activityId === activity.id && link.contactId === person.id))
          return <Link className="flex min-h-16 items-center gap-3 py-2" key={person.id} to={'/people/' + person.id}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--rm-violet)]/15 text-sm font-semibold text-[var(--rm-violet)]">{person.displayName.slice(0, 1)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{person.displayName}</span><span className="mt-1 block truncate text-xs text-slate-400">{task?.title ?? visit?.title ?? 'No next step yet'}</span></span>
            <span aria-hidden="true" className="text-lg text-slate-500">›</span>
          </Link>
        }) : <p className="py-4 text-sm text-slate-400">This group has no people yet. Edit it to add someone.</p>}
      </div>
    </section>
  </section>
}
