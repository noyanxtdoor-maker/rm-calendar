# RM Calendar — LDS and Returned Missionary Scope Decision

**Decision date:** 2026-07-23  
**Status:** Accepted  
**Decision owner:** Product founder  
**Supersedes:** All earlier statements that RM Calendar is general-purpose, industry-neutral, or intentionally non-church-specific.

## Decision

RM Calendar will be built specifically for LDS members and returned missionaries who have first-hand experience with the planning workflow used during missionary service.

The first product is an independent, web-first, mobile-shaped planning companion. It helps users organize people, households, visits, activities, places, notes, tasks, and follow-ups in a way that feels familiar to returned missionaries.

## Why this is the correct initial focus

- The founder has direct familiarity with the workflow and the emotional reason people miss it.
- Returned missionaries already understand the mental model: plan the day, connect people to places, record outcomes, and deliberately choose a next action.
- A specific audience provides better product language and better beta feedback than a broad “field productivity” category.
- RM Calendar can still use reusable architecture internally, but its first user experience should feel purpose-built for this community.

## Product positioning

**Working positioning:**

> An independent planning companion for returned missionaries and LDS members who want to keep people, visits, plans, and follow-ups connected.

**Not positioning:**

- An official Church app.
- A replacement for official Church systems or records.
- A clone or new version of Preach My Gospel.
- A generic business CRM.

## Familiarity contract

The product should preserve these familiar interaction ideas:

1. A Home dashboard with weekly progress and people who need attention.
2. A dense day-planning calendar with a date ribbon.
3. People and households as first-class planning objects.
4. Area/place awareness through a map and notes.
5. A reliable follow-up loop after each visit or interaction.
6. Fast access to secondary tools through a drawer/menu.

It must not copy PMG's proprietary brand, source code, screen designs, UI assets, iconography, colors, text, or exact layout. RM Calendar's visual and component system stays original even where its workflow is familiar.

## Canonical audience language

Use:

- LDS members
- returned missionaries / RMs
- people, households, visits, activities, follow-ups, area notes, weekly focus

Avoid product claims such as:

- “official”
- “the new PMG”
- “replacement for Preach My Gospel”
- “Church records”

## Product safeguards

1. Include an independence/non-affiliation disclaimer in the app's About/Settings surface and public prototype.
2. Never seed real member, contact, location, or sensitive pastoral information.
3. Keep data local-first; request permission for imports, location, sharing, or sync only at the moment of use.
4. Do not imply access to official Church data or systems.
5. Treat personally identifying or spiritual/pastoral notes as sensitive product data during implementation.

## Architectural impact

The existing core model remains useful: Workspace, Contact, Organization/Household, Place, Activity, Task, Note, Follow-up, Tag, Attachment, and Reminder. The first UI can rename or configure those for the RM experience without hard-coding any claim of official Church data.

The web-first / mobile-first delivery decision remains unchanged. Native mobile packaging is deferred until beta validation and budget approval.

## Documents superseded or amended

- [Product Bible](Product-Bible.md): amended by this decision.
- [Phase 0 Discovery](Phase-0-Discovery.md): audience positioning amended by this decision.
- [Information Architecture](Information-Architecture.md): navigation remains useful, but content is now LDS/RM focused.
- [PROJECT-HANDOFF](PROJECT-HANDOFF.md): must treat this document as the source of truth for audience and positioning.
- [Phase 2 UX Specification](Phase-2-UX-Spec.md): implements this decision.
