import type { ActivityRecord } from './models'
import type { ActivityScheduleInput } from './schemas'
import { localIsoDate, zonedDateTimeToUtcIso } from '../lib/time'

function activityDate(activity: ActivityRecord, timeZone: string) {
  if (activity.scheduledDate) {
    return activity.scheduledDate
  }

  if (!activity.scheduledStartAt) {
    return undefined
  }

  return localIsoDate(new Date(activity.scheduledStartAt), timeZone)
}

export function overlappingActivities(
  activities: ActivityRecord[],
  candidate: ActivityScheduleInput,
  timeZone: string,
  excludeActivityId?: string
) {
  if (candidate.kind === 'draft') {
    return []
  }

  return activities.filter((activity) => {
    if (activity.id === excludeActivityId || activity.deletedAt || activity.state !== 'scheduled') {
      return false
    }

    if (candidate.kind === 'all-day') {
      return activityDate(activity, timeZone) === candidate.date
    }

    if (activity.scheduledDate === candidate.date) {
      return true
    }
    if (!activity.scheduledStartAt || !activity.scheduledEndAt) {
      return false
    }

    const candidateStart = new Date(zonedDateTimeToUtcIso(candidate.date, candidate.startTime, timeZone)).getTime()
    const candidateEnd = new Date(zonedDateTimeToUtcIso(candidate.date, candidate.endTime, timeZone)).getTime()
    const existingStart = new Date(activity.scheduledStartAt).getTime()
    const existingEnd = new Date(activity.scheduledEndAt).getTime()
    return candidateStart < existingEnd && candidateEnd > existingStart
  })
}
