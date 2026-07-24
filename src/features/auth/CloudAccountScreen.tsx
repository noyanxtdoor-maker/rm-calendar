import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createRemoteWorkspace, removeLocalCloudWorkspace } from '../../data/local/workspace'
import { configuredSupabaseClient } from '../../data/sync/supabaseClient'
import { useLocalSyncStatus, useLocalWorkspace } from '../workspace/useLocalWorkspace'
import { useSupabaseAuth } from './useSupabaseAuth'

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function CloudAccountScreen() {
  const auth = useSupabaseAuth()
  const { workspace } = useLocalWorkspace()
  const sync = useLocalSyncStatus()
  const { client } = configuredSupabaseClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [signOutAcknowledged, setSignOutAcknowledged] = useState(false)

  async function sendSignInLink() {
    if (!client) return
    setBusy(true)
    setMessage(undefined)
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: new URL('/tools/cloud', window.location.origin).toString()
        }
      })
      if (error) throw error
      setMessage('Check your email for a secure sign-in link. Return here after opening it.')
    } catch {
      setMessage('The sign-in link could not be sent. Check the address and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function preparePrivateWorkspace() {
    if (!client || !auth.user) return
    setBusy(true)
    setMessage(undefined)
    try {
      const requestedName = 'My planning space'
      const requestedTimezone = browserTimeZone()
      const { data: remoteWorkspaceId, error: bootstrapError } = await client.rpc('bootstrap_private_workspace', {
        p_workspace_name: requestedName,
        p_timezone: requestedTimezone
      })
      if (bootstrapError || !isUuid(remoteWorkspaceId)) throw bootstrapError ?? new Error('Invalid workspace response.')

      const { data: remoteWorkspace, error: workspaceError } = await client
        .from('workspaces')
        .select('id, name, timezone, owner_user_id')
        .eq('id', remoteWorkspaceId)
        .single()
      if (workspaceError || !remoteWorkspace || !isUuid(remoteWorkspace.id)) throw workspaceError ?? new Error('Workspace unavailable.')

      await createRemoteWorkspace({
        id: remoteWorkspace.id,
        name: remoteWorkspace.name,
        timezone: remoteWorkspace.timezone,
        ownerUserId: remoteWorkspace.owner_user_id
      })
      setMessage('Your private cloud workspace is ready. The fictional starter data was not copied.')
    } catch {
      setMessage('Your cloud workspace could not be prepared. No local planning data was changed.')
    } finally {
      setBusy(false)
    }
  }

  async function signOutOnThisDevice() {
    if (!client || (usingCloudWorkspace && !signOutAcknowledged)) return
    setBusy(true)
    setMessage(undefined)
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
      if (usingCloudWorkspace) {
        await removeLocalCloudWorkspace(workspace.id)
        setMessage('You are signed out. The cloud workspace was removed from this device; the fictional starter workspace remains separate.')
      } else {
        setMessage('You are signed out on this device. Your separate local starter workspace was not changed.')
      }
    } catch {
      setMessage('Sign-out could not finish. No local planning data was removed.')
    } finally {
      setBusy(false)
    }
  }

  const usingCloudWorkspace = workspace.ownerUserId !== 'local-device-owner'
  const unsyncedChanges = (sync?.queued ?? 0) + (sync?.retrying ?? 0) + (sync?.blocked ?? 0)

  return (
    <section aria-labelledby="cloud-account-title" className="animate-enter space-y-5">
      <div className="rounded-3xl border border-[var(--rm-teal)]/20 bg-[linear-gradient(135deg,rgba(91,213,203,0.12),rgba(16,29,48,0.96)_65%)] p-5 shadow-[var(--rm-shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-teal)]">Private cloud workspace</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white" id="cloud-account-title">Keep new planning work in sync.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Your existing fictional starter workspace remains on this device. Signing in creates a separate UUID-backed workspace for new planning data; nothing is copied automatically.</p>
      </div>

      {message ? <p aria-live="polite" className="rounded-2xl border border-white/[0.1] bg-[var(--rm-surface)] px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      {auth.status === 'unavailable' ? (
        <section className="rounded-3xl border border-[var(--rm-gold)]/20 bg-[var(--rm-gold)]/[0.07] p-5">
          <h3 className="text-sm font-semibold text-[var(--rm-gold)]">Cloud setup is unavailable in this build.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">The browser-safe Supabase configuration is missing, so this device remains local-only.</p>
        </section>
      ) : auth.status === 'loading' ? (
        <p className="text-sm text-slate-400">Checking your secure session…</p>
      ) : auth.status === 'signed_out' ? (
        <form className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5" onSubmit={(event) => { event.preventDefault(); void sendSignInLink() }}>
          <h3 className="text-sm font-semibold text-white">Sign in with email</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">We’ll send a secure sign-in link using the temporary Supabase sender approved for this private beta.</p>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="email">Email address</label>
          <input autoComplete="email" className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.12] bg-[var(--rm-ink)] px-4 text-base text-white outline-none ring-[var(--rm-teal)] transition focus:ring-2" id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          <button className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy || !email.trim()} type="submit">Send secure sign-in link</button>
        </form>
      ) : usingCloudWorkspace ? (
        <section className="rounded-3xl border border-[var(--rm-teal)]/20 bg-[var(--rm-teal)]/[0.06] p-5">
          <h3 className="text-sm font-semibold text-[var(--rm-teal)]">Cloud workspace active</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Signed in as {auth.user?.email ?? 'your account'}. New records in “{workspace.name}” use the authenticated sync path.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-[var(--rm-teal)]/35 px-4 text-sm font-semibold text-[var(--rm-teal)]" to="/tools/sync-status">Open sync status</Link>
        </section>
      ) : (
        <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
          <h3 className="text-sm font-semibold text-white">Create your private cloud workspace</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Signed in as {auth.user?.email ?? 'your account'}. This creates one owner-only workspace and switches this browser to it. The current fictional workspace is preserved and is not uploaded.</p>
          <button className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--rm-teal)] px-4 text-sm font-semibold text-[var(--rm-ink)] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => void preparePrivateWorkspace()} type="button">Create private cloud workspace</button>
        </section>
      )}

      {auth.status === 'signed_in' ? <section className="rounded-3xl border border-white/[0.08] bg-[var(--rm-surface)] p-5">
        <h3 className="text-sm font-semibold text-white">Sign out on this device</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{usingCloudWorkspace ? 'Signing out removes this browser’s cloud-workspace copy only after the local session is cleared. It does not delete the remote workspace or your account.' : 'Your separate local starter workspace stays on this device.'}</p>
        {usingCloudWorkspace && unsyncedChanges ? <div className="mt-4 rounded-2xl border border-[var(--rm-gold)]/20 bg-[var(--rm-gold)]/[0.07] p-4">
          <p className="text-sm font-semibold text-[var(--rm-gold)]">{unsyncedChanges} local change{unsyncedChanges === 1 ? '' : 's'} still need attention.</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Sync first if you want to keep them in the cloud. Otherwise, remove this device’s cloud copy explicitly.</p>
          <Link className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--rm-teal)]" to="/tools/sync-status">Review sync status</Link>
        </div> : null}
        {usingCloudWorkspace ? <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/[0.08] p-3 text-sm leading-5 text-slate-300">
          <input checked={signOutAcknowledged} className="mt-0.5 h-4 w-4 accent-[var(--rm-teal)]" onChange={(event) => setSignOutAcknowledged(event.target.checked)} type="checkbox" />
          <span>I understand that this removes the cloud workspace data stored in this browser after I sign out.</span>
        </label> : null}
        <button className="mt-4 min-h-12 w-full rounded-2xl border border-white/[0.14] px-4 text-sm font-semibold text-slate-100 transition hover:border-[var(--rm-teal)]/45 hover:text-[var(--rm-teal)] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || (usingCloudWorkspace && !signOutAcknowledged)} onClick={() => void signOutOnThisDevice()} type="button">
          {busy ? 'Signing out…' : usingCloudWorkspace ? 'Sign out and remove this device copy' : 'Sign out on this device'}
        </button>
      </section> : null}

      <p className="text-xs leading-5 text-slate-500">RM Calendar is independent and is not affiliated with The Church of Jesus Christ of Latter-day Saints. Do not enter official Church records or confidential information.</p>
    </section>
  )
}
