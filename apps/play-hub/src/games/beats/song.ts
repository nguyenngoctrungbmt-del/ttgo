/**
 * Procedural song + chart generator. Every chart note is derived from the
 * music itself (kick, snare and lead melody), so taps land on real sounds.
 */
import type { LeadWave, Voice } from './audio'

export type Ev = { t: number; v: Voice; f: number; d: number; vel: number }
/** state: 0 pending, 1 holding, 2 hit, 3 missed / dropped */
export type Note = { t: number; lane: number; hold: number; state: number; dbl: boolean }

export type Style = {
  name: string
  lead: LeadWave
  bass: OscillatorType
  kick: number[]
  snare: number[]
  clap: boolean
  hats: 'eighth' | 'sixteenth' | 'offbeat'
  arp: boolean
  top: string
  bot: string
  sun: string
  grid: string
}

export const STYLES: Style[] = [
  { name: 'Synthwave', lead: 'sawtooth', bass: 'sawtooth', kick: [0, 4, 8, 12], snare: [4, 12], clap: false, hats: 'eighth', arp: false, top: '#1e1b4b', bot: '#831843', sun: '#fb7185', grid: '#f472b6' },
  { name: 'Deep House', lead: 'square', bass: 'square', kick: [0, 4, 8, 12], snare: [4, 12], clap: true, hats: 'offbeat', arp: false, top: '#0c4a6e', bot: '#312e81', sun: '#22d3ee', grid: '#38bdf8' },
  { name: 'Breakbeat', lead: 'sawtooth', bass: 'sawtooth', kick: [0, 6, 10], snare: [4, 12], clap: false, hats: 'sixteenth', arp: false, top: '#3b0a0a', bot: '#7c2d12', sun: '#fbbf24', grid: '#f59e0b' },
  { name: 'Chiptune', lead: 'square', bass: 'triangle', kick: [0, 8], snare: [4, 12], clap: false, hats: 'eighth', arp: true, top: '#052e16', bot: '#134e4a', sun: '#4ade80', grid: '#86efac' },
  { name: 'Drum & Bass', lead: 'triangle', bass: 'sawtooth', kick: [0, 10], snare: [4, 12], clap: false, hats: 'sixteenth', arp: false, top: '#020617', bot: '#3b0764', sun: '#c084fc', grid: '#a855f7' },
]

const TITLES_A = ['Neon', 'Midnight', 'Electric', 'Velvet', 'Crystal', 'Turbo', 'Lunar', 'Golden', 'Static', 'Hyper', 'Pixel', 'Solar']
const TITLES_B = ['Drive', 'Pulse', 'Heart', 'Run', 'Dreams', 'Rush', 'Echo', 'Skyline', 'Groove', 'Fever', 'Bloom', 'Circuit']

export type Song = {
  index: number
  name: string
  style: Style
  bpm: number
  step: number
  bars: number
  length: number
  approach: number
  events: Ev[]
  notes: Note[]
  /** Bar index where each section starts. */
  drops: number[]
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PENT = [0, 3, 5, 7, 10]
const PROG = [0, 8, 3, 10]
const ROOTS = [57, 60, 62, 55, 52]

function hz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12)
}
function degMidi(root: number, d: number) {
  return root + 12 * Math.floor(d / 5) + PENT[((d % 5) + 5) % 5]
}

type Ph = { s: number; d: number; deg: number }[]

function makePhrase(r: () => number, dens: number, slow: boolean): Ph {
  const out: Ph = []
  let s = 0
  let deg = 5 + Math.floor(r() * 3)
  while (s < 32) {
    if (!slow && s > 0 && r() < 0.16) {
      s += 2
      continue
    }
    const x = r()
    let d = slow ? (x < 0.5 ? 8 : 4) : dens >= 3 && x < 0.22 ? 1 : x < 0.62 ? 2 : x < 0.86 ? 4 : 6
    if (s % 2 === 1) d = 1
    deg = Math.max(2, Math.min(11, deg + Math.round((r() - 0.5) * 4.5)))
    out.push({ s, d: Math.min(d, 32 - s), deg })
    s += d
  }
  return out
}

