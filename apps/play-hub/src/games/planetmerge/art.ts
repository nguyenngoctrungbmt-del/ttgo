/** Vector art for Planet Merge: cached body sprites, starfield and gravity core. */

export const BODY_NAMES = ['Dust', 'Pebble', 'Asteroid', 'Moon', 'Mars', 'Earth', 'Neptune', 'Saturn', 'Jupiter', 'Sun', 'Black Hole']
export const MAX_TIER = BODY_NAMES.length - 1
/** Radius multipliers per tier (times the base radius). */
export const RADII = [1, 1.3, 1.65, 2.0, 2.4, 2.85, 3.3, 3.8, 4.4, 5.1, 5.6]
export const TIER_COLORS = ['#d6c4a8', '#a8a29e', '#b45309', '#e5e7eb', '#f97316', '#3b82f6', '#6366f1', '#facc15', '#fb923c', '#fde047', '#a855f7']
export const NEBULA = 20
export const PULSAR = 21

type G = CanvasRenderingContext2D
const cache = new Map<string, HTMLCanvasElement>()

function rg(g: G, r: number, inner: string, outer: string, ox = -0.35, oy = -0.35) {
  const gr = g.createRadialGradient(r * ox, r * oy, r * 0.1, 0, 0, r)
  gr.addColorStop(0, inner)
  gr.addColorStop(1, outer)
  return gr
}

function disc(g: G, r: number, fill: string | CanvasGradient) {
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fillStyle = fill
  g.fill()
}

function clipDisc(g: G, r: number) {
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.clip()
}

