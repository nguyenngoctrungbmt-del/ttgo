import type { Arrow, Dir, Level, LevelSpec } from './engine'

/**
 * Hand-designed Arrow Escape pictures (1–30). Each picture mask was drawn by hand and
 * packed with arrows by reverse construction; every level is re-checked by an exact solver
 * (escaping only frees space, so repeatedly launching every free arrow is complete).
 *
 * map: > v < ^ arrow head (its body is the same-symbol path right behind it)
 *      R D L U single-cell arrow · # stone · . empty
 */
export type AuthoredPicture = { name: string; intro?: string; hard?: boolean; map: string[] }

export const LEVELS: AuthoredPicture[] = [
  // 1
  {
    name: 'First Flight',
    intro: 'tap an arrow with a clear path',
    map: [
      'UUUU',
      'LUUR',
      'LLRR',
      'LDDD',
    ],
  },
  // 2
  {
    name: 'Diamond',
    intro: 'a blocked arrow costs a heart',
    map: [
      '..R..',
      '.URU.',
      'ULLUU',
      '.RRR.',
      '..L..',
    ],
  },
  // 3
  {
    name: 'Snakes',
    intro: 'long arrows follow their head',
    map: [
      'bU^UU',
      'b^bU^',
      'va.Ua',
      'Da.DU',
      'ab>RR',
      'vbDDD',
    ],
  },
  // 4
  {
    name: 'Heart',
    map: [
      '.UU.U^',
      'bb^b>a',
      'vaaRRD',
      'D<bbRD',
      '.DLbR.',
      '..RD..',
    ],
  },
  // 5
  {
    name: 'Full House',
    intro: 'hard level · packed grid',
    hard: true,
    map: [
      'RUaaU^',
      '<b<aUa',
      'LLL<cR',
      'LUa>cR',
      'L^RccR',
      'Laa^.b',
      'DLDbbb',
    ],
  },
  // 6
  {
    name: 'Smiley',
    intro: 'a breather',
    map: [
      '.^UaUU.',
      'LbUa>RU',
      '^^.b.RR',
      'baabRRa',
      '^.Db>.a',
      'aR...Dv',
      '.RDDDR.',
    ],
  },
  // 7
  {
    name: 'Cottage',
    map: [
      '...U...',
      '..URR..',
      '.Ub>UR.',
      'Ua>RRRR',
      '.ab>RR.',
      '.Lb.aR.',
      '.DD.a>.',
      '.DDLDD.',
    ],
  },
  // 8
  {
    name: 'Rock Path',
    intro: 'stones never move — go around them',
    map: [
      'UU<aUUR',
      '^L#aURR',
      'aLLRRRR',
      'aLL^#cR',
      'cbbaccR',
      'c#b>vRR',
      'cc>d>RR',
      'D<adD#D',
    ],
  },
  // 9
  {
    name: 'Pine Tree',
    map: [
      '...R...',
      '..ULU..',
      '.ULLbb.',
      '..a>b..',
      '.DaDvD.',
      'UDLa>DR',
      '..LLL..',
      '...L...',
      '..<aR..',
    ],
  },
  // 10
  {
    name: 'Fortress',
    intro: 'hard level · storm the walls',
    hard: true,
    map: [
      'U.b^.UU.',
      'b^bbaaaD',
      'ba#Uv#ac',
      'bbLU.bbv',
      '<bLD<bRa',
      'c^#b.#Rv',
      'vaav<aRR',
      'LLL<caaR',
      'LLcccDDD',
    ],
  },
  // 11
  {
    name: 'Goldfish',
    intro: 'a breather',
    map: [
      '..LLUR...',
      '.^UU^c^.U',
      'aaU.cca^R',
      'LL<a^URbU',
      '.DRDbRD.R',
      '..Raa>...',
    ],
  },
  // 12
  {
    name: 'Star',
    map: [
      '....R....',
      '...UUb...',
      'LLULUvaaU',
      '.LLU<c<a.',
      '..UcccR..',
      '.DDD.Daa.',
      '.DD...Rv.',
      '<a.....<b',
    ],
  },
  // 13
  {
    name: 'Letter A',
    map: [
      '..Rb>..',
      '.^aa>R.',
      'bbU.b>^',
      'cU...^c',
      'caa>DaR',
      'cbbb>aR',
      'c>...aR',
      'L....aR',
      'DL...b>',
    ],
  },
  // 14
  {
    name: 'Rocket',
    map: [
      '...R...',
      '..UUR..',
      '..a.U..',
      '.aa.Ua.',
      '.aa.Ra.',
      '.RvRRv.',
      '.bb^Rb.',
      'LbvaDb>',
      'UU.a.RR',
      'L..a..R',
    ],
  },
  // 15
  {
    name: 'The Maze',
    intro: 'hard level · long snakes',
    hard: true,
    map: [
      'UUUUUUUU',
      'a>UUUUUU',
      'cb#Uaaa^',
      'cbb<aRRb',
      'cLbbL#R^',
      'caabRb>c',
      'c<avUbba',
      'c#DD^aaa',
      'vDDDaa#R',
      'DDD<bc>R',
    ],
  },
  // 16
  {
    name: 'Kitty',
    intro: 'a breather',
    map: [
      'U.....R',
      'UL...^R',
      'aa>UUaR',
      'D.LaU.R',
      'DDDa>RR',
      'D<a.La>',
      '.aaDLR.',
    ],
  },
  // 17
  {
    name: 'Hourglass',
    map: [
      'UU<cbbb',
      '.U^ab>.',
      '..baR..',
      '...a...',
      '..DvL..',
      '.aL<bb.',
      'LvDDDa>',
      'RDDDDDD',
    ],
  },
  // 18
  {
    name: 'Crown',
    map: [
      'U..L..RU',
      '^U.L.RUU',
      'cU<bbU^R',
      'ca>bbacD',
      'bb#b#v^R',
      'bvD.DbbR',
      'bDDDDRa>',
    ],
  },
  // 19
  {
    name: 'Butterfly',
    map: [
      'RU.....RU',
      'L<b...URR',
      'LL^U.URRa',
      'aaa^D^c^v',
      '.bDbDacc.',
      'LvD<a<b^R',
      'LLDD.DLaR',
      '<aL...b>R',
      '.R.....R.',
    ],
  },
  // 20
  {
    name: 'Big Heart',
    intro: 'hard level · love is complicated',
    hard: true,
    map: [
      '.UUU.UUa.',
      'LUbbRUUv^',
      '^<bRUUUbb',
      'cca>^URaa',
      'UDLbb^Rva',
      '.L^bRacR.',
      '..abbbv..',
      '...DDD...',
      '....D....',
    ],
  },
  // 21
  {
    name: 'Sunshine',
    intro: 'a breather',
    map: [
      'L..U..D',
      '.U.U.U.',
      '..<aa..',
      'L<c<bRR',
      '..DRb..',
      '.U.D.U.',
      'L..D..R',
    ],
  },
  // 22
  {
    name: 'Anchor',
    map: [
      '...L...',
      '..a>U..',
      '...L...',
      'aa>RDUR',
      '...L...',
      '...^...',
      'D..a..R',
      'DL.a.RR',
      '.RaaDR.',
    ],
  },
  // 23
  {
    name: 'Mushroom',
    map: [
      '..RUUUR..',
      '.LDLaUb>.',
      'LUL#a#R^U',
      'LUD<aRcaU',
      'U<aDb>vDU',
      '...bba...',
      '...bbv...',
      '..LD<cc..',
    ],
  },
  // 24
  {
    name: 'Lighthouse',
    map: [
      '...R...',
      '..R.a..',
      '..L#a..',
      '..LLv..',
      '.bL<bb.',
      '.b.R.b.',
      '.bb#Rc.',
      '.ava>v.',
      '^vc>.aa',
      'bbbD<aa',
    ],
  },
  // 25
  {
    name: 'Dragon Scale',
    intro: 'hard level · scales of stone',
    hard: true,
    map: [
      'UUU<abbbU',
      'a^#UUb>RU',
      'aaLLb#^R^',
      'LLL<bDaRa',
      'L#.c^Da#^',
      'LL<caRRRb',
      'LLL#DDRRa',
      'ULbba>Raa',
      '<ccvDc#aa',
      'DDccccD<a',
    ],
  },
  // 26
  {
    name: 'Cloud Nine',
    intro: 'a breather',
    map: [
      '..a^b....',
      '.aacbR.R.',
      'UvDUbb>RD',
      'L<b^<c^RD',
      '.Daaccaa.',
    ],
  },
  // 27
  {
    name: 'Skeleton Key',
    map: [
      '.UUU.....',
      'DLUaU....',
      'LL.aaaaRU',
      'L^.<b<aRR',
      '.ba>..b.R',
      'DcaDDDvDR',
      'LvDDDDDDL',
    ],
  },
  // 28
  {
    name: 'Lightning',
    map: [
      '....<bL',
      '...aab.',
      '..Ua>..',
      '.DRb>RD',
      'D<b<aR.',
      '...UaD.',
      '..DDD..',
      '.<aR...',
      'DLR....',
      'DL.....',
    ],
  },
  // 29
  {
    name: 'Castle',
    map: [
      '^.a.U.U.R',
      'b<aUUUUU^',
      'b.#UU^#ac',
      'bLLUaa.ac',
      '^bL#U#.ac',
      'avaa>RRac',
      'aDLD.<aac',
      'aLa...<bc',
      'LLv...DbR',
    ],
  },
  // 30
  {
    name: 'Grand Escape',
    intro: 'final boss · the great tangle',
    hard: true,
    map: [
      'aaUUUUbbb',
      'aaUL<ab>R',
      'Lv#U.U#RR',
      'LD.L^URa>',
      'LLbbaRRRR',
      'aaLb#^RRR',
      'aaLvDaRRR',
      'avLLLaRa>',
      'ab#D.a#Rb',
      'av<ab>RRb',
      '<cLbba>Dv',
    ],
  },
]

