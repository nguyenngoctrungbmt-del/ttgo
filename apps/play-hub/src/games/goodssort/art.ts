/** Vector goods for Goods Sort. Each good is drawn in a box of size s, centred at x=0, standing on y=s/2. */

type G = CanvasRenderingContext2D

export const GOODS = [
  'jam', 'soda', 'milk', 'donut', 'bear', 'lipstick', 'chips', 'juice', 'duck',
  'perfume', 'cupcake', 'melon', 'cone', 'lime', 'ball', 'honey', 'cheese', 'robot',
] as const
export type GoodName = (typeof GOODS)[number]

/** Accent colour per good, used for particles. */
export const GOOD_COLOR = [
  '#ef4444', '#3b82f6', '#e0f2fe', '#f472b6', '#b45309', '#e11d48', '#facc15', '#fb923c', '#fde047',
  '#a855f7', '#f9a8d4', '#22c55e', '#5eead4', '#84cc16', '#f43f5e', '#f59e0b', '#fcd34d', '#94a3b8',
]

function lin(g: G, y0: number, y1: number, stops: string[]) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c))
  return gr
}

function hlin(g: G, x0: number, x1: number, stops: string[]) {
  const gr = g.createLinearGradient(x0, 0, x1, 0)
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c))
  return gr
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

function shine(g: G, x: number, y: number, w: number, h: number, a = 0.5) {
  g.fillStyle = `rgba(255,255,255,${a})`
  rr(g, x, y, w, h, Math.min(w, h) / 2)
  g.fill()
}

function outline(g: G, c = 'rgba(30,20,40,0.55)', w = 1.4) {
  g.strokeStyle = c
  g.lineWidth = w
  g.stroke()
}

function eye(g: G, x: number, y: number, r: number) {
  g.fillStyle = '#1f2937'
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.35, r * 0.38, 0, Math.PI * 2)
  g.fill()
}

