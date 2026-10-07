import type { Cell, Level, LevelSpec } from './engine'

/**
 * Hand-designed Bus Jam levels (1–30). Layouts are drawn by hand; colours were filled by
 * forward construction and every level is re-checked by an exhaustive solver with the real
 * rules and the base 5-seat bench (no boosters). After the last one the generator takes over.
 *
 * map: a–g passenger colour · A–G mystery passenger · # planter · . empty
 *      < > ^ v tunnel (arrow = side it releases riders on), queues in `tunnels` (reading order)
 * buses: arrival order · ice: [col, row, thaw count] · pairs: [col, row, col, row] VIP pairs
 */
export type AuthoredLevel = {
  name: string
  intro?: string
  hard?: boolean
  stops?: number
  map: string[]
  buses: string
  tunnels?: string[]
  ice?: [number, number, number][]
  pairs?: [number, number, number, number][]
}

export const LEVELS: AuthoredLevel[] = [
  // 1
  {
    name: 'First Ride',
    intro: 'tap a passenger with a clear path',
    map: ['aaba', 'b..b', '....'],
    buses: 'ab',
  },
  // 2
  {
    name: 'Wait Your Turn',
    intro: 'blocked passengers wait their turn',
    map: ['abbba', 'a#a#c', 'ccaa.', '.....'],
    buses: 'baca',
  },
  // 3
  {
    name: 'Bench Warmers',
    intro: 'wrong colour? they wait on the bench',
    map: ['ccbaa', 'bc#bc', 'cbacb', '..b..'],
    buses: 'cabcb',
  },
  // 4
  {
    name: 'Mystery Guests',
    intro: 'mystery passengers reveal when reachable',
    map: ['ddbad', 'aAABc', 'aCAAb', 'acbbb', '..a..'],
    buses: 'dcbaaba',
  },
  // 5
  {
    name: 'Rush Hour',
    intro: 'boss level · plan the bench',
    hard: true,
    map: ['cccbbc', 'cAcdCd', 'd#AA#a', 'cdBDcd', 'aDdaAa', '..da..'],
    buses: 'cbdacdcada',
  },
  // 6
  {
    name: 'Cold Snap',
    intro: 'frozen passengers thaw as others leave',
    map: ['accac', 'cabbb', 'cbbcb', '.....'],
    buses: 'acbcb',
    ice: [[1, 1, 2], [3, 1, 3]],
  },
  // 7
  {
    name: 'Zigzag Lane',
    intro: 'take the long way round',
    map: ['aa.ab', '##b##', 'ccd.c', 'a####', 'babdd', '####a', 'bbbbb'],
    buses: 'acbdbab',
  },
  // 8
  {
    name: 'Garden Path',
    map: ['baaaad', 'c#cb#a', 'ccbCda', 'a#CD#a', 'bdabdd', '..b...'],
    buses: 'acbdcdaab',
    ice: [[2, 2, 9], [2, 4, 9], [3, 4, 9]],
  },
  // 9
  {
    name: 'Twin Stops',
    intro: 'two buses at the stop',
    stops: 2,
    map: ['cdcbdd', 'bd##ca', 'cadddc', 'bAcdCc', '..cd..'],
    buses: 'bdacdccd',
  },
  // 10
  {
    name: 'The Fortress',
    intro: 'boss level · break the walls',
    hard: true,
    map: ['bcbacce', 'c#####b', 'a#CDB#a', 'd#AbC#a', 'dcCACee', 'dccaaab', 'dcd.ccc'],
    buses: 'caebdccadbcca',
    ice: [[3, 3, 9], [1, 5, 9], [5, 5, 9]],
  },
  // 11
  {
    name: 'Picnic Day',
    intro: 'a breather · enjoy the sun',
    map: ['bccaaa', 'c...aa', 'abbbbb'],
    buses: 'cabab',
  },
  // 12
  {
    name: 'Underpass',
    intro: 'tunnels send out more passengers',
    map: ['ccbabc', 'cbDCda', 'dcaaab', 'bd#..<'],
    buses: 'cdabcbda',
    tunnels: ['abdd'],
  },
  // 13
  {
    name: 'Heartbeat',
    map: ['dc.dc.a', 'dacdbbb', 'dcBDAdb', '.cADCa.', '..dab..', '.......'],
    buses: 'adbccdbad',
  },
  // 14
  {
    name: 'Two Tunnels',
    map: ['cdbbbed', 'bDAcABa', 'ceaacbb', '>.acc.<', 'bb###ca'],
    buses: 'bdaeccbcbaa',
    tunnels: ['eac', 'ca'],
    ice: [[3, 2, 9]],
  },
  // 15
  {
    name: 'Ice Palace',
    intro: 'boss level · the big freeze',
    hard: true,
    map: ['ddccdcb', 'beabbeb', 'aeaeaae', 'e#AeC#a', 'cECcEEc', 'ccbceea', 'c.....a'],
    buses: 'dbceabeeacecac',
    ice: [[1, 1, 9], [3, 1, 5], [5, 1, 9], [0, 3, 9], [3, 3, 9], [6, 3, 9], [3, 5, 9]],
  },
  // 16
  {
    name: 'Town Square',
    intro: 'a breather · VIP pairs travel together',
    map: ['acccb', 'b#d#d', 'accbd', 'b#b#a', 'bbbbc'],
    buses: 'cdbacbb',
    pairs: [[4, 1, 4, 2]],
  },
  // 17
  {
    name: 'Spiral',
    map: ['dcdbbdb', '######b', 'cCBBDAa', 'd#####d', 'dcddcac'],
    buses: 'dbacbcdd',
    pairs: [[6, 0, 6, 1]],
  },
  // 18
  {
    name: 'Checkers',
    map: ['eaaaecb', 'c#e#d#a', 'babaacc', 'd#a#c#c', 'ddddacc', 'a#C#A#a'],
    buses: 'ebadcadccaa',
    pairs: [[1, 0, 2, 0], [1, 4, 2, 4]],
  },
  // 19
  {
    name: 'Ferry Docks',
    stops: 2,
    map: ['bcdbbac', 'edAbAad', 'aBEBCCb', '>.aad.<', 'bbc#bab'],
    buses: 'cabdeadbbcba',
    tunnels: ['ced', 'dab'],
    pairs: [[5, 0, 5, 1]],
  },
  // 20
  {
    name: 'Grand Central',
    intro: 'boss level · peak hour',
    hard: true,
    map: ['febdffd', 'fcBCAce', 'bE#C#Aa', 'fEEeBBc', 'bfaeaea', 'eefDafe', '#abbaf#', '...^...'],
    buses: 'cefadbfeefbaaecb',
    tunnels: ['ebc'],
    ice: [[3, 3, 5], [2, 4, 9], [4, 4, 9]],
    pairs: [[4, 0, 5, 0], [4, 5, 4, 6]],
  },
  // 21
  {
    name: 'Lunch Break',
    intro: 'a breather',
    map: ['bcdddad', 'adc.aab', 'ac...ba', 'd......'],
    buses: 'dbcada',
  },
  // 22
  {
    name: 'Letter H',
    map: ['cc...be', 'cb...ed', 'eBcabAb', 'aCbaaBd', 'cb#.#db', 'cc#.#ac'],
    buses: 'bceadacbbc',
  },
  // 23
  {
    name: 'Arrowhead',
    map: ['caecada', '.bebda.', '..bad..', 'e.eae.c', 'deDeDee', 'aaEECaa', 'ca.#aec'],
    buses: 'baedcadaeecea',
    ice: [[3, 2, 9]],
    pairs: [[1, 5, 1, 6]],
  },
  // 24
  {
    name: 'Crossroads',
    stops: 2,
    map: ['cdc.bea', 'cBa.cDe', 'ece.ccc', '>.....<', 'cab.bbb', 'ccccbcc'],
    buses: 'eadcbccbbcec',
    tunnels: ['eed', 'bb'],
    ice: [[3, 5, 9]],
  },
  // 25
  {
    name: 'Blizzard',
    intro: 'boss level · frozen mysteries',
    hard: true,
    map: ['beacfec', 'cFbaaDa', 'eFB#BFd', 'ffbAbfd', 'bAF#CCb', 'cFacbFa', 'c.caf.f'],
    buses: 'efabcdbcfbaffca',
    ice: [[0, 1, 4], [3, 1, 9], [6, 1, 5], [2, 3, 9], [4, 3, 9], [0, 5, 9], [3, 5, 9], [6, 5, 9]],
    pairs: [[6, 2, 6, 3]],
  },
  // 26
  {
    name: 'Station Square',
    intro: 'a breather',
    map: ['bcbaaba', 'a#cad#d', 'dddacdd', 'd#ddd#d'],
    buses: 'bacddadd',
    pairs: [[3, 0, 3, 1]],
  },
  // 27
  {
    name: 'Labyrinth',
    map: ['aec.cbb', '##c#d##', 'bDd#dAa', 'b###b#e', 'ebedaAa', 'd#####e', 'aeaddad'],
    buses: 'cdabedaeadb',
  },
  // 28
  {
    name: 'Snake Line',
    map: ['affcaeb', '######f', 'deccbba', 'e######', 'bbddccb', '######c', '>ddddcd'],
    buses: 'abfcedbdccd',
    tunnels: ['dcc'],
    pairs: [[1, 0, 2, 0]],
  },
  // 29
  {
    name: 'Night Market',
    stops: 2,
    map: ['abcdfca', 'aFeFcCa', 'EdebbaB', 'aCfAdCc', '>.fcb.<', 'dd#E#fd', 'dadbacd'],
    buses: 'ecadbfdabefacdcd',
    tunnels: ['dde', 'de'],
    ice: [[2, 2, 9], [4, 2, 9]],
    pairs: [[6, 0, 6, 1], [2, 3, 2, 4]],
  },
  // 30
  {
    name: 'Final Rush',
    intro: 'final boss · everything at once',
    hard: true,
    map: ['accdaab', 'cFbbfGg', 'C#GEF#E', 'bFeDdEb', 'ffDBBcc', '>.cDd.<', 'dfddddb', 'ee#e#ed'],
    buses: 'cagefbdbfccddfbdee',
    tunnels: ['ebf', 'ccf'],
    ice: [[3, 1, 9], [2, 3, 9], [4, 3, 9], [1, 6, 9], [5, 6, 9]],
    pairs: [[0, 4, 1, 4], [4, 5, 4, 6]],
  },
]

