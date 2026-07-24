# RM Calendar — M5 Beta-Readiness Checklist

**Status:** App-owned sign-out safety complete; live beta proof and server-side account deletion remain required.

## Completed in the application

- First-use local privacy acknowledgement, offline JSON export, storage-persistence request, and checkbox-gated local erase.
- Email-link sign-in and owner-only cloud workspace bootstrap when the browser has the approved public Supabase configuration.
- A device-scoped sign-out flow. For a cloud workspace it requires acknowledgement, clears the local session first, then removes only that cloud workspace copy from the browser. The unrelated fictional starter workspace remains local and is never uploaded.
- Unit coverage that proves the signed-out cloud workspace is removed while the separate fictional starter workspace remains available.

## Required live proof before any invite

1. In Supabase Auth, add `https://rm-calendar.vercel.app/tools/cloud` to the redirect allow-list and set the production site URL as appropriate. Do not rely on the repository's local `config.toml` for hosted Auth settings.
2. Use the temporary Supabase sender only with a founder-controlled test email. Do not invite external users with the temporary sender.
3. In browser profile A, sign in, create the private cloud workspace, create fictional person and visit records, then use **Sync now**.
4. In browser profile B, sign in with the same test account, open the private workspace, and use **Sync now**. Verify the person, activity, primary person link, and history each appear exactly once.
5. Create a deliberate stale-edit conflict with fictional data: make different edits to the same synced Activity in the two profiles, sync profile A, then sync profile B. Verify the second profile preserves a visible needs-attention state rather than overwriting either version.
6. With queued fictional work, open cloud setup. Verify the sign-out warning directs the user to Sync Status. Acknowledging **Sign out and remove this device copy** must return this browser to the separate fictional starter workspace.
7. Confirm the JSON export works while offline, the erase checkbox blocks accidental deletion, keyboard focus is visible, and no screen overflows at phone width.

## Blocking boundary

M5 cannot be called complete yet. Remote account deletion requires a reviewed server-side support/deletion process because a browser publishable key must never delete a Supabase Auth user. Before external beta invitations, configure a custom SMTP sender/domain, define the approved deletion-support process and retention policy, complete the live checks above, and obtain founder approval of the beta process.
