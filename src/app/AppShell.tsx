import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppIcon } from '../design-system/AppIcon'
import { destinationTitle, navigationDestinations } from './navigation'
import { useLocalWorkspace } from '../features/workspace/useLocalWorkspace'

export function AppShell() {
  const location = useLocation()
  const title = destinationTitle(location.pathname)
  const { workspace } = useLocalWorkspace()
  const usingCloudWorkspace = workspace.ownerUserId !== 'local-device-owner'
  const [planningToolsOpen, setPlanningToolsOpen] = useState(false)
  const planningToolsButton = useRef<HTMLButtonElement>(null)

  function closePlanningTools() {
    setPlanningToolsOpen(false)
    window.requestAnimationFrame(() => planningToolsButton.current?.focus())
  }

  useEffect(() => {
    if (!planningToolsOpen) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePlanningTools()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [planningToolsOpen])

  return (
    <div className="min-h-dvh bg-[var(--rm-ink)] text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col border-x border-white/[0.06] bg-[var(--rm-ink)] shadow-[0_0_70px_rgba(1,7,18,0.32)]">
        <header className="flex items-center justify-between gap-3 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-expanded={planningToolsOpen}
              aria-haspopup="dialog"
              aria-label="Open planning tools"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-lg text-slate-200 transition hover:border-[var(--rm-teal)]/45 hover:text-[var(--rm-teal)] focus:outline-none focus:ring-2 focus:ring-[var(--rm-teal)]"
              onClick={() => setPlanningToolsOpen(true)}
              ref={planningToolsButton}
              type="button"
            >
              <span aria-hidden="true">☰</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rm-teal)]">RM Calendar</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-white">{title}</h1>
            </div>
          </div>
          <div
            aria-label={usingCloudWorkspace ? 'Data status: private cloud workspace' : 'Data status: stored on this device'}
            className="flex h-10 items-center gap-2 rounded-full border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/10 px-3 text-xs font-medium text-[var(--rm-teal)]"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--rm-teal)]" />
            {usingCloudWorkspace ? 'Cloud ready' : 'On this device'}
          </div>
        </header>

        <main className="flex-1 px-5 pb-28" id="main-content">
          <Outlet />
        </main>

        <nav
          aria-label="Primary navigation"
          className="sticky bottom-0 grid grid-cols-5 border-t border-white/[0.08] bg-[color:rgba(9,17,31,0.94)] px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
        >
          {navigationDestinations.map((destination) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.63rem] font-medium transition-colors',
                  isActive ? 'bg-white/[0.07] text-[var(--rm-teal)]' : 'text-slate-400 hover:text-slate-100'
                ].join(' ')
              }
              key={destination.id}
              to={destination.path}
            >
              <AppIcon name={destination.icon} />
              <span>{destination.label}</span>
            </NavLink>
          ))}
        </nav>

        <footer className="sr-only">
          RM Calendar is an independent planning companion and is not affiliated with The Church of Jesus Christ of Latter-day Saints.
        </footer>

        {planningToolsOpen ? <div className="fixed inset-0 z-40 flex justify-center" role="presentation">
          <button aria-label="Close planning tools" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={closePlanningTools} type="button" />
          <aside aria-label="Planning tools" aria-modal="true" className="relative flex min-h-dvh w-full max-w-[34rem] flex-col border-x border-white/[0.08] bg-[var(--rm-ink)] shadow-2xl" role="dialog">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">Planning space</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Planning tools</h2>
              </div>
              <button aria-label="Close planning tools" className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-xl text-slate-200 transition hover:border-[var(--rm-teal)]/45 hover:text-[var(--rm-teal)]" onClick={closePlanningTools} type="button">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <section aria-labelledby="planning-tools-create">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400" id="planning-tools-create">Create</h3>
                <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.1]">
                  <NavLink className="flex min-h-16 items-center justify-between gap-4 py-3 text-left" onClick={closePlanningTools} to="/capture">
                    <span><span className="block text-sm font-semibold text-white">Quick capture</span><span className="mt-1 block text-xs text-slate-400">Save the thought before it gets lost.</span></span><span aria-hidden="true" className="text-xl text-[var(--rm-gold)]">+</span>
                  </NavLink>
                  <NavLink className="flex min-h-16 items-center justify-between gap-4 py-3 text-left" onClick={closePlanningTools} to="/calendar/new">
                    <span><span className="block text-sm font-semibold text-white">Plan a visit</span><span className="mt-1 block text-xs text-slate-400">Place the next meaningful action in time.</span></span><span aria-hidden="true" className="text-xl text-[var(--rm-teal)]">›</span>
                  </NavLink>
                  <NavLink className="flex min-h-16 items-center justify-between gap-4 py-3 text-left" onClick={closePlanningTools} to="/people/new">
                    <span><span className="block text-sm font-semibold text-white">Add a person</span><span className="mt-1 block text-xs text-slate-400">Keep people and their next steps connected.</span></span><span aria-hidden="true" className="text-xl text-[var(--rm-violet)]">›</span>
                  </NavLink>
                </div>
              </section>

              <section aria-labelledby="planning-tools-review" className="mt-7">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400" id="planning-tools-review">Review and protect</h3>
                <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.1]">
                  <NavLink className="flex min-h-14 items-center justify-between gap-4 py-2 text-sm font-semibold text-slate-200" onClick={closePlanningTools} to="/tools/weekly-review"><span>Weekly review</span><span aria-hidden="true" className="text-[var(--rm-gold)]">›</span></NavLink>
                  <NavLink className="flex min-h-14 items-center justify-between gap-4 py-2 text-sm font-semibold text-slate-200" onClick={closePlanningTools} to="/tools"><span>Tasks and follow-ups</span><span aria-hidden="true" className="text-[var(--rm-violet)]">›</span></NavLink>
                  <NavLink className="flex min-h-14 items-center justify-between gap-4 py-2 text-sm font-semibold text-slate-200" onClick={closePlanningTools} to="/tools/sync-status"><span>Sync status</span><span aria-hidden="true" className="text-[var(--rm-teal)]">›</span></NavLink>
                  <NavLink className="flex min-h-14 items-center justify-between gap-4 py-2 text-sm font-semibold text-slate-200" onClick={closePlanningTools} to="/tools/data"><span>Data controls</span><span aria-hidden="true" className="text-slate-400">›</span></NavLink>
                </div>
              </section>
            </div>

            <p className="border-t border-white/[0.08] px-5 py-4 text-xs leading-5 text-slate-500">Built around your own planning practice. Your data stays under your control.</p>
          </aside>
        </div> : null}
      </div>
    </div>
  )
}
