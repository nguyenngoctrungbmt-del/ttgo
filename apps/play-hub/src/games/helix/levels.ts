/**
 * Hand-designed Helix Drop towers (levels 1–30). Levels beyond the list use the
 * procedural generator in HelixGame.
 *
 * Ring syntax: 12 segment chars, read clockwise from the front of the tower,
 *   '.' gap   'o' gap holding a gem   '#' solid   'x' red (deadly)
 * followed by optional space-separated modifiers:
 *   '>0.6' / '<0.6'  spin clockwise / counter-clockwise (rad/s)
 *   'b'              red blinks on and off
 *   '@3'             start rotated by 3 segments
 * Rings are listed top to bottom, so a column of characters is literally what lies
 * under each gap (for rings without spin or offset).
 * Every level is verified clearable by scratch/lv4-helix-verify.mjs (a bot with
 * limited spin speed that only steers while bouncing).
 */

export type HelixLevel = { name: string; tip?: string; rings: string[] }

/** Rotate a pattern right by k segments (used for staircases). */
function rot(p: string, k: number) {
  const n = p.length
  const s = ((k % n) + n) % n
  return p.slice(n - s) + p.slice(0, n - s)
}
function stair(p: string, count: number, step: number, mods = '') {
  return Array.from({ length: count }, (_, i) => rot(p, i * step) + (mods ? ` ${mods}` : ''))
}

