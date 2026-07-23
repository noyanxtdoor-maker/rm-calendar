import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createActivity, discardActivityDraft, loadActivityDraft, saveActivityDraft, updateActivity, type ActivityFormDraftPayload } from '../../data/local/commands'
import { overlappingActivities } from '../../domain/overlap'
import type { ActivityRecord } from '../../domain/models'
import type { ActivityScheduleInput } from '../../domain/schemas'
import { dateAndTimeFromInstant, localIsoDate } from '../../lib/time'
import { useWorkspaceSnapshot } from '../workspace/useLocalWorkspace'
import { LoadingPanel } from '../shared/LoadingPanel'

const initialForm: ActivityFormDraftPayload = {
  title: '',
  activityType: 'visit',
  scheduleKind: 'timed',
  date: '',
  startTime: '10:00',
  endTime: '10:45',
  objectiveText: '',
  contactId: '',
  inlineContactName: '',
  placeId: '',
  inlinePlaceName: ''
}

function scheduleFromForm(form: ActivityFormDraftPayload): ActivityScheduleInput {
  if (form.scheduleKind === 'draft') {
    return { kind: 'draft' }
  }
  if (form.scheduleKind === 'all-day') {
    return { kind: 'all-day', date: form.date }
  }
  return {
    kind: 'timed',
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime
  }
}

function primaryContactId(activity: ActivityRecord | undefined, links: { activityId: string; contactId: string; isPrimary: boolean }[]) {
  if (!activity) {
    return ''
  }
  return links.find((link) => link.activityId === activity.id && link.isPrimary)?.contactId ?? ''
}

function formForActivity(
  activity: ActivityRecord | undefined,
  timeZone: string,
  defaultDate: string,
  contactId: string
): ActivityFormDraftPayload {
  if (!activity) {
    return { ...initialForm, date: defaultDate, contactId }
  }

  if (activity.scheduledDate) {
    return {
      ...initialForm,
      title: activity.title,
      activityType: activity.activityType,
      scheduleKind: 'all-day',
      date: activity.scheduledDate,
      objectiveText: activity.objectiveText ?? '',
      contactId,
      placeId: activity.primaryPlaceId ?? ''
    }
  }

  if (activity.scheduledStartAt && activity.scheduledEndAt) {
    const start = dateAndTimeFromInstant(activity.scheduledStartAt, timeZone)
    const end = dateAndTimeFromInstant(activity.scheduledEndAt, timeZone)
    return {
      ...initialForm,
      title: activity.title,
      activityType: activity.activityType,
      scheduleKind: 'timed',
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      objectiveText: activity.objectiveText ?? '',
      contactId,
      placeId: activity.primaryPlaceId ?? ''
    }
  }

  return {
    ...initialForm,
    title: activity.title,
    activityType: activity.activityType,
    scheduleKind: 'draft',
    date: defaultDate,
    objectiveText: activity.objectiveText ?? '',
    contactId,
    placeId: activity.primaryPlaceId ?? ''
  }
}

function readDraft(payload: Record<string, unknown>, fallback: ActivityFormDraftPayload): ActivityFormDraftPayload {
  const scheduleKind = payload.scheduleKind === 'all-day' || payload.scheduleKind === 'draft' || payload.scheduleKind === 'timed'
    ? payload.scheduleKind
    : fallback.scheduleKind
  const activityType = payload.activityType === 'planning' || payload.activityType === 'service' || payload.activityType === 'personal' || payload.activityType === 'other' || payload.activityType === 'visit'
    ? payload.activityType
    : fallback.activityType

  return {
    title: typeof payload.title === 'string' ? payload.title : fallback.title,
    activityType,
    scheduleKind,
    date: typeof payload.date === 'string' ? payload.date : fallback.date,
    startTime: typeof payload.startTime === 'string' ? payload.startTime : fallback.startTime,
    endTime: typeof payload.endTime === 'string' ? payload.endTime : fallback.endTime,
    objectiveText: typeof payload.objectiveText === 'string' ? payload.objectiveText : fallback.objectiveText,
    contactId: typeof payload.contactId === 'string' ? payload.contactId : fallback.contactId,
    inlineContactName: typeof payload.inlineContactName === 'string' ? payload.inlineContactName : fallback.inlineContactName,
    placeId: typeof payload.placeId === 'string' ? payload.placeId : fallback.placeId,
    inlinePlaceName: typeof payload.inlinePlaceName === 'string' ? payload.inlinePlaceName : fallback.inlinePlaceName
  }
}

