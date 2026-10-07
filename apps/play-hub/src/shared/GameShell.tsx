import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GAMES, type GameId } from '../data/games'
import { useProgressStore } from '../store/progressStore'
import { isSoundMuted, setSoundMuted, unlockAudio } from './sound'
import ThemeToggle from './ThemeToggle'
import './GameShell.css'

type Stat = {
  label: string
  value: string | number
}

type GameShellProps = {
  title: string
  icon?: string
  howTo?: string[]
  stats?: Stat[]
  actions?: ReactNode
  children: ReactNode
}

function gameIdFromPath(pathname: string): GameId | null {
  const match = pathname.match(/^\/play\/([^/]+)/)
  if (!match) return null
  const id = match[1]
  return GAMES.some((g) => g.id === id) ? (id as GameId) : null
}

export default function GameShell({
  title,
  icon = '🎮',
  howTo = [],
  stats = [],
  actions,
  children,
}: GameShellProps) {
  const location = useLocation()
  const gameId = useMemo(() => gameIdFromPath(location.pathname), [location.pathname])
  const favorites = useProgressStore((s) => s.favorites)
  const toggleFavorite = useProgressStore((s) => s.toggleFavorite)
  const liked = gameId ? favorites.includes(gameId) : false
  const [helpOpen, setHelpOpen] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    setMuted(isSoundMuted())
  }, [])

  return (
    <div className="game-shell">
      <header className="game-shell__top">
        <div className="game-shell__heading">
          <Link to="/" className="btn btn-ghost game-shell__back">
            Hub
          </Link>
          <div className="game-shell__title-row">
            <span className="game-shell__icon" aria-hidden>
              {icon}
            </span>
            <h1 className="game-shell__title">{title}</h1>
          </div>
        </div>
        <div className="game-shell__actions">
          <ThemeToggle compact />
          {gameId && (
            <button
              type="button"
              className={`btn btn-ghost btn-icon${liked ? ' is-fav' : ''}`}
              aria-label={liked ? 'Remove favorite' : 'Add favorite'}
              onClick={() => toggleFavorite(gameId)}
            >
              {liked ? '♥' : '♡'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            onClick={() => {
              const next = !muted
              setSoundMuted(next)
              setMuted(next)
              if (!next) void unlockAudio()
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {howTo.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label="How to play"
              onClick={() => {
                void unlockAudio()
                setHelpOpen(true)
              }}
            >
              ?
            </button>
          )}
          {actions}
        </div>
      </header>

      {stats.length > 0 && (
        <div className="game-shell__meta">
          {stats.map((stat) => (
            <div className="stat-pill" key={stat.label}>
              <span>{stat.label}</span>
              {stat.value}
            </div>
          ))}
        </div>
      )}

      <div className="game-shell__body">{children}</div>

      {helpOpen && (
        <div className="howto-overlay" role="dialog" aria-modal="true" aria-labelledby="howto-title">
          <div className="howto-card panel">
            <div className="howto-head">
              <span className="game-shell__icon" aria-hidden>
                {icon}
              </span>
              <h2 id="howto-title">How to play</h2>
            </div>
            <ol className="howto-list">
              {howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button type="button" className="btn btn-primary" onClick={() => setHelpOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
