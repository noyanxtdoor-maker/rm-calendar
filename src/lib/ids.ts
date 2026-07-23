export function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('This browser cannot create secure local IDs.')
  }

  return globalThis.crypto.randomUUID()
}
