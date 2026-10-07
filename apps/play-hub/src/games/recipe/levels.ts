import { BINS, type Menu } from './art'

export type Entry = { id: string; count: number; no: boolean }
export type Item = { menu: Menu; steps: string[]; display: Entry[] }

export const UNLOCK: { level: number; menu: Menu }[] = [
  { level: 1, menu: 'burger' },
  { level: 3, menu: 'drink' },
  { level: 6, menu: 'hotdog' },
  { level: 9, menu: 'sundae' },
]

export function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)]
}

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toDisplay(steps: string[]): Entry[] {
  const display: Entry[] = []
  for (const s of steps) {
    const last = display[display.length - 1]
    if (last && last.id === s && !last.no) last.count += 1
    else display.push({ id: s, count: 1, no: false })
  }
  return display
}

/** Random order item for level L. `cut` trims it (2 = combo half, 1 = breather level). */
export function genItem(menu: Menu, L: number, cut: number): Item {
  let steps: string[] = []
  if (menu === 'burger') {
    const n = Math.max(2, Math.min(6, 2 + Math.floor((L - 1) / 2)) - cut)
    steps = shuffle([...BINS.burger]).slice(0, n)
    if (L >= 10 && Math.random() < 0.3) {
      const i = Math.floor(Math.random() * steps.length)
      steps.splice(i, 0, steps[i])
    }
  } else if (menu === 'drink') {
    steps.push(pick(['cupS', 'cupM', 'cupL']))
    const flavor = pick(['cola', 'orange', 'lime'])
    const ice = Math.random() < 0.6
    const iceFirst = Math.random() < 0.5
    if (ice && iceFirst) steps.push('ice')
    steps.push(flavor)
    if (ice && !iceFirst) steps.push('ice')
    if (L >= 5 && Math.random() < 0.7) steps.push('lid')
  } else if (menu === 'hotdog') {
    const k = Math.max(1, Math.min(4, 1 + Math.floor((L - 6) / 3)) - cut)
    steps = ['sausage', ...shuffle(BINS.hotdog.slice(1)).slice(0, k)]
    if (L >= 10 && Math.random() < 0.25) steps.splice(steps.length - 1, 0, steps[steps.length - 1])
  } else {
    const scoops = 1 + (L >= 11 ? 1 : 0) + (L >= 15 ? 1 : 0) - (cut ? 1 : 0)
    for (let i = 0; i < Math.max(1, scoops); i++) steps.push(pick(['vanilla', 'choc', 'berry']))
    const tops = Math.max(1, Math.min(3, 1 + Math.floor((L - 9) / 4)) - cut)
    steps.push(...shuffle(['sauce', 'sprinkles', 'cream', 'banana']).slice(0, tops))
    if (Math.random() < 0.5) steps.push('cherry')
  }
  const display = toDisplay(steps)
  // Special request: an ingredient you must leave out.
  if (L >= 7 && Math.random() < 0.35) {
    const pool = menu === 'drink' ? ['ice', 'lid'].filter((i) => !steps.includes(i)) : BINS[menu].filter((i) => !steps.includes(i) && i !== 'sausage')
    if (pool.length) {
      const at = 1 + Math.floor(Math.random() * Math.max(1, display.length - 1))
      display.splice(Math.min(at, display.length), 0, { id: pick(pool), count: 1, no: true })
    }
  }
  return { menu, steps, display }
}

/** Ticket reading time before the Sharp Memory upgrade. */
export function memoTime(total: number, L: number, rush: boolean) {
  return Math.max(1.6, 0.9 + total * 0.5 - L * 0.02) * (rush ? 0.85 : 1)
}

// ── Signature levels ─────────────────────────────────────────
// Each order is 'B|D|H|S ingredient…' (burger, drink, hot dog, sundae); '!id' is a NO request shown at
// that spot on the ticket; ' + ' joins a combo order. Every 5th level is a boss (3+ orders, double tips).

export type SigLevel = { level: number; name: string; tip?: string; boss?: boolean; orders: string[] }

const MENU_CODE: Record<string, Menu> = { B: 'burger', D: 'drink', H: 'hotdog', S: 'sundae' }

