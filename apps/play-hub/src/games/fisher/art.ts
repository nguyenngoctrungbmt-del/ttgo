/** Deep Fisher vector art: sea creatures, the boat, lure and ocean depth. */

const TAU = Math.PI * 2

export type FishKind =
  | 'sardine'
  | 'clown'
  | 'mackerel'
  | 'tuna'
  | 'squid'
  | 'lantern'
  | 'angler'
  | 'gulper'
  | 'coela'
  | 'golden'
  | 'jelly'
  | 'mine'
  | 'puffer'
  | 'eel'

type Spec = { value: number; size: number; body: string; belly: string; fin: string; mark?: string; hazard?: boolean }

export const FISH: Record<FishKind, Spec> = {
  sardine: { value: 5, size: 12, body: '#94a3b8', belly: '#e2e8f0', fin: '#64748b' },
  clown: { value: 8, size: 13, body: '#f97316', belly: '#fdba74', fin: '#c2410c', mark: '#ffffff' },
  mackerel: { value: 12, size: 17, body: '#0ea5e9', belly: '#e0f2fe', fin: '#0369a1', mark: '#0c4a6e' },
  tuna: { value: 25, size: 22, body: '#1e3a8a', belly: '#cbd5e1', fin: '#facc15' },
  squid: { value: 30, size: 18, body: '#f472b6', belly: '#fbcfe8', fin: '#db2777' },
  lantern: { value: 50, size: 14, body: '#312e81', belly: '#6366f1', fin: '#1e1b4b', mark: '#67e8f9' },
  angler: { value: 80, size: 21, body: '#3f3f46', belly: '#52525b', fin: '#18181b', mark: '#fde047' },
  gulper: { value: 130, size: 26, body: '#4c0519', belly: '#9f1239', fin: '#1f0208', mark: '#fb7185' },
  coela: { value: 250, size: 28, body: '#1e40af', belly: '#60a5fa', fin: '#172554', mark: '#e0f2fe' },
  golden: { value: 500, size: 18, body: '#fbbf24', belly: '#fef3c7', fin: '#d97706', mark: '#fff7ed' },
  jelly: { value: -30, size: 17, body: '#f0abfc', belly: '#fae8ff', fin: '#c026d3' },
  mine: { value: 0, size: 17, body: '#334155', belly: '#64748b', fin: '#ef4444', hazard: true },
  puffer: { value: 0, size: 16, body: '#facc15', belly: '#fef9c3', fin: '#a16207', hazard: true },
  eel: { value: 0, size: 15, body: '#365314', belly: '#a3e635', fin: '#1a2e05', hazard: true },
}

