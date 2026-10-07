// Boxing ladder: 20 hand-made boxers (a title champion every 5th) and the venues they fight in.

/** bolt = lightning straight that can only be ducked (champion signature). */
export type Atk = 'jab' | 'hookL' | 'hookR' | 'upper' | 'hay' | 'bolt'
export type Hair = 'slick' | 'bald' | 'spiky' | 'buzz' | 'mohawk' | 'afro' | 'ponytail' | 'curly'
export type Acc = 'none' | 'headband' | 'patch' | 'shades' | 'scar' | 'mask' | 'tattoo'

export type Venue = {
  id: string
  name: string
  sky: [string, string, string]
  /** Crowd tint (rgb triplet) — null for an empty gym. */
  crowd: [number, number, number] | null
  floor: [string, string]
  mat: string
  ropes: [string, string, string]
  post: [string, string]
  spot: string
  decor: 'none' | 'bricks' | 'skyline' | 'banners' | 'lights' | 'lanterns' | 'palace'
}

export type FoeDef = {
  name: string
  nick: string
  taunt: string
  skin: string
  hair: string
  hairStyle: Hair
  trunks: string
  gloves: string
  build: number
  hp: number
  /** Wind-up time multiplier (lower = faster). */
  speed: number
  rest: [number, number]
  guard: number
  feint: number
  rage: boolean
  mustache?: boolean
  beard?: boolean
  crown?: boolean
  acc?: Acc
  venue: string
  patterns: Atk[][]
  tip: string
}

export const VENUES: Record<string, Venue> = {
  gym: { id: 'gym', name: 'Rusty Gym', sky: ['#120c08', '#2a1c12', '#120c08'], crowd: null, floor: ['#a8a29e', '#78716c'], mat: 'rgba(120,53,15,0.25)', ropes: ['#a16207', '#e7e5e4', '#a16207'], post: ['#57534e', '#a8a29e'], spot: '#fde68a', decor: 'bricks' },
  club: { id: 'club', name: 'Velvet Club', sky: ['#0b0613', '#1c1030', '#0b0613'], crowd: [40, 28, 60], floor: ['#cbd5e1', '#94a3b8'], mat: 'rgba(185,28,28,0.25)', ropes: ['#ef4444', '#f8fafc', '#3b82f6'], post: ['#7f1d1d', '#ef4444'], spot: '#fef3c7', decor: 'none' },
  arena: { id: 'arena', name: 'Thunder Dome', sky: ['#030712', '#0f172a', '#030712'], crowd: [30, 41, 70], floor: ['#e2e8f0', '#94a3b8'], mat: 'rgba(250,204,21,0.25)', ropes: ['#facc15', '#f8fafc', '#facc15'], post: ['#713f12', '#facc15'], spot: '#fef9c3', decor: 'lights' },
  fiesta: { id: 'fiesta', name: 'Fiesta Plaza', sky: ['#1e0b2e', '#4c1d95', '#7c2d12'], crowd: [70, 30, 50], floor: ['#fde68a', '#d97706'], mat: 'rgba(236,72,153,0.25)', ropes: ['#22c55e', '#f8fafc', '#ef4444'], post: ['#9a3412', '#fb923c'], spot: '#fed7aa', decor: 'banners' },
  rooftop: { id: 'rooftop', name: 'Midnight Rooftop', sky: ['#020617', '#1e1b4b', '#312e81'], crowd: null, floor: ['#64748b', '#334155'], mat: 'rgba(99,102,241,0.25)', ropes: ['#a5b4fc', '#e0e7ff', '#a5b4fc'], post: ['#1e293b', '#64748b'], spot: '#c7d2fe', decor: 'skyline' },
  garden: { id: 'garden', name: 'Grand Garden', sky: ['#020617', '#082f49', '#020617'], crowd: [25, 50, 80], floor: ['#e0f2fe', '#7dd3fc'], mat: 'rgba(37,99,235,0.28)', ropes: ['#2563eb', '#f8fafc', '#dc2626'], post: ['#1e3a8a', '#3b82f6'], spot: '#e0f2fe', decor: 'lights' },
  dojo: { id: 'dojo', name: 'Lantern Hall', sky: ['#1a0505', '#3b0a0a', '#1a0505'], crowd: [60, 25, 20], floor: ['#e7c9a0', '#b08a5e'], mat: 'rgba(185,28,28,0.3)', ropes: ['#dc2626', '#fef3c7', '#dc2626'], post: ['#450a0a', '#b91c1c'], spot: '#fecaca', decor: 'lanterns' },
  dock: { id: 'dock', name: 'Harbor Docks', sky: ['#04131c', '#0c3446', '#04131c'], crowd: [30, 55, 60], floor: ['#a3a3a3', '#525252'], mat: 'rgba(20,184,166,0.25)', ropes: ['#0f766e', '#ccfbf1', '#0f766e'], post: ['#134e4a', '#14b8a6'], spot: '#ccfbf1', decor: 'skyline' },
  palace: { id: 'palace', name: 'Royal Palace', sky: ['#1a0f02', '#3d2604', '#1a0f02'], crowd: [80, 60, 20], floor: ['#fef3c7', '#d4a017'], mat: 'rgba(202,138,4,0.35)', ropes: ['#ca8a04', '#fef9c3', '#ca8a04'], post: ['#713f12', '#fbbf24'], spot: '#fef9c3', decor: 'palace' },
}

