/** Vector block art for Drop Merge. Tier e = exponent (value 2^e). */

type Style = { name: string; top: string; mid: string; bot: string; ink: string; emblem: Emblem }
type Emblem = 'dot' | 'diamond' | 'tri' | 'square' | 'heart' | 'star' | 'crown' | 'gem' | 'flame' | 'bolt' | 'sun' | 'moon' | 'galaxy'

const STYLES: Style[] = [
  { name: 'Drop', top: '#bae6fd', mid: '#38bdf8', bot: '#0369a1', ink: '#ffffff', emblem: 'dot' },
  { name: 'Sprout', top: '#bbf7d0', mid: '#4ade80', bot: '#15803d', ink: '#ffffff', emblem: 'diamond' },
  { name: 'Spark', top: '#fef9c3', mid: '#facc15', bot: '#a16207', ink: '#422006', emblem: 'tri' },
  { name: 'Ember', top: '#fed7aa', mid: '#fb923c', bot: '#c2410c', ink: '#ffffff', emblem: 'square' },
  { name: 'Heart', top: '#fecaca', mid: '#f87171', bot: '#b91c1c', ink: '#ffffff', emblem: 'heart' },
  { name: 'Star', top: '#fbcfe8', mid: '#f472b6', bot: '#be185d', ink: '#ffffff', emblem: 'star' },
  { name: 'Crown', top: '#ddd6fe', mid: '#a78bfa', bot: '#6d28d9', ink: '#ffffff', emblem: 'crown' },
  { name: 'Gem', top: '#c7d2fe', mid: '#818cf8', bot: '#3730a3', ink: '#ffffff', emblem: 'gem' },
  { name: 'Flame', top: '#99f6e4', mid: '#2dd4bf', bot: '#0f766e', ink: '#ffffff', emblem: 'flame' },
  { name: 'Bolt', top: '#fef3c7', mid: '#fbbf24', bot: '#b45309', ink: '#451a03', emblem: 'bolt' },
  { name: 'Sun', top: '#ffffff', mid: '#e2e8f0', bot: '#64748b', ink: '#0f172a', emblem: 'sun' },
  { name: 'Moon', top: '#475569', mid: '#1e293b', bot: '#020617', ink: '#e9d5ff', emblem: 'moon' },
  { name: 'Galaxy', top: '#f0abfc', mid: '#8b5cf6', bot: '#1e1b4b', ink: '#ffffff', emblem: 'galaxy' },
]

export function styleOf(e: number): Style {
  return STYLES[Math.max(0, Math.min(STYLES.length - 1, e - 1))]
}

export function label(e: number): string {
  const v = Math.pow(2, e)
  if (v >= 1048576) return `${Math.round(v / 1048576)}M`
  if (v >= 1024) return `${Math.round(v / 1024)}K`
  return String(v)
}

export function tierName(e: number) {
  return `${label(e)} ${styleOf(e).name}`
}

type G = CanvasRenderingContext2D

