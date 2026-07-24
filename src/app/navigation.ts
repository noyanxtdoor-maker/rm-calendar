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
  if (pathname === '/capture') {
    return 'Quick capture'
  }
  if (pathname.startsWith('/calendar/new')) {
    return 'Plan visit'
  }
  if (pathname.startsWith('/calendar/') && pathname.endsWith('/complete')) {
    return 'Complete visit'
  }
  if (pathname.startsWith('/calendar/') && pathname.endsWith('/follow-up')) {
    return 'Follow-up'
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
  if (pathname.startsWith('/people/groups/new')) {
    return 'Focus group'
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
  if (pathname === '/tools/tasks/new') {
    return 'Add task'
  }
  if (pathname === '/tools/weekly-review') {
    return 'Weekly review'
  }
  if (pathname === '/tools/sync-status') {
    return 'Sync status'
  }
  if (pathname === '/tools/data') {
    return 'Data controls'
  }

  return navigationDestinations.find((destination) => destination.path === pathname)?.label ?? 'RM Calendar'
}
