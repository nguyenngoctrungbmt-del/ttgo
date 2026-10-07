export type Kind = 'lobby' | 'apt' | 'garden' | 'concrete' | 'gold'

export const PALS = [
  { body: '#e76f51', dark: '#9c3d26', trim: '#f4a261' },
  { body: '#2a9d8f', dark: '#1d6b62', trim: '#8ad1c7' },
  { body: '#e9c46a', dark: '#a8862f', trim: '#fff1c1' },
  { body: '#7fb8d8', dark: '#41799a', trim: '#e0f4fb' },
  { body: '#efe2d1', dark: '#b39f88', trim: '#ffffff' },
  { body: '#b56576', dark: '#7a3b4a', trim: '#e5a6b4' },
]

function hex(c: string) {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function lerpColor(a: string, b: string, k: number) {
  const A = hex(a)
  const B = hex(b)
  const r = Math.round(A[0] + (B[0] - A[0]) * k)
  const g = Math.round(A[1] + (B[1] - A[1]) * k)
  const bl = Math.round(A[2] + (B[2] - A[2]) * k)
  return `rgb(${r},${g},${bl})`
}

/** A yellow hard hat (life icon). */
export function drawHat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(0, 3, 11, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createLinearGradient(0, -10, 0, 2)
  g.addColorStop(0, '#fde047')
  g.addColorStop(1, '#eab308')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-8, 0)
  ctx.quadraticCurveTo(-8, -11, 0, -11)
  ctx.quadraticCurveTo(8, -11, 8, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ca8a04'
  ctx.beginPath()
  ctx.roundRect(-11, -1, 22, 3.5, 1.5)
  ctx.fill()
  ctx.fillStyle = '#facc15'
  ctx.fillRect(-1.5, -11, 3, 10)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.ellipse(-4, -7, 1.6, 2.8, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function hash(a: number, b: number) {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return v - Math.floor(v)
}

/**
 * One tower floor centred on cx, top edge at y. `lit` windows are lit with residents.
 */
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  w: number,
  h: number,
  kind: Kind,
  pal: number,
  index: number,
  lit: number,
  litT: number,
  seed: number,
  t: number,
) {
  const x = cx - w / 2
  if (kind === 'lobby') {
    ctx.fillStyle = '#475569'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = '#334155'
    ctx.fillRect(x, y, w, 4)
    // Glass frontage + revolving door
    ctx.fillStyle = '#93c5fd'
    ctx.fillRect(x + 8, y + 8, w - 16, h - 8)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 14 + i * 34, y + 9, 6, h - 10)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(cx - 9, y + 10, 18, h - 10)
    ctx.fillStyle = '#fde68a'
    ctx.fillRect(cx - 7, y + 12, 6, h - 12)
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(cx - 26, y + 4)
    ctx.lineTo(cx + 26, y + 4)
    ctx.lineTo(cx + 20, y + 10)
    ctx.lineTo(cx - 20, y + 10)
    ctx.closePath()
    ctx.fill()
    return
  }
  if (kind === 'garden') {
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(x, y + h - 9, w, 9)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(x, y + h - 3, w, 3)
    ctx.fillStyle = '#7c4a21'
    ctx.fillRect(x + 2, y + h - 13, w - 4, 4)
    // Hedges, trees and flowers
    ctx.fillStyle = '#15803d'
    for (let i = 0; i < Math.max(2, Math.floor(w / 16)); i++) {
      const bx = x + 8 + i * 16
      if (bx > x + w - 6) break
      ctx.beginPath()
      ctx.arc(bx, y + h - 15, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    const trees = Math.max(1, Math.floor(w / 50))
    for (let i = 0; i < trees; i++) {
      const tx = x + w * ((i + 0.5) / trees)
      const sway = Math.sin(t * 2 + i + seed) * 1.5
      ctx.fillStyle = '#7c4a21'
      ctx.fillRect(tx - 1.5, y + 6, 3, h - 18)
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.arc(tx + sway, y + 4, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.arc(tx + sway - 3, y + 1, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    const cols = ['#f472b6', '#fde047', '#f87171', '#ffffff']
    for (let i = 0; i < Math.floor(w / 12); i++) {
      ctx.fillStyle = cols[(i + seed) % 4]
      ctx.fillRect(x + 5 + i * 12 + hash(i, seed) * 4, y + h - 19 - hash(seed, i) * 4, 3, 3)
    }
    return
  }
  const p = PALS[pal % PALS.length]
  let body = p.body
  let dark = p.dark
  let trim = p.trim
  if (kind === 'concrete') {
    body = '#9ca3af'
    dark = '#4b5563'
    trim = '#d1d5db'
  } else if (kind === 'gold') {
    body = '#eab308'
    dark = '#92400e'
    trim = '#fef08a'
  }
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, trim)
  g.addColorStop(0.12, body)
  g.addColorStop(0.85, body)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = dark
  ctx.fillRect(x, y + h - 3, w, 3)
  ctx.fillStyle = trim
  ctx.fillRect(x - 1, y, w + 2, 3)
  if (kind === 'concrete') {
    ctx.fillStyle = '#6b7280'
    for (let i = 0; i < w / 14; i++) {
      ctx.beginPath()
      ctx.arc(x + 6 + i * 14, y + 6, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Windows
  const n = Math.max(1, Math.floor((w - 8) / 18))
  const sp = (w - 8) / n
  const ww = Math.min(11, sp - 5)
  for (let i = 0; i < n; i++) {
    const wx = x + 4 + sp * i + (sp - ww) / 2
    const wy = y + 8
    const order = (i * 3 + seed) % n
    const on = order < lit
    if (on) {
      const pop = litT < 1.2 ? Math.max(0, 1 - Math.abs(litT * 10 - order - 0.5) * 0.3) : 0
      ctx.fillStyle = kind === 'gold' ? '#fff7c2' : '#fde68a'
      ctx.fillRect(wx - pop, wy - pop, ww + pop * 2, 15 + pop * 2)
      const r = hash(i + index * 7, seed)
      if (r < 0.55) {
        // Resident silhouette
        const bob = Math.sin(t * 2 + i + index) * 0.6
        ctx.fillStyle = r < 0.2 ? '#c2410c' : '#b45309'
        ctx.beginPath()
        ctx.arc(wx + ww / 2, wy + 7 + bob, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(wx + ww / 2 - 3, wy + 10 + bob, 6, 5 - bob)
      } else if (r < 0.75) {
        ctx.fillStyle = '#16a34a'
        ctx.beginPath()
        ctx.arc(wx + ww / 2, wy + 11, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(wx, wy, ww, 15)
      ctx.fillStyle = 'rgba(148,163,184,0.35)'
      ctx.beginPath()
      ctx.moveTo(wx, wy + 10)
      ctx.lineTo(wx + ww * 0.7, wy)
      ctx.lineTo(wx + ww, wy)
      ctx.lineTo(wx, wy + 14)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = dark
    ctx.fillRect(wx - 1, wy + 15, ww + 2, 2)
  }
  if (kind === 'gold') {
    const k = (t * 0.6 + seed * 0.1) % 1.6
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(x + w * k - 10, y)
    ctx.lineTo(x + w * k, y)
    ctx.lineTo(x + w * k - 14, y + h)
    ctx.lineTo(x + w * k - 24, y + h)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}