export const AUTHORED = LEVELS.length

const HEAD = '>v<^'
const SINGLE = 'RDLU'
const DXS = [1, 0, -1, 0]
const DYS = [0, 1, 0, -1]

/** Build a playable level from the authored data (null past the authored set). */
export function authoredLevel(n: number): Level | null {
  const d = LEVELS[n - 1]
  if (!d) return null
  const rows = d.map.length
  const cols = d.map[0].length
  const ch = (i: number) => d.map[Math.floor(i / cols)][i % cols]
  const nb4 = (i: number) => {
    const x = i % cols
    const y = Math.floor(i / cols)
    const o: number[] = []
    if (x > 0) o.push(i - 1)
    if (x < cols - 1) o.push(i + 1)
    if (y > 0) o.push(i - cols)
    if (y < rows - 1) o.push(i + cols)
    return o
  }
  const stones: number[] = []
  const arrows: Arrow[] = []
  const add = (cells: number[], dir: Dir) => arrows.push({ id: arrows.length, cells, dir, color: (arrows.length * 5 + n) % 6, gone: false })
  for (let i = 0; i < cols * rows; i++) {
    const c = ch(i)
    if (c === '#') stones.push(i)
    else if (SINGLE.includes(c)) add([i], SINGLE.indexOf(c) as Dir)
    else if (HEAD.includes(c)) {
      const dir = HEAD.indexOf(c) as Dir
      const b = (Math.floor(i / cols) - DYS[dir]) * cols + (i % cols) - DXS[dir]
      const letter = ch(b)
      const comp = new Set([b])
      const q = [b]
      while (q.length) {
        const a = q.pop()!
        for (const j of nb4(a)) {
          if (!comp.has(j) && ch(j) === letter) {
            comp.add(j)
            q.push(j)
          }
        }
      }
      // walk the body as a path starting right behind the head
      const path = [b]
      const seen = new Set([b])
      const walk = (): boolean => {
        if (path.length === comp.size) return true
        for (const j of nb4(path[path.length - 1])) {
          if (!comp.has(j) || seen.has(j)) continue
          seen.add(j)
          path.push(j)
          if (walk()) return true
          seen.delete(j)
          path.pop()
        }
        return false
      }
      walk()
      add([...path.reverse(), i], dir)
    }
  }
  const filled = arrows.reduce((s, a) => s + a.cells.length, 0)
  const spec: LevelSpec = {
    n,
    cols,
    rows,
    fill: filled / Math.max(1, cols * rows - stones.length),
    maxLen: Math.max(...arrows.map((a) => a.cells.length)),
    stones: stones.length,
    hard: Boolean(d.hard),
    intro: d.intro,
  }
  return { spec, arrows, stones }
}
