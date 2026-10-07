/** Block Jam vector art: chunky 3D blocks, doors, symbols, rocks, keys and locks. */

export type Hue = { name: string; base: string; light: string; dark: string; sym: Sym }
export type Sym = 'circle' | 'square' | 'star' | 'triangle' | 'heart' | 'diamond'

export const HUES: Hue[] = [
  { name: 'Red', base: '#ef4444', light: '#fca5a5', dark: '#991b1b', sym: 'circle' },
  { name: 'Blue', base: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', sym: 'square' },
  { name: 'Yellow', base: '#facc15', light: '#fef08a', dark: '#a16207', sym: 'star' },
  { name: 'Green', base: '#22c55e', light: '#86efac', dark: '#14532d', sym: 'triangle' },
  { name: 'Purple', base: '#a855f7', light: '#d8b4fe', dark: '#581c87', sym: 'heart' },
  { name: 'Orange', base: '#f97316', light: '#fdba74', dark: '#9a3412', sym: 'diamond' },
]

type G = CanvasRenderingContext2D

export function symbolPath(g: G, sym: Sym, x: number, y: number, r: number) {
  g.beginPath()
  switch (sym) {
    case 'circle':
      g.arc(x, y, r * 0.8, 0, Math.PI * 2)
      break
    case 'square':
      g.rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4)
      break
    case 'triangle':
      g.moveTo(x, y - r * 0.95)
      g.lineTo(x + r * 0.95, y + r * 0.7)
      g.lineTo(x - r * 0.95, y + r * 0.7)
      g.closePath()
      break
    case 'diamond':
      g.moveTo(x, y - r)
      g.lineTo(x + r * 0.8, y)
      g.lineTo(x, y + r)
      g.lineTo(x - r * 0.8, y)
      g.closePath()
      break
    case 'heart':
      g.moveTo(x, y + r * 0.85)
      g.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.15, x, y - r * 0.4)
      g.bezierCurveTo(x + r * 0.6, y - r * 1.15, x + r * 1.3, y - r * 0.1, x, y + r * 0.85)
      g.closePath()
      break
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? r * 0.45 : r
        if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      g.closePath()
      break
  }
}

/** Union of cells as one chunky piece. (ox, oy) = pixel of offset (0,0). */
export function drawPiece(g: G, cells: [number, number][], ox: number, oy: number, s: number, hue: Hue, inset: number, depth: number) {
  const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y)
  const rectOf = (x: number, y: number) => {
    const l = has(x - 1, y) ? -1 : inset
    const r = has(x + 1, y) ? -1 : inset
    const t = has(x, y - 1) ? -1 : inset
    const b = has(x, y + 1) ? -1 : inset
    return [ox + x * s + l, oy + y * s + t, s - l - r, s - t - b] as const
  }
  const rad = s * 0.2
  // side (depth)
  g.fillStyle = hue.dark
  g.beginPath()
  for (const [x, y] of cells) {
    const [rx, ry, rw, rh] = rectOf(x, y)
    g.roundRect(rx, ry + depth, rw, rh, rad)
  }
  g.fill()
  // top face
  const ys = cells.map((c) => c[1])
  const top = oy + Math.min(...ys) * s
  const bot = oy + (Math.max(...ys) + 1) * s
  const gr = g.createLinearGradient(0, top, 0, bot)
  gr.addColorStop(0, hue.light)
  gr.addColorStop(0.35, hue.base)
  gr.addColorStop(1, hue.base)
  g.fillStyle = gr
  g.beginPath()
  for (const [x, y] of cells) {
    const [rx, ry, rw, rh] = rectOf(x, y)
    g.roundRect(rx, ry, rw, rh, rad)
  }
  g.fill()
  // glossy highlight on each exposed top edge
  g.fillStyle = 'rgba(255,255,255,0.35)'
  for (const [x, y] of cells) {
    if (has(x, y - 1)) continue
    const [rx, ry, rw] = rectOf(x, y)
    g.beginPath()
    g.roundRect(rx + s * 0.14, ry + s * 0.08, rw - s * 0.28, s * 0.1, s * 0.05)
    g.fill()
  }
}

export function centreCell(cells: [number, number][]): [number, number] {
  const cx = cells.reduce((a, c) => a + c[0], 0) / cells.length
  const cy = cells.reduce((a, c) => a + c[1], 0) / cells.length
  let best = cells[0]
  let bd = 1e9
  for (const c of cells) {
    const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

export function drawRock(g: G, x: number, y: number, s: number) {
  const gr = g.createLinearGradient(x, y, x, y + s)
  gr.addColorStop(0, '#94a3b8')
  gr.addColorStop(1, '#475569')
  g.fillStyle = '#334155'
  g.beginPath()
  g.roundRect(x + 3, y + 6, s - 6, s - 7, s * 0.25)
  g.fill()
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(x + 3, y + 3, s - 6, s - 9, s * 0.25)
  g.fill()
  g.strokeStyle = 'rgba(30,41,59,0.5)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(x + s * 0.3, y + s * 0.3)
  g.lineTo(x + s * 0.5, y + s * 0.45)
  g.lineTo(x + s * 0.45, y + s * 0.65)
  g.stroke()
}

export function drawKey(g: G, x: number, y: number, r: number) {
  g.save()
  g.translate(x, y)
  g.rotate(-0.6)
  g.fillStyle = '#facc15'
  g.strokeStyle = '#a16207'
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(-r * 0.45, 0, r * 0.45, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.fillStyle = '#a16207'
  g.beginPath()
  g.arc(-r * 0.45, 0, r * 0.17, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#facc15'
  g.fillRect(-r * 0.05, -r * 0.12, r * 1.1, r * 0.24)
  g.fillRect(r * 0.6, 0, r * 0.16, r * 0.4)
  g.fillRect(r * 0.85, 0, r * 0.16, r * 0.3)
  g.restore()
}

export function drawLock(g: G, x: number, y: number, r: number) {
  g.strokeStyle = '#cbd5e1'
  g.lineWidth = r * 0.25
  g.beginPath()
  g.arc(x, y - r * 0.25, r * 0.45, Math.PI, 0)
  g.stroke()
  const gr = g.createLinearGradient(x, y - r * 0.3, x, y + r * 0.8)
  gr.addColorStop(0, '#fde047')
  gr.addColorStop(1, '#ca8a04')
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(x - r * 0.7, y - r * 0.25, r * 1.4, r * 1.05, r * 0.2)
  g.fill()
  g.fillStyle = '#713f12'
  g.beginPath()
  g.arc(x, y + r * 0.18, r * 0.16, 0, Math.PI * 2)
  g.fill()
  g.fillRect(x - r * 0.06, y + r * 0.2, r * 0.12, r * 0.32)
}

/** White double-headed arrow showing a block's only axis. */
export function drawAxis(g: G, x: number, y: number, r: number, vertical: boolean) {
  g.save()
  g.translate(x, y)
  if (vertical) g.rotate(Math.PI / 2)
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = r * 0.22
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(-r * 0.55, 0)
  g.lineTo(r * 0.55, 0)
  g.stroke()
  for (const sgn of [-1, 1]) {
    g.beginPath()
    g.moveTo(sgn * r, 0)
    g.lineTo(sgn * r * 0.5, -r * 0.4)
    g.lineTo(sgn * r * 0.5, r * 0.4)
    g.closePath()
    g.fill()
  }
  g.restore()
}
