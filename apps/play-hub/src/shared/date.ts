export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function yesterdayKey(date = new Date()): string {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

/** Week key (Mon-start): YYYY-Www */
export function weekKey(date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  d.setDate(d.getDate() - day)
  const y = d.getFullYear()
  const start = new Date(y, 0, 1)
  const week = Math.floor((d.getTime() - start.getTime()) / 86_400_000 / 7) + 1
  return `${y}-W${String(week).padStart(2, '0')}`
}

export function formatShortDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Stable daily pick from a list based on YYYY-MM-DD */
export function dailyIndex(length: number, date = new Date()): number {
  if (length <= 0) return 0
  const key = todayKey(date)
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return hash % length
}
