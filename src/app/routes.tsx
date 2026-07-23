import { Navigate, Route, Routes } from 'react-router-dom'
import { CalendarScreen } from '../features/calendar/CalendarScreen'
import { PeopleScreen } from '../features/people/PeopleScreen'
import { PlacesScreen } from '../features/places/PlacesScreen'
import { ToolsScreen } from '../features/settings/ToolsScreen'
import { TodayScreen } from '../features/today/TodayScreen'
import { LocalWorkspaceProvider } from '../features/workspace/LocalWorkspaceProvider'
import { AppShell } from './AppShell'

export function AppRoutes() {
  return (
    <LocalWorkspaceProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayScreen />} />
          <Route path="calendar" element={<CalendarScreen />} />
          <Route path="people" element={<PeopleScreen />} />
          <Route path="map" element={<PlacesScreen />} />
          <Route path="tools" element={<ToolsScreen />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </LocalWorkspaceProvider>
  )
}
