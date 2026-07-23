import { useState } from 'react'
import { acknowledgeLocalPrivacyNotice } from '../../data/local/workspace'

export function PrivacyOnboarding() {
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function continueToWorkspace() {
    if (!acknowledged) {
      return
    }

    setBusy(true)
    setError(undefined)
    try {
      await acknowledgeLocalPrivacyNotice()
    } catch {
      setError('RM Calendar could not save your acknowledgement on this device. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--rm-ink)] px-5 py-8 text-slate-100">
      <section aria-labelledby="privacy-notice-title" className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rm-teal)]">RM Calendar</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white" id="privacy-notice-title">Before you begin</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">This independent planning companion currently saves its workspace only in this browser. Cloud sync has not been set up.</p>

        <ul className="mt-5 space-y-3 text-sm leading-5 text-slate-300">
          <li className="rounded-2xl border border-white/[0.07] bg-[var(--rm-ink)]/40 p-3">Use it for your own planning. Do not enter official Church records or confidential information.</li>
          <li className="rounded-2xl border border-white/[0.07] bg-[var(--rm-ink)]/40 p-3">Your browser can clear local storage. You will be able to download a private copy from Data controls.</li>
          <li className="rounded-2xl border border-[var(--rm-gold)]/20 bg-[var(--rm-gold)]/[0.07] p-3 text-[var(--rm-gold)]">RM Calendar is independent and not affiliated with The Church of Jesus Christ of Latter-day Saints.</li>
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.1] p-4 text-sm leading-5 text-slate-200">
          <input
            checked={acknowledged}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--rm-teal)]"
            onChange={(event) => setAcknowledged(event.target.checked)}
            type="checkbox"
          />
          <span>I understand this local-only privacy boundary.</span>
        </label>

        {error ? <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-400/[0.08] px-4 py-3 text-sm text-red-100" role="alert">{error}</p> : null}

        <button
          className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] transition hover:bg-[#83e6de] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!acknowledged || busy}
          onClick={() => void continueToWorkspace()}
          type="button"
        >
          {busy ? 'Saving acknowledgement…' : 'Continue to my planning space'}
        </button>
      </section>
    </main>
  )
}
