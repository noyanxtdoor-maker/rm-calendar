export type NavigationIcon = 'today' | 'calendar' | 'people' | 'places' | 'tools'

export type DestinationId = NavigationIcon

export type NavigationDestination = {
  id: DestinationId
  path: string
  label: string
  icon: NavigationIcon
}

export const navigationDestinations: NavigationDestination[] = [
  { id: 'today', path: '/', label: 'Home', icon: 'today' },
  { id: 'calendar', path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'people', path: '/people', label: 'People', icon: 'people' },
  { id: 'places', path: '/map', label: 'Map', icon: 'places' },
  { id: 'tools', path: '/tools', label: 'Tools', icon: 'tools' }
]

export function destinationTitle(pathname: string) {
  return navigationDestinations.find((destination) => destination.path === pathname)?.label ?? 'RM Calendar'
}
