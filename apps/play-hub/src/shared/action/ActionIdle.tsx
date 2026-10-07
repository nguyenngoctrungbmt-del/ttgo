import { useState } from 'react'
import { dailyChallenges } from '../../data/dailyAction'
import { getGame, type GameId } from '../../data/games'
import GameCover from '../GameCover'
import { actionInfo } from '../../games/registry'
import { useProgressStore } from '../../store/progressStore'
import GameMissions from '../missions/GameMissions'
import GameUpgrades from './GameUpgrades'
import LevelMap from './LevelMap'
import './action.css'

type Props = {
  game: GameId
  icon: string
  title: string
  hint: string
  /** Level-based games receive the level to start (next unlocked, or one picked on the map). */
  onPlay: (level?: number) => void
}

function formatPlaytime(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

/** Attract screen for canvas action games: title, best, daily challenge, missions/upgrades, Play. */
export default function ActionIdle({ game, icon, title, hint, onPlay }: Props) {
  const stats = useProgressStore((s) => s.games[game])
  const coins = useProgressStore((s) => s.coins)
  const done = useProgressStore((s) => s.dailyActionDoneToday)()
  const info = actionInfo(game)
  const hasUpgrades = (info?.upgrades.length ?? 0) > 0
  const levelBased = Boolean(info?.levels)
  const nextLevel = useProgressStore((s) => (s.levelProgress[game]?.cleared ?? 0) + 1)
  const [tab, setTab] = useState<'levels' | 'missions' | 'upgrades'>(levelBased ? 'levels' : 'missions')
  const daily = dailyChallenges().find((c) => c.game === game)
  const best = stats?.bestScore ?? 0

  return (
    <div className="action-idle">
      <GameCover game={{ ...getGame(game), icon }} className="action-idle__icon" />
      <h2 className="action-idle__title">{title}</h2>
      <p className="action-idle__hint">{hint}</p>
      <div className="action-idle__chips">
        {best > 0 ? <span className="action-idle__best">Best {best}</span> : null}
        <span className="action-idle__chip">🪙 {coins}</span>
        {stats?.seconds ? <span className="action-idle__chip">⏱ {formatPlaytime(stats.seconds)}</span> : null}
      </div>
      {daily ? (
        <div className={`action-idle__daily${done.includes(game) ? ' is-done' : ''}`}>
          {done.includes(game) ? '✔ Daily challenge done' : `⭐ Daily: ${daily.label} · +${daily.xp} XP +${daily.coins} 🪙`}
        </div>
      ) : null}
      <button type="button" className="btn btn-primary btn-play" onClick={() => (levelBased ? onPlay(nextLevel) : onPlay())}>
        {levelBased ? `Play · Level ${nextLevel}` : 'Play'}
      </button>
      {hasUpgrades || levelBased ? (
        <div className="action-idle__tabs" role="tablist" onPointerDown={(e) => e.stopPropagation()}>
          {levelBased ? (
            <button type="button" role="tab" aria-selected={tab === 'levels'} className={tab === 'levels' ? 'is-on' : ''} onClick={() => setTab('levels')}>
              🗺 Levels
            </button>
          ) : null}
          <button type="button" role="tab" aria-selected={tab === 'missions'} className={tab === 'missions' ? 'is-on' : ''} onClick={() => setTab('missions')}>
            🎯 Missions
          </button>
          {hasUpgrades ? (
            <button type="button" role="tab" aria-selected={tab === 'upgrades'} className={tab === 'upgrades' ? 'is-on' : ''} onClick={() => setTab('upgrades')}>
              ⚡ Upgrades
            </button>
          ) : null}
        </div>
      ) : null}
      {tab === 'levels' && levelBased ? (
        <LevelMap game={game} onPick={(lv) => onPlay(lv)} />
      ) : tab === 'upgrades' && hasUpgrades ? (
        <GameUpgrades game={game} />
      ) : (
        <GameMissions game={game} />
      )}
    </div>
  )
}
