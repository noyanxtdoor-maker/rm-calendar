# RM Calendar — Paste This Into the Next Session

```text
Continue the RM Calendar project as the product architect and implementation partner.

Start by reading these files in this exact order:
1. docs/PROJECT-HANDOFF.md
2. docs/Scope-Decision-LDS.md
3. docs/Phase-2-UX-Spec.md
4. docs/Phase-3-Implementation-Plan.md
5. docs/Database-Schema-Plan.md
6. docs/Domain-Model.md
7. docs/Business-Rules.md
8. docs/Critical-Workflows.md
9. docs/Data-Sync-Architecture.md

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

Phase 3 technical planning is complete. Its selected direction is:
- React + TypeScript + Vite + React Router.
- Tailwind CSS 3.4.17 only, plus project-owned tokens.
- Dexie/IndexedDB local-first source of truth and durable foreground outbox.
- Static PWA app-shell cache only; do not promise closed-browser sync.
- Supabase Postgres/Auth/RLS/RPC for the future authenticated beta.
- Six-digit email OTP and custom SMTP before non-team beta invites.
- Private single-owner workspaces for functional beta.
- No attachments, imports, live maps, background location, sharing, official data, AI, or native packaging in the first functional beta.

Before writing production code, confirm whether the founder has explicitly approved the Phase 3 checklist in docs/PROJECT-HANDOFF.md. If approval is missing, present the checklist and resolve only the founder’s decisions; do not scaffold the app or provision external services.

After approval, begin Phase 4 Milestone 0 only:
1. Create a fresh React/Vite/TypeScript app in this repository—never fork the reference mockup.
2. Configure Tailwind 3.4.17, the static app-shell service worker, routes, CSS tokens, fake-data fixtures, lint/type/test commands, and CI baseline.
3. Do not create a live Supabase project, email configuration, domain, or real-user data without explicit additional authorization.
4. Validate typecheck, unit tests, production build, and a phone-width visual smoke test before moving to Milestone 1.

Workspace constraints:
- `sources/` is read-only reference material.
- Use apply_patch for local edits; preserve unrelated changes and never destructively reset/clean.
- If `.codegraph/` exists in a future code repository, use CodeGraph before grep/find for code understanding.
- Retrieve current official documentation before adding an external SDK or provider.
```
