/** Gem-orb tile art for Chain Link. Tier e = exponent (value 2^e). */

type Cut = 'pearl' | 'oval' | 'tri' | 'square' | 'penta' | 'hexa' | 'star' | 'heart' | 'octa' | 'crown' | 'diamond' | 'sun' | 'nova'
type Style = { name: string; hi: string; mid: string; lo: string; ink: string; cut: Cut }

const STYLES: Style[] = [
  { name: 'Pearl', hi: '#f8fafc', mid: '#cbd5e1', lo: '#64748b', ink: '#1e293b', cut: 'pearl' },
  { name: 'Quartz', hi: '#fce7f3', mid: '#f9a8d4', lo: '#be185d', ink: '#ffffff', cut: 'oval' },
  { name: 'Citrine', hi: '#fef9c3', mid: '#fde047', lo: '#ca8a04', ink: '#422006', cut: 'tri' },
  { name: 'Jade', hi: '#d1fae5', mid: '#34d399', lo: '#047857', ink: '#ffffff', cut: 'square' },
  { name: 'Topaz', hi: '#ffedd5', mid: '#fb923c', lo: '#c2410c', ink: '#ffffff', cut: 'penta' },
  { name: 'Ruby', hi: '#fee2e2', mid: '#ef4444', lo: '#991b1b', ink: '#ffffff', cut: 'hexa' },
  { name: 'Sapphire', hi: '#dbeafe', mid: '#3b82f6', lo: '#1e3a8a', ink: '#ffffff', cut: 'star' },
  { name: 'Amethyst', hi: '#f3e8ff', mid: '#a855f7', lo: '#581c87', ink: '#ffffff', cut: 'heart' },
  { name: 'Emerald', hi: '#dcfce7', mid: '#16a34a', lo: '#14532d', ink: '#ffffff', cut: 'octa' },
  { name: 'Gold', hi: '#fffbeb', mid: '#f59e0b', lo: '#92400e', ink: '#451a03', cut: 'crown' },
  { name: 'Diamond', hi: '#ffffff', mid: '#a5f3fc', lo: '#0e7490', ink: '#083344', cut: 'diamond' },
  { name: 'Sunstone', hi: '#fff7ed', mid: '#f97316', lo: '#7c2d12', ink: '#ffffff', cut: 'sun' },
  { name: 'Nova', hi: '#fdf4ff', mid: '#d946ef', lo: '#3b0764', ink: '#ffffff', cut: 'nova' },
  { name: 'Void', hi: '#c4b5fd', mid: '#312e81', lo: '#020617', ink: '#e0e7ff', cut: 'nova' },
]

export function styleOf(e: number) {
  return STYLES[Math.max(0, Math.min(STYLES.length - 1, e - 1))]
}

export function label(e: number) {
  const v = Math.pow(2, e)
  if (v >= 1048576) return `${Math.round(v / 1048576)}M`
  if (v >= 1024) return `${Math.round(v / 1024)}K`
  return String(v)
}

export function tierName(e: number) {
  return `${label(e)} ${styleOf(e).name}`
}

type G = CanvasRenderingContext2D

function poly(g: G, n: number, r: number, rot = -Math.PI / 2) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
}

function cutPath(g: G, cut: Cut, r: number) {
  g.beginPath()
  switch (cut) {
    case 'pearl':
      g.arc(0, 0, r * 0.9, 0, Math.PI * 2)
      break
    case 'oval':
      g.ellipse(0, 0, r * 0.7, r * 0.95, 0, 0, Math.PI * 2)
      break
    case 'tri':
      poly(g, 3, r * 1.05)
      break
    case 'square':
      poly(g, 4, r, -Math.PI / 4)
      break
    case 'penta':
      poly(g, 5, r)
      break
    case 'hexa':
      poly(g, 6, r, 0)
      break
    case 'star':
    case 'nova': {
      const n = cut === 'star' ? 5 : 8
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / n
        const rr = i % 2 ? r * (cut === 'star' ? 0.55 : 0.68) : r
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      break
    }
    case 'heart':
      g.moveTo(0, r * 0.9)
      g.bezierCurveTo(-r * 1.3, 0, -r * 0.65, -r * 1.05, 0, -r * 0.4)
      g.bezierCurveTo(r * 0.65, -r * 1.05, r * 1.3, 0, 0, r * 0.9)
      g.closePath()
      break
    case 'octa':
      poly(g, 8, r, Math.PI / 8)
      break
    case 'crown':
      g.moveTo(-r * 0.9, r * 0.6)
      g.lineTo(-r * 0.95, -r * 0.55)
      g.lineTo(-r * 0.45, -r * 0.05)
      g.lineTo(0, -r * 0.85)
      g.lineTo(r * 0.45, -r * 0.05)
      g.lineTo(r * 0.95, -r * 0.55)
      g.lineTo(r * 0.9, r * 0.6)
      g.closePath()
      break
    case 'diamond':
      g.moveTo(-r * 0.95, -r * 0.3)
      g.lineTo(-r * 0.5, -r * 0.85)
      g.lineTo(r * 0.5, -r * 0.85)
      g.lineTo(r * 0.95, -r * 0.3)
      g.lineTo(0, r * 0.95)
      g.closePath()
      break
    case 'sun':
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12
        const rr = i % 2 ? r * 0.78 : r
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      break
  }
}

