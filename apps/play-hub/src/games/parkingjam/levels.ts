import type { Car, Dir, Level, LevelSpec } from './engine'

/**
 * Hand-designed Parking Jam lots (1–30). Each car is a letter; its UPPERCASE cell is the
 * front. # = cone. Every lot is checked by an exact solver (removal is monotone, so a greedy
 * sweep is complete) to clear with zero bumps using taps and reverse swipes.
 * ice: [car, cars that must leave first] · granny: [crosswalk side 0 right/1 down/2 left/3 up, lane]
 */
export type AuthoredLot = {
  name: string
  intro?: string
  hard?: boolean
  granny?: [number, number]
  map: string[]
  ice?: [string, number][]
}

export const LEVELS: AuthoredLot[] = [
  // 1
  {
    name: 'First Drive',
    intro: 'tap a car to drive it out',
    map: [
      '.c..',
      '.C..',
      'aAbB',
      '..d.',
      '..D.',
    ],
  },
  // 2
  {
    name: 'Honk!',
    intro: 'blocked cars bump — the driver gets angry',
    map: [
      'aA.bB',
      'c...d',
      'C...D',
      '.eE..',
      'fF.gG',
    ],
  },
  // 3
  {
    name: 'Reverse Gear',
    intro: 'swipe a car to drive it in reverse',
    map: [
      '.a..h',
      '.ACcH',
      '.iI.g',
      '...EG',
      '.BDe.',
      '.bdFf',
    ],
  },
  // 4
  {
    name: 'Big Rigs',
    intro: 'trucks are long — plan their way out',
    map: [
      '.JIigG',
      'Fj.H..',
      'f.bh..',
      '..bAaC',
      'E.B..c',
      'eDd..c',
    ],
  },
  // 5
  {
    name: 'Mall Rush',
    intro: 'hard level · packed lot',
    hard: true,
    map: [
      'Hh.OnD',
      'FEeoNd',
      'fB##..',
      '.bAaaC',
      'IiGgjc',
      'm...Jc',
      'MLlKk.',
    ],
  },
  // 6
  {
    name: 'Cone Zone',
    intro: 'cones never move',
    map: [
      '..LKkg',
      '.#l.FG',
      'a...f.',
      'a.J#.h',
      'ACj..h',
      'ecBb#H',
      'EDd.Ii',
    ],
  },
  // 7
  {
    name: 'Crosswalk',
    intro: 'wait for grandma to cross!',
    granny: [1, 3],
    map: [
      '.L...K',
      '.liI.k',
      '...HGg',
      'Dd.h.E',
      '.cBb.e',
      'jC...e',
      'JFfaaA',
    ],
  },
  // 8
  {
    name: 'Island',
    granny: [1, 3],
    map: [
      'FG.BbJ',
      'fg..Aj',
      'Kk##a.',
      'i.##.d',
      'IHocCD',
      '.hOnle',
      'mM.NLE',
    ],
  },
  // 9
  {
    name: 'Winter Lot',
    intro: 'iced cars thaw as others leave',
    granny: [2, 2],
    map: [
      '.iIddDe',
      'OoG...E',
      'N#gC.#F',
      'nmMc..f',
      'lhHc.kK',
      'L....b.',
      'JjaaAB.',
    ],
    ice: [['f', 4], ['k', 3]],
  },
  // 10
  {
    name: 'Stadium Exit',
    intro: 'hard level · gridlock looms',
    hard: true,
    granny: [2, 6],
    map: [
      'cCeEQig',
      'B...qIg',
      'bAa#q.G',
      'Pp#.#Ss',
      '.Oo#.mM',
      '.tTlKJj',
      'dD.LkFh',
      'RrNnkfH',
    ],
    ice: [['r', 5], ['h', 4]],
  },
  // 11
  {
    name: 'Sunday Drive',
    intro: 'a breather',
    map: [
      '....iI',
      '.Jj..c',
      '.b..Gc',
      '.bAagC',
      'fB.hH.',
      'FDd.eE',
    ],
  },
  // 12
  {
    name: 'Side Streets',
    intro: 'everyone parked sideways',
    granny: [0, 6],
    map: [
      'ffFLll.',
      'jJKkk..',
      'Pp.OoNn',
      '.......',
      'bB.cCgG',
      'MmIiDd.',
      '..eE.hH',
      'Aa.....',
    ],
  },
  // 13
  {
    name: 'Diagonal Cones',
    granny: [3, 2],
    map: [
      '#....Dn',
      'Mm.cCdN',
      'Hh#..dJ',
      'PpOokKj',
      '.G.a#qQ',
      '.g.ALl.',
      '.g.Fff#',
      'IibBeE.',
    ],
    ice: [['p', 7]],
  },
  // 14
  {
    name: 'Valet Chaos',
    granny: [2, 2],
    map: [
      'RrOq.mM',
      '.ioQgGK',
      'NIHh..k',
      'n...F.k',
      'nLl.fpP',
      'c.j...b',
      'C.JaA.B',
      'Ee...dD',
    ],
    ice: [['l', 7], ['r', 4]],
  },
  // 15
  {
    name: 'Airport Pickup',
    intro: 'hard level · terminal traffic',
    hard: true,
    granny: [0, 3],
    map: [
      'rRNnKPeE',
      'Ss.LkptT',
      '.##lk##.',
      '.Qqb.Jj.',
      'Gg.BAaaC',
      'F##..##c',
      'f.Dd...c',
      'uI.HhOmM',
      'Ui...ovV',
    ],
    ice: [['u', 3], ['f', 6], ['s', 4]],
  },
  // 16
  {
    name: 'Car Wash',
    intro: 'a breather',
    granny: [1, 2],
    map: [
      '...ccC',
      'ffF.g.',
      '.Ll.GB',
      'E.##.b',
      'e.Ddh.',
      'k...HA',
      'KJjIia',
    ],
  },
  // 17
  {
    name: 'Truck Stop',
    intro: 'trucks everywhere',
    granny: [0, 4],
    map: [
      'O.hH.iI',
      'oJjbB.D',
      'o.....d',
      'M...e..',
      'm..AE..',
      'mKkaGg.',
      '.Ppa.Nn',
      'FfCc.lL',
    ],
  },
  // 18
  {
    name: 'Frozen Rows',
    granny: [0, 5],
    map: [
      'I.qr.EO',
      'i.QR.eo',
      'DLnK...',
      'dlnk.B.',
      'a.N..bh',
      'Af.jg.H',
      'cfpJg.M',
      'CFP.G.m',
    ],
    ice: [['o', 7], ['a', 6], ['i', 5], ['j', 5]],
  },
  // 19
  {
    name: 'Plus Sign',
    granny: [1, 1],
    map: [
      '...qQ.F.',
      'Ggg#O.f.',
      'ECc#o.f.',
      'e####.lL',
      'Aaa#k.DJ',
      'Ii..K.dj',
      'b...mMn.',
      'B..s..Nr',
      'HhhS.pPR',
    ],
    ice: [['r', 7], ['o', 6]],
  },
  // 20
  {
    name: 'Concert Night',
    intro: 'hard level · everyone leaves at once',
    hard: true,
    granny: [0, 7],
    map: [
      'qkkKnNPp',
      'QMmLlVv.',
      'OG..J...',
      'ogFfj.Dd',
      'oc..jUu.',
      '.c.r...B',
      '.C.RsaAb',
      '.Ii.S.Hh',
      'EeetT.wW',
    ],
    ice: [['a', 7], ['m', 7], ['q', 4]],
  },
  // 21
  {
    name: 'Corner Shop',
    intro: 'a breather',
    granny: [0, 1],
    map: [
      '#...K.#',
      'HhfFkgG',
      '.bjAac.',
      '.BJMiC.',
      'EelmIdD',
      '#.L...#',
    ],
  },
  // 22
  {
    name: 'Zigzag Cones',
    granny: [3, 6],
    map: [
      'Ddd..ooO',
      '.#.q.gGJ',
      '.a#QeEFj',
      '.a.#..fj',
      '.A.rkKlL',
      '.b.R#...',
      '.B.S.#..',
      'Ccnspi#.',
      'MmN.PIHh',
    ],
    ice: [['j', 3], ['g', 4]],
  },
  // 23
  {
    name: 'Two Garages',
    granny: [2, 6],
    map: [
      'Uu.BAaa.',
      '.Nnb...K',
      'c.lb...k',
      'C.l##.Pp',
      '.hL##..J',
      'dH..f..j',
      'D.M.FSs.',
      'EemggGiI',
      'RrQqOoTt',
    ],
    ice: [['t', 6], ['h', 3], ['o', 7]],
  },
  // 24
  {
    name: 'Rush Hour',
    granny: [1, 4],
    map: [
      '.TtIjjJO',
      'QqfibBdo',
      'L.f..AD.',
      'l.FH.a..',
      'l..hR...',
      '.m..rCkK',
      '.Mg..c..',
      'Vvgusc.p',
      'NnGUSEeP',
    ],
    ice: [['s', 6], ['u', 7], ['v', 3]],
  },
  // 25
  {
    name: 'Black Friday',
    intro: 'hard level · the mall is full',
    hard: true,
    granny: [1, 0],
    map: [
      '..iI..jJ',
      'Kk..wffF',
      'xX#HW#Uu',
      'lc.h...E',
      'lC..bbBe',
      'LDdGrmmM',
      '..#gR#qQ',
      'o.....A.',
      'O..tv.as',
      'PppTVnNS',
    ],
    ice: [['v', 6], ['p', 4], ['t', 7], ['k', 3]],
  },
  // 26
  {
    name: 'Drive-In',
    intro: 'a breather',
    granny: [0, 3],
    map: [
      'NH..Ggg',
      'nh....F',
      '...M..f',
      'L..meEf',
      'l.jJ.kK',
      'lIi...d',
      'CcaAbBD',
    ],
    ice: [['k', 4]],
  },
  // 27
  {
    name: 'Ring Road',
    granny: [3, 2],
    map: [
      '.G.Ff...',
      '.g..sSUt',
      'R.#..#uT',
      'r.OoMm.j',
      'Dd..Cc.j',
      '..#.a#.J',
      'n...ahHI',
      'npl.A.ei',
      'NPlbB.Ei',
      'qQL...Kk',
    ],
    ice: [['m', 6], ['l', 4], ['e', 5]],
  },
  // 28
  {
    name: 'Hospital Lot',
    granny: [3, 3],
    map: [
      'QqS.fFT.',
      'J.s##.tI',
      'jHh.ggGi',
      'UubAa.C.',
      '#.B...c#',
      '.rrR..c.',
      'OMmLl.Kk',
      'oV.##nN.',
      'ov.....p',
      'wWdD.eEP',
    ],
    ice: [['r', 4], ['v', 4], ['a', 6], ['p', 3]],
  },
  // 29
  {
    name: 'Harbour Ferry',
    granny: [2, 3],
    map: [
      'Nn.vMm.f',
      'Bb.V..Of',
      'QqeeE.oF',
      'WwUuSsTt',
      '.Rr.iHhh',
      'A...I.xX',
      'a....J..',
      'a....jd.',
      'PpLlKkdG',
      'ccC...Dg',
    ],
    ice: [['t', 7], ['g', 4], ['m', 5], ['i', 4]],
  },
  // 30
  {
    name: 'Grand Finale',
    intro: 'final boss · the ultimate jam',
    hard: true,
    granny: [0, 4],
    map: [
      'aV..gGSI',
      'AvpteFsi',
      '.#PTEf#.',
      'ZzJ.rRuU',
      'Yyj##ooO',
      'qqQ..m.H',
      '.Ll.CM.h',
      '.#..c.#.',
      'kKDddWwx',
      'Bbb..NnX',
    ],
    ice: [['p', 5], ['v', 4], ['k', 3], ['t', 3]],
  },
]

