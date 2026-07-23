# RM Calendar — Complete Project Handoff

**Last updated:** 2026-07-23  
**Repository:** <https://github.com/noyanxtdoor-maker/rm-calendar>  
**Product owner:** Founder / user  
**Current status:** Phase 3 technical planning is complete and fresh-reader validated. Production implementation must wait for founder approval of the Phase 3 checklist.

## 1. Read this first

RM Calendar is an **independent, web-first, mobile-first planning companion for LDS members and returned missionaries**. It helps a person organize people/households, visits, activities, places, notes, tasks, and follow-ups with a familiar mission-planning rhythm.

It is **not**:

- an official Church product, affiliated product, or replacement for official Church systems;
- a source of official Church/member data;
- a PMG clone or pixel-for-pixel remake;
- a generic calendar with disconnected contacts and tasks;
- a shared ward, missionary, supervisor, or organization-management system in the first beta.

The intended feeling is: *“I remember how to use this immediately.”* That familiarity comes from the job flow and planning clarity—not copied PMG visuals, words, branding, assets, source code, colors, or exact screen layouts.

## 2. Source-of-truth order

When documents disagree, use this order:

1. [Scope Decision — LDS](Scope-Decision-LDS.md) — canonical product scope and legal/design boundary.
2. [Phase 2 UX Specification](Phase-2-UX-Spec.md) — authoritative experience, navigation, and workflow behavior.
3. [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md) — selected stack, component/state model, privacy gates, and build milestones.
4. [Database Schema Plan](Database-Schema-Plan.md) — table, RLS, RPC, history, and sync contract blueprint.
5. [Domain Model](Domain-Model.md), [Business Rules](Business-Rules.md), [Critical Workflows](Critical-Workflows.md), and [Data & Sync Architecture](Data-Sync-Architecture.md) — canonical domain invariants and acceptance behavior.
6. [Product Bible](Product-Bible.md), [Phase 0 Discovery](Phase-0-Discovery.md), and [Information Architecture](Information-Architecture.md) — useful historical foundation, subject to the current scope above.

Older documents can contain earlier “general field-work” language. The current LDS/RM scope above supersedes it.

## 3. Founder decisions already made

| Topic | Decision |
| --- | --- |
| Product name | **RM Calendar** |
| Primary audience | LDS members and returned missionaries with first-hand familiarity with mission planning |
| Product position | Independent planning companion; familiar rhythm, original execution |
| First platform | Web beta, designed from the outset for phone-width/mobile use |
| Native applications | Later, after workflow validation and budget for Android/Google Play and native development |
| Repository | Public GitHub repository: `noyanxtdoor-maker/rm-calendar` |
| Privacy model for beta | Private, single-owner workspace; no shared groups or roles yet |
| Reference repository | Founder-owned Google AI Studio mockup may inform structure and interaction quality, not be copied as a codebase/template |
| PMG reference | Local screenshots/recordings may inform workflow and nostalgia only; never copy proprietary expression |
| Design direction | Original dark “Mission Companion” workbench: calm, dense, mobile-first, and field-ready |
| Initial feature focus | People + plan + calendar + outcome + follow-up + task + local reliability |
| Explicit deferrals | Live maps, route optimization, background location, attachments, imports, sharing, official-data integrations, AI, and native packaging |

## 4. Reference materials and use boundaries

### Founder-owned mockup

- Repository: <https://github.com/noyanxtdoor-maker/Calendar>
- Its useful patterns: fixed phone app shell; Home → Calendar → People → Map → Tools flow; compact date ribbon; dense timeline; drawer for secondary tools; person context; contextual quick creation.
- Do **not** fork it, transplant its source files, use its Tailwind 4 setup, or transfer its exact visual expression. RM Calendar is locked to Tailwind **3.4.17**.

### Local PMG/BetterCalendar material

- Folder: `C:\Users\sherl\Downloads\Preach My Gospel Reference`
- Treat it as read-only source material on the founder’s local machine.
- Retain only abstract workflow lessons: daily planning density, clear next action, people context, history, follow-up discipline, fast field interaction, and a calm command-center feel.
- Never reproduce PMG’s name, logo, colors, copy, icons, assets, proprietary screen design, source code, or official data workflow.

