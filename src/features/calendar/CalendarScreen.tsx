import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityRecord } from '../../domain/models'
import { displayDate, displayTime, localIsoDate } from '../../lib/time'
import { LoadingPanel } from '../shared/LoadingPanel'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'

type CalendarView = 'day' | 'week'

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

function weekStartingOnMonday(date: string, timeZone: string) {
  const localNoon = new Date(date + 'T12:00:00')
  const day = localNoon.getDay()
  return addDays(date, day === 0 ? -6 : 1 - day, timeZone)
}

function displayDay(date: string, timeZone: string) {
  return displayDate(date, timeZone, { weekday: 'long', month: 'long', day: 'numeric' })
}

function weekRangeLabel(dates: string[], timeZone: string) {
  return displayDate(dates[0], timeZone, { weekday: undefined, month: 'short', day: 'numeric' })
    + ' – ' + displayDate(dates[dates.length - 1], timeZone, { weekday: undefined, month: 'short', day: 'numeric' })
}

export function CalendarScreen() {
  const snapshot = useWorkspaceSnapshot()
  const today = snapshot ? localIsoDate(new Date(), snapshot.workspace.timezone) : ''
  const [selectedDate, setSelectedDate] = useState(today)
  const [view, setView] = useState<CalendarView>('day')
  const viewButtons = useRef<Record<CalendarView, HTMLButtonElement | null>>({ day: null, week: null })

  const resolvedSelectedDate = selectedDate || today
  const dateRibbon = useMemo(() => {
    if (!snapshot) {
      return []
    }

    return Array.from({ length: 7 }, (_, index) => addDays(resolvedSelectedDate, index - 3, snapshot.workspace.timezone))
  }, [resolvedSelectedDate, snapshot])
  const weekDates = useMemo(() => {
    if (!snapshot) {
      return []
    }

    const start = weekStartingOnMonday(resolvedSelectedDate, snapshot.workspace.timezone)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index, snapshot.workspace.timezone))
  }, [resolvedSelectedDate, snapshot])

  if (!snapshot) {
    return <LoadingPanel />
  }

  const scheduledActivities = snapshot.activities
    .filter((activity) => activity.state === 'scheduled')
    .sort((left, right) => (left.scheduledStartAt ?? '').localeCompare(right.scheduledStartAt ?? ''))
  const activities = scheduledActivities.filter((activity) => activityDate(activity, snapshot.workspace.timezone) === resolvedSelectedDate)
  const activitiesByDate = new Map<string, ActivityRecord[]>()
  for (const activity of scheduledActivities) {
    const date = activityDate(activity, snapshot.workspace.timezone)
    if (!date || !weekDates.includes(date)) {
      continue
    }
    const existing = activitiesByDate.get(date) ?? []
    existing.push(activity)
    activitiesByDate.set(date, existing)
  }
  const contactsById = new Map(snapshot.contacts.map((contact) => [contact.id, contact]))
  const placesById = new Map(snapshot.places.map((place) => [place.id, place]))

  function selectView(next: CalendarView, focus = false) {
    setView(next)
    if (focus) {
      window.requestAnimationFrame(() => viewButtons.current[next]?.focus())
    }
  }

  function onViewKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: CalendarView) {
    const ordered: CalendarView[] = ['day', 'week']
    const index = ordered.indexOf(current)
    let next: CalendarView | undefined

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = ordered[(index + 1) % ordered.length]
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = ordered[(index + ordered.length - 1) % ordered.length]
    } else if (event.key === 'Home') {
      next = ordered[0]
    } else if (event.key === 'End') {
      next = ordered[ordered.length - 1]
    }

    if (next) {
      event.preventDefault()
      selectView(next, true)
    }
  }

  function openDay(date: string) {
    setSelectedDate(date)
    setView('day')
  }

  const activePanelId = view === 'day' ? 'calendar-day-panel' : 'calendar-week-panel'

  return (
    <section aria-labelledby={view === 'day' ? 'calendar-day-title' : 'calendar-week-title'} className="animate-enter">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">{view === 'day' ? 'Day plan' : 'Week rhythm'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id={view === 'day' ? 'calendar-day-title' : 'calendar-week-title'}>
            {view === 'day' ? displayDay(resolvedSelectedDate, snapshot.workspace.timezone) : weekRangeLabel(weekDates, snapshot.workspace.timezone)}
          </h2>
        </div>
        <Link className="rounded-full border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--rm-teal)]" to={'/calendar/new?date=' + resolvedSelectedDate}>
          Plan visit
        </Link>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div aria-label="Calendar view" className="inline-grid grid-cols-2 rounded-2xl border border-white/[0.09] bg-[var(--rm-surface)] p-1" role="tablist">
          {([
            ['day', 'Day plan'],
            ['week', 'Week rhythm']
          ] as const).map(([candidate, label]) => (
            <button
              aria-controls={candidate === 'day' ? 'calendar-day-panel' : 'calendar-week-panel'}
              aria-selected={view === candidate}
              className={view === candidate ? 'min-h-10 rounded-xl bg-[var(--rm-teal)] px-3 text-xs font-semibold text-[var(--rm-ink)]' : 'min-h-10 rounded-xl px-3 text-xs font-semibold text-slate-400 transition hover:text-slate-100'}
              id={'calendar-view-' + candidate}
              key={candidate}
              onClick={() => selectView(candidate)}
              onKeyDown={(event) => onViewKeyDown(event, candidate)}
              ref={(element) => { viewButtons.current[candidate] = element }}
              role="tab"
              tabIndex={view === candidate ? 0 : -1}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label={view === 'day' ? 'Previous day' : 'Previous week'}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.1] bg-[var(--rm-surface)] text-lg text-slate-200 transition hover:border-[var(--rm-gold)]/45"
            onClick={() => setSelectedDate(addDays(resolvedSelectedDate, view === 'day' ? -1 : -7, snapshot.workspace.timezone))}
            type="button"
          >
            ‹
          </button>
          <button
            className="min-h-10 rounded-xl px-2 text-xs font-semibold text-[var(--rm-gold)] transition hover:bg-[var(--rm-gold)]/[0.08]"
            onClick={() => setSelectedDate(today)}
            type="button"
          >
            Today
          </button>
          <button
            aria-label={view === 'day' ? 'Next day' : 'Next week'}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.1] bg-[var(--rm-surface)] text-lg text-slate-200 transition hover:border-[var(--rm-gold)]/45"
            onClick={() => setSelectedDate(addDays(resolvedSelectedDate, view === 'day' ? 1 : 7, snapshot.workspace.timezone))}
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      {view === 'day' ? (
        <div aria-labelledby="calendar-view-day" id={activePanelId} role="tabpanel" tabIndex={0}>
          <div aria-label="Date ribbon" className="mt-5 grid grid-cols-7 gap-1.5">
            {dateRibbon.map((date) => {
              const parsed = new Date(date + 'T12:00:00')
              const isSelected = date === resolvedSelectedDate
              const isToday = date === today
              return (
                <button
                  aria-label={'Show ' + displayDay(date, snapshot.workspace.timezone)}
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
                        {(contact || place) && <p className="mt-3 text-xs font-medium text-slate-300">{[contact?.displayName, place?.name].filter(Boolean).join(' · ')}</p>}
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
        </div>
      ) : (
        <div aria-labelledby="calendar-view-week" id={activePanelId} role="tabpanel" tabIndex={0}>
          <p className="mt-5 text-sm leading-6 text-slate-400">Scan the week before you commit to a day. Open any day to work with its detailed plan.</p>
          <div className="mt-4 space-y-2">
            {weekDates.map((date) => {
              const dayActivities = activitiesByDate.get(date) ?? []
              const isToday = date === today
              const isSelected = date === resolvedSelectedDate
              return (
                <section className={isSelected ? 'rounded-3xl border border-[var(--rm-teal)]/35 bg-[var(--rm-teal)]/[0.07] p-4' : 'rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-4'} key={date}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      aria-label={'Open day: ' + displayDay(date, snapshot.workspace.timezone)}
                      className="min-h-10 text-left"
                      onClick={() => openDay(date)}
                      type="button"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        {displayDate(date, snapshot.workspace.timezone, { weekday: 'long', month: undefined, day: undefined })}
                        {isToday ? <span className="rounded-full bg-[var(--rm-gold)]/15 px-2 py-0.5 text-[0.62rem] font-semibold text-[var(--rm-gold)]">Today</span> : null}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">{displayDate(date, snapshot.workspace.timezone, { weekday: undefined, month: 'long', day: 'numeric' })}</span>
                    </button>
                    <span className={dayActivities.length ? 'rounded-full bg-[var(--rm-teal)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--rm-teal)]' : 'rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-500'}>{dayActivities.length} planned</span>
                  </div>
                  {dayActivities.length ? (
                    <div className="mt-3 space-y-1.5 border-t border-white/[0.07] pt-3">
                      {dayActivities.slice(0, 3).map((activity) => (
                        <Link className="flex min-h-10 items-center gap-3 rounded-xl px-2 text-sm transition hover:bg-white/[0.05]" key={activity.id} to={'/calendar/' + activity.id}>
                          <time className="w-14 shrink-0 text-[0.68rem] font-semibold text-[var(--rm-gold)]">{activity.scheduledStartAt ? displayTime(activity.scheduledStartAt, snapshot.workspace.timezone) : 'All day'}</time>
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-200">{activity.title}</span>
                          <span aria-hidden="true" className="text-slate-500">›</span>
                        </Link>
                      ))}
                      {dayActivities.length > 3 ? <button className="min-h-10 px-2 text-xs font-semibold text-[var(--rm-teal)]" onClick={() => openDay(date)} type="button">See {dayActivities.length - 3} more on this day</button> : null}
                    </div>
                  ) : (
                    <Link className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--rm-teal)]" to={'/calendar/new?date=' + date}>Plan this day</Link>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
