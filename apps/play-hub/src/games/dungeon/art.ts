/** Dungeon Dash vector art: rooms, hero, monsters, bosses, props. */

export const COLS = 9
export const ROWS = 13
const TAU = Math.PI * 2

export type Theme = { name: string; floorA: string; floorB: string; grout: string; wall: string; brick: string; wallTop: string; accent: string; dark: string }

export const THEMES: Theme[] = [
  { name: 'Stone Halls', floorA: '#454d5e', floorB: '#4c5567', grout: '#2b303b', wall: '#262b36', brick: '#5a6378', wallTop: '#7b859b', accent: '#94a3b8', dark: 'rgba(6,8,16,' },
  { name: 'Mossy Depths', floorA: '#34463a', floorB: '#3a4e40', grout: '#1d2a21', wall: '#18231b', brick: '#3f5a45', wallTop: '#5f7f64', accent: '#4ade80', dark: 'rgba(4,10,6,' },
  { name: 'Ember Forge', floorA: '#4a3129', floorB: '#523830', grout: '#2a1915', wall: '#21130f', brick: '#6b3a2c', wallTop: '#8c5040', accent: '#fb923c', dark: 'rgba(14,5,2,' },
  { name: 'Bone Crypt', floorA: '#38334a', floorB: '#3f3953', grout: '#211d2e', wall: '#19162a', brick: '#4b4466', wallTop: '#6d6590', accent: '#c084fc', dark: 'rgba(8,4,16,' },
]

function hash(i: number, j: number, s = 0) {
  const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453
  return v - Math.floor(v)
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.35) {
  ctx.globalAlpha = a
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}

