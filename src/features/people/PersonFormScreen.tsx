import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContact } from '../../data/local/commands'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

export function PersonFormScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [householdId, setHouseholdId] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const households = snapshot.organizations.filter((organization) => organization.kind === 'household')

  async function savePerson() {
    setBusy(true)
    setMessage(undefined)
    try {
      const person = await createContact({ displayName, householdId: householdId || undefined })
      navigate('/people/' + person.id)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The person could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="new-person-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">People</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="new-person-title">Add a person</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Start with a name. Every other detail can wait until it is useful.</p>

      <div className="mt-5 space-y-4 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="person-name">Person name</label>
          <input
            autoComplete="name"
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]"
            id="person-name"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="For example, Alex Morgan"
            value={displayName}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="person-household">Household (optional)</label>
          <select
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]"
            id="person-household"
            onChange={(event) => setHouseholdId(event.target.value)}
            value={householdId}
          >
            <option value="">No household yet</option>
            {households.map((household) => <option key={household.id} value={household.id}>{household.name}</option>)}
          </select>
        </div>

        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}

        <div className="flex gap-2 pt-1">
          <button
            className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200"
            onClick={() => navigate('/people')}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60"
            disabled={busy}
            onClick={() => void savePerson()}
            type="button"
          >
            Save person
          </button>
        </div>
      </div>
    </section>
  )
}
