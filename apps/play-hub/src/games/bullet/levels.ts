// Bullet Storm authored stages: 20 scripted wave lists, each ending in a boss; every 5th is a grand boss.

export type Pattern = 'fans' | 'ring' | 'spiral' | 'laser' | 'flower' | 'rain' | 'cross' | 'wall' | 'web' | 'pulse'
export type WaveKind = 'popLine' | 'popRain' | 'fanPair' | 'swirl' | 'turret' | 'sniper' | 'mix' | 'popV' | 'swirlPair' | 'turretPair' | 'snipeLine' | 'fanQuad'
export type BossForm = 'seraph' | 'eye' | 'moth' | 'crystal'

export type BossDef = { name: string; hue: string; form: BossForm; phases: Pattern[]; hp: number }
export type StageDef = { name: string; sub: string; palette: number; waves: WaveKind[]; boss: BossDef; grand?: boolean }

export const PATTERN_NAME: Record<Pattern, string> = {
  fans: 'Razor Fans',
  ring: 'Halo Rings',
  spiral: 'Spiral Bloom',
  laser: 'Prism Lasers',
  flower: 'Twin Petals',
  rain: 'Starfall',
  cross: 'Turning Cross',
  wall: 'Closing Walls',
  web: 'Silk Web',
  pulse: 'Heartbeat',
}

// Palettes: [top, bottom, accent]. 0–4 classic, 5–7 new sectors.
export const PALETTES = [
  ['#1a0b2e', '#05020c', '#c026d3'],
  ['#0b1a2e', '#02060c', '#0ea5e9'],
  ['#2e0b1a', '#0c0205', '#f43f5e'],
  ['#0b2e22', '#020c08', '#10b981'],
  ['#2e220b', '#0c0802', '#f59e0b'],
  ['#0f1f3a', '#020617', '#818cf8'],
  ['#301008', '#0a0302', '#fb923c'],
  ['#08282e', '#010809', '#2dd4bf'],
]

