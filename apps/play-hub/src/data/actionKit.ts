import type { GameMeta } from './games'
import type { MissionMode } from './missions'

/** [stat, target, mode, label, xp] — see missions.ts for semantics. */
export type MissionRow = [stat: string, target: number, mode: MissionMode, label: string, xp: number]

/**
 * Permanent per-game upgrade bought with coins. Level 0 = not owned.
 * Price of the next level = `cost * (level + 1) ^ 1.5`, rounded to 5.
 */
export type UpgradeDef = {
  id: string
  icon: string
  label: string
  /** What one level does, e.g. "+1 max heart". */
  desc: string
  max: number
  cost: number
}

/** Everything a self-contained action game declares about itself. */
export type ActionInfo = {
  meta: GameMeta
  missions: MissionRow[]
  upgrades: UpgradeDef[]
  /**
   * Level-based games: progress is saved, the idle screen shows a level map and Play
   * continues from the next unlocked level. `authored` = number of hand-designed levels
   * (levels beyond it are generated); `bossEvery` marks special nodes on the map.
   */
  levels?: { authored: number; bossEvery?: number }
}

export function upgradePrice(def: UpgradeDef, level: number): number {
  return Math.round((def.cost * Math.pow(level + 1, 1.5)) / 5) * 5
}
