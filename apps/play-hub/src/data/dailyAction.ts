import { ACTION_INFOS } from '../games/registry'
import { todayKey } from '../shared/date'
import type { GameId } from './games'

export type DailyChallenge = {
  game: GameId
  stat: string
  target: number
  label: string
  xp: number
  coins: number
}

export const DAILY_ACTION_COUNT = 3

function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

/** Three action games a day, each with a single-run target drawn from its missions. */
export function dailyChallenges(date = new Date()): DailyChallenge[] {
  const rand = seeded(`action:${todayKey(date)}`)
  const pool = ACTION_INFOS.filter((i) => i.missions.some((m) => m[2] === 'run'))
  const picks: DailyChallenge[] = []
  const used = new Set<number>()
  while (picks.length < Math.min(DAILY_ACTION_COUNT, pool.length)) {
    const idx = Math.floor(rand() * pool.length)
    if (used.has(idx)) continue
    used.add(idx)
    const info = pool[idx]
    // Early/mid-tier run missions make a fair one-sitting goal.
    const runs = info.missions.slice(0, 6).filter((m) => m[2] === 'run')
    const row = runs[Math.floor(rand() * runs.length)]
    picks.push({ game: info.meta.id, stat: row[0], target: row[1], label: row[3], xp: 60, coins: 60 })
  }
  return picks
}
