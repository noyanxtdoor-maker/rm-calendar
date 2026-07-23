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
  if (pathname.startsWith('/calendar/new')) {
    return 'Plan visit'
  }
  if (pathname.startsWith('/calendar/') && pathname.endsWith('/edit')) {
    return 'Edit visit'
  }
  if (pathname.startsWith('/calendar/')) {
    return 'Visit'
  }
  if (pathname.startsWith('/people/household/new')) {
    return 'Household'
  }
  if (pathname.startsWith('/people/new')) {
    return 'Add person'
  }
  if (pathname.startsWith('/people/')) {
    return 'Person'
  }
  if (pathname.startsWith('/map/new')) {
    return 'Add place'
  }

  return navigationDestinations.find((destination) => destination.path === pathname)?.label ?? 'RM Calendar'
}
