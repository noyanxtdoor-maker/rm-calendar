import { describe, expect, it } from 'vitest'
import { resolveSupabaseEnvironment } from './supabaseEnvironment'

describe('resolveSupabaseEnvironment', () => {
  it('keeps remote sync disabled when no browser configuration exists', () => {
    expect(resolveSupabaseEnvironment({})).toEqual({ kind: 'not_configured' })
  })

  it('rejects a partial configuration without exposing a key value', () => {
    expect(resolveSupabaseEnvironment({ VITE_SUPABASE_URL: 'https://example.supabase.co' })).toEqual({
      kind: 'misconfigured',
      message: 'Remote sync stays off until both the Supabase URL and publishable key are configured.'
    })
  })

  it('accepts a dedicated HTTPS project URL with a publishable browser key', () => {
    expect(
      resolveSupabaseEnvironment({
        VITE_SUPABASE_URL: 'https://rm-calendar.example.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'example-public-browser-key'
      })
    ).toEqual({
      kind: 'configured',
      value: {
        url: 'https://rm-calendar.example.supabase.co',
        publishableKey: 'example-public-browser-key'
      }
    })
  })

  it('allows localhost only for local Supabase development', () => {
    expect(
      resolveSupabaseEnvironment({
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'local-anon-key'
      }).kind
    ).toBe('configured')
  })
})
