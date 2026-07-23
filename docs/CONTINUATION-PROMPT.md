# RM Calendar — Paste This Into the Next Session

```text
Continue the RM Calendar project as the product architect and implementation partner.

Start by reading these files in this exact order:
1. docs/PROJECT-HANDOFF.md
2. docs/Scope-Decision-LDS.md
3. docs/Phase-2-UX-Spec.md
4. docs/Phase-3-Implementation-Plan.md
5. docs/Database-Schema-Plan.md
6. docs/Phase-4-Milestone-0.md
7. docs/Domain-Model.md
8. docs/Business-Rules.md
9. docs/Critical-Workflows.md
10. docs/Data-Sync-Architecture.md

If local files are unavailable, use the public project repository:
https://github.com/noyanxtdoor-maker/rm-calendar

Project scope is settled:
- Product name: RM Calendar.
- Audience: LDS members and returned missionaries who remember the planning rhythm from missionary service.
- Product: an independent, web-first, mobile-first planning companion for people/households, visits, activities, places, notes, tasks, and follow-ups.
- Positioning: familiar planning rhythm, but NOT an official Church app, NOT a PMG clone, and NOT a replacement for official Church systems.
- No claim of Church affiliation or access to official Church/member data.
- Never copy PMG branding, assets, source code, colors, text, icons, exact layouts, or screens.

Reference material:
- Founder-owned Google AI Studio mockup: https://github.com/noyanxtdoor-maker/Calendar
- Local workflow/design material, if available: C:\Users\sherl\Downloads\Preach My Gospel Reference
- Use both for abstract workflow and quality inspiration only. Do not fork or copy them.

The approved clickable experience is:
design/RM Calendar — Mission Companion Prototype.html

It establishes the original mobile-first structure:
Home → Calendar → People → Map → Tools
with a side drawer, quick add, person context, and the core completed-activity → outcome → linked follow-up/task flow.

Phase 3 is founder-approved. Phase 4 Milestone 0 is complete and verified:
- Fresh React + TypeScript + Vite + React Router app at the repository root.
- Tailwind CSS 3.4.17 only, plus original project-owned tokens.
- Static PWA app-shell cache only; no API/data cache or closed-browser sync promise.
- Original mobile route shell and fictional preview fixtures only.
- `npm ci`, `npm run verify`, and `npm run test:e2e` all pass.
- The Playwright mobile test verifies phone-width layout and offline reopening of the production app shell after first load.
- No Dexie schema, user data, authentication, Supabase client/project, email, or remote service exists yet.

Do not redo Milestone 0 and do not add live services. The next permitted implementation slice is Phase 4 Milestone 1 only:
1. Add Dexie and the local schema/migration layer according to the approved domain/database plans.
2. Create a fictional private local workspace and local settings; use no real user data.
3. Bind the original app shell to local data rather than hard-coded screen state.
4. Add privacy/disclaimer surfaces and local data-clearing behavior appropriate to this stage.
5. Prove a newly created local record survives a browser reload, with typecheck, lint, unit tests, production build, and a phone-width Playwright check.
6. Do not begin People/Calendar creation workflows (Milestone 2), Supabase, email, maps, sharing, or real beta data until M1 is complete and the founder directs the next slice.

Workspace constraints:
- `sources/` is read-only reference material.
- Use apply_patch for local edits; preserve unrelated changes and never destructively reset/clean.
- If `.codegraph/` exists in a future code repository, use CodeGraph before grep/find for code understanding.
- Retrieve current official documentation before adding an external SDK or provider.
```