export function drawGood(g: G, type: number, s: number) {
  const b = s / 2 // bottom
  const lw = Math.max(1, s * 0.035)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  // soft contact shadow
  g.fillStyle = 'rgba(0,0,0,0.22)'
  g.beginPath()
  g.ellipse(0, b - s * 0.01, s * 0.3, s * 0.05, 0, 0, Math.PI * 2)
  g.fill()
  switch (GOODS[type]) {
    case 'jam': {
      const w = s * 0.56
      rr(g, -w / 2, -s * 0.18, w, s * 0.68, s * 0.1)
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#7f1d1d', '#dc2626', '#f87171', '#b91c1c'])
      g.fill()
      outline(g, '#450a0a', lw)
      // label
      rr(g, -w * 0.42, s * 0.02, w * 0.84, s * 0.26, s * 0.05)
      g.fillStyle = '#fef3c7'
      g.fill()
      g.fillStyle = '#dc2626'
      g.beginPath()
      g.arc(-s * 0.04, s * 0.15, s * 0.06, 0, Math.PI * 2)
      g.arc(s * 0.05, s * 0.15, s * 0.06, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#16a34a'
      g.beginPath()
      g.ellipse(0, s * 0.07, s * 0.05, s * 0.025, 0, 0, Math.PI * 2)
      g.fill()
      // gingham lid
      rr(g, -w * 0.58, -s * 0.34, w * 1.16, s * 0.18, s * 0.05)
      g.fillStyle = '#fff'
      g.fill()
      g.save()
      g.clip()
      g.fillStyle = 'rgba(220,38,38,0.85)'
      for (let i = -4; i < 5; i += 2) g.fillRect(i * s * 0.06, -s * 0.36, s * 0.06, s * 0.22)
      g.fillStyle = 'rgba(220,38,38,0.45)'
      g.fillRect(-s * 0.4, -s * 0.29, s * 0.8, s * 0.06)
      g.restore()
      rr(g, -w * 0.58, -s * 0.34, w * 1.16, s * 0.18, s * 0.05)
      outline(g, '#7f1d1d', lw)
      shine(g, -w * 0.36, -s * 0.12, s * 0.07, s * 0.28, 0.45)
      break
    }
    case 'soda': {
      const w = s * 0.48
      rr(g, -w / 2, -s * 0.36, w, s * 0.86, s * 0.08)
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#1e3a8a', '#2563eb', '#93c5fd', '#1d4ed8'])
      g.fill()
      outline(g, '#172554', lw)
      g.fillStyle = '#f8fafc'
      g.beginPath()
      g.moveTo(-w / 2, s * 0.08)
      g.bezierCurveTo(-w * 0.2, -s * 0.06, w * 0.15, s * 0.22, w / 2, s * 0.02)
      g.lineTo(w / 2, s * 0.14)
      g.bezierCurveTo(w * 0.15, s * 0.32, -w * 0.2, s * 0.06, -w / 2, s * 0.2)
      g.closePath()
      g.fill()
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#94a3b8', '#f1f5f9', '#64748b'])
      rr(g, -w * 0.46, -s * 0.42, w * 0.92, s * 0.08, s * 0.03)
      g.fill()
      rr(g, -w * 0.46, s * 0.44, w * 0.92, s * 0.06, s * 0.03)
      g.fill()
      shine(g, -w * 0.3, -s * 0.28, s * 0.06, s * 0.5, 0.5)
      break
    }
    case 'milk': {
      const w = s * 0.5
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#cbd5e1', '#ffffff', '#e2e8f0'])
      g.beginPath()
      g.moveTo(-w / 2, b)
      g.lineTo(-w / 2, -s * 0.2)
      g.lineTo(-w * 0.25, -s * 0.38)
      g.lineTo(w * 0.25, -s * 0.38)
      g.lineTo(w / 2, -s * 0.2)
      g.lineTo(w / 2, b)
      g.closePath()
      g.fill()
      outline(g, '#334155', lw)
      g.fillStyle = '#e2e8f0'
      g.fillRect(-w * 0.3, -s * 0.46, w * 0.6, s * 0.1)
      g.strokeRect(-w * 0.3, -s * 0.46, w * 0.6, s * 0.1)
      g.fillStyle = '#2563eb'
      rr(g, -w / 2 + lw, s * 0.08, w - lw * 2, s * 0.22, 2)
      g.fill()
      g.fillStyle = '#fff'
      g.beginPath()
      g.ellipse(0, s * 0.19, s * 0.09, s * 0.06, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#1e293b'
      g.beginPath()
      g.ellipse(-s * 0.03, s * 0.18, s * 0.025, s * 0.02, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.ellipse(s * 0.04, s * 0.2, s * 0.02, s * 0.015, 0, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'donut': {
      const cy = s * 0.18
      const r = s * 0.3
      g.fillStyle = lin(g, cy - r, cy + r, ['#fcd34d', '#d97706', '#92400e'])
      g.beginPath()
      g.arc(0, cy, r, 0, Math.PI * 2)
      g.fill()
      outline(g, '#78350f', lw)
      g.fillStyle = lin(g, cy - r, cy + r, ['#fbcfe8', '#f472b6', '#db2777'])
      g.beginPath()
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 2
        const rr2 = r * (0.86 + Math.sin(i * 2.7) * 0.06)
        g.lineTo(Math.cos(a) * rr2, cy + Math.sin(a) * rr2)
      }
      g.fill()
      g.fillStyle = '#7c2d12'
      g.beginPath()
      g.arc(0, cy, r * 0.32, 0, Math.PI * 2)
      g.fill()
      const cols = ['#fde047', '#60a5fa', '#fff', '#4ade80']
      g.lineWidth = s * 0.03
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63 + 0.2
        const d = r * (0.55 + (i % 3) * 0.1)
        g.strokeStyle = cols[i % 4]
        g.beginPath()
        g.moveTo(Math.cos(a) * d, cy + Math.sin(a) * d)
        g.lineTo(Math.cos(a) * d + Math.cos(i) * s * 0.045, cy + Math.sin(a) * d + Math.sin(i) * s * 0.045)
        g.stroke()
      }
      shine(g, -r * 0.7, cy - r * 0.6, s * 0.12, s * 0.05, 0.5)
      break
    }
    case 'bear': {
      const body = lin(g, -s * 0.4, b, ['#d97706', '#b45309', '#78350f'])
      g.fillStyle = body
      for (const sx of [-1, 1]) {
        g.beginPath()
        g.arc(sx * s * 0.17, -s * 0.33, s * 0.08, 0, Math.PI * 2)
        g.fill()
      }
      g.beginPath()
      g.ellipse(0, s * 0.24, s * 0.22, s * 0.25, 0, 0, Math.PI * 2)
      g.fill()
      outline(g, '#451a03', lw)
      g.beginPath()
      g.arc(0, -s * 0.16, s * 0.2, 0, Math.PI * 2)
      g.fill()
      outline(g, '#451a03', lw)
      g.fillStyle = '#fcd9a8'
      g.beginPath()
      g.ellipse(0, s * 0.27, s * 0.12, s * 0.14, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.ellipse(0, -s * 0.1, s * 0.09, s * 0.07, 0, 0, Math.PI * 2)
      g.fill()
      eye(g, -s * 0.08, -s * 0.2, s * 0.03)
      eye(g, s * 0.08, -s * 0.2, s * 0.03)
      g.fillStyle = '#1f2937'
      g.beginPath()
      g.ellipse(0, -s * 0.12, s * 0.035, s * 0.025, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.moveTo(0, -s * 0.0)
      g.lineTo(-s * 0.1, -s * 0.05)
      g.lineTo(-s * 0.1, s * 0.05)
      g.closePath()
      g.moveTo(0, 0)
      g.lineTo(s * 0.1, -s * 0.05)
      g.lineTo(s * 0.1, s * 0.05)
      g.closePath()
      g.fill()
      break
    }
    case 'lipstick': {
      const w = s * 0.3
      g.fillStyle = lin(g, -s * 0.4, -s * 0.05, ['#fb7185', '#e11d48', '#9f1239'])
      g.beginPath()
      g.moveTo(-w * 0.38, -s * 0.05)
      g.lineTo(-w * 0.38, -s * 0.28)
      g.lineTo(w * 0.38, -s * 0.44)
      g.lineTo(w * 0.38, -s * 0.05)
      g.closePath()
      g.fill()
      outline(g, '#881337', lw)
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#a16207', '#fde68a', '#ca8a04'])
      rr(g, -w / 2, -s * 0.08, w, s * 0.2, s * 0.02)
      g.fill()
      outline(g, '#713f12', lw)
      g.fillStyle = hlin(g, -w * 0.6, w * 0.6, ['#1f2937', '#6b7280', '#111827'])
      rr(g, -w * 0.6, s * 0.12, w * 1.2, s * 0.38, s * 0.04)
      g.fill()
      outline(g, '#030712', lw)
      g.fillStyle = '#fde68a'
      g.fillRect(-w * 0.6, s * 0.2, w * 1.2, s * 0.03)
      shine(g, -w * 0.45, s * 0.15, s * 0.04, s * 0.3, 0.35)
      break
    }
    case 'chips': {
      const w = s * 0.6
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#ca8a04', '#facc15', '#fef08a', '#eab308'])
      g.beginPath()
      g.moveTo(-w / 2, -s * 0.38)
      for (let i = 0; i <= 6; i++) g.lineTo(-w / 2 + (w * i) / 6, -s * 0.38 + (i % 2 ? -s * 0.04 : 0))
      g.quadraticCurveTo(w * 0.58, 0, w / 2, s * 0.44)
      for (let i = 6; i >= 0; i--) g.lineTo(-w / 2 + (w * i) / 6, s * 0.44 + (i % 2 ? s * 0.04 : 0))
      g.quadraticCurveTo(-w * 0.58, 0, -w / 2, -s * 0.38)
      g.fill()
      outline(g, '#854d0e', lw)
      g.fillStyle = '#dc2626'
      g.beginPath()
      g.ellipse(0, -s * 0.06, w * 0.36, s * 0.12, -0.15, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fef3c7'
      g.beginPath()
      g.ellipse(-s * 0.04, s * 0.2, s * 0.1, s * 0.07, 0.3, 0, Math.PI * 2)
      g.ellipse(s * 0.08, s * 0.24, s * 0.09, s * 0.06, -0.4, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fff'
      g.fillRect(-w * 0.24, -s * 0.08, w * 0.48, s * 0.04)
      shine(g, -w * 0.38, -s * 0.3, s * 0.05, s * 0.5, 0.35)
      break
    }
    case 'juice': {
      const w = s * 0.42
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#c2410c', '#fb923c', '#fed7aa', '#ea580c'])
      g.beginPath()
      g.moveTo(-w / 2, b)
      g.lineTo(-w / 2, -s * 0.1)
      g.quadraticCurveTo(-w / 2, -s * 0.26, -w * 0.22, -s * 0.3)
      g.lineTo(-w * 0.22, -s * 0.38)
      g.lineTo(w * 0.22, -s * 0.38)
      g.lineTo(w * 0.22, -s * 0.3)
      g.quadraticCurveTo(w / 2, -s * 0.26, w / 2, -s * 0.1)
      g.lineTo(w / 2, b)
      g.closePath()
      g.fill()
      outline(g, '#7c2d12', lw)
      g.fillStyle = '#16a34a'
      rr(g, -w * 0.28, -s * 0.48, w * 0.56, s * 0.12, s * 0.03)
      g.fill()
      outline(g, '#14532d', lw)
      g.fillStyle = '#fff7ed'
      rr(g, -w / 2 + lw, s * 0.02, w - lw * 2, s * 0.26, 2)
      g.fill()
      g.fillStyle = '#f97316'
      g.beginPath()
      g.arc(0, s * 0.15, s * 0.08, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#fed7aa'
      g.lineWidth = lw * 0.8
      for (let i = 0; i < 6; i++) {
        g.beginPath()
        g.moveTo(0, s * 0.15)
        g.lineTo(Math.cos(i) * s * 0.07, s * 0.15 + Math.sin(i) * s * 0.07)
        g.stroke()
      }
      shine(g, -w * 0.36, -s * 0.12, s * 0.05, s * 0.3, 0.45)
      break
    }
    case 'duck': {
      g.fillStyle = lin(g, -s * 0.4, b, ['#fef08a', '#facc15', '#ca8a04'])
      g.beginPath()
      g.ellipse(s * 0.02, s * 0.24, s * 0.3, s * 0.22, 0, 0, Math.PI * 2)
      g.fill()
      outline(g, '#a16207', lw)
      g.beginPath()
      g.moveTo(s * 0.26, s * 0.1)
      g.quadraticCurveTo(s * 0.42, -s * 0.02, s * 0.36, s * 0.22)
      g.fill()
      g.beginPath()
      g.arc(-s * 0.08, -s * 0.12, s * 0.18, 0, Math.PI * 2)
      g.fill()
      outline(g, '#a16207', lw)
      g.fillStyle = '#f97316'
      g.beginPath()
      g.moveTo(-s * 0.22, -s * 0.12)
      g.quadraticCurveTo(-s * 0.4, -s * 0.12, -s * 0.38, -s * 0.04)
      g.quadraticCurveTo(-s * 0.3, -s * 0.02, -s * 0.2, -s * 0.06)
      g.fill()
      eye(g, -s * 0.12, -s * 0.17, s * 0.032)
      g.fillStyle = 'rgba(234,179,8,0.9)'
      g.beginPath()
      g.ellipse(s * 0.08, s * 0.2, s * 0.13, s * 0.08, -0.3, 0, Math.PI * 2)
      g.fill()
      shine(g, -s * 0.14, -s * 0.28, s * 0.1, s * 0.05, 0.6)
      break
    }
    case 'perfume': {
      const w = s * 0.5
      g.fillStyle = lin(g, -s * 0.15, b, ['#e9d5ff', '#a855f7', '#6b21a8'])
      g.beginPath()
      g.moveTo(-w / 2, s * 0.05)
      g.lineTo(-w * 0.3, -s * 0.15)
      g.lineTo(w * 0.3, -s * 0.15)
      g.lineTo(w / 2, s * 0.05)
      g.lineTo(w * 0.42, b)
      g.lineTo(-w * 0.42, b)
      g.closePath()
      g.fill()
      outline(g, '#581c87', lw)
      g.fillStyle = 'rgba(255,255,255,0.25)'
      g.beginPath()
      g.moveTo(-w * 0.3, -s * 0.15)
      g.lineTo(-w * 0.1, s * 0.05)
      g.lineTo(-w * 0.2, b)
      g.lineTo(-w * 0.42, b)
      g.lineTo(-w / 2, s * 0.05)
      g.closePath()
      g.fill()
      g.fillStyle = hlin(g, -w * 0.2, w * 0.2, ['#a16207', '#fde68a', '#ca8a04'])
      rr(g, -w * 0.16, -s * 0.26, w * 0.32, s * 0.12, s * 0.02)
      g.fill()
      g.beginPath()
      g.arc(0, -s * 0.33, s * 0.08, 0, Math.PI * 2)
      g.fill()
      outline(g, '#713f12', lw)
      g.fillStyle = '#fdf4ff'
      rr(g, -w * 0.22, s * 0.16, w * 0.44, s * 0.14, 2)
      g.fill()
      break
    }
    case 'cupcake': {
      g.fillStyle = hlin(g, -s * 0.24, s * 0.24, ['#0e7490', '#22d3ee', '#0891b2'])
      g.beginPath()
      g.moveTo(-s * 0.27, s * 0.06)
      g.lineTo(s * 0.27, s * 0.06)
      g.lineTo(s * 0.2, b)
      g.lineTo(-s * 0.2, b)
      g.closePath()
      g.fill()
      outline(g, '#164e63', lw)
      g.strokeStyle = 'rgba(255,255,255,0.4)'
      g.lineWidth = lw
      for (let i = -2; i <= 2; i++) {
        g.beginPath()
        g.moveTo(i * s * 0.1, s * 0.08)
        g.lineTo(i * s * 0.075, b - 2)
        g.stroke()
      }
      g.fillStyle = lin(g, -s * 0.3, s * 0.1, ['#fdf2f8', '#f9a8d4', '#ec4899'])
      g.beginPath()
      g.moveTo(-s * 0.3, s * 0.08)
      g.quadraticCurveTo(-s * 0.36, -s * 0.1, -s * 0.16, -s * 0.12)
      g.quadraticCurveTo(-s * 0.12, -s * 0.3, s * 0.04, -s * 0.24)
      g.quadraticCurveTo(s * 0.22, -s * 0.24, s * 0.2, -s * 0.08)
      g.quadraticCurveTo(s * 0.38, -s * 0.06, s * 0.3, s * 0.08)
      g.closePath()
      g.fill()
      outline(g, '#9d174d', lw)
      g.fillStyle = '#dc2626'
      g.beginPath()
      g.arc(0, -s * 0.3, s * 0.08, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#166534'
      g.lineWidth = lw
      g.beginPath()
      g.moveTo(0, -s * 0.37)
      g.quadraticCurveTo(s * 0.04, -s * 0.46, s * 0.1, -s * 0.46)
      g.stroke()
      shine(g, -s * 0.04, -s * 0.34, s * 0.04, s * 0.04, 0.7)
      shine(g, -s * 0.2, -s * 0.08, s * 0.12, s * 0.04, 0.5)
      break
    }
    case 'melon': {
      g.fillStyle = '#15803d'
      g.beginPath()
      g.moveTo(-s * 0.38, -s * 0.05)
      g.arc(0, -s * 0.05, s * 0.38, 0, Math.PI)
      g.closePath()
      g.translate(0, s * 0.18)
      g.fill()
      g.fillStyle = '#bbf7d0'
      g.beginPath()
      g.moveTo(-s * 0.33, -s * 0.05)
      g.arc(0, -s * 0.05, s * 0.33, 0, Math.PI)
      g.closePath()
      g.fill()
      g.fillStyle = lin(g, -s * 0.05, s * 0.25, ['#fb7185', '#ef4444', '#be123c'])
      g.beginPath()
      g.moveTo(-s * 0.3, -s * 0.05)
      g.arc(0, -s * 0.05, s * 0.3, 0, Math.PI)
      g.closePath()
      g.fill()
      g.fillStyle = '#1f2937'
      for (const [x, y] of [[-0.15, 0.02], [0, 0.1], [0.15, 0.02], [-0.07, 0.17], [0.08, 0.17]]) {
        g.beginPath()
        g.ellipse(x * s, y * s, s * 0.02, s * 0.035, x * 3, 0, Math.PI * 2)
        g.fill()
      }
      g.beginPath()
      g.moveTo(-s * 0.38, -s * 0.05)
      g.arc(0, -s * 0.05, s * 0.38, 0, Math.PI)
      g.closePath()
      outline(g, '#14532d', lw)
      shine(g, -s * 0.24, -s * 0.03, s * 0.2, s * 0.04, 0.4)
      g.translate(0, -s * 0.18)
      break
    }
    case 'cone': {
      g.fillStyle = lin(g, 0, b, ['#fbbf24', '#d97706'])
      g.beginPath()
      g.moveTo(-s * 0.2, -s * 0.02)
      g.lineTo(s * 0.2, -s * 0.02)
      g.lineTo(0, b)
      g.closePath()
      g.fill()
      outline(g, '#92400e', lw)
      g.save()
      g.clip()
      g.strokeStyle = '#b45309'
      g.lineWidth = lw
      for (let i = -3; i <= 3; i++) {
        g.beginPath()
        g.moveTo(i * s * 0.09 - s * 0.2, -s * 0.02)
        g.lineTo(i * s * 0.09 + s * 0.2, b)
        g.moveTo(i * s * 0.09 + s * 0.2, -s * 0.02)
        g.lineTo(i * s * 0.09 - s * 0.2, b)
        g.stroke()
      }
      g.restore()
      g.fillStyle = lin(g, -s * 0.42, 0, ['#ccfbf1', '#5eead4', '#14b8a6'])
      g.beginPath()
      g.arc(0, -s * 0.16, s * 0.2, Math.PI * 0.95, Math.PI * 2.05)
      for (let i = 0; i <= 5; i++) g.lineTo(s * 0.21 - (i * s * 0.42) / 5, -s * 0.02 + (i % 2 ? s * 0.05 : 0))
      g.closePath()
      g.fill()
      outline(g, '#0f766e', lw)
      g.fillStyle = '#7c2d12'
      for (const [x, y] of [[-0.08, -0.22], [0.07, -0.14], [0.02, -0.27]]) {
        g.beginPath()
        g.ellipse(x * s, y * s, s * 0.02, s * 0.012, x * 8, 0, Math.PI * 2)
        g.fill()
      }
      shine(g, -s * 0.12, -s * 0.28, s * 0.08, s * 0.05, 0.6)
      break
    }
    case 'lime': {
      const w = s * 0.32
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#365314', '#84cc16', '#d9f99d', '#4d7c0f'])
      g.beginPath()
      g.moveTo(-w / 2, b)
      g.lineTo(-w / 2, -s * 0.02)
      g.quadraticCurveTo(-w / 2, -s * 0.16, -w * 0.2, -s * 0.24)
      g.lineTo(-w * 0.2, -s * 0.4)
      g.lineTo(w * 0.2, -s * 0.4)
      g.lineTo(w * 0.2, -s * 0.24)
      g.quadraticCurveTo(w / 2, -s * 0.16, w / 2, -s * 0.02)
      g.lineTo(w / 2, b)
      g.closePath()
      g.fill()
      outline(g, '#1a2e05', lw)
      g.fillStyle = '#facc15'
      rr(g, -w * 0.26, -s * 0.48, w * 0.52, s * 0.09, s * 0.02)
      g.fill()
      g.fillStyle = '#f7fee7'
      rr(g, -w / 2 + lw, s * 0.08, w - lw * 2, s * 0.2, 2)
      g.fill()
      g.fillStyle = '#65a30d'
      g.beginPath()
      g.moveTo(-w * 0.25, s * 0.18)
      g.lineTo(0, s * 0.1)
      g.lineTo(w * 0.25, s * 0.18)
      g.lineTo(0, s * 0.26)
      g.closePath()
      g.fill()
      shine(g, -w * 0.32, -s * 0.15, s * 0.04, s * 0.5, 0.5)
      break
    }
    case 'ball': {
      const cy = s * 0.15
      const r = s * 0.33
      const cols = ['#ef4444', '#facc15', '#3b82f6', '#ffffff', '#22c55e', '#ffffff']
      for (let i = 0; i < 6; i++) {
        g.fillStyle = cols[i]
        g.beginPath()
        g.moveTo(0, cy)
        g.arc(0, cy, r, (i / 6) * Math.PI * 2 - 0.5, ((i + 1) / 6) * Math.PI * 2 - 0.5)
        g.closePath()
        g.fill()
      }
      const sh = g.createRadialGradient(-r * 0.35, cy - r * 0.4, r * 0.1, 0, cy, r)
      sh.addColorStop(0, 'rgba(255,255,255,0.5)')
      sh.addColorStop(0.6, 'rgba(255,255,255,0)')
      sh.addColorStop(1, 'rgba(0,0,0,0.3)')
      g.fillStyle = sh
      g.beginPath()
      g.arc(0, cy, r, 0, Math.PI * 2)
      g.fill()
      outline(g, '#334155', lw)
      g.fillStyle = '#fff'
      g.beginPath()
      g.arc(0, cy, r * 0.15, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'honey': {
      const w = s * 0.58
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#92400e', '#f59e0b', '#fde68a', '#d97706'])
      g.beginPath()
      g.moveTo(-w * 0.4, -s * 0.18)
      g.quadraticCurveTo(-w * 0.6, s * 0.15, -w * 0.42, b)
      g.lineTo(w * 0.42, b)
      g.quadraticCurveTo(w * 0.6, s * 0.15, w * 0.4, -s * 0.18)
      g.closePath()
      g.fill()
      outline(g, '#78350f', lw)
      g.fillStyle = '#fef3c7'
      g.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        g.lineTo(Math.cos(a) * s * 0.12, s * 0.17 + Math.sin(a) * s * 0.12)
      }
      g.closePath()
      g.fill()
      g.fillStyle = '#f59e0b'
      g.beginPath()
      g.ellipse(0, s * 0.17, s * 0.05, s * 0.035, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = hlin(g, -w / 2, w / 2, ['#713f12', '#a16207', '#713f12'])
      rr(g, -w * 0.46, -s * 0.3, w * 0.92, s * 0.13, s * 0.04)
      g.fill()
      outline(g, '#451a03', lw)
      // dripping honey
      g.fillStyle = '#f59e0b'
      g.beginPath()
      g.moveTo(-w * 0.4, -s * 0.18)
      g.lineTo(w * 0.1, -s * 0.18)
      g.quadraticCurveTo(-w * 0.05, -s * 0.05, -w * 0.12, -s * 0.06)
      g.quadraticCurveTo(-w * 0.2, s * 0.02, -w * 0.25, -s * 0.08)
      g.quadraticCurveTo(-w * 0.35, -s * 0.12, -w * 0.4, -s * 0.18)
      g.fill()
      shine(g, w * 0.22, -s * 0.12, s * 0.05, s * 0.36, 0.4)
      break
    }
    case 'cheese': {
      g.fillStyle = lin(g, -s * 0.2, b, ['#fef08a', '#fcd34d', '#f59e0b'])
      g.beginPath()
      g.moveTo(-s * 0.38, b)
      g.lineTo(-s * 0.38, -s * 0.02)
      g.lineTo(s * 0.36, -s * 0.24)
      g.lineTo(s * 0.38, b)
      g.closePath()
      g.fill()
      outline(g, '#b45309', lw)
      g.fillStyle = '#fde68a'
      g.beginPath()
      g.moveTo(-s * 0.38, -s * 0.02)
      g.lineTo(s * 0.36, -s * 0.24)
      g.lineTo(s * 0.38, -s * 0.12)
      g.lineTo(-s * 0.34, s * 0.06)
      g.closePath()
      g.fill()
      g.fillStyle = '#d97706'
      for (const [x, y, r] of [[-0.2, 0.25, 0.07], [0.12, 0.12, 0.06], [0.2, 0.34, 0.05], [-0.04, 0.38, 0.04]]) {
        g.beginPath()
        g.arc(x * s, y * s, r * s, 0, Math.PI * 2)
        g.fill()
      }
      break
    }
    case 'robot': {
      g.fillStyle = hlin(g, -s * 0.24, s * 0.24, ['#64748b', '#e2e8f0', '#94a3b8'])
      rr(g, -s * 0.22, s * 0.04, s * 0.44, s * 0.36, s * 0.06)
      g.fill()
      outline(g, '#1e293b', lw)
      g.fillStyle = '#334155'
      g.fillRect(-s * 0.16, s * 0.4, s * 0.1, s * 0.1)
      g.fillRect(s * 0.06, s * 0.4, s * 0.1, s * 0.1)
      g.fillStyle = hlin(g, -s * 0.24, s * 0.24, ['#64748b', '#f1f5f9', '#94a3b8'])
      rr(g, -s * 0.24, -s * 0.32, s * 0.48, s * 0.32, s * 0.08)
      g.fill()
      outline(g, '#1e293b', lw)
      g.fillStyle = '#0f172a'
      rr(g, -s * 0.18, -s * 0.26, s * 0.36, s * 0.18, s * 0.05)
      g.fill()
      g.fillStyle = '#22d3ee'
      g.beginPath()
      g.arc(-s * 0.08, -s * 0.17, s * 0.035, 0, Math.PI * 2)
      g.arc(s * 0.08, -s * 0.17, s * 0.035, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#334155'
      g.lineWidth = lw * 1.2
      g.beginPath()
      g.moveTo(0, -s * 0.32)
      g.lineTo(0, -s * 0.42)
      g.stroke()
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.arc(0, -s * 0.44, s * 0.04, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#facc15'
      g.beginPath()
      g.arc(0, s * 0.2, s * 0.06, 0, Math.PI * 2)
      g.fill()
      break
    }
  }
}

const cache = new Map<string, HTMLCanvasElement>()

/** Cached sprite of a good; `dim` darkens it for the back layer. Sprite is 1.2s square, centre = good centre. */
export function goodSprite(type: number, s: number, dim = false): HTMLCanvasElement {
  const px = Math.max(8, Math.round(s))
  const key = `${type}|${px}|${dim ? 1 : 0}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const dim2 = Math.ceil(px * 1.2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(dim2 * dpr)
  c.height = Math.ceil(dim2 * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(dim2 / 2, dim2 / 2)
  drawGood(g, type, px)
  if (dim) {
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = 'rgba(30,27,60,0.55)'
    g.fillRect(-dim2, -dim2, dim2 * 2, dim2 * 2)
  }
  cache.set(key, c)
  if (cache.size > 160) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

export function clearGoodCache() {
  cache.clear()
}
