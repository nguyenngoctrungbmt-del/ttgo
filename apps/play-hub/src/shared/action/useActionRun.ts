import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import type { GameId } from '../../data/games'
import { actionInfo } from '../../games/registry'
import { useProgressStore, type ActionRunResult } from '../../store/progressStore'
import { haptic } from '../haptics'
import { useMissionRun } from '../missions/useMissionRun'
import { sfx } from '../sound'

export type RunEnd = {
  score: number
  cleared: boolean
  /** Mission stats for this run (score is added automatically). */
  stats: Record<string, number>
  /** Coins earned this run. */
  coins: number
}

export type RunStage = 'none' | 'continue' | 'result'

/**
 * One hook per action game. Handles missions, analytics, playtime, coins,
 * permanent upgrade levels, the ad-revive "Continue?" step and the result.
 *
 *   const run = useActionRun('jetpack')
 *   run.begin()                       // when a run starts
 *   run.update(stats)                 // whenever stats change (live mission banners)
 *   run.end(endData, () => revive())  // on death; pass a revive callback to offer Continue
 *   run.level('magnet')               // permanent upgrade level (0..max)
 */
export function useActionRun(game: GameId) {
  const missions = useMissionRun(game)
  const commitActionRun = useProgressStore((s) => s.commitActionRun)
  const upgrades = useProgressStore((s) => s.upgrades)
  const levelRecord = useProgressStore((s) => s.levelProgress[game])
  const completeLevelStore = useProgressStore((s) => s.completeLevel)
  const [stage, setStage] = useState<RunStage>('none')
  const [pending, setPending] = useState<RunEnd | null>(null)
  const [result, setResult] = useState<(ActionRunResult & RunEnd) | null>(null)
  const [reviveBusy, setReviveBusy] = useState(false)
  const [reviveNote, setReviveNote] = useState<string | null>(null)

  const activeRef = useRef(false)
  const segmentStart = useRef(0)
  const seconds = useRef(0)
  const revived = useRef(false)
  const reviveCb = useRef<(() => void) | null>(null)
  const pendingRef = useRef<RunEnd | null>(null)

  const level = useCallback((id: string) => upgrades[`${game}:${id}`] ?? 0, [game, upgrades])

  const begin = useCallback(() => {
    missions.begin()
    activeRef.current = true
    segmentStart.current = performance.now()
    seconds.current = 0
    revived.current = false
    pendingRef.current = null
    setPending(null)
    setResult(null)
    setReviveNote(null)
    setStage('none')
    const owned = (actionInfo(game)?.upgrades ?? []).reduce((s, u) => s + (upgrades[`${game}:${u.id}`] ?? 0), 0)
    void trackEvent('action_start', { game_id: game, upgrade_levels: owned })
  }, [game, missions, upgrades])

  const commit = useCallback(
    (data: RunEnd) => {
      activeRef.current = false
      pendingRef.current = null
      const r = commitActionRun(game, {
        score: data.score,
        cleared: data.cleared,
        stats: data.stats,
        coins: data.coins,
        seconds: seconds.current,
        revived: revived.current,
      })
      setResult({ ...r, ...data })
      setPending(null)
      setStage('result')
      if (r.daily) {
        sfx.mission()
        haptic.success()
      }
    },
    [commitActionRun, game],
  )

  const end = useCallback(
    (data: RunEnd, onRevive?: () => void) => {
      if (!activeRef.current) return
      seconds.current += (performance.now() - segmentStart.current) / 1000
      missions.update({ ...data.stats, score: data.score })
      if (onRevive && !revived.current) {
        reviveCb.current = onRevive
        pendingRef.current = data
        setPending(data)
        setReviveNote(null)
        setStage('continue')
      } else {
        commit(data)
      }
    },
    [commit, missions],
  )

  const decline = useCallback(() => {
    const data = pendingRef.current
    if (data) commit(data)
  }, [commit])

  const revive = useCallback(async () => {
    if (reviveBusy || !pendingRef.current) return
    setReviveBusy(true)
    setReviveNote(null)
    try {
      // Web build has no ads: the one revive per run is free.
      revived.current = true
      pendingRef.current = null
      setPending(null)
      setStage('none')
      segmentStart.current = performance.now()
      void trackEvent('action_revive', { game_id: game })
      sfx.power()
      haptic.success()
      reviveCb.current?.()
    } finally {
      setReviveBusy(false)
    }
  }, [game, reviveBusy])

  // Leaving mid-run: keep a pending result and log the quit.
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        const data = pendingRef.current
        commitActionRun(game, { ...data, seconds: seconds.current, revived: revived.current })
      } else if (activeRef.current) {
        const secs = seconds.current + (performance.now() - segmentStart.current) / 1000
        void trackEvent('action_quit', { game_id: game, duration_s: Math.round(secs) })
      }
    }
  }, [commitActionRun, game])

  /** Persist a cleared level right away (not only at run end). */
  const completeLevel = useCallback((level: number, stars: number) => completeLevelStore(game, level, stars), [completeLevelStore, game])

  return {
    game,
    level,
    begin,
    update: missions.update,
    end,
    revive,
    decline,
    stage,
    pending,
    result,
    reviveBusy,
    reviveNote,
    canRevive: !revived.current,
    /** Level-based games: highest cleared level, next level to play, best stars per level. */
    clearedLevels: levelRecord?.cleared ?? 0,
    nextLevel: (levelRecord?.cleared ?? 0) + 1,
    levelStars: (level: number) => levelRecord?.stars[level - 1] ?? 0,
    completeLevel,
    toast: missions.toast,
  }
}

export type ActionRun = ReturnType<typeof useActionRun>
