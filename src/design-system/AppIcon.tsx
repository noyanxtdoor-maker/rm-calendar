import type { ReactNode } from 'react'
import type { NavigationIcon } from '../app/navigation'

type AppIconProps = {
  name: NavigationIcon
}

const paths: Record<NavigationIcon, ReactNode> = {
  today: <path d="M6 12.5 10.2 17 18.5 7" />,
  calendar: <path d="M7 3v3m10-3v3M4.5 9h15M6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5Z" />,
  people: <path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19m11-15.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm6 15.5v-1.5a4 4 0 0 0-2.7-3.8M10 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />,
  places: <path d="M12 20s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8.5A2.5 2.5 0 1 0 12 6a2.5 2.5 0 0 0 0 5.5Z" />,
  tools: <path d="M14.8 5.2a4.8 4.8 0 0 0-6.1 6.1L3.5 16.5a1.4 1.4 0 0 0 2 2l5.2-5.2a4.8 4.8 0 0 0 6.1-6.1L14 9.9l-2.1-2.1 2.9-2.6Z" />
}

export function AppIcon({ name }: AppIconProps) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  )
}
