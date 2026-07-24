# RM Calendar — Phase 4, Milestone 6: Focus Groups

**Status:** Complete and deployed with cloud migration applied

## Outcome

M6 adds private, user-created Focus Groups. A group may have any name, begins with zero to fifty selected people, and shows how many members have a planned next step. It is personal planning context, not an official Church record, shared list, or copied PMG category.

## Delivered

- Create Focus Group screen with an optional selected-person list.
- Focus Groups section on People, with member and planned-work signals.
- Atomic local creation of the group, all selected membership links, and one durable outbox operation.
- Authenticated cloud sync support: group and its initial member links are sent together, recorded idempotently, and returned as related context to another device.
- Applied Supabase migration `20260724130000_focus_groups.sql` to the dedicated RM Calendar project.

## Verification

- `npm run verify`: typecheck, lint, 37 unit tests, and production build pass.
- Playwright phone-width flows: 9 pass, including focus-group creation with a selected person.
- `supabase migration list`: local and remote both show `20260724130000` applied.

## Intentional boundary

This milestone creates groups and their initial membership only. Editing or deleting groups, adding/removing members later, sharing, permissions, official-data integrations, and map/location features remain separate future decisions.