function vary(r: () => number, p: Ph): Ph {
  return p.map((n, i) => (i >= p.length - 3 ? { ...n, deg: Math.max(2, Math.min(11, n.deg + Math.round((r() - 0.5) * 4))) } : n))
}

export function makeSong(index: number, seed: number): Song {
  const r = rng(seed * 7919 + index * 104729)
  const style = STYLES[index % STYLES.length]
  const bpm = Math.min(174, 90 + index * 9)
  const step = 60 / bpm / 4
  const dens = Math.min(4, index)
  const root = ROOTS[Math.floor(r() * ROOTS.length)]
  // Sections: intro 2, build 4, drop A 8, break 2, drop B 6, outro 2
  const bars = 24
  const sec = (b: number) => (b < 2 ? 'intro' : b < 6 ? 'build' : b < 14 ? 'dropA' : b < 16 ? 'break' : b < 22 ? 'dropB' : 'outro')
  const events: Ev[] = []
  const raw: Note[] = []
  const T = (b: number, s: number) => (b * 16 + s) * step
  const ev = (b: number, s: number, v: Voice, f = 0, d = 0, vel = 1) => events.push({ t: T(b, s), v, f, d, vel })
  const note = (b: number, s: number, lane: number, holdSteps = 0, dbl = false) => raw.push({ t: T(b, s), lane, hold: holdSteps > 0 ? holdSteps * step - step * 0.5 : 0, state: 0, dbl })

  const phA = makePhrase(r, dens, false)
  const phA2 = vary(r, phA)
  const phB = makePhrase(r, Math.min(4, dens + 1), false)
  const phB2 = vary(r, phB)
  const phSlow = makePhrase(r, 0, true)

  let kc = 0
  let sc = 0
  for (let b = 0; b < bars; b++) {
    const s = sec(b)
    const chord = root + PROG[b % 4]
    const drop = s === 'dropA' || s === 'dropB'
    // Drums
    if (s !== 'break') {
      const kicks = s === 'outro' ? (b === bars - 1 ? [0] : [0, 8]) : style.kick
      for (const k of kicks) {
        ev(b, k, 'kick')
        const chartIt = s === 'intro' ? dens >= 2 || k === 0 || k === 8 : !drop
        if (chartIt && s !== 'outro') note(b, k, kc++ % 2 === 0 ? 1 : 2)
        else if (s === 'outro' && k === 0) note(b, k, kc++ % 2 === 0 ? 1 : 2)
      }
    }
    if (s === 'build' || drop) {
      for (const sn of style.snare) {
        ev(b, sn, style.clap ? 'clap' : 'snare')
        if (s === 'build' && b < 5) note(b, sn, sc++ % 2 === 0 ? 3 : 0)
      }
      if (s === 'build' && b === 5) {
        // Snare roll into the drop, charted as a rising run.
        for (let k = 8; k < 16; k++) ev(b, k, 'snare', 0, 0, 0.4 + (k - 8) * 0.08)
        const run = dens >= 2 ? [8, 10, 12, 14] : [8, 12]
        run.forEach((k, i) => note(b, k, i % 4))
      }
    }
    if (s !== 'break') {
      for (let k = 0; k < 16; k++) {
        const hs = s === 'intro' || s === 'outro' ? 'eighth' : style.hats
        if (hs === 'eighth' && k % 2 === 0) ev(b, k, 'hat', 0, 0, k % 4 === 0 ? 1 : 0.6)
        else if (hs === 'sixteenth') ev(b, k, 'hat', 0, 0, k % 4 === 0 ? 1 : k % 2 === 0 ? 0.7 : 0.4)
        else if (hs === 'offbeat' && k % 4 === 2) ev(b, k, 'ohat')
      }
    }
    if (drop && (b === 6 || b === 16 || b === 10 || b === 20)) {
      ev(b, 0, 'crash')
      note(b, 0, dens >= 2 && b % 2 === 0 ? 1 : 0, 0, true)
      note(b, 0, dens >= 2 && b % 2 === 0 ? 2 : 3, 0, true)
    }
    // Bass
    if (s === 'build' || drop) {
      if (style.name === 'Drum & Bass') {
        ev(b, 0, 'bass', hz(chord - 24), step * 7)
        ev(b, 8, 'bass', hz(chord - 24), step * 6)
      } else {
        for (let k = 0; k < 16; k += 2) {
          const oct = style.arp && k % 4 === 2 ? 12 : 0
          if (style.hats === 'offbeat' && k % 4 === 0) continue
          ev(b, k, 'bass', hz(chord - 24 + oct), step * 1.6)
        }
      }
    }
    // Pads in the break (charted as long holds)
    if (s === 'break') {
      ev(b, 0, 'pad', hz(chord - 12), step * 16)
      note(b, 0, b % 2 === 0 ? 1 : 2, 12)
    }
    // Chiptune arps
    if (style.arp && drop) {
      for (let k = 0; k < 16; k++) ev(b, k, 'lead', hz(degMidi(chord, [0, 2, 4, 5][k % 4]) + 0), step * 0.8, 0.35)
    }
    // Lead melody
    if (drop || s === 'break') {
      const ph = s === 'break' ? phSlow : s === 'dropA' ? ((b - 6) >> 1) % 2 === 0 ? phA : phA2 : ((b - 16) >> 1) % 2 === 0 ? phB : phB2
      const half = (b - (s === 'break' ? 14 : s === 'dropA' ? 6 : 16)) % 2
      let lo = 99
      let hi = -1
      for (const n of ph) {
        lo = Math.min(lo, n.deg)
        hi = Math.max(hi, n.deg)
      }
      for (const n of ph) {
        if (Math.floor(n.s / 16) !== half) continue
        const st = n.s % 16
        const m = degMidi(root + 12, n.deg)
        ev(b, st, 'lead', hz(m), n.d * step * 0.95, style.arp ? 0.9 : 1)
        if (s === 'break') continue
        const gridOk = dens === 0 ? st % 4 === 0 : dens <= 2 ? st % 2 === 0 : true
        if (!gridOk) continue
        const lane = Math.max(0, Math.min(3, Math.floor(((n.deg - lo) / (hi - lo + 1)) * 4)))
        note(b, st, lane, n.d >= 4 && dens >= 1 ? Math.min(n.d, 16 - st) : 0)
      }
      // Fill silent beats in the lead with kick/snare taps on easy songs.
      if (dens <= 1 && s !== 'break') {
        for (const k of [0, 4, 8, 12]) if (!ph.some((n) => n.s === half * 16 + k)) note(b, k, k % 8 === 0 ? 1 : 2)
      }
    }
  }

  // Clean the chart: one note per time slot (except doubles), keep lanes free during holds, respect a minimum gap.
  raw.sort((a, b) => a.t - b.t || (b.dbl ? 1 : 0) - (a.dbl ? 1 : 0))
  const minGap = (dens === 0 ? 3.5 : dens <= 2 ? 1.6 : 0.9) * step
  const notes: Note[] = []
  const laneFree = [0, 0, 0, 0]
  let lastT = -9
  let run16 = 0
  for (const n of raw) {
    const same = Math.abs(n.t - lastT) < step * 0.1
    if (same) {
      const prev = notes[notes.length - 1]
      if (!(n.dbl && prev?.dbl && prev.lane !== n.lane)) continue
    } else if (n.t - lastT < minGap) continue
    if (n.t < laneFree[n.lane]) continue
    if (!same) {
      run16 = n.t - lastT < step * 1.5 ? run16 + 1 : 0
      if (run16 > 2) continue
    }
    notes.push(n)
    laneFree[n.lane] = n.t + n.hold + step
    lastT = n.t
  }
  events.sort((a, b) => a.t - b.t)
  return {
    index,
    name: `${TITLES_A[Math.floor(r() * TITLES_A.length)]} ${TITLES_B[Math.floor(r() * TITLES_B.length)]}`,
    style,
    bpm,
    step,
    bars,
    length: bars * 16 * step,
    approach: Math.max(0.95, 1.6 - index * 0.07),
    events,
    notes,
    drops: [6, 16],
  }
}
