# RM Calendar - Phase 4, Milestone 2: People, Places, Calendar, and Planning

**Status:** Complete  
**Completed:** 2026-07-23  
**Depends on:** [Phase 4 Milestone 1](Phase-4-Milestone-1.md), [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md), [Database Schema Plan](Database-Schema-Plan.md), [Business Rules](Business-Rules.md), and [Critical Workflows](Critical-Workflows.md)

## 1. Outcome

Milestone 2 adds the first real local planning loop: create a person or household, add a typed place, plan a linked visit, preserve an unfinished form, inspect person/activity context, and reschedule an activity without duplicating it.

All of this remains local-first and fictional-data-safe. It does not need an account, network connection, or live map.

## 2. Delivered commands and local invariants

- Added validated local commands for Contact, Household, Place, Activity create, and Activity update/reschedule.
- Contacts require only a display name. A selected Household link is created in the same transaction.
- Places accept a name with optional typed context. Map coordinates remain unnecessary.
- Activities support Timed, All-day, and Draft schedule forms.
- A scheduled Activity stores an IANA workspace time zone plus unambiguous start/end instants. An all-day Activity stores a workspace-local calendar date without false midnight conversion.
- A planned Activity can link one primary Person and one primary Place.
- Creating a Person or Place inline from the activity form is atomic with the resulting Activity plan.
- Creation and updates append local Activity history events. Rescheduling preserves the existing activity ID and adds a new history event.
- Each user command writes a durable, local outbox-operation intent for the later M4 sync processor. M2 does not attempt remote delivery.
- Activity form payloads are saved in the local drafts table while the user plans. A saved form draft survives a database reopen and is deliberately excluded from the calendar until it becomes a scheduled Activity.

## 3. Delivered experience

- People screen with local search, add-person, add-household, planning status, and household list.
- Person context view with Profile-level context, planned visit journey, and planning history.
- Area Board add-place flow for typed local places.
- Day-first calendar with a compact date ribbon, direct Plan visit entry, linked activity cards, and activity detail.
- Original activity form with:

  - timed, all-day, and draft choices;
  - selected-date defaults;
  - inline Person and Place creation;
  - a non-blocking overlap warning;
  - automatic local form-draft saving;
  - edit and reschedule entry from activity detail.

The screen flow is original RM Calendar code and original visual design. It borrows only broad interaction principles from the permitted references: stay close to the selected day, make planning quick, and preserve person/place context while the user edits.

## 4. Offline and privacy boundary

- All M2 actions write to IndexedDB before the UI reports success.
- The browser does not need connectivity to create a person, typed place, form draft, or planned activity.
- The PWA service worker still caches only static shell assets. It does not cache records, API responses, credentials, or sync payloads.
- Development tests and seed records use fictional names and places only.
- No official Church record, background location, live map, attachment, sharing, account, or remote service was added.

## 5. Verification evidence

The completed local test suite proves:

1. A Household, Person, Place, linked Activity, Activity history row, and local outbox intents are created together through the local planning path.
2. Rescheduling preserves the Activity ID and writes an additional planning-history event.
3. Overlap detection warns about an existing planned item but does not block saving.
4. An inline Person is linked to a newly planned Activity.
5. A real Draft Activity stays out of the scheduled Calendar collection.
6. An incomplete activity-form draft survives a database reopen.
7. The original M1 persistence and schema-upgrade evidence remains green.

Commands run successfully:

~~~
npm run verify
  typecheck: pass
  lint: pass
  Vitest: 7 passed
  production Vite build: pass
  PWA service worker and manifest: emitted

npm run test:e2e
  Playwright Chromium mobile: 2 passed
  M1 local workspace persists after offline reload
  M2 creates a person, plans a linked visit, and retains that visit after offline reload
  no horizontal overflow is observed at phone width
~~~

The inspected mobile activity-form screenshot confirms the date-focused, original planning UI, clear schedule mode controls, visible overlap warning, linked-person context, and large touch targets.

## 6. Deliberate non-deliveries

Milestone 2 does **not** add:

- Activity completion, outcome capture, task lifecycle, notes, quick capture, or Follow-up creation;
- completed/cancelled/reopen transitions;
- remote outbox processing, authentication, Supabase, RLS, or conflict-resolution UI;
- live maps, routes, device location, imports, sharing, notifications, AI, or native packaging.

## 7. Next milestone

The next local vertical slice is **Phase 4, Milestone 3 - Completion, Outcome, Task, and Follow-up**:

1. Add Activity and Task lifecycle/history commands.
2. Add Completion and Quick Capture flows that preserve scheduled intent and actual completion time separately.
3. Add Notes and local Tasks.
4. Implement an atomic local Follow-up command that creates exactly one Task or Activity target plus one source link.
5. Update Today and Weekly Review from real local records.
6. Prove the complete person -> outcome -> follow-up loop offline across browser restart.

M3 remains local only. M4 authentication/remote sync still requires explicit authority before any external service is provisioned.
