/**
 * Signature levels for Name That Face: themed parties with their own guest names, question mixes
 * and look-alike twists, blended into the endless generator. Every 5th level is a boss party
 * (hearts at stake, double points). Checked by the lv5 validator (names unique and distinct from
 * the random pool, question types available for the cast).
 */

export type FaceQ = 'tap' | 'name' | 'job' | 'fav'

export type FaceSig = {
  name: string
  sub: string
  boss?: boolean
  /** New guests introduced this level. */
  fresh: number
  /** Strangers in the line-up (never introduced). */
  strangers: number
  /** Chance each stranger is a look-alike of a guest. */
  lookP?: number
  /** Guests from earlier levels who return (if the run has met enough people). */
  returning?: number
  /** Question types to draw from (falls back to name/tap when unavailable). */
  types: FaceQ[]
  /** Show jobs / favourite colours during the introductions. */
  job?: boolean
  fav?: boolean
  /** Themed guest names (used in order); must not appear in the random NAMES pool. */
  names?: string[]
  /** Multiplier on the introduction time per guest. */
  intro?: number
}

export const SIGNATURE: Record<number, FaceSig> = {
  1: { name: 'Welcome Party', sub: 'two guests · tap the one we ask for', fresh: 2, strangers: 0, types: ['tap'], intro: 1.15 },
  2: { name: 'Book Club', sub: 'three readers', fresh: 3, strangers: 0, types: ['tap', 'name'], names: ['Agatha', 'Bram', 'Colette'] },
  3: { name: 'Bus Stop', sub: 'a stranger waits too', fresh: 3, strangers: 1, types: ['tap', 'name'] },
  4: { name: 'Pirate Crew', sub: 'meet the crew', fresh: 3, strangers: 1, returning: 1, types: ['name', 'tap'], names: ['Barnacle', 'Cutlass', 'Marlin'] },
  5: { name: 'Boss · Masquerade', sub: 'old friends and strangers', boss: true, fresh: 3, strangers: 2, returning: 2, types: ['name', 'tap'] },
  6: { name: 'Tea Time', sub: 'a calm little gathering', fresh: 2, strangers: 1, returning: 1, types: ['name', 'tap'], intro: 1.15 },
  7: { name: 'Twin Town', sub: 'look-alikes everywhere', fresh: 3, strangers: 2, lookP: 1, types: ['tap'] },
  8: { name: 'Royal Court', sub: 'bow to the court', fresh: 4, strangers: 1, returning: 1, types: ['name'], names: ['Duchess', 'Baron', 'Squire', 'Jester'] },
  10: { name: 'Boss · Job Fair', sub: 'remember what they do', boss: true, fresh: 4, strangers: 2, returning: 2, lookP: 0.5, types: ['job', 'name', 'tap'], job: true },
  11: { name: 'Picnic', sub: 'a breather in the park', fresh: 3, strangers: 1, returning: 1, types: ['name', 'tap', 'job'], job: true, intro: 1.1 },
  12: { name: 'Hospital Shift', sub: 'jobs only', fresh: 4, strangers: 2, types: ['job'], job: true },
  13: { name: 'Space Crew', sub: 'names from the stars', fresh: 4, strangers: 2, returning: 1, lookP: 0.6, types: ['name', 'job'], job: true, names: ['Orion', 'Vega', 'Nova', 'Lyra'] },
  15: { name: 'Boss · Rainbow Ball', sub: 'jobs and favourite colours', boss: true, fresh: 4, strangers: 3, returning: 2, lookP: 0.6, types: ['fav', 'job', 'name', 'tap'], job: true, fav: true },
  16: { name: 'Art Class', sub: 'a breather · favourite colours', fresh: 3, strangers: 1, types: ['fav', 'name'], job: true, fav: true, intro: 1.15 },
  18: { name: 'Family Reunion', sub: 'everyone looks related', fresh: 4, strangers: 3, returning: 1, lookP: 1, types: ['name', 'tap'], job: true, fav: true },
  20: { name: 'Boss · The Gala', sub: 'a big crowd · every question', boss: true, fresh: 5, strangers: 3, returning: 3, lookP: 0.6, types: ['name', 'job', 'fav', 'tap'], job: true, fav: true },
  22: { name: 'Wizard School', sub: 'magical names', fresh: 4, strangers: 3, returning: 2, types: ['name', 'fav'], job: true, fav: true, names: ['Merlin', 'Morgana', 'Gandor', 'Elvira'] },
  24: { name: 'Speed Dating', sub: 'quick introductions', fresh: 5, strangers: 2, returning: 2, types: ['name', 'tap', 'job'], job: true, fav: true, intro: 0.85 },
  25: { name: 'Boss · Crowded Train', sub: 'look-alikes on every seat', boss: true, fresh: 5, strangers: 4, returning: 3, lookP: 0.8, types: ['tap', 'name', 'job'], job: true, fav: true },
  27: { name: 'Bakery Queue', sub: 'a breather', fresh: 3, strangers: 2, returning: 2, types: ['name', 'tap'], job: true, fav: true, intro: 1.1 },
  30: { name: 'Boss · Old Friends', sub: 'who do you still remember?', boss: true, fresh: 4, strangers: 4, returning: 3, lookP: 0.7, types: ['name', 'job', 'fav'], job: true, fav: true },
  33: { name: 'Detective Club', sub: 'one of them is an impostor', fresh: 5, strangers: 4, returning: 3, lookP: 1, types: ['tap', 'name'], job: true, fav: true },
  35: { name: 'Boss · Grand Wedding', sub: 'the biggest guest list', boss: true, fresh: 5, strangers: 4, returning: 3, lookP: 0.7, types: ['name', 'job', 'fav', 'tap'], job: true, fav: true, names: ['Bride', 'Groom', 'Bestie', 'Granny', 'Uncle Al'] },
  40: { name: 'Boss · Hall of Fame', sub: 'every face you ever met', boss: true, fresh: 5, strangers: 4, returning: 3, lookP: 0.8, types: ['name', 'job', 'fav', 'tap'], job: true, fav: true, intro: 0.95 },
}

export const AUTHORED = 40
