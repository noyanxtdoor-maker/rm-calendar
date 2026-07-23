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
8. docs/Domain-Model.md
9. docs/Business-Rules.md
10. docs/Critical-Workflows.md
11. docs/Data-Sync-Architecture.md

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
- No live user data, Supabase client/project, authentication, email, remote sync, live maps, sharing, or official-data integration exists.

Do not redo M0 or M1. The next permitted implementation slice is Phase 4 Milestone 2:

1. Add validated local Contact/Household and Place commands with original forms.
2. Add reusable local queries, People detail/context/history, and search/group presentation.
3. Add Calendar Activity create, edit, and reschedule flows with linked person/place context.
4. Add durable local drafts and a non-blocking overlap warning.
5. Prove a user can create a person, plan a linked activity, reload offline, and see the same linked data.
6. Run typecheck, lint, unit tests, production build, and a phone-width Playwright flow before publishing.

Do not start M3 completion/follow-up workflows until M2 is complete. Do not create a hosted Supabase project, configure email, use a real domain, invite users, or add credentials without explicit founder authorization. Preserve the local-first command boundary and keep no sensitive content in diagnostics.

Workspace constraints:

- sources/ is read-only reference material.
- Use apply_patch for local edits; preserve unrelated changes and never destructively reset/clean.
- If .codegraph/ exists in a future code repository, use CodeGraph before grep/find for code understanding.
- Retrieve current official documentation before adding an external SDK or provider.
