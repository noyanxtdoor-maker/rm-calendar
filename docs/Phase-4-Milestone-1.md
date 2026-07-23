# RM Calendar - Phase 4, Milestone 1: Local Workspace and Design Shell

**Status:** Complete  
**Completed:** 2026-07-23  
**Depends on:** [Phase 4 Milestone 0](Phase-4-Milestone-0.md), [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md), [Database Schema Plan](Database-Schema-Plan.md), and [Phase 2 UX Specification](Phase-2-UX-Spec.md)

## 1. Outcome

Milestone 1 replaces the static scaffold preview with a real, local-first fictional workspace. The application now has a versioned IndexedDB schema, a private on-device workspace bootstrap, local settings, a data-driven five-destination shell, and visible privacy boundaries.

This is still a development workspace. Its starter records are deliberately fictional and it has no account, cloud service, map provider, Church-system connection, or background synchronization.

## 2. Delivered implementation

- Added Dexie 4, dexie-react-hooks, Zod 4, and fake-indexeddb for browser persistence and deterministic tests.
- Added RmCalendarDatabase, with a version 1 core schema and a version 2 migration that adds the approved local table/index foundation:

~~~
workspaces, contacts, organizations, places, contact_organizations,
contact_places, activities, activity_contacts, tasks, follow_ups,
notes, activity_history, task_history, reminders, tags,
tag_assignments, drafts, outbox_operations, sync_metadata,
conflicts, local_settings
~~~

- Added a fictional single-owner workspace bootstrap. It seeds original demo people, one typed place, scheduled activities, a linked activity-person record, and an open task.
- Added live Dexie queries. Home, Calendar, People, Map/Area Board, and Tools now render from the local database rather than a static route fixture.
- Added a device-only status surface, a focused privacy/disclaimer surface, a local-data clearing path, and a way to restore only fictional starter data.
- Added a tightly scoped **Add fictional person** control in Tools. It exists solely to prove M1 persistence; it is not the upcoming M2 person form.
- Kept the original Mission Companion design system and phone-first composition. The calendar now has an original date ribbon and day-plan timeline based on local activities.

## 3. Dayflow reference boundary

The founder asked that [Dayflow Calendar](https://github.com/dayflow-js/calendar) be reviewed as a calendar reference. Its public repository is MIT-licensed and describes a calendar component with day/week/month/year views, direct calendar creation, drag/resize, mobile support, and custom event-detail surfaces.

RM Calendar adopted only high-level interaction lessons for later work:

- make the day view and date movement quick to scan;
- keep creation and detail actions near the current schedule;
- preserve a consistent time model as views expand;
- treat the calendar as an interface over RM Calendar's own domain rules.

RM Calendar does **not** import Dayflow, copy its source, copy its visual expression, or use it as a substitute for the approved local-first domain model. The current date ribbon and day-plan components are project-owned code.

## 4. Privacy and offline boundary

- Domain records live in IndexedDB on this browser/device.
- The generated PWA service worker still precaches static app-shell files only. It has no data/API/auth runtime cache rule.
- Clearing local data writes a local lifecycle marker, so a reload does not silently recreate data after the user explicitly clears it.
- Restoring a workspace creates only the fictional starter workspace.
- The UI states that RM Calendar is independent and unaffiliated with The Church of Jesus Christ of Latter-day Saints, and warns against entering official Church records or confidential information.
- Browser storage is useful for local durability but is not represented as a security vault or an indestructible backup.

## 5. Verification evidence

The following commands passed:

~~~
npm run verify
  typecheck: pass
  lint: pass
  Vitest: 3 passed
  production Vite build: pass
  PWA service worker and manifest: emitted

npm run test:e2e
  Playwright Chromium mobile: 1 passed
  verifies phone-width layout, local workspace boot, calendar navigation,
  a new fictional local person, browser reload while offline, and retained data
~~~

The persistence test reopens the Dexie database after creating a local record. The migration test upgrades a version-one database and confirms its existing contact remains available after the version-two schema is opened. The inspected phone-width screenshot confirms an original, readable dark workbench with no horizontal overflow.

## 6. Deliberate non-deliveries

Milestone 1 does **not** implement:

- real People/Household or Place forms, person detail/history, search, or groups;
- activity creation/edit/reschedule, overlap warnings, date persistence, or durable drafts;
- completion/outcome capture, notes, task lifecycle/history, or Follow-up commands;
- Supabase, authentication, RLS, an outbox processor, remote sync, or conflict recovery;
- live maps, routing, imports, sharing, attachments, notifications, AI, or native packaging.

## 7. Next milestone

The next local vertical slice is **Phase 4, Milestone 2 - People, Places, Calendar, and Planning**:

1. Add validated Contact/Household and Place commands.
2. Build a real person context/detail experience and local search/group queries.
3. Add a calendar activity create/edit/reschedule flow with a person/place link.
4. Add local drafts and non-blocking overlap warnings.
5. Prove a user can create a person, plan a linked activity, reload, and see the same data without a connection.

Milestone 2 may extend the Dayflow-inspired interaction principles, but it must preserve RM Calendar's original UI and local-first command boundary.
