import { useMemo, useState } from 'react'
import type { GameId } from '../../data/games'
import { TIER_LABELS } from '../../data/missions'
import { buildMissionBoard, useProgressStore } from '../../store/progressStore'
import { haptic } from '../haptics'
import { sfx } from '../sound'
import './missions.css'

type Props = {
  game: GameId
  /** Mission ids completed in the run that just ended — get a highlight. */
  fresh?: string[]
  compact?: boolean
}

/** Mission tier card: progress bars + inline claim buttons. */
export default function GameMissions({ game, fresh = [], compact = false }: Props) {
  const progress = useProgressStore((s) => s.missionProgress)
  const claimed = useProgressStore((s) => s.missionClaimed)
  const claimMission = useProgressStore((s) => s.claimMission)
  const board = useMemo(() => buildMissionBoard(game, progress, claimed), [game, progress, claimed])
  const [gain, setGain] = useState<{ id: string; xp: number } | null>(null)

  if (board.views.length === 0) return null

  function onClaim(id: string) {
    const xp = claimMission(id)
    if (xp > 0) {
      sfx.power()
      haptic.success()
      setGain({ id, xp })
      window.setTimeout(() => setGain(null), 1200)
    }
  }

  return (
    <section
      className={`missions${compact ? ' is-compact' : ''}`}
      aria-label="Missions"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="missions__head">
        <span className="missions__title">🎯 Missions</span>
        <span className="missions__tier">
          {board.allDone
            ? 'All tiers cleared 🏆'
            : `Tier ${TIER_LABELS[board.tier - 1] ?? board.tier} / ${TIER_LABELS[board.tiers - 1] ?? board.tiers}`}
        </span>
      </header>
      <ul className="missions__list">
        {board.views.map((v) => {
          const pct = Math.round((v.progress / v.mission.target) * 100)
          const isFresh = fresh.includes(v.mission.id)
          return (
            <li
              key={v.mission.id}
              className={`mission${v.complete ? ' is-complete' : ''}${v.claimed ? ' is-claimed' : ''}${
                isFresh ? ' is-fresh' : ''
              }`}
            >
              <span className="mission__check" aria-hidden>
                {v.claimed ? '✔' : v.complete ? '★' : '•'}
              </span>
              <div className="mission__body">
                <div className="mission__row">
                  <span className="mission__label">{v.mission.label}</span>
                  <span className="mission__count">
                    {v.mission.mode === 'total' ? `${v.progress}/${v.mission.target}` : v.complete ? 'Done' : `best ${v.progress}`}
                  </span>
                </div>
                <div className="mission__bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
              {v.complete && !v.claimed ? (
                <button type="button" className="btn btn-primary mission__claim" onClick={() => onClaim(v.mission.id)}>
                  +{v.mission.xp} XP
                </button>
              ) : (
                <span className="mission__xp">{gain?.id === v.mission.id ? `+${gain.xp}!` : `${v.mission.xp} XP`}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** In-run banner that drops in when a mission is completed. */
export function MissionToast({ toast }: { toast: { key: number; text: string } | null }) {
  if (!toast) return null
  return (
    <div className="mission-toast" key={toast.key} role="status">
      <span className="mission-toast__kicker">Mission complete</span>
      <span className="mission-toast__text">{toast.text}</span>
    </div>
  )
}
