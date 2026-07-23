import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

export function PlacesScreen() {
  const snapshot = useWorkspaceSnapshot()

  if (!snapshot) {
    return <LoadingPanel />
  }

  return (
    <section aria-labelledby="area-board-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Area board</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="area-board-title">Places without tracking.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Locations are typed locally. RM Calendar does not use live maps or background location in this beta foundation.</p>

      <div className="relative mt-5 min-h-64 overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(145deg,#142a3b,#102033_48%,#1b1c3d)] p-5 shadow-[var(--rm-shadow-card)]">
        <span aria-hidden="true" className="absolute -left-10 top-10 h-36 w-36 rounded-full border border-[var(--rm-teal)]/15" />
        <span aria-hidden="true" className="absolute right-2 top-4 h-28 w-28 rounded-full border border-[var(--rm-gold)]/15" />
        <span aria-hidden="true" className="absolute bottom-5 left-1/3 h-40 w-40 rotate-12 rounded-[2.5rem] border border-[var(--rm-violet)]/15" />
        <div className="relative flex h-full min-h-52 flex-col justify-between">
          <span className="rounded-full border border-white/[0.1] bg-[var(--rm-ink)]/60 px-3 py-1.5 text-xs font-semibold text-slate-300">Local place view</span>
          <div className="space-y-2">
            {snapshot.places.map((place, index) => (
              <article className={index % 2 ? 'ml-auto max-w-[82%] rounded-2xl border border-[var(--rm-gold)]/20 bg-[var(--rm-ink)]/70 p-3' : 'max-w-[82%] rounded-2xl border border-[var(--rm-teal)]/20 bg-[var(--rm-ink)]/70 p-3'} key={place.id}>
                <p className="text-sm font-semibold text-white">{place.name}</p>
                <p className="mt-1 text-xs text-slate-400">{place.addressText ?? 'Typed place'}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <aside className="mt-5 rounded-2xl border border-[var(--rm-gold)]/15 bg-[var(--rm-gold)]/[0.07] p-4">
        <p className="text-sm font-semibold text-[var(--rm-gold)]">Privacy boundary</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">Live map tiles, routing, and location permissions are deliberately deferred until their privacy model is approved.</p>
      </aside>
    </section>
  )
}
