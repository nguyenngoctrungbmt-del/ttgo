// Air Hockey rival ladder: 20 hand-tuned rivals (a champion every 5th) and their tables.

export type Eyes = 'robot' | 'block' | 'angry' | 'sly' | 'visor' | 'mask' | 'brute' | 'crown' | 'happy' | 'shades' | 'cyclops' | 'sleepy'
export type Hat = 'none' | 'beanie' | 'horns' | 'band' | 'halo' | 'mohawk' | 'ears' | 'witch' | 'helm'
/** Signature tricks: dash = telegraphed lunge, grow = pulsing giant mallet, wall = goal forcefield, twin = two-puck serves. */
export type Special = 'none' | 'dash' | 'grow' | 'wall' | 'twin'

export type Arena = {
  id: string
  name: string
  bg: [string, string]
  surf: [string, string]
  dots: string
  line: string
  rail: string
  /** Puck friction multiplier (ice < 1, felt > 1). */
  friction: number
  /** Sideways drift force as a fraction of table height / s² (curving shots). */
  wind: number
  /** Static round bumpers in table space (x, y in 0..1 of table, r in fraction of table width). */
  bumpers: { x: number; y: number; r: number }[]
}

export type Opp = {
  name: string
  style: string
  taunt: string
  color: string
  dark: string
  face: string
  eyes: Eyes
  hat: Hat
  speed: number
  aggr: number
  defY: number
  err: number
  trick: number
  big: number
  arena: string
  special: Special
  boss?: boolean
}

