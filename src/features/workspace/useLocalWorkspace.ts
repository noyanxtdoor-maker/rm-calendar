import { useContext } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadWorkspaceSnapshot } from '../../data/local/queries'
import { LocalWorkspaceContext } from './LocalWorkspaceContext'

export function useLocalWorkspace() {
  const context = useContext(LocalWorkspaceContext)
  if (!context) {
    throw new Error('useLocalWorkspace must be used inside LocalWorkspaceProvider.')
  }

  return context
}

export function useWorkspaceSnapshot() {
  const { workspace } = useLocalWorkspace()
  return useLiveQuery(() => loadWorkspaceSnapshot(workspace.id), [workspace.id])
}
