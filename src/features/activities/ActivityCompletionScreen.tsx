import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { completeActivity } from '../../data/local/commands'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

export function ActivityCompletionScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const { activityId } = useParams()
  const [outcomeText, setOutcomeText] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (!snapshot) {
    return <LoadingPanel />
  }

  const activity = snapshot.activities.find((candidate) => candidate.id === activityId)
  if (!activity) {
    return <LoadingPanel label="Finding activity" />
  }
  const completedActivityId = activity.id

  async function saveCompletion(continueToFollowUp: boolean) {
    setBusy(true)
    setMessage(undefined)
    try {
      await completeActivity({ activityId: completedActivityId, outcomeText })
      navigate(continueToFollowUp ? '/calendar/' + completedActivityId + '/follow-up' : '/calendar/' + completedActivityId)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The completion could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="completion-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">Record what happened</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="completion-title">Complete visit</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">The planned time stays in history. This records what happened now, on this device.</p>

      <div className="mt-5 rounded-3xl border border-[var(--rm-teal)]/20 bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <p className="text-lg font-semibold text-white">{activity.title}</p>
        <p className="mt-1 text-xs text-slate-400">Actual completion time is saved when you confirm.</p>

        <label className="mt-5 block text-sm font-semibold text-slate-100" htmlFor="completion-outcome">Outcome (optional)</label>
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]"
          id="completion-outcome"
          onChange={(event) => setOutcomeText(event.target.value)}
          placeholder="A short outcome is enough. Keep sensitive details to what you are entitled to keep."
          value={outcomeText}
        />

        {message ? <p aria-live="polite" className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}

        <div className="mt-5 grid gap-2">
          <button className="min-h-12 rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void saveCompletion(false)} type="button">Save completion</button>
          <button className="min-h-12 rounded-2xl border border-[var(--rm-gold)]/30 px-4 text-sm font-semibold text-[var(--rm-gold)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void saveCompletion(true)} type="button">Save and create follow-up</button>
          <button className="min-h-11 text-sm font-semibold text-slate-400" onClick={() => navigate('/calendar/' + completedActivityId)} type="button">Back without completing</button>
        </div>
      </div>
    </section>
  )
}
