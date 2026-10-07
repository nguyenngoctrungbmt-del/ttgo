import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { GAMES, searchGames, type GameMeta } from '../data/games'
import { GAMES as CLASSIC_GAMES } from '../classic/registry'
import GameCover from '../shared/GameCover'
import { AndroidAppBar, HubPlayBanner } from '../shared/playStore'
import ThemeToggle from '../shared/ThemeToggle'
import { useProgressStore } from '../store/progressStore'
import './hub.css'

const ALL = 'All'
const FAVORITES = 'Favorites'
const TAGS = ['Action', 'Puzzle', 'Logic', 'Merge', 'Memory', 'Building', 'Arcade', 'Brain', 'Focus', 'Reflex', 'Quick']

type ClassicGame = (typeof CLASSIC_GAMES)[number]

function matchesClassic(game: ClassicGame, query: string, tag: string) {
  if (tag !== ALL && tag !== 'Arcade' && tag !== 'Action') return false
  const q = query.trim().toLowerCase()
  return !q || `${game.name} ${game.shortDesc}`.toLowerCase().includes(q)
}

function GameTile({ game, played }: { game: GameMeta; played: boolean }) {
  const badge = game.trending ? 'HOT' : game.isNew && !played ? 'NEW' : null
  return (
    <li>
      <Link to={game.path} className="ph-tile" style={{ '--tile-accent': game.accent } as CSSProperties}>
        {badge && <span className={`ph-tile__badge${badge === 'HOT' ? ' is-hot' : ''}`}>{badge}</span>}
        <span className="ph-tile__art">
          <GameCover game={game} className="ph-tile__emoji" />
        </span>
        <span className="ph-tile__name">{game.title}</span>
        <span className="ph-tile__desc">{game.blurb}</span>
        <span className="ph-tile__meta">
          {game.tag} · {game.eta}
        </span>
      </Link>
    </li>
  )
}

export default function Hub() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState(ALL)
  const favorites = useProgressStore((s) => s.favorites)
  const progress = useProgressStore((s) => s.games)

  const games = useMemo(() => {
    const found = searchGames(query)
    if (tag === ALL) return found
    if (tag === FAVORITES) return found.filter((g) => favorites.includes(g.id))
    return found.filter((g) => g.tags.includes(tag))
  }, [query, tag, favorites])

  const classics = tag === FAVORITES ? [] : CLASSIC_GAMES.filter((g) => matchesClassic(g, query, tag))
  const chips = favorites.length ? [ALL, FAVORITES, ...TAGS] : [ALL, ...TAGS]
  const total = GAMES.length + CLASSIC_GAMES.length
  const count = games.length + classics.length

  return (
    <div className="ph">
      <header className="ph-header">
        <div className="ph-container ph-nav">
          <a className="ph-brand" href="../">
            <span className="ph-logo" aria-hidden />
            <span>TTGO Play Hub</span>
          </a>
          <nav className="ph-nav__links" aria-label="Site">
            <a href="../">Home</a>
            <a href="../apps/">Apps</a>
            <a href="../blog/">Blog</a>
            <ThemeToggle compact />
          </nav>
        </div>
      </header>

      <main className="ph-container ph-main">
        <section className="ph-hero">
          <p className="ph-kicker">Free · No download · Instant play</p>
          <h1>Play {total} free browser games</h1>
          <p className="ph-lead">
            Action, puzzle, merge, logic and memory games from TTGO. Your progress, missions and best scores
            are saved in this browser.
          </p>
          <label className="ph-search" role="search">
            <span aria-hidden>🔎</span>
            <input
              type="search"
              value={query}
              placeholder="Search games…"
              aria-label="Search games"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </section>

        <HubPlayBanner />

        <div className="ph-chips" role="toolbar" aria-label="Filter by category">
          {chips.map((item) => (
            <button
              key={item}
              type="button"
              className={`ph-chip${tag === item ? ' is-active' : ''}`}
              aria-pressed={tag === item}
              onClick={() => setTag(item)}
            >
              {item === FAVORITES ? `♥ ${item}` : item}
            </button>
          ))}
        </div>

        <p className="ph-count">
          {count} {count === 1 ? 'game' : 'games'}
        </p>

        {count === 0 ? (
          <p className="ph-empty">No games match your search.</p>
        ) : (
          <ul className="ph-grid">
            {classics.map((game) => (
              <li key={game.id}>
                <Link to={game.path} className="ph-tile">
                  <span className="ph-tile__art">
                    <img src={game.icon} alt="" width="96" height="96" loading="lazy" />
                  </span>
                  <span className="ph-tile__name">{game.name}</span>
                  <span className="ph-tile__desc">{game.shortDesc}</span>
                  <span className="ph-tile__meta">Arcade · Classic</span>
                </Link>
              </li>
            ))}
            {games.map((game) => (
              <GameTile key={game.id} game={game} played={(progress[game.id]?.plays ?? 0) > 0} />
            ))}
          </ul>
        )}
      </main>

      <footer className="ph-footer">
        <div className="ph-container">
          <a href="../">TTGO home</a> · <a href="../about/">About</a> · <a href="../contact/">Contact</a> ·{' '}
          <a href="../privacy/">Privacy</a>
        </div>
      </footer>
      <AndroidAppBar />
    </div>
  )
}
