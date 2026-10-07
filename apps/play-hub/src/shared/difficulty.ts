/** Shared progressive-difficulty + scoring helpers for arcade mini-games. */

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Shrink a per-round time budget as level rises. */
export function roundLimit(
  baseSec: number,
  level: number,
  floorSec: number,
  stepSec = 0.08,
): number {
  return clamp(baseSec - (level - 1) * stepSec, floorSec, baseSec)
}

/** Base points + streak bonus. Pass streak BEFORE incrementing. */
export function streakScore(
  base: number,
  streak: number,
  { cap = 8, per = 2 }: { cap?: number; per?: number } = {},
): number {
  return base + Math.min(Math.max(streak, 0), cap) * per
}

/** Hide / spawn windows that get tighter with level. */
export function paceMs(
  baseMs: number,
  level: number,
  floorMs: number,
  stepMs = 35,
): number {
  return Math.round(clamp(baseMs - (level - 1) * stepMs, floorMs, baseMs))
}

/** Combo label for UI (empty under 2). */
export function comboLabel(combo: number): string | undefined {
  if (combo >= 8) return 'INSANE'
  if (combo >= 5) return 'HOT'
  if (combo >= 3) return 'COMBO'
  return undefined
}