export const ARENAS: Record<string, Arena> = {
  neon: { id: 'neon', name: 'Neon Arcade', bg: ['#020617', '#0b1226'], surf: ['#13306b', '#0a1838'], dots: 'rgba(148,197,255,0.13)', line: 'rgba(103,232,249,0.6)', rail: '#f472b6', friction: 1, wind: 0, bumpers: [] },
  garage: { id: 'garage', name: 'Garage Table', bg: ['#0c0a09', '#1c1917'], surf: ['#2f4858', '#1b2a35'], dots: 'rgba(203,213,225,0.12)', line: 'rgba(253,186,116,0.55)', rail: '#94a3b8', friction: 1.1, wind: 0, bumpers: [] },
  gold: { id: 'gold', name: 'Gold Dome', bg: ['#1c1203', '#2a1a05'], surf: ['#5b3a0b', '#2d1c05'], dots: 'rgba(253,224,71,0.14)', line: 'rgba(253,224,71,0.6)', rail: '#facc15', friction: 1, wind: 0, bumpers: [] },
  ice: { id: 'ice', name: 'Glacier Rink', bg: ['#0b1e33', '#16324f'], surf: ['#a5d8f3', '#5ea3cf'], dots: 'rgba(255,255,255,0.35)', line: 'rgba(14,116,144,0.7)', rail: '#e0f2fe', friction: 0.45, wind: 0, bumpers: [] },
  pinball: { id: 'pinball', name: 'Pinball Palace', bg: ['#1e0533', '#2e1065'], surf: ['#3b0764', '#1e0a3c'], dots: 'rgba(232,121,249,0.15)', line: 'rgba(250,204,21,0.55)', rail: '#e879f9', friction: 1, wind: 0, bumpers: [{ x: 0.25, y: 0.5, r: 0.055 }, { x: 0.75, y: 0.5, r: 0.055 }] },
  desert: { id: 'desert', name: 'Mirage Oasis', bg: ['#2a1405', '#451a03'], surf: ['#b45309', '#78350f'], dots: 'rgba(254,243,199,0.18)', line: 'rgba(254,243,199,0.6)', rail: '#fbbf24', friction: 1.05, wind: 0.12, bumpers: [] },
  forge: { id: 'forge', name: 'Titan Forge', bg: ['#1a0505', '#2b0a0a'], surf: ['#451010', '#240707'], dots: 'rgba(251,146,60,0.18)', line: 'rgba(251,146,60,0.6)', rail: '#fb923c', friction: 1.1, wind: 0, bumpers: [{ x: 0.5, y: 0.5, r: 0.06 }] },
  beach: { id: 'beach', name: 'Sunset Boardwalk', bg: ['#3b0d2e', '#7c2d12'], surf: ['#0e7490', '#155e75'], dots: 'rgba(254,215,170,0.2)', line: 'rgba(254,215,170,0.6)', rail: '#fdba74', friction: 0.95, wind: 0.1, bumpers: [] },
  bank: { id: 'bank', name: 'Ricochet Hall', bg: ['#04140f', '#062a1f'], surf: ['#065f46', '#033b2c'], dots: 'rgba(110,231,183,0.16)', line: 'rgba(110,231,183,0.6)', rail: '#34d399', friction: 0.9, wind: 0, bumpers: [{ x: 0.12, y: 0.32, r: 0.05 }, { x: 0.88, y: 0.32, r: 0.05 }, { x: 0.12, y: 0.68, r: 0.05 }, { x: 0.88, y: 0.68, r: 0.05 }] },
  haunt: { id: 'haunt', name: 'Haunted Parlor', bg: ['#0a0614', '#140b24'], surf: ['#1f1638', '#0f0a1e'], dots: 'rgba(167,139,250,0.16)', line: 'rgba(134,239,172,0.55)', rail: '#86efac', friction: 1, wind: 0, bumpers: [{ x: 0.5, y: 0.4, r: 0.045 }, { x: 0.5, y: 0.6, r: 0.045 }] },
  aegis: { id: 'aegis', name: 'Aegis Citadel', bg: ['#030712', '#111827'], surf: ['#1e3a8a', '#172554'], dots: 'rgba(191,219,254,0.16)', line: 'rgba(191,219,254,0.6)', rail: '#60a5fa', friction: 1, wind: 0, bumpers: [] },
  vortex: { id: 'vortex', name: 'Vortex Lab', bg: ['#020a12', '#04202e'], surf: ['#083344', '#031820'], dots: 'rgba(45,212,191,0.18)', line: 'rgba(45,212,191,0.6)', rail: '#2dd4bf', friction: 0.85, wind: 0.2, bumpers: [] },
  dojo: { id: 'dojo', name: 'Moonlit Dojo', bg: ['#0a0a0a', '#1c1917'], surf: ['#3f2a1d', '#24180f'], dots: 'rgba(250,250,249,0.1)', line: 'rgba(239,68,68,0.55)', rail: '#ef4444', friction: 1, wind: 0, bumpers: [] },
  scrap: { id: 'scrap', name: 'Scrapyard Pit', bg: ['#0f0f0f', '#262626'], surf: ['#44403c', '#292524'], dots: 'rgba(250,204,21,0.14)', line: 'rgba(250,204,21,0.55)', rail: '#eab308', friction: 1.05, wind: 0, bumpers: [{ x: 0.22, y: 0.42, r: 0.05 }, { x: 0.78, y: 0.58, r: 0.05 }] },
  nova: { id: 'nova', name: 'Nova Throne', bg: ['#0b0420', '#1e0b3d'], surf: ['#2a0f5c', '#140630'], dots: 'rgba(253,224,71,0.18)', line: 'rgba(244,114,182,0.65)', rail: '#fde047', friction: 0.95, wind: 0, bumpers: [] },
}