// Teach 1–4 (one new attack idea each), title champion at 5/10/15/20 with a signature, breather after each.
export const FOES: FoeDef[] = [
  { name: 'Rusty Ray', nick: 'The Old Timer', taunt: 'Go easy on these knees, kid.', skin: '#f1c27d', hair: '#9ca3af', hairStyle: 'slick', trunks: '#16a34a', gloves: '#15803d', build: 1, hp: 70, speed: 1.45, rest: [1.4, 2.2], guard: 0.45, feint: 0, rage: false, venue: 'gym', patterns: [['jab'], ['hookL'], ['hookR']], tip: 'dodge, then punch back' },
  { name: 'Big Bruno', nick: 'The Fridge', taunt: 'I eat jabs for breakfast.', skin: '#e0ac69', hair: '#3f2a14', hairStyle: 'bald', trunks: '#7c3aed', gloves: '#6d28d9', build: 1.25, hp: 105, speed: 1.3, rest: [1.3, 2], guard: 0.7, feint: 0, rage: false, mustache: true, venue: 'gym', patterns: [['upper'], ['hookL'], ['hookR'], ['jab', 'jab']], tip: 'uppercuts cannot be ducked — step aside' },
  { name: 'Lightning Lee', nick: 'Quickhands', taunt: 'Blink and you miss it!', skin: '#ffdbac', hair: '#111827', hairStyle: 'spiky', trunks: '#eab308', gloves: '#ca8a04', build: 0.95, hp: 100, speed: 0.95, rest: [1, 1.6], guard: 0.6, feint: 0, rage: false, venue: 'club', patterns: [['jab', 'jab', 'jab'], ['jab', 'hookL'], ['jab', 'hookR'], ['hookL', 'hookR']], tip: 'fast combos — keep moving' },
  { name: 'Sly Santos', nick: 'The Fox', taunt: 'Was that a punch? Maybe.', skin: '#c68642', hair: '#1f2937', hairStyle: 'slick', trunks: '#dc2626', gloves: '#facc15', build: 1, hp: 112, speed: 1.05, rest: [1, 1.7], guard: 0.65, feint: 0.4, rage: false, mustache: true, venue: 'club', patterns: [['hookL'], ['hookR'], ['upper'], ['jab', 'upper']], tip: 'some wind-ups are fakes' },
  { name: 'Bolt Brannigan', nick: 'Lightning Champion', taunt: 'Thunder comes before the bolt.', skin: '#f5d0b0', hair: '#facc15', hairStyle: 'spiky', trunks: '#1d4ed8', gloves: '#facc15', build: 1.1, hp: 130, speed: 1.05, rest: [1, 1.6], guard: 0.75, feint: 0.1, rage: false, acc: 'headband', venue: 'arena', patterns: [['bolt'], ['jab', 'bolt'], ['hookL', 'hookR'], ['upper'], ['jab', 'jab']], tip: 'CHAMP · crackling straight = DUCK only' },
  { name: 'Pepe Piñata', nick: 'The Party', taunt: '¡Fiesta time, amigo!', skin: '#d8a06a', hair: '#1f2937', hairStyle: 'curly', trunks: '#ec4899', gloves: '#22c55e', build: 1.15, hp: 100, speed: 1.25, rest: [1.2, 1.9], guard: 0.55, feint: 0, rage: false, mustache: true, venue: 'fiesta', patterns: [['hookL'], ['hookR'], ['jab', 'hookL'], ['upper']], tip: 'a breather — practise perfect dodges' },
  { name: 'Iron Ivan', nick: 'The Tank', taunt: 'Your fists will break first.', skin: '#ffdbac', hair: '#d6d3d1', hairStyle: 'buzz', trunks: '#475569', gloves: '#334155', build: 1.2, hp: 140, speed: 1.05, rest: [1, 1.6], guard: 0.97, feint: 0, rage: false, beard: true, venue: 'rooftop', patterns: [['hookL', 'hookR'], ['upper'], ['hay'], ['jab', 'hay']], tip: 'only open after a dodge' },
  { name: 'Kid Komet', nick: 'Rising Star', taunt: 'I am going to be champ!', skin: '#8d5524', hair: '#111827', hairStyle: 'buzz', trunks: '#06b6d4', gloves: '#f8fafc', build: 0.92, hp: 118, speed: 0.95, rest: [0.9, 1.5], guard: 0.6, feint: 0.15, rage: false, acc: 'headband', venue: 'arena', patterns: [['jab', 'jab', 'hookR'], ['jab', 'upper'], ['hookL', 'jab'], ['bolt']], tip: 'copies the champ — watch for the bolt' },
  { name: 'Mad Mo', nick: 'The Berserker', taunt: 'HIT ME! I LIKE IT!', skin: '#8d5524', hair: '#ef4444', hairStyle: 'mohawk', trunks: '#ea580c', gloves: '#b91c1c', build: 1.05, hp: 135, speed: 0.98, rest: [0.8, 1.4], guard: 0.7, feint: 0.1, rage: true, acc: 'tattoo', venue: 'dock', patterns: [['hookL', 'jab', 'hookR'], ['upper', 'hay'], ['jab', 'jab', 'upper']], tip: 'he speeds up when hurt' },
  { name: 'Mountain Morgan', nick: 'The Avalanche', taunt: 'Mountains do not fall.', skin: '#c58c5c', hair: '#3f2a14', hairStyle: 'bald', trunks: '#0f766e', gloves: '#991b1b', build: 1.35, hp: 165, speed: 1.0, rest: [0.9, 1.5], guard: 0.92, feint: 0, rage: true, beard: true, venue: 'garden', patterns: [['hay', 'hay'], ['hookL', 'hookR', 'upper'], ['bolt', 'hay'], ['upper']], tip: 'CHAMP · double haymakers — sidestep twice' },
  { name: 'Dapper Dan', nick: 'The Gentleman', taunt: 'Shall we dance, old sport?', skin: '#f1c27d', hair: '#78350f', hairStyle: 'slick', trunks: '#1f2937', gloves: '#e5e7eb', build: 1, hp: 115, speed: 1.12, rest: [1.1, 1.8], guard: 0.7, feint: 0.3, rage: false, mustache: true, venue: 'club', patterns: [['jab'], ['hookL'], ['hookR'], ['jab', 'upper']], tip: 'a breather with polite fakes' },
  { name: 'Viper Vex', nick: 'The Snake', taunt: 'Ssso ssslow…', skin: '#e8c39e', hair: '#16a34a', hairStyle: 'ponytail', trunks: '#14532d', gloves: '#22c55e', build: 0.95, hp: 135, speed: 0.92, rest: [0.9, 1.4], guard: 0.7, feint: 0.5, rage: false, acc: 'shades', venue: 'rooftop', patterns: [['jab', 'hookL'], ['hookR', 'upper'], ['jab', 'jab', 'hookR'], ['bolt']], tip: 'half his wind-ups are fakes' },
  { name: 'Shogun Sato', nick: 'The Blade', taunt: 'One strike. One truth.', skin: '#f3d2b3', hair: '#0b0b0b', hairStyle: 'ponytail', trunks: '#b91c1c', gloves: '#f8fafc', build: 1.02, hp: 145, speed: 0.9, rest: [0.9, 1.4], guard: 0.8, feint: 0.15, rage: false, acc: 'headband', venue: 'dojo', patterns: [['jab', 'upper'], ['hookL', 'hookR', 'jab'], ['bolt', 'upper'], ['hay']], tip: 'precise combos — read every glove' },
  { name: 'Doc Hammer', nick: 'The Surgeon', taunt: 'This will only hurt a lot.', skin: '#d6a77a', hair: '#e5e7eb', hairStyle: 'buzz', trunks: '#f8fafc', gloves: '#ef4444', build: 1.15, hp: 150, speed: 0.93, rest: [0.9, 1.4], guard: 0.85, feint: 0.1, rage: true, acc: 'scar', venue: 'dock', patterns: [['hay'], ['upper', 'upper'], ['hookL', 'hay'], ['jab', 'jab', 'hay']], tip: 'heavy hitter — haymakers hurt' },
  { name: 'The Phantom', nick: 'Shadow Champion', taunt: 'You cannot hit what is not there.', skin: '#e2e8f0', hair: '#0f172a', hairStyle: 'slick', trunks: '#4c1d95', gloves: '#1e1b4b', build: 1.05, hp: 160, speed: 0.9, rest: [0.8, 1.3], guard: 0.85, feint: 0.55, rage: false, acc: 'mask', venue: 'rooftop', patterns: [['bolt', 'bolt'], ['hookL', 'hookR'], ['jab', 'hay'], ['upper', 'bolt']], tip: 'CHAMP · fakes into double bolts — duck, duck' },
  { name: 'Smiley Sam', nick: 'Sunshine', taunt: 'Win or lose, great day!', skin: '#ffdbac', hair: '#f59e0b', hairStyle: 'curly', trunks: '#facc15', gloves: '#f97316', build: 1.05, hp: 125, speed: 1.05, rest: [1, 1.7], guard: 0.6, feint: 0.05, rage: false, venue: 'fiesta', patterns: [['jab', 'hookL'], ['hookR'], ['upper'], ['jab', 'jab']], tip: 'a breather — bank your star punches' },
  { name: 'Blitz Bronson', nick: 'The Machine Gun', taunt: 'Rat-a-tat-tat!', skin: '#c68642', hair: '#111827', hairStyle: 'mohawk', trunks: '#0ea5e9', gloves: '#0369a1', build: 1, hp: 150, speed: 0.86, rest: [0.8, 1.2], guard: 0.7, feint: 0.1, rage: false, venue: 'arena', patterns: [['jab', 'jab', 'jab', 'jab'], ['hookL', 'hookR', 'hookL'], ['jab', 'bolt'], ['upper', 'jab', 'upper']], tip: 'four-punch flurries — stay calm' },
  { name: 'Kraken Kowalski', nick: 'The Sea Beast', taunt: 'I wrestled a squid. And won.', skin: '#e7b98f', hair: '#7c2d12', hairStyle: 'curly', trunks: '#0f766e', gloves: '#134e4a', build: 1.3, hp: 175, speed: 0.9, rest: [0.9, 1.4], guard: 0.9, feint: 0.1, rage: true, beard: true, acc: 'tattoo', venue: 'dock', patterns: [['hay', 'upper'], ['hookL', 'hookR', 'hay'], ['bolt'], ['jab', 'jab', 'upper']], tip: 'huge reach, huge rage' },
  { name: 'Ghost Garcia', nick: 'El Fantasma', taunt: 'Boo.', skin: '#b07a4f', hair: '#f8fafc', hairStyle: 'slick', trunks: '#e5e7eb', gloves: '#94a3b8', build: 0.98, hp: 160, speed: 0.85, rest: [0.8, 1.2], guard: 0.8, feint: 0.6, rage: false, acc: 'patch', venue: 'dojo', patterns: [['jab', 'hookL', 'hookR'], ['bolt', 'jab'], ['upper', 'hookL'], ['hay']], tip: 'master of fakes — wait for the real one' },
  { name: 'The King', nick: 'Undisputed', taunt: 'Bow, or be bowed.', skin: '#a0522d', hair: '#111827', hairStyle: 'afro', trunks: '#ca8a04', gloves: '#fbbf24', build: 1.2, hp: 185, speed: 0.82, rest: [0.8, 1.3], guard: 0.88, feint: 0.25, rage: true, crown: true, venue: 'palace', patterns: [['jab', 'hookL', 'hookR'], ['hay'], ['upper', 'jab', 'upper'], ['hookR', 'hookL', 'hay'], ['jab', 'jab', 'jab', 'upper'], ['bolt', 'hay']], tip: 'UNDISPUTED CHAMP · everything at once' },
]

export const LADDER = FOES.length

export function isChamp(stage: number) {
  return (stage % LADDER) % 5 === 4
}