export const ZONES = [
  { name: 'Sunlit Shallows', at: 0, top: '#38bdf8', bottom: '#0284c7' },
  { name: 'Twilight Zone', at: 100, top: '#0369a1', bottom: '#0c4a6e' },
  { name: 'Midnight Zone', at: 250, top: '#0c3555', bottom: '#082032' },
  { name: 'The Abyss', at: 450, top: '#071a2b', bottom: '#040d18' },
  { name: 'The Trench', at: 700, top: '#06101c', bottom: '#020610' },
]

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Water colour at a given depth in metres, blended between zones. */
export function waterAt(m: number) {
  let i = 0
  while (i < ZONES.length - 1 && ZONES[i + 1].at <= m) i++
  const a = ZONES[i]
  const b = ZONES[Math.min(ZONES.length - 1, i + 1)]
  const span = b.at - a.at || 1
  const k = Math.max(0, Math.min(1, (m - a.at) / span))
  const ca = hexToRgb(a.top)
  const cb = hexToRgb(b === a ? a.bottom : b.top)
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * k)},${Math.round(ca[1] + (cb[1] - ca[1]) * k)},${Math.round(ca[2] + (cb[2] - ca[2]) * k)})`
}

export function zoneIndex(m: number) {
  let i = 0
  while (i < ZONES.length - 1 && ZONES[i + 1].at <= m) i++
  return i
}

/** Draw a sea creature centred at (x, y); dir = facing (+1 right). */
export function drawFish(ctx: CanvasRenderingContext2D, kind: FishKind, x: number, y: number, u: number, dir: number, t: number, flash = false) {
  const sp = FISH[kind]
  const s = sp.size * u
  ctx.save()
  ctx.translate(x, y)
  if (kind === 'jelly') {
    const pulse = 1 + Math.sin(t * 4) * 0.12
    ctx.globalAlpha = 0.35
    ctx.fillStyle = sp.body
    ctx.beginPath()
    ctx.arc(0, 0, s * 1.6, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = sp.fin
    ctx.lineWidth = 1.5 * u
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(i * s * 0.3, 0)
      ctx.quadraticCurveTo(i * s * 0.3 + Math.sin(t * 5 + i) * s * 0.4, s * 0.9, i * s * 0.25, s * 1.6)
      ctx.stroke()
    }
    ctx.fillStyle = flash ? '#fff' : sp.body
    ctx.beginPath()
    ctx.ellipse(0, 0, s * pulse, s * 0.75 / pulse, 0, Math.PI, 0)
    ctx.quadraticCurveTo(0, s * 0.2, -s * pulse, 0)
    ctx.fill()
    ctx.fillStyle = sp.belly
    ctx.beginPath()
    ctx.ellipse(-s * 0.3, -s * 0.4, s * 0.25, s * 0.13, -0.4, 0, TAU)
    ctx.fill()
    ctx.restore()
    return
  }
  if (kind === 'mine') {
    ctx.rotate(t * 0.5)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 3 * u
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8)
      ctx.lineTo(Math.cos(a) * s * 1.35, Math.sin(a) * s * 1.35)
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(Math.cos(a) * s * 1.4, Math.sin(a) * s * 1.4, 2.4 * u, 0, TAU)
      ctx.fill()
    }
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 1, 0, 0, s)
    g.addColorStop(0, '#94a3b8')
    g.addColorStop(1, '#1e293b')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, s, 0, TAU)
    ctx.fill()
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ef4444' : '#7f1d1d'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.25, 0, TAU)
    ctx.fill()
    ctx.restore()
    return
  }
  if (kind === 'puffer') {
    ctx.scale(dir, 1)
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1.6 * u
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9)
      ctx.lineTo(Math.cos(a) * s * 1.3, Math.sin(a) * s * 1.3)
      ctx.stroke()
    }
    ctx.fillStyle = flash ? '#fff' : sp.body
    ctx.beginPath()
    ctx.arc(0, 0, s, 0, TAU)
    ctx.fill()
    ctx.fillStyle = sp.belly
    ctx.beginPath()
    ctx.ellipse(0, s * 0.35, s * 0.7, s * 0.45, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(s * 0.45, -s * 0.25, s * 0.25, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(s * 0.52, -s * 0.25, s * 0.12, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#7c2d12'
    ctx.lineWidth = 1.6 * u
    ctx.beginPath()
    ctx.moveTo(s * 0.25, -s * 0.5)
    ctx.lineTo(s * 0.7, -s * 0.42)
    ctx.stroke()
    ctx.restore()
    return
  }
  if (kind === 'eel') {
    ctx.scale(dir, 1)
    ctx.strokeStyle = sp.fin
    ctx.lineWidth = s * 0.9
    ctx.lineCap = 'round'
    const seg = 7
    ctx.beginPath()
    for (let i = 0; i <= seg; i++) {
      const px = s * 1.6 - i * s * 0.55
      const py = Math.sin(t * 6 - i * 0.9) * s * 0.35
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.strokeStyle = flash ? '#fff' : sp.body
    ctx.lineWidth = s * 0.65
    ctx.stroke()
    ctx.strokeStyle = sp.belly
    ctx.lineWidth = 1.5 * u
    ctx.setLineDash([3 * u, 4 * u])
    ctx.stroke()
    ctx.setLineDash([])
    if (Math.sin(t * 13) > 0.4) {
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.5 * u
      ctx.beginPath()
      ctx.moveTo(-s, -s * 0.8)
      ctx.lineTo(-s * 0.6, -s * 0.3)
      ctx.lineTo(-s * 0.2, -s * 0.9)
      ctx.lineTo(s * 0.3, -s * 0.4)
      ctx.stroke()
    }
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(s * 1.75, -s * 0.12, s * 0.13, 0, TAU)
    ctx.fill()
    ctx.restore()
    return
  }
  if (kind === 'squid') {
    ctx.scale(dir, 1)
    ctx.strokeStyle = sp.fin
    ctx.lineWidth = 2 * u
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(-s * 0.4, (i - 2) * s * 0.15)
      ctx.quadraticCurveTo(-s * 1.0, (i - 2) * s * 0.3 + Math.sin(t * 6 + i) * s * 0.2, -s * 1.5, (i - 2) * s * 0.35)
      ctx.stroke()
    }
    ctx.fillStyle = flash ? '#fff' : sp.body
    ctx.beginPath()
    ctx.moveTo(-s * 0.5, -s * 0.4)
    ctx.quadraticCurveTo(s * 0.8, -s * 0.5, s * 1.3, 0)
    ctx.quadraticCurveTo(s * 0.8, s * 0.5, -s * 0.5, s * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = sp.belly
    ctx.beginPath()
    ctx.ellipse(s * 0.3, -s * 0.15, s * 0.4, s * 0.1, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(-s * 0.25, -s * 0.12, s * 0.13, 0, TAU)
    ctx.fill()
    ctx.restore()
    return
  }
  // Generic fish body
  ctx.scale(dir, 1)
  const wag = Math.sin(t * 10) * 0.25
  const glowy = kind === 'lantern' || kind === 'golden' || kind === 'angler' || kind === 'gulper'
  if (glowy && sp.mark) {
    ctx.globalAlpha = 0.25
    ctx.fillStyle = sp.mark
    ctx.beginPath()
    ctx.arc(kind === 'angler' ? s * 1.4 : 0, kind === 'angler' ? -s * 1.1 : 0, s * 1.3, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  // tail
  ctx.fillStyle = sp.fin
  ctx.beginPath()
  ctx.moveTo(-s * 0.85, 0)
  ctx.lineTo(-s * 1.55, -s * (0.55 + wag))
  ctx.lineTo(-s * 1.4, 0)
  ctx.lineTo(-s * 1.55, s * (0.55 - wag))
  ctx.closePath()
  ctx.fill()
  // dorsal fin
  ctx.beginPath()
  ctx.moveTo(-s * 0.3, -s * 0.5)
  ctx.quadraticCurveTo(s * 0.0, -s * 1.0, s * 0.35, -s * 0.5)
  ctx.fill()
  // body
  const tall = kind === 'angler' || kind === 'gulper' ? 0.8 : kind === 'tuna' || kind === 'coela' ? 0.55 : 0.5
  ctx.fillStyle = flash ? '#fff' : sp.body
  ctx.beginPath()
  ctx.ellipse(0, 0, s, s * tall, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = flash ? '#fff' : sp.belly
  ctx.beginPath()
  ctx.ellipse(s * 0.05, s * tall * 0.4, s * 0.8, s * tall * 0.45, 0, 0, Math.PI)
  ctx.fill()
  // markings
  if (kind === 'clown' && sp.mark) {
    ctx.fillStyle = sp.mark
    ctx.fillRect(-s * 0.15, -s * 0.48, s * 0.18, s * 0.96)
    ctx.fillRect(s * 0.45, -s * 0.4, s * 0.14, s * 0.8)
  } else if (kind === 'mackerel' && sp.mark) {
    ctx.strokeStyle = sp.mark
    ctx.lineWidth = 1.4 * u
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(-s * 0.6 + i * s * 0.35, -s * 0.42)
      ctx.quadraticCurveTo(-s * 0.45 + i * s * 0.35, -s * 0.15, -s * 0.6 + i * s * 0.35, 0)
      ctx.stroke()
    }
  } else if (kind === 'lantern' || kind === 'coela' || kind === 'golden') {
    ctx.fillStyle = sp.mark!
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.arc(-s * 0.5 + i * s * 0.3, s * 0.18, s * 0.07, 0, TAU)
      ctx.fill()
    }
  }
  if (kind === 'angler') {
    ctx.strokeStyle = '#71717a'
    ctx.lineWidth = 1.5 * u
    ctx.beginPath()
    ctx.moveTo(s * 0.4, -s * 0.7)
    ctx.quadraticCurveTo(s * 1.1, -s * 1.6, s * 1.4, -s * 1.1)
    ctx.stroke()
    ctx.fillStyle = sp.mark!
    ctx.beginPath()
    ctx.arc(s * 1.4, -s * 1.1, s * 0.17, 0, TAU)
    ctx.fill()
  }
  if (kind === 'angler' || kind === 'gulper') {
    ctx.fillStyle = '#0a0a0a'
    ctx.beginPath()
    ctx.moveTo(s * 1.0, -s * 0.1)
    ctx.lineTo(s * 0.35, s * 0.15)
    ctx.lineTo(s * 0.95, s * 0.45)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#f8fafc'
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(s * (0.55 + i * 0.13), s * 0.08)
      ctx.lineTo(s * (0.6 + i * 0.13), s * 0.22)
      ctx.lineTo(s * (0.65 + i * 0.13), s * 0.1)
      ctx.fill()
    }
  }
  // eye
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(s * 0.55, -s * 0.12, s * 0.17, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(s * 0.6, -s * 0.12, s * 0.09, 0, TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.ellipse(-s * 0.1, -s * tall * 0.55, s * 0.45, s * 0.08, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

export function drawLure(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, shield: number) {
  if (shield > 0) {
    ctx.strokeStyle = `rgba(125,211,252,${0.5 + Math.sin(t * 6) * 0.2})`
    ctx.lineWidth = 2.5 * u
    ctx.beginPath()
    ctx.arc(x, y + 4 * u, 18 * u, 0, TAU)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(253,224,71,0.25)'
  ctx.beginPath()
  ctx.arc(x, y + 4 * u, 14 * u, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.ellipse(x, y, 6 * u, 9 * u, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.ellipse(x, y + 5 * u, 6 * u, 4 * u, 0, 0, Math.PI)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(x - 2 * u, y - 3 * u, 2 * u, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  ctx.arc(x + 3 * u, y + 13 * u, 4 * u, Math.PI * 0.1, Math.PI * 1.2)
  ctx.stroke()
}

export function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, rodTip: { x: number; y: number }, aimX?: number) {
  const bob = Math.sin(t * 1.6) * 2 * u
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.rotate(Math.sin(t * 1.2) * 0.03)
  // hull
  ctx.fillStyle = '#7c2d12'
  ctx.beginPath()
  ctx.moveTo(-46 * u, -10 * u)
  ctx.lineTo(46 * u, -10 * u)
  ctx.lineTo(34 * u, 8 * u)
  ctx.lineTo(-36 * u, 8 * u)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#b45309'
  ctx.fillRect(-46 * u, -14 * u, 92 * u, 6 * u)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(-40 * u, -4 * u, 76 * u, 3 * u)
  // fisher
  ctx.fillStyle = '#1d4ed8'
  ctx.beginPath()
  ctx.roundRect(-14 * u, -36 * u, 16 * u, 24 * u, 5 * u)
  ctx.fill()
  ctx.fillStyle = '#facc15'
  ctx.fillRect(-14 * u, -36 * u, 16 * u, 8 * u)
  ctx.fillStyle = '#f1c27d'
  ctx.beginPath()
  ctx.arc(-6 * u, -44 * u, 8 * u, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.ellipse(-6 * u, -50 * u, 12 * u, 3.5 * u, 0, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-6 * u, -50 * u, 7 * u, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-3 * u, -44 * u, 1.4 * u, 0, TAU)
  ctx.fill()
  // gun arm when aiming
  if (aimX != null) {
    const a = Math.atan2(-1, (aimX - x) / (60 * u))
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 4 * u
    ctx.beginPath()
    ctx.moveTo(-2 * u, -30 * u)
    ctx.lineTo(-2 * u + Math.cos(a) * 18 * u, -30 * u + Math.sin(a) * 18 * u)
    ctx.stroke()
  }
  ctx.restore()
  // rod
  ctx.strokeStyle = '#44403c'
  ctx.lineWidth = 2.5 * u
  ctx.beginPath()
  ctx.moveTo(x + 2 * u, y - 26 * u + bob)
  ctx.quadraticCurveTo(x + 24 * u, y - 52 * u + bob, rodTip.x, rodTip.y + bob)
  ctx.stroke()
}

export function drawSky(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, u: number, t: number) {
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, '#60a5fa')
  g.addColorStop(1, '#fde68a')
  ctx.fillStyle = g
  ctx.fillRect(0, top, W, bottom - top)
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.arc(W * 0.8, bottom - 140 * u, 24 * u, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 0.8
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 3; i++) {
    const cx = ((t * (5 + i * 2) + i * 160) % (W + 140)) - 70
    const cy = bottom - 90 * u - i * 70 * u
    ctx.beginPath()
    ctx.arc(cx, cy, 14 * u, 0, TAU)
    ctx.arc(cx + 16 * u, cy - 6 * u, 18 * u, 0, TAU)
    ctx.arc(cx + 34 * u, cy, 13 * u, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
