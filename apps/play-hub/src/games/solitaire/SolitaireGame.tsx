import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import {
  canStackOnFoundation,
  canStackOnTableau,
  cloneDeal,
  flipTop,
  foundationCount,
  foundationIndexFor,
  isRed,
  isWon,
  newDeal,
  RANK_LABEL,
  SUIT_SYMBOL,
  type Card,
  type Deal,
  type Selection,
} from './types'
import './solitaire.css'

const meta = getGame('solitaire')
const SUIT_ORDER = ['S', 'H', 'D', 'C'] as const

function CardFace({ card }: { card: Card }) {
  const red = isRed(card.suit)
  return (
    <span
      className={`soli-card${card.faceUp ? ' is-up' : ' is-down'}${red ? ' is-red' : ' is-black'}`}
    >
      {card.faceUp ? (
        <>
          <span className="soli-card__rank">{RANK_LABEL[card.rank]}</span>
          <span className="soli-card__suit">{SUIT_SYMBOL[card.suit]}</span>
        </>
      ) : (
        <span className="soli-card__back" />
      )}
    </span>
  )
}

function takeSelected(deal: Deal, selected: Selection): Card[] | null {
  if (!selected) return null
  if (selected.kind === 'waste') {
    if (deal.waste.length === 0) return null
    return [deal.waste[deal.waste.length - 1]]
  }
  const col = deal.tableau[selected.col]
  if (!col[selected.index]?.faceUp) return null
  return col.slice(selected.index)
}

