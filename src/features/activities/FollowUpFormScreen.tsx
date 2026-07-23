import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createFollowUp } from '../../data/local/commands'
import type { ActivityRecord } from '../../domain/models'
import { localIsoDate } from '../../lib/time'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

function tomorrowDate(timeZone: string) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return localIsoDate(tomorrow, timeZone)
}

export function FollowUpFormScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const { activityId } = useParams()
  const [targetKind, setTargetKind] = useState<'task' | 'activity'>('task')
  const [title, setTitle] = useState<string>()
  const [dueDate, setDueDate] = useState<string>()
  const [activityType, setActivityType] = useState<ActivityRecord['activityType']>('visit')
  const [scheduleKind, setScheduleKind] = useState<'timed' | 'all-day'>('timed')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:45')
  const [contactId, setContactId] = useState<string>()
  const [placeId, setPlaceId] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  const source = snapshot?.activities.find((activity) => activity.id === activityId)

  if (!snapshot) {
    return <LoadingPanel />
  }
  if (!source || source.state !== 'completed') {
    return (
      <section className="animate-enter rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h2 className="text-xl font-semibold text-white">Follow-up unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Finish the source visit before creating a linked next action.</p>
      </section>
    )
  }
  const completedSourceId = source.id
  const primaryContact = snapshot.activityContacts.find((link) => link.activityId === completedSourceId && link.isPrimary)
  const resolvedTitle = title ?? 'Follow up: ' + source.title
  const resolvedDueDate = dueDate ?? tomorrowDate(snapshot.workspace.timezone)
  const resolvedContactId = contactId ?? primaryContact?.contactId ?? ''
  const resolvedPlaceId = placeId ?? source.primaryPlaceId ?? ''

  async function saveFollowUp() {
    setBusy(true)
    setMessage(undefined)
    try {
      if (targetKind === 'task') {
        await createFollowUp({
          sourceActivityId: completedSourceId,
          targetKind: 'task',
          title: resolvedTitle,
          dueDate: resolvedDueDate,
          priority: 'normal',
          contactId: resolvedContactId || null,
          placeId: resolvedPlaceId || null
        })
      } else {
        await createFollowUp({
          sourceActivityId: completedSourceId,
          targetKind: 'activity',
          title: resolvedTitle,
          activityType,
          schedule: scheduleKind === 'all-day'
            ? { kind: 'all-day', date: resolvedDueDate }
            : { kind: 'timed', date: resolvedDueDate, startTime, endTime },
          contactId: resolvedContactId || null,
          placeId: resolvedPlaceId || null
        })
      }
      navigate('/calendar/' + completedSourceId)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The follow-up could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="follow-up-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Next action</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="follow-up-title">Create follow-up</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">This will stay linked to the completed visit that created it.</p>

      <div className="mt-5 space-y-4 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]">
        <div className="grid grid-cols-2 gap-2">
          <button className={targetKind === 'task' ? 'min-h-11 rounded-2xl border border-[var(--rm-teal)] bg-[var(--rm-teal)]/10 text-sm font-semibold text-[var(--rm-teal)]' : 'min-h-11 rounded-2xl border border-white/[0.1] text-sm font-semibold text-slate-300'} onClick={() => setTargetKind('task')} type="button">Task</button>
          <button className={targetKind === 'activity' ? 'min-h-11 rounded-2xl border border-[var(--rm-teal)] bg-[var(--rm-teal)]/10 text-sm font-semibold text-[var(--rm-teal)]' : 'min-h-11 rounded-2xl border border-white/[0.1] text-sm font-semibold text-slate-300'} onClick={() => setTargetKind('activity')} type="button">Scheduled visit</button>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="followup-title">Title</label>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="followup-title" onChange={(event) => setTitle(event.target.value)} value={resolvedTitle} />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="followup-date">{targetKind === 'task' ? 'Due date' : 'Visit date'}</label>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="followup-date" onChange={(event) => setDueDate(event.target.value)} type="date" value={resolvedDueDate} />
        </div>
        {targetKind === 'activity' ? (
          <>
            <div>
              <label className="text-sm font-semibold text-slate-100" htmlFor="followup-type">Activity type</label>
              <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="followup-type" onChange={(event) => setActivityType(event.target.value as ActivityRecord['activityType'])} value={activityType}>
                <option value="visit">Visit</option>
                <option value="planning">Planning</option>
                <option value="service">Service</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className={scheduleKind === 'timed' ? 'min-h-11 rounded-2xl border border-[var(--rm-teal)] bg-[var(--rm-teal)]/10 text-sm font-semibold text-[var(--rm-teal)]' : 'min-h-11 rounded-2xl border border-white/[0.1] text-sm font-semibold text-slate-300'} onClick={() => setScheduleKind('timed')} type="button">Timed</button>
              <button className={scheduleKind === 'all-day' ? 'min-h-11 rounded-2xl border border-[var(--rm-teal)] bg-[var(--rm-teal)]/10 text-sm font-semibold text-[var(--rm-teal)]' : 'min-h-11 rounded-2xl border border-white/[0.1] text-sm font-semibold text-slate-300'} onClick={() => setScheduleKind('all-day')} type="button">All day</button>
            </div>
            {scheduleKind === 'timed' ? <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-semibold text-slate-100" htmlFor="followup-start">Start</label><input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="followup-start" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} /></div><div><label className="text-sm font-semibold text-slate-100" htmlFor="followup-end">End</label><input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="followup-end" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} /></div></div> : null}
          </>
        ) : null}
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="followup-person">Person</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="followup-person" onChange={(event) => setContactId(event.target.value)} value={resolvedContactId}><option value="">No person</option>{snapshot.contacts.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="followup-place">Place</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="followup-place" onChange={(event) => setPlaceId(event.target.value)} value={resolvedPlaceId}><option value="">No place</option>{snapshot.places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select>
        </div>
        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}
        <div className="flex gap-2">
          <button className="min-h-12 flex-1 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => navigate('/calendar/' + completedSourceId)} type="button">Cancel</button>
          <button className="min-h-12 flex-[1.4] rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void saveFollowUp()} type="button">Save follow-up</button>
        </div>
      </div>
    </section>
  )
}
