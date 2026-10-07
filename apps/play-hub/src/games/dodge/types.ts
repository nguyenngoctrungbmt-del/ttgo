/** Types for Meteor Rush combat. */

export type Rect = { x: number; y: number; w: number; h: number }

export type Player = Rect & {
  speed: number
  lives: number
  /** Visual/combat scale — grows with level. */
  scale: number
}

export type Bullet = Rect & {
  id: number
  vy: number
  vx: number
  damage: number
  /** true = enemy shot */
  hostile: boolean
}

export type Enemy = Rect & {
  id: number
  vy: number
  hp: number
  maxHp: number
  scale: number
  /** next fire timestamp (performance.now) */
  nextShot: number
  /** Monster emoji face */
  face: string
}

export type Weapon = {
  damage: number
  cooldownMs: number
  shots: number
}

export type UpgradeId =
  | 'damage'
  | 'firerate'
  | 'multishot'
  | 'speed'
  | 'life'
  | 'bulk'

export type Upgrade = {
  id: UpgradeId
  label: string
  blurb: string
}

export type GamePhase = 'idle' | 'playing' | 'upgrade' | 'lost'