function crater(g: G, x: number, y: number, s: number, dark: string) {
  g.fillStyle = dark
  g.beginPath()
  g.arc(x, y, s, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.beginPath()
  g.arc(x - s * 0.25, y - s * 0.25, s * 0.55, 0, Math.PI * 2)
  g.fill()
}

/** Cute face: eyes + smile, scaled to r. */
function face(g: G, r: number, mood: 'happy' | 'calm' | 'wow' = 'happy') {
  const ex = r * 0.3
  const ey = -r * 0.05
  const es = Math.max(1.5, r * 0.12)
  g.fillStyle = '#0b0f19'
  g.beginPath()
  g.ellipse(-ex, ey, es, es * 1.25, 0, 0, Math.PI * 2)
  g.ellipse(ex, ey, es, es * 1.25, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(-ex + es * 0.35, ey - es * 0.4, es * 0.42, 0, Math.PI * 2)
  g.arc(ex + es * 0.35, ey - es * 0.4, es * 0.42, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#0b0f19'
  g.lineWidth = Math.max(1, r * 0.06)
  g.lineCap = 'round'
  g.beginPath()
  if (mood === 'wow') {
    g.arc(0, r * 0.28, r * 0.09, 0, Math.PI * 2)
  } else if (mood === 'calm') {
    g.moveTo(-r * 0.12, r * 0.28)
    g.lineTo(r * 0.12, r * 0.28)
  } else {
    g.arc(0, r * 0.18, r * 0.16, 0.2, Math.PI - 0.2)
  }
  g.stroke()
  g.fillStyle = 'rgba(244,114,182,0.45)'
  g.beginPath()
  g.ellipse(-r * 0.5, r * 0.2, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
  g.ellipse(r * 0.5, r * 0.2, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
  g.fill()
}

function rim(g: G, r: number, c = 'rgba(255,255,255,0.35)') {
  g.strokeStyle = c
  g.lineWidth = Math.max(1, r * 0.06)
  g.beginPath()
  g.arc(0, 0, r - g.lineWidth / 2, Math.PI * 1.05, Math.PI * 1.6)
  g.stroke()
}

function drawBody(g: G, tier: number, r: number) {
  switch (tier) {
    case 0: {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r)
      gr.addColorStop(0, 'rgba(245,230,200,0.95)')
      gr.addColorStop(0.7, 'rgba(214,196,168,0.7)')
      gr.addColorStop(1, 'rgba(214,196,168,0)')
      disc(g, r, gr)
      g.fillStyle = '#fef3c7'
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4
        const d = r * (0.2 + (i % 3) * 0.2)
        g.beginPath()
        g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.1, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.arc(-r * 0.25, -r * 0.05, r * 0.11, 0, Math.PI * 2)
      g.arc(r * 0.25, -r * 0.05, r * 0.11, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 1: {
      g.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        const rr = r * (0.9 + Math.sin(i * 2.7) * 0.08)
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      g.fillStyle = rg(g, r, '#e7e5e4', '#57534e')
      g.fill()
      g.strokeStyle = '#292524'
      g.lineWidth = Math.max(1, r * 0.08)
      g.stroke()
      face(g, r * 0.85, 'calm')
      break
    }
    case 2: {
      g.beginPath()
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2
        const rr = r * (0.88 + Math.sin(i * 1.9) * 0.1)
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      g.fillStyle = rg(g, r, '#d97706', '#451a03')
      g.fill()
      g.strokeStyle = '#1c0a02'
      g.lineWidth = Math.max(1, r * 0.07)
      g.stroke()
      crater(g, r * 0.35, r * 0.35, r * 0.16, '#78350f')
      crater(g, -r * 0.45, r * 0.3, r * 0.1, '#78350f')
      crater(g, r * 0.4, -r * 0.45, r * 0.11, '#78350f')
      face(g, r * 0.8, 'wow')
      break
    }
    case 3: {
      disc(g, r, rg(g, r, '#f8fafc', '#64748b'))
      g.save()
      clipDisc(g, r)
      crater(g, r * 0.45, r * 0.4, r * 0.2, '#94a3b8')
      crater(g, -r * 0.55, r * 0.45, r * 0.14, '#94a3b8')
      crater(g, r * 0.5, -r * 0.5, r * 0.13, '#94a3b8')
      crater(g, -r * 0.4, -r * 0.6, r * 0.1, '#94a3b8')
      g.restore()
      face(g, r * 0.8)
      break
    }
    case 4: {
      disc(g, r, rg(g, r, '#fdba74', '#9a3412'))
      g.save()
      clipDisc(g, r)
      g.fillStyle = 'rgba(124,45,18,0.55)'
      g.beginPath()
      g.ellipse(-r * 0.3, r * 0.45, r * 0.5, r * 0.2, 0.3, 0, Math.PI * 2)
      g.ellipse(r * 0.5, -r * 0.2, r * 0.25, r * 0.15, -0.4, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fff7ed'
      g.beginPath()
      g.ellipse(0, -r * 0.95, r * 0.45, r * 0.18, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
      face(g, r * 0.8)
      break
    }
    case 5: {
      disc(g, r, rg(g, r, '#93c5fd', '#1e3a8a'))
      g.save()
      clipDisc(g, r)
      g.fillStyle = '#22c55e'
      g.beginPath()
      g.moveTo(-r * 0.9, -r * 0.3)
      g.quadraticCurveTo(-r * 0.4, -r * 0.7, -r * 0.1, -r * 0.35)
      g.quadraticCurveTo(-r * 0.3, 0, -r * 0.7, r * 0.15)
      g.closePath()
      g.moveTo(r * 0.2, r * 0.3)
      g.quadraticCurveTo(r * 0.7, r * 0.1, r * 0.9, r * 0.5)
      g.quadraticCurveTo(r * 0.5, r * 0.9, r * 0.2, r * 0.7)
      g.closePath()
      g.moveTo(r * 0.3, -r * 0.8)
      g.quadraticCurveTo(r * 0.7, -r * 0.7, r * 0.6, -r * 0.4)
      g.quadraticCurveTo(r * 0.35, -r * 0.45, r * 0.3, -r * 0.8)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.75)'
      g.beginPath()
      g.ellipse(-r * 0.2, r * 0.55, r * 0.35, r * 0.08, 0.2, 0, Math.PI * 2)
      g.ellipse(r * 0.4, -r * 0.15, r * 0.3, r * 0.07, -0.2, 0, Math.PI * 2)
      g.fill()
      g.restore()
      face(g, r * 0.75)
      break
    }
    case 6: {
      disc(g, r, rg(g, r, '#a5b4fc', '#1e1b4b'))
      g.save()
      clipDisc(g, r)
      g.strokeStyle = 'rgba(199,210,254,0.35)'
      g.lineWidth = r * 0.12
      for (const y of [-0.55, 0.15, 0.6]) {
        g.beginPath()
        g.moveTo(-r, r * y)
        g.quadraticCurveTo(0, r * (y + 0.12), r, r * y)
        g.stroke()
      }
      g.fillStyle = 'rgba(30,27,75,0.7)'
      g.beginPath()
      g.ellipse(r * 0.4, r * 0.4, r * 0.2, r * 0.12, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
      face(g, r * 0.75, 'calm')
      break
    }
    case 7: {
      // back half of the rings
      g.save()
      g.rotate(-0.35)
      g.strokeStyle = 'rgba(253,230,138,0.7)'
      g.lineWidth = r * 0.16
      g.beginPath()
      g.ellipse(0, 0, r * 1.55, r * 0.42, 0, Math.PI, Math.PI * 2)
      g.stroke()
      g.restore()
      disc(g, r, rg(g, r, '#fef3c7', '#a16207'))
      g.save()
      clipDisc(g, r)
      g.fillStyle = 'rgba(161,98,7,0.35)'
      for (const y of [-0.5, -0.1, 0.35]) g.fillRect(-r, r * y, r * 2, r * 0.16)
      g.restore()
      face(g, r * 0.72)
      g.save()
      g.rotate(-0.35)
      g.strokeStyle = 'rgba(254,240,138,0.95)'
      g.lineWidth = r * 0.16
      g.beginPath()
      g.ellipse(0, 0, r * 1.55, r * 0.42, 0, 0, Math.PI)
      g.stroke()
      g.strokeStyle = 'rgba(161,98,7,0.6)'
      g.lineWidth = r * 0.04
      g.beginPath()
      g.ellipse(0, 0, r * 1.38, r * 0.36, 0, 0, Math.PI)
      g.stroke()
      g.restore()
      break
    }
    case 8: {
      disc(g, r, rg(g, r, '#fed7aa', '#9a3412'))
      g.save()
      clipDisc(g, r)
      const bands: [number, string][] = [[-0.75, '#c2410c'], [-0.4, '#fde68a'], [-0.1, '#ea580c'], [0.3, '#fef3c7'], [0.6, '#c2410c']]
      for (const [y, c] of bands) {
        g.fillStyle = c
        g.globalAlpha = 0.55
        g.beginPath()
        g.moveTo(-r, r * y)
        g.quadraticCurveTo(0, r * (y + 0.08), r, r * y)
        g.lineTo(r, r * (y + 0.16))
        g.quadraticCurveTo(0, r * (y + 0.24), -r, r * (y + 0.16))
        g.closePath()
        g.fill()
      }
      g.globalAlpha = 1
      g.fillStyle = '#b91c1c'
      g.beginPath()
      g.ellipse(r * 0.35, r * 0.5, r * 0.22, r * 0.13, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
      face(g, r * 0.7, 'calm')
      break
    }
    case 9: {
      const cg = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.25)
      cg.addColorStop(0, 'rgba(253,224,71,0.8)')
      cg.addColorStop(1, 'rgba(249,115,22,0)')
      disc(g, r * 1.25, cg)
      disc(g, r, rg(g, r, '#fffbeb', '#f59e0b', -0.2, -0.2))
      g.save()
      clipDisc(g, r)
      g.fillStyle = 'rgba(234,88,12,0.25)'
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1
        g.beginPath()
        g.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.18, 0, Math.PI * 2)
        g.fill()
      }
      g.restore()
      face(g, r * 0.7)
      break
    }
    case 10: {
      const ag = g.createRadialGradient(0, 0, r * 0.45, 0, 0, r * 1.2)
      ag.addColorStop(0, 'rgba(0,0,0,1)')
      ag.addColorStop(0.45, 'rgba(251,146,60,0.95)')
      ag.addColorStop(0.65, 'rgba(168,85,247,0.6)')
      ag.addColorStop(1, 'rgba(168,85,247,0)')
      disc(g, r * 1.2, ag)
      g.save()
      g.rotate(-0.3)
      g.strokeStyle = 'rgba(254,215,170,0.95)'
      g.lineWidth = r * 0.1
      g.beginPath()
      g.ellipse(0, 0, r * 1.05, r * 0.3, 0, 0, Math.PI * 2)
      g.stroke()
      g.restore()
      disc(g, r * 0.5, '#000000')
      g.strokeStyle = 'rgba(255,255,255,0.8)'
      g.lineWidth = Math.max(1, r * 0.03)
      g.beginPath()
      g.arc(0, 0, r * 0.52, 0, Math.PI * 2)
      g.stroke()
      break
    }
    case NEBULA: {
      const cols = ['#f472b6', '#a78bfa', '#38bdf8', '#4ade80', '#facc15']
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        const gr = g.createRadialGradient(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, 0, Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, r * 0.75)
        gr.addColorStop(0, cols[i])
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        disc(g, r, gr)
      }
      disc(g, r * 0.35, 'rgba(255,255,255,0.9)')
      face(g, r * 0.7, 'wow')
      break
    }
    default: {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r)
      gr.addColorStop(0, '#ffffff')
      gr.addColorStop(0.35, '#67e8f9')
      gr.addColorStop(1, 'rgba(14,165,233,0)')
      disc(g, r, gr)
      g.strokeStyle = '#e0f2fe'
      g.lineWidth = Math.max(1.5, r * 0.1)
      g.beginPath()
      g.moveTo(0, -r)
      g.lineTo(0, r)
      g.moveTo(-r * 0.5, 0)
      g.lineTo(r * 0.5, 0)
      g.stroke()
    }
  }
  if (tier >= 2 && tier <= 8) rim(g, r)
}

/** Cached sprite for a body of radius r (canvas is 3r wide to fit rings/glow). */
export function bodySprite(tier: number, r: number): HTMLCanvasElement {
  const px = Math.max(4, Math.round(r))
  const key = `${tier}|${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  const dim = px * 3.4
  c.width = Math.ceil(dim * dpr)
  c.height = Math.ceil(dim * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(dim / 2, dim / 2)
  g.lineJoin = 'round'
  drawBody(g, tier, px)
  cache.set(key, c)
  if (cache.size > 200) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

const bgCache = new Map<string, HTMLCanvasElement>()

/** Static deep-space backdrop: gradient, nebula clouds and two star layers. */
export function spaceSprite(W: number, H: number, theme: number): HTMLCanvasElement {
  const key = `${W}|${H}|${theme}`
  const hit = bgCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(W * dpr)
  c.height = Math.ceil(H * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const themes = [
    ['#0b1026', '#1e1b4b', '#7c3aed', '#0ea5e9'],
    ['#020617', '#172554', '#0891b2', '#22c55e'],
    ['#1a0510', '#3b0764', '#db2777', '#f97316'],
    ['#03130f', '#022c22', '#14b8a6', '#a3e635'],
  ][theme % 4]
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, themes[0])
  bg.addColorStop(1, themes[1])
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  let seed = 11 + theme * 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 5; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 80 + rnd() * 140
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, (i % 2 ? themes[2] : themes[3]) + '40')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  for (let i = 0; i < 160; i++) {
    const s = rnd()
    g.globalAlpha = 0.3 + rnd() * 0.7
    g.fillStyle = s > 0.9 ? '#fde68a' : s > 0.8 ? '#bae6fd' : '#ffffff'
    g.beginPath()
    g.arc(rnd() * W, rnd() * H, s > 0.95 ? 1.6 : 0.5 + rnd() * 0.8, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  bgCache.set(key, c)
  if (bgCache.size > 6) {
    const first = bgCache.keys().next().value
    if (first) bgCache.delete(first)
  }
  return c
}
