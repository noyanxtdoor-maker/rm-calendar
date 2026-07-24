import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type SupabaseAuthContextValue = {
  status: 'unavailable' | 'loading' | 'signed_out' | 'signed_in'
  session?: Session
  user?: User
  error?: string
}

export const SupabaseAuthContext = createContext<SupabaseAuthContextValue>({ status: 'loading' })
