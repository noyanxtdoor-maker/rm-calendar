import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { displayDate, displayTime, localIsoDate } from '../../lib/time'
import type { ActivityRecord } from '../../domain/models'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

function addDays(date: string, days: number, timeZone: string) {
  const value = new Date(date + 'T12:00:00')
  value.setDate(value.getDate() + days)
  return localIsoDate(value, timeZone)
}

function activityDate(activity: ActivityRecord, timeZone: string) {
  if (activity.scheduledDate) {
    return activity.scheduledDate
  }

  return activity.scheduledStartAt ? localIsoDate(new Date(activity.scheduledStartAt), timeZone) : undefined
}

export function CalendarScreen() {
  const snapshot = useWorkspaceSnapshot()
  const today = snapshot ? localIsoDate(new Date(), snapshot.workspace.timezone) : ''
  const [selectedDate, setSelectedDate] = useState(today)

  const resolvedSelectedDate = selectedDate || today
  const dateRibbon = useMemo(() => {
    if (!snapshot) {
      return []
    }

    return Array.from({ length: 7 }, (_, index) => addDays(resolvedSelectedDate, index - 3, snapshot.workspace.timezone))
  }, [resolvedSelectedDate, snapshot])

  if (!snapshot) {
    return <LoadingPanel />
  }

  const activities = snapshot.activities
    .filter((activity) => activity.state === 'scheduled' && activityDate(activity, snapshot.workspace.timezone) === resolvedSelectedDate)
    .sort((left, right) => (left.scheduledStartAt ?? '').localeCompare(right.scheduledStartAt ?? ''))
  const contactsById = new Map(snapshot.contacts.map((contact) => [contact.id, contact]))
  const placesById = new Map(snapshot.places.map((place) => [place.id, place]))

  return (
    <section aria-labelledby="calendar-day-title" className="animate-enter">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Day plan</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="calendar-day-title">
            {displayDate(resolvedSelectedDate, snapshot.workspace.timezone, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        <Link className="rounded-full border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--rm-teal)]" to={'/calendar/new?date=' + resolvedSelectedDate}>
          Plan visit
        </Link>
      </div>

      <div aria-label="Date ribbon" className="mt-5 grid grid-cols-7 gap-1.5">
        {dateRibbon.map((date) => {
          const parsed = new Date(date + 'T12:00:00')
          const isSelected = date === resolvedSelectedDate
          const isToday = date === today
          return (
            <button
              aria-pressed={isSelected}
              className={[
                'min-h-16 rounded-2xl border px-1 text-center transition',
                isSelected
                  ? 'border-[var(--rm-teal)] bg-[var(--rm-teal)] text-[var(--rm-ink)]'
                  : 'border-white/[0.08] bg-[var(--rm-surface)] text-slate-300 hover:border-white/[0.22]'
              ].join(' ')}
              key={date}
              onClick={() => setSelectedDate(date)}
              type="button"
            >
              <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em]">{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(parsed)}</span>
              <span className="mt-1 block text-base font-semibold">{parsed.getDate()}</span>
              {isToday ? <span className={isSelected ? 'mx-auto mt-1 block h-1 w-1 rounded-full bg-[var(--rm-ink)]' : 'mx-auto mt-1 block h-1 w-1 rounded-full bg-[var(--rm-gold)]'} /> : <span className="mt-1 block h-1" />}
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[var(--rm-surface-raised)] px-4 py-3">
        <span className="text-xs text-slate-300">Activities and planned visits</span>
        <span className="text-xs font-semibold text-[var(--rm-teal)]">{activities.length} on this day</span>
      </div>

      <div className="mt-4 space-y-3">
        {activities.length ? (
          activities.map((activity) => {
            const link = snapshot.activityContacts.find((candidate) => candidate.activityId === activity.id && candidate.isPrimary)
            const contact = link ? contactsById.get(link.contactId) : undefined
            const place = activity.primaryPlaceId ? placesById.get(activity.primaryPlaceId) : undefined
            return (
              <Link className="relative block overflow-hidden rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-4 shadow-[var(--rm-shadow-card)] transition hover:border-[var(--rm-teal)]/35" key={activity.id} to={'/calendar/' + activity.id}>
                <span aria-hidden="true" className={activity.activityType === 'visit' ? 'absolute inset-y-0 left-0 w-1 bg-[var(--rm-teal)]' : 'absolute inset-y-0 left-0 w-1 bg-[var(--rm-violet)]'} />
                <div className="ml-2 flex gap-4">
                  <time className="w-16 shrink-0 text-xs font-semibold text-[var(--rm-gold)]">
                    {activity.scheduledStartAt ? displayTime(activity.scheduledStartAt, snapshot.workspace.timezone) : 'All day'}
                  </time>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white">{activity.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{activity.objectiveText ?? 'A planned activity'}</p>
                    {(contact || place) && (
                      <p className="mt-3 text-xs font-medium text-slate-300">
                        {[contact?.displayName, place?.name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-white/[0.14] bg-[var(--rm-surface)] p-6 text-center">
            <p className="text-sm font-semibold text-white">An open day.</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Plan an activity for this date and it will stay available on this device, even after a reload.</p>
            <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)]" to={'/calendar/new?date=' + resolvedSelectedDate}>Plan a visit</Link>
          </div>
        )}
      </div>
    </section>
  )
}