export const HELIX_LEVELS: HelixLevel[] = [
  // ── Chapter 1: learn to drop ────────────────────────────────
  {
    name: 'First Drop',
    tip: 'drag to spin the tower',
    rings: ['...#########', '###.o.######', '######...###', 'o....#######', '#######....#', '...#########', '#####..o.###', '##....######'],
  },
  {
    name: 'Red Alert',
    tip: 'red is deadly — bounce on the rest',
    rings: [
      '...####x####',
      '#####...##x#',
      'x#####...###',
      '##x######..#',
      '..o###xx####',
      '####...###x#',
      '#x######...#',
      '....###xx###',
      '###x##.o.###',
      '##...###x###',
    ],
  },
  {
    name: 'Look Below',
    tip: 'pick the side of the gap with safe floor below',
    rings: [
      '...#########',
      'xx#####...##',
      '###x#####..#',
      '#.o.###x####',
      '#x#xx###...#',
      '###...######',
      '####x###..x#',
      '.....#######',
      'x##x##...###',
      '#####x##..x#',
      '##o..#######',
    ],
  },
  {
    name: 'Fireball',
    tip: 'fall through 3 rings in a row to smash the next',
    rings: [
      '...#########',
      '...####x####',
      '.o.###x#####',
      '...###x#####',
      'xxx#xxx#xxxx',
      '#####...####',
      '#####...##x#',
      '#####.o.##x#',
      '#####...##x#',
      'xxxx#xxxxxxx',
      '##.....#####',
    ],
  },
  {
    name: 'Gauntlet',
    tip: 'boss tower — red hugs every gap',
    rings: [
      'x...x#######',
      '####x...x###',
      '#x#######x..',
      '..x####x####',
      '###x..x#####',
      '######x..x##',
      'x..x########',
      '#####x...x##',
      '##x#######..',
      'o.x######x##',
      '####x..x####',
      '#x######x..x',
      '..x#########',
      '#####x.o.x##',
      'x#########..',
      '###x...x####',
    ],
  },
  // ── Chapter 2: the tower turns ──────────────────────────────
  {
    name: 'Turntable',
    tip: 'rings start spinning',
    rings: ['...#########', '####...##### >0.4', '#######...##', '.o.######### <0.4', '#####...####', '##x####...## >0.5', '...####x####', '######..o### <0.5', '#x###...####', '....#######x >0.4'],
  },
  {
    name: 'Counter Spin',
    rings: [
      '...######x##',
      '###...###### >0.6',
      '##x#####...# <0.6',
      '.o.####x#### >0.6',
      '####x###...# <0.6',
      '#...###x#### >0.7',
      'x#####...### <0.7',
      '####..#x#### >0.7',
      '##x######..# <0.7',
      '....##x#####',
    ],
  },
  {
    name: 'Spiral Stairs',
    tip: 'breather — ride the spiral',
    rings: [...stair('..o#########', 12, 1), '####......##'],
  },
  {
    name: 'Carousel',
    rings: [
      '...###x#####',
      '##x###...### >0.8',
      '######x#...#',
      '...####x#### <0.8',
      '#x###...##x#',
      '####x##..### >0.9',
      '.o.###x#####',
      'x#####...##x <0.9',
      '###...###x##',
      '##x####..### >1.0',
      '#####x##...#',
    ],
  },
  {
    name: 'Cyclone',
    tip: 'boss tower — everything spins',
    rings: [
      '...#####x###',
      '###x##...### >0.7',
      '#...####x### <0.8',
      'x######...## >0.9',
      '##..x####### <0.9',
      '#####...x### >1.0',
      'o..#x####### <1.0',
      '#####x##...# >1.0',
      '##...####x## <1.1',
      'x#####...### >1.1',
      '###x###..### <1.1',
      '...#####x### >1.2',
      '#x####...### <1.2',
      '######x#.o.#',
    ],
  },
  // ── Chapter 3: flicker ──────────────────────────────────────
  {
    name: 'Flicker',
    tip: 'blinking red switches off — time your drop',
    rings: [
      '...#########',
      'xxx####...## b',
      '####...##### ',
      'x###xxx###.. b',
      '...######### ',
      'xx..x####### b',
      '######...### ',
      '#xx#####xxx. b',
      '.o.#########',
      'xxxx###...## b',
    ],
  },
  {
    name: 'Strobe Stairs',
    rings: [...stair('...x########', 10, 2, 'b'), '#####.o...##'],
  },
  {
    name: 'Needle',
    tip: 'one-segment gaps — aim true',
    rings: [
      '.###########',
      '####.#######',
      '#x######.###',
      '##.######x##',
      '######x#.###',
      '#####.######',
      'x#########.#',
      '###o#####x##',
      '#######.####',
      '.#####x#####',
      '####x####..#',
    ],
  },
  {
    name: 'Free Fall',
    tip: 'breather — long drops make fireballs',
    rings: [
      '....########',
      '....####x###',
      '.o..###x####',
      '....##x#####',
      'xxxxxxx##xxx',
      '#####....###',
      '#####....##x',
      '#####.o..#x#',
      '#####....x##',
      'xxxxxxxxx#xx',
      '##....######',
      '##....##xx##',
      '##.o..######',
      '##....######',
    ],
  },
  {
    name: 'Storm Tower',
    tip: 'boss tower — spin and flicker',
    rings: [
      '...######x##',
      'xx###...#### b',
      '###x##...### >0.8',
      '#...####xx## b',
      'x###...##### <0.9',
      '###xx###..## b',
      '..x######### >1.0',
      '####x...#### <1.0',
      '#xx#####...# b',
      '#####..x#### >1.1',
      'o.x######### <1.1',
      '###x###...## b',
      '#######x..## >1.2',
      '...#####xx##',
    ],
  },
  // ── Chapter 4: red curtains ─────────────────────────────────
  {
    name: 'Red Curtain',
    tip: 'mostly red — find the one safe stone',
    rings: [
      '...#########',
      'xx#x..xxxxxx',
      'xxxxx#xx..xx',
      'xxxxxxxx#x..',
      'x..xxxxxxxx#',
      'xx#xx..xxxxx',
      'xxxxx#x..xxx',
      'xxxxxxxx#..x',
      'x.o.xxxxxx#x',
      '#####...####',
    ],
  },
  {
    name: 'Whirlwind',
    tip: 'faster spin',
    rings: [
      '...#########',
      '#####...#### >1.3',
      '##x######..# <1.3',
      '...####x#### >1.4',
      '####x##...## <1.4',
      '#..######x## >1.5',
      'x####...#### <1.5',
      '#####x##..o# >1.5',
      '...#######x#',
    ],
  },
  {
    name: 'Soft Landing',
    tip: 'breather',
    rings: [...stair('.....#######', 8, 3), '###..o...###'],
  },
  {
    name: 'Pinball',
    rings: [
      '..#######x##',
      '#x##...##### >0.9',
      '####x###..## b',
      '.#####x##### <1.0',
      '#####..x#### >1.1',
      '##x######.## b',
      '#..####x#### <1.1',
      'x####...#### >1.2',
      '#######x#..# b',
      'o.####x##### <1.2',
      '####...x####',
    ],
  },
  {
    name: 'Inferno',
    tip: 'boss tower — the red curtain spins',
    rings: [
      '...#########',
      'xxx#xxxx..xx >0.6',
      'xx#xxx..xxxx <0.6',
      '#####...#### ',
      'x..xxx#xxxxx >0.7',
      'xxxxx#xx..xx <0.7',
      '####...##### ',
      'xx#xx..xxxxx >0.8',
      'x...xxx#xxxx <0.8',
      '#######...##',
      'xxxx#xxx..xx >0.9',
      '..xxxxx#xxxx <0.9',
      '####.o.#####',
    ],
  },
  // ── Chapter 5: remix ────────────────────────────────────────
  {
    name: 'Double Helix',
    rings: [...stair('..x###..x###', 8, 1, '>0.5'), ...stair('###x..###x..', 6, -1, '<0.5'), '##.o..######'],
  },
  {
    name: 'Blink Twins',
    rings: [
      '...#########',
      'xx..xx###### b',
      '######xx..xx b',
      '#..xx####### >0.6',
      'xx#####xx..# b',
      '..xx######## <0.6',
      '######..xx## b',
      '#xx..####### >0.7',
      'o.#######xx# b',
      '####..xx####',
    ],
  },
  {
    name: 'Pinhole Spin',
    tip: 'one-segment gaps that turn',
    rings: [
      '..##########',
      '#####.###### >0.5',
      '##.######x## <0.5',
      '#######.#### >0.6',
      'x###.####### <0.6',
      '#########.## >0.7',
      '#.#####x#### <0.7',
      '######.##### >0.8',
      '###x#####.## <0.8',
      '.o.#########',
    ],
  },
  {
    name: 'Cascade',
    tip: 'breather — chain fireballs',
    rings: [
      '....########',
      '....##x#####',
      '.o..########',
      '....#x######',
      'xxxx#xxxxxxx',
      '######....##',
      '######....x#',
      '######.o..##',
      '######....##',
      'xxxxxxxxxx#x',
      '#....#######',
      '#....###x###',
      '#..o.#######',
      '#....#######',
      '###....#####',
    ],
  },
  {
    name: 'Tempest',
    tip: 'boss tower — fast, flickering, red',
    rings: [
      '...######x##',
      'xx##...##### >1.1',
      '###x###..#x# b',
      '..x######### <1.2',
      '####xx...### >1.2',
      'x#####x##..# b',
      '#...##x##### <1.3',
      '#####x##..x# >1.3',
      'x..#######x# b',
      '####x...#### <1.4',
      '#x#######..x >1.4',
      '..xx######## b',
      '######x...## <1.5',
      '#.o.########',
    ],
  },
  // ── Chapter 6: master towers ───────────────────────────────
  {
    name: 'Red Spiral',
    tip: 'drop on the edge that has a stone below',
    rings: ['#.##########', ...stair('..xxxxxxxxx#', 10, 2), '#####.o.####'],
  },
  {
    name: 'Gearbox',
    tip: 'neighbours spin opposite ways',
    rings: [
      '...######x##',
      '#x###..##### >1.0',
      '####x###..## <1.0',
      '..######x### >1.1',
      '#####x##..## <1.1',
      'x#..######## >1.2',
      '#####..#x### <1.2',
      '###x####..## >1.3',
      '.o.#####x### <1.3',
      '#####x##...# >1.4',
      '...###x#####',
    ],
  },
  {
    name: 'Lighthouse',
    tip: 'breather — the gaps line up',
    rings: [...stair('...#########', 6, 0), 'xxx###xxx###', ...stair('######...###', 6, 0), 'xxxxxxxx#xxx', '...o########'],
  },
  {
    name: 'Clockwork',
    rings: [
      '..#####x####',
      'x###..###### >1.5',
      '#####x##..## <1.5',
      '..x######### >1.6',
      '######..x### <1.6',
      '#x###..##### b',
      'x######..### >1.6',
      '#..x######## <1.7',
      '######x#..## b',
      '##..####x### >1.7',
      '#######.o.##',
    ],
  },
  {
    name: 'The Spire',
    tip: 'final boss — everything at once',
    rings: [
      '...#####x###',
      'xx###...#### b',
      '###x###..### >1.0',
      'x..xxxx#xxxx',
      '#####..x#### <1.1',
      '.###x####### >1.2',
      'xx#xxxx..xxx b',
      '####...x#### <1.2',
      '..x######x## >1.3',
      'xxxx#xxx..xx',
      '#x####..#### <1.3',
      '####x####.## >1.4',
      'x..######x## b',
      '#######x..## <1.4',
      '.#####x##### >1.5',
      'xxx#xx..xxxx b',
      '###...x##### <1.5',
      '#x######..## >1.6',
      '..x######### b',
      '#####.o.x###',
    ],
  },
]

export const HELIX_AUTHORED = HELIX_LEVELS.length

export type ParsedRing = { segs: (0 | 1 | 2)[]; gem: number; spin: number; blink: boolean; off: number }

export function parseRing(src: string): ParsedRing {
  const [pat, ...mods] = src.trim().split(/\s+/)
  const segs = [...pat].map((c) => (c === '.' || c === 'o' ? 0 : c === 'x' ? 2 : 1)) as (0 | 1 | 2)[]
  let spin = 0
  let blink = false
  let off = 0
  for (const m of mods) {
    if (m[0] === '>') spin = parseFloat(m.slice(1))
    else if (m[0] === '<') spin = -parseFloat(m.slice(1))
    else if (m === 'b') blink = true
    else if (m[0] === '@') off = parseInt(m.slice(1), 10)
  }
  return { segs, gem: pat.indexOf('o'), spin, blink, off }
}
