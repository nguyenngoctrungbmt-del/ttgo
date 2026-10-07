/** Screw Jam vector art: screw heads with colour + symbol coding, plates, toolboxes. */

type G = CanvasRenderingContext2D

export const SCREW_COLORS = [
  { name: 'Red', base: '#ef4444', light: '#fca5a5', dark: '#991b1b' },
  { name: 'Blue', base: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a' },
  { name: 'Yellow', base: '#facc15', light: '#fef08a', dark: '#a16207' },
  { name: 'Green', base: '#22c55e', light: '#86efac', dark: '#166534' },
  { name: 'Purple', base: '#a855f7', light: '#d8b4fe', dark: '#6b21a8' },
  { name: 'Orange', base: '#f97316', light: '#fdba74', dark: '#9a3412' },
  { name: 'Pink', base: '#ec4899', light: '#f9a8d4', dark: '#9d174d' },
  { name: 'Cyan', base: '#06b6d4', light: '#67e8f9', dark: '#155e75' },
]

/** Plate materials per level band: [top, bottom, edge]. */
export const MATERIALS = [
  [['#f5d6a8', '#d9a86c', '#9a6a36'], ['#e7b98a', '#c58b52', '#86552a'], ['#f3c98f', '#d39a5c', '#8f5f2c'], ['#eccfa4', '#cfa070', '#8a6038']],
  [['#e2e8f0', '#94a3b8', '#475569'], ['#cbd5e1', '#7c8ba1', '#3f4a5c'], ['#dbe4ee', '#8e9db2', '#4b5567'], ['#d6dde7', '#8592a6', '#434d5e']],
  [['#bfdbfe', '#7dd3fc', '#0369a1'], ['#c7d2fe', '#a5b4fc', '#4338ca'], ['#bbf7d0', '#86efac', '#15803d'], ['#fbcfe8', '#f9a8d4', '#be185d']],
]

/** Draws the colour-blind symbol for a screw colour, centred at 0,0 with radius r. */
export function drawSymbol(g: G, color: number, r: number, stroke: string) {
  g.strokeStyle = stroke
  g.fillStyle = stroke
  g.lineWidth = Math.max(1.5, r * 0.22)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const k = r * 0.55
  g.beginPath()
  switch (color) {
    case 0: // phillips cross
      g.moveTo(-k, 0)
      g.lineTo(k, 0)
      g.moveTo(0, -k)
      g.lineTo(0, k)
      g.stroke()
      break
    case 1: // flat slot
      g.moveTo(-k * 1.1, 0)
      g.lineTo(k * 1.1, 0)
      g.stroke()
      break
    case 2: // torx star
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const rr = i % 2 ? k * 0.5 : k
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      g.fill()
      break
    case 3: // hex socket
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        g.lineTo(Math.cos(a) * k * 0.85, Math.sin(a) * k * 0.85)
      }
      g.closePath()
      g.fill()
      break
    case 4: // triangle
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2
        g.lineTo(Math.cos(a) * k, Math.sin(a) * k)
      }
      g.closePath()
      g.fill()
      break
    case 5: // square drive
      g.rect(-k * 0.6, -k * 0.6, k * 1.2, k * 1.2)
      g.fill()
      break
    case 6: // pozi dot ring
      g.arc(0, 0, k * 0.6, 0, Math.PI * 2)
      g.stroke()
      g.beginPath()
      g.arc(0, 0, k * 0.2, 0, Math.PI * 2)
      g.fill()
      break
    default: // tri-wing
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2
        g.moveTo(0, 0)
        g.lineTo(Math.cos(a) * k, Math.sin(a) * k)
      }
      g.stroke()
  }
}

/**
 * Screw head seen from above. `lift` 0..1 raises it (bigger, longer shadow, threads visible).
 * `hidden` draws a grey mystery head.
 */
