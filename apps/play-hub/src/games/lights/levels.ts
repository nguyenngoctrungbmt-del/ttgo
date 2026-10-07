// Seeded Lights Out levels: 3×3 → 4×4 → 5×5. Boards are built by pressing cells on a dark
// board, so they are always solvable; par is the minimum number of presses (light chasing over
// every first-row pattern). Scratch cl-lights-check.mjs verifies levels 1–100.

export type LightsLevel = { size: number; board: boolean[]; par: number }

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function neighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size)
  const c = index % size
  const list = [index]
  if (r > 0) list.push(index - size)
  if (r < size - 1) list.push(index + size)
  if (c > 0) list.push(index - 1)
  if (c < size - 1) list.push(index + 1)
  return list
}

export function toggle(board: boolean[], index: number, size: number): boolean[] {
  const next = [...board]
  for (const i of neighbors(index, size)) next[i] = !next[i]
  return next
}

/** Minimum presses to turn every light off, or -1 if impossible. */
export function minPresses(board: boolean[], size: number): number {
  let best = -1
  for (let mask = 0; mask < 1 << size; mask += 1) {
    let b = [...board]
    let presses = 0
    for (let c = 0; c < size; c += 1) {
      if (mask & (1 << c)) {
        b = toggle(b, c, size)
        presses += 1
      }
    }
    for (let r = 1; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (b[(r - 1) * size + c]) {
          b = toggle(b, r * size + c, size)
          presses += 1
        }
      }
    }
    if (b.every((on) => !on) && (best < 0 || presses < best)) best = presses
  }
  return best
}

function spec(n: number): { size: number; presses: number } {
  const boss = n % 5 === 0 ? 2 : 0
  if (n <= 8) return { size: 3, presses: Math.min(2 + Math.floor(n / 2), 5) + Math.min(boss, 1) }
  if (n <= 20) return { size: 4, presses: Math.min(3 + Math.floor((n - 9) / 2), 8) + boss }
  return { size: 5, presses: Math.min(4 + Math.floor((n - 21) / 3), 12) + boss }
}

/** Level n (1-based), deterministic. */
export function lightsLevel(n: number): LightsLevel {
  const { size, presses } = spec(n)
  let best: LightsLevel | null = null
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const rand = mulberry32(n * 5023 + attempt * 97 + 1)
    const cells = Array.from({ length: size * size }, (_, i) => i)
    let board = Array.from({ length: size * size }, () => false)
    for (let k = 0; k < presses; k += 1) {
      const j = k + Math.floor(rand() * (cells.length - k))
      ;[cells[k], cells[j]] = [cells[j], cells[k]]
      board = toggle(board, cells[k], size)
    }
    const par = minPresses(board, size)
    // keep the intended difficulty: prefer a shortest solution close to the press count
    if (par >= Math.max(1, presses - 1)) return { size, board, par }
    if (par > 0 && (!best || par > best.par)) best = { size, board, par }
  }
  return best!
}
