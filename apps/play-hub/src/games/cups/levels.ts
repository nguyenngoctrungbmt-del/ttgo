/**
 * Signature levels for Cup Shuffle. Every other level comes from the generator in CupsGame.
 *
 * `cups`: what sits under each cup, left to right — '.' empty · 'o' gold ball · 'x' fake ball.
 * `moves`: space-separated, by table slot (0 = leftmost): '01' swaps the cups in slots 0 and 1,
 * '01+34' swaps two pairs at once, 'h2' makes the cup in slot 2 hop (a fake reveal-tease).
 * `speed` scales the swap duration (>1 slower, <1 faster) relative to the generator's pace for that level.
 */
export type CupSig = {
  title: string
  boss?: boolean
  cups: string
  moves: string
  speed?: number
}

export function cupCount(L: number) {
  return L <= 2 ? 3 : L <= 6 ? 4 : L <= 11 ? 5 : 6
}

export function genBalls(L: number) {
  const n = cupCount(L)
  return L >= 17 && n >= 6 ? 3 : L >= 8 ? 2 : 1
}

export function genFakes(L: number) {
  const n = cupCount(L)
  return Math.min(L >= 13 ? 2 : L >= 4 ? 1 : 0, n - 1 - genBalls(L))
}

/** Swap count the generator uses for a normal level. */
export function genSwaps(L: number) {
  return Math.min(22, 3 + Math.floor(L * 0.75))
}

/** Base seconds per swap at a level (before the Sharp Eye upgrade). */
export function swapDur(L: number) {
  return Math.max(0.2, 0.62 - L * 0.021)
}

/** Adjacent swaps sweeping left→right (a carousel when repeated). */
const sweep = (n: number) => Array.from({ length: n - 1 }, (_, i) => `${i}${i + 1}`).join(' ')
/** Adjacent swaps right→left. */
const back = (n: number) => Array.from({ length: n - 1 }, (_, i) => `${n - 2 - i}${n - 1 - i}`).join(' ')
/** Mirror pairs swapped together: (0,n-1)+(1,n-2). */
const mirror = (n: number) => `0${n - 1}+1${n - 2}`