## 5. Completed phases and artifacts

### Phase 0 — Discovery and product foundation: complete

The project captured vision, target users, jobs to be done, terminology, core loop, risks, and product boundaries. The original broader field-work direction is retained as historical context only; the LDS/RM scope supersedes it.

### Phase 1 — Domain and workflow architecture: complete

The domain model, business rules, critical flows, information architecture, and local-first sync principles are documented. Important decisions include:

- Activity lifecycle: `Draft` → `Scheduled` → `Completed` or `Cancelled`.
- Task lifecycle: `Open` → `Completed` or `Cancelled`.
- An Activity may link several Contacts but has at most one primary Contact and one primary Place.
- A Follow-up is a **separate link**, created from a completed Activity, that targets exactly one newly created Task or Activity.
- A follow-up target and its source link must be created atomically, locally and remotely.
- Every Activity and Task lifecycle change has immutable history.
- Updates are workspace-scoped, versioned, conflict-aware, and never silently resolved with last-write-wins.

### Phase 2 — UX/UI specification and clickable prototype: complete

The active original clickable prototype is:

- [Mission Companion Prototype](../design/RM%20Calendar%20%E2%80%94%20Mission%20Companion%20Prototype.html)

Its principal destinations are:

```text
Home → Calendar → People → Map → Tools
           ↘ Quick Add / person context / outcome → linked follow-up
```

The prototype establishes:

- a dark navy/charcoal operational surface with original teal, gold, and violet semantic accents;
- a compact date ribbon and dense day-planning timeline;
- bottom navigation for the five primary destinations and a drawer for secondary tools;
- an obvious quick-add path;
- person/household context linked to notes, history, activities, and next steps;
- the critical completed activity → outcome → task/follow-up/no-follow-up loop;
- a clear independent-product/non-affiliation disclaimer.

Phase 2 validation passed embedded-JavaScript syntax checks, structural interaction checks, and a fresh-reader review. The detailed specification is [Phase-2-UX-Spec.md](Phase-2-UX-Spec.md).

### Phase 3 — Technical implementation planning: complete; founder approval pending

The implementation-ready plans are:

- [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md)
- [Database Schema Plan](Database-Schema-Plan.md)

They turn the approved UX/domain material into a concrete web beta architecture, component inventory, persistence model, sync contract, privacy guardrails, and milestones. Do not begin production implementation until the founder approves the checklist in Section 11 of this handoff.

## 6. Approved Phase 3 technical direction

### Client and user experience

- **React + TypeScript + Vite** single-page application.
- **React Router** with route-backed sheets/details, so browser Back and deep links remain reliable.
- **Tailwind CSS 3.4.17** plus project-owned CSS design tokens. Never introduce Tailwind 4.
- **`vite-plugin-pwa`** with a generated Workbox service worker for static app-shell availability after the first successful visit.
- App-shell caching contains only versioned static UI assets/navigation fallback. It must not cache authenticated API responses, notes/outcomes, sessions, or sync work.
- The mobile-first Mission Companion shell remains the design starting point. It is not a desktop-first CRUD dashboard.

### Local-first data model

- **Dexie + IndexedDB + `dexie-react-hooks`** is the browser’s source of truth for domain data and queries.
- React components do not write directly to a remote API. They invoke domain commands.
- A command validates input, writes records/history/outbox entries in one Dexie transaction, then returns local success.
- Domain data must survive a browser reload and continue to work without connectivity.
- `navigator.storage.persist()` can be requested after meaningful user data exists, but storage persistence is never promised as a security or durability guarantee.
- The foreground app may sync when signed in, resumed, online, manually retried, or open on a conservative interval. It does **not** promise to sync while the browser/app is closed.

### Remote beta architecture

