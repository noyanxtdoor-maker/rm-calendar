import { useEffect, useState } from 'react'
import { createLocalWorkspaceExport, downloadLocalWorkspaceExport } from '../../data/local/export'
import { clearAllLocalData } from '../../data/local/workspace'
import { inspectLocalStoragePersistence, requestPersistentLocalStorage, type LocalStoragePersistenceReport } from '../../lib/browserStorage'
import { LoadingPanel } from '../shared/LoadingPanel'
import { SectionLabel } from '../shared/SectionLabel'
import { useLocalWorkspace } from '../workspace/useLocalWorkspace'

type BusyAction = 'export' | 'persistence' | 'clear' | undefined

function formatBytes(value: number | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value < 1024) {
    return value + ' B'
  }

  if (value < 1024 * 1024) {
    return (value / 1024).toFixed(1) + ' KB'
  }

  return (value / (1024 * 1024)).toFixed(1) + ' MB'
}

function storageSummary(report: LocalStoragePersistenceReport | undefined) {
  if (!report) {
    return 'Checking whether this browser can protect local storage.'
  }

  if (!report.supported) {
    return 'This browser does not expose a storage-persistence request. Your data remains local, but browser storage can still be cleared.'
  }

  if (report.persistent) {
    return 'This browser reports that local storage is protected from routine eviction. It is still not a replacement for a private export or device security.'
  }

  return 'This browser has not marked local storage as persistent. It may clear data under device or browser storage pressure.'
}

export function DataControlsScreen() {
  const { workspace } = useLocalWorkspace()
  const [storage, setStorage] = useState<LocalStoragePersistenceReport>()
  const [busy, setBusy] = useState<BusyAction>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [clearConfirmed, setClearConfirmed] = useState(false)

  useEffect(() => {
    let active = true
    void inspectLocalStoragePersistence().then((report) => {
      if (active) {
        setStorage(report)
      }
    })

    return () => {
      active = false
    }
  }, [])

  async function downloadExport() {
    setBusy('export')
    setMessage(undefined)
    setError(undefined)
    try {
      const data = await createLocalWorkspaceExport(workspace.id)
      downloadLocalWorkspaceExport(data)
      setMessage('Your private local export was downloaded. Store that file somewhere you trust.')
    } catch {
      setError('RM Calendar could not create a local export. Your data remains in this browser.')
    } finally {
      setBusy(undefined)
    }
  }

  async function requestPersistence() {
    setBusy('persistence')
    setMessage(undefined)
    setError(undefined)
    const report = await requestPersistentLocalStorage()
    setStorage(report)
    setBusy(undefined)

    if (report.persistent) {
      setMessage('This browser reports that it will protect RM Calendar storage from routine eviction.')
    } else if (report.supported) {
      setMessage('The browser did not grant persistent storage. Your data still stays local; a private export remains a good backup.')
    } else {
      setMessage('This browser does not support a storage-persistence request.')
    }
  }

  async function clearDeviceData() {
    if (!clearConfirmed) {
      return
    }

    setBusy('clear')
    setMessage(undefined)
    setError(undefined)
    try {
      await clearAllLocalData()
    } catch {
      setBusy(undefined)
      setError('RM Calendar could not clear all local records. Please try again before sharing this browser.')
    }
  }

  if (!workspace) {
    return <LoadingPanel />
  }

  const usage = formatBytes(storage?.usage)
  const quota = formatBytes(storage?.quota)

  return (
    <section aria-labelledby="data-controls-title" className="animate-enter space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">Private workspace</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="data-controls-title">Your local data</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">These controls act only in this browser. RM Calendar does not have a cloud account, remote backup, or sign-in configured yet.</p>
      </div>

      {message ? <p aria-live="polite" className="rounded-2xl border border-[var(--rm-teal)]/25 bg-[var(--rm-teal)]/[0.08] px-4 py-3 text-sm leading-6 text-[var(--rm-teal)]">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-300/30 bg-red-400/[0.08] px-4 py-3 text-sm leading-6 text-red-100" role="alert">{error}</p> : null}

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <SectionLabel>Export</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-white">Download a private copy</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">The JSON export includes your people, plans, tasks, notes, outcomes, history, and unfinished drafts. It can contain sensitive details, so keep it private.</p>
        <button
          className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] transition hover:bg-[#83e6de] disabled:cursor-wait disabled:opacity-60"
          disabled={busy !== undefined}
          onClick={() => void downloadExport()}
          type="button"
        >
          {busy === 'export' ? 'Preparing local export…' : 'Download local data'}
        </button>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <SectionLabel>Browser storage</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-white">Ask this browser to protect local storage</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{storageSummary(storage)}</p>
        {usage || quota ? <p className="mt-3 text-xs text-slate-500">{usage ? 'Approx. used: ' + usage : 'Usage unavailable'}{quota ? ' · available quota: ' + quota : ''}</p> : null}
        {storage?.requestFailed ? <p className="mt-3 text-xs text-[var(--rm-gold)]">The browser did not complete a storage check. You can try again or download a private export.</p> : null}
        {storage?.supported && !storage.persistent ? (
          <button
            className="mt-4 min-h-12 w-full rounded-2xl border border-[var(--rm-gold)]/35 bg-[var(--rm-gold)]/[0.08] px-4 text-sm font-semibold text-[var(--rm-gold)] transition hover:border-[var(--rm-gold)]/60 disabled:cursor-wait disabled:opacity-60"
            disabled={busy !== undefined}
            onClick={() => void requestPersistence()}
            type="button"
          >
            {busy === 'persistence' ? 'Asking browser…' : 'Ask browser to protect storage'}
          </button>
        ) : null}
      </section>

      <section className="rounded-3xl border border-red-300/20 bg-red-400/[0.04] p-5">
        <SectionLabel>Remove from this device</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-red-100">Clear all local RM Calendar data</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">This removes the workspace, people, visits, notes, drafts, local sync queue, and other RM Calendar records from this browser. It cannot be undone.</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-red-200/15 bg-[var(--rm-ink)]/30 p-4 text-sm leading-5 text-slate-200">
          <input
            checked={clearConfirmed}
            className="mt-0.5 h-5 w-5 shrink-0 accent-red-300"
            onChange={(event) => setClearConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>I understand that this removes all RM Calendar data from this browser.</span>
        </label>
        <button
          className="mt-4 min-h-12 w-full rounded-2xl border border-red-300/35 bg-red-400/[0.1] px-4 text-sm font-semibold text-red-100 transition hover:border-red-200/70 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!clearConfirmed || busy !== undefined}
          onClick={() => void clearDeviceData()}
          type="button"
        >
          {busy === 'clear' ? 'Clearing local data…' : 'Clear this browser'}
        </button>
      </section>
    </section>
  )
}
