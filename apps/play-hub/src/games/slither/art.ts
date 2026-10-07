/** Cached vector sprites for Slither Arena (drawn once, blitted many times per frame). */

const balls = new Map<string, HTMLCanvasElement>()
const glows = new Map<string, HTMLCanvasElement>()
const SIZE = 64

function canvas(size: number) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  let r = n >> 16
  let g = (n >> 8) & 255
  let b = n & 255
  if (k >= 0) {
    r += (255 - r) * k
    g += (255 - g) * k
    b += (255 - b) * k
  } else {
    r *= 1 + k
    g *= 1 + k
    b *= 1 + k
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

/** Shaded body bead: dark rim, radial body, specular highlight. */
export function ball(color: string) {
  let c = balls.get(color)
  if (c) return c
  c = canvas(SIZE)
  const g = c.getContext('2d')!
  const m = SIZE / 2
  g.fillStyle = shade(color, -0.55)
  g.beginPath()
  g.arc(m, m, m - 1, 0, Math.PI * 2)
  g.fill()
  const grad = g.createRadialGradient(m - 8, m - 9, 2, m, m, m - 3)
  grad.addColorStop(0, shade(color, 0.45))
  grad.addColorStop(0.55, color)
  grad.addColorStop(1, shade(color, -0.35))
  g.fillStyle = grad
  g.beginPath()
  g.arc(m, m, m - 4, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.ellipse(m - 9, m - 11, 9, 6, -0.6, 0, Math.PI * 2)
  g.fill()
  balls.set(color, c)
  return c
}

/** Soft additive-looking halo for pellets, boost trails and orbs. */
export function halo(color: string) {
  let c = glows.get(color)
  if (c) return c
  c = canvas(SIZE)
  const g = c.getContext('2d')!
  const m = SIZE / 2
  const grad = g.createRadialGradient(m, m, 0, m, m, m)
  grad.addColorStop(0, color)
  grad.addColorStop(0.25, color)
  grad.addColorStop(0.3, shade(color, 0.1).replace('rgb', 'rgba').replace(')', ',0.55)'))
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, SIZE, SIZE)
  // bright core
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.beginPath()
  g.arc(m - 3, m - 3, 4, 0, Math.PI * 2)
  g.fill()
  glows.set(color, c)
  return c
}

export type FloorPal = { base: string; a: string; b: string; line: string }

const DEFAULT_FLOOR: FloorPal = { base: '#0d1528', a: '#16223d', b: '#0f182d', line: 'rgba(56, 189, 248, 0.07)' }
const hexTiles = new Map<string, HTMLCanvasElement>()

/** Repeating hex-floor tile used as a world-space pattern (one cached tile per palette). */
export function hexPattern(ctx: CanvasRenderingContext2D, pal: FloorPal = DEFAULT_FLOOR) {
  const key = pal.base + pal.a + pal.b + pal.line
  let hexTile = hexTiles.get(key)
  if (!hexTile) {
    const s = 26
    const h = Math.sqrt(3) * s
    const tw = Math.round(3 * s)
    const th = Math.round(h)
    hexTile = canvas(tw)
    hexTile.height = th
    const g = hexTile.getContext('2d')!
    g.fillStyle = pal.base
    g.fillRect(0, 0, tw, th)
    const hex = (cx: number, cy: number) => {
      g.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i
        const x = cx + Math.cos(a) * (s - 2)
        const y = cy + Math.sin(a) * (s - 2)
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.closePath()
    }
    for (let ix = -1; ix <= 2; ix++) {
      for (let iy = -1; iy <= 2; iy++) {
        for (const [ox, oy] of [
          [0, 0],
          [1.5 * s, h / 2],
        ]) {
          const cx = ix * 3 * s + ox
          const cy = iy * h + oy
          hex(cx, cy)
          const grad = g.createRadialGradient(cx - 4, cy - 6, 2, cx, cy, s)
          grad.addColorStop(0, pal.a)
          grad.addColorStop(1, pal.b)
          g.fillStyle = grad
          g.fill()
          g.strokeStyle = pal.line
          g.lineWidth = 1.5
          g.stroke()
        }
      }
    }
    hexTiles.set(key, hexTile)
  }
  return ctx.createPattern(hexTile, 'repeat')
}
