import Repository from '../lib/repository.js'

const _instances = new Map()

export function initRepository (dataDir) {
  const key = dataDir || './data'
  if (!_instances.has(key)) {
    _instances.set(key, new Repository(key))
  }
  return _instances.get(key)
}

export function getRepository (dataDir) {
  const key = dataDir || './data'
  if (_instances.has(key)) {
    return _instances.get(key)
  }
  // Fallback: if no explicit "./data" key exists, return any initialized instance (useful for tests)
  if (_instances.size > 0) {
    return _instances.values().next().value
  }
  throw new Error(`Repository not initialized for "${key}". Call initRepository("${key}") first.`)
}

export function resetForTesting (dataDir) {
  const key = dataDir || './data'
  _instances.delete(key)
}
