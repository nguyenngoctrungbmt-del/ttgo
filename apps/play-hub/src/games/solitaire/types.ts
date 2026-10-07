export type Suit = 'S' | 'H' | 'D' | 'C'
export type Card = {
  id: string
  suit: Suit
  rank: number
  faceUp: boolean
}

export type Selection =
  | { kind: 'waste' }
  | { kind: 'tableau'; col: number; index: number }
  | null

export type Deal = {
  stock: Card[]
  waste: Card[]
  foundations: Card[][]
  tableau: Card[][]
}

const SUITS: Suit[] = ['S', 'H', 'D', 'C']
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
}

export const RANK_LABEL: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
}

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D'
}

function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}${rank}`, suit, rank, faceUp: false })
    }
  }
  return deck
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function newDeal(): Deal {
  const deck = shuffle(makeDeck())
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let i = 0
  for (let col = 0; col < 7; col += 1) {
    for (let n = 0; n <= col; n += 1) {
      const card = { ...deck[i], faceUp: n === col }
      tableau[col].push(card)
      i += 1
    }
  }
  return {
    stock: deck.slice(i).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  }
}

export function canStackOnTableau(moving: Card, target: Card | undefined): boolean {
  if (!target) return moving.rank === 13
  return isRed(moving.suit) !== isRed(target.suit) && moving.rank === target.rank - 1
}

export function canStackOnFoundation(moving: Card, pile: Card[]): boolean {
  if (pile.length === 0) return moving.rank === 1
  const top = pile[pile.length - 1]
  return moving.suit === top.suit && moving.rank === top.rank + 1
}

export function foundationIndexFor(suit: Suit): number {
  return SUITS.indexOf(suit)
}

export function cloneDeal(deal: Deal): Deal {
  return {
    stock: deal.stock.map((c) => ({ ...c })),
    waste: deal.waste.map((c) => ({ ...c })),
    foundations: deal.foundations.map((p) => p.map((c) => ({ ...c }))),
    tableau: deal.tableau.map((p) => p.map((c) => ({ ...c }))),
  }
}

export function flipTop(col: Card[]): void {
  if (col.length === 0) return
  const top = col[col.length - 1]
  if (!top.faceUp) top.faceUp = true
}

export function isWon(deal: Deal): boolean {
  return deal.foundations.every((p) => p.length === 13)
}

export function foundationCount(deal: Deal): number {
  return deal.foundations.reduce((n, p) => n + p.length, 0)
}