/** Orb tile of diameter `d`, centered. */
export function drawTile(g: G, e: number, d: number) {
  const st = styleOf(e)
  const r = d / 2
  // drop shadow
  g.fillStyle = 'rgba(15,5,40,0.35)'
  g.beginPath()
  g.ellipse(0, r * 0.12, r * 0.95, r * 0.92, 0, 0, Math.PI * 2)
  g.fill()
  // orb
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r)
  gr.addColorStop(0, st.hi)
  gr.addColorStop(0.55, st.mid)
  gr.addColorStop(1, st.lo)
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, 0, r * 0.92, 0, Math.PI * 2)
  g.fill()
  // cut facet shape
  g.save()
  g.globalAlpha = 0.5
  cutPath(g, st.cut, r * 0.66)
  const fg = g.createLinearGradient(0, -r * 0.6, 0, r * 0.6)
  fg.addColorStop(0, 'rgba(255,255,255,0.65)')
  fg.addColorStop(1, 'rgba(255,255,255,0.05)')
  g.fillStyle = fg
  g.fill()
  g.globalAlpha = 0.7
  g.strokeStyle = st.hi
  g.lineWidth = Math.max(1, d * 0.025)
  g.stroke()
  g.restore()
  // rim
  g.strokeStyle = st.lo
  g.lineWidth = Math.max(1.2, d * 0.04)
  g.beginPath()
  g.arc(0, 0, r * 0.92, 0, Math.PI * 2)
  g.stroke()
  if (e >= 10) {
    g.strokeStyle = 'rgba(255,255,255,0.75)'
    g.lineWidth = Math.max(1, d * 0.025)
    g.beginPath()
    g.arc(0, 0, r * 0.82, 0, Math.PI * 2)
    g.stroke()
  }
  // shine
  g.fillStyle = 'rgba(255,255,255,0.6)'
  g.beginPath()
  g.ellipse(-r * 0.38, -r * 0.48, r * 0.24, r * 0.12, -0.6, 0, Math.PI * 2)
  g.fill()
  // number
  const txt = label(e)
  const fs = d * (txt.length <= 2 ? 0.38 : txt.length === 3 ? 0.3 : 0.26)
  g.font = `900 ${fs}px 'Plus Jakarta Sans', system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineWidth = d * 0.05
  g.strokeStyle = 'rgba(0,0,0,0.3)'
  g.strokeText(txt, 0, r * 0.04)
  g.fillStyle = st.ink
  g.fillText(txt, 0, r * 0.02)
}

export function drawStone(g: G, d: number, cracked: number) {
  const r = d / 2
  g.fillStyle = 'rgba(15,5,40,0.35)'
  g.beginPath()
  g.ellipse(0, r * 0.12, r * 0.92, r * 0.88, 0, 0, Math.PI * 2)
  g.fill()
  const gr = g.createLinearGradient(0, -r, 0, r)
  gr.addColorStop(0, '#a8a29e')
  gr.addColorStop(1, '#44403c')
  g.fillStyle = gr
  g.beginPath()
  const pts = [[-0.85, -0.3], [-0.45, -0.85], [0.3, -0.88], [0.88, -0.35], [0.82, 0.45], [0.3, 0.85], [-0.5, 0.82], [-0.9, 0.3]]
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)))
  g.closePath()
  g.fill()
  g.strokeStyle = '#292524'
  g.lineWidth = Math.max(1.2, d * 0.04)
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.22)'
  g.beginPath()
  g.moveTo(-r * 0.6, -r * 0.35)
  g.lineTo(-r * 0.3, -r * 0.7)
  g.lineTo(r * 0.2, -r * 0.72)
  g.lineTo(-r * 0.2, -r * 0.4)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(28,25,23,0.75)'
  g.lineWidth = Math.max(1, d * 0.03)
  g.beginPath()
  g.moveTo(r * 0.1, -r * 0.2)
  g.lineTo(r * 0.35, r * 0.1)
  g.lineTo(r * 0.2, r * 0.45)
  if (cracked > 0) {
    g.moveTo(r * 0.35, r * 0.1)
    g.lineTo(r * 0.7, r * 0.05)
    g.moveTo(r * 0.1, -r * 0.2)
    g.lineTo(-r * 0.4, r * 0.1)
  }
  g.stroke()
}

export function drawWild(g: G, d: number, t: number) {
  const r = d / 2
  const cols = ['#f43f5e', '#f59e0b', '#facc15', '#22c55e', '#3b82f6', '#a855f7']
  g.save()
  g.beginPath()
  g.arc(0, 0, r * 0.92, 0, Math.PI * 2)
  g.clip()
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i]
    g.beginPath()
    g.moveTo(0, 0)
    g.arc(0, 0, r, t * 1.6 + (i / 6) * Math.PI * 2, t * 1.6 + ((i + 1) / 6) * Math.PI * 2)
    g.fill()
  }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r)
  gr.addColorStop(0, 'rgba(255,255,255,0.95)')
  gr.addColorStop(0.5, 'rgba(255,255,255,0.4)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(-r, -r, d, d)
  g.restore()
  g.fillStyle = '#ffffff'
  cutPath(g, 'star', r * 0.5 * (0.9 + Math.sin(t * 5) * 0.1))
  g.fill()
  g.strokeStyle = '#ffffff'
  g.lineWidth = Math.max(1.2, d * 0.04)
  g.beginPath()
  g.arc(0, 0, r * 0.92, 0, Math.PI * 2)
  g.stroke()
}