// speed = mallet speed (table heights / s), err = defensive wobble, aggr = attack eagerness,
// trick = chance of bank shots, big = mallet scale. Curve: gentle 1–4, champion 5, breather 6, …
export const RIVALS: Opp[] = [
  { name: 'Robo Rookie', style: 'Slow and steady', taunt: 'BEEP. PLEASE GO EASY.', color: '#4ade80', dark: '#166534', face: '#bbf7d0', eyes: 'robot', hat: 'none', speed: 0.9, aggr: 0.25, defY: 0.25, err: 0.35, trick: 0, big: 1, arena: 'neon', special: 'none' },
  { name: 'Brick', style: 'The wall', taunt: 'Nothing gets past me.', color: '#94a3b8', dark: '#334155', face: '#e2e8f0', eyes: 'block', hat: 'none', speed: 1.2, aggr: 0.15, defY: 0.15, err: 0.27, trick: 0, big: 1.12, arena: 'garage', special: 'none' },
  { name: 'Blaze', style: 'All-out attack', taunt: 'Too hot to handle!', color: '#f87171', dark: '#7f1d1d', face: '#fecaca', eyes: 'angry', hat: 'mohawk', speed: 1.45, aggr: 0.95, defY: 0.42, err: 0.24, trick: 0.1, big: 1, arena: 'neon', special: 'none' },
  { name: 'Trixie', style: 'Bank-shot trickster', taunt: 'Watch the walls, sweetie.', color: '#c084fc', dark: '#581c87', face: '#f3e8ff', eyes: 'sly', hat: 'ears', speed: 1.5, aggr: 0.55, defY: 0.3, err: 0.19, trick: 0.7, big: 1, arena: 'neon', special: 'none' },
  { name: 'Omega', style: 'Champion · lunging dash', taunt: 'Kneel before the crown.', color: '#facc15', dark: '#422006', face: '#fef9c3', eyes: 'crown', hat: 'none', speed: 1.75, aggr: 0.75, defY: 0.3, err: 0.16, trick: 0.4, big: 1.1, arena: 'gold', special: 'dash', boss: true },
  { name: 'Pip', style: 'Slippery penguin', taunt: 'Wheee! Ice is nice!', color: '#7dd3fc', dark: '#0c4a6e', face: '#f0f9ff', eyes: 'happy', hat: 'beanie', speed: 1.3, aggr: 0.45, defY: 0.25, err: 0.26, trick: 0.15, big: 0.95, arena: 'ice', special: 'none' },
  { name: 'Volt', style: 'Lightning reflexes', taunt: 'You blinked. I scored.', color: '#22d3ee', dark: '#155e75', face: '#cffafe', eyes: 'visor', hat: 'none', speed: 1.9, aggr: 0.6, defY: 0.28, err: 0.16, trick: 0.25, big: 1, arena: 'neon', special: 'none' },
  { name: 'Flipper', style: 'Pinball wizard', taunt: 'Tilt! Tilt! Ha!', color: '#e879f9', dark: '#701a75', face: '#fdf4ff', eyes: 'shades', hat: 'none', speed: 1.75, aggr: 0.65, defY: 0.3, err: 0.17, trick: 0.45, big: 1, arena: 'pinball', special: 'none' },
  { name: 'Mirage', style: 'Feints and fakes', taunt: 'Am I even here?', color: '#f472b6', dark: '#831843', face: '#fce7f3', eyes: 'mask', hat: 'none', speed: 1.95, aggr: 0.7, defY: 0.32, err: 0.14, trick: 0.85, big: 1, arena: 'desert', special: 'none' },
  { name: 'Titan', style: 'Champion · giant mallet', taunt: 'I AM THE TABLE.', color: '#fb923c', dark: '#7c2d12', face: '#ffedd5', eyes: 'brute', hat: 'helm', speed: 1.85, aggr: 0.75, defY: 0.3, err: 0.13, trick: 0.2, big: 1.25, arena: 'forge', special: 'grow', boss: true },
  { name: 'Sunny', style: 'Laid-back surfer', taunt: 'Chill, dude. Just vibes.', color: '#fdba74', dark: '#9a3412', face: '#fff7ed', eyes: 'sleepy', hat: 'band', speed: 1.55, aggr: 0.4, defY: 0.26, err: 0.2, trick: 0.3, big: 1, arena: 'beach', special: 'none' },
  { name: 'Frost', style: 'Ice-cold precision', taunt: 'Your shots will freeze.', color: '#bae6fd', dark: '#075985', face: '#f0f9ff', eyes: 'sly', hat: 'halo', speed: 2.0, aggr: 0.6, defY: 0.28, err: 0.12, trick: 0.4, big: 1, arena: 'ice', special: 'none' },
  { name: 'Ricochet', style: 'Bumper bank master', taunt: 'Every angle is mine.', color: '#34d399', dark: '#064e3b', face: '#d1fae5', eyes: 'cyclops', hat: 'none', speed: 2.0, aggr: 0.65, defY: 0.3, err: 0.12, trick: 0.9, big: 1, arena: 'bank', special: 'none' },
  { name: 'Hex', style: 'Spooky sorceress', taunt: 'Hee hee… cursed puck!', color: '#a78bfa', dark: '#3b0764', face: '#ede9fe', eyes: 'sly', hat: 'witch', speed: 2.1, aggr: 0.7, defY: 0.3, err: 0.11, trick: 0.6, big: 1, arena: 'haunt', special: 'none' },
  { name: 'Aegis', style: 'Champion · goal forcefield', taunt: 'My shield never breaks.', color: '#60a5fa', dark: '#1e3a8a', face: '#dbeafe', eyes: 'visor', hat: 'helm', speed: 2.1, aggr: 0.7, defY: 0.24, err: 0.1, trick: 0.35, big: 1.08, arena: 'aegis', special: 'wall', boss: true },
  { name: 'Bolt Jr.', style: 'Eager apprentice', taunt: 'Dad says I am fast!', color: '#fde047', dark: '#854d0e', face: '#fefce8', eyes: 'happy', hat: 'ears', speed: 1.85, aggr: 0.6, defY: 0.3, err: 0.16, trick: 0.2, big: 0.95, arena: 'neon', special: 'none' },
  { name: 'Vortex', style: 'Curve-ball scientist', taunt: 'Physics is on my side.', color: '#2dd4bf', dark: '#134e4a', face: '#ccfbf1', eyes: 'cyclops', hat: 'band', speed: 2.2, aggr: 0.7, defY: 0.3, err: 0.1, trick: 0.5, big: 1, arena: 'vortex', special: 'none' },
  { name: 'Kage', style: 'Shadow ninja', taunt: '…', color: '#ef4444', dark: '#1c1917', face: '#e7e5e4', eyes: 'angry', hat: 'band', speed: 2.35, aggr: 0.8, defY: 0.32, err: 0.09, trick: 0.7, big: 0.95, arena: 'dojo', special: 'dash' },
  { name: 'Juggernaut', style: 'Unstoppable crusher', taunt: 'CRUSH. SMASH. WIN.', color: '#eab308', dark: '#422006', face: '#fef08a', eyes: 'robot', hat: 'horns', speed: 2.2, aggr: 1, defY: 0.4, err: 0.1, trick: 0.15, big: 1.3, arena: 'scrap', special: 'none' },
  { name: 'Nova', style: 'Grand champion · twin pucks', taunt: 'Two pucks. One queen.', color: '#f0abfc', dark: '#4a044e', face: '#fdf4ff', eyes: 'crown', hat: 'halo', speed: 2.45, aggr: 0.8, defY: 0.3, err: 0.07, trick: 0.55, big: 1.1, arena: 'nova', special: 'twin', boss: true },
]

export const LADDER = RIVALS.length

/** Rival for a 0-based ladder stage; past the authored ladder rivals return in tougher tiers (capped). */
export function rivalFor(stage: number) {
  const opp = RIVALS[stage % LADDER]
  const tier = Math.min(3, Math.floor(stage / LADDER))
  return { opp, tier, arena: ARENAS[opp.arena] ?? ARENAS.neon }
}