export function emblem(g: G, kind: Emblem, s: number, color: string) {
  g.fillStyle = color
  g.strokeStyle = color
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.beginPath()
  switch (kind) {
    case 'dot':
      g.moveTo(0, -s)
      g.bezierCurveTo(s * 0.7, -s * 0.2, s * 0.75, s * 0.9, 0, s * 0.9)
      g.bezierCurveTo(-s * 0.75, s * 0.9, -s * 0.7, -s * 0.2, 0, -s)
      break
    case 'diamond':
      g.moveTo(0, s * 0.9)
      g.quadraticCurveTo(-s, 0, -s * 0.2, -s)
      g.quadraticCurveTo(s * 0.1, -s * 0.2, 0, s * 0.9)
      g.moveTo(0, s * 0.9)
      g.quadraticCurveTo(s, -s * 0.2, s * 0.5, -s * 0.8)
      g.quadraticCurveTo(0, -s * 0.2, 0, s * 0.9)
      break
    case 'tri':
      g.moveTo(0, -s)
      g.lineTo(s * 0.95, s * 0.75)
      g.lineTo(-s * 0.95, s * 0.75)
      break
    case 'square':
      g.moveTo(0, -s)
      g.lineTo(s, 0)
      g.lineTo(0, s)
      g.lineTo(-s, 0)
      break
    case 'heart':
      g.moveTo(0, s * 0.9)
      g.bezierCurveTo(-s * 1.3, 0, -s * 0.6, -s * 1.1, 0, -s * 0.35)
      g.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.3, 0, 0, s * 0.9)
      break
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? s * 0.45 : s
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      break
    case 'crown':
      g.moveTo(-s, s * 0.7)
      g.lineTo(-s, -s * 0.5)
      g.lineTo(-s * 0.5, 0)
      g.lineTo(0, -s * 0.9)
      g.lineTo(s * 0.5, 0)
      g.lineTo(s, -s * 0.5)
      g.lineTo(s, s * 0.7)
      break
    case 'gem':
      g.moveTo(-s, -s * 0.3)
      g.lineTo(-s * 0.5, -s * 0.85)
      g.lineTo(s * 0.5, -s * 0.85)
      g.lineTo(s, -s * 0.3)
      g.lineTo(0, s)
      break
    case 'flame':
      g.moveTo(0, -s)
      g.bezierCurveTo(s * 0.4, -s * 0.4, s, 0, s * 0.7, s * 0.6)
      g.bezierCurveTo(s * 0.5, s, -s * 0.5, s, -s * 0.7, s * 0.6)
      g.bezierCurveTo(-s, 0, -s * 0.2, -s * 0.3, 0, -s)
      break
    case 'bolt':
      g.moveTo(s * 0.3, -s)
      g.lineTo(-s * 0.6, s * 0.15)
      g.lineTo(-s * 0.05, s * 0.15)
      g.lineTo(-s * 0.3, s)
      g.lineTo(s * 0.6, -s * 0.15)
      g.lineTo(s * 0.05, -s * 0.15)
      break
    case 'sun':
      g.arc(0, 0, s * 0.5, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = s * 0.16
      g.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        g.moveTo(Math.cos(a) * s * 0.68, Math.sin(a) * s * 0.68)
        g.lineTo(Math.cos(a) * s, Math.sin(a) * s)
      }
      g.stroke()
      return
    case 'moon':
      g.arc(0, 0, s * 0.9, Math.PI * 0.3, Math.PI * 1.7)
      g.arc(s * 0.35, -s * 0.05, s * 0.68, Math.PI * 1.55, Math.PI * 0.45, true)
      break
    case 'galaxy':
      g.lineWidth = s * 0.18
      for (let arm = 0; arm < 2; arm++) {
        g.beginPath()
        for (let k = 0; k <= 16; k++) {
          const a = arm * Math.PI + k * 0.32
          const r = (k / 16) * s
          if (k === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
          else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        g.stroke()
      }
      g.beginPath()
      g.arc(0, 0, s * 0.22, 0, Math.PI * 2)
      g.fill()
      return
  }
  g.closePath()
  g.fill()
}

/** Full block at size `c` (square), centered. */
export function drawBlock(g: G, e: number, c: number) {
  const st = styleOf(e)
  const h = c / 2
  const rad = c * 0.2
  // lip / shadow
  g.fillStyle = st.bot
  g.beginPath()
  g.roundRect(-h, -h + c * 0.06, c, c - c * 0.06, rad)
  g.fill()
  const gr = g.createLinearGradient(0, -h, 0, h)
  gr.addColorStop(0, st.top)
  gr.addColorStop(0.55, st.mid)
  gr.addColorStop(1, st.mid)
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(-h, -h, c, c - c * 0.1, rad)
  g.fill()
  // bevel highlight
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.roundRect(-h + c * 0.08, -h + c * 0.06, c - c * 0.16, c * 0.16, c * 0.08)
  g.fill()
  // big faint emblem watermark
  g.save()
  g.globalAlpha = 0.18
  g.translate(c * 0.18, c * 0.1)
  emblem(g, st.emblem, c * 0.42, st.bot)
  g.restore()
  // small emblem badge
  g.save()
  g.translate(-h + c * 0.2, -h + c * 0.22)
  g.globalAlpha = 0.9
  emblem(g, st.emblem, c * 0.1, st.ink)
  g.restore()
  if (e >= 10) {
    g.strokeStyle = e >= 12 ? 'rgba(233,213,255,0.85)' : 'rgba(255,255,255,0.8)'
    g.lineWidth = c * 0.04
    g.beginPath()
    g.roundRect(-h + c * 0.04, -h + c * 0.04, c - c * 0.08, c - c * 0.16, rad * 0.8)
    g.stroke()
  }
  // number
  const txt = label(e)
  const fs = c * (txt.length <= 2 ? 0.44 : txt.length === 3 ? 0.36 : 0.3)
  g.font = `900 ${fs}px 'Plus Jakarta Sans', system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineWidth = c * 0.06
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.strokeText(txt, 0, -c * 0.02)
  g.fillStyle = st.ink
  g.fillText(txt, 0, -c * 0.04)
}

export function drawBomb(g: G, c: number, t: number) {
  const r = c * 0.38
  g.fillStyle = '#0f172a'
  g.beginPath()
  g.roundRect(-c / 2, -c / 2, c, c * 0.94, c * 0.2)
  g.fill()
  const gr = g.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r * 1.2)
  gr.addColorStop(0, '#94a3b8')
  gr.addColorStop(0.5, '#334155')
  gr.addColorStop(1, '#020617')
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, c * 0.04, r, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#d97706'
  g.lineWidth = c * 0.05
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(r * 0.4, -r * 0.7)
  g.quadraticCurveTo(r * 0.9, -r * 1.3, r * 1.1, -r * 1.05)
  g.stroke()
  const f = 0.7 + Math.sin(t * 30) * 0.3
  g.fillStyle = '#fde047'
  g.beginPath()
  g.arc(r * 1.1, -r * 1.05, c * 0.08 * f, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.beginPath()
  g.ellipse(-r * 0.35, -r * 0.3, r * 0.25, r * 0.14, -0.7, 0, Math.PI * 2)
  g.fill()
}

export function drawWild(g: G, c: number, t: number) {
  const cols = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7']
  g.save()
  g.beginPath()
  g.roundRect(-c / 2, -c / 2, c, c * 0.94, c * 0.2)
  g.clip()
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i]
    g.beginPath()
    g.moveTo(0, 0)
    g.arc(0, 0, c, t * 1.5 + (i / 6) * Math.PI * 2, t * 1.5 + ((i + 1) / 6) * Math.PI * 2)
    g.fill()
  }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, c * 0.6)
  gr.addColorStop(0, 'rgba(255,255,255,0.95)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(-c, -c, c * 2, c * 2)
  g.restore()
  g.save()
  g.rotate(Math.sin(t * 3) * 0.2)
  emblem(g, 'star', c * 0.28, '#ffffff')
  g.restore()
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = c * 0.04
  g.beginPath()
  g.roundRect(-c / 2 + 2, -c / 2 + 2, c - 4, c * 0.94 - 4, c * 0.18)
  g.stroke()
}
