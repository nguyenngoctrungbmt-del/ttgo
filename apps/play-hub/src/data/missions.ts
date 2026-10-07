import type { GameId } from './games'
import { ACTION_INFOS } from '../games/registry'

/**
 * Per-game missions. `run` = reach the target inside a single run;
 * `total` = accumulate across every run. Missions unlock in tiers of three:
 * claim all three to reveal the next tier.
 */
export type MissionMode = 'run' | 'total'

export type MissionDef = {
  id: string
  game: GameId
  stat: string
  target: number
  mode: MissionMode
  label: string
  xp: number
  tier: number
}

type Row = [stat: string, target: number, mode: MissionMode, label: string, xp: number]

export const MISSIONS_PER_TIER = 3

function define(game: GameId, rows: Row[]): MissionDef[] {
  return rows.map(([stat, target, mode, label, xp], i) => ({
    id: `${game}:${i}`,
    game,
    stat,
    target,
    mode,
    label,
    xp,
    tier: Math.floor(i / MISSIONS_PER_TIER) + 1,
  }))
}

const ALL: MissionDef[] = ACTION_INFOS.flatMap((i) => define(i.meta.id, i.missions))

export function missionsFor(game: GameId): MissionDef[] {
  return ALL.filter((m) => m.game === game)
}

export function getMission(id: string): MissionDef | undefined {
  return ALL.find((m) => m.id === id)
}

export function gamesWithMissions(): GameId[] {
  return Array.from(new Set(ALL.map((m) => m.game)))
}

export const TIER_LABELS = ['I', 'II', 'III', 'IV', 'V']