export const SIGNATURES: SigLevel[] = [
  { level: 1, name: 'First Shift', tip: 'remember the order', orders: ['B patty cheese'] },
  { level: 2, name: 'Tomato Time', orders: ['B patty tomato'] },
  { level: 3, name: 'Soda Fountain', tip: 'drinks are on!', orders: ['D cupM ice cola'] },
  { level: 4, name: 'Classic Cheeseburger', orders: ['B patty cheese lettuce'] },
  { level: 5, boss: true, name: 'Lunch Rush', orders: ['B patty cheese lettuce tomato', 'D cupL ice orange lid', 'B bacon patty cheese pickle'] },
  { level: 6, name: 'Hot Dog Stand', tip: 'hot dogs are on!', orders: ['H sausage mustard'] },
  { level: 8, name: 'Hold the Onions', tip: 'NO means leave it out', orders: ['B patty !onion cheese lettuce tomato pickle'] },
  { level: 9, name: 'Ice Cream Parlour', tip: 'sundaes are on!', orders: ['S vanilla sprinkles cherry'] },
  { level: 10, boss: true, name: 'Breakfast Rush', orders: ['B patty egg egg bacon cheese tomato', 'D cupL orange ice lid', 'B egg bacon patty cheese lettuce pickle'] },
  { level: 12, name: 'Combo Meal', tip: 'two items, one ticket', orders: ['B patty cheese lettuce pickle + D cupM cola ice'] },
  { level: 14, name: 'Ballpark Dog', orders: ['H sausage ketchup mustard !onion relish'] },
  { level: 15, boss: true, name: 'Sundae Funday', orders: ['S vanilla choc berry sauce cream cherry', 'S choc choc berry sprinkles banana', 'S berry vanilla vanilla cream sauce cherry'] },
  { level: 17, name: 'Double Double', tip: 'watch the x2s', orders: ['B patty patty cheese !onion bacon bacon lettuce'] },
  { level: 18, name: 'Movie Night', orders: ['H sausage cheese bacon + D cupL cola ice lid'] },
  { level: 20, boss: true, name: 'Friday Night Rush', orders: ['B patty cheese bacon !pickle lettuce tomato onion', 'H sausage ketchup ketchup mustard onion relish', 'S choc berry vanilla banana sauce sprinkles cherry'] },
  { level: 22, name: 'Picky Eater', tip: 'two NO requests', orders: ['B patty !onion cheese lettuce !pickle tomato bacon'] },
  { level: 25, boss: true, name: 'Birthday Party', orders: ['S vanilla vanilla choc sprinkles cream cherry + D cupS orange', 'S berry choc choc banana sauce sprinkles', 'B patty cheese egg bacon + D cupM ice lime lid'] },
  { level: 27, name: 'Chili Dog Deluxe', orders: ['H sausage cheese onion !mustard relish bacon'] },
  { level: 30, boss: true, name: 'Food Truck Festival', orders: ['H sausage mustard relish + D cupL lime ice lid', 'B bacon patty egg pickle + D cupS cola lid', 'S choc vanilla cream + D cupM ice orange'] },
  { level: 32, name: 'Banana Split', orders: ['S vanilla choc berry banana sauce cream cherry'] },
  { level: 33, name: 'Frosty Floats', tip: 'drinks only — no ice!', orders: ['D cupL !ice cola lid', 'D cupS orange lid'] },
  { level: 35, boss: true, name: 'Stadium Rush', orders: ['H sausage ketchup mustard mustard onion relish', 'H sausage cheese bacon !ketchup pickle onion', 'B patty patty cheese pickle onion bacon lettuce'] },
  { level: 36, name: 'Kids Menu', tip: 'a breather', orders: ['B patty cheese tomato + D cupS lime'] },
  { level: 38, name: 'Salad Bar Burger', orders: ['B lettuce tomato patty !bacon onion pickle lettuce'] },
  { level: 40, boss: true, name: 'Midnight Diner', orders: ['B patty egg bacon cheese !onion tomato lettuce', 'S choc choc berry sauce banana cream cherry', 'H sausage bacon cheese onion !relish ketchup', 'D cupL ice cola lid'] },
  { level: 42, name: 'Tower Burger', tip: 'patty, cheese, repeat', orders: ['B patty cheese patty cheese bacon lettuce tomato'] },
  { level: 45, boss: true, name: "Critic's Visit", tip: 'one shot per plate', orders: ['B patty cheese !pickle egg bacon lettuce onion', 'S berry vanilla choc sprinkles sauce cream cherry', 'H sausage mustard relish onion !cheese pickle'] },
  { level: 48, name: 'Brunch Combo', orders: ['B egg bacon patty cheese + D cupM orange ice lid'] },
  { level: 50, boss: true, name: 'Grand Opening', orders: ['B patty cheese bacon egg !onion lettuce tomato + D cupL cola lid', 'H sausage ketchup mustard relish onion + D cupM lime ice', 'S vanilla choc berry banana sauce sprinkles cherry', 'B patty patty cheese cheese pickle bacon tomato'] },
]

