/** Mech Survivor data: weapons, passive parts, evolutions and enemy types. */

export type WeaponId = 'blaster' | 'saws' | 'missiles' | 'lightning' | 'flamer' | 'railgun' | 'drones'
export type PassiveId = 'servo' | 'gyro' | 'blast' | 'capacitor' | 'fuel' | 'armor' | 'thrusters' | 'magnet' | 'nanites'
export type EnemyKind = 'drone' | 'crawler' | 'brute' | 'spitter' | 'bomber' | 'bat' | 'mortar' | 'linker' | 'warden' | 'overlord' | 'colossus'

export const MAX_LEVEL = 5

export type WeaponDef = { id: WeaponId; name: string; evolved: string; pair: PassiveId; color: string; levels: string[]; evoDesc: string }

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  blaster: {
    id: 'blaster',
    name: 'Blaster',
    evolved: 'Pulse Cannon',
    pair: 'servo',
    color: '#38bdf8',
    levels: ['Fires bolts at the nearest enemy', '+1 bolt', 'Fires 15% faster, +3 damage', '+1 bolt, bolts pierce', 'Fires 15% faster, +5 damage'],
    evoDesc: 'Rapid twin beams that pierce everything',
  },
  saws: {
    id: 'saws',
    name: 'Orbit Saws',
    evolved: 'Buzz Storm',
    pair: 'gyro',
    color: '#e2e8f0',
    levels: ['Two saw blades orbit your mech', '+1 saw, +3 damage', 'Wider orbit, spin longer', '+1 saw, +4 damage', '+1 saw, wider orbit'],
    evoDesc: 'Two rings of saws that never stop',
  },
  missiles: {
    id: 'missiles',
    name: 'Homing Missiles',
    evolved: 'Swarm Barrage',
    pair: 'blast',
    color: '#fb923c',
    levels: ['Homing missile with a blast radius', '+1 missile', 'Bigger blast, +8 damage', '+1 missile, faster reload', '+2 missiles, +10 damage'],
    evoDesc: 'A barrage of eight micro-missiles',
  },
  lightning: {
    id: 'lightning',
    name: 'Arc Lightning',
    evolved: 'Thunder Grid',
    pair: 'capacitor',
    color: '#facc15',
    levels: ['Lightning chains between enemies', '+1 chain, +5 damage', 'Strikes faster', '+2 chains, +6 damage', 'Strikes faster, +2 chains'],
    evoDesc: 'Twin storms chaining through ten foes',
  },
  flamer: {
    id: 'flamer',
    name: 'Flamethrower',
    evolved: 'Inferno Ring',
    pair: 'fuel',
    color: '#f97316',
    levels: ['Burns enemies in a cone ahead', 'Longer flame, +6 dps', 'Wider cone', 'Longer flame, +8 dps', 'Burns longer, +10 dps'],
    evoDesc: 'A permanent ring of fire around you',
  },
  railgun: {
    id: 'railgun',
    name: 'Railgun',
    evolved: 'Gauss Lance',
    pair: 'magnet',
    color: '#c084fc',
    levels: ['A rail pierces every enemy in a line', '+14 damage', 'Fires 20% faster', '+1 rail in a fan', 'Wider rail, +20 damage'],
    evoDesc: 'Three rapid rails that shred whole lines',
  },
  drones: {
    id: 'drones',
    name: 'Wing Drones',
    evolved: 'Hive Swarm',
    pair: 'nanites',
    color: '#4ade80',
    levels: ['A combat drone circles and shoots', '+1 drone', 'Drones fire 20% faster, +3 damage', '+1 drone', 'Fire faster, +4 damage'],
    evoDesc: 'Five drones with piercing rapid fire',
  },
}

export type PassiveDef = { id: PassiveId; name: string; desc: string; color: string }

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  servo: { id: 'servo', name: 'Servo Core', desc: 'Weapons reload 8% faster', color: '#38bdf8' },
  gyro: { id: 'gyro', name: 'Gyro Stabilizer', desc: '+12% projectile and orbit speed', color: '#e2e8f0' },
  blast: { id: 'blast', name: 'Blast Core', desc: '+12% area of effect', color: '#fb923c' },
  capacitor: { id: 'capacitor', name: 'Capacitor', desc: '+10% damage', color: '#facc15' },
  fuel: { id: 'fuel', name: 'Fuel Cell', desc: '+15% weapon duration', color: '#f97316' },
  armor: { id: 'armor', name: 'Armor Plating', desc: '+20 max HP, -1 damage taken', color: '#94a3b8' },
  thrusters: { id: 'thrusters', name: 'Thrusters', desc: '+10% move speed', color: '#a78bfa' },
  magnet: { id: 'magnet', name: 'Gem Magnet', desc: '+30% pickup radius', color: '#22d3ee' },
  nanites: { id: 'nanites', name: 'Repair Nanites', desc: 'Regenerate 0.4 HP per second', color: '#4ade80' },
}

