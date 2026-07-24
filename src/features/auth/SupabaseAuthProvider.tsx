import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configuredSupabaseClient } from '../../data/sync/supabaseClient'
import { SupabaseAuthContext, type SupabaseAuthContextValue } from './SupabaseAuthContext'

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = configuredSupabaseClient()
  const [session, setSession] = useState<Session>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!configured.client) {
      return
    }

    let active = true
    void configured.client.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        if (sessionError) setError('Your account session could not be checked.')
        setSession(data.session ?? undefined)
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Your account session could not be checked.')
          setLoading(false)
        }
      })

    const { data: listener } = configured.client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession ?? undefined)
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [configured.client])

  const value: SupabaseAuthContextValue = !configured.client
    ? { status: 'unavailable' }
    : loading
      ? { status: 'loading' }
      : session?.user
        ? { status: 'signed_in', session, user: session.user, error }
        : { status: 'signed_out', error }

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
}
