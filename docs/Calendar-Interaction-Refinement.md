# RM Calendar — Calendar Interaction Refinement: Day Plan and Week Rhythm

**Status:** Complete local UI refinement  
**Completed:** 2026-07-24  
**Depends on:** [Phase 2 UX Specification](Phase-2-UX-Spec.md), [Phase 4 Milestone 2](Phase-4-Milestone-2.md), and [Scope Decision — LDS](Scope-Decision-LDS.md)

## 1. Purpose

This refinement responds to the founder’s request to study Dayflow Calendar as a quality reference for calendar interaction. Dayflow’s public documentation demonstrates responsive calendar views, mobile support, and event-detail affordances. RM Calendar uses those ideas only at the interaction level; it adds no Dayflow package, source, styles, assets, or copied visual expression.

The RM Calendar decision is intentionally narrower and original:

~~~text
Day plan       -> execute one selected day in detail
Week rhythm    -> scan commitments and planning density before choosing a day
Activity detail -> retain RM Calendar’s connected person/place/outcome/follow-up workflow
~~~

It is not a generic full-calendar replacement. The week view is a planning aid for LDS members and returned missionaries using a familiar people-and-follow-up workflow.

## 2. Delivered experience

### Day plan

- Preserves the existing seven-day date ribbon and detailed local activity cards.
- Adds previous/next day controls and a **Today** shortcut.
- Gives date buttons descriptive accessible names instead of exposing only a numeral.
- Continues to use local Activity, Contact, and Place records; no new data model or remote request was introduced.

### Week rhythm

- Adds an original Monday–Sunday mobile planning scan.
- Shows planned-count signals for every day, without relying on color alone.
- Lists up to three local activities per day with time and direct detail navigation.
- Provides an explicit **Open day** action for returning to the detailed day plan and a **Plan this day** path for empty days.
- Includes previous/next week controls and preserves the selected planning date.

### Accessibility behavior

- The Day plan / Week rhythm control uses a labelled tablist, selected-state semantics, associated tab panels, and Arrow/Home/End keyboard navigation.
- Arrow navigation moves focus to the newly selected tab.
- All navigation and day-selection controls remain native buttons or links with visible focus treatment and touch-sized targets.

## 3. Explicit non-deliveries

- No copied Dayflow source, dependency, visual styling, or drag-and-drop implementation.
- No month/year view, recurrence, external calendar integration, live maps, route optimization, sharing, or remote data.
- No change to local-first command boundaries, domain records, sync contract, or the external M4 authorization gate.

## 4. Verification evidence

~~~text
npm run typecheck
  pass
npm run lint
  pass
npm run test:unit
  22 passed
npm run test:e2e
  production build: pass
  Playwright Chromium mobile: 6 passed
~~~

The added mobile-browser test proves that the user can focus the Day plan tab, press ArrowRight, receive focus on the Week rhythm tab, see the local planned activity in the week scan, and use the week-navigation controls without horizontal overflow at phone width.

The inspected screenshot confirms the original dark Mission Companion design system remains coherent in the new weekly view.
