import { LANDMARKS } from './art'

export type Move = 'L' | 'S' | 'R'

/** Directions grid: 0 = north (up), 1 = east, 2 = south, 3 = west. */
export const D: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

export function turnDir(d: number, m: Move) {
  return m === 'L' ? (d + 3) % 4 : m === 'R' ? (d + 1) % 4 : d
}

/** Junctions per generated fare. Breather fares right after a boss are one shorter. */
export function routeLength(L: number) {
  const n = Math.min(12, 3 + Math.floor(L / 2))
  return L > 5 && L % 5 === 1 ? n - 1 : n
}

/** Study time before the Route Planner upgrade. */
export function studyTime(L: number, n: number, landmarkTurns: number) {
  return (1.8 + (landmarkTurns > 0 ? landmarkTurns * 0.9 : n * 0.55)) * Math.max(0.65, 1 - L * 0.015)
}

// ── Signature fares ──────────────────────────────────────────
// `moves`: L/S/R per junction. `tour`: landmark names for each turn, in order (landmark directions);
// `marks: true` = landmark directions with random landmarks. `decoys`: extra landmarks at the straight
// junctions. `jam`: traffic on that stretch. `theme`: 0 day, 1 sunset, 2 night, 3 dawn.
// Every 5th level is a boss (VIP fare: hearts at stake, double tips).

export type SigRoute = {
  level: number
  name: string
  tip?: string
  boss?: boolean
  moves: string
  tour?: string[]
  marks?: boolean
  decoys?: boolean
  jam?: number
  theme?: number
}

export const SIGNATURES: SigRoute[] = [
  { level: 1, name: 'First Fare', tip: 'memorise the directions', moves: 'SRS' },
  { level: 2, name: 'Corner Shop', moves: 'RSLS' },
  { level: 3, name: 'Left Lane', moves: 'LSLS' },
  { level: 4, name: 'Around the Block', moves: 'RRSLS' },
  { level: 5, boss: true, name: 'Airport Run', moves: 'SLRRSL' },
  { level: 6, name: 'Landmark Lane', tip: 'turn at the landmarks', moves: 'RSLSL', tour: ['Park', 'Cafe', 'School'] },
  { level: 8, name: 'Zigzag Alley', moves: 'LRLRLRS' },
  { level: 9, name: 'Decoy Square', tip: 'not every landmark is a turn', moves: 'RSLSSRS', tour: ['Bank', 'Fountain', 'Gas'], decoys: true },
  { level: 10, boss: true, name: 'Downtown Rush', moves: 'SRLSSRRSL', jam: 3 },
  { level: 12, name: 'Coffee Run', moves: 'LSRSSLRSS', tour: ['Cafe', 'Bank', 'Gas', 'Tower'] },
  { level: 14, name: 'The Spiral', tip: 'right, right, right…', moves: 'RRSRSSRSSS' },
  { level: 15, boss: true, name: 'Hospital Dash', moves: 'SLSRSLRSSRS', tour: ['School', 'Park', 'Gas', 'Fountain', 'Hospital'], jam: 4 },
  { level: 17, name: 'Straight Shooter', tip: 'count the straights', moves: 'SSSRSSSLSSS' },
  { level: 18, name: 'Night Owl', moves: 'RSLLSRSRLSSR', theme: 2 },
  { level: 20, boss: true, name: 'City Marathon', moves: 'LSRRSLSLRSSLR', jam: 6 },
  { level: 22, name: 'School Run', moves: 'SRSSLSRSLSSS', tour: ['Park', 'Fountain', 'Gas', 'School'], decoys: true },
  { level: 25, boss: true, name: 'Grand Tour', tip: 'see every sight', moves: 'RSLSRSSLSRSLS', tour: ['Tower', 'Park', 'Fountain', 'Bank', 'Cafe', 'School'], decoys: true },
  { level: 27, name: 'Mirror Streets', tip: 'the second half mirrors the first', moves: 'LRSRLSRLSLRS' },
  { level: 30, boss: true, name: 'Midnight Express', moves: 'SRSLRSLSRRSLS', theme: 2, jam: 5 },
  { level: 32, name: 'Park Loop', moves: 'SLSSRSRSSLSS', marks: true, decoys: true },
  { level: 35, boss: true, name: 'Getaway Car', moves: 'LSRSLSSSLSRSR', tour: ['Bank', 'Gas', 'Cafe', 'Park', 'Tower', 'School'], decoys: true, jam: 2 },
  { level: 36, name: 'Sunday Drive', tip: 'a breather', moves: 'SSRSSLSSRSS' },
  { level: 38, name: 'Staircase', moves: 'LRLRLRLRLRLR' },
  { level: 40, boss: true, name: 'Tower Climb', moves: 'RSLRSSLRSRLSS', theme: 2, jam: 7 },
  { level: 42, name: 'Fountain Circuit', moves: 'SRSSLSSRSLSS', tour: ['Fountain', 'Bank', 'Park', 'Hospital'], decoys: true },
  { level: 45, boss: true, name: 'Rush to the Stadium', moves: 'LSSRLSRSSLRSL', jam: 4 },
  { level: 48, name: 'Rainy Commute', moves: 'RLSSRSLLSRSS', theme: 3 },
  { level: 50, boss: true, name: 'Key to the City', tip: 'the final fare', moves: 'SRSLSRSSSLSRSL', tour: ['Park', 'Bank', 'Tower', 'School', 'Cafe', 'Hospital'], decoys: true, jam: 8 },
]

