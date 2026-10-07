import { useEffect, useMemo, useState } from 'react'
import { ResultPlayCta } from '../playStore'
import { Link } from 'react-router-dom'
import { dailyChallenges } from '../../data/dailyAction'
import type { GameId, GameMeta } from '../../data/games'
import { ACTION_INFOS } from '../../games/registry'
import { buildMissionBoard, useProgressStore } from '../../store/progressStore'
import CelebrateBurst from '../CelebrateBurst'
import GameCover from '../GameCover'
import GameMissions from '../missions/GameMissions'
import type { ActionRun } from './useActionRun'
import './result.css'

const CONTINUE_SECONDS = 7

type Props = {
  run: ActionRun
  title: string
  subtitle?: string
  celebrate?: boolean
  onPlayAgain: () => void
}

function useNextGame(current: GameId): { game: GameMeta; reason: string } | null {
  const games = useProgressStore((s) => s.games)
  const progress = useProgressStore((s) => s.missionProgress)
  const claimed = useProgressStore((s) => s.missionClaimed)
  const done = useProgressStore((s) => s.dailyActionDoneToday)()
  return useMemo(() => {
    const others = ACTION_INFOS.filter((i) => i.meta.id !== current)
    if (others.length === 0) return null
    const daily = dailyChallenges().find((c) => c.game !== current && !done.includes(c.game))
    if (daily) {
      const info = others.find((i) => i.meta.id === daily.game)
      if (info) return { game: info.meta, reason: `Daily challenge · ${daily.label}` }
    }
    const ready = others.find((i) => buildMissionBoard(i.meta.id, progress, claimed).ready > 0)
    if (ready) return { game: ready.meta, reason: 'Mission reward waiting' }
    const fresh = [...others].sort((a, b) => (games[a.meta.id]?.plays ?? 0) - (games[b.meta.id]?.plays ?? 0))[0]
    return { game: fresh.meta, reason: (games[fresh.meta.id]?.plays ?? 0) === 0 ? 'Not played yet' : 'Try this next' }
  }, [current, games, progress, claimed, done])
}

/** "Continue?" (ad revive) step, then the full run result for action games. */
export default function ActionResult({ run, title, subtitle, celebrate = false, onPlayAgain }: Props) {
  const next = useNextGame(run.game)
  const [left, setLeft] = useState(CONTINUE_SECONDS)

  useEffect(() => {
    if (run.stage !== 'continue') return
    setLeft(CONTINUE_SECONDS)
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [run.stage])

  useEffect(() => {
    if (run.stage === 'continue' && left <= 0 && !run.reviveBusy) run.decline()
  }, [left, run])

  if (run.stage === 'none') return null

  if (run.stage === 'continue') {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-label="Continue?" onPointerDown={(e) => e.stopPropagation()}>
        <div className="overlay-card panel run-continue">
          <h2>Continue?</h2>
          <p>Score {run.pending?.score ?? 0}</p>
          <div className="run-continue__ring" style={{ ['--k' as string]: Math.max(0, left) / CONTINUE_SECONDS }}>
            <span>{Math.max(0, left)}</span>
          </div>
          <button type="button" className="btn btn-warm run-continue__ad" disabled={run.reviveBusy} onClick={() => void run.revive()}>
            ▶ Revive
          </button>
          {run.reviveNote ? <p className="run-continue__note">{run.reviveNote}</p> : null}
          <button type="button" className="btn btn-ghost" onClick={run.decline}>
            No thanks
          </button>
        </div>
      </div>
    )
  }

  const r = run.result
  return (
    <div className={`overlay${celebrate ? ' is-celebrate' : ''}`} role="dialog" aria-modal="true" aria-label={title} onPointerDown={(e) => e.stopPropagation()}>
      {celebrate || r?.newBest ? <CelebrateBurst /> : null}
      <div className="overlay-card panel run-result">
        <h2>{title}</h2>
        {subtitle ? <p className="run-result__sub">{subtitle}</p> : null}
        <div className="run-result__chips">
          {r?.newBest ? <span className="run-chip is-best">🏆 New best!</span> : <span className="run-chip">Best {Math.max(r?.prevBest ?? 0, r?.score ?? 0)}</span>}
          {r && r.coins > 0 ? <span className="run-chip is-coin">+{r.coins} 🪙</span> : null}
        </div>
        {r?.daily ? (
          <div className="run-daily">
            ⭐ Daily challenge complete! <strong>+{r.daily.xp} XP · +{r.daily.coins} 🪙</strong>
          </div>
        ) : null}
        <GameMissions game={run.game} fresh={r?.fresh ?? []} compact />
        {next ? (
          <Link to={next.game.path} className="run-next">
            <GameCover game={next.game} className="run-next__icon" />
            <span className="run-next__copy">
              <strong>Up next: {next.game.title}</strong>
              <span>{next.reason}</span>
            </span>
            <span className="run-next__go">›</span>
          </Link>
        ) : null}
        <div className="overlay-actions">
          <button type="button" className="btn btn-primary" onClick={() => onPlayAgain()}>
            Play again
          </button>
          <ResultPlayCta />
        </div>
      </div>
    </div>
  )
}
