/**
 * Signature levels for N-Back: hand-written streams and special rule mixes blended into the
 * endless progression. Every 5th level is a boss (hearts at stake, long stream).
 * Hand-written streams are checked by the lv5 validator (length = trials + n, values in range,
 * a fair number of matches).
 */

export type NMode = 'shape' | 'pos' | 'dual'

export type NSig = {
  name: string
  sub: string
  n: number
  mode: NMode
  interval: number
  trials?: number
  boss?: boolean
  /**
   * Hand-written stream. shape/pos: one digit per item (shape 0–7 or square 0–8);
   * dual: space-separated "shape+square" pairs, e.g. "03 14".
   */
  seq?: string
  /** Only use the first K shapes (more lookalike lures). */
  shapes?: number
  /** Chance an item repeats the one n back (default 0.33 / 0.28 dual). */
  matchP?: number
}

export const SIGNATURE: Record<number, NSig> = {
  1: { name: 'Twin Steps', sub: 'tap when a shape repeats', n: 1, mode: 'shape', interval: 2.6, trials: 12, seq: '0012234415522' },
  2: { name: 'Corner Hop', sub: 'tap when the square repeats', n: 1, mode: 'pos', interval: 2.5, trials: 12, seq: '0028866411733' },
  3: { name: 'Quick Pairs', sub: 'faster · only four shapes', n: 1, mode: 'shape', interval: 2.0, trials: 12, shapes: 4 },
  4: { name: 'Echo', sub: 'now two steps back', n: 2, mode: 'shape', interval: 2.8, trials: 17, seq: '0101232454567607030' },
  5: { name: 'Boss · Mirror Hall', sub: '2-back squares · long stream', n: 2, mode: 'pos', interval: 2.5, trials: 20, boss: true },
  6: { name: 'Hopscotch', sub: 'squares two steps back', n: 2, mode: 'pos', interval: 2.7, trials: 17, seq: '4848262613137575404' },
  8: { name: 'Double Vision', sub: 'shape and square, 1 back', n: 1, mode: 'dual', interval: 2.8, trials: 14, seq: '00 00 11 21 25 35 33 43 47 47 52 62 66 76 70' },
  10: { name: 'Boss · The Twins', sub: '2-back on both channels', n: 2, mode: 'dual', interval: 2.8, trials: 18, boss: true },
  11: { name: 'Three Steps Back', sub: 'a waltz of three', n: 3, mode: 'shape', interval: 2.8, trials: 19, seq: '0120123453457637652762' },
  12: { name: 'Lookalikes', sub: 'only three shapes · watch the lures', n: 2, mode: 'shape', interval: 2.4, trials: 17, shapes: 3 },
  13: { name: 'Grid Ghost', sub: 'squares three back', n: 3, mode: 'pos', interval: 2.6, trials: 19 },
  15: { name: 'Boss · Triple Echo', sub: '3-back shapes · long stream', n: 3, mode: 'shape', interval: 2.4, trials: 22, boss: true },
  16: { name: 'Calm Pond', sub: 'a slow breather', n: 2, mode: 'shape', interval: 2.9, trials: 15 },
  18: { name: 'Rapid Fire', sub: 'quick squares, 2 back', n: 2, mode: 'pos', interval: 1.85, trials: 18 },
  20: { name: 'Boss · Dual Storm', sub: 'fast 2-back dual', n: 2, mode: 'dual', interval: 2.3, trials: 22, boss: true },
  22: { name: 'Deep Echo', sub: 'four steps back', n: 4, mode: 'shape', interval: 2.7, trials: 20 },
  24: { name: 'Shape Soup', sub: 'four shapes, 3 back', n: 3, mode: 'shape', interval: 2.2, trials: 20, shapes: 4 },
  25: { name: 'Boss · Four Corners', sub: '4-back squares', n: 4, mode: 'pos', interval: 2.4, trials: 22, boss: true },
  27: { name: 'Sunday Stroll', sub: 'a dual breather', n: 2, mode: 'dual', interval: 2.9, trials: 16 },
  30: { name: 'Boss · Mastermind', sub: '3-back on both channels', n: 3, mode: 'dual', interval: 2.6, trials: 22, boss: true },
  33: { name: 'Mirage', sub: 'three shapes, 4 back', n: 4, mode: 'shape', interval: 2.4, trials: 21, shapes: 3 },
  35: { name: 'Boss · The Abyss', sub: 'five steps back', n: 5, mode: 'shape', interval: 2.6, trials: 22, boss: true },
  40: { name: 'Boss · Grandmaster', sub: 'fast 3-back dual', n: 3, mode: 'dual', interval: 2.2, trials: 24, boss: true },
}

export const AUTHORED = 40

/** Parses a hand-written stream into stimuli (unused channels get random values). */
export function parseSeq(sig: NSig): { shape: number; pos: number }[] | null {
  if (!sig.seq) return null
  if (sig.mode === 'dual') {
    return sig.seq.split(' ').map((t) => ({ shape: Number(t[0]), pos: Number(t[1]) }))
  }
  return [...sig.seq].map((ch) => {
    const v = Number(ch)
    // The unscored channel is random.
    return sig.mode === 'shape' ? { shape: v, pos: Math.floor(Math.random() * 9) } : { shape: Math.floor(Math.random() * 8), pos: v }
  })
}