/** solid: 0 floor, 1 wall, 2 pillar, 3 crate */
export function paintRoom(ctx: CanvasRenderingContext2D, solid: Uint8Array, theme: Theme, W: number, H: number, ts: number, ox: number, oy: number, seed: number) {
  ctx.fillStyle = '#05060a'
  ctx.fillRect(0, 0, W, H)
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = ox + i * ts
      const y = oy + j * ts
      const s = solid[j * COLS + i]
      if (s === 1) continue
      const h = hash(i, j, seed)
      ctx.fillStyle = (i + j) % 2 ? theme.floorA : theme.floorB
      ctx.fillRect(x, y, ts + 0.5, ts + 0.5)
      // Flagstones: 4 slabs per tile, slightly varied.
      ctx.strokeStyle = theme.grout
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 0.75, y + 0.75, ts - 1.5, ts - 1.5)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + ts * (0.4 + h * 0.2), y)
      ctx.lineTo(x + ts * (0.4 + h * 0.2), y + ts * 0.5)
      ctx.moveTo(x, y + ts * 0.5)
      ctx.lineTo(x + ts, y + ts * 0.5)
      ctx.moveTo(x + ts * (0.3 + h * 0.3), y + ts * 0.5)
      ctx.lineTo(x + ts * (0.3 + h * 0.3), y + ts)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(x + 2, y + 2, ts - 4, 2)
      if (h > 0.82) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.beginPath()
        ctx.moveTo(x + ts * 0.2, y + ts * 0.3)
        ctx.lineTo(x + ts * 0.45, y + ts * 0.45)
        ctx.lineTo(x + ts * 0.4, y + ts * 0.7)
        ctx.stroke()
      } else if (h < 0.12) {
        ctx.globalAlpha = 0.35
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.ellipse(x + ts * 0.3, y + ts * 0.7, ts * 0.18, ts * 0.08, 0.3, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }
  // Walls: brick faces with a lit top edge.
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (solid[j * COLS + i] !== 1) continue
      const x = ox + i * ts
      const y = oy + j * ts
      ctx.fillStyle = theme.wall
      ctx.fillRect(x, y, ts + 0.5, ts + 0.5)
      ctx.fillStyle = theme.brick
      const rows = 3
      for (let r = 0; r < rows; r++) {
        const by = y + (r * ts) / rows
        const off = r % 2 ? ts / 4 : 0
        for (let b = -1; b < 2; b++) {
          const bx = x + off + (b * ts) / 2
          const l = Math.max(x, bx + 1)
          const rr = Math.min(x + ts, bx + ts / 2 - 1)
          if (rr > l) ctx.fillRect(l, by + 1, rr - l, ts / rows - 2)
        }
      }
      const below = j + 1 < ROWS ? solid[(j + 1) * COLS + i] : 1
      if (below !== 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(x, y + ts, ts, ts * 0.18)
        ctx.fillStyle = theme.wallTop
        ctx.fillRect(x, y + ts - 3, ts + 0.5, 3)
      }
    }
  }
  // Doorways (top and bottom)
  for (const [j, up] of [[0, true], [ROWS - 1, false]] as [number, boolean][]) {
    const x = ox + 4 * ts
    const y = oy + j * ts
    ctx.fillStyle = '#020203'
    ctx.beginPath()
    if (up) {
      ctx.moveTo(x + ts * 0.12, y + ts)
      ctx.lineTo(x + ts * 0.12, y + ts * 0.45)
      ctx.arc(x + ts / 2, y + ts * 0.45, ts * 0.38, Math.PI, 0)
      ctx.lineTo(x + ts * 0.88, y + ts)
    } else {
      ctx.rect(x + ts * 0.12, y, ts * 0.76, ts * 0.6)
    }
    ctx.fill()
    ctx.strokeStyle = theme.wallTop
    ctx.lineWidth = 3
    ctx.stroke()
  }
  // Obstacles
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const s = solid[j * COLS + i]
      if (s !== 2 && s !== 3) continue
      const cx = ox + (i + 0.5) * ts
      const cy = oy + (j + 0.5) * ts
      shadow(ctx, cx + ts * 0.08, cy + ts * 0.3, ts * 0.46, ts * 0.2, 0.45)
      if (s === 2) {
        const g = ctx.createLinearGradient(cx - ts * 0.4, 0, cx + ts * 0.4, 0)
        g.addColorStop(0, theme.wallTop)
        g.addColorStop(0.45, theme.brick)
        g.addColorStop(1, theme.wall)
        ctx.fillStyle = theme.wall
        ctx.fillRect(cx - ts * 0.44, cy + ts * 0.1, ts * 0.88, ts * 0.28)
        ctx.fillStyle = g
        ctx.fillRect(cx - ts * 0.36, cy - ts * 0.55, ts * 0.72, ts * 0.8)
        ctx.fillStyle = theme.wallTop
        ctx.fillRect(cx - ts * 0.44, cy - ts * 0.62, ts * 0.88, ts * 0.14)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(cx - ts * 0.3, cy - ts * 0.5, ts * 0.08, ts * 0.7)
      } else {
        ctx.fillStyle = '#5b3416'
        ctx.fillRect(cx - ts * 0.4, cy - ts * 0.4, ts * 0.8, ts * 0.76)
        ctx.fillStyle = '#9a5b2a'
        ctx.fillRect(cx - ts * 0.4, cy - ts * 0.46, ts * 0.8, ts * 0.72)
        ctx.strokeStyle = '#5b3416'
        ctx.lineWidth = 3
        ctx.strokeRect(cx - ts * 0.34, cy - ts * 0.4, ts * 0.68, ts * 0.6)
        ctx.beginPath()
        ctx.moveTo(cx - ts * 0.34, cy - ts * 0.4)
        ctx.lineTo(cx + ts * 0.34, cy + ts * 0.2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(cx - ts * 0.4, cy - ts * 0.46, ts * 0.8, 2)
      }
    }
  }
  // Vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
}

