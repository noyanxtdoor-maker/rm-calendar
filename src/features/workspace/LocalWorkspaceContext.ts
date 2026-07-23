import { createContext } from 'react'
import type { WorkspaceRecord } from '../../domain/models'

export type LocalWorkspaceContextValue = {
  workspace: WorkspaceRecord
  restoreWorkspace: () => Promise<void>
}

export const LocalWorkspaceContext = createContext<LocalWorkspaceContextValue | undefined>(undefined)
