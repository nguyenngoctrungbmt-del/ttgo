import { useCallback, useRef, useState } from 'react'
import type { GameId } from '../../data/games'
import { buildMissionBoard, useProgressStore } from '../../store/progressStore'
import { haptic } from '../haptics'
import { sfx } from '../sound'

type Watch = { id: string; stat: string; need: number; label: string; done: boolean }

/**
 * Tracks the active mission tier during a run so the game can celebrate the
 * moment a mission is hit, then commits the run's stats when it ends.
 */
export function useMissionRun(game: GameId) {
  const reportRun = useProgressStore((s) => s.reportRun)
  const watchRef = useRef<Watch[]>([])
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null)
  const timerRef = useRef(0)

  const begin = useCallback(() => {
    const { missionProgress, missionClaimed } = useProgressStore.getState()
    const board = buildMissionBoard(game, missionProgress, missionClaimed)
    watchRef.current = board.allDone
      ? []
      : board.views
          .filter((v) => !v.complete)
          .map((v) => ({
            id: v.mission.id,
            stat: v.mission.stat,
            // Total missions only need the remainder this run.
            need: v.mission.mode === 'total' ? v.mission.target - v.progress : v.mission.target,
            label: v.mission.label,
            done: false,
          }))
    setToast(null)
  }, [game])

  /** Call whenever run stats change; fires the banner on first crossing. */
  const update = useCallback((stats: Record<string, number>) => {
    for (const w of watchRef.current) {
      if (w.done || (stats[w.stat] ?? 0) < w.need) continue
      w.done = true
      sfx.mission()
      haptic.success()
      window.clearTimeout(timerRef.current)
      setToast({ key: Date.now(), text: w.label })
      timerRef.current = window.setTimeout(() => setToast(null), 2200)
    }
  }, [])

  const finish = useCallback(
    (stats: Record<string, number>) => {
      update(stats)
      return reportRun(game, stats)
    },
    [game, reportRun, update],
  )

  return { begin, update, finish, toast }
}
