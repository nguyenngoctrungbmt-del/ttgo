// Sumo tournament ladder: 20 rikishi (a Yokozuna champion every 5th) and the venues they fight in.

export type HairStyle = 'topknot' | 'bald' | 'wild' | 'bun2' | 'mohawk'
export type Mark = 'none' | 'beard' | 'paint' | 'scar' | 'mask' | 'brows'
/** Champion signature moves (all telegraphed): double = two charges back to back, stomp = shiko shockwave,
 * throw = edge pivot throw, storm = double charge + stomp. */
export type Signature = 'none' | 'double' | 'stomp' | 'throw' | 'storm'

export type Venue = {
  id: string
  name: string
  floor: string
  rows: string
  crowd: string[] | null
  plat: [string, string]
  ring: [string, string]
  straw: [string, string]
  /** Foot friction: lower = slippery (snow), higher = heavy sand. */
  fric: number
  decor: 'tassels' | 'lanterns' | 'torii' | 'snow' | 'neon' | 'waves' | 'blossom'
  dust: string[]
}

export type Rival = {
  name: string
  rank: string
  intro: string
  belt: string
  skin: string
  hair: string
  hairStyle: HairStyle
  mark: Mark
  mass: number
  force: number
  charge: number
  sidestep: number
  speed: number
  /** Slap barrage strength multiplier. */
  slap: number
  /** Chance a wind-up is a feint (no dash follows). */
  feint: number
  /** Extra foot grip at the straw. */
  grip: number
  venue: string
  sig: Signature
  boss?: boolean
  tip: string
}

export const VENUES: Record<string, Venue> = {
  hall: { id: 'hall', name: 'Kokugikan Hall', floor: '#1c0f08', rows: '#4a2c18', crowd: ['#f87171', '#fde68a', '#93c5fd', '#e5e7eb', '#fdba74', '#c4b5fd', '#86efac', '#f9a8d4'], plat: ['#c99a62', '#b4834e'], ring: ['#e2bd88', '#d2a56c'], straw: ['#8a6a3a', '#e9d8a6'], fric: 3.2, decor: 'tassels', dust: ['#d6a15e', '#c89a63'] },
  shrine: { id: 'shrine', name: 'Mountain Shrine', floor: '#142012', rows: '#20341d', crowd: null, plat: ['#a47a4a', '#8a6236'], ring: ['#d9b27c', '#c49a62'], straw: ['#7a5a2a', '#e2cf96'], fric: 3.3, decor: 'torii', dust: ['#c89a63', '#a3784a'] },
  festival: { id: 'festival', name: 'Night Festival', floor: '#0d0a1f', rows: '#1d1638', crowd: ['#f472b6', '#fde047', '#60a5fa', '#fb7185', '#a78bfa', '#34d399'], plat: ['#a3743f', '#86592c'], ring: ['#d7ae78', '#c19461'], straw: ['#7a5a2a', '#f2e2b0'], fric: 3.2, decor: 'lanterns', dust: ['#d6a15e', '#fde68a'] },
  snow: { id: 'snow', name: 'Snowfield Dohyo', floor: '#0f1d2e', rows: '#1e3550', crowd: ['#e0f2fe', '#bae6fd', '#fca5a5', '#fde68a', '#c7d2fe'], plat: ['#dbe7f0', '#b9cad8'], ring: ['#f1f5f9', '#d9e4ee'], straw: ['#6b7d8f', '#eef2f7'], fric: 2.3, decor: 'snow', dust: ['#ffffff', '#e0f2fe'] },
  beach: { id: 'beach', name: 'Sunset Beach', floor: '#3b1d10', rows: '#5c2e17', crowd: ['#fdba74', '#f9a8d4', '#fde68a', '#67e8f9', '#fca5a5'], plat: ['#e7c48c', '#d4ac70'], ring: ['#f3d9a4', '#e8c78c'], straw: ['#8b6b3c', '#f5e6c0'], fric: 4.1, decor: 'waves', dust: ['#f3d9a4', '#e8c78c'] },
  arena: { id: 'arena', name: 'Neon Arena', floor: '#070712', rows: '#151532', crowd: ['#22d3ee', '#e879f9', '#a3e635', '#f472b6', '#facc15'], plat: ['#5b3a8a', '#43286b'], ring: ['#d7b07a', '#c49a62'], straw: ['#3b2a63', '#c4b5fd'], fric: 3.2, decor: 'neon', dust: ['#d6a15e', '#c4b5fd'] },
  blossom: { id: 'blossom', name: 'Blossom Garden', floor: '#2a1420', rows: '#40202f', crowd: ['#fbcfe8', '#f9a8d4', '#fde68a', '#e9d5ff', '#bbf7d0'], plat: ['#c7966a', '#ad7d52'], ring: ['#e8c193', '#d7aa78'], straw: ['#86603a', '#f3e1b8'], fric: 3.1, decor: 'blossom', dust: ['#f9a8d4', '#d6a15e'] },
  royal: { id: 'royal', name: 'Imperial Grand Hall', floor: '#1a0b05', rows: '#3d1f0c', crowd: ['#fde047', '#fbbf24', '#f87171', '#e5e7eb', '#c084fc'], plat: ['#d4a855', '#b88a3a'], ring: ['#ecc888', '#dcb070'], straw: ['#7c5a1e', '#fde68a'], fric: 3.3, decor: 'tassels', dust: ['#fde68a', '#d6a15e'] },
}

