/**
 * Signature levels for Grid Recall. Every other level comes from the generator in MatrixGame.
 *
 * Grid legend: '.' empty · '#' target · 'x' decoy (ignore) · '1'–'9','a'–'z' targets tapped in that order.
 * A grid is either all-ordered or unordered; ordered grids never contain decoys (they are not shown
 * during an ordered memorise phase). `rotate` turns the board after memorising (±1 = 90°, 2 = 180°).
 * The grid size must match the generator's size for that level number (see `gridSize`).
 */
export type SigLevel = {
  title: string
  boss?: boolean
  rotate?: number
  grid: string[]
}

/** Grid size the generator uses for a level; signature levels must match it. */
export function gridSize(L: number) {
  return L <= 2 ? 3 : L <= 5 ? 4 : L <= 9 ? 5 : L <= 14 ? 6 : 7
}

/** Target count the generator would pick for a plain level. */
export function genTiles(L: number) {
  const n = gridSize(L)
  return Math.max(3, Math.min(3 + Math.floor((L - 1) * 0.55), Math.floor(n * n * 0.42)))
}

/** Target cap the generator uses for an in-order level. */
export function genOrdered(L: number) {
  return Math.min(genTiles(L), 3 + Math.floor(L / 5))
}

export const SIG_LEVELS: Record<number, SigLevel> = {
  1: { title: 'First Light', grid: ['...', '###', '...'] },
  2: { title: 'Little Arrow', grid: ['.#.', '#.#', '...'] },
  3: { title: 'Stepping Stones', grid: ['#...', '.#..', '..#.', '...#'] },
  4: { title: 'Count to Three', grid: ['....', '1..3', '.2..', '....'] },
  5: { title: 'The Smile', boss: true, grid: ['#..#', '....', '#..#', '.##.'] },
  7: { title: 'Red Herring', grid: ['.....', '..#..', '.#x#.', '..#..', '.....'] },
  9: { title: 'Valley', grid: ['#...#', '#...#', '.#.#.', '..#..', '.....'] },
  10: { title: 'The Spiral', boss: true, grid: ['......', '.1234.', '....5.', '...76.', '......', '......'] },
  11: { title: 'Turning Arrow', rotate: 1, grid: ['......', '...#..', '....#.', '.####.', '....#.', '...#..'] },
  13: { title: 'Heartbeat', grid: ['.#..#.', '#.##.#', '.#..#.', '..##..', '......', '......'] },
  15: { title: 'Crossfire', boss: true, grid: ['#..x..#', '.#...#.', '..#.#..', '...x...', '..#.#..', '.#...#.', '#..x..#'] },
  17: { title: 'Twin Towers', grid: ['.......', '.......', '.#...#.', '.#...#.', '.#.x.#.', '.#...#.', '##...##'] },
  18: { title: 'Snake Trail', grid: ['.......', '.123...', '...4...', '...567.', '.......', '.......', '.......'] },
  20: { title: 'The Staircase', boss: true, rotate: 1, grid: ['1......', '2......', '345....', '..6....', '..78...', '.......', '.......'] },
  22: { title: 'Hourglass', rotate: 2, grid: ['.#####.', '..#.#..', '...#...', '..#.#..', '.#####.', '.......', '.......'] },
  25: { title: 'The Crown', boss: true, rotate: -1, grid: ['#..#..#', '##.#.##', '#######', '.x.#.x.', '.......', 'x.....x', '.......'] },
  27: { title: 'Lightning', grid: ['....1..', '...2...', '..3....', '..456..', '....7..', '...8...', '..9....'] },
  30: { title: 'Eclipse', boss: true, rotate: 1, grid: ['..###..', '.#...#.', '#.#.x.#', '#..x..#', '#.x.#.#', '.#...#.', '..###..'] },
  33: { title: 'Fortress', grid: ['#.#.#.#', '.#####.', '.#...#.', '.#.#.#.', '.#####.', '.......', '.x...x.'] },
  35: { title: 'The Hydra', boss: true, rotate: -1, grid: ['#..#..#', '##.#.##', '.#.#.#.', '..###..', '...#...', '.#####.', '.x...x.'] },
  38: { title: 'Butterfly', rotate: 2, grid: ['##...##', '#.#.#.#', '#..#..#', '#.#.#.#', '##...##', '.......', '...x...'] },
  40: { title: 'Grand Spiral', boss: true, grid: ['1234567', '......8', '...cba9', '.......', '.......', '.......', '.......'] },
  45: { title: 'Kaleidoscope', boss: true, rotate: 1, grid: ['#.#.#.#', '.#x.x#.', '#.....#', '##.#.##', '#.....#', '.#x.x#.', '#.#.#.#'] },
  50: { title: 'The Vault', boss: true, rotate: 1, grid: ['.......', '.12345.', '.....6.', '..d..7.', '..c..8.', '..ba9..', '.......'] },
  55: { title: 'The Maze', boss: true, rotate: -1, grid: ['#######', '#.....#', '#.###..', '#.#x...', '#...x..', '#####..', 'x......'] },
  60: { title: 'Total Recall', boss: true, rotate: 2, grid: ['1......', '2......', '3.....f', '4...cde', '5...b..', '6789a..', '.......'] },
}

export const AUTHORED_UNTIL = 60

export type ParsedLevel = { n: number; targets: number[]; decoys: number[]; order: boolean }

/** Turns a grid into cell indices: targets in tap order (row-major when unordered) and decoys. */
export function parseLevel(s: SigLevel): ParsedLevel {
  const n = s.grid.length
  const ordered: [number, number][] = []
  const plain: number[] = []
  const decoys: number[] = []
  s.grid.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      const i = r * n + c
      if (ch === '#') plain.push(i)
      else if (ch === 'x') decoys.push(i)
      else if (ch !== '.') ordered.push([parseInt(ch, 36), i])
    }
  })
  ordered.sort((a, b) => a[0] - b[0])
  const order = ordered.length > 0
  return { n, targets: order ? ordered.map((o) => o[1]) : plain, decoys, order }
}