export default function SolitaireGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [deal, setDeal] = useState<Deal>(() => newDeal())
  const [selected, setSelected] = useState<Selection>(null)
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)

  const founded = useMemo(() => foundationCount(deal), [deal])

  function commit(next: Deal, nextMoves: number) {
    setDeal(next)
    setMoves(nextMoves)
    setSelected(null)
    if (isWon(next) && !won) {
      setWon(true)
      sfx.win()
      const score = Math.max(1200 - nextMoves * 4, 200) + foundationCount(next) * 2
      burst(score, 1)
      levelUp()
      recordPlay('solitaire', score, true)
    }
  }

  function restart() {
    void unlockAudio()
    setDeal(newDeal())
    setSelected(null)
    setMoves(0)
    setWon(false)
    sfx.tick()
  }

  function drawStock() {
    if (won) return
    void unlockAudio()
    const next = cloneDeal(deal)
    if (next.stock.length === 0) {
      if (next.waste.length === 0) return
      next.stock = next.waste
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }))
      next.waste = []
      sfx.tick()
    } else {
      const card = next.stock.pop()!
      next.waste.push({ ...card, faceUp: true })
      sfx.move()
    }
    commit(next, moves + 1)
  }

  function removeFrom(next: Deal, from: NonNullable<Selection>) {
    if (from.kind === 'waste') {
      next.waste.pop()
    } else {
      next.tableau[from.col].splice(from.index)
      flipTop(next.tableau[from.col])
    }
  }

  function moveToFoundation(from: NonNullable<Selection>, cards: Card[]): boolean {
    if (cards.length !== 1) return false
    const card = cards[0]
    const fi = foundationIndexFor(card.suit)
    if (!canStackOnFoundation(card, deal.foundations[fi])) return false
    const next = cloneDeal(deal)
    removeFrom(next, from)
    next.foundations[fi].push({ ...card, faceUp: true })
    sfx.match()
    commit(next, moves + 1)
    return true
  }

  function moveToTableau(from: NonNullable<Selection>, cards: Card[], col: number): boolean {
    if (cards.length === 0) return false
    if (from.kind === 'tableau' && from.col === col) {
      setSelected(null)
      return true
    }
    const top = deal.tableau[col][deal.tableau[col].length - 1]
    if (!canStackOnTableau(cards[0], top)) return false
    const next = cloneDeal(deal)
    removeFrom(next, from)
    next.tableau[col].push(...cards.map((c) => ({ ...c, faceUp: true })))
    sfx.move()
    commit(next, moves + 1)
    return true
  }

  function onWasteClick() {
    if (won || deal.waste.length === 0) return
    void unlockAudio()
    if (selected?.kind === 'waste') {
      const cards = takeSelected(deal, selected)
      if (cards && moveToFoundation(selected, cards)) return
      setSelected(null)
      return
    }
    setSelected({ kind: 'waste' })
    sfx.tap()
  }

  function onFoundationClick(fi: number) {
    if (won || !selected) return
    void unlockAudio()
    const cards = takeSelected(deal, selected)
    if (!cards) return
    if (cards.length === 1 && foundationIndexFor(cards[0].suit) === fi) {
      if (moveToFoundation(selected, cards)) return
    }
    sfx.miss()
    setSelected(null)
  }

  function onTableauClick(col: number, index?: number) {
    if (won) return
    void unlockAudio()

    // Empty column
    if (index === undefined) {
      if (!selected) return
      const cards = takeSelected(deal, selected)
      if (!cards) return
      if (moveToTableau(selected, cards, col)) return
      sfx.miss()
      setSelected(null)
      return
    }

    const card = deal.tableau[col][index]
    if (!card?.faceUp) return

    if (selected) {
      const cards = takeSelected(deal, selected)
      if (cards) {
        if (moveToTableau(selected, cards, col)) return
        if (selected.kind === 'tableau' && selected.col === col) {
          setSelected({ kind: 'tableau', col, index })
          sfx.tap()
          return
        }
        // try foundation if single card tapped again via same selection path
        sfx.miss()
        setSelected(null)
        return
      }
    }

    setSelected({ kind: 'tableau', col, index })
    sfx.tap()
  }

  function tryAutoFoundation(from: NonNullable<Selection>) {
    if (won) return
    void unlockAudio()
    const cards = takeSelected(deal, from)
    if (!cards) return
    if (moveToFoundation(from, cards)) return
    sfx.miss()
  }

  function highlighted(col: number, index: number): boolean {
    return (
      selected?.kind === 'tableau' && selected.col === col && index >= selected.index
    )
  }

  const wasteTop = deal.waste[deal.waste.length - 1]

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Moves', value: moves },
        { label: 'Up', value: `${founded}/52` },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={restart}>
          New deal
        </button>
      }
    >
      <div className="soli-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={won ? 'Cleared!' : 'Build foundations A → K'}>
          <div className="soli-top">
            <div className="soli-stock-row">
              <button
                type="button"
                className="soli-slot soli-stock"
                aria-label={deal.stock.length ? 'Draw card' : 'Recycle waste'}
                onClick={drawStock}
                disabled={won || (deal.stock.length === 0 && deal.waste.length === 0)}
              >
                {deal.stock.length > 0 ? (
                  <CardFace card={{ id: 'back', suit: 'S', rank: 1, faceUp: false }} />
                ) : (
                  <span className="soli-empty">↻</span>
                )}
              </button>
              <button
                type="button"
                className={`soli-slot soli-waste${selected?.kind === 'waste' ? ' is-selected' : ''}`}
                aria-label="Waste pile"
                onClick={onWasteClick}
                onDoubleClick={() => {
                  if (deal.waste.length) tryAutoFoundation({ kind: 'waste' })
                }}
                disabled={won || !wasteTop}
              >
                {wasteTop ? <CardFace card={wasteTop} /> : <span className="soli-empty" />}
              </button>
            </div>

            <div className="soli-foundations" aria-label="Foundations">
              {deal.foundations.map((pile, fi) => {
                const top = pile[pile.length - 1]
                return (
                  <button
                    key={fi}
                    type="button"
                    className="soli-slot soli-foundation"
                    aria-label={`Foundation ${SUIT_ORDER[fi]}`}
                    onClick={() => onFoundationClick(fi)}
                    disabled={won}
                  >
                    {top ? (
                      <CardFace card={top} />
                    ) : (
                      <span className="soli-empty soli-empty--suit">
                        {SUIT_SYMBOL[SUIT_ORDER[fi]]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="soli-tableau" aria-label="Tableau">
            {deal.tableau.map((col, ci) => (
              <div key={ci} className="soli-col">
                {col.length === 0 ? (
                  <button
                    type="button"
                    className="soli-slot soli-slot--ghost"
                    aria-label={`Empty column ${ci + 1}`}
                    disabled={won}
                    onClick={() => onTableauClick(ci)}
                  >
                    <span className="soli-empty">K</span>
                  </button>
                ) : (
                  col.map((card, idx) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`soli-stack-card${highlighted(ci, idx) ? ' is-selected' : ''}`}
                      style={{ top: `${idx * 18}px`, zIndex: idx + 1 }}
                      disabled={won || !card.faceUp}
                      onClick={() => onTableauClick(ci, idx)}
                      onDoubleClick={() => {
                        if (!card.faceUp) return
                        tryAutoFoundation({ kind: 'tableau', col: ci, index: idx })
                      }}
                    >
                      <CardFace card={card} />
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>

          <p className="soli-hint muted">
            Tap to select, tap a pile to move. Double-tap to auto-send to foundation.
          </p>
        </BoardStage>

        <LevelCleared
          open={won}
          title="Deal cleared!"
          subtitle={`${moves} moves`}
          onReplay={restart}
          replayLabel="New deal"
        />
      </div>
    </GameShell>
  )
}