export type EnemyDef = { r: number; hp: number; speed: number; dmg: number; xp: number; color: string; dark: string }

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  drone: { r: 11, hp: 14, speed: 64, dmg: 6, xp: 1, color: '#a78bfa', dark: '#4c1d95' },
  crawler: { r: 10, hp: 9, speed: 104, dmg: 5, xp: 1, color: '#84cc16', dark: '#365314' },
  brute: { r: 20, hp: 95, speed: 42, dmg: 14, xp: 5, color: '#f87171', dark: '#7f1d1d' },
  spitter: { r: 14, hp: 32, speed: 52, dmg: 8, xp: 3, color: '#2dd4bf', dark: '#134e4a' },
  bomber: { r: 13, hp: 22, speed: 92, dmg: 18, xp: 2, color: '#fbbf24', dark: '#78350f' },
  bat: { r: 9, hp: 7, speed: 128, dmg: 5, xp: 1, color: '#f472b6', dark: '#831843' },
  mortar: { r: 16, hp: 70, speed: 36, dmg: 16, xp: 4, color: '#f59e0b', dark: '#451a03' },
  linker: { r: 12, hp: 44, speed: 62, dmg: 12, xp: 3, color: '#38bdf8', dark: '#0c4a6e' },
  warden: { r: 44, hp: 3600, speed: 56, dmg: 20, xp: 120, color: '#ef4444', dark: '#450a0a' },
  overlord: { r: 58, hp: 9500, speed: 50, dmg: 26, xp: 300, color: '#c026d3', dark: '#3b0764' },
  colossus: { r: 66, hp: 21000, speed: 44, dmg: 30, xp: 400, color: '#14b8a6', dark: '#042f2e' },
}

export type Biome = { name: string; ground: string; ground2: string; line: string; rock: string; rock2: string; accent: string }

export const BIOMES: Biome[] = [
  { name: 'Dust Flats', ground: '#c7a173', ground2: '#b58f62', line: 'rgba(120,80,40,0.25)', rock: '#8a6a48', rock2: '#a98463', accent: '#fde68a' },
  { name: 'Scrap Factory', ground: '#5b6575', ground2: '#4b5563', line: 'rgba(15,23,42,0.35)', rock: '#334155', rock2: '#64748b', accent: '#fbbf24' },
  { name: 'Toxic Marsh', ground: '#3f5f3a', ground2: '#344f31', line: 'rgba(20,40,15,0.35)', rock: '#284027', rock2: '#4d7c0f', accent: '#a3e635' },
  { name: 'Frost Field', ground: '#cfe3ef', ground2: '#b9d3e3', line: 'rgba(56,120,160,0.25)', rock: '#8fb3c9', rock2: '#e0f2fe', accent: '#7dd3fc' },
  { name: 'Lava Rift', ground: '#3b1d1d', ground2: '#2a1414', line: 'rgba(249,115,22,0.3)', rock: '#1c0a0a', rock2: '#7c2d12', accent: '#f97316' },
  { name: 'Crystal Wastes', ground: '#3b2f5c', ground2: '#30264d', line: 'rgba(196,181,253,0.28)', rock: '#241a3f', rock2: '#7c3aed', accent: '#c4b5fd' },
  { name: 'Void Core', ground: '#10122a', ground2: '#171a3a', line: 'rgba(34,211,238,0.22)', rock: '#07081a', rock2: '#3730a3', accent: '#22d3ee' },
]

export const BOSS_NAMES: Partial<Record<EnemyKind, string>> = { warden: 'WARDEN', overlord: 'OVERLORD', colossus: 'COLOSSUS' }

/** Biome index for a given second of the run. */
export function biomeAt(t: number) {
  return t < 120 ? 0 : t < 240 ? 1 : t < 360 ? 2 : t < 480 ? 3 : 4
}

export function xpNeed(level: number) {
  return Math.round(2 + level * 2.5 + level * level * 0.5)
}