- **Supabase** is planned for hosted beta only: Postgres, Auth, Row Level Security, migrations, and database RPC/functions.
- Authentication choice: **six-digit email OTP**. Custom SMTP and an approved sender domain are mandatory before inviting non-team users.
- The browser uses only a publishable client key plus the authenticated session. Never expose service-role credentials.
- Each beta workspace is private and has one owner. The owner workspace/membership relationship is constrained so exactly one owner membership matches `workspaces.owner_user_id`; every workspace-scoped domain row is protected by RLS.
- Domain mutations use explicit authenticated RPC operations—not unrestricted browser-side table writes and not a hidden last-write-wins sync library.

### Sync and conflict contract

- Device-generated `crypto.randomUUID()` IDs and durable immutable operation IDs.
- Local outbox persists `kind`, payload, expected/base revision, dependencies, attempts, and error state.
- `pull_changes(workspace_id, after_cursor, page_size)` supplies ordered remote changes.
- `apply_sync_batch(workspace_id, operations[])` validates each operation, uses receipt-based idempotency, and returns the previous result for retrying the same operation ID.
- Stale edits become visible `needs_attention` conflicts; they are never silently overwritten.
- A remote tombstone is not silently undone by an offline edit.
- Restoring a deleted record is an explicit, revision-checked operation; it never quietly restores separately deleted related records.
- `create_follow_up` is one compound operation: target + source link + history + change log + receipt, all committed or none committed.

### Domain records planned for the functional beta

```text
Identity/workspace: profiles, workspaces, workspace_memberships
People/context: contacts, organizations/households, contact_organizations,
                places, contact_places
Work: activities, activity_contacts, activity_history,
      tasks, task_history, follow_ups, notes, reminders
Organization: tags, tag_assignments
Local-only reliability: drafts, outbox_operations, sync_metadata,
                        conflicts, local_settings
Remote sync support: change_log, mutation_receipts
```

All workspace-scoped synchronizable records use ID, workspace ID, timestamps including `client_updated_at`, revision, soft-delete marker, and local sync state. `activity_history` and `task_history` are append-only and store lifecycle/schedule metadata, never note or outcome body text. Terminal Activities capture immutable linked Contact-name snapshots so completed history stays readable after a Contact is deleted/purged. See [Database-Schema-Plan.md](Database-Schema-Plan.md) for the exact constraints and indexing plan.

## 7. Privacy, security, and scope gates

Before real beta data or non-team beta invites:

1. Deploy over HTTPS with approved production redirect URLs.
2. Implement and test RLS workspace isolation in migrations.
3. Configure custom SMTP, sender domain, rate controls, and the final email OTP flow.
4. Present onboarding consent plus independent/non-affiliation language.
5. Add export and account-delete request behavior.
6. If the outbox contains unsynced work, sign-out must offer **Sync now** or **Remove local data and sign out**—never silently discard it.
7. Clear the active workspace’s local IndexedDB and in-memory state after an intentional completed sign-out.
8. Keep diagnostics to operation ID, record type/ID, and error codes; never log note/outcome/body text.
9. Use fictional/consented data only in development, tests, screenshots, and demos.

The proposed 30-day remote tombstone window is an engineering safety mechanism for stale offline devices, not an approved public privacy policy. Founder approval is needed for final retention, export, deletion, hosting, and jurisdictional wording.

## 8. What Phase 4 implementation will build, in order

Implementation begins only after the founder accepts the Phase 3 decisions. Build vertical slices, not a large set of disconnected screens.

| Milestone | Deliverable | Exit evidence |
| --- | --- | --- |
| M0 — Scaffold/guardrails | React/Vite/TS shell, Tailwind 3.4.17, static app shell, routes, tokens, fixtures, lint/type/test/CI baseline | Typecheck, unit tests, production build, phone-width smoke check pass |
| M1 — Local workspace/shell | Dexie schema/migrations, fake private workspace, settings, original app shell, privacy/disclaimer surfaces | New local records survive browser reload; no hard-coded view state masquerades as data |
| M2 — People/places/planning | People/households, places, Calendar day view/date ribbon, create/edit/reschedule Activity, drafts | User creates a person, plans a linked activity, reloads, and sees the local linked data |
| M3 — Completion/follow-up | Activity/Task history, outcome capture, notes, tasks, atomic linked follow-up, Today derivation | Complete/capture/follow-up works offline after restart; no orphan follow-up exists |
| M4 — Auth/sync | Supabase migrations/RLS/RPC tests, owner workspace, outbox processor, pull/apply, conflict view | Two signed-in browser profiles sync exactly once; intentional conflict is visible with no data loss |
| M5 — Beta readiness | Export/delete flows, sign-out safety, storage-persistence request, deployment/auth config, manual beta script | Privacy/recovery checklist passes using fictional data; no public invite before final approval |