export const SIG_BY_LEVEL = new Map(SIGNATURES.map((s) => [s.level, s]))
export const AUTHORED = Math.max(...SIGNATURES.map((s) => s.level))

export const landmarkIndex = (name: string) => LANDMARKS.findIndex((l) => l.name === name)

/** Walks a move list from the origin; returns the junction cells or null if the route crosses itself. */
export function walk(moves: Move[]): [number, number][] | null {
  const visited = new Set<string>(['0,0'])
  let ci = D[0][0]
  let cj = D[0][1]
  let d = 0
  const nodes: [number, number][] = []
  for (const m of moves) {
    if (visited.has(`${ci},${cj}`)) return null
    visited.add(`${ci},${cj}`)
    nodes.push([ci, cj])
    d = turnDir(d, m)
    ci += D[d][0]
    cj += D[d][1]
  }
  return visited.has(`${ci},${cj}`) ? null : nodes
}

/** Checks every signature fare against the game rules; returns a list of problems (empty = valid). */
export function validateSignatures(): string[] {
  const errs: string[] = []
  const seen = new Set<number>()
  for (const s of SIGNATURES) {
    const tag = `L${s.level}`
    if (seen.has(s.level)) errs.push(`${tag} duplicate`)
    seen.add(s.level)
    if (!!s.boss !== (s.level % 5 === 0)) errs.push(`${tag} boss flag must match every 5th level`)
    if (!/^[LSR]+$/.test(s.moves)) errs.push(`${tag} bad moves`)
    const moves = s.moves.split('') as Move[]
    const n = moves.length
    if (n < 3 || n > 15) errs.push(`${tag} route length ${n}`)
    if (!walk(moves)) errs.push(`${tag} route crosses itself`)
    const turns = moves.filter((m) => m !== 'S').length
    if (s.tour || s.marks) {
      if (s.level < 6) errs.push(`${tag} landmark directions start at level 6`)
      if (turns < 1 || turns > 6) errs.push(`${tag} landmark fares need 1–6 turns (directions panel)`)
      if (s.tour) {
        if (s.tour.length !== turns) errs.push(`${tag} tour has ${s.tour.length} names for ${turns} turns`)
        if (new Set(s.tour).size !== s.tour.length) errs.push(`${tag} tour repeats a landmark`)
        for (const name of s.tour) if (landmarkIndex(name) < 0) errs.push(`${tag} unknown landmark ${name}`)
        if (s.decoys && s.tour.length >= LANDMARKS.length) errs.push(`${tag} no spare landmarks for decoys`)
      }
    } else if (s.decoys) errs.push(`${tag} decoys need landmark directions`)
    if (s.jam !== undefined && (s.jam < 1 || s.jam > n - 2)) errs.push(`${tag} jam index out of range`)
    if (s.theme !== undefined && (s.theme < 0 || s.theme > 3)) errs.push(`${tag} bad theme`)
  }
  return errs
}
