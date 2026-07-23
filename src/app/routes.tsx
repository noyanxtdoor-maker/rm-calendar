import { Navigate, Route, Routes } from 'react-router-dom'
import { ActivityDetailScreen } from '../features/activities/ActivityDetailScreen'
import { ActivityCompletionScreen } from '../features/activities/ActivityCompletionScreen'
import { ActivityFormScreen } from '../features/activities/ActivityFormScreen'
import { CalendarScreen } from '../features/calendar/CalendarScreen'
import { FollowUpFormScreen } from '../features/activities/FollowUpFormScreen'
import { QuickCaptureScreen } from '../features/activities/QuickCaptureScreen'
import { HouseholdFormScreen } from '../features/people/HouseholdFormScreen'
import { PersonDetailScreen } from '../features/people/PersonDetailScreen'
import { PersonFormScreen } from '../features/people/PersonFormScreen'
import { PeopleScreen } from '../features/people/PeopleScreen'
import { PlaceFormScreen } from '../features/places/PlaceFormScreen'
import { PlacesScreen } from '../features/places/PlacesScreen'
import { ToolsScreen } from '../features/settings/ToolsScreen'
import { DataControlsScreen } from '../features/settings/DataControlsScreen'
import { TaskFormScreen } from '../features/tasks/TaskFormScreen'
import { TodayScreen } from '../features/today/TodayScreen'
import { WeeklyReviewScreen } from '../features/review/WeeklyReviewScreen'
import { SyncStatusScreen } from '../features/sync/SyncStatusScreen'
import { LocalWorkspaceProvider } from '../features/workspace/LocalWorkspaceProvider'
import { AppShell } from './AppShell'

export function AppRoutes() {
  return (
    <LocalWorkspaceProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayScreen />} />
          <Route path="calendar" element={<CalendarScreen />} />
          <Route path="calendar/new" element={<ActivityFormScreen />} />
          <Route path="calendar/:activityId/complete" element={<ActivityCompletionScreen />} />
          <Route path="calendar/:activityId/follow-up" element={<FollowUpFormScreen />} />
          <Route path="calendar/:activityId" element={<ActivityDetailScreen />} />
          <Route path="calendar/:activityId/edit" element={<ActivityFormScreen />} />
          <Route path="people" element={<PeopleScreen />} />
          <Route path="people/new" element={<PersonFormScreen />} />
          <Route path="people/household/new" element={<HouseholdFormScreen />} />
          <Route path="people/:contactId" element={<PersonDetailScreen />} />
          <Route path="map" element={<PlacesScreen />} />
          <Route path="map/new" element={<PlaceFormScreen />} />
          <Route path="tools" element={<ToolsScreen />} />
          <Route path="tools/data" element={<DataControlsScreen />} />
          <Route path="tools/tasks/new" element={<TaskFormScreen />} />
          <Route path="tools/weekly-review" element={<WeeklyReviewScreen />} />
          <Route path="tools/sync-status" element={<SyncStatusScreen />} />
          <Route path="capture" element={<QuickCaptureScreen />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </LocalWorkspaceProvider>
  )
}