export function drawScrew(g: G, x: number, y: number, r: number, color: number, spin: number, lift = 0, hidden = false, ice = false) {
  const c = hidden ? { base: '#94a3b8', light: '#e2e8f0', dark: '#334155' } : SCREW_COLORS[color]
  const sc = 1 + lift * 0.35
  const R = r * sc
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.32)'
  g.beginPath()
  g.ellipse(x + 2 + lift * 6, y + 3 + lift * 10, R * 0.98, R * 0.9, 0, 0, Math.PI * 2)
  g.fill()
  if (lift > 0.05) {
    // shaft threads peeking out
    g.fillStyle = '#9ca3af'
    const len = lift * r * 1.2
    g.fillRect(x - r * 0.28, y, r * 0.56, len)
    g.strokeStyle = '#4b5563'
    g.lineWidth = 1.2
    for (let i = 0; i < 4; i++) {
      const yy = y + ((i + ((spin * 2) % 1)) / 4) * len
      g.beginPath()
      g.moveTo(x - r * 0.28, yy)
      g.lineTo(x + r * 0.28, yy + 2)
      g.stroke()
    }
  }
  const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R)
  gr.addColorStop(0, c.light)
  gr.addColorStop(0.55, c.base)
  gr.addColorStop(1, c.dark)
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, R, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = c.dark
  g.lineWidth = 1.5
  g.stroke()
  // inner bevel
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.lineWidth = 1.2
  g.beginPath()
  g.arc(x, y, R * 0.78, Math.PI * 1.05, Math.PI * 1.75)
  g.stroke()
  g.save()
  g.translate(x, y)
  g.rotate(spin)
  if (hidden) {
    g.fillStyle = '#1e293b'
    g.font = `900 ${Math.round(R * 1.05)}px 'Plus Jakarta Sans', system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.rotate(-spin)
    g.fillText('?', 0, R * 0.05)
  } else drawSymbol(g, color, R, 'rgba(15,23,42,0.78)')
  g.restore()
  if (ice) {
    g.fillStyle = 'rgba(186,230,253,0.62)'
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.lineWidth = 1.5
    g.beginPath()
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3
      const rr = R * (1.18 + (i % 2) * 0.12)
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.closePath()
    g.fill()
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.8)'
    g.beginPath()
    g.moveTo(x - R * 0.6, y - R * 0.2)
    g.lineTo(x - R * 0.2, y - R * 0.7)
    g.stroke()
  }
}

/** Empty hole where a screw sat. */
export function drawHole(g: G, x: number, y: number, r: number) {
  g.fillStyle = 'rgba(30,20,10,0.75)'
  g.beginPath()
  g.arc(x, y, r * 0.62, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.3)'
  g.lineWidth = 1
  g.beginPath()
  g.arc(x, y, r * 0.62, 0.2, Math.PI * 0.9)
  g.stroke()
}

/** Toolbox body with three sockets; returns nothing. Draws centred at x,y (w×h). */
export function drawToolbox(g: G, x: number, y: number, w: number, h: number, color: number, lid: number) {
  const c = SCREW_COLORS[color]
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.beginPath()
  g.roundRect(x - w / 2 + 3, y - h / 2 + 6, w, h, 10)
  g.fill()
  const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2)
  gr.addColorStop(0, c.light)
  gr.addColorStop(0.35, c.base)
  gr.addColorStop(1, c.dark)
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(x - w / 2, y - h / 2, w, h, 10)
  g.fill()
  g.strokeStyle = c.dark
  g.lineWidth = 2
  g.stroke()
  // handle
  g.strokeStyle = c.dark
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(x - w * 0.16, y - h / 2)
  g.lineTo(x - w * 0.12, y - h / 2 - 8)
  g.lineTo(x + w * 0.12, y - h / 2 - 8)
  g.lineTo(x + w * 0.16, y - h / 2)
  g.stroke()
  // tray inset
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.roundRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, 7)
  g.fill()
  // sockets
  for (let k = 0; k < 3; k++) {
    const sx = x + (k - 1) * (w / 3.3)
    g.fillStyle = 'rgba(15,23,42,0.55)'
    g.beginPath()
    g.arc(sx, y, h * 0.24, 0, Math.PI * 2)
    g.fill()
  }
  // symbol tag
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(x + w / 2 - 4, y - h / 2 + 4, 9, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = c.dark
  g.lineWidth = 2
  g.stroke()
  g.save()
  g.translate(x + w / 2 - 4, y - h / 2 + 4)
  drawSymbol(g, color, 8, c.dark)
  g.restore()
  if (lid > 0) {
    const lh = h * lid
    const lg = g.createLinearGradient(0, y - h / 2, 0, y - h / 2 + lh)
    lg.addColorStop(0, c.light)
    lg.addColorStop(1, c.base)
    g.fillStyle = lg
    g.beginPath()
    g.roundRect(x - w / 2, y - h / 2, w, lh, 10)
    g.fill()
    g.strokeStyle = c.dark
    g.lineWidth = 2
    g.stroke()
    if (lid > 0.9) {
      g.fillStyle = '#fff'
      g.beginPath()
      g.moveTo(x - 9, y)
      g.lineTo(x - 3, y + 6)
      g.lineTo(x + 10, y - 7)
      g.lineTo(x + 7, y - 10)
      g.lineTo(x - 3, y)
      g.lineTo(x - 6, y - 3)
      g.closePath()
      g.fill()
    }
  }
}
