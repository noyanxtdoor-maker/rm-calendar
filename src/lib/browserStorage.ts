export type BrowserStorageManager = {
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
  estimate?: () => Promise<{ usage?: number; quota?: number }>
}

export type LocalStoragePersistenceReport = {
  supported: boolean
  persistent: boolean
  usage?: number
  quota?: number
  requestFailed?: boolean
}

function browserStorageManager(): BrowserStorageManager | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  return navigator.storage as BrowserStorageManager | undefined
}

export async function inspectLocalStoragePersistence(
  manager: BrowserStorageManager | undefined = browserStorageManager()
): Promise<LocalStoragePersistenceReport> {
  if (!manager?.persisted) {
    return { supported: false, persistent: false }
  }

  try {
    const [persistent, estimate] = await Promise.all([
      manager.persisted(),
      manager.estimate ? manager.estimate() : undefined
    ])
    return {
      supported: typeof manager.persist === 'function',
      persistent,
      usage: estimate?.usage,
      quota: estimate?.quota
    }
  } catch {
    return { supported: false, persistent: false, requestFailed: true }
  }
}

export async function requestPersistentLocalStorage(
  manager: BrowserStorageManager | undefined = browserStorageManager()
): Promise<LocalStoragePersistenceReport> {
  if (!manager?.persist || !manager.persisted) {
    return { supported: false, persistent: false }
  }

  try {
    const persistent = await manager.persist()
    const report = await inspectLocalStoragePersistence(manager)
    return { ...report, persistent: persistent || report.persistent }
  } catch {
    return { supported: true, persistent: false, requestFailed: true }
  }
}
