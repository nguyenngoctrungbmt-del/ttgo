import { BLOCK, SH, STONE, SW, type LevelSpec, type Rng, type SandField } from './sand'

/**
 * Hand-designed Sand Blast levels (1–30). `sand` is the old sand, drawn in 6-px blocks
 * (10 columns, bottom row last): a–f colour, # stone, . empty. Each level has a fixed
 * piece sequence (`seed`), and every level was cleared by a headless bot playing the real
 * sand simulation with that exact sequence, hard drops only and no boosters.
 */
export type AuthoredSand = {
  name: string
  intro?: string
  hard?: boolean
  colors: number
  goal: number
  speed: number
  seed: number
  sand: string[]
}

export const LEVELS: AuthoredSand[] = [
  // 1–5 tutorial
  { name: 'First Grains', intro: 'drag to move · tap to rotate', colors: 2, goal: 2, speed: 8, seed: 101, sand: [] },
  { name: 'Drop Zone', intro: 'swipe down to drop', colors: 3, goal: 3, speed: 9, seed: 202, sand: [] },
  { name: 'Old Sand', intro: 'old sand counts too', colors: 3, goal: 3, speed: 10, seed: 303, sand: ['aa......bb', 'aaab..cbbb'] },
  { name: 'Four Colours', intro: 'a fourth colour joins', colors: 4, goal: 4, speed: 10.5, seed: 404, sand: ['a........d', 'ab......cd', 'abc.dd.bcd'] },
  { name: 'Dune Storm', intro: 'hard level · faster sand', hard: true, colors: 4, goal: 5, speed: 13, seed: 505, sand: ['..b....c..', '.cba..dcb.', 'dcbad.adcb'] },
  // 6–10 stones
  { name: 'Stone Garden', intro: 'grey stones never clear', colors: 4, goal: 4, speed: 11.5, seed: 606, sand: ['....##....', 'ab..ab..cd', 'cd#.cd.#ab'] },
  { name: 'Beach Day', intro: 'a breather', colors: 3, goal: 4, speed: 11, seed: 707, sand: ['ab.....bca'] },
  { name: 'Twin Towers', intro: 'fill the gap between the towers', colors: 4, goal: 5, speed: 12.5, seed: 808, sand: ['ab......cd', 'ba......dc', 'cd......ab', 'dc......ba'] },
  { name: 'Staircase', colors: 4, goal: 5, speed: 13, seed: 909, sand: ['.........a', '.......abd', '.....dcbac', '...bcadcbd', '.acdbcbadc'] },
  { name: 'Pyramid', intro: 'hard level · crack the pyramid', hard: true, colors: 5, goal: 6, speed: 16, seed: 1010, sand: ['....ab....', '...c##d...', '..eab#ce..', '.dcebdabc.', 'abdcaebdea'] },
  // 11–15 patterns
  { name: 'Half Full', intro: 'a breather', colors: 4, goal: 5, speed: 13, seed: 1111, sand: ['abcdabcdab', 'cdabcdabcd'] },
  { name: 'Stripes', colors: 5, goal: 6, speed: 14, seed: 1212, sand: ['a.b.c.d.e.', 'abacadaeab', 'eaebeced.c'] },
  { name: 'Canyon', intro: 'dig through the canyon', colors: 5, goal: 6, speed: 15, seed: 1313, sand: ['ab......de', 'cd......ab', 'ea#....#ce', 'bdc....bad', 'acde..dbec'] },
  { name: 'Checkerboard', colors: 5, goal: 7, speed: 15.5, seed: 1414, sand: ['a.b.c.d.e.', '.c.d.e.a.b', 'd.e.a.b.c.', 'bcdeabcdea'] },
  { name: 'Sandcastle', intro: 'hard level · storm the castle', hard: true, colors: 6, goal: 7, speed: 19, seed: 1515, sand: ['#.#....#.#', 'ab#....#cd', 'ef#.##.#ab', 'cdefabcdef', 'abcdefabcd'] },
  // 16–20 bigger goals
  { name: 'Lagoon', intro: 'a breather', colors: 4, goal: 6, speed: 14, seed: 1616, sand: ['a........b', 'cd......ab'] },
  { name: 'Ramp', colors: 5, goal: 7, speed: 16, seed: 1717, sand: ['a.........', 'bc........', 'dea.......', 'bcde......', 'aebdc.....', 'cdaebd....'] },
  { name: 'Islands', intro: 'stones hold the sand up', colors: 5, goal: 7, speed: 16.5, seed: 1818, sand: ['.ab....cd.', '.##....##.', '...e..a...', '...#..#...', 'bc......ed'] },
  { name: 'Zigzag', colors: 5, goal: 8, speed: 17, seed: 1919, sand: ['ab......ab', 'cdea..bcde', 'abcdeabcde'] },
  { name: 'Avalanche', intro: 'hard level · the sand keeps coming', hard: true, colors: 6, goal: 8, speed: 21, seed: 2020, sand: ['ab......cd', 'efab..cdef', 'cd#efab#ab', 'abcdefabcd', 'efabcdefab'] },
  // 21–25 remix
  { name: 'Oasis', intro: 'a breather', colors: 4, goal: 6, speed: 15, seed: 2121, sand: ['ab......cd', 'cdab..cdab'] },
  { name: 'Bowl', colors: 5, goal: 8, speed: 18, seed: 2222, sand: ['a........e', 'bc......ab', 'dea....cde', 'abcd..eabc', 'cdeabcdeab'] },
  { name: 'Pillars', intro: 'stone pillars split the field', colors: 5, goal: 8, speed: 18.5, seed: 2323, sand: ['..#....#..', 'ab#.cd.#ea', 'cd#.ea.#bc', 'ea#.bc.#de'] },
  { name: 'Rainbow Layers', colors: 6, goal: 8, speed: 19, seed: 2424, sand: ['abcdef.abc', 'defabc.def', 'bcdefa.bcd'] },
  { name: 'Sandstorm', intro: 'hard level · blinding speed', hard: true, colors: 6, goal: 9, speed: 24, seed: 2525, sand: ['a.b.c.d.e.', 'f#a#b#c#d#', 'cdefabcdef', 'abcdefabcd'] },
  // 26–30 finale
  { name: 'Tide Pool', intro: 'a breather', colors: 5, goal: 7, speed: 17, seed: 2626, sand: ['ab.....cde', 'cdea.bcdab'] },
  { name: 'Mountain', colors: 6, goal: 9, speed: 21, seed: 2727, sand: ['....ab....', '...cdef...', '..abcdef..', '.cdefabcd.', 'efabcdefab'] },
  { name: 'Gates', intro: 'squeeze through the gates', colors: 6, goal: 9, speed: 22, seed: 2828, sand: ['##.####.##', 'ab......cd', 'ef#....#ab', 'cdab..efcd'] },
  { name: 'Mosaic', colors: 6, goal: 9, speed: 23, seed: 2929, sand: ['a.c.e.b.d.', 'fbdacfeb.c', 'cead.bfaed', 'bfcaedcbfa'] },
  { name: 'Desert King', intro: 'final boss · ten bridges at full speed', hard: true, colors: 6, goal: 10, speed: 27, seed: 3030, sand: ['#........#', 'ab#....#cd', 'efa#..#bcd', 'cdefabcdef', 'abcdefabcd', 'efab##cdef'] },
]

