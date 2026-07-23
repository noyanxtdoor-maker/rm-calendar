export type SupabaseEnvironment = {
  url: string
  publishableKey: string
}

export type SupabaseEnvironmentState =
  | { kind: 'not_configured' }
  | { kind: 'misconfigured'; message: string }
  | { kind: 'configured'; value: SupabaseEnvironment }

type EnvironmentSource = Record<string, string | boolean | undefined>

function optionalText(value: string | boolean | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/**
 * Reads only browser-safe Supabase configuration. A service-role key is never
 * accepted here: Vite exposes VITE_* values to every browser session.
 */
export function resolveSupabaseEnvironment(source: EnvironmentSource): SupabaseEnvironmentState {
  const url = optionalText(source.VITE_SUPABASE_URL)
  const publishableKey = optionalText(source.VITE_SUPABASE_PUBLISHABLE_KEY)

  if (!url && !publishableKey) {
    return { kind: 'not_configured' }
  }

  if (!url || !publishableKey) {
    return {
      kind: 'misconfigured',
      message: 'Remote sync stays off until both the Supabase URL and publishable key are configured.'
    }
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      return {
        kind: 'misconfigured',
        message: 'The Supabase URL must use HTTPS outside local development.'
      }
    }
  } catch {
    return {
      kind: 'misconfigured',
      message: 'The configured Supabase URL is not valid.'
    }
  }

  return {
    kind: 'configured',
    value: { url, publishableKey }
  }
}

export function currentSupabaseEnvironment(): SupabaseEnvironmentState {
  return resolveSupabaseEnvironment(import.meta.env)
}
