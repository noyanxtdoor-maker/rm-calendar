import { describe, expect, it, vi } from 'vitest'
import { inspectLocalStoragePersistence, requestPersistentLocalStorage } from './browserStorage'

describe('browser storage persistence', () => {
  it('does not promise persistence when browser APIs are unavailable', async () => {
    await expect(inspectLocalStoragePersistence(undefined)).resolves.toEqual({ supported: false, persistent: false })
    await expect(requestPersistentLocalStorage(undefined)).resolves.toEqual({ supported: false, persistent: false })
  })

  it('reports browser persistence and a best-effort estimate without treating it as a backup', async () => {
    const manager = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
      estimate: vi.fn().mockResolvedValue({ usage: 512, quota: 4096 })
    }

    await expect(inspectLocalStoragePersistence(manager)).resolves.toEqual({
      supported: true,
      persistent: false,
      usage: 512,
      quota: 4096
    })

    await expect(requestPersistentLocalStorage(manager)).resolves.toEqual({
      supported: true,
      persistent: true,
      usage: 512,
      quota: 4096
    })
  })

  it('makes a persistence failure explicit without throwing away local data', async () => {
    const manager = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockRejectedValue(new Error('Denied'))
    }

    await expect(requestPersistentLocalStorage(manager)).resolves.toEqual({
      supported: true,
      persistent: false,
      requestFailed: true
    })
  })
})
