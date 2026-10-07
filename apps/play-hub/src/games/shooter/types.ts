/** Shared types for Sky Strike. */

export type Vec = { x: number; y: number }

export type Rect = Vec & { w: number; h: number }

export type Player = Rect & {
  speed: number
  lives: number
}

export type Bullet = Rect & {
  id: number
  vy: number
  vx: number
  damage: number
}

export type Enemy = Rect & {
  id: number
  vy: number
  hp: number
  maxHp: number
}

/** Weapon stats — mutate via upgrades between levels. */
export type Weapon = {
  damage: number
  /** ms between shots */
  cooldownMs: number
  /** bullets per volley (1 = single, 3 = spread, …) */
  shots: number
}

export type UpgradeId = 'damage' | 'firerate' | 'multishot' | 'speed' | 'life'

export type Upgrade = {
  id: UpgradeId
  label: string
  blurb: string
}

export type GamePhase = 'idle' | 'playing' | 'upgrade' | 'lost'