export function ActivityFormScreen() {
  const snapshot = useWorkspaceSnapshot()
  const navigate = useNavigate()
  const { activityId } = useParams()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<ActivityFormDraftPayload>(initialForm)
  const [hydrated, setHydrated] = useState(false)
  const [message, setMessage] = useState<string>()
  const [draftMessage, setDraftMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [shouldPersistDraft, setShouldPersistDraft] = useState(true)
  const initializedKey = useRef('')

  const existing = snapshot?.activities.find((activity) => activity.id === activityId)
  const queryDate = searchParams.get('date')
  const queryContactId = searchParams.get('contactId') ?? ''
  const defaultDate = snapshot ? (queryDate ?? localIsoDate(new Date(), snapshot.workspace.timezone)) : ''
  const resolvedContactId = primaryContactId(existing, snapshot?.activityContacts ?? []) || queryContactId
  const formKey = activityId ?? 'new-' + defaultDate + '-' + queryContactId
  const draftId = 'activity-form-' + formKey

  useEffect(() => {
    if (!snapshot || initializedKey.current === formKey) {
      return
    }
    let active = true
    initializedKey.current = formKey
    setHydrated(false)
    setShouldPersistDraft(true)
    const fallback = formForActivity(existing, snapshot.workspace.timezone, defaultDate, resolvedContactId)
    void loadActivityDraft(draftId).then((draft) => {
      if (!active) {
        return
      }
      setForm(draft ? readDraft(draft.payloadJson, fallback) : fallback)
      setHydrated(true)
    })

    return () => {
      active = false
    }
  }, [defaultDate, draftId, existing, formKey, resolvedContactId, snapshot])

  useEffect(() => {
    if (!snapshot || !hydrated || !shouldPersistDraft) {
      return
    }
    const timer = window.setTimeout(() => {
      void saveActivityDraft(snapshot.workspace.id, draftId, form, {
        activityId: activityId ?? null,
        source: activityId ? 'edit' : 'new'
      }).then(() => setDraftMessage('Form draft saved on this device.'))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [activityId, draftId, form, hydrated, shouldPersistDraft, snapshot])

  const overlapMatches = useMemo(
    () => snapshot && hydrated && (form.scheduleKind === 'draft' || form.date)
      ? overlappingActivities(snapshot.activities, scheduleFromForm(form), snapshot.workspace.timezone, activityId)
      : [],
    [activityId, form, hydrated, snapshot]
  )

  if (!snapshot) {
    return <LoadingPanel />
  }

  async function saveActivity() {
    setBusy(true)
    setMessage(undefined)
    setShouldPersistDraft(false)
    try {
      const input = {
        title: form.title,
        activityType: form.activityType,
        schedule: scheduleFromForm(form),
        objectiveText: form.objectiveText || undefined,
        contactId: form.contactId || undefined,
        inlineContactName: form.inlineContactName || undefined,
        placeId: form.placeId || undefined,
        inlinePlaceName: form.inlinePlaceName || undefined
      }
      const saved = activityId
        ? await updateActivity({ ...input, activityId })
        : await createActivity(input)
      await discardActivityDraft(draftId)
      navigate('/calendar/' + saved.id)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The activity could not be saved.')
      setShouldPersistDraft(true)
    } finally {
      setBusy(false)
    }
  }

  async function discardDraft() {
    setShouldPersistDraft(false)
    await discardActivityDraft(draftId)
    navigate('/calendar')
  }

  return (
    <section aria-labelledby="activity-form-title" className="animate-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-gold)]">Day plan</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="activity-form-title">{activityId ? 'Edit activity' : 'Plan a visit'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">The form is saved locally while you plan. A person or place can be added inline without losing your progress.</p>

      <form
        className="mt-5 space-y-5 rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-card)]"
        onSubmit={(event) => {
          event.preventDefault()
          void saveActivity()
        }}
      >
        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="activity-title">Visit title</label>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="activity-title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="For example, Avery visit" value={form.title} />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="activity-type">Activity type</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="activity-type" onChange={(event) => setForm((current) => ({ ...current, activityType: event.target.value as ActivityRecord['activityType'] }))} value={form.activityType}>
            <option value="visit">Visit</option>
            <option value="planning">Planning</option>
            <option value="service">Service</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-100">Plan type</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              ['timed', 'Timed'],
              ['all-day', 'All day'],
              ['draft', 'Draft']
            ].map(([value, label]) => (
              <label className={form.scheduleKind === value ? 'flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--rm-teal)] bg-[var(--rm-teal)]/10 px-2 text-xs font-semibold text-[var(--rm-teal)]' : 'flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-white/[0.1] px-2 text-xs font-semibold text-slate-300'} key={value}>
                <input checked={form.scheduleKind === value} className="sr-only" name="plan-type" onChange={() => setForm((current) => ({ ...current, scheduleKind: value as ActivityFormDraftPayload['scheduleKind'] }))} type="radio" value={value} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {form.scheduleKind !== 'draft' ? (
          <div className={form.scheduleKind === 'timed' ? 'grid grid-cols-2 gap-3' : ''}>
            <div className={form.scheduleKind === 'timed' ? 'col-span-2' : ''}>
              <label className="text-sm font-semibold text-slate-100" htmlFor="activity-date">Date</label>
              <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="activity-date" onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} type="date" value={form.date} />
            </div>
            {form.scheduleKind === 'timed' ? (
              <>
                <div>
                  <label className="text-sm font-semibold text-slate-100" htmlFor="activity-start">Start</label>
                  <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="activity-start" onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} type="time" value={form.startTime} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-100" htmlFor="activity-end">End</label>
                  <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="activity-end" onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} type="time" value={form.endTime} />
                </div>
              </>
            ) : null}
          </div>
        ) : <p className="rounded-2xl border border-[var(--rm-violet)]/20 bg-[var(--rm-violet)]/[0.07] p-3 text-xs leading-5 text-slate-300">A draft is saved locally but does not appear on the calendar.</p>}

        {overlapMatches.length ? (
          <aside className="rounded-2xl border border-[var(--rm-gold)]/25 bg-[var(--rm-gold)]/[0.08] p-3">
            <p className="text-sm font-semibold text-[var(--rm-gold)]">This overlaps {overlapMatches.length} planned item{overlapMatches.length === 1 ? '' : 's'}.</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">That is okay. Field plans move; this warning never blocks your save.</p>
          </aside>
        ) : null}

        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="activity-person">Existing person (optional)</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="activity-person" onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value, inlineContactName: '' }))} value={form.contactId}>
            <option value="">No person selected</option>
            {snapshot.contacts.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </select>
          <label className="sr-only" htmlFor="activity-inline-person">New person while planning</label>
          <input className="mt-2 min-h-11 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="activity-inline-person" onChange={(event) => setForm((current) => ({ ...current, inlineContactName: event.target.value, contactId: '' }))} placeholder="Or add a new person by name" value={form.inlineContactName} />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="activity-place">Existing place (optional)</label>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none focus:border-[var(--rm-teal)]" id="activity-place" onChange={(event) => setForm((current) => ({ ...current, placeId: event.target.value, inlinePlaceName: '' }))} value={form.placeId}>
            <option value="">No place selected</option>
            {snapshot.places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="activity-inline-place">New place while planning</label>
          <input className="mt-2 min-h-11 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="activity-inline-place" onChange={(event) => setForm((current) => ({ ...current, inlinePlaceName: event.target.value, placeId: '' }))} placeholder="Or add a new place by name" value={form.inlinePlaceName} />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-100" htmlFor="activity-objective">Objective (optional)</label>
          <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-white/[0.1] bg-[var(--rm-ink)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[var(--rm-teal)]" id="activity-objective" onChange={(event) => setForm((current) => ({ ...current, objectiveText: event.target.value }))} placeholder="What would make this visit useful?" value={form.objectiveText} />
        </div>

        <p aria-live="polite" className="text-xs text-slate-500">{draftMessage}</p>
        {message ? <p aria-live="polite" className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">{message}</p> : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="min-h-12 rounded-2xl border border-white/[0.1] px-4 text-sm font-semibold text-slate-200" onClick={() => void discardDraft()} type="button">Discard</button>
          <button className="min-h-12 rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">
            {form.scheduleKind === 'draft' ? 'Save draft activity' : 'Save plan'}
          </button>
        </div>
      </form>
    </section>
  )
}
