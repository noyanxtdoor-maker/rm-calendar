# RM Calendar - Paste This Into the Next Session

Continue the RM Calendar project as the product architect and implementation partner.

Start by reading these files in this exact order:

1. docs/PROJECT-HANDOFF.md
2. docs/Scope-Decision-LDS.md
3. docs/Phase-2-UX-Spec.md
4. docs/Phase-3-Implementation-Plan.md
5. docs/Database-Schema-Plan.md
6. docs/Phase-4-Milestone-0.md
7. docs/Phase-4-Milestone-1.md
8. docs/Phase-4-Milestone-2.md
9. docs/Phase-4-Milestone-3.md
10. docs/Sync-Contract.md
11. docs/Phase-4-Milestone-4-Prep.md
12. docs/Phase-4-Milestone-5-Prep.md
13. docs/Domain-Model.md
14. docs/Business-Rules.md
15. docs/Critical-Workflows.md
16. docs/Data-Sync-Architecture.md

If local files are unavailable, use the public project repository:
https://github.com/noyanxtdoor-maker/rm-calendar

Project scope is settled:

- Product name: RM Calendar.
- Audience: LDS members and returned missionaries who remember the planning rhythm from missionary service.
- Product: an independent, web-first, mobile-first planning companion for people/households, visits, activities, places, notes, tasks, and follow-ups.
- Positioning: familiar planning rhythm, but not an official Church app, not a PMG clone, and not a replacement for official Church systems.
- Never claim Church affiliation or access to official Church/member data.
- Never copy PMG branding, assets, source code, colors, text, icons, exact layouts, or screens.

Reference material:

- Founder-owned Google AI Studio mockup: https://github.com/noyanxtdoor-maker/Calendar
- Dayflow Calendar: https://github.com/dayflow-js/calendar
- Local workflow/design material, if available: C:\Users\sherl\Downloads\Preach My Gospel Reference

Use all reference material only for abstract workflow and interaction quality. Do not fork, copy, transplant, or imitate its exact visual expression. Dayflow is an MIT calendar component library, but RM Calendar currently has no dependency on it and maintains its own domain-driven calendar UI.

The approved clickable experience is:
design/RM Calendar — Mission Companion Prototype.html

It establishes the original mobile-first structure:

Home → Calendar → People → Map → Tools

with a side drawer, quick add, person context, and the core completed-activity → outcome → linked follow-up/task flow.

Completed implementation:

- M0: React + TypeScript + Vite + React Router, Tailwind 3.4.17, static PWA app shell, original mobile route shell, testing and CI baseline.
- M1: Dexie versioned local schema/migration, fictional private on-device workspace, local settings, data-driven Home/Calendar/People/Map/Tools screens, local data controls, privacy/disclaimer surfaces, and persistence verification.
- M1 test proof: a fictional local person is created, the production PWA reloads while offline, and the same person remains visible.
- M2: validated local Person/Household/Place commands, original forms, People context/history, Calendar Activity create/edit/reschedule, durable form drafts, non-blocking overlap warning, and durable local outbox-operation intents.
- M2 test proof: the production PWA creates a person, plans a linked visit, reloads while offline, and retains the linked visit at phone width.
- M3: Activity and Task lifecycle/history, completion/outcome capture, correction/reopen, Quick Capture, Activity-private Notes, local Tasks, atomic local Follow-up creation, derived Today and Weekly Review.
- M3 test proof: the production PWA completes a visit, creates its linked follow-up Task, reloads while offline, and retains that next action at phone width. The unit suite proves no partial follow-up is created from an incomplete source.
- M4 local preparation: typed sync operation contract, durable dependency/base-revision behavior, canonical payload builder, retry/conflict coordinator, and a privacy-safe Sync Status screen. No network adapter or account flow exists.
- M4-prep test proof: 15 unit tests cover ordered dispatch, idempotent acknowledgement, retries, conflicts, follow-up source revision, and safe diagnostics; 4 phone-width browser flows include Sync Status privacy behavior.
- M5 local privacy/recovery preparation: versioned first-use privacy acknowledgement, offline private JSON export, accurate browser-storage persistence request, explicit checkbox-gated device erase, and accessible local recovery state. It does not provide accounts, remote deletion, or deployment.
- M5-prep test proof: 22 unit tests and 5 phone-width browser flows, including offline export plus explicit erase confirmation and post-erase recovery.
- No live user data, Supabase client/project, authentication, email, remote sync, live maps, sharing, or official-data integration exists.

Do not redo M0-M3, M4 local preparation, or M5 local privacy/recovery preparation. The remaining M4 authenticated-sync work may not start until the founder explicitly authorizes external services. Until then, only local-only usability, accessibility, documentation, or founder-approved prototype refinement is permitted.

Before M4 begins, obtain explicit founder authorization for:

1. creating/using the named Supabase project and hosting environment;
2. configuring the email/OTP provider, sender, and redirect policy;
3. storing beta data outside the browser;
4. a production domain and invite process.

Do not create a hosted Supabase project, configure email, use a real domain, invite users, or add credentials without that authorization. Preserve the local-first command boundary and keep no sensitive content in diagnostics.

Workspace constraints:

- sources/ is read-only reference material.
- Use apply_patch for local edits; preserve unrelated changes and never destructively reset/clean.
- If .codegraph/ exists in a future code repository, use CodeGraph before grep/find for code understanding.
- Retrieve current official documentation before adding an external SDK or provider.