export function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number, seed: number) {
  ctx.fillStyle = '#3f2a1a'
  ctx.fillRect(x - ts * 0.05, y - ts * 0.05, ts * 0.1, ts * 0.3)
  ctx.fillStyle = '#78716c'
  ctx.fillRect(x - ts * 0.1, y - ts * 0.08, ts * 0.2, ts * 0.07)
  const f = 1 + Math.sin(t * 13 + seed * 9) * 0.12 + Math.sin(t * 21 + seed) * 0.06
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(x - ts * 0.1, y - ts * 0.08)
  ctx.quadraticCurveTo(x - ts * 0.12, y - ts * 0.3 * f, x + Math.sin(t * 7 + seed) * ts * 0.04, y - ts * 0.42 * f)
  ctx.quadraticCurveTo(x + ts * 0.12, y - ts * 0.3 * f, x + ts * 0.1, y - ts * 0.08)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.ellipse(x, y - ts * 0.15, ts * 0.05, ts * 0.1 * f, 0, 0, TAU)
  ctx.fill()
}

export function drawBars(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, lift: number) {
  // lift 0 = closed, 1 = fully raised
  ctx.save()
  ctx.beginPath()
  ctx.rect(x + ts * 0.1, y, ts * 0.8, ts)
  ctx.clip()
  const off = -lift * ts * 0.95
  ctx.fillStyle = '#9ca3af'
  for (let i = 0; i < 4; i++) ctx.fillRect(x + ts * (0.2 + i * 0.2) - 1.5, y + off, 3, ts)
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(x + ts * 0.12, y + off + ts * 0.35, ts * 0.76, 3)
  ctx.fillRect(x + ts * 0.12, y + off + ts * 0.75, ts * 0.76, 3)
  ctx.restore()
}