// Mid-bosses guard ordinary stages (2–3 phases, lighter); grand bosses every 5th (4–5 phases).
export const STAGES: StageDef[] = [
  { name: 'Nebula Gate', sub: 'drag to fly · only the core can be hit', palette: 0, waves: ['popLine', 'popRain', 'popLine', 'fanPair', 'popRain', 'swirl'], boss: { name: 'Lumen Scout', hue: '#e879f9', form: 'seraph', phases: ['fans', 'ring'], hp: 220 } },
  { name: 'Azure Rift', sub: 'graze bullets to earn bombs', palette: 1, waves: ['popLine', 'swirl', 'fanPair', 'popRain', 'sniper', 'popLine', 'turret'], boss: { name: 'Tide Watcher', hue: '#38bdf8', form: 'eye', phases: ['ring', 'spiral'], hp: 260 } },
  { name: 'Crimson Expanse', sub: 'turrets bloom in rings', palette: 2, waves: ['popV', 'turret', 'swirlPair', 'fanPair', 'popRain', 'sniper', 'mix'], boss: { name: 'Ember Moth', hue: '#fb7185', form: 'moth', phases: ['fans', 'flower', 'rain'], hp: 300 } },
  { name: 'Emerald Drift', sub: 'new: closing walls — find the gap', palette: 3, waves: ['popLine', 'snipeLine', 'turret', 'popV', 'swirl', 'fanQuad', 'popRain'], boss: { name: 'Jade Lattice', hue: '#4ade80', form: 'crystal', phases: ['wall', 'ring', 'spiral'], hp: 320 } },
  { name: 'Seraph Prime', sub: 'GRAND BOSS · four phases', palette: 0, waves: ['popRain', 'fanPair', 'swirlPair', 'turret', 'popV'], boss: { name: 'Seraph Prime', hue: '#f0abfc', form: 'seraph', phases: ['fans', 'ring', 'spiral', 'laser'], hp: 380 }, grand: true },
  { name: 'Quiet Orbit', sub: 'a breather — collect power', palette: 5, waves: ['popLine', 'popRain', 'popV', 'fanPair', 'popLine'], boss: { name: 'Moon Lantern', hue: '#a5b4fc', form: 'eye', phases: ['pulse', 'flower'], hp: 300 } },
  { name: 'Silk Corridor', sub: 'new: web streams cross the screen', palette: 6, waves: ['swirl', 'popV', 'sniper', 'turretPair', 'popRain', 'fanQuad', 'mix'], boss: { name: 'Weaver', hue: '#fb923c', form: 'moth', phases: ['web', 'fans', 'cross'], hp: 360 } },
  { name: 'Prism Field', sub: 'lasers sweep — watch the warning lines', palette: 1, waves: ['snipeLine', 'popLine', 'turret', 'swirlPair', 'popV', 'fanPair', 'turret', 'mix'], boss: { name: 'Prism Shard', hue: '#67e8f9', form: 'crystal', phases: ['laser', 'ring', 'wall'], hp: 380 } },
  { name: 'Heart Nebula', sub: 'new: heartbeat rings speed up', palette: 2, waves: ['popRain', 'fanQuad', 'swirl', 'turretPair', 'sniper', 'popV', 'mix'], boss: { name: 'Crimson Oracle', hue: '#f43f5e', form: 'eye', phases: ['pulse', 'spiral', 'fans'], hp: 400 } },
  { name: 'Violet Warden', sub: 'GRAND BOSS · five phases', palette: 5, waves: ['popV', 'turret', 'swirlPair', 'snipeLine', 'fanQuad'], boss: { name: 'Violet Warden', hue: '#a78bfa', form: 'seraph', phases: ['ring', 'laser', 'flower', 'web', 'cross'], hp: 440 }, grand: true },
  { name: 'Calm Shoals', sub: 'a breather between storms', palette: 7, waves: ['popLine', 'popRain', 'swirl', 'popV', 'fanPair'], boss: { name: 'Reef Sentinel', hue: '#2dd4bf', form: 'crystal', phases: ['ring', 'rain'], hp: 360 } },
  { name: 'Starfall Belt', sub: 'stars rain from above', palette: 4, waves: ['popRain', 'popRain', 'turret', 'fanQuad', 'swirlPair', 'snipeLine', 'mix', 'popV'], boss: { name: 'Comet Moth', hue: '#facc15', form: 'moth', phases: ['rain', 'fans', 'wall'], hp: 420 } },
  { name: 'Mirror Sea', sub: 'twin petals and crossed webs', palette: 1, waves: ['swirlPair', 'turretPair', 'popV', 'sniper', 'fanQuad', 'mix', 'swirl'], boss: { name: 'Twin Iris', hue: '#60a5fa', form: 'eye', phases: ['flower', 'web', 'pulse'], hp: 440 } },
  { name: 'Furnace', sub: 'turret alley', palette: 6, waves: ['turret', 'turretPair', 'popV', 'snipeLine', 'turretPair', 'fanQuad', 'mix', 'popRain'], boss: { name: 'Forge Heart', hue: '#fb923c', form: 'crystal', phases: ['wall', 'laser', 'spiral', 'ring'], hp: 440 } },
  { name: 'Azure Tyrant', sub: 'GRAND BOSS · lasers and walls', palette: 1, waves: ['snipeLine', 'swirlPair', 'turretPair', 'fanQuad', 'popV', 'mix'], boss: { name: 'Azure Tyrant', hue: '#38bdf8', form: 'moth', phases: ['laser', 'wall', 'spiral', 'web', 'pulse'], hp: 480 }, grand: true },
  { name: 'Lull', sub: 'a breather — bank bombs', palette: 3, waves: ['popLine', 'popV', 'popRain', 'fanPair', 'swirl'], boss: { name: 'Fern Wisp', hue: '#86efac', form: 'seraph', phases: ['flower', 'ring'], hp: 400 } },
  { name: 'Spiral Arm', sub: 'everything rotates', palette: 5, waves: ['swirlPair', 'swirlPair', 'turret', 'fanQuad', 'snipeLine', 'mix', 'popV', 'turretPair'], boss: { name: 'Gyre', hue: '#c4b5fd', form: 'crystal', phases: ['spiral', 'cross', 'web', 'flower'], hp: 460 } },
  { name: 'Eclipse', sub: 'darkness and rain', palette: 7, waves: ['popRain', 'turretPair', 'snipeLine', 'fanQuad', 'swirlPair', 'mix', 'popV', 'turret'], boss: { name: 'Eclipse Eye', hue: '#5eead4', form: 'eye', phases: ['rain', 'pulse', 'laser', 'wall'], hp: 480 } },
  { name: 'Last Light', sub: 'the gauntlet before the end', palette: 2, waves: ['fanQuad', 'turretPair', 'swirlPair', 'snipeLine', 'mix', 'popV', 'turretPair', 'fanQuad', 'mix'], boss: { name: 'Dusk Herald', hue: '#fda4af', form: 'moth', phases: ['web', 'fans', 'cross', 'pulse'], hp: 480 } },
  { name: 'Void Empress', sub: 'GRAND BOSS · every pattern she knows', palette: 4, waves: ['popV', 'turretPair', 'swirlPair', 'snipeLine', 'fanQuad', 'mix'], boss: { name: 'Void Empress', hue: '#facc15', form: 'seraph', phases: ['fans', 'web', 'laser', 'pulse', 'cross', 'spiral'], hp: 520 }, grand: true },
]

export const AUTHORED = STAGES.length
