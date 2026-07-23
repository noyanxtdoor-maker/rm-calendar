# RM Calendar — Complete Project Handoff

**Status:** Phase 2 in progress (UX/prototype)  
**Last updated:** 2026-07-23  
**Repository:** https://github.com/noyanxtdoor-maker/rm-calendar  
**Product owner:** User / founder  
**Handoff purpose:** Give a new ChatGPT/Codex session enough context to continue without rediscovering the product, decisions, architecture, or design direction.

## 1. The project in one paragraph

RM Calendar is an original, general-purpose, field-work productivity platform. It is aimed initially at returned missionaries (RMs) and people who miss the clarity of Preach My Gospel-style planning, but it is **not** a church or missionary app and it must not contain church-specific concepts by default. It helps people plan time, manage contacts and places, capture what happened, and reliably create follow-ups. The first release is a web-first beta with a phone-sized, mobile-first UI; native mobile applications come later, after workflow validation and budget are available.

## 2. Non-negotiable product direction

### Build this

- A calendar-centered field-work application for general use.
- Core objects: Contacts, Organizations, Places, Activities, Tasks, Notes, Reminders, Follow-ups, Tags, Routes (later).
- Primary daily loop: know people/places → plan work → complete/capture outcome → create follow-up → review.
- Web beta optimized for handheld use, with responsive browser access on larger screens.
- Original code, visual design, copy, assets, terminology, and data model.

### Do not build this

- A PMG clone, an LDS/church app, or a pharmaceutical-only app.
- A generic personal calendar with disconnected contacts and tasks.
- A full CRM, accounting system, inventory tool, or enterprise reporting suite in v1.
- A product that requires reliable connectivity to plan or record work.

### Inspiration boundary

The user has permission/control over the Google AI Studio prototype repository listed below. Use it as a reference for app-shell quality and interaction structure. The PMG screenshots/recordings are references for familiarity and workflow analysis only. Do **not** copy PMG branding, artwork, icons, church language, proprietary screen layouts, or code.

## 3. Naming and positioning

- Chosen name: **RM Calendar**.
- “RM” initially resonates with returned missionaries, but the product itself is intentionally general-purpose.
- Suggested positioning: “The field-work planner that keeps people, places, plans, and follow-ups connected.”
- Long-term category: field productivity platform, with Calendar as the flagship module.

## 4. Target users

### Initial emotional audience

Returned missionaries who remember the operational clarity of PMG: daily plans, people context, follow-ups, activity history, and an always-visible next action.

### Broader product audience

- Field and territory representatives
- Relationship/account managers
- Insurance and real-estate agents
- Field technicians and service workers
- Community, NGO, and faith-based field workers

### Core jobs to be done

1. What should I do today?
2. Who should I see next, and where are they?
3. What happened during the last interaction?
4. What follow-up is due or at risk of being forgotten?
5. What did I accomplish this week?

## 5. Product principles

1. Offline-first/local-first.
2. Plan work, not merely time.
3. Fast frequent actions; capture should never become a long form.
4. Field-friendly, one-handed, readable, with 44px minimum touch targets.
5. Generic core with configurable language later.
6. AI may assist later but must never block core work.
7. Connected context: people, places, activities, tasks, notes, and follow-ups link naturally.
8. Reliability and speed over visual effects.
9. Trustworthy history and visible corrections.
10. Original implementation; borrow needs, not proprietary expression.

## 6. Completed work and source-of-truth documents

All documents below exist locally in `docs/` and, as of this handoff, were published to the public RM Calendar repository.

| File | Purpose | Status |
| --- | --- | --- |
| `Product-Bible.md` | Vision, users, scope, principles, feature boundary, risks | Complete |
| `Phase-0-Discovery.md` | Personas, feature inventory, positioning, assumptions, beta research | Complete |
| `Domain-Model.md` | Product entities, relationships, lifecycle, invariants | Complete and audited |
| `Critical-Workflows.md` | Plan, complete/capture, and follow-up flows with acceptance criteria | Complete and audited |
| `Information-Architecture.md` | Mobile-first navigation and screen responsibilities | Complete and audited |
| `Business-Rules.md` | Lifecycle, permissions, reminder, deletion, and consistency rules | Complete and audited |
| `Data-Sync-Architecture.md` | Local-first sync, outbox, conflicts, revisions, and security | Complete and audited |
| `PROJECT-HANDOFF.md` | This file | Current handoff |
| `CONTINUATION-PROMPT.md` | Copy/paste prompt for the next account | Current handoff |

## 7. Phase history

### Phase 0 — Product discovery: complete

Completed deliverables: vision, user hypotheses, product boundaries, principles, product vocabulary, feature inventory, competitor/category analysis, universal field-work loop, beta assumptions, and research plan.

Key decision: RM Calendar is not medical/pharmaceutical-only. It is general field-work software.

### Architecture package / original roadmap phases 1–7: complete

The original conversation described Domain Architecture, Business Rules, Information Architecture, Workflows, Database Design, API Design, and Offline Architecture as separate sequential phases. The project has already completed the planning-level portions of all of these through the Domain Model, Critical Workflows, Information Architecture, Business Rules, and Data/Sync Architecture documents.

