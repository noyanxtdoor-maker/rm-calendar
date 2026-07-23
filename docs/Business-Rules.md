# RM Calendar — Business Rules

**Version:** 0.1  
**Status:** Phase 1 draft  
**Depends on:** [Domain Model](Domain-Model.md), [Critical Workflows](Critical-Workflows.md), [Information Architecture](Information-Architecture.md)

## 1. Purpose

These rules define the behavior that must stay consistent across the web application, future native applications, local storage, and backend services. They are product rules, not database implementation details.

## 2. Workspace and access

1. Every product record belongs to one Workspace.
2. A beta workspace has one Owner. The Owner can create, update, complete, cancel, restore, and delete its records.
3. A person cannot read, search, link, or synchronize records outside their Workspace.
4. Future team roles add permissions; they must not weaken the beta ownership rules.

## 3. Activity rules

| Rule | Behavior |
| --- | --- |
| Valid states | `Draft`, `Scheduled`, `Completed`, `Cancelled` |
| Draft | May be unscheduled and does not appear as a calendar commitment. |
| Scheduled | Has either an all-day date or a timed start/end range. |
| Completed | Has an actual completion timestamp and preserves its original schedule. |
| Cancelled | Remains in history with optional reason; it does not appear as pending work. |
| Quick capture | May create a new Activity directly as `Completed`. |
| Reopen | Moves a Completed Activity back to Scheduled only when a valid schedule exists; records an immutable history event. |
| Overlap | Warnings never block saving; field workers may deliberately overlap plans. |
| Contact association | An Activity may have zero or more Contacts, but no more than one is primary. |
| Place association | An Activity may have one primary Place. |

Every state change is appended to immutable history with actor, timestamp, previous state, and new state.

## 4. Task rules

1. Tasks use `Open`, `Completed`, and `Cancelled` states.
2. Independent Tasks may have no due date; follow-up Tasks require one.
3. A due Task appears in Today on or after its due date; undated Tasks appear in the Tasks area but not in Calendar.
4. Completing or cancelling a Task keeps it in history and preserves any Follow-up origin.
5. A Task can be related to a Contact, Organization, Place, or Activity, but it remains a distinct record from a scheduled Activity.

## 5. Follow-up rules

1. Only a Completed Activity can create a Follow-up.
2. Each Follow-up has exactly one source Activity and exactly one target: a Task **or** an Activity.
3. Creating a Follow-up carries forward the primary Contact and Place only when they exist; the user can remove or change either.
4. The source Activity always displays the target and its current state.
5. Creating the target and its Follow-up link is executed by one atomic backend transaction/command: both succeed or neither is visible.

## 6. Contact, organization, and place rules

1. A Contact requires a display name; every other field is optional at creation.
2. A Contact may belong to many Organizations and may have many Places.
3. Soft-deleting a Contact never destroys completed Activity history. Historical records retain a readable snapshot of the name where needed.
4. A Place can be saved without map coordinates. Mapping capability must not prevent planning or capture.
5. Inline creation preserves the user’s partially entered parent form.

## 7. Reminders and notifications

1. A Reminder belongs to one Activity or Task.
2. The reminder record is the source of truth; delivery may occur through the browser in beta and device-native services later.
3. Failed delivery never marks the underlying work complete or removes it from Today.
4. Users can mute or change reminder timing without changing the work record.

## 8. Deletion and restoration

1. User deletion is soft deletion in beta.
2. Deleted records leave normal lists/search immediately but remain recoverable until a retention policy is established.
3. Links to deleted records resolve safely; the app must not crash or silently reassign data.
4. Restoring a record preserves its identifier and prior history.

## 9. Offline and conflict rules

1. Core create, edit, complete, cancel, and follow-up actions save locally before confirmation.
2. Each local change creates a durable synchronization operation.
3. A user can see that a record is pending sync without leaving the workflow.
4. A retryable failure remains queued; a non-retryable failure is visible in Sync Status with recovery guidance.
5. When concurrent edits cannot be safely reconciled, the record enters `needs attention`. Neither version silently overwrites the other.
6. Completing a workflow offline must survive app/browser restart before a network returns.

## 10. Time, locale, and accessibility

1. A Workspace stores a primary timezone; Activities store unambiguous timestamps plus their intended local scheduling context.
2. All-day Activities use a date in Workspace context and must not shift date when viewed elsewhere.
3. The interface must not rely on color alone for activity status, priority, or sync health.
4. Frequent field actions must be usable by keyboard and touch, with visible focus and sufficiently large touch targets.

## 11. Rules requiring implementation tests

- An offline-created activity, note, and follow-up all survive restart and synchronize once.
- A conflicting edit becomes visible as `needs attention` and preserves both versions for resolution.
- A deleted contact does not remove historical completed activities.
- An all-day Activity remains on the intended date across timezone display changes.
- A rescheduled Activity preserves history and does not duplicate calendar entries.
- Cancelling a target Follow-up leaves its source Activity link intact.
