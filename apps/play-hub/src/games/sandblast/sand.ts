/**
 * Falling-sand field for Sand Blast.
 * Cells: 0 empty, 1..COLORS*4 = colour*4 + shade + 1, RAINBOW_BASE+shade wildcard
 * grains, STONE never moves or clears. Simulation runs on 8×8 chunks and
 * skips chunks that did not change last step (sleeping regions).
 */

export const SW = 60
export const SH = 96
export const BLOCK = 6
export const STONE = 255
export const RAINBOW_BASE = 200
const CH = 8
const CW_N = Math.ceil(SW / CH)
const CH_N = Math.ceil(SH / CH)

export function colorOf(v: number) {
  if (v === 0 || v === STONE) return -1
  if (v >= RAINBOW_BASE) return 99
  return (v - 1) >> 2
}

export class SandField {
  g = new Uint8Array(SW * SH)
  active = new Uint8Array(CW_N * CH_N)
  next = new Uint8Array(CW_N * CH_N)
  moved = 0
  private flip = false
  private stamp = new Int32Array(SW * SH)
  private stampN = 1
  private queue = new Int32Array(SW * SH)

  clear() {
    this.g.fill(0)
    this.wakeAll()
  }

  wakeAll() {
    this.active.fill(1)
  }

  wake(x: number, y: number) {
    const cx = (x / CH) | 0
    const cy = (y / CH) | 0
    for (let dy = -1; dy <= 1; dy++) {
      const yy = cy + dy
      if (yy < 0 || yy >= CH_N) continue
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx + dx
        if (xx < 0 || xx >= CW_N) continue
        this.next[yy * CW_N + xx] = 1
      }
    }
  }

  set(x: number, y: number, v: number) {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return
    this.g[y * SW + x] = v
    this.wake(x, y)
    this.active[((y / CH) | 0) * CW_N + ((x / CH) | 0)] = 1
  }

  get(x: number, y: number) {
    if (x < 0 || x >= SW || y >= SH) return STONE
    if (y < 0) return 0
    return this.g[y * SW + x]
  }

  /** One cellular-automaton pass; returns grains moved. */
  step(): number {
    const g = this.g
    this.next.fill(0)
    let moved = 0
    this.flip = !this.flip
    for (let y = SH - 2; y >= 0; y--) {
      const cy = (y / CH) | 0
      const ltr = ((y & 1) === 0) === this.flip
      for (let k = 0; k < SW; k++) {
        const x = ltr ? k : SW - 1 - k
        if (!this.active[cy * CW_N + ((x / CH) | 0)]) {
          // skip the rest of this sleeping chunk row segment
          const edge = ltr ? ((((x / CH) | 0) + 1) * CH) - 1 : ((x / CH) | 0) * CH
          k += ltr ? edge - x : x - edge
          continue
        }
        const i = y * SW + x
        const v = g[i]
        if (v === 0 || v === STONE) continue
        const below = i + SW
        if (g[below] === 0) {
          g[below] = v
          g[i] = 0
          moved++
          this.wake(x, y)
          continue
        }
        const first = (x + y + (this.flip ? 1 : 0)) & 1 ? -1 : 1
        for (let s = 0; s < 2; s++) {
          const dx = s === 0 ? first : -first
          const nx = x + dx
          if (nx < 0 || nx >= SW) continue
          if (g[below + dx] === 0 && g[i + dx] === 0) {
            g[below + dx] = v
            g[i] = 0
            moved++
            this.wake(x, y)
            this.wake(nx, y + 1)
            break
          }
        }
      }
    }
    const t = this.active
    this.active = this.next
    this.next = t
    this.moved = moved
    return moved
  }

  /** Highest occupied row (SH if empty). */
  top(): number {
    for (let y = 0; y < SH; y++) {
      const row = y * SW
      for (let x = 0; x < SW; x++) if (this.g[row + x] !== 0) return y
    }
    return SH
  }

  /**
   * Find a same-colour group (rainbow counts as any colour) touching both side
   * walls. Returns its cell indices or null.
   */
  findBridge(colors: number): { color: number; cells: number[] } | null {
    const g = this.g
    for (let c = 0; c < colors; c++) {
      this.stampN++
      const st = this.stampN
      for (let y0 = 0; y0 < SH; y0++) {
        const start = y0 * SW
        const v0 = g[start]
        if (v0 === 0 || this.stamp[start] === st) continue
        const c0 = colorOf(v0)
        if (c0 !== c && c0 !== 99) continue
        let head = 0
        let tail = 0
        this.queue[tail++] = start
        this.stamp[start] = st
        let hasColor = c0 === c
        let reach = false
        while (head < tail) {
          const i = this.queue[head++]
          const x = i % SW
          const y = (i / SW) | 0
          if (x === SW - 1) reach = true
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy
            if (yy < 0 || yy >= SH) continue
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue
              const xx = x + dx
              if (xx < 0 || xx >= SW) continue
              const j = yy * SW + xx
              if (this.stamp[j] === st) continue
              const cj = colorOf(g[j])
              if (cj !== c && cj !== 99) continue
              this.stamp[j] = st
              if (cj === c) hasColor = true
              this.queue[tail++] = j
            }
          }
        }
        if (reach && hasColor) return { color: c, cells: Array.from(this.queue.subarray(0, tail)) }
      }
    }
    return null
  }

  removeCells(cells: number[]) {
    for (const i of cells) this.g[i] = 0
    this.wakeAll()
  }

  /** Blast a circle of grains away; returns removed positions. */
  blast(cx: number, cy: number, r: number): number {
    let n = 0
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(SH - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(SW - 1, Math.ceil(cx + r)); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue
        if (this.g[y * SW + x]) n++
        this.g[y * SW + x] = 0
      }
    }
    this.wakeAll()
    return n
  }
}