export const AUTHORED = LEVELS.length

/** Build a playable lot from the authored data (null past the authored set). */
export function authoredLevel(n: number): Level | null {
  const d = LEVELS[n - 1]
  if (!d) return null
  const rows = d.map.length
  const cols = d.map[0].length
  const parts = new Map<string, { x: number; y: number; head: boolean }[]>()
  const cones: number[] = []
  d.map.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '#') cones.push(y * cols + x)
      else if (ch !== '.') {
        const k = ch.toLowerCase()
        const list = parts.get(k) ?? []
        list.push({ x, y, head: ch !== k })
        parts.set(k, list)
      }
    }),
  )
  const keys = [...parts.keys()].sort()
  const cars: Car[] = keys.map((k, id) => {
    const cs = parts.get(k)!
    const h = cs.find((c) => c.head) ?? cs[cs.length - 1]
    const t = cs.find((c) => !c.head) ?? cs[0]
    const dir: Dir = t.y === h.y ? (t.x < h.x ? 0 : 2) : t.y < h.y ? 1 : 3
    const len = cs.length
    const x = dir === 0 ? h.x - len + 1 : dir === 2 ? h.x + len - 1 : h.x
    const y = dir === 1 ? h.y - len + 1 : dir === 3 ? h.y + len - 1 : h.y
    const ice = d.ice?.find(([c]) => c === k)?.[1] ?? 0
    return { id, x, y, len, dir, color: (id * 3 + n) % 8, ice, gone: false }
  })
  const grandma = Boolean(d.granny)
  const spec: LevelSpec = {
    n,
    cols,
    rows,
    cars: cars.length,
    trucks: cars.filter((c) => c.len === 3).length,
    cones: cones.length,
    ice: d.ice?.length ?? 0,
    grandma,
    hard: Boolean(d.hard),
    time: Math.round(22 + cars.length * 3.4 + (grandma ? 10 : 0)),
    intro: d.intro,
  }
  return { spec, cars, cones, side: (d.granny?.[0] ?? 0) as Dir, cross: d.granny?.[1] ?? 0 }
}
