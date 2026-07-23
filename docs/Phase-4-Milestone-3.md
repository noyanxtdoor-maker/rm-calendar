# RM Calendar - Phase 4, Milestone 3: Completion, Outcome, Tasks, and Follow-up

**Status:** Complete  
**Completed:** 2026-07-23  
**Depends on:** [Phase 4 Milestone 2](Phase-4-Milestone-2.md), [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md), [Database Schema Plan](Database-Schema-Plan.md), [Business Rules](Business-Rules.md), and [Critical Workflows](Critical-Workflows.md)

## 1. Outcome

Milestone 3 completes the local end-to-end planning loop:

~~~text
person and planned visit
  -> record what actually happened
  -> optional concise outcome/private note
  -> one linked next action
  -> review the current week
~~~

It remains a local-first, fictional-data-safe web beta. A person can complete a planned visit, capture an unplanned one, create a task or future visit as a follow-up, and reopen a mistaken completion without losing the original planned schedule.

## 2. Delivered local lifecycle rules

- completeActivity changes only a scheduled or draft Activity to completed.
  - Its planned date/time fields remain unchanged.
  - The command adds a separate actualCompletedAt instant and optional concise outcome.
  - It writes append-only Activity history and a local outbox intent in the same Dexie transaction.
- reopenActivity returns only a completed Activity that still has a valid schedule to scheduled.
  - It clears actualCompletedAt.
  - It preserves the original planned schedule and records reopened history.
- quickCaptureActivity records an unplanned completed Activity immediately, with optional Person context and concise outcome.
- createTask and completeTask provide local Task lifecycle/history and durable outbox intent records.
- createNote requires exactly one local parent record. The delivered UI uses Activity-private notes.
- createFollowUp is one local compound transaction:
  1. validate that the source Activity is completed and belongs to this private workspace;
  2. create exactly one target Task or scheduled Activity;
  3. create exactly one Follow-up link to that target;
  4. append source/target history as appropriate; and
  5. enqueue one local follow-up operation.

If the source is not completed, the command rejects before creating a Task, Activity, or Follow-up. Person and Place context carry forward unless the user explicitly clears it.

## 3. Delivered experience

- Activity detail now distinguishes planned intent from recorded outcome.
  - Planned/draft items can be completed or edited.
  - Completed items show their outcome, completion time, linked follow-ups, and a correction/reopen action.
- Completion screen with outcome capture and an optional direct path into Follow-up creation.
- Quick Capture screen for unplanned visits; planning first is never required.
- Follow-up form that creates either a Task or a future scheduled visit, retains source context, and returns to the completed source activity.
- Local private-note entry and activity-note history.
- Tools now presents local Next actions, task completion, Quick Capture, task creation, data controls, and the existing privacy boundary.
- Today derives planned people, today items, and open next actions from real local records.
- Weekly Review is a read-only local summary of planned/completed visits and tasks. It is explicitly personal reflection, not official Church reporting.

The UI is original RM Calendar work. The permitted references informed only high-level behavior: fast daily planning, clear person context, visible next action, and a mobile-first command-center rhythm. No reference code, branding, proprietary copy, assets, colors, or exact screen designs were copied.

## 4. Offline and privacy boundary

- Every delivered mutation succeeds locally before its UI confirms success.
- Data lives in IndexedDB and survives browser reload in the same browser profile.
- The PWA caches only static application assets. It does not cache private records, remote API data, sessions, or sync payloads.
- This milestone adds no sign-in, remote transport, Supabase client/project, email, map, device location, official Church-system connection, import, attachment, sharing, notification, or native-app behavior.
- Development records, test labels, and screenshots use fictional data only.
- The product remains independent and must not be used for official Church records or confidential information.

## 5. Verification evidence

The local unit suite now proves:

1. planned schedule data survives completion and re-open, while actual completion is tracked separately;
2. a completed source Activity creates a linked Follow-up Task that carries Person/Place context;
3. an incomplete source cannot leave behind a partial Task or Follow-up;
4. quick-captured Activities, Tasks, Task history, and Activity-private Notes persist locally;
5. all prior M1/M2 persistence, planning, draft, and overlap evidence remains green.

Commands run successfully:

~~~text
npm run verify
  typecheck: pass
  lint: pass
  Vitest: 10 passed
  production Vite build: pass
  PWA service worker and manifest: emitted

npm run test:e2e
  Playwright Chromium mobile: 3 passed
  M1 local workspace survives offline reload
  M2 person -> linked planned visit survives offline reload
  M3 complete visit -> create linked follow-up task survives offline reload
  no horizontal overflow is observed at phone width
~~~

The inspected phone-width screenshot shows a readable, touch-friendly Next actions view with Quick Capture, task creation, local task completion, data controls, and the independent-product disclaimer.

## 6. Deliberate non-deliveries

Milestone 3 does **not** add:

- cancellation, deletion, task editing, recurring planning, reminder delivery, or a full reporting system;
- private note sync or end-to-end encrypted storage claims;
- remote outbox processing, authentication, Supabase, RLS, server RPC, device-to-device sync, or conflict-resolution UI;
- live maps/routes/background location, attachments, imports, sharing, official-data integration, AI, push notifications, or native packaging.

## 7. Next gate

The next planned milestone is **Phase 4, Milestone 4 - authenticated sync**. Its architecture is documented but it is intentionally not started.

Before any M4 implementation that provisions or configures an external service, the founder must explicitly authorize:

1. creating/using a Supabase project and deployment environment;
2. the chosen authentication and email provider configuration;
3. storage of beta data outside the browser;
4. a production domain/redirect policy and invite process.

Until that authority exists, continued work should remain local-only: usability polish, accessibility review, optional local-only features, or a separate founder-approved prototype refinement.
