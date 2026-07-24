import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { updateFocusGroup } from '../../data/local/commands'
import { LoadingPanel } from '../shared/LoadingPanel'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'

export function FocusGroupEditScreen() {
  const snapshot = useWorkspaceSnapshot()
  const { groupId } = useParams()
  const navigate = useNavigate()
  const group = snapshot?.organizations.find((organization) => organization.id === groupId && organization.kind === 'group')
  const [name, setName] = useState<string | undefined>()
  const [selectedIds, setSelectedIds] = useState<string[] | undefined>()
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)
  if (!snapshot) return <LoadingPanel />
  if (!group) return <section className="animate-enter rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5"><h2 className="text-xl font-semibold text-white">Focus group not found</h2></section>
  const focusGroup = group

  const currentIds = selectedIds ?? snapshot.contactOrganizations
    .filter((link) => link.organizationId === focusGroup.id && !link.deletedAt)
    .map((link) => link.contactId)
  function toggle(contactId: string) { setSelectedIds(currentIds.includes(contactId) ? currentIds.filter((id) => id !== contactId) : [...currentIds, contactId]) }
  async function save() {
    setBusy(true); setMessage(undefined)
    try { await updateFocusGroup({ groupId: focusGroup.id, name: name ?? focusGroup.name, contactIds: currentIds }); navigate('/people/groups/' + focusGroup.id) }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The focus group could not be updated.') }
    finally { setBusy(false) }
  }

  return <section aria-labelledby="edit-focus-group-title" className="animate-enter">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">People planning</p>
    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="edit-focus-group-title">Edit focus group</h2>
    <form className="mt-5 space-y-5 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <div><label className="text-sm font-semibold text-slate-100" htmlFor="focus-group-name">Group name</label><input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="focus-group-name" onChange={(event) => setName(event.target.value)} value={name ?? focusGroup.name} /></div>
      <fieldset><legend className="text-sm font-semibold text-slate-100">People in this group</legend><div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.1]">{snapshot.contacts.map((person) => <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2" key={person.id}><input checked={currentIds.includes(person.id)} className="h-4 w-4 accent-[var(--rm-teal)]" onChange={() => toggle(person.id)} type="checkbox" /><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--rm-violet)]/15 text-xs font-semibold text-[var(--rm-violet)]">{person.displayName.slice(0, 1)}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">{person.displayName}</span></label>)}</div></fieldset>
      {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}
      <div className="flex gap-2"><button className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => navigate('/people/groups/' + focusGroup.id)} type="button">Cancel</button><button className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:opacity-60" disabled={busy || !(name ?? focusGroup.name).trim()} type="submit">Save changes</button></div>
    </form>
  </section>
}
