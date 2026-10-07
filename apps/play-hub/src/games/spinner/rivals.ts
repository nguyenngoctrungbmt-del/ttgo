// Spin Tops ladder: named rival tops and 20 authored matches (a boss top every 5th).
import type { ArenaKind } from './art'

export type Pers = 'charger' | 'counter' | 'tank' | 'orbit' | 'boss'
export type Shape = 'blade' | 'spike' | 'gear' | 'disc' | 'star'
/** Boss signatures: wave = outward shockwave, vortex = pulls tops in, split = spawns mini tops, all = rotates. */
export type Sig = 'wave' | 'vortex' | 'split' | 'all'

export type RivalTop = { name: string; color: string; color2: string; blades: number; pers: Pers; shape: Shape; heavy?: boolean; small?: boolean }
/** k = strength step (mass/spin/attack scale) for the authored ladder. */
export type BossTop = { name: string; color: string; color2: string; shape: Shape; sig: Sig; blades: number; k: number }

export const TOPS: Record<string, RivalTop> = {
  pebble: { name: 'Pebble', color: '#a8a29e', color2: '#f5f5f4', blades: 3, pers: 'charger', shape: 'disc', small: true },
  blaze: { name: 'Blaze', color: '#f97316', color2: '#fde047', blades: 3, pers: 'charger', shape: 'blade' },
  glacier: { name: 'Glacier', color: '#38bdf8', color2: '#e0f2fe', blades: 4, pers: 'counter', shape: 'star' },
  viper: { name: 'Viper', color: '#22c55e', color2: '#bbf7d0', blades: 3, pers: 'charger', shape: 'spike' },
  titan: { name: 'Titan', color: '#64748b', color2: '#e2e8f0', blades: 6, pers: 'tank', shape: 'gear', heavy: true },
  phantom: { name: 'Phantom', color: '#a855f7', color2: '#f5d0fe', blades: 5, pers: 'counter', shape: 'blade' },
  volt: { name: 'Volt', color: '#eab308', color2: '#fef9c3', blades: 4, pers: 'charger', shape: 'star' },
  coral: { name: 'Coral', color: '#f43f5e', color2: '#ffe4e6', blades: 5, pers: 'tank', shape: 'disc', heavy: true },
  sprocket: { name: 'Sprocket', color: '#14b8a6', color2: '#ccfbf1', blades: 8, pers: 'orbit', shape: 'gear' },
  hornet: { name: 'Hornet', color: '#facc15', color2: '#1f2937', blades: 4, pers: 'charger', shape: 'spike', small: true },
  bastion: { name: 'Bastion', color: '#78716c', color2: '#fde68a', blades: 6, pers: 'tank', shape: 'disc', heavy: true },
  wisp: { name: 'Wisp', color: '#c4b5fd', color2: '#faf5ff', blades: 5, pers: 'orbit', shape: 'star', small: true },
  mako: { name: 'Mako', color: '#0ea5e9', color2: '#f0f9ff', blades: 3, pers: 'counter', shape: 'spike' },
  ember: { name: 'Ember', color: '#dc2626', color2: '#fdba74', blades: 4, pers: 'charger', shape: 'blade' },
}

export const BOSSES: Record<string, BossTop> = {
  dragoon: { name: 'DRAGOON', color: '#b91c1c', color2: '#fbbf24', shape: 'blade', sig: 'wave', blades: 6, k: 1 },
  leviathan: { name: 'LEVIATHAN', color: '#0e7490', color2: '#a5f3fc', shape: 'star', sig: 'vortex', blades: 6, k: 1.5 },
  obsidian: { name: 'OBSIDIAN', color: '#1f2937', color2: '#f472b6', shape: 'spike', sig: 'split', blades: 7, k: 1.3 },
  zenith: { name: 'ZENITH', color: '#7c3aed', color2: '#fde047', shape: 'gear', sig: 'all', blades: 8, k: 2 },
}

export type Match = { title: string; arena: ArenaKind; foes: string[]; boss?: string; intro: string }

// Teach 1–4, boss at 5/10/15/20, breather after each boss, new twist (arena or personality) every few matches.
export const MATCHES: Match[] = [
  { title: 'Rookie Cup', arena: 'classic', foes: ['pebble', 'blaze'], intro: 'drag to steer · clash to drain spin' },
  { title: 'Cold Front', arena: 'classic', foes: ['glacier', 'viper'], intro: 'Glacier strikes from the inside' },
  { title: 'Black Ice', arena: 'ice', foes: ['viper', 'sprocket'], intro: 'slippery bowl · Sprocket circles the rim' },
  { title: 'Bumper Bash', arena: 'bumpers', foes: ['titan', 'blaze', 'glacier'], intro: 'three rivals · bounce off the posts' },
  { title: 'Dragon Gate', arena: 'classic', foes: [], boss: 'dragoon', intro: 'BOSS · golden glow = shockwave, shield it' },
  { title: 'Feather Spin', arena: 'classic', foes: ['wisp', 'pebble'], intro: 'a breather · grab the spin orbs' },
  { title: 'Thorn Ring', arena: 'spikes', foes: ['hornet', 'mako', 'volt'], intro: 'spiked rim chews your spin' },
  { title: 'Heavy Metal', arena: 'mini', foes: ['titan', 'bastion'], intro: 'two heavyweights in a tiny bowl' },
  { title: 'Ghost Rink', arena: 'ice', foes: ['phantom', 'sprocket', 'wisp'], intro: 'counters and orbiters on ice' },
  { title: 'Abyss', arena: 'classic', foes: [], boss: 'leviathan', intro: 'BOSS · teal glow = whirlpool pull, steer away' },
  { title: 'Hot Plate', arena: 'lava', foes: ['ember', 'pebble'], intro: 'a breather · the glowing rim burns spin' },
  { title: 'Swarm', arena: 'bumpers', foes: ['hornet', 'hornet', 'wisp'], intro: 'fast little stingers' },
  { title: 'Magma Reef', arena: 'lava', foes: ['coral', 'mako', 'ember'], intro: 'keep them on the hot rim' },
  { title: 'Gauntlet', arena: 'spikes', foes: ['bastion', 'phantom', 'volt', 'viper'], intro: 'four rivals · let them fight each other' },
  { title: 'Black Mirror', arena: 'classic', foes: [], boss: 'obsidian', intro: 'BOSS · pink glow = it splits off mini tops' },
  { title: 'Clockwork', arena: 'classic', foes: ['sprocket', 'wisp'], intro: 'a breather · two orbiters' },
  { title: 'Pressure Cooker', arena: 'mini', foes: ['hornet', 'mako', 'coral'], intro: 'tight bowl, sharp rivals' },
  { title: 'Avalanche', arena: 'ice', foes: ['bastion', 'titan', 'phantom', 'ember'], intro: 'heavies on ice — dodge, then strike' },
  { title: 'Inferno', arena: 'lava', foes: ['volt', 'hornet', 'sprocket', 'mako'], intro: 'everything burns' },
  { title: 'Zenith', arena: 'classic', foes: [], boss: 'zenith', intro: 'GRAND BOSS · shockwave, whirlpool and splits' },
]

export const LADDER = MATCHES.length

export function matchFor(level: number) {
  const idx = (Math.max(1, level) - 1) % LADDER
  const tier = Math.min(3, Math.floor((Math.max(1, level) - 1) / LADDER))
  return { m: MATCHES[idx], tier, idx }
}
