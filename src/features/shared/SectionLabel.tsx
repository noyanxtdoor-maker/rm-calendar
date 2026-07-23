import type { ReactNode } from 'react'

export function SectionLabel({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-white">{children}</h2>
      {action}
    </div>
  )
}