Deferred until the beta loop is actually validated: live map tiles, routing, turn-by-turn navigation, background location, attachments/photos, contact imports, shared workspaces/roles, official-data integrations, AI, push claims while closed, and native Android/iOS packaging.

## 9. Testing and acceptance model

The production build must demonstrate more than prototype clicks:

- **Domain tests:** Activity/Task transitions, time rules, deletion rules, and Follow-up invariants.
- **Dexie/local persistence tests:** atomic rollback, reload survival, drafts, outbox, and offline work.
- **Sync contract tests:** operation receipt idempotency, cursors, tombstones, stale revision conflicts.
- **Database tests:** Supabase migrations, RLS owner isolation, and atomic remote follow-up creation.
- **Browser-flow tests:** plan offline → reload → complete/capture/follow-up → reconnect → resolve a conflict.
- **Accessibility review:** keyboard/focus, 44px targets, contrast, and no color-only meanings.
- **Privacy review:** absence of note/outcome text in diagnostics and absence of cross-workspace results.

## 10. Publishing and workspace facts

- The public project repository exists at <https://github.com/noyanxtdoor-maker/rm-calendar>.
- The Phase 0–2 documents and active prototype were published previously; the Phase 3 implementation plan, database schema plan, updated handoff, and continuation prompt are now published too.
- The local workspace is `C:\Users\sherl\.codex\.chatgpt-projects\g-p-6a6174fb5d708191b1d0fc511a31f967`.
- `sources/` is synced, read-only project reference material. Do not edit, move, rename, or delete anything under it.
- Use `apply_patch` for project edits. Preserve unrelated changes and never reset/clean destructively.
- If a future code repository has `.codegraph/`, use CodeGraph before grep/find when locating or understanding source code.
- GitHub publication in the prior session used the authenticated local GitHub CLI. A new account/session must authenticate separately and must not assume inherited access.

## 11. Immediate next action: founder approval, then Phase 4

Before M0 begins, the founder needs to approve or amend these choices:

- [ ] Fresh React/Vite/TypeScript scaffold, not a fork of either reference.
- [ ] Tailwind CSS locked to 3.4.17.
- [ ] Mobile-first original Mission Companion design system.
- [ ] Dexie/IndexedDB as local-first source of truth and custom foreground outbox sync.
- [ ] PWA static app-shell cache only; no closed-browser sync promise.
- [ ] Supabase Auth/Postgres/RLS/RPC remote architecture.
- [ ] Six-digit email OTP and custom SMTP before non-team invites.
- [ ] Private single-owner workspace for the first beta; no sharing.
- [ ] No live maps, attachments, imports, background location, AI, or official data in the first functional beta.
- [ ] Proposed 30-day tombstone engineering window, subject to final privacy/retention policy.

After the checklist is approved, begin M0 only. Do not provision a hosted Supabase project, email service, production domain, or invite real users without separate founder authorization.

## 12. Continuation instructions for another account/session

1. Read the source-of-truth documents in Section 2 in order.
2. Open the active Mission Companion prototype before changing UI behavior.
3. Preserve the LDS/RM scope and independent-original boundary; do not reopen audience discovery unless the founder explicitly changes scope.
4. Confirm Phase 3 approval before production code. If approval has not been given, discuss/adjust the approval checklist rather than scaffolding code.
5. After approval, execute M0, validate it, and report evidence before moving to M1.
6. Keep the public repository and local handoff synchronized only after local validation succeeds.

For a ready-to-paste starting instruction, use [CONTINUATION-PROMPT.md](CONTINUATION-PROMPT.md).
