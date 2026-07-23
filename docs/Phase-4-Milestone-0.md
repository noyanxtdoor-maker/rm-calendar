# RM Calendar — Phase 4, Milestone 0: Scaffold and Guardrails

**Status:** Complete  
**Completed:** 2026-07-23  
**Depends on:** [Phase 3 Implementation Plan](Phase-3-Implementation-Plan.md), [Phase 2 UX Specification](Phase-2-UX-Spec.md), and [Scope Decision — LDS](Scope-Decision-LDS.md)

## 1. Purpose

Milestone 0 establishes a reliable web-development foundation without pretending that functional product workflows already exist. It deliberately stops before Milestone 1’s local workspace and Dexie persistence work.

## 2. Delivered scaffold

- Fresh React 19, TypeScript, and Vite application at the repository root; it is not forked from either reference application.
- Tailwind CSS **3.4.17** with original RM Calendar CSS tokens in `src/design-system/tokens.css`.
- Original phone-first route shell for Home, Calendar, People, Map, and Tools. The Map route is an explicitly non-live place-planning preview; all screens are fictional scaffold previews, not records or product data.
- React Router routes and a five-destination bottom navigation that work with browser Back/direct URLs.
- Generated PWA manifest and Workbox service worker through `vite-plugin-pwa`.
- Static icons owned by this project under `public/icons/`.
- Fictional route-preview fixture content under `src/test/fixtures/`; no real contact, member, household, or Church data is committed.
- TypeScript, ESLint, Vitest, Playwright, and GitHub Actions CI baseline.
- Future architecture boundaries pre-created with documentation only: `src/domain/`, `src/data/`, `src/features/`, `src/lib/`, and `supabase/`.

## 3. PWA and privacy boundary

The generated service worker precaches only built application assets, the manifest, icons, and the navigation fallback. It has no runtime cache rule for API/auth/data requests and the project contains no Supabase client, account flow, environment secret, or remote credential.

The production Playwright check verifies this boundary in practice: it loads the production preview online, waits for the service worker, reloads the Calendar route while the browser is offline, and confirms the original app shell still opens. This is app-shell availability only—not background sync and not a claim that future private data is cached safely.

## 4. Verification evidence

The following ran successfully after a clean `npm ci` install:

```text
npm run verify
  typecheck: pass
  lint: pass
  Vitest: 1 passed
  production Vite build: pass
  PWA generation: service worker + manifest emitted

npm run test:e2e
  Playwright Chromium mobile: 1 passed
  verifies phone-width layout, primary navigation, route change, and offline reopen
```

The same workflow passed in the public repository through [GitHub Actions run 30021188368](https://github.com/noyanxtdoor-maker/rm-calendar/actions/runs/30021188368): clean install, typecheck, lint, unit test, production build, Chromium setup, and the production PWA browser check all completed successfully.

The generated phone-width screenshot was inspected locally. It shows a readable, original dark RM Calendar shell with no horizontal overflow, obvious primary navigation, and no copied PMG assets or layouts.

## 5. Deliberate non-deliveries

Milestone 0 does **not** add:

- Dexie, IndexedDB schema, drafts, local workspace data, or data migrations;
- people, activities, calendar records, tasks, notes, follow-ups, or forms;
- Supabase, email OTP, authentication, sync, RLS, or any live service;
- maps, background location, attachments, imports, AI, sharing, or official-data integration.

## 6. Next milestone

The next implementation slice is **Phase 4, Milestone 1 — Local private workspace and design shell**. It must add a local Dexie schema/migration, a fictional private workspace, local settings, original shell data binding, and privacy/disclaimer surfaces. It must prove a created local record survives a browser reload before moving to People/Calendar workflows in Milestone 2.
