import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { currentSupabaseEnvironment } from './supabaseEnvironment'

let browserClient: SupabaseClient | undefined

/**
 * Returns the one browser client only when the public project configuration is
 * complete. The provider owns session persistence and token refresh; this app
 * never writes access or refresh tokens itself.
 */
export function configuredSupabaseClient() {
  const environment = currentSupabaseEnvironment()
  if (environment.kind !== 'configured') {
    return { environment, client: undefined }
  }

  browserClient ??= createClient(environment.value.url, environment.value.publishableKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  })
  return { environment, client: browserClient }
}
