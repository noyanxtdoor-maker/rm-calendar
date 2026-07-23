import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createHousehold } from '../../data/local/commands'

export function HouseholdFormScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function saveHousehold() {
    setBusy(true)
    setMessage(undefined)
    try {
      await createHousehold({ name })
      navigate('/people')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The household could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="new-household-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-violet)]">People</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="new-household-title">Add a household</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">A household is private planning context, not an official record.</p>

      <div className="mt-5 space-y-4 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="household-name">Household name</label>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]"
            id="household-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="For example, Morgan household"
            value={name}
          />
        </div>
        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}
        <div className="flex gap-2 pt-1">
          <button className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => navigate('/people')} type="button">Cancel</button>
          <button className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void saveHousehold()} type="button">Save household</button>
        </div>
      </div>
    </section>
  )
}
