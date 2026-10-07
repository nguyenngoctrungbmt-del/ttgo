import { useState } from 'react'
import { upgradePrice } from '../../data/actionKit'
import type { GameId } from '../../data/games'
import { actionInfo } from '../../games/registry'
import { useProgressStore } from '../../store/progressStore'
import { haptic } from '../haptics'
import { sfx } from '../sound'
import './upgrades.css'

/** Permanent upgrade shop for one game, paid with arcade coins. */
export default function GameUpgrades({ game }: { game: GameId }) {
  const coins = useProgressStore((s) => s.coins)
  const upgrades = useProgressStore((s) => s.upgrades)
  const buyUpgrade = useProgressStore((s) => s.buyUpgrade)
  const [bought, setBought] = useState<string | null>(null)
  const defs = actionInfo(game)?.upgrades ?? []

  if (defs.length === 0) return null

  function buy(id: string) {
    if (buyUpgrade(game, id)) {
      sfx.power()
      haptic.success()
      setBought(id)
      window.setTimeout(() => setBought(null), 600)
    } else {
      sfx.miss()
      haptic.light()
    }
  }

  return (
    <section className="upgrades" aria-label="Upgrades" onPointerDown={(e) => e.stopPropagation()}>
      <header className="upgrades__head">
        <span className="upgrades__title">⚡ Upgrades</span>
        <span className="upgrades__coins">🪙 {coins}</span>
      </header>
      <ul className="upgrades__list">
        {defs.map((def) => {
          const lv = upgrades[`${game}:${def.id}`] ?? 0
          const maxed = lv >= def.max
          const price = upgradePrice(def, lv)
          return (
            <li key={def.id} className={`upgrade${bought === def.id ? ' is-bought' : ''}`}>
              <span className="upgrade__icon" aria-hidden>
                {def.icon}
              </span>
              <div className="upgrade__body">
                <div className="upgrade__label">{def.label}</div>
                <div className="upgrade__desc">{def.desc}</div>
                <div className="upgrade__pips" aria-label={`Level ${lv} of ${def.max}`}>
                  {Array.from({ length: def.max }, (_, i) => (
                    <span key={i} className={i < lv ? 'is-on' : ''} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary upgrade__buy"
                disabled={maxed || coins < price}
                onClick={() => buy(def.id)}
              >
                {maxed ? 'MAX' : `🪙 ${price}`}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
