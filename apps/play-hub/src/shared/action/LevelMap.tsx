import { useEffect, useRef } from 'react'
import type { GameId } from '../../data/games'
import { actionInfo } from '../../games/registry'
import { useProgressStore } from '../../store/progressStore'
import './levelmap.css'

const COLS = 5

type Props = {
  game: GameId
  onPick: (level: number) => void
}

/** Snake-path level map: cleared levels show stars, the next one pulses, the rest are locked. */
export default function LevelMap({ game, onPick }: Props) {
  const record = useProgressStore((s) => s.levelProgress[game])
  const cfg = actionInfo(game)?.levels
  const cleared = record?.cleared ?? 0
  const next = cleared + 1
  const bossEvery = cfg?.bossEvery ?? 5
  // Always show a few locked levels ahead so there is something to look forward to.
  const shown = Math.max(15, Math.ceil((next + 7) / COLS) * COLS)
  const currentRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll only the map box (scrollIntoView would also scroll the idle screen).
    // Wait a frame so layout (fonts, grid rows) is settled before measuring.
    const id = requestAnimationFrame(() => {
      const box = scrollRef.current
      const node = currentRef.current
      if (!box || !node) return
      const offset = node.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
      box.scrollTop = Math.max(0, offset - box.clientHeight / 2 + node.clientHeight / 2)
    })
    return () => cancelAnimationFrame(id)
  }, [next])

  const rows: number[][] = []
  for (let r = 0; r < shown / COLS; r++) {
    const row = Array.from({ length: COLS }, (_, c) => r * COLS + c + 1)
    rows.push(r % 2 ? row.reverse() : row)
  }

  return (
    <section className="level-map" aria-label="Levels" onPointerDown={(e) => e.stopPropagation()}>
      <header className="level-map__head">
        <span className="level-map__title">🗺 Levels</span>
        <span className="level-map__sub">
          {cleared > 0 ? `${cleared} cleared · ★ ${(record?.stars ?? []).reduce((a, b) => a + b, 0)}` : 'Start your journey'}
        </span>
      </header>
      <div className="level-map__scroll" ref={scrollRef}>
        {rows.map((row, r) => (
          <div key={r} className={`level-map__row${r % 2 ? ' is-rtl' : ''}`}>
            {row.map((lv) => {
              const done = lv <= cleared
              const current = lv === next
              const locked = lv > next
              const boss = bossEvery > 0 && lv % bossEvery === 0
              const stars = record?.stars[lv - 1] ?? 0
              return (
                <button
                  key={lv}
                  ref={current ? currentRef : undefined}
                  type="button"
                  className={`level-node${done ? ' is-done' : ''}${current ? ' is-current' : ''}${locked ? ' is-locked' : ''}${
                    boss ? ' is-boss' : ''
                  }`}
                  disabled={locked}
                  onClick={() => onPick(lv)}
                  aria-label={locked ? `Level ${lv}, locked` : `Play level ${lv}${done ? `, ${stars} stars` : ''}`}
                >
                  <span className="level-node__num">{locked ? '🔒' : lv}</span>
                  {done ? (
                    <span className="level-node__stars" aria-hidden>
                      {[1, 2, 3].map((i) => (
                        <i key={i} className={i <= stars ? 'is-on' : ''}>
                          ★
                        </i>
                      ))}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
