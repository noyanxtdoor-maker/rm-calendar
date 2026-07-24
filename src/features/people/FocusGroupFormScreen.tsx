import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createFocusGroup } from '../../data/local/commands'
import { LoadingPanel } from '../shared/LoadingPanel'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'

export function FocusGroupFormScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [contactIds, setContactIds] = useState<string[]>([])
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) return <LoadingPanel />

  function togglePerson(contactId: string) {
    setContactIds((current) => current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId])
  }

  async function saveFocusGroup() {
    setBusy(true)
    setMessage(undefined)
    try {
      await createFocusGroup({ name, contactIds })
      navigate('/people')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The focus group could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="new-focus-group-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">People planning</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="new-focus-group-title">Create a focus group</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Use any private label that helps you plan. A focus group is not an official record or shared list.</p>

      <form className="mt-5 space-y-5 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]" onSubmit={(event) => { event.preventDefault(); void saveFocusGroup() }}>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="focus-group-name">Group name</label>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="focus-group-name" onChange={(event) => setName(event.target.value)} placeholder="For example, People to follow up" value={name} />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-100">People in this group</legend>
          <p className="mt-1 text-xs leading-5 text-slate-400">Optional. You can begin with an empty group.</p>
          <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.1]">
            {snapshot.contacts.length ? snapshot.contacts.map((person) => (
              <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2" key={person.id}>
                <input checked={contactIds.includes(person.id)} className="h-4 w-4 accent-[var(--rm-teal)]" onChange={() => togglePerson(person.id)} type="checkbox" />
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--rm-violet)]/15 text-xs font-semibold text-[var(--rm-violet)]">{person.displayName.slice(0, 1)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">{person.displayName}</span>
              </label>
            )) : <p className="py-4 text-sm text-slate-400">Add a person first, then return here to include them.</p>}
          </div>
        </fieldset>

        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}
        <div className="flex gap-2 pt-1">
          <button className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => navigate('/people')} type="button">Cancel</button>
          <button className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy || !name.trim()} type="submit">Save focus group</button>
        </div>
      </form>
    </section>
  )
}
