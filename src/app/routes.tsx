import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ScaffoldDestinationScreen } from './ScaffoldDestinationScreen'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ScaffoldDestinationScreen destinationId="today" />} />
        <Route path="calendar" element={<ScaffoldDestinationScreen destinationId="calendar" />} />
        <Route path="people" element={<ScaffoldDestinationScreen destinationId="people" />} />
        <Route path="map" element={<ScaffoldDestinationScreen destinationId="places" />} />
        <Route path="tools" element={<ScaffoldDestinationScreen destinationId="tools" />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
