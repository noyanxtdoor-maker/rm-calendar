export type NavigationIcon = 'today' | 'calendar' | 'people' | 'places' | 'tools'

export type DestinationId = NavigationIcon

type Checkpoint = {
  title: string
  detail: string
}

type DestinationContent = {
  id: DestinationId
  path: string
  label: string
  icon: NavigationIcon
  heading: string
  description: string
  checkpoints: Checkpoint[]
}

export const navigationDestinations: DestinationContent[] = [
  {
    id: 'today',
    path: '/',
    label: 'Home',
    icon: 'today',
    heading: 'A reliable starting point',
    description: 'The mobile route shell is ready. Real daily planning begins when the local workspace arrives in Milestone 1.',
    checkpoints: [
      { title: 'Original shell', detail: 'A phone-first frame built for RM Calendar, not a copied product screen.' },
      { title: 'Local-only preview', detail: 'No account, cloud API, or personal data is involved in this scaffold.' }
    ]
  },
  {
    id: 'calendar',
    path: '/calendar',
    label: 'Calendar',
    icon: 'calendar',
    heading: 'Planning route is connected',
    description: 'Calendar routes and responsive navigation are established; real activities, dates, and drafts are intentionally deferred to Milestone 2.',
    checkpoints: [
      { title: 'Route-backed destination', detail: 'Browser navigation and direct links work before real records exist.' },
      { title: 'No fake commitments', detail: 'This scaffold never presents placeholder content as a real calendar plan.' }
    ]
  },
  {
    id: 'people',
    path: '/people',
    label: 'People',
    icon: 'people',
    heading: 'People context comes next',
    description: 'People and household records will be local-first data in Milestone 2, after the local workspace foundation is proven.',
    checkpoints: [
      { title: 'Independent vocabulary', detail: 'The future model supports people and households without claiming official records.' },
      { title: 'Fictional fixtures only', detail: 'No contact or member information is bundled into this project.' }
    ]
  },
  {
    id: 'places',
    path: '/map',
    label: 'Map',
    icon: 'places',
    heading: 'Place support is deliberately light',
    description: 'The first functional place experience will accept typed locations. Live maps and background location remain out of scope for the beta.',
    checkpoints: [
      { title: 'No map provider', detail: 'Milestone 0 makes no network request to mapping or location services.' },
      { title: 'Privacy boundary', detail: 'Location consent and sharing are design gates, not assumptions.' }
    ]
  },
  {
    id: 'tools',
    path: '/tools',
    label: 'Tools',
    icon: 'tools',
    heading: 'Guardrails are in place',
    description: 'Testing, type checks, linting, offline app-shell caching, and CI are ready before workflow features are added.',
    checkpoints: [
      { title: 'Static app shell', detail: 'The PWA caches build assets only; it does not cache private API responses.' },
      { title: 'Future sync is explicit', detail: 'Supabase and authentication are deferred until Milestone 4 with separate approval gates.' }
    ]
  }
]

export const destinationContent = Object.fromEntries(
  navigationDestinations.map((destination) => [destination.id, destination])
) as Record<DestinationId, DestinationContent>