export const SIG_BY_LEVEL = new Map(SIGNATURES.map((s) => [s.level, s]))
export const AUTHORED = Math.max(...SIGNATURES.map((s) => s.level))

export function parseOrder(code: string): Item[] {
  return code.split(' + ').map((part) => {
    const [m, ...tokens] = part.trim().split(/\s+/)
    const menu = MENU_CODE[m]
    const steps = tokens.filter((t) => !t.startsWith('!'))
    const display: Entry[] = []
    for (const t of tokens) {
      if (t.startsWith('!')) {
        display.push({ id: t.slice(1), count: 1, no: true })
        continue
      }
      const last = display[display.length - 1]
      if (last && last.id === t && !last.no) last.count += 1
      else display.push({ id: t, count: 1, no: false })
    }
    return { menu, steps, display }
  })
}

const SCOOPS = ['vanilla', 'choc', 'berry']
const CUPS = ['cupS', 'cupM', 'cupL']
const FLAVORS = ['cola', 'orange', 'lime']

/** Checks every signature order against the game rules; returns a list of problems (empty = valid). */
export function validateSignatures(): string[] {
  const errs: string[] = []
  const seen = new Set<number>()
  for (const s of SIGNATURES) {
    const tag = `L${s.level}`
    if (seen.has(s.level)) errs.push(`${tag} duplicate`)
    seen.add(s.level)
    if (!!s.boss !== (s.level % 5 === 0)) errs.push(`${tag} boss flag must match every 5th level`)
    if (s.boss && s.orders.length < 3) errs.push(`${tag} boss needs 3+ orders`)
    if (!s.orders.length) errs.push(`${tag} no orders`)
    const unlocked = UNLOCK.filter((u) => u.level <= s.level).map((u) => u.menu)
    for (const code of s.orders) {
      const parts = code.split(' + ')
      if (parts.some((p) => !MENU_CODE[p.trim().split(/\s+/)[0]])) {
        errs.push(`${tag} bad menu code in "${code}"`)
        continue
      }
      const items = parseOrder(code)
      if (items.length > 2) errs.push(`${tag} combos are max 2 items`)
      for (const it of items) {
        const st = it.steps
        if (!unlocked.includes(it.menu)) errs.push(`${tag} ${it.menu} not unlocked yet`)
        if (st.length < 2) errs.push(`${tag} ${it.menu} needs 2+ steps`)
        if (st.length > 8) errs.push(`${tag} ${it.menu} too long`)
        for (const id of st) if (!BINS[it.menu].includes(id)) errs.push(`${tag} ${id} is not a ${it.menu} tray`)
        for (const en of it.display.filter((e) => e.no)) {
          if (!BINS[it.menu].includes(en.id)) errs.push(`${tag} NO ${en.id} is not a ${it.menu} tray`)
          if (st.includes(en.id)) errs.push(`${tag} NO ${en.id} is also required`)
          if (en.id === 'sausage') errs.push(`${tag} NO sausage`)
        }
        if (it.display.length > 12) errs.push(`${tag} ticket row overflow`)
        if (it.menu === 'drink') {
          if (!CUPS.includes(st[0]) || st.filter((x) => CUPS.includes(x)).length !== 1) errs.push(`${tag} drink needs exactly one cup first`)
          if (st.filter((x) => FLAVORS.includes(x)).length !== 1) errs.push(`${tag} drink needs one flavor`)
          if (st.includes('lid') && st[st.length - 1] !== 'lid') errs.push(`${tag} lid must be last`)
        }
        if (it.menu === 'hotdog' && (st[0] !== 'sausage' || st.lastIndexOf('sausage') !== 0)) errs.push(`${tag} hot dog starts with one sausage`)
        if (it.menu === 'sundae') {
          const firstTop = st.findIndex((x) => !SCOOPS.includes(x))
          if (firstTop < 1) errs.push(`${tag} sundae needs scoops then toppings`)
          else if (st.slice(firstTop).some((x) => SCOOPS.includes(x))) errs.push(`${tag} scoops must come first`)
        }
      }
    }
  }
  return errs
}
