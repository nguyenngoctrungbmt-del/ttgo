// Slide levels. 3×3 boards were picked at an exact BFS distance from solved (par = optimal moves);
// 4×4 boards come from random walks with par = IDA* optimal moves (scratch cl-slide-gen.mjs).
// tiles: row-major, hex digits, 0 = gap.

export type SlideLevel = { size: number; tiles: string; par: number }

export const LEVELS: SlideLevel[] = [
  { size: 3, par: 3, tiles: '123460758' },
  { size: 3, par: 4, tiles: '123746058' },
  { size: 3, par: 4, tiles: '023146758' },
  { size: 3, par: 5, tiles: '123746508' },
  { size: 3, par: 9, tiles: '403716528' },
  { size: 3, par: 7, tiles: '243016758' },
  { size: 3, par: 7, tiles: '103428765' },
  { size: 3, par: 8, tiles: '412536780' },
  { size: 3, par: 9, tiles: '235014786' },
  { size: 3, par: 12, tiles: '136728054' },
  { size: 3, par: 10, tiles: '236148075' },
  { size: 3, par: 11, tiles: '412760583' },
  { size: 3, par: 12, tiles: '273156840' },
  { size: 3, par: 12, tiles: '415702836' },
  { size: 3, par: 16, tiles: '031245786' },
  { size: 3, par: 14, tiles: '023165748' },
  { size: 3, par: 15, tiles: '356180427' },
  { size: 3, par: 15, tiles: '423058761' },
  { size: 3, par: 16, tiles: '082543716' },
  { size: 3, par: 20, tiles: '730548612' },
  { size: 3, par: 17, tiles: '613027584' },
  { size: 3, par: 18, tiles: '036247815' },
  { size: 3, par: 19, tiles: '356740218' },
  { size: 3, par: 20, tiles: '085217436' },
  { size: 3, par: 23, tiles: '382056417' },
  { size: 3, par: 21, tiles: '384075612' },
  { size: 3, par: 22, tiles: '073465182' },
  { size: 3, par: 22, tiles: '548206173' },
  { size: 3, par: 23, tiles: '875364102' },
  { size: 3, par: 27, tiles: '806573412' },
  { size: 4, par: 14, tiles: '12b35a64d987e0fc' },
  { size: 4, par: 15, tiles: '1824530b96acde7f' },
  { size: 4, par: 16, tiles: '1234957806afdcbe' },
  { size: 4, par: 15, tiles: '12475b039c68daef' },
  { size: 4, par: 22, tiles: '16249a50edc8b73f' },
  { size: 4, par: 17, tiles: '502761489a3cdebf' },
  { size: 4, par: 18, tiles: '1374528c9a0b6def' },
  { size: 4, par: 19, tiles: '172453c896fedb0a' },
  { size: 4, par: 20, tiles: '5348217c09eadb6f' },
  { size: 4, par: 25, tiles: '186c234759bade0f' },
  { size: 4, par: 22, tiles: '2648173e590cdabf' },
  { size: 4, par: 23, tiles: '26340a7815de9cfb' },
  { size: 4, par: 26, tiles: '25b79160a8c3de4f' },
  { size: 4, par: 27, tiles: '51740bc39a286def' },
  { size: 4, par: 32, tiles: '817420bf536a9dce' },
]

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function slideNeighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size)
  const c = index % size
  const list: number[] = []
  if (r > 0) list.push(index - size)
  if (r < size - 1) list.push(index + size)
  if (c > 0) list.push(index - 1)
  if (c < size - 1) list.push(index + 1)
  return list
}

/** Level n (1-based) as a tile array. Past the authored set: seeded 4×4 random walks (par = walk length). */
export function slideLevel(n: number): { size: number; tiles: number[]; par: number } {
  if (n <= LEVELS.length) {
    const lv = LEVELS[n - 1]
    return { size: lv.size, par: lv.par, tiles: [...lv.tiles].map((ch) => parseInt(ch, 16)) }
  }
  const rand = mulberry32(n * 3301 + 5)
  const steps = Math.min(30 + Math.floor((n - LEVELS.length) / 2), 50)
  const tiles = Array.from({ length: 16 }, (_, i) => (i + 1) % 16)
  let empty = 15
  let prev = -1
  for (let k = 0; k < steps; k += 1) {
    const opts = slideNeighbors(empty, 4).filter((m) => m !== prev)
    const m = opts[Math.floor(rand() * opts.length)]
    ;[tiles[empty], tiles[m]] = [tiles[m], tiles[empty]]
    prev = empty
    empty = m
  }
  return { size: 4, tiles, par: steps }
}
