export function LoadingPanel({ label = 'Loading local planning data' }: { label?: string }) {
  return (
    <div className="animate-enter rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.12]" />
      <p className="mt-4 text-sm text-slate-300">{label}…</p>
    </div>
  )
}
