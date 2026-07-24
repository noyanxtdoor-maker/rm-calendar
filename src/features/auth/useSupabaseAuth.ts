import { useContext } from 'react'
import { SupabaseAuthContext } from './SupabaseAuthContext'

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext)
}