Important resolved details:

- Activities have `Draft`, `Scheduled`, `Completed`, and `Cancelled` states.
- Draft Activities may be unscheduled; Scheduled Activities are all-day or time-ranged.
- Tasks have `Open`, `Completed`, and `Cancelled` states.
- An Activity can have many contacts but at most one primary Contact; it has one primary Place.
- A Follow-up starts from a **Completed** Activity and targets exactly one Task **or** Activity.
- Creating a follow-up target and link is one atomic local and backend transaction.
- Records are workspace-scoped. Existing-record mutations carry `base_revision`; meaningful conflicts become visible `needs attention`, never silent last-write-wins.
- Web beta sync is active/resumed-browser sync plus manual Sync Status fallback; it does not promise background sync when the browser is closed.

### Phase 2 — UX/UI prototype: in progress

Design direction was selected: **Quiet Command**—a calm dark operational interface. The first simple prototype was intentionally only a direction canvas and was judged too rough by the user. A more relevant reference-informed prototype has been created and should be the current starting point.

## 8. Design references and current design direction

### Local reference material

User-provided folder (read-only reference):

`C:\Users\sherl\Downloads\Preach My Gospel Reference`

It contains PMG screenshots and screen recordings, plus a BetterCalendar recording. Key visual/workflow takeaways:

- Dense day timeline and compact date ribbon
- Clear bottom navigation
- Obvious floating add action
- Home screen that answers “what matters now?”
- People/progress context connected to planning
- A left drawer for secondary tools
- Strong task/plan distinction

Do not reuse church labels, icons, colors, missions, key indicators, or visual assets.

### User-owned Google AI Studio prototype reference

Repository: https://github.com/noyanxtdoor-maker/Calendar

Inspected structure:

- React/Vite app with `HomeView`, `CalendarView`, `PeopleView`, `MapView`, `MenuView`, `BottomNav`, `LeftDrawer`, and add/detail modals.
- Its strongest ideas are the fixed mobile app shell, dashboard → people → calendar → map → tools flow, date ribbon, dense timeline, drawer for secondary functions, and context-specific creation flows.
- Its church/missionary domain and exact design are **not** to be transferred. Translate its structure to generic concepts only.

### Current design files

| File | Purpose | Status |
| --- | --- | --- |
| `design/RM Calendar — Design Directions.html` | Three rough original visual directions | Direction 2 selected; historical reference |
| `design/RM Calendar — Quiet Command Prototype.html` | First interactive direction prototype | Superseded as a structural reference; too simple |
| `design/RM Calendar — Reference-Informed Prototype.html` | Current prototype to refine | Current starting point |

### Current visual system

- Dark near-black background
- Slate/blue-green elevated surfaces
- Warm copper action color (`#e38a5d`), not PMG’s magenta
- Soft mint for positive/completed states
- Georgia-style display headings plus readable system UI body font
- 8px spacing rhythm, 44px touch-target minimum
- No gradients, no copied iconography, no church imagery

### Generic translation of the reference dashboard

| Reference idea | RM Calendar equivalent |
| --- | --- |
| Weekly key indicators | Today’s Focus: planned visits, follow-ups, contacts, completed work |
| Progressing people | People needing attention |
| Missionary/area | User/workspace/territory or personal workspace |
| Teaching/finding events | Visits, meetings, calls, route planning, focus blocks |
| Referrals/baptism forms | Contacts, follow-ups, notes, files (later) |
| Area map | Places / route context |
| PMG drawer tools | Weekly summary, tasks, notes, places, sync status, settings |

## 9. Exactly where Phase 2 paused

The user opened the current prototype in the in-app browser and approved the general direction: “yes thats okay for now.” They then explicitly said they still love the PMG UI and Google AI Studio mockup UI and asked the project to follow the latter’s layout/design/workflow/UI while removing missionary and church feature content for general use.

**Next required work:** refine `design/RM Calendar — Reference-Informed Prototype.html` rather than restarting from scratch. It should become a genuinely polished, original clickable prototype with these screens/flows:

1. Home dashboard
   - Today’s Focus metrics
   - People needing attention
   - Quick tools
   - Clear current sync status
2. Calendar
   - Day ribbon/date selection
   - Dense but readable timeline
   - Multiple activity types, without church terminology
   - Add Activity flow
3. People
   - Search, contact list, contact detail
   - Activity history, notes, place, next action
4. Map/Places
   - Place pins, route context, not turn-by-turn navigation
5. More/Drawer
   - Weekly summary, tasks, notes, sync status, settings
6. Critical interaction flows
   - Add Activity
   - Create Contact inline
   - Complete Activity + capture outcome
   - Create linked follow-up
   - Offline/pending-sync feedback

### Phase 2 definition of done

