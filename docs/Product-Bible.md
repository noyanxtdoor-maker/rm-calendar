# RM Calendar — Product Bible

**Version:** 0.1 (working draft)  
**Status:** Architectural foundation  
**Last updated:** 2026-07-23

> **Scope amendment (2026-07-23):** The canonical first audience is LDS members and returned missionaries, not the earlier general field-work market. Read [Scope-Decision-LDS.md](Scope-Decision-LDS.md) and [Phase-2-UX-Spec.md](Phase-2-UX-Spec.md) before relying on any older audience or positioning statements below. RM Calendar remains an independent product and must not copy PMG or claim Church affiliation.

## 1. Product in one sentence

RM Calendar is an offline-friendly field-work planner that helps people organize appointments, contacts, places, tasks, and follow-ups in one practical daily workspace.

## 2. Vision

People who work away from a desk should be able to plan, carry out, and remember their work without juggling a generic calendar, chat messages, paper notes, maps, and disconnected contact lists.

RM Calendar is not merely a calendar with extra tabs. It is a **field productivity platform**, with the calendar as its primary daily interface.

## 3. The problem we are solving

Field workers commonly need to answer five questions quickly:

1. What should I do today?
2. Who should I see next, and where are they?
3. What happened during the last interaction?
4. What follow-up is due or at risk of being missed?
5. What did I accomplish this week or month?

Current tools fragment these answers across calendars, address books, maps, notes, messaging apps, and spreadsheets. They also tend to fail when connectivity is unreliable.

## 4. Target users

### Initial users

People with first-hand experience of PMG-style planning workflows who need a modern replacement for planning relationships, appointments, places, and follow-ups.

### Broader users

- Territory and field sales representatives
- Relationship managers and account managers
- Insurance and real-estate agents
- Field technicians and service engineers
- Community, NGO, and faith-based field workers
- Supervisors who coordinate field teams

### Explicit product boundary

RM Calendar is designed for **field work**. It should not become a generic personal calendar, a full enterprise CRM, or an industry-specific medical product in its first release.

## 5. Jobs to be done

When I am planning my day in the field, I want to see my commitments, people, locations, and priorities together, so I can use my time deliberately.

When I finish an interaction, I want to capture the outcome and next action in seconds, so nothing important is forgotten.

When I have weak or no signal, I want to continue working normally, so connectivity never stops my day.

When I review my work, I want a trustworthy history of visits and follow-ups, so I can report accurately and improve my coverage.

## 6. Product principles

1. **Offline-first.** Core field work remains usable without a connection; synchronization enhances the experience but is not a prerequisite for it.
2. **Plan work, not just time.** An event can connect to a contact, place, task, outcome, and follow-up.
3. **Fast for frequent actions.** Creating an appointment, completing a visit, and adding a follow-up should be possible with minimal typing and ideally three taps or fewer from the appropriate context.
4. **Field-friendly.** One-handed use, readable outdoor contrast, large touch targets, and forgiving data entry are baseline requirements.
5. **Generic core, adaptable language.** The system uses neutral concepts—Contact, Organization, Place, Activity, Task—and later lets a workspace choose labels such as Client, Member, Visit, or Call.
6. **AI assists; it never blocks.** Suggestions must be explainable, optional, and easy to dismiss. The core experience must work without AI.
7. **Connected context.** Records should link naturally; users should not have to re-enter the same person, place, or outcome in multiple areas.
8. **Fast over flashy.** Reliability, startup speed, and responsive interaction outweigh visual effects.
9. **Trustworthy history.** Important changes and completed work have timestamps and a clear history.
10. **Privacy by default.** User and workspace data are protected, access is scoped, and only necessary information is collected.

## 7. Core product vocabulary

| Term | Meaning |
| --- | --- |
| Workspace | A personal or team environment with its own users, labels, and data boundaries. |
| Contact | A person the user works with or follows up with. |
| Organization | A company, group, household, branch, or other entity associated with contacts. |
| Place | A reusable physical location, optionally mapped. |
| Activity | A planned or completed unit of work; the generic parent concept for an appointment, visit, meeting, or call. |
| Calendar event | The time-based scheduling representation of an activity. |
| Task | A discrete action that can stand alone or be linked to an activity. |
| Follow-up | An explicit link from a completed Activity to exactly one newly created future Task or Activity; it is not the target work record itself. |
| Note | Context or outcome captured against one primary record (Contact, Organization, Place, Activity, or Task). |
| Route | An ordered plan of activities and places for a day or field session. |

These definitions are deliberately neutral. Labels can change by workspace; the underlying meaning does not.

## 8. The v1 product promise

At the end of a working day, a user should be able to plan tomorrow, know who they are meeting and where, record what happened today, and trust that every completed action will synchronize later if they are offline.

## 9. v1 scope

