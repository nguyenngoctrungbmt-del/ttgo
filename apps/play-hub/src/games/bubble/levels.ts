/**
 * Bubble Pop levels: 32 hand-drawn boards, then a seeded generator.
 * Board rows alternate 10 / 9 bubbles (hex grid). Letters: R red, B blue, G green,
 * Y yellow, P purple, O orange; lowercase = a star bubble (fever bonus); '.' = empty.
 * Clear every bubble within the shots. Some boards lower the ceiling every few shots.
 * Each board is checked by scratch script `lv3-bb-verify`: a bot playing the real
 * board rules (board.ts) with the level's seeded bubble feed must clear it within par.
 */
import type { Cell } from './board'

export type BubbleLevel = {
  n: number
  name: string
  rows: string[]
  /** Shots available. */
  shots: number
  /** Shots for three stars. */
  par: number
  /** Ceiling drops one row every `drop` shots (0 = never). */
  drop: number
  colors: number
  hint?: string
  /** Generated boards fill rows at random from this seed. */
  gen?: { rows: number; seed: number }
}

const LETTERS = 'RBGYPO'

type Spec = { name: string; rows: string[]; shots: number; par: number; drop?: number; hint?: string }

const L = (name: string, rows: string[], shots: number, par: number, drop = 0, hint?: string): Spec => ({ name, rows, shots, par, drop, hint })

/**
 * Arc: 1–5 matching basics and first drops · 6–10 the ceiling starts to fall, bank shots ·
 * 11–15 purple joins, star bubbles · 16–20 faster ceilings · 21–25 orange joins, six
 * colours · 26–32 everything. Every 5th board is a big boss board.
 */
