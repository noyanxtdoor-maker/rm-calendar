# RM Calendar — Phase 4, Milestone 5: Local Privacy and Recovery Preparation

**Status:** Local-only preparation complete; authenticated beta-readiness work remains gated  
**Completed:** 2026-07-24  
**Depends on:** [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md), [Phase 4 Milestone 4 Prep](Phase-4-Milestone-4-Prep.md), and [Sync Contract](Sync-Contract.md)

## 1. Outcome

This is the safe local portion of Milestone 5. It improves privacy, recovery, and accessibility without creating an account, storing data outside the browser, or representing a local copy as a cloud backup.

The completed local flow is:

~~~text
first local workspace
  -> privacy boundary acknowledgement
  -> normal local planning
  -> private JSON export (works offline)
  -> optional browser persistence request
  -> explicit checkbox acknowledgement before browser erase
~~~

## 2. Delivered local controls

### Privacy acknowledgement

- A first-use screen explains that the current workspace is browser-local, cloud sync is not configured, and official Church records/confidential information must not be entered.
- It states the independent/non-affiliation boundary before planning begins.
- The acknowledgement is local-only and versioned. It is not framed as legal consent or Church authorization.
- Erasing local data also erases the acknowledgement, so a newly created local workspace sees the boundary again.

### Export

- **Data controls** creates a downloadable, user-owned JSON snapshot while offline or online.
- It contains workspace planning records, linked context, histories, notes, outcomes, tasks, follow-ups, tags, reminders, and unfinished local drafts.
- It deliberately excludes the local outbox, sync metadata, conflicts, and browser settings. Those are device-specific state; exporting/importing them later could duplicate work or expose stale diagnostics.
- The filename contains only the product and export date, never the workspace or person name.
- The interface clearly warns that the file may contain sensitive planning details and should be stored privately.

### Browser-storage protection

- The app can inspect `navigator.storage` and, where supported, ask the browser to protect IndexedDB from routine eviction.
- The status is deliberately modest: a grant is not presented as encryption, remote backup, or a guarantee against device/browser clearing.
- Unsupported, denied, and failed requests are visible without blocking local planning or export.

### Explicit device erase and recovery

- Clearing data requires a labelled checkbox acknowledgement; the destructive action is disabled until it is checked.
- The clear transaction removes all RM Calendar records, drafts, outbox operations, sync metadata, conflicts, and the local privacy acknowledgement.
- It retains only the `cleared` lifecycle marker so the app never silently recreates a workspace after erase.
- The next screen confirms that local data was cleared and offers to create **fictional** starter data only.
- Bootstrap failures are announced as alerts and recovery actions remain keyboard-reachable. The new controls use semantic buttons, labels, native checkboxes, visible focus styles, and touch-sized targets.

## 3. Verification evidence

Successful local commands:

~~~text
npm run typecheck
  pass
npm run lint
  pass
npm run test:unit
  22 passed
npm run test:e2e
  production build: pass
  Playwright Chromium mobile: 5 passed
~~~

The added unit coverage proves that:

1. an export includes the requesting workspace’s planning records and excludes other-workspace data;
2. it intentionally excludes queue, conflict, and sync-metadata state;
3. a missing workspace fails safely rather than emitting a misleading export;
4. browser persistence unsupported, granted, and failed cases are accurately represented;
5. a local erase removes domain/outbox data and the acknowledgement without silently recreating a workspace.

The production-PWA mobile flow proves that a user can:

1. acknowledge the local privacy boundary;
2. create a fictional person;
3. open Data controls at phone width with no horizontal overflow;
4. download a dated local export while the browser is offline; and
5. clear the browser only after an explicit acknowledgement, then see **Local data cleared**.

All test data remains fictional.

## 4. What this does not do

This is **not** the completed M5 beta-readiness milestone. It does not:

- create a cloud backup, account, remote export, remote deletion request, or import workflow;
- provide sign-out, account deletion, or local clear-on-sign-out, because authentication does not exist yet;
- configure Supabase, email/OTP, a sender, a domain, hosting, HTTPS deployment, invitations, or a beta support process;
- establish a final legal privacy policy, retention policy, or jurisdictional language;
- claim that persistent browser storage is encryption or durable backup.

M4 authenticated sync is still the prerequisite for those account- and remote-data responsibilities.

## 5. Remaining sequence

Without external authorization, only further local usability, accessibility, and founder-approved product refinement may continue.

With explicit authority for a named Supabase environment, remote beta-data storage, OTP email/redirect policy, and domain/invite process:

1. finish M4 migrations, RLS tests, authenticated owner workspace, and real pull/apply adapter;
2. verify two signed-in profiles, idempotency, and visible conflict recovery with fictional data;
3. finish M5 account-aware sign-out/delete, production email/hosting configuration, accessibility audit, and manual beta script;
4. obtain founder approval of final policy and beta process before inviting anyone.
