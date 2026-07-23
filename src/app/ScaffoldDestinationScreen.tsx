import { AppIcon } from '../design-system/AppIcon'
import { destinationContent, type DestinationId } from '../test/fixtures/scaffold'

type ScaffoldDestinationScreenProps = {
  destinationId: DestinationId
}

export function ScaffoldDestinationScreen({ destinationId }: ScaffoldDestinationScreenProps) {
  const destination = destinationContent[destinationId]

  return (
    <section aria-labelledby={`${destination.id}-title`} className="animate-enter">
      <div className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Milestone 0</p>
            <h2 className="mt-2 text-xl font-semibold text-white" id={`${destination.id}-title`}>
              {destination.heading}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">{destination.description}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rm-violet)]/15 text-[var(--rm-violet)]">
            <AppIcon name={destination.icon} />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {destination.checkpoints.map((checkpoint) => (
            <div
              className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/[0.12] p-3"
              key={checkpoint.title}
            >
              <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--rm-teal)]" />
              <div>
                <h3 className="text-sm font-medium text-slate-100">{checkpoint.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{checkpoint.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="mt-5 rounded-2xl border border-[var(--rm-gold)]/15 bg-[var(--rm-gold)]/[0.07] p-4" aria-label="Build boundary">
        <p className="text-sm font-medium text-[var(--rm-gold)]">Build boundary</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          This is a fictional scaffold preview. It stores no personal information, sends no network data, and does not connect to Church systems.
        </p>
      </aside>
    </section>
  )
}