// mass/force/speed scale the rival's body; charge = how often it winds up a dash; sidestep = dodging your
// charges; feint = fake wind-ups; grip = edge resistance. Curve: teach 1–4, Yokozuna at 5, breather after.
export const RIVALS: Rival[] = [
  { name: 'Chibi-maru', rank: 'Jonokuchi', intro: 'First day in the ring!', belt: '#22c55e', skin: '#f5c9a0', hair: '#1f2937', hairStyle: 'topknot', mark: 'none', mass: 0.8, force: 0.75, charge: 0, sidestep: 0, speed: 0.8, slap: 0.8, feint: 0, grip: 0, venue: 'hall', sig: 'none', tip: 'push him over the straw' },
  { name: 'Big Taro', rank: 'Jonidan', intro: 'I ate twelve bowls today.', belt: '#7c3aed', skin: '#e8b58c', hair: '#111827', hairStyle: 'topknot', mark: 'none', mass: 1.5, force: 0.82, charge: 0.1, sidestep: 0, speed: 0.75, slap: 0.8, feint: 0, grip: 0, venue: 'hall', sig: 'none', tip: 'heavy — hold still, then release to charge' },
  { name: 'Kaze', rank: 'Sandanme', intro: 'You cannot push the wind.', belt: '#0ea5e9', skin: '#f1c27d', hair: '#111827', hairStyle: 'topknot', mark: 'none', mass: 0.95, force: 0.9, charge: 0.1, sidestep: 0.5, speed: 1.1, slap: 1, feint: 0, grip: 0, venue: 'shrine', sig: 'none', tip: 'he sidesteps charges — shove him instead' },
  { name: 'Ishi', rank: 'Makushita', intro: 'Stone does not move.', belt: '#78716c', skin: '#d6a77a', hair: '#292524', hairStyle: 'bald', mark: 'brows', mass: 1.2, force: 0.95, charge: 0.5, sidestep: 0, speed: 0.92, slap: 1, feint: 0, grip: 0.3, venue: 'shrine', sig: 'none', tip: 'dodge his glowing charge' },
  { name: 'Raiden', rank: 'Yokozuna', intro: 'Thunder strikes twice.', belt: '#facc15', skin: '#e0ac69', hair: '#0b0b0b', hairStyle: 'topknot', mark: 'paint', mass: 1.35, force: 1.0, charge: 0.45, sidestep: 0.25, speed: 1.0, slap: 1.05, feint: 0, grip: 0.4, venue: 'royal', sig: 'double', boss: true, tip: 'YOKOZUNA · double charge — dodge both' },
  { name: 'Momo', rank: 'Juryo', intro: 'Peaches give me power!', belt: '#f472b6', skin: '#ffd8b8', hair: '#3f1d2b', hairStyle: 'bun2', mark: 'none', mass: 1.0, force: 0.88, charge: 0.2, sidestep: 0.2, speed: 0.95, slap: 1.1, feint: 0, grip: 0, venue: 'blossom', sig: 'none', tip: 'a cheerful breather — find your rhythm' },
  { name: 'Kitsune', rank: 'Maegashira', intro: 'Catch me if you can.', belt: '#f97316', skin: '#f5c9a0', hair: '#7c2d12', hairStyle: 'wild', mark: 'mask', mass: 1.0, force: 0.98, charge: 0.35, sidestep: 0.6, speed: 1.15, slap: 1, feint: 0.35, grip: 0, venue: 'festival', sig: 'none', tip: 'a tricky fox — some wind-ups are fakes' },
  { name: 'Yuki', rank: 'Maegashira', intro: 'The snow is my friend.', belt: '#38bdf8', skin: '#f6d5b5', hair: '#e2e8f0', hairStyle: 'topknot', mark: 'none', mass: 1.05, force: 1.0, charge: 0.3, sidestep: 0.3, speed: 1.1, slap: 1, feint: 0.1, grip: 0.8, venue: 'snow', sig: 'none', tip: 'slippery snow — he grips the edge better' },
  { name: 'Yama', rank: 'Komusubi', intro: 'A mountain of a man.', belt: '#475569', skin: '#c99266', hair: '#0f172a', hairStyle: 'topknot', mark: 'beard', mass: 2.0, force: 1.02, charge: 0.4, sidestep: 0, speed: 0.8, slap: 1, feint: 0, grip: 0.5, venue: 'shrine', sig: 'none', tip: 'huge — charge him from the side' },
  { name: 'Tetsuyama', rank: 'Yokozuna', intro: 'Feel the earth shake.', belt: '#1f2937', skin: '#d19a6a', hair: '#0b0b0b', hairStyle: 'topknot', mark: 'brows', mass: 1.6, force: 1.08, charge: 0.4, sidestep: 0.2, speed: 0.95, slap: 1.1, feint: 0, grip: 0.6, venue: 'royal', sig: 'stomp', boss: true, tip: 'YOKOZUNA · raised leg = shockwave, stay away' },
  { name: 'Nami', rank: 'Juryo', intro: 'Ride the wave, friend.', belt: '#14b8a6', skin: '#c68642', hair: '#1f2937', hairStyle: 'wild', mark: 'none', mass: 1.1, force: 0.95, charge: 0.25, sidestep: 0.25, speed: 1.0, slap: 1, feint: 0.1, grip: 0, venue: 'beach', sig: 'none', tip: 'heavy sand slows everyone — a breather' },
  { name: 'Oni', rank: 'Sekiwake', intro: 'RAAAH!', belt: '#dc2626', skin: '#e07a5f', hair: '#111827', hairStyle: 'wild', mark: 'paint', mass: 1.35, force: 1.12, charge: 0.55, sidestep: 0, speed: 1.05, slap: 1.4, feint: 0, grip: 0.3, venue: 'festival', sig: 'none', tip: 'slap barrage — never stand toe to toe' },
  { name: 'Hayate', rank: 'Sekiwake', intro: 'Too fast to see.', belt: '#a3e635', skin: '#f1c27d', hair: '#111827', hairStyle: 'mohawk', mark: 'none', mass: 0.95, force: 1.05, charge: 0.45, sidestep: 0.7, speed: 1.3, slap: 1.1, feint: 0.25, grip: 0.2, venue: 'arena', sig: 'none', tip: 'lightning feet — bait the sidestep, then shove' },
  { name: 'Kuma', rank: 'Ozeki', intro: 'The bear wakes up hungry.', belt: '#92400e', skin: '#b07a4f', hair: '#3b2412', hairStyle: 'bald', mark: 'beard', mass: 2.05, force: 1.12, charge: 0.45, sidestep: 0.1, speed: 0.92, slap: 1.2, feint: 0.1, grip: 0.7, venue: 'snow', sig: 'none', tip: 'a bear on ice — let his charges slide out' },
  { name: 'Kumo', rank: 'Yokozuna', intro: 'Clouds swallow everything.', belt: '#e2e8f0', skin: '#f1c9a5', hair: '#1e293b', hairStyle: 'topknot', mark: 'scar', mass: 1.55, force: 1.12, charge: 0.4, sidestep: 0.45, speed: 1.08, slap: 1.15, feint: 0.2, grip: 0.8, venue: 'royal', sig: 'throw', boss: true, tip: 'YOKOZUNA · grabs you at the straw — stay central' },
  { name: 'Sakura', rank: 'Maegashira', intro: 'Graceful, never gentle.', belt: '#fb7185', skin: '#ffdcc2', hair: '#4a1d2f', hairStyle: 'bun2', mark: 'none', mass: 1.05, force: 1.0, charge: 0.3, sidestep: 0.45, speed: 1.1, slap: 1.05, feint: 0.2, grip: 0.2, venue: 'blossom', sig: 'none', tip: 'a breather among the blossoms' },
  { name: 'Kurogane', rank: 'Ozeki', intro: 'Forged in black iron.', belt: '#334155', skin: '#a8714a', hair: '#0b0b0b', hairStyle: 'mohawk', mark: 'scar', mass: 1.7, force: 1.18, charge: 0.55, sidestep: 0.15, speed: 1.0, slap: 1.25, feint: 0.15, grip: 0.7, venue: 'arena', sig: 'none', tip: 'iron body — wear him down at the edge' },
  { name: 'Tengu', rank: 'Ozeki', intro: 'The mountain spirit judges you.', belt: '#b91c1c', skin: '#e8846b', hair: '#f8fafc', hairStyle: 'wild', mark: 'mask', mass: 1.25, force: 1.15, charge: 0.5, sidestep: 0.6, speed: 1.22, slap: 1.2, feint: 0.4, grip: 0.5, venue: 'shrine', sig: 'none', tip: 'feints and dodges — wait for the real charge' },
  { name: 'Umibozu', rank: 'Ozeki', intro: 'The tide always wins.', belt: '#1e3a8a', skin: '#8fa3b8', hair: '#0f172a', hairStyle: 'bald', mark: 'brows', mass: 2.2, force: 1.18, charge: 0.45, sidestep: 0.05, speed: 0.95, slap: 1.25, feint: 0.1, grip: 0.9, venue: 'beach', sig: 'none', tip: 'a sea giant — use your charge from the side' },
  { name: 'Ryujin', rank: 'Grand Yokozuna', intro: 'The dragon god descends.', belt: '#eab308', skin: '#e0ac69', hair: '#0b0b0b', hairStyle: 'topknot', mark: 'paint', mass: 1.75, force: 1.2, charge: 0.5, sidestep: 0.4, speed: 1.12, slap: 1.25, feint: 0.2, grip: 0.8, venue: 'royal', sig: 'storm', boss: true, tip: 'GRAND YOKOZUNA · double charges and stomps' },
]

export const LADDER = RIVALS.length

/** Rival for a 0-based ladder stage; after the authored ladder rivals return at a higher rank (capped). */
export function rivalFor(stage: number) {
  const rival = RIVALS[stage % LADDER]
  const tier = Math.min(3, Math.floor(stage / LADDER))
  return { rival, tier, venue: VENUES[rival.venue] ?? VENUES.hall }
}
