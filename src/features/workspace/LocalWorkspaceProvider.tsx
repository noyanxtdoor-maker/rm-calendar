import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { rmCalendarDb } from '../../data/local/RmCalendarDatabase'
import { bootstrapLocalWorkspace, DEMO_WORKSPACE_ID, restoreFictionalWorkspace } from '../../data/local/workspace'
import { LocalWorkspaceContext, type LocalWorkspaceContextValue } from './LocalWorkspaceContext'

type BootstrapStatus = 'opening' | 'ready' | 'error'

function BootstrapScreen({
  title,
  detail,
  actionLabel,
  onAction
}: {
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--rm-ink)] px-6 text-slate-100">
      <section className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rm-teal)]">RM Calendar</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
        {onAction && actionLabel ? (
          <button
            className="mt-6 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] transition hover:bg-[#83e6de]"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : (
          <div aria-label="Opening local workspace" className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-[var(--rm-teal)]" />
          </div>
        )}
      </section>
    </div>
  )
}

export function LocalWorkspaceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BootstrapStatus>('opening')
  const [error, setError] = useState<string>()
  const workspace = useLiveQuery(() => rmCalendarDb.workspaces.get(DEMO_WORKSPACE_ID), [])

  const restoreWorkspace = useCallback(async () => {
    setStatus('opening')
    setError(undefined)
    try {
      await restoreFictionalWorkspace()
      setStatus('ready')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The local planning space could not be opened.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void bootstrapLocalWorkspace()
      .then(() => {
        if (!cancelled) {
          setStatus('ready')
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'The local planning space could not be opened.')
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const contextValue = useMemo<LocalWorkspaceContextValue | undefined>(() => {
    if (!workspace || workspace.deletedAt) {
      return undefined
    }

    return { workspace, restoreWorkspace }
  }, [restoreWorkspace, workspace])

  if (status === 'opening') {
    return <BootstrapScreen detail="Preparing your private, on-device planning space." title="Opening your workspace" />
  }

  if (status === 'error') {
    return (
      <BootstrapScreen
        actionLabel="Try again"
        detail={error ?? 'The local planning space could not be opened.'}
        onAction={() => void restoreWorkspace()}
        title="Workspace unavailable"
      />
    )
  }

  if (!contextValue) {
    return (
      <BootstrapScreen
        actionLabel="Create a new fictional workspace"
        detail="This device has no local planning data. Creating a workspace adds only fictional starter records."
        onAction={() => void restoreWorkspace()}
        title="Start fresh on this device"
      />
    )
  }

  return <LocalWorkspaceContext.Provider value={contextValue}>{children}</LocalWorkspaceContext.Provider>
}
