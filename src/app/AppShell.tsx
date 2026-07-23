import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppIcon } from '../design-system/AppIcon'
import { navigationDestinations } from '../test/fixtures/scaffold'

function destinationTitle(pathname: string) {
  return navigationDestinations.find((destination) => destination.path === pathname)?.label ?? 'RM Calendar'
}

export function AppShell() {
  const location = useLocation()
  const title = destinationTitle(location.pathname)

  return (
    <div className="min-h-dvh bg-[var(--rm-ink)] text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col border-x border-white/[0.06] bg-[var(--rm-ink)] shadow-[0_0_70px_rgba(1,7,18,0.32)]">
        <header className="flex items-center justify-between px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rm-teal)]">RM Calendar</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{title}</h1>
          </div>
          <div
            aria-label="Scaffold status: local preview"
            className="flex h-10 items-center gap-2 rounded-full border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/10 px-3 text-xs font-medium text-[var(--rm-teal)]"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--rm-teal)]" />
            Local preview
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
      </div>
    </div>
  )
}