// ── Pieces ────────────────────────────────────────

export const TETROS: [number, number][][] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], // I
  [[0, 0], [1, 0], [0, 1], [1, 1]], // O
  [[0, 0], [1, 0], [2, 0], [1, 1]], // T
  [[1, 0], [2, 0], [0, 1], [1, 1]], // S
  [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
  [[0, 0], [0, 1], [1, 1], [2, 1]], // J
  [[2, 0], [0, 1], [1, 1], [2, 1]], // L
]

export function rotateBlocks(b: [number, number][]): [number, number][] {
  const r = b.map(([x, y]) => [-y, x] as [number, number])
  const mx = Math.min(...r.map((c) => c[0]))
  const my = Math.min(...r.map((c) => c[1]))
  return r.map(([x, y]) => [x - mx, y - my] as [number, number])
}

export type Piece = { blocks: [number, number][]; x: number; y: number; color: number; kind: 'sand' | 'rainbow' | 'bomb' }

export function pieceWidth(p: Piece) {
  return (Math.max(...p.blocks.map((b) => b[0])) + 1) * BLOCK
}

/** Does the piece overlap sand / walls at (x, y)? */
export function collides(f: SandField, p: Piece, x: number, y: number) {
  const yi = Math.floor(y)
  for (const [bx, by] of p.blocks) {
    const x0 = x + bx * BLOCK
    const y0 = yi + by * BLOCK
    if (x0 < 0 || x0 + BLOCK > SW || y0 + BLOCK > SH) return true
    for (let yy = Math.max(0, y0); yy < y0 + BLOCK; yy++) {
      const row = yy * SW
      for (let xx = x0; xx < x0 + BLOCK; xx++) if (f.g[row + xx] !== 0) return true
    }
  }
  return false
}

// ── Level specs ───────────────────────────────────

export type LevelSpec = { n: number; colors: number; goal: number; speed: number; fill: number; stones: number; hard: boolean; intro?: string }

export function specFor(n: number): LevelSpec {
  const hard = n % 5 === 0
  const base: LevelSpec = { n, colors: 2, goal: 2, speed: 8, fill: 0, stones: 0, hard }
  switch (n) {
    case 1:
      return { ...base, intro: 'drag to move · tap to rotate' }
    case 2:
      return { ...base, colors: 3, goal: 3, speed: 9, intro: 'swipe down to drop' }
    case 3:
      return { ...base, colors: 3, goal: 3, speed: 10, fill: 0.14, intro: 'old sand counts too' }
    case 4:
      return { ...base, colors: 4, goal: 4, speed: 10.5, fill: 0.12, intro: 'a fourth colour joins' }
    case 5:
      return { ...base, colors: 4, goal: 5, speed: 13, fill: 0.18, stones: 3 }
  }
  const k = n - 5
  return {
    ...base,
    colors: Math.min(6, 4 + Math.floor(k / 4) + (hard ? 1 : 0)),
    goal: Math.min(10, 4 + Math.floor(k / 2) + (hard ? 1 : 0)),
    speed: Math.min(30, 11 + k * 0.9) * (hard ? 1.2 : 1),
    fill: Math.min(0.3, 0.14 + k * 0.01),
    stones: Math.min(6, Math.floor(k / 2) + (hard ? 3 : 0)),
    intro: n === 6 ? 'grey stones never clear' : undefined,
  }
}

export type Rng = () => number
export function makeRng(seed: number): Rng {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/**
 * Old sand for a level: block-sized clumps of mixed colours piled from the
 * floor, never already bridging (each row band is broken by a different colour).
 */
export function fillTerrain(f: SandField, spec: LevelSpec, rng: Rng) {
  f.clear()
  if (spec.fill <= 0) return
  const cols = SW / BLOCK
  const maxRows = Math.max(1, Math.round((SH / BLOCK) * spec.fill))
  const heights: number[] = []
  for (let c = 0; c < cols; c++) heights.push(Math.max(1, Math.round(maxRows * (0.45 + 0.55 * Math.abs(Math.sin(c * 0.7 + rng() * 6))))))
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < heights[c]; r++) {
      // neighbouring columns differ in colour so no band spans the field
      let color = Math.floor(rng() * spec.colors)
      if (c > 0) {
        const left = f.g[(SH - 1 - r * BLOCK) * SW + (c * BLOCK - 1)]
        const lc = left ? (left - 1) >> 2 : -1
        if (lc === color) color = (color + 1) % spec.colors
      }
      for (let y = 0; y < BLOCK; y++) {
        for (let x = 0; x < BLOCK; x++) {
          const gx = c * BLOCK + x
          const gy = SH - 1 - r * BLOCK - y
          f.g[gy * SW + gx] = color * 4 + 1 + Math.floor(rng() * 4)
        }
      }
    }
  }
  for (let s = 0; s < spec.stones; s++) {
    const c = Math.floor(rng() * cols)
    const r = Math.floor(rng() * Math.max(1, Math.min(heights[c], 3)))
    for (let y = 0; y < BLOCK; y++) for (let x = 0; x < BLOCK; x++) f.g[(SH - 1 - r * BLOCK - y) * SW + c * BLOCK + x] = STONE
  }
  f.wakeAll()
}