const SPECS: Spec[] = [
  L('First Pops', ['RRRRBBBBGG', 'RRRBBBBGG', 'RRRRBBBGGG'], 15, 8, 0, 'match 3 to pop'),
  L('Stripes', ['RRBBGGRRBB', 'RBBGGRRBB', 'RRBBGGRRBB', 'RBBGGRRBB'], 18, 11, 0, 'aim for big groups'),
  L('Bank Shot', ['GGGGRRGGGG', 'BBBRRRBBB', 'BBRRBBRRBB', '.RR...RR.'], 16, 9, 0, 'bounce off the walls'),
  L('Hanging Garden', ['RRR.BB.GGG', 'RR..B..GG', 'GGG.B.RRRR', 'GGBBBBRRR', 'BBBBBBBBBB'], 15, 9, 0, 'cut the stem — everything below drops'),
  L('Big Bloom', ['RRYYBBYYRR', 'RYYBBBYYR', 'GGRRBBRRGG', 'GRRBBBRRG', 'YYGGRRGGYY', 'YGGRRRGGY'], 27, 16, 0, 'boss board · four colours'),
  L('Falling Sky', ['BBBRRRGGGB', 'BBRRRGGGB', 'GGGBBBRRRG', 'GGBBBRRRG'], 19, 11, 9, 'the ceiling drops — watch the pips'),
  L('Pillars', ['YYRRRRRRYY', 'Y.RRRRR.Y', 'YY.GGGG.YY', 'Y.GGGGG.Y', 'BB......BB'], 18, 10, 0),
  L('Diamonds', ['RR..YY..BB', 'RGG.YRR.B', '.GG..RR...', '..G...R..'], 15, 8, 9),
  L('Chandelier', ['....YY....', '...YYY...', '..RRRRRR..', '.BBBBBBBB', 'GGGGGGGGGG', 'G.G.G.G.G'], 19, 11, 0, 'one bubble holds them all'),
  L('Old Fort', ['GYGYGYGYGY', 'GRRBBBRRG', 'GRRYYYYRRG', 'BRRYYYRRB', 'BBBRRRRBBB', 'YBB.B.BBY', 'YY......YY'], 30, 18, 8, 'boss board · the fort walls'),
  L('Purple Rain', ['PPPPRRRRBB', 'PPPRRRBBB', 'GGPPPRRRBB', 'GGGPPPRRB'], 14, 8, 0, 'purple joins the mix'),
  L('Starfield', ['BbBBYYYyYY', 'BBBYYYYYY', 'PPpPPGGgGG', 'PPPPGGGGG'], 14, 8, 0, 'stars fill the fever ring'),
  L('Zigzag', ['RPGBRPGBRP', 'RRPPPGGGB', 'BBRRPPGGBB', 'BBRRPPGGB', 'YYBBRRPPGG'], 31, 19, 9),
  L('Lanterns', ['R..P..G..B', 'R..P..G..', 'RR.PP.GG.B', 'RRPPPGGBB', 'YYYYYYYYYY'], 25, 15, 0, 'lanterns hang by a thread'),
  L('Crown', ['Y.Y.YY.Y.Y', 'YYYYYYYYY', 'PPRRPPRRPP', 'PRRPPRRPP', 'BBBGGGGBBB', 'BBGGGGGBB', 'bRRRRRRRRb'], 25, 15, 8, 'boss board · the crown'),
  L('Quickfall', ['GGGRRRBBBB', 'GGRRRBBBB', 'YYYGGGRRRR', 'YYGGGRRRB'], 19, 11, 6, 'faster ceiling'),
  L('Waterfall', ['BPBPBPBPBP', 'B.B.B.B.B', 'P.P.P.P.P.', 'P.P.P.P.P', 'GGGGGGGGGG'], 32, 20, 8),
  L('Honeycomb', ['YYPPYYPPYY', 'YPPYYPPYY', 'PPYYPPYYPP', 'PYYPPYYPP', 'RRRRBBBBRR', 'RRRBBBRRR'], 23, 14, 7),
  L('Twin Peaks', ['RR......GG', 'RRR....GG', 'RRBB..BBGG', 'RBBBBBBBG', 'PPPPYYYYPP', 'PPPYYYPPP'], 22, 13, 7),
  L('Storm Front', ['PYPYPYPYPY', 'PBBBBBBBP', 'PBRRRRRRBP', 'PBRYYYRBP', 'PBRYGGYRBP', 'PBRYYYRBP', 'PBRRRRRRBP', 'PBBBBBBBP'], 28, 17, 9, 'boss board · the eye of the storm'),
  L('Orange Grove', ['OOOOGGGGOO', 'OOOGGGGOO', 'RRRROOOOGG', 'RRROOOGGG'], 16, 9, 0, 'orange joins — six colours'),
  L('Mosaic', ['ROYGBPROYG', 'OYGBPROYG', 'YGBPROYGBP', 'GBPROYGBP'], 38, 24, 0, 'tricky mosaic'),
  L('Keyhole', ['BOBOBOBOBO', 'BBBB.BBBB', 'OOO....OOO', 'OO.....OO', 'YYY....YYY'], 19, 11, 8),
  L('Spiral', ['RRRRRRRRRR', 'G......RR', 'GGGGGG..RR', 'Y.....PRR', 'YYYYY..PRR', '....YPPPR'], 14, 6, 8, 'find the keystone'),
  L('Rainbow Gate', ['ROYGBPROYG', 'OOOOOOOOO', 'YYYYYYYYYY', 'GGG...GGG', 'BB.....BB.', 'PP.....PP', 'oo.....oo.'], 40, 25, 8, 'boss board · six colours'),
  L('Breather', ['GGGGBBBBGG', 'GGGBBBBGG', 'YYYYYYYYYY'], 18, 10, 0, 'a breather'),
  L('Bricks', ['RRBBRRBBRR', 'ORRBBRRBO', 'OOGGOOGGOO', 'OGGOOGGOO', 'YYPPYYPPYY'], 36, 23, 7),
  L('Cascade', ['B.........', 'BB.......', 'BBG.......', 'BGGP.....', 'GGPPPO....', 'GPPOOOY..', 'PPOOYYYYRR'], 14, 7, 8, 'one anchor in the corner'),
  L('Fireworks', ['O.R.Y.O.R.', 'ORYORYORY', 'yyOORRYYOO', 'YOORRYYOO', 'RRYYOORRYY', 'RYYOORRYY'], 31, 19, 7),
  L('Grand Bloom', ['PGPGPGPGPG', 'PGGGGGGGP', 'PGRRRRRRGP', 'PGRYYYRGP', 'PGRYOOYRGP', 'PGRYBYRGP', 'PGRRRRRRGP', 'PGGGGGGGP', 'pPPPPPPPPp'], 31, 19, 9, 'boss board · grand bloom'),
  L('Last Light', ['YYYYOOOOOO', 'YYYOOOOOR', 'BBBBRRRRRR', 'BBBRRRRRP', 'GGGGPPPPPP'], 22, 13, 6),
  L('Finale', ['RRRROOOOYY', 'RRROOOOYY', 'GGGGBBBBPP', 'GGGBBBBPP', 'YYOORRGGBB', 'YOORRGGBB', 'PPPPPPPPPP'], 34, 21, 7, 'the finale'),
]

export const AUTHORED_COUNT = SPECS.length

function colorsIn(rows: string[]) {
  const set = new Set<number>()
  for (const r of rows) for (const ch of r) if (ch !== '.') set.add(LETTERS.indexOf(ch.toUpperCase()))
  return set.size
}

export function levelFor(n: number): BubbleLevel {
  const s = SPECS[n - 1]
  if (s) return { n, name: s.name, rows: s.rows, shots: s.shots, par: s.par, drop: s.drop ?? 0, colors: colorsIn(s.rows), hint: s.hint }
  // Generated: more rows, more colours, a faster ceiling as n grows.
  const k = n - SPECS.length
  const rows = Math.min(8, 5 + Math.floor(k / 6))
  const colors = Math.min(6, 4 + Math.floor(k / 5))
  const shots = Math.round(rows * 9 * 0.62 + colors * 2)
  return { n, name: `Board ${n}`, rows: [], shots, par: Math.round(shots * 0.65), drop: Math.max(5, 9 - Math.floor(k / 8)), colors, gen: { rows, seed: n * 7919 + 13 } }
}

/** Authored rows → grid cells. */
export function gridFromRows(rows: string[]): Cell[][] {
  return rows.map((r) =>
    r.split('').map((ch) => {
      if (ch === '.') return null
      const color = LETTERS.indexOf(ch.toUpperCase())
      return { color, star: ch !== ch.toUpperCase() }
    }),
  )
}