export function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, open: number, t: number) {
  shadow(ctx, x, y + ts * 0.28, ts * 0.42, ts * 0.13)
  const glowR = ts * (0.9 + Math.sin(t * 4) * 0.08)
  const g = ctx.createRadialGradient(x, y, 0, x, y, glowR)
  g.addColorStop(0, 'rgba(253,224,71,0.45)')
  g.addColorStop(1, 'rgba(253,224,71,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#7c2d12'
  ctx.fillRect(x - ts * 0.36, y - ts * 0.08, ts * 0.72, ts * 0.36)
  ctx.fillStyle = '#b45309'
  ctx.fillRect(x - ts * 0.33, y - ts * 0.05, ts * 0.66, ts * 0.3)
  ctx.save()
  ctx.translate(x, y - ts * 0.08)
  ctx.scale(1, 1 - open * 1.6)
  ctx.fillStyle = '#92400e'
  ctx.beginPath()
  ctx.moveTo(-ts * 0.36, 0)
  ctx.lineTo(-ts * 0.36, -ts * 0.14)
  ctx.quadraticCurveTo(0, -ts * 0.34, ts * 0.36, -ts * 0.14)
  ctx.lineTo(ts * 0.36, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(-ts * 0.38, -ts * 0.03, ts * 0.76, ts * 0.05)
  ctx.restore()
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(x - ts * 0.3, y - ts * 0.08, ts * 0.06, ts * 0.36)
  ctx.fillRect(x + ts * 0.24, y - ts * 0.08, ts * 0.06, ts * 0.36)
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(x, y + ts * 0.03, ts * 0.06, 0, TAU)
  ctx.fill()
}

export function drawStairs(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number) {
  ctx.fillStyle = '#020203'
  ctx.fillRect(x - ts * 0.45, y - ts * 0.45, ts * 0.9, ts * 0.9)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(148,163,184,${0.75 - i * 0.17})`
    ctx.fillRect(x - ts * 0.42, y - ts * 0.42 + i * ts * 0.21, ts * 0.84, ts * 0.13)
  }
  ctx.strokeStyle = `rgba(253,224,71,${0.5 + Math.sin(t * 5) * 0.3})`
  ctx.lineWidth = 2.5
  ctx.strokeRect(x - ts * 0.47, y - ts * 0.47, ts * 0.94, ts * 0.94)
}

// ── Hero ────────────────────────────────────────────────────

/** Knight in 3/4 view. aim = facing angle; swing 0..1 (0 = idle). */
export function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, aim: number, walk: number, swing: number, spin: boolean, flash: boolean, rolling: number) {
  const r = ts * 0.3
  shadow(ctx, x, y + r * 0.95, r * 0.9, r * 0.32)
  const face = Math.cos(aim) >= 0 ? 1 : -1
  const up = Math.sin(aim) < -0.5
  ctx.save()
  ctx.translate(x, y)
  if (rolling > 0) {
    ctx.rotate(rolling * TAU * face)
    ctx.scale(0.85, 0.85)
  }
  const step = Math.sin(walk * 10)
  const bob = -Math.abs(step) * r * 0.12
  // Sword behind when facing up
  const swordA = swing > 0 ? (spin ? aim + swing * TAU : aim - 1.1 + swing * 2.2) : aim + 0.9 * face
  const drawSword = () => {
    ctx.save()
    ctx.translate(face * r * 0.55, bob + r * 0.1)
    ctx.rotate(swordA)
    ctx.fillStyle = '#78350f'
    ctx.fillRect(-r * 0.05, -r * 0.09, r * 0.35, r * 0.18)
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(r * 0.28, -r * 0.3, r * 0.1, r * 0.6)
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(r * 0.38, -r * 0.1)
    ctx.lineTo(r * 1.45, -r * 0.07)
    ctx.lineTo(r * 1.65, 0)
    ctx.lineTo(r * 1.45, r * 0.07)
    ctx.lineTo(r * 0.38, r * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(r * 0.4, -r * 0.015, r * 1.0, r * 0.03)
    ctx.restore()
  }
  if (up) drawSword()
  // feet
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.ellipse(-r * 0.32 + step * r * 0.2, r * 0.85, r * 0.2, r * 0.13, 0, 0, TAU)
  ctx.ellipse(r * 0.32 - step * r * 0.2, r * 0.85, r * 0.2, r * 0.13, 0, 0, TAU)
  ctx.fill()
  ctx.translate(0, bob)
  // cape
  ctx.fillStyle = '#b91c1c'
  ctx.beginPath()
  ctx.moveTo(-r * 0.6, -r * 0.2)
  ctx.quadraticCurveTo(-face * r * (1.0 + Math.abs(step) * 0.2), r * 0.5, -r * 0.55 - face * r * 0.3, r * 0.85)
  ctx.lineTo(r * 0.55 - face * r * 0.3, r * 0.85)
  ctx.quadraticCurveTo(r * 0.7, r * 0.3, r * 0.6, -r * 0.2)
  ctx.closePath()
  ctx.fill()
  // body (armor)
  ctx.fillStyle = flash ? '#fff' : '#3b82f6'
  ctx.beginPath()
  ctx.roundRect(-r * 0.55, -r * 0.2, r * 1.1, r * 1.0, r * 0.3)
  ctx.fill()
  ctx.fillStyle = flash ? '#fff' : '#cbd5e1'
  ctx.beginPath()
  ctx.roundRect(-r * 0.42, -r * 0.12, r * 0.84, r * 0.5, r * 0.2)
  ctx.fill()
  ctx.fillStyle = '#78350f'
  ctx.fillRect(-r * 0.55, r * 0.42, r * 1.1, r * 0.12)
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(-r * 0.08, r * 0.41, r * 0.16, r * 0.14)
  // helmet
  ctx.fillStyle = flash ? '#fff' : '#94a3b8'
  ctx.beginPath()
  ctx.arc(0, -r * 0.55, r * 0.55, 0, TAU)
  ctx.fill()
  ctx.fillStyle = flash ? '#fff' : '#e2e8f0'
  ctx.beginPath()
  ctx.ellipse(-r * 0.18, -r * 0.8, r * 0.22, r * 0.12, -0.5, 0, TAU)
  ctx.fill()
  if (!up) {
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(face > 0 ? -r * 0.15 : -r * 0.45, -r * 0.62, r * 0.6, r * 0.14, r * 0.07)
    ctx.fill()
    ctx.fillStyle = '#7dd3fc'
    ctx.fillRect(face > 0 ? r * 0.05 : -r * 0.3, -r * 0.6, r * 0.1, r * 0.08)
    ctx.fillRect(face > 0 ? r * 0.25 : -r * 0.1, -r * 0.6, r * 0.1, r * 0.08)
  }
  // plume
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.05)
  ctx.quadraticCurveTo(-face * r * 0.7, -r * 1.35, -face * r * 0.9, -r * 0.7)
  ctx.quadraticCurveTo(-face * r * 0.4, -r * 0.95, 0, -r * 0.9)
  ctx.fill()
  if (!up) drawSword()
  ctx.restore()
}

export function drawSwingArc(ctx: CanvasRenderingContext2D, x: number, y: number, reach: number, aim: number, k: number, spin: boolean) {
  // k: 0..1 life fraction remaining
  ctx.globalAlpha = k * 0.75
  ctx.fillStyle = spin ? 'rgba(125,211,252,0.6)' : 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  if (spin) {
    ctx.arc(x, y, reach, 0, TAU)
    ctx.arc(x, y, reach * 0.55, TAU, 0, true)
  } else {
    const a0 = aim - 1.1
    const a1 = aim - 1.1 + 2.2 * (1 - k * 0.6)
    ctx.arc(x, y, reach, a0, a1)
    ctx.arc(x, y, reach * 0.5, a1, a0, true)
  }
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

// ── Monsters ────────────────────────────────────────────────

export type MonKind = 'slime' | 'bigslime' | 'bat' | 'archer' | 'knight' | 'kingslime' | 'bonelord' | 'blackknight'

export const MON_R: Record<MonKind, number> = { slime: 0.28, bigslime: 0.42, bat: 0.25, archer: 0.3, knight: 0.36, kingslime: 0.95, bonelord: 0.6, blackknight: 0.7 }

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, look: number, color = '#fff', pupil = '#111') {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  ctx.fillStyle = pupil
  ctx.beginPath()
  ctx.arc(x + Math.cos(look) * r * 0.4, y + Math.sin(look) * r * 0.4, r * 0.5, 0, TAU)
  ctx.fill()
}

export function drawMonster(
  ctx: CanvasRenderingContext2D,
  kind: MonKind,
  x: number,
  y: number,
  ts: number,
  t: number,
  look: number,
  flash: boolean,
  state: number,
  hue: number,
) {
  const r = ts * MON_R[kind]
  const face = Math.cos(look) >= 0 ? 1 : -1
  if (kind === 'slime' || kind === 'bigslime' || kind === 'kingslime') {
    // state = hop height 0..1
    const hop = state
    const squash = hop > 0 ? 0.85 : 1 + Math.sin(t * 6) * 0.06
    shadow(ctx, x, y + r * 0.7, r * (1 - hop * 0.3), r * 0.3 * (1 - hop * 0.3))
    ctx.save()
    ctx.translate(x, y - hop * r * 1.4)
    ctx.scale(2 - squash, squash)
    const col = kind === 'kingslime' ? '#a855f7' : `hsl(${hue}, 70%, 50%)`
    const light = kind === 'kingslime' ? '#e9d5ff' : `hsl(${hue}, 80%, 72%)`
    ctx.fillStyle = flash ? '#fff' : col
    ctx.beginPath()
    ctx.moveTo(-r, r * 0.6)
    ctx.quadraticCurveTo(-r * 1.05, -r * 0.9, 0, -r * 0.95)
    ctx.quadraticCurveTo(r * 1.05, -r * 0.9, r, r * 0.6)
    ctx.quadraticCurveTo(0, r * 0.8, -r, r * 0.6)
    ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = light
    ctx.beginPath()
    ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.28, r * 0.16, -0.6, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    eye(ctx, -r * 0.3 + face * r * 0.1, -r * 0.1, r * 0.2, look)
    eye(ctx, r * 0.3 + face * r * 0.1, -r * 0.1, r * 0.2, look)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.beginPath()
    ctx.ellipse(face * r * 0.1, r * 0.25, r * 0.2, r * 0.08, 0, 0, Math.PI)
    ctx.fill()
    if (kind === 'kingslime') {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(-r * 0.45, -r * 0.8)
      ctx.lineTo(-r * 0.5, -r * 1.25)
      ctx.lineTo(-r * 0.22, -r * 1.02)
      ctx.lineTo(0, -r * 1.35)
      ctx.lineTo(r * 0.22, -r * 1.02)
      ctx.lineTo(r * 0.5, -r * 1.25)
      ctx.lineTo(r * 0.45, -r * 0.8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(0, -r * 0.95, r * 0.07, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    return
  }
  if (kind === 'bat') {
    const flap = Math.sin(t * 22)
    const fy = y - ts * 0.3 + Math.sin(t * 5) * r * 0.2
    shadow(ctx, x, y + r * 0.6, r * 0.6, r * 0.2, 0.25)
    ctx.save()
    ctx.translate(x, fy)
    ctx.fillStyle = flash ? '#fff' : '#4c1d95'
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.scale(sx, 0.35 + Math.abs(flap) * 0.85)
      ctx.beginPath()
      ctx.moveTo(r * 0.3, 0)
      ctx.quadraticCurveTo(r * 1.1, -r * 1.3, r * 2, -r * 0.3)
      ctx.quadraticCurveTo(r * 1.6, 0, r * 1.5, r * 0.35)
      ctx.quadraticCurveTo(r * 1.1, r * 0.05, r * 0.9, r * 0.4)
      ctx.quadraticCurveTo(r * 0.6, r * 0.1, r * 0.3, r * 0.3)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = flash ? '#fff' : '#7c3aed'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.7, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, -r * 0.4)
    ctx.lineTo(-r * 0.35, -r * 1.0)
    ctx.lineTo(-r * 0.1, -r * 0.55)
    ctx.moveTo(r * 0.5, -r * 0.4)
    ctx.lineTo(r * 0.35, -r * 1.0)
    ctx.lineTo(r * 0.1, -r * 0.55)
    ctx.fill()
    ctx.fillStyle = '#f87171'
    ctx.beginPath()
    ctx.arc(-r * 0.22, -r * 0.05, r * 0.14, 0, TAU)
    ctx.arc(r * 0.22, -r * 0.05, r * 0.14, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(-r * 0.12, r * 0.25)
    ctx.lineTo(-r * 0.06, r * 0.45)
    ctx.lineTo(0, r * 0.25)
    ctx.moveTo(r * 0.12, r * 0.25)
    ctx.lineTo(r * 0.06, r * 0.45)
    ctx.lineTo(0, r * 0.25)
    ctx.fill()
    ctx.restore()
    return
  }
  if (kind === 'archer' || kind === 'bonelord') {
    // skeleton; state = aiming 0..1
    const boss = kind === 'bonelord'
    const hover = boss ? Math.sin(t * 2.5) * r * 0.15 - r * 0.25 : 0
    shadow(ctx, x, y + r * 0.95, r * 0.8, r * 0.28)
    ctx.save()
    ctx.translate(x, y + hover)
    const step = boss ? 0 : Math.sin(t * 8)
    const bone = flash ? '#fff' : '#e7e5e4'
    if (boss) {
      ctx.fillStyle = '#3b0764'
      ctx.beginPath()
      ctx.moveTo(-r * 0.9, r * 1.0)
      ctx.lineTo(-r * 0.5, -r * 0.3)
      ctx.lineTo(r * 0.5, -r * 0.3)
      ctx.lineTo(r * 0.9, r * 1.0)
      ctx.quadraticCurveTo(r * 0.45, r * 0.8, 0, r * 1.0)
      ctx.quadraticCurveTo(-r * 0.45, r * 0.8, -r * 0.9, r * 1.0)
      ctx.fill()
      ctx.fillStyle = '#7e22ce'
      ctx.fillRect(-r * 0.1, -r * 0.3, r * 0.2, r * 1.2)
    } else {
      ctx.strokeStyle = bone
      ctx.lineWidth = Math.max(2, r * 0.14)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-r * 0.2, r * 0.3)
      ctx.lineTo(-r * 0.3 + step * r * 0.15, r * 0.9)
      ctx.moveTo(r * 0.2, r * 0.3)
      ctx.lineTo(r * 0.3 - step * r * 0.15, r * 0.9)
      ctx.stroke()
      // ribs
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.3)
      ctx.lineTo(0, r * 0.35)
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(-r * 0.32, -r * 0.18 + i * r * 0.17)
        ctx.lineTo(r * 0.32, -r * 0.18 + i * r * 0.17)
      }
      ctx.stroke()
    }
    // skull
    ctx.fillStyle = bone
    ctx.beginPath()
    ctx.arc(0, -r * 0.62, r * 0.42, 0, TAU)
    ctx.fill()
    ctx.fillRect(-r * 0.22, -r * 0.4, r * 0.44, r * 0.2)
    const glowCol = boss ? '#c084fc' : '#f87171'
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(-r * 0.16 + face * r * 0.06, -r * 0.65, r * 0.12, 0, TAU)
    ctx.arc(r * 0.16 + face * r * 0.06, -r * 0.65, r * 0.12, 0, TAU)
    ctx.fill()
    ctx.fillStyle = glowCol
    ctx.beginPath()
    ctx.arc(-r * 0.16 + face * r * 0.06, -r * 0.65, r * 0.05 + state * r * 0.04, 0, TAU)
    ctx.arc(r * 0.16 + face * r * 0.06, -r * 0.65, r * 0.05 + state * r * 0.04, 0, TAU)
    ctx.fill()
    if (boss) {
      // hood + staff orb
      ctx.fillStyle = '#581c87'
      ctx.beginPath()
      ctx.arc(0, -r * 0.7, r * 0.52, Math.PI * 1.05, Math.PI * 1.95)
      ctx.lineTo(r * 0.5, -r * 0.4)
      ctx.lineTo(r * 0.42, -r * 0.62)
      ctx.arc(0, -r * 0.62, r * 0.43, -0.2, Math.PI + 0.2, true)
      ctx.lineTo(-r * 0.5, -r * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = Math.max(2, r * 0.1)
      ctx.beginPath()
      ctx.moveTo(face * r * 0.75, r * 0.9)
      ctx.lineTo(face * r * 0.75, -r * 1.0)
      ctx.stroke()
      const og = ctx.createRadialGradient(face * r * 0.75, -r * 1.15, 0, face * r * 0.75, -r * 1.15, r * (0.4 + state * 0.4))
      og.addColorStop(0, '#f5d0fe')
      og.addColorStop(1, 'rgba(192,132,252,0)')
      ctx.fillStyle = og
      ctx.beginPath()
      ctx.arc(face * r * 0.75, -r * 1.15, r * (0.4 + state * 0.4), 0, TAU)
      ctx.fill()
    } else {
      // bow
      ctx.save()
      ctx.translate(Math.cos(look) * r * 0.45, -r * 0.05 + Math.sin(look) * r * 0.3)
      ctx.rotate(look)
      ctx.strokeStyle = '#a16207'
      ctx.lineWidth = Math.max(2, r * 0.12)
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.55, -1.2, 1.2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1
      const pull = state * r * 0.35
      ctx.beginPath()
      ctx.moveTo(Math.cos(-1.2) * r * 0.55, Math.sin(-1.2) * r * 0.55)
      ctx.lineTo(Math.cos(1.2) * r * 0.55 - pull - r * 0.0, 0)
      ctx.lineTo(Math.cos(1.2) * r * 0.55, Math.sin(1.2) * r * 0.55)
      ctx.stroke()
      if (state > 0) {
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(Math.cos(1.2) * r * 0.55 - pull, -1, r * 0.7, 2)
      }
      ctx.restore()
    }
    ctx.restore()
    return
  }
  // knight / black knight. state: 0 idle, 1 windup, 2 lunging
  const boss = kind === 'blackknight'
  shadow(ctx, x, y + r * 0.9, r * 0.9, r * 0.3)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(face, 1)
  const step = Math.sin(t * 7)
  const shake = state === 1 ? Math.sin(t * 60) * r * 0.05 : 0
  ctx.translate(shake, 0)
  const metal = flash ? '#fff' : boss ? '#1f2937' : '#6b7280'
  const trim = boss ? '#dc2626' : '#d97706'
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(-r * 0.3 + step * r * 0.15, r * 0.85, r * 0.2, r * 0.12, 0, 0, TAU)
  ctx.ellipse(r * 0.3 - step * r * 0.15, r * 0.85, r * 0.2, r * 0.12, 0, 0, TAU)
  ctx.fill()
  // shield (back side)
  ctx.fillStyle = boss ? '#7f1d1d' : '#92400e'
  ctx.beginPath()
  ctx.moveTo(-r * 0.95, -r * 0.3)
  ctx.lineTo(-r * 0.35, -r * 0.3)
  ctx.lineTo(-r * 0.35, r * 0.35)
  ctx.quadraticCurveTo(-r * 0.65, r * 0.75, -r * 0.95, r * 0.35)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = trim
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = metal
  ctx.beginPath()
  ctx.roundRect(-r * 0.55, -r * 0.25, r * 1.1, r * 1.05, r * 0.25)
  ctx.fill()
  ctx.fillStyle = trim
  ctx.fillRect(-r * 0.55, r * 0.35, r * 1.1, r * 0.1)
  // helm
  ctx.fillStyle = metal
  ctx.beginPath()
  ctx.roundRect(-r * 0.45, -r * 1.05, r * 0.9, r * 0.85, r * 0.3)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(-r * 0.35, -r * 0.98, r * 0.18, r * 0.6)
  ctx.fillStyle = '#020617'
  ctx.fillRect(-r * 0.1, -r * 0.7, r * 0.55, r * 0.12)
  ctx.fillStyle = state === 1 ? '#fde047' : boss ? '#ef4444' : '#f97316'
  ctx.fillRect(r * 0.05, -r * 0.69, r * 0.1, r * 0.1)
  ctx.fillRect(r * 0.28, -r * 0.69, r * 0.1, r * 0.1)
  if (boss) {
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.moveTo(-r * 0.4, -r * 0.95)
    ctx.lineTo(-r * 0.75, -r * 1.4)
    ctx.lineTo(-r * 0.2, -r * 1.05)
    ctx.moveTo(r * 0.4, -r * 0.95)
    ctx.lineTo(r * 0.75, -r * 1.4)
    ctx.lineTo(r * 0.2, -r * 1.05)
    ctx.fill()
  } else {
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.05)
    ctx.quadraticCurveTo(-r * 0.5, -r * 1.4, -r * 0.7, -r * 0.8)
    ctx.quadraticCurveTo(-r * 0.3, -r * 1.0, 0, -r * 0.95)
    ctx.fill()
  }
  // sword: raised during windup
  ctx.save()
  ctx.translate(r * 0.55, -r * 0.05)
  ctx.rotate(state === 1 ? -2.2 : state === 2 ? 0.2 : -0.6)
  ctx.fillStyle = '#78350f'
  ctx.fillRect(-r * 0.05, -r * 0.08, r * 0.3, r * 0.16)
  ctx.fillStyle = trim
  ctx.fillRect(r * 0.22, -r * 0.25, r * 0.08, r * 0.5)
  ctx.fillStyle = boss ? '#9ca3af' : '#e5e7eb'
  ctx.beginPath()
  ctx.moveTo(r * 0.3, -r * 0.09)
  ctx.lineTo(r * (boss ? 1.9 : 1.4), -r * 0.05)
  ctx.lineTo(r * (boss ? 2.1 : 1.55), 0)
  ctx.lineTo(r * (boss ? 1.9 : 1.4), r * 0.05)
  ctx.lineTo(r * 0.3, r * 0.09)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.restore()
}