export const AUTHORED = LEVELS.length

const COL = 'abcdefg'

/** Build a playable level from the authored data (null past the authored set). */
export function authoredLevel(n: number): Level | null {
  const d = LEVELS[n - 1]
  if (!d) return null
  const rows = d.map.length
  const cols = d.map[0].length
  const cells: Cell[] = []
  let walls = 0
  let hidden = 0
  let t = 0
  d.map.forEach((row) => {
    for (const ch of row) {
      const c: Cell = { kind: 'empty', color: -1, hidden: false, frozen: 0, pair: -1, queue: [], front: -1 }
      const i = cells.length
      const lower = ch.toLowerCase()
      if (ch === '#') {
        c.kind = 'wall'
        walls++
      } else if (COL.includes(lower)) {
        c.kind = 'p'
        c.color = COL.indexOf(lower)
        c.hidden = ch !== lower
        if (c.hidden) hidden++
      } else if ('<>^v'.includes(ch)) {
        c.kind = 'tunnel'
        c.front = ch === '<' ? i - 1 : ch === '>' ? i + 1 : ch === '^' ? i - cols : i + cols
        c.queue = [...(d.tunnels?.[t++] ?? '')].map((x) => COL.indexOf(x))
      }
      cells.push(c)
    }
  })
  for (const [c, r, k] of d.ice ?? []) cells[r * cols + c].frozen = k
  for (const [c1, r1, c2, r2] of d.pairs ?? []) {
    const a = r1 * cols + c1
    const b = r2 * cols + c2
    cells[a].pair = b
    cells[b].pair = a
  }
  const buses = [...d.buses].map((x) => COL.indexOf(x))
  const spec: LevelSpec = {
    n,
    cols,
    rows,
    colors: new Set(buses).size,
    buses: buses.length,
    walls,
    hidden,
    frozen: d.ice?.length ?? 0,
    tunnels: t,
    pairs: d.pairs?.length ?? 0,
    stops: d.stops ?? 1,
    slack: 5,
    park: 0,
    hard: Boolean(d.hard),
    intro: d.intro,
  }
  return { spec, cells, buses }
}
