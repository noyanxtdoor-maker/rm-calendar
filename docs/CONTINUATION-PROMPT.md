# RM Calendar — Paste This Into the New Session

```text
Continue the RM Calendar project as the product architect and UX collaborator.

First, read this complete handoff file in the project workspace:
docs/PROJECT-HANDOFF.md

Then read the source-of-truth architecture documents in docs/:
- Product-Bible.md
- Phase-0-Discovery.md
- Domain-Model.md
- Critical-Workflows.md
- Information-Architecture.md
- Business-Rules.md
- Data-Sync-Architecture.md

Project repository: https://github.com/noyanxtdoor-maker/rm-calendar
UI reference repository owned by the user: https://github.com/noyanxtdoor-maker/Calendar

We are in Phase 2 (UX/UI prototype). The product is RM Calendar: an original general-purpose field-work planner, initially emotionally resonant with returned missionaries but with NO church or missionary features in the default product. It is web-first for beta, with a phone-sized/mobile-first UI. Native mobile comes later after web validation and budget.

The user selected the dark “Quiet Command” visual direction, but wants the app shell, layout quality, workflow, dashboard/calendar/people/map/tools structure, and usability of the user-owned Calendar mockup. Use that structure as inspiration, but do not copy code, PMG branding, church terminology, proprietary visual assets, colors, or exact screen layouts.

Current active prototype:
design/RM Calendar — Reference-Informed Prototype.html

Start by inspecting and refining that prototype. Build an original, polished clickable flow for Today/Home, Calendar, People/contact detail, Places/Map, More/Drawer, Quick Add, Complete Activity, Create Follow-up, and offline/pending-sync feedback. Show the user the artifact early and iterate with their feedback. Do not jump into production code until the prototype is approved.

After user approval, create docs/UX-Specification.md, publish it and the approved prototype to the public RM Calendar repository, then proceed to Phase 3 technical implementation decisions.

Important workspace constraints: sources/ is read-only; use apply_patch for edits; preserve existing changes; if writing InsForge integration code, fetch current InsForge SDK docs first; Tailwind must remain on 3.4, never v4.
```
