// Bow Duel ladder: 20 hand-made rivals (a champion every 5th), each with a look, weapon, habits and a battlefield.
import type { Look, Weapon } from './art'

/** Signature habits: regen = heals each turn, dodge = may sidestep your shot, gust = summons headwind, triple = three-shot volley. */
export type Sig = 'regen' | 'dodge' | 'gust' | 'triple'

export type OppDef = {
  name: string
  title: string
  taunt: string
  weapon: Weapon
  hp: number
  err: number
  look: Look
  /** Index into SKIES (battlefield theme). */
  sky: number
  boss?: boolean
  armor?: number
  double?: boolean
  aimHead?: boolean
  sigs?: Sig[]
}

const L = (o: Partial<Look> & Pick<Look, 'shirt' | 'hat'>): Look => ({ skin: '#f2c094', trim: '#78350f', pants: '#3f3f46', hatColor: '#166534', hair: '#5b3415', size: 1, ...o })

export const PLAYER_LOOK = L({ shirt: '#2563eb', trim: '#fbbf24', pants: '#1e3a8a', hat: 'cap', hatColor: '#f97316', hair: '#7c2d12' })

// err: aim error (1 = sloppy, 0.25 = sharp). Teach 1–4, champion 5/10/15/20, breather after each champion.
export const LADDER: OppDef[] = [
  { name: 'Robin', title: 'the Rookie', taunt: 'First duel? Mine too!', weapon: 'bow', hp: 60, err: 1.0, sky: 0, look: L({ shirt: '#15803d', hat: 'hood', hatColor: '#166534', pants: '#57534e' }) },
  { name: 'Bjorn', title: 'the Bear', taunt: 'My axe is hungry.', weapon: 'axe', hp: 85, err: 0.9, sky: 0, look: L({ shirt: '#92400e', hat: 'viking', hatColor: '#94a3b8', hair: '#ea580c', skin: '#f5c9a0', size: 1.08 }) },
  { name: 'Sela', title: 'the Swift', taunt: 'Wind? I ride it.', weapon: 'spear', hp: 70, err: 0.8, sky: 1, look: L({ shirt: '#be123c', hat: 'band', hatColor: '#fde047', hair: '#1c1917', skin: '#c68642' }) },
  { name: 'Hans', title: 'Ironhelm', taunt: 'Aim lower, friend.', weapon: 'bow', hp: 90, err: 0.7, armor: 0.6, sky: 1, look: L({ shirt: '#475569', hat: 'iron', hatColor: '#9ca3af', trim: '#1f2937' }) },
  { name: 'The Shadow', title: 'Champion', taunt: 'Two arrows. One fate.', weapon: 'bow', hp: 140, err: 0.6, boss: true, double: true, sky: 3, look: L({ shirt: '#1f2937', hat: 'shadow', hatColor: '#111827', skin: '#9ca3af', pants: '#0f172a' }) },
  { name: 'Wren', title: 'the Wanderer', taunt: 'Lovely leaves, lovely day.', weapon: 'bow', hp: 80, err: 0.75, sky: 5, look: L({ shirt: '#a16207', hat: 'feather', hatColor: '#dc2626', hair: '#7c2d12', pants: '#365314' }) },
  { name: 'Marla', title: 'the Mystic', taunt: 'My wounds close by themselves.', weapon: 'spear', hp: 100, err: 0.55, sigs: ['regen'], sky: 2, look: L({ shirt: '#6d28d9', hat: 'wizard', hatColor: '#4c1d95', hair: '#e5e7eb', trim: '#fde047' }) },
  { name: 'Gork', title: 'the Brute', taunt: 'GORK THROW. GORK WIN.', weapon: 'axe', hp: 150, err: 0.5, sky: 6, look: L({ shirt: '#78350f', hat: 'brute', hatColor: '#000000', hair: '#1c1917', skin: '#84cc16', size: 1.18 }) },
  { name: 'Yuki', title: 'the Silent', taunt: '…', weapon: 'spear', hp: 90, err: 0.45, aimHead: true, sigs: ['dodge'], sky: 3, look: L({ shirt: '#111827', hat: 'ninja', hatColor: '#1f2937', pants: '#111827', size: 0.94 }) },
  { name: 'Frost King', title: 'Champion', taunt: 'Winter takes everything.', weapon: 'axe', hp: 200, err: 0.36, boss: true, double: true, armor: 0.8, sky: 4, look: L({ shirt: '#0ea5e9', hat: 'crown', hatColor: '#e0f2fe', hair: '#f8fafc', skin: '#dbeafe', trim: '#f8fafc', size: 1.1 }) },
  { name: 'Captain Gale', title: 'the Pirate', taunt: 'Yarr, the sea breeze favours me!', weapon: 'bow', hp: 110, err: 0.55, sky: 0, look: L({ shirt: '#b91c1c', hat: 'pirate', hatColor: '#111827', hair: '#1c1917', trim: '#fbbf24', pants: '#1e293b' }) },
  { name: 'Sir Cedric', title: 'the Bold', taunt: 'Have at thee!', weapon: 'bow', hp: 130, err: 0.42, armor: 0.6, sky: 0, look: L({ shirt: '#1d4ed8', hat: 'knight', hatColor: '#cbd5e1', trim: '#fde047' }) },
  { name: 'Kaito', title: 'the Blade', taunt: 'Strike, and I am gone.', weapon: 'spear', hp: 120, err: 0.4, sigs: ['dodge'], sky: 5, look: L({ shirt: '#991b1b', hat: 'samurai', hatColor: '#1f2937', hair: '#0b0b0b', trim: '#fbbf24', pants: '#1c1917' }) },
  { name: 'Zara', title: 'of the Dunes', taunt: 'The desert wind is mine to call.', weapon: 'spear', hp: 125, err: 0.4, sigs: ['gust'], sky: 6, look: L({ shirt: '#f59e0b', hat: 'band', hatColor: '#0e7490', hair: '#1c1917', skin: '#b07a4f', pants: '#78350f' }) },
  { name: 'Storm Caller', title: 'Champion', taunt: 'Bow before the tempest!', weapon: 'spear', hp: 190, err: 0.34, boss: true, double: true, sigs: ['gust'], sky: 2, look: L({ shirt: '#312e81', hat: 'wizard', hatColor: '#1e1b4b', hair: '#e0e7ff', skin: '#c7d2fe', trim: '#38bdf8', size: 1.06 }) },
  { name: 'Jinx', title: 'the Jester', taunt: 'Catch me if you caaan!', weapon: 'axe', hp: 115, err: 0.48, sigs: ['dodge'], sky: 1, look: L({ shirt: '#7c3aed', hat: 'jester', hatColor: '#facc15', trim: '#22c55e', pants: '#be185d' }) },
  { name: 'Magma Mo', title: 'the Smelter', taunt: 'I heal in the heat.', weapon: 'axe', hp: 165, err: 0.36, sigs: ['regen'], sky: 7, look: L({ shirt: '#7f1d1d', hat: 'brute', hatColor: '#000000', hair: '#f97316', skin: '#a8a29e', size: 1.16 }) },
  { name: 'Ronin Ash', title: 'the Wanderer', taunt: 'One shot is all I need.', weapon: 'bow', hp: 140, err: 0.3, aimHead: true, sigs: ['dodge'], sky: 3, look: L({ shirt: '#374151', hat: 'samurai', hatColor: '#7f1d1d', hair: '#e5e7eb', trim: '#9ca3af', pants: '#111827' }) },
  { name: 'Iron Duchess', title: 'of Northmark', taunt: 'My aim is as cold as my armour.', weapon: 'bow', hp: 170, err: 0.32, armor: 0.5, double: true, sky: 4, look: L({ shirt: '#64748b', hat: 'knight', hatColor: '#e2e8f0', trim: '#be185d', pants: '#334155' }) },
  { name: 'The Sun King', title: 'Grand Champion', taunt: 'Three suns rise. You fall.', weapon: 'bow', hp: 230, err: 0.28, boss: true, armor: 0.8, sigs: ['triple', 'regen'], sky: 7, look: L({ shirt: '#ca8a04', hat: 'sun', hatColor: '#fde047', hair: '#7c2d12', skin: '#d6a77a', trim: '#fef3c7', pants: '#78350f', size: 1.08 }) },
]

export function oppFor(duel: number): OppDef {
  const base = LADDER[(duel - 1) % LADDER.length]
  const tier = Math.min(3, Math.floor((duel - 1) / LADDER.length))
  return { ...base, name: tier ? `${base.name} ${['', 'II', 'III', 'IV'][tier]}` : base.name, hp: Math.round(base.hp * (1 + tier * 0.3)), err: base.err * Math.pow(0.82, tier) }
}

export function hasSig(o: OppDef, s: Sig) {
  return !!o.sigs?.includes(s)
}
