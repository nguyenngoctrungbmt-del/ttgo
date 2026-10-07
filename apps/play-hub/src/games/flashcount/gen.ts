/** Level builder for Flash Count: objects on the table, the questions and the flash time. */
import { clamp, rand } from '../../shared/action/fx'
import type { Kind } from './art'
import type { CountSig } from './levels'

export type Obj = { kind: Kind; x: number; y: number; vx: number; vy: number; s: number; delay: number; leave: number; rot: number }
export type QType = 'count' | 'most' | 'total'
export type Question = { type: QType; kind: Kind; answer: number; options: number[] }

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function numberOptions(answer: number, n: number): number[] {
  const set = new Set<number>([answer])
  const deltas = shuffle([-1, 1, -2, 2, -3, 3, 4, -4])
  // Bias toward the closest numbers so choices stay tricky.
  deltas.sort((a, b) => Math.abs(a) - Math.abs(b) + (Math.random() - 0.5) * 1.2)
  for (const d of deltas) {
    if (set.size >= n) break
    if (answer + d >= 0) set.add(answer + d)
  }
  let extra = answer + 5
  while (set.size < n) set.add(extra++)
  return Array.from(set).sort((a, b) => a - b)
}

/** Builds a level; a signature level fixes the cast, counts, twists and questions. */
export function genLevel(L: number, bonus: boolean, focus: number, sig: CountSig | null = null) {
  const pool = Math.min(8, 3 + Math.floor((L - 1) / 2))
  let avail = shuffle(Array.from({ length: pool }, (_, i) => i as Kind))
  let k = bonus ? Math.min(pool, 3 + Math.floor(L / 10)) : Math.min(pool, 6, 2 + Math.floor((L - 1) / 3))
  if (sig) {
    // Cast first, then every other kind (used for "how many X?" trick questions with answer 0).
    const rest = shuffle(([0, 1, 2, 3, 4, 5, 6, 7] as Kind[]).filter((x) => !sig.kinds.includes(x)))
    avail = [...sig.kinds, ...rest]
    k = sig.kinds.length
  }
  const kinds = avail.slice(0, k)
  let n = bonus ? Math.min(16, 4 + Math.floor(L * 0.6)) : Math.min(22, 3 + L)
  let counts = kinds.map(() => 1)
  if (sig?.counts) {
    counts = [...sig.counts]
    n = counts.reduce((a, b) => a + b, 0)
  } else {
    if (sig?.total) n = Math.max(k, sig.total)
    for (let i = k; i < n; i++) counts[Math.floor(Math.random() * k)] += 1
  }
  // Unique maximum so a "most" question is always fair.
  const max = Math.max(...counts)
  const tops = counts.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0)
  if (tops.length > 1) {
    counts[tops[0]] += 1
    n += 1
  }

  const cluster = sig?.cluster ?? (L >= 12 && Math.random() < 0.5)
  const moving = sig?.moving ?? (L >= 5 && Math.random() < Math.min(0.85, 0.35 + (L - 5) * 0.06))
  const sized = sig?.sized ?? L >= 9
  const late = sig?.late ?? (L >= 14 && Math.random() < 0.6)
  const objs: Obj[] = []
  const centers = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({ x: rand(0.25, 0.75), y: rand(0.25, 0.75) }))
  const minD = (cluster ? 0.75 : 1.15) * Math.sqrt(1 / n) * 0.55
  const list: Kind[] = []
  kinds.forEach((kd, i) => {
    for (let c = 0; c < counts[i]; c++) list.push(kd)
  })
  shuffle(list)
  for (const kd of list) {
    let x = 0.5
    let y = 0.5
    for (let tries = 0; tries < 40; tries++) {
      if (cluster) {
        const c = centers[Math.floor(Math.random() * centers.length)]
        x = clamp(c.x + rand(-0.22, 0.22), 0.08, 0.92)
        y = clamp(c.y + rand(-0.22, 0.22), 0.1, 0.9)
      } else {
        x = rand(0.08, 0.92)
        y = rand(0.1, 0.9)
      }
      if (objs.every((o) => Math.hypot(o.x - x, (o.y - y) * 0.8) > minD)) break
    }
    const spd = moving ? rand(0.04, 0.1) * (L >= 12 ? 1.5 : 1) : 0
    const a = rand(0, Math.PI * 2)
    objs.push({ kind: kd, x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, s: sized ? rand(0.75, 1.3) : 1, delay: 0, leave: 0, rot: rand(-0.25, 0.25) })
  }

  let flashDur = Math.max(1.3, (1.5 + n * 0.17) * (1 - Math.min(0.4, (L - 1) * 0.02))) * (1 + 0.15 * focus) * (sig?.flash ?? 1)
  if (late) {
    flashDur += 0.5
    for (const o of objs) {
      const r = Math.random()
      if (r < 0.25) o.delay = rand(0.3, flashDur * 0.45)
      else if (r < 0.4) o.leave = rand(flashDur * 0.55, flashDur * 0.85)
    }
  }

  const qs: Question[] = []
  const nOpt = L >= 9 ? 6 : 4
  const asked = new Set<number>()
  const countQ = () => {
    const choices = kinds.map((_, i) => i).filter((i) => !asked.has(kinds[i]))
    const i = choices.length ? choices[Math.floor(Math.random() * choices.length)] : 0
    asked.add(kinds[i])
    qs.push({ type: 'count', kind: kinds[i], answer: counts[i], options: numberOptions(counts[i], nOpt) })
  }
  if (sig) {
    for (const t of sig.qs) {
      if (t === 'total') qs.push({ type: 'total', kind: 0, answer: n, options: numberOptions(n, 6) })
      else if (t === 'most') {
        const best = counts.indexOf(Math.max(...counts))
        qs.push({ type: 'most', kind: kinds[best], answer: kinds[best], options: shuffle([...kinds]) })
      } else if (t === 'missing') {
        const miss = avail[k]
        asked.add(miss)
        qs.push({ type: 'count', kind: miss, answer: 0, options: numberOptions(0, nOpt) })
      } else countQ()
    }
  } else if (bonus) {
    qs.push({ type: 'total', kind: 0, answer: n, options: numberOptions(n, 6) })
  } else {
    const nq = L >= 16 && Math.random() < 0.4 ? 3 : L >= 7 ? 2 : 1
    let usedMost = false
    for (let q = 0; q < nq; q++) {
      if (L >= 10 && !usedMost && Math.random() < 0.35) {
        usedMost = true
        const best = counts.indexOf(Math.max(...counts))
        qs.push({ type: 'most', kind: kinds[best], answer: kinds[best], options: shuffle([...kinds]) })
        continue
      }
      const missing = avail.slice(k)
      if (L >= 6 && missing.length && Math.random() < 0.15 && !asked.has(missing[0])) {
        asked.add(missing[0])
        qs.push({ type: 'count', kind: missing[0], answer: 0, options: numberOptions(0, nOpt) })
        continue
      }
      countQ()
    }
  }
  return { objs, qs, flashDur, moving }
}
