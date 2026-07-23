# RM Calendar — Paste This Into the Next Session

```text
Continue the RM Calendar project as product architect and implementation planner.

First read these files in this order:
1. docs/PROJECT-HANDOFF.md
2. docs/Scope-Decision-LDS.md
3. docs/Phase-2-UX-Spec.md
4. docs/Product-Bible.md
5. docs/Domain-Model.md
6. docs/Critical-Workflows.md
7. docs/Business-Rules.md
8. docs/Data-Sync-Architecture.md

If local files are unavailable, start from this public repository:
https://github.com/noyanxtdoor-maker/rm-calendar

Project scope is now settled:
- Product name: RM Calendar.
- Audience: LDS members and returned missionaries who understand the planning rhythm used in missionary service.
- Product: an independent, web-first, mobile-first planning companion for people/households, visits, activities, places, notes, tasks, and follow-ups.
- Product positioning: familiar missionary-planning rhythm, but NOT an official Church app, NOT a PMG clone, and NOT a replacement for official Church systems.
- No claim of Church affiliation or access to official Church/member data.
- No copying PMG branding, assets, source code, colors, text, exact layouts, or screens.

References:
- User-owned Google AI Studio prototype repository: https://github.com/noyanxtdoor-maker/Calendar
- Local workflow/design reference, if available: C:\Users\sherl\Downloads\Preach My Gospel Reference

The Phase 2 outcome is complete. The active clickable artifact is:
design/RM Calendar — Mission Companion Prototype.html

It demonstrates the intended original structure:
Home → Calendar → People → Map → Tools, plus a side drawer, quick add, person context, and the important completed-activity → outcome → linked follow-up/task flow.

Do not restart architecture discovery. Begin Phase 3: translate the approved UX specification and domain rules into a technical implementation plan. Produce, in order:
1. implementation-ready component inventory and state model;
2. data/schema mapping from the existing domain model;
3. web-first technology decision with trade-offs;
4. local-first persistence/sync implementation plan;
5. milestone-based build plan for the functional web beta.

Keep the product original, privacy-conscious, local-first, and usable in poor connectivity. Treat sensitive people/household notes and location data carefully. Do not build production code until the founder explicitly approves the Phase 3 plan.

Workspace constraints: sources/ is read-only; use apply_patch for local edits; preserve unrelated changes; Tailwind must remain on 3.4, never v4. If implementation requires an external SDK, retrieve its current official documentation first.
```
