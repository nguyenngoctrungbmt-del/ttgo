/**
 * Signature levels for Melody Memory: fixed, recognisable tunes (public-domain melodies on the
 * eight-key pentatonic band) and rule mixes, blended into the endless generator.
 * Every 5th level is a boss tune (hearts at stake, double points).
 *
 * Key index → pitch: 0 C · 1 D · 2 E · 3 G · 4 A · 5 high C · 6 high D · 7 high E.
 * Checked by the lv5 validator (notes in range, durations match, length fair for the level).
 */

export type TuneSig = {
  name: string
  sub: string
  boss?: boolean
  notes: number[]
  /** Beats per note (default 1). */
  durs?: number[]
  /** Multiplier on the beat length (>1 = slower). */
  tempo?: number
  reverse?: boolean
  shuffle?: boolean
}

const MARY = [2, 1, 0, 1, 2, 2, 2]
const TAPS = [3, 3, 5, 3, 5, 7, 3, 5, 7, 3, 5, 7]
const TAPS_D = [0.5, 0.5, 2, 0.5, 0.5, 2, 0.5, 0.5, 1, 0.5, 0.5, 2]
const CHIMES = [7, 5, 6, 3, 3, 6, 7, 5, 7, 6, 5, 3, 3, 6, 7, 5]
const CHIMES_D = [1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2]
const GRACE = [3, 5, 7, 5, 7, 6, 5, 4, 3]
const GRACE_D = [1, 2, 0.5, 0.5, 2, 1, 2, 1, 2]
const JINGLE = [2, 2, 2, 2, 2, 2, 2, 3, 0, 1, 2]
const JINGLE_D = [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2]

export const SIGNATURE: Record<number, TuneSig> = {
  1: { name: 'Hot Cross Buns', sub: 'listen, then play it back', notes: [2, 1, 0], durs: [1, 1, 2], tempo: 1.15 },
  2: { name: 'Cuckoo Clock', sub: 'high, low, high, low', notes: [3, 1, 3, 1] },
  3: { name: 'Rain, Rain', sub: 'notes can repeat', notes: [3, 2, 3, 3, 2], durs: [1, 1, 0.5, 0.5, 2] },
  4: { name: 'Ring Around', sub: 'a 5th key joins the band', notes: [3, 3, 2, 4, 3, 2] },
  5: { name: "Boss · Mary's Lamb", sub: 'a tune you know', boss: true, notes: MARY, durs: [1, 1, 1, 1, 1, 1, 2] },
  6: { name: 'Lullaby', sub: 'a gentle breather', notes: [0, 2, 3, 2, 0], durs: [1, 1, 2, 1, 2], tempo: 1.15 },
  7: { name: 'Twinkle Twinkle', sub: 'six keys now', notes: [0, 0, 3, 3, 4, 4, 3], durs: [1, 1, 1, 1, 1, 1, 2] },
  8: { name: 'Frère Jacques', sub: 'keep the rhythm', notes: [0, 1, 2, 0, 0, 1, 2, 0] },
  10: { name: 'Boss · Camptown Races', sub: 'doo-dah, doo-dah!', boss: true, notes: [3, 3, 2, 3, 4, 3, 2, 2, 1], durs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 2] },
  11: { name: 'Big Ben', sub: 'four chimes · a breather', notes: [7, 5, 6, 3], durs: [1, 1, 1, 2], tempo: 1.1 },
  12: { name: 'Lamb in Reverse', sub: 'play it BACKWARDS', notes: MARY, reverse: true, tempo: 1.1 },
  13: { name: 'Jingle Bells', sub: 'jingle all the way', notes: JINGLE, durs: JINGLE_D },
  15: { name: 'Boss · Amazing Grace', sub: 'the full eight-key band', boss: true, notes: GRACE, durs: GRACE_D, tempo: 1.1 },
  16: { name: 'Sunset Motif', sub: 'a breather', notes: [4, 3, 2, 3, 4, 4], durs: [1, 1, 1, 1, 1, 2], tempo: 1.1 },
  17: { name: 'Banjo Shuffle', sub: 'the keys will shuffle', notes: [0, 1, 2, 3, 3, 4, 3, 2, 0, 1, 2], shuffle: true },
  18: { name: 'Taps', sub: 'the bugle call', notes: TAPS, durs: TAPS_D },
  20: { name: 'Boss · Westminster', sub: 'three chimes of the clock', boss: true, notes: CHIMES.slice(0, 12), durs: CHIMES_D.slice(0, 12) },
  22: { name: 'Auld Lang Syne', sub: 'should old tunes be forgot?', notes: [3, 5, 5, 5, 7, 6, 5, 6, 7, 5, 5], durs: [1, 1.5, 0.5, 1, 1, 1.5, 0.5, 1, 1, 1.5, 0.5] },
  23: { name: 'Bells Backwards', sub: 'jingle in reverse', notes: JINGLE, reverse: true, tempo: 1.1 },
  25: { name: 'Boss · Oh! Susanna', sub: 'the whole verse', boss: true, notes: [0, 1, 2, 3, 3, 4, 3, 2, 0, 1, 2, 2, 1, 0, 1], durs: [0.5, 0.5, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 1, 1, 1, 1, 2] },
  27: { name: 'Taps in Reverse', sub: 'the bugle, backwards', notes: TAPS, reverse: true },
  30: { name: 'Boss · Grand Chimes', sub: 'the full Westminster hour', boss: true, notes: CHIMES, durs: CHIMES_D },
  33: { name: 'Shuffled Grace', sub: 'grace with shuffled keys', notes: [...GRACE, 3, 5, 7, 5, 7, 6], durs: [...GRACE_D, 1, 2, 0.5, 0.5, 2, 2], shuffle: true },
  35: { name: 'Boss · Old MacDonald', sub: 'E-I-E-I-O, keys shuffle!', boss: true, notes: [0, 0, 0, 3, 4, 4, 3, 2, 2, 1, 1, 0, 3, 0, 0], durs: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2], shuffle: true },
  40: { name: 'Boss · Grand Finale', sub: 'amazing grace, twice as long', boss: true, notes: [...GRACE, 3, 5, 7, 5, 7, 6], durs: [...GRACE_D, 1, 2, 0.5, 0.5, 2, 2] },
}

export const AUTHORED = 40
