const memory = new Map<string, string>()

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key) ?? memory.get(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // blocked storage or corrupt data
  }
  return fallback
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    localStorage.setItem(key, raw)
  } catch {
    // private mode / quota
  }
}