- The reference-informed prototype is visually polished and consistent at phone width.
- It is clearly original in colors, copy, iconography, and screen composition.
- A user can click through plan → complete → follow up.
- It includes Today, Calendar, People/contact detail, Places, More, Quick Add, and Sync feedback.
- It is reviewed by the user and adjusted at least once.
- A `UX-Specification.md` documents the approved design system, component states, screen responsibilities, and critical flow acceptance criteria.
- The approved UX spec and prototype are uploaded to `noyanxtdoor-maker/rm-calendar`.

## 10. Recommended future roadmap

### Finish Phase 2 — UX/UI

Refine and validate the clickable prototype as described above. Do not write production app code until the user approves the core screens and interactions.

### Phase 3 — Technical implementation decision and scaffold

Choose the concrete web stack and backend only after the prototype is accepted. The local project instructions describe InsForge as the intended backend platform. Before writing any InsForge integration code, the next agent **must** fetch current InsForge documentation using the required MCP documentation tool. Use Tailwind CSS **3.4**, never v4, if Tailwind is used.

Expected decisions:

- React/Vite or another web framework
- PWA/local database approach (IndexedDB-capable)
- InsForge project/backend configuration
- Authentication and workspace model
- Sync engine implementation consistent with `Data-Sync-Architecture.md`
- Map provider and cost limits

### Phase 4 — Build the beta loop

Implement in vertical slices:

1. Authentication, personal workspace, local data store
2. Contacts and Places
3. Calendar/Activities and Today dashboard
4. Completion capture and linked Follow-ups
5. Tasks, weekly summary, search
6. Offline outbox, sync status, conflict UI
7. Manual beta testing with 10–20 field-work users

### Phase 5 — Beta and learning

- Recruit former PMG users and general field workers.
- Test real daily planning, interaction capture, offline restart, and follow-up recovery.
- Measure repeat weekly use and qualitative confidence in the workflow.
- Avoid adding team collaboration, heavy reporting, integrations, or AI until the core loop is habitual.

### Phase 6 — Native mobile

Only after web beta validates the loop and budget permits Android/Google Play development. Reuse the data/sync contract; do not rewrite the business rules or domain model.

## 11. Repository and publishing state

- GitHub account connected in this session: `noyanxtdoor-maker`.
- RM Calendar public repository successfully created: `noyanxtdoor-maker/rm-calendar`.
- The architecture documents were uploaded and final remote confirmation was made for the Data Sync architecture commit: `docs: strengthen concurrency and web sync contract`.
- GitHub connector could read but not write to the new repository; the local authenticated `gh` CLI was used to create/publish files.
- If continuing on another account, authenticate GitHub before publishing. Do not assume the new account has the same connector or CLI access.

## 12. Important workspace instructions

- Current workspace: `C:\Users\sherl\.codex\.chatgpt-projects\g-p-6a6174fb5d708191b1d0fc511a31f967`
- `sources/` is read-only reference material. Never modify, rename, move, or delete it.
- Use `apply_patch` for file edits.
- If `.codegraph/` exists in a future repository, use CodeGraph before grep/find for code understanding.
- Preserve existing user changes; do not reset or destructively clean the worktree.
- Use direct, original implementation rather than copying code from any reference.

## 13. Questions already answered

| Question | Answer |
| --- | --- |
| Product name | RM Calendar |
| Medical/pharma-only? | No; general field work |
| First delivery platform | Web-first beta, mobile-first UI |
| Native mobile | Later, after validation and budget |
| GitHub repository | Public `noyanxtdoor-maker/rm-calendar` |
| Visual direction | Quiet Command / dark operational UI |
| Primary UI reference | User-owned `noyanxtdoor-maker/Calendar` structure and usability |
| Church/missionary features | Remove completely from RM Calendar default product |
| UI inspiration from PMG | Preserve operational clarity and familiarity, never copy proprietary expression |

## 14. Decisions still open

- Exact web framework and local database library
- Exact InsForge configuration and backend schema deployment
- Mapping provider/cost ceiling
- Responsive desktop scope during beta
- Brand logo, font licensing, and final icon set
- User-configurable vocabulary timing
- Beta geography, languages, privacy/retention requirements
- Whether the public repo should contain only docs/prototype now or move into a normal implementation structure after Phase 2 approval

## 15. How the next agent should work

1. Read this file and all source-of-truth documents listed in Section 6 first.
2. Inspect the current prototype file and the user-owned reference repository; do not duplicate PMG or the reference app.
3. Begin by refining the active prototype, not by changing the product scope or jumping into production code.
4. Communicate each design decision plainly and show the user an artifact early.
5. Ask the user for feedback on the refined prototype before treating Phase 2 as complete.
6. Once approved, write `UX-Specification.md`, publish it and the prototype, and then begin Phase 3.

## 16. Current handoff checklist

- [x] Product vision and scope captured
- [x] Architecture and critical workflows specified and independently audited
- [x] Public GitHub repository created and documentation published
- [x] Web-first/mobile-first strategy decided
- [x] UI references analyzed
- [x] Design direction selected
- [x] Initial reference-informed prototype created
- [ ] Refine prototype from user feedback
- [ ] User approves Phase 2 prototype
- [ ] Create and publish UX specification
- [ ] Start technical implementation phase