export const AUTHORED = LEVELS.length

export function authoredSpec(n: number): LevelSpec | null {
  const d = LEVELS[n - 1]
  if (!d) return null
  const fill = d.sand.length / (SH / BLOCK)
  const stones = d.sand.join('').split('#').length - 1
  return { n, colors: d.colors, goal: d.goal, speed: d.speed, fill, stones, hard: Boolean(d.hard), intro: d.intro }
}

/** Paint a level's old sand into the field (bottom-aligned block rows). */
export function paintAuthored(f: SandField, n: number, rng: Rng) {
  f.clear()
  const d = LEVELS[n - 1]
  if (!d) return
  const rows = d.sand.length
  d.sand.forEach((row, ri) => {
    const r = rows - 1 - ri
    ;[...row].forEach((ch, c) => {
      if (ch === '.') return
      const color = 'abcdef'.indexOf(ch)
      for (let y = 0; y < BLOCK; y++) {
        for (let x = 0; x < BLOCK; x++) {
          const gx = c * BLOCK + x
          const gy = SH - 1 - r * BLOCK - y
          if (gx >= SW) continue
          f.g[gy * SW + gx] = ch === '#' ? STONE : color * 4 + 1 + Math.floor(rng() * 4)
        }
      }
    })
  })
  f.wakeAll()
}