export const CUP_LEVELS: Record<number, CupSig> = {
  1: { title: 'Opening Act', cups: '.o.', moves: '01 12 01' },
  2: { title: 'Back and Forth', cups: '.o.', moves: '01 01 12 12' },
  3: { title: 'The Long Way', cups: 'o...', moves: '01 12 23 12 01' },
  4: { title: 'Stone Cold', cups: 'o..x', moves: '03 12 01 23 02 13' },
  5: { title: 'The Carousel', boss: true, cups: '.o.x', moves: `${sweep(4)} ${sweep(4)} ${sweep(4)}` },
  6: { title: 'Hopscotch', cups: '..ox', moves: '23 h1 12 01 h3 03 12 23' },
  8: { title: 'Double Trouble', cups: 'o.x.o', moves: '01 34 12 23 h2 04 13 02 34' },
  9: { title: 'Crossover', cups: '.o.ox', moves: '04 13 02 24 h0 01 34 13 02 14' },
  10: { title: 'The Mirror', boss: true, cups: 'o.x.o', moves: `01+34 04 13 03+14 h2 02 24 01+34 13 04 12 23` },
  12: { title: 'Pendulum', cups: 'xo..o.', moves: `${sweep(6)} ${back(6)} h4 02+35 14` },
  13: { title: 'Rock Garden', cups: '.ox.xo', moves: '05 14 23 01+45 h2 13 24 02 35 h0 12+34 03 15' },
  15: { title: 'Whirlwind', boss: true, speed: 0.9, cups: 'o.x.xo', moves: `${sweep(6)} 05 14+23 ${back(6)} h3 02+35 13 24 05 12+34 h1` },
  17: { title: 'Triple Crown', speed: 1.15, cups: 'oxo.xo', moves: '01 23 45 h2 12 34 05 13+24 h4 02 35 14 03 25 14' },
  18: { title: 'Slow Waltz', speed: 1.5, cups: 'o.xoxo', moves: `${sweep(6)} ${back(6)} h2 03 14 25 h5 01+45 23 04 15 23` },
  20: { title: 'The Gauntlet', boss: true, cups: 'oxo.xo', moves: `05 14 23 ${mirror(6)} 01+23 45 h3 02 13 24 35 h0 04+12 15 03 ${sweep(6)} 25` },
  22: { title: 'Blitz', speed: 0.9, cups: 'xo.oxo', moves: '01 23 45 12 34 05 h2 02 13 24 35 14 03 25 01+45' },
  25: { title: 'Hall of Mirrors', boss: true, cups: 'o.xoxo', moves: `${mirror(6)} 05 ${mirror(6)} 14 23 h1 01+45 12+34 ${mirror(6)} 03 25 h4 02+35 13 24 05 14+23 01 45 23 ${mirror(6)}` },
  28: { title: 'Shell Game', speed: 1.1, cups: 'oxo.ox', moves: `${sweep(6)} h1 ${back(6)} 03 14 25 h3 02+45 13 04 15 24 01 35` },
  30: { title: 'The Cyclone', boss: true, cups: '.oxoxo', moves: `${sweep(6)} ${sweep(6)} h2 05 14 23 ${back(6)} 02+35 13 h4 04+12 15 03 25 ${mirror(6)}` },
  33: { title: 'Sleight of Hand', speed: 1.1, cups: 'ox.oxo', moves: '02 13 24 35 h1 04 15 01+34 23 05 12+45 h3 03 14 25 01 23 45 02+35 14 03' },
  35: { title: 'Grand Illusion', boss: true, cups: 'oxoxo.', moves: `${mirror(6)} ${sweep(6)} 05 14+23 h0 02 13 24 35 h5 01+45 12+34 03 25 ${back(6)} 04 15 ${mirror(6)} 23` },
  40: { title: 'The Vanishing', boss: true, cups: 'o.oxox', moves: `05 ${sweep(6)} 14 23 h2 ${mirror(6)} 02+35 13 24 h4 04+12 15 03 25 ${back(6)} 01+45 23 14 05` },
  45: { title: 'Smoke & Mirrors', boss: true, cups: 'xo.oox', moves: `${mirror(6)} 05 ${mirror(6)} 14 h3 23 ${mirror(6)} 01+45 12+34 h1 02+35 13 24 05 ${mirror(6)} 03 25 14+23 01 45 ${mirror(6)}` },
  50: { title: 'Final Curtain', boss: true, cups: 'oxo.xo', moves: `${sweep(6)} ${back(6)} h2 05 14+23 02+35 13 24 h5 04+12 15 03 25 ${mirror(6)} 01+45 12+34 23 14 05` },
  55: { title: 'Encore', boss: true, cups: '.oxoox', moves: `05 14 23 ${mirror(6)} ${sweep(6)} h1 02+35 13 24 04+12 15 h4 03 25 01+45 ${back(6)} 12+34 05 ${mirror(6)} 23` },
  60: { title: 'Standing Ovation', boss: true, cups: 'oxoxo.', moves: `${mirror(6)} ${sweep(6)} 05 14+23 h3 02+35 13 24 h0 04+12 15 03 25 ${back(6)} 01+45 12+34 ${mirror(6)} 14 05` },
}

export type CupStep = { pairs: [number, number][] } | { hop: number }

/** Parses a move string into slot-based steps. */
export function parseMoves(s: string): CupStep[] {
  return s
    .trim()
    .split(/\s+/)
    .map((tok) => {
      if (tok[0] === 'h') return { hop: Number(tok.slice(1)) }
      return { pairs: tok.split('+').map((p) => [Number(p[0]), Number(p[1])] as [number, number]) }
    })
}

export function swapCount(s: string) {
  return parseMoves(s).filter((m) => 'pairs' in m).length
}
