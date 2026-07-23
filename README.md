# RM Calendar

RM Calendar is an independent, mobile-first planning companion for LDS members and returned missionaries who value the clarity of mission-era planning: people, visits, a daily plan, notes, and dependable follow-ups in one place.

It is a web-first beta designed for phone-sized use. Native Android/iOS packaging is intentionally later, after the workflow is validated and a mobile release budget is available.

## Product boundary

- It is **not** an official Church product, a replacement for Church systems, or an affiliated version of Preach My Gospel.
- It does not use official Church/member data.
- It is original software. PMG material informs workflow familiarity only; we do not copy branding, assets, source code, text, or exact screens.
- The user-owned Google AI Studio prototype is a structural and interaction reference, not a code/template baseline.
- Dayflow Calendar informs only abstract calendar interaction patterns. RM Calendar neither imports nor copies its source or visual expression.

## Current status

Phases 0-3 are complete: product discovery, domain/workflow architecture, the original clickable Mission Companion prototype, and the implementation plan. Phase 4 Milestones 0-3 are complete locally. M4 local preparation is also complete: the app has a testable sync contract, durable dependency/retry/conflict rules, and a transparent Sync Status screen. The safe local portion of M5 adds a first-use privacy acknowledgement, offline JSON export, browser-storage protection request, and explicit device erase/recovery. Cloud authentication, remote sync, account deletion, email, and deployment remain intentionally unconfigured.

Start with these source-of-truth documents:

1. [Scope decision](docs/Scope-Decision-LDS.md)
2. [Phase 2 UX specification](docs/Phase-2-UX-Spec.md)
3. [Phase 3 implementation plan](docs/Phase-3-Implementation-Plan.md)
4. [Database schema plan](docs/Database-Schema-Plan.md)
5. [Phase 4 Milestone 0 evidence](docs/Phase-4-Milestone-0.md)
6. [Phase 4 Milestone 1 evidence](docs/Phase-4-Milestone-1.md)
7. [Phase 4 Milestone 2 evidence](docs/Phase-4-Milestone-2.md)
8. [Phase 4 Milestone 3 evidence](docs/Phase-4-Milestone-3.md)
9. [Sync contract](docs/Sync-Contract.md)
10. [Phase 4 Milestone 4 preparation](docs/Phase-4-Milestone-4-Prep.md)
11. [Phase 4 Milestone 5 local privacy preparation](docs/Phase-4-Milestone-5-Prep.md)
12. [Complete project handoff](docs/PROJECT-HANDOFF.md)

The active clickable artifact is [Mission Companion Prototype](design/RM%20Calendar%20%E2%80%94%20Mission%20Companion%20Prototype.html).

## Technical direction

- React, TypeScript, Vite, React Router, and Tailwind CSS **3.4.17**.
- A production PWA static app shell; it deliberately does not cache private API data or promise closed-browser sync.
- Dexie/IndexedDB as the current local-first source of truth; an unprovisioned foreground-sync coordinator and transport contract are locally tested but cannot transmit data until an approved remote adapter exists.
- Supabase Postgres/Auth/RLS/RPC only for the future authenticated beta, after the approved local-first workflow exists.
- Private single-owner workspaces in the first functional beta; no sharing, attachments, contact import, live maps, or background location.

## Run the application

    npm ci
    npm run dev

Use npm run verify for typecheck, lint, unit tests, and a production build. npm run test:e2e additionally tests the production PWA at phone width, offline persistence, the privacy-safe local Sync Status screen, and the local export/erase flow.

## References

- Public project repository: <https://github.com/noyanxtdoor-maker/rm-calendar>
- User-owned mockup reference: <https://github.com/noyanxtdoor-maker/Calendar>
- Calendar interaction reference: <https://github.com/dayflow-js/calendar> (ideas only; no code or visual copying)
- Local PMG reference material (read-only; available only on the founder’s machine): C:\Users\sherl\Downloads\Preach My Gospel Reference

## Workspace rule

Everything under sources/ is synced reference material and must remain read-only.