### Must have

- Sign in and a personal workspace
- Calendar day, week, and agenda views
- Create, edit, reschedule, and complete activities
- Contacts with notes, interaction history, tags, and linked places
- Places with map-ready addresses and coordinates
- Tasks, reminders, and follow-ups
- Daily agenda that combines scheduled and unscheduled work
- Offline local data store, durable outbox, and synchronization while the web app is active or resumed, plus a manual Sync Status fallback
- Clear sync state and recoverable conflict handling
- Basic search and filters
- A simple weekly activity summary

### Valuable if capacity allows

- Route ordering and map view
- Teams, shared calendars, and permission roles
- Attachments and photo capture
- Configurable activity types, colors, and terminology
- Exportable activity reports

### Deliberately deferred

- Industry-specific workflows or hard-coded labels
- Complex CRM pipelines, opportunities, quotations, and billing
- Inventory, samples, expenses, or full ERP features
- Automated route optimization that requires third-party mapping costs
- Open-ended AI chat assistant
- Advanced dashboards and custom report builders
- Deep integrations with external calendars and CRMs

## 10. Success measures for the initial beta

- A new participant can add a contact and schedule a linked activity without assistance.
- A typical user can complete a planned interaction and create its follow-up in under one minute.
- Offline-created changes survive an app restart and synchronize correctly once online.
- At least 70% of beta users return to plan or update work in three separate weeks.
- Early users describe the product as easier for field work than their current calendar process.

The numerical targets are starting hypotheses; they will be revised after usability testing.

## 11. Non-goals and guardrails

- We will study existing field-work workflows but implement an original product, visual design, data model, and codebase.
- We will not reproduce proprietary branding, assets, copy, or a pixel-for-pixel interface.
- The first version will favor a small set of dependable daily workflows over a large feature inventory.
- Any feature that does not strengthen planning, execution, capture, follow-up, or review needs unusually strong justification.

## 12. Experience pillars

### Daily command center

The home experience answers “what matters now?”: today’s schedule, priority tasks, due follow-ups, location context, and sync status.

### Connected field record

A contact is more than an address-book entry. It should show relationship context, planned and completed activity, notes, places, and next steps.

### Capture in the moment

After an interaction, users should record an outcome, short note, task, or follow-up without being forced through a long form.

### Reliable anywhere

The user can see previously synced data and create or modify core records while offline. The interface makes pending changes visible without creating anxiety.

## 13. Architectural decisions already made

| Decision | Rationale |
| --- | --- |
| Calendar is the primary interface, not the whole product. | Field work is organized around time but requires people, places, and outcomes. |
| The domain model is generic. | The product can serve multiple field-work professions without rebuilding its foundation. |
| Offline is a first-class capability. | Weak connectivity is normal for the target workflow, not an exception. |
| v1 focuses on individual field workers. | It keeps permissions, synchronization, reporting, and onboarding manageable while validating the core loop. |
| Team capabilities are designed for but deferred. | Shared data affects nearly every entity and must not be bolted on carelessly. |
| Source recordings are requirements inspiration only. | RM Calendar must be independently designed and implemented. |

## 14. Key risks to resolve early

1. **Audience ambiguity:** “RM” is familiar to initial users but not universal. We need to test whether the name and positioning welcome non-RM field workers.
2. **Offline complexity:** Sync, local persistence, and conflicts are core product risks—not polish to add later.
3. **Feature sprawl:** The product can grow into CRM, reporting, routing, and team management too soon. v1 must defend the daily field-work loop.
4. **Mobile platform choice:** Native, cross-platform, and web approaches have different offline, mapping, notification, and release implications.
5. **Privacy and location:** Location and relationship data require intentional consent, security, retention, and access controls.

## 15. Planned architecture sequence

1. Product Bible — this document
2. Domain Model — entities, ownership, lifecycle, and relationships
3. Core Workflows — plan, execute, capture, follow up, review
4. Information Architecture — navigation and screen responsibilities
5. Business Rules — validation, permissions, reminders, and state changes
6. Data and Sync Architecture — local store, server data model, outbox, conflicts
7. Technical Architecture — platform, application layers, integrations, security
8. UX specifications and prototype
9. Build plan and beta plan

## 16. Open decisions

- How broad should responsive desktop support be during the web beta, beyond reliable browser access?
- Which user segment will be recruited for the first 10–20 beta users?
- Is single-user ownership sufficient for beta, or must a supervisor view exist?
- What types of reminders are essential: in-app, local-device, push, email, or all of them?
- Which regions, languages, and privacy requirements must launch support?
- What mapping provider and operating-cost ceiling are acceptable?

## 17. Next artifact

The next document is the **Domain Model**. It will turn the vocabulary above into precise entities, relationships, lifecycles, and ownership rules before any database tables or screens are designed.
