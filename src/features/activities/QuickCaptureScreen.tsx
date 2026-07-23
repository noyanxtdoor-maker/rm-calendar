import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { quickCaptureActivity } from '../../data/local/commands'
import type { ActivityRecord } from '../../domain/models'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

export function QuickCaptureScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [activityType, setActivityType] = useState<ActivityRecord['activityType']>('visit')
  const [contactId, setContactId] = useState('')
  const [outcomeText, setOutcomeText] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  async function saveCapture() {
    setBusy(true)
    setMessage(undefined)
    try {
      const activity = await quickCaptureActivity({
        title,
        activityType,
        contactId: contactId || undefined,
        outcomeText: outcomeText || undefined
      })
      navigate('/calendar/' + activity.id)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The quick capture could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="quick-capture-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Quick capture</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="quick-capture-title">Record an unplanned visit</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Capture what happened now. Planning it first is never required.</p>

      <div className="mt-5 space-y-4 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="capture-title">What happened?</label>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="capture-title" onChange={(event) => setTitle(event.target.value)} placeholder="For example, Met with Avery" value={title} />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="capture-type">Activity type</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="capture-type" onChange={(event) => setActivityType(event.target.value as ActivityRecord['activityType'])} value={activityType}>
            <option value="visit">Visit</option>
            <option value="service">Service</option>
            <option value="planning">Planning</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="capture-person">Person (optional)</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="capture-person" onChange={(event) => setContactId(event.target.value)} value={contactId}>
            <option value="">No person linked</option>
            {snapshot.contacts.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="capture-outcome">Outcome (optional)</label>
          <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="capture-outcome" onChange={(event) => setOutcomeText(event.target.value)} placeholder="A concise outcome is enough." value={outcomeText} />
        </div>
        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}
        <div className="flex gap-2">
          <button className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => navigate('/')} type="button">Cancel</button>
          <button className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void saveCapture()} type="button">Save capture</button>
        </div>
      </div>
    </section>
  )
}
