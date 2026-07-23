# RM Calendar

RM Calendar is an independent, mobile-first planning companion for LDS members and returned missionaries who value the clarity of mission-era planning: people, visits, a daily plan, notes, and dependable follow-ups in one place.

It is a web-first beta designed for phone-sized use. Native Android/iOS packaging is intentionally later, after the workflow is validated and a mobile release budget is available.

## Product boundary

- It is **not** an official Church product, a replacement for Church systems, or an affiliated version of *Preach My Gospel*.
- It does not use official Church/member data.
- It is original software. PMG material informs workflow familiarity only; we do not copy branding, assets, source code, text, or exact screens.
- The user-owned Google AI Studio prototype is a structural and interaction reference, not a code/template baseline.

## Current status

Phases 0–2 are complete: product discovery, domain/workflow architecture, and the original clickable Mission Companion prototype. Phase 3 technical planning is complete and awaits founder approval before production implementation begins.

Start with these source-of-truth documents:

1. [Scope decision](docs/Scope-Decision-LDS.md)
2. [Phase 2 UX specification](docs/Phase-2-UX-Spec.md)
3. [Phase 3 implementation plan](docs/Phase-3-Implementation-Plan.md)
4. [Database schema plan](docs/Database-Schema-Plan.md)
5. [Complete project handoff](docs/PROJECT-HANDOFF.md)

The active clickable artifact is [Mission Companion Prototype](design/RM%20Calendar%20%E2%80%94%20Mission%20Companion%20Prototype.html).

## Planned technical direction

- React, TypeScript, Vite, React Router, and Tailwind CSS **3.4.17**.
- Dexie/IndexedDB as the local-first source of truth; a durable foreground-sync outbox.
- A tightly scoped PWA app-shell cache, never a promise of closed-browser background sync.
- Supabase Postgres/Auth/RLS/RPC for the authenticated beta once the founder approves configuration and privacy gates.
- Private single-owner workspaces in the first functional beta; no sharing, attachments, contact import, live maps, or background location.

## References

- Public project repository: <https://github.com/noyanxtdoor-maker/rm-calendar>
- User-owned mockup reference: <https://github.com/noyanxtdoor-maker/Calendar>
- Local PMG reference material (read-only; available only on the founder’s machine): `C:\Users\sherl\Downloads\Preach My Gospel Reference`

## Workspace rule

Everything under `sources/` is synced reference material and must remain read-only.
