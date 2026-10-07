import { useSyncExternalStore, type ComponentType } from 'react'
import type { GameId } from '../data/games'

/**
 * Vector cover art per game (120×120 SVG). The components live in a separate chunk so the
 * app shell boots fast; until it arrives, cards show the game's emoji icon.
 */
export const COVERS: Partial<Record<GameId, ComponentType>> = {}

let ready = false
let pending: Promise<void> | null = null
const listeners = new Set<() => void>()

export function loadCovers(): Promise<void> {
  if (!pending) {
    pending = import('./coverMap')
      .then((m) => {
        Object.assign(COVERS, m.COVER_MAP)
        ready = true
        listeners.forEach((fn) => fn())
      })
      .catch(() => {
        // Keep emoji fallbacks; allow a later retry.
        pending = null
      })
  }
  return pending
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Re-renders the caller once cover art has loaded. */
export function useCoversReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready, () => ready)
}
