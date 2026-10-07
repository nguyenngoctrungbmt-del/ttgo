/** Vector sprites for Neon Racer, cached to offscreen canvases. Vehicles face up (-y). */

export type VKind = 'car' | 'sport' | 'taxi' | 'van' | 'truck' | 'bus' | 'police' | 'player' | 'wrong'

export const VSIZE: Record<VKind, [w: number, h: number]> = {
  car: [36, 66],
  sport: [36, 62],
  taxi: [36, 66],
  van: [40, 76],
  truck: [44, 128],
  bus: [46, 140],
  police: [38, 70],
  player: [36, 66],
  wrong: [38, 68],
}

const PAD = 14
const SCALE = 2
const cache = new Map<string, HTMLCanvasElement>()

function sprite(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = (w + PAD * 2) * SCALE
  c.height = (h + PAD * 2) * SCALE
  const g = c.getContext('2d')!
  g.scale(SCALE, SCALE)
  g.translate(PAD + w / 2, PAD + h / 2)
  draw(g)
  cache.set(key, c)
  return c
}

export function blit(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, w: number, h: number, rot = 0) {
  if (rot) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.drawImage(spr, -w / 2 - PAD, -h / 2 - PAD, w + PAD * 2, h + PAD * 2)
    ctx.restore()
  } else ctx.drawImage(spr, x - w / 2 - PAD, y - h / 2 - PAD, w + PAD * 2, h + PAD * 2)
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
  let gg = (n >> 8) & 255
  let b = n & 255
  if (k < 0) {
    r *= 1 + k
    gg *= 1 + k
    b *= 1 + k
  } else {
    r += (255 - r) * k
    gg += (255 - gg) * k
    b += (255 - b) * k
  }
  return `rgb(${r | 0},${gg | 0},${b | 0})`
}

function bodyGrad(g: CanvasRenderingContext2D, w: number, color: string) {
  const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0)
  gr.addColorStop(0, shade(color, -0.45))
  gr.addColorStop(0.22, color)
  gr.addColorStop(0.5, shade(color, 0.28))
  gr.addColorStop(0.78, color)
  gr.addColorStop(1, shade(color, -0.45))
  return gr
}

function wheels(g: CanvasRenderingContext2D, w: number, ys: number[]) {
  g.fillStyle = '#0a0a0a'
  for (const y of ys) {
    rr(g, -w / 2 - 2, y - 7, 6, 14, 2)
    g.fill()
    rr(g, w / 2 - 4, y - 7, 6, 14, 2)
    g.fill()
  }
}

function glass(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, topW: number, botW: number) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  gr.addColorStop(0, '#0f172a')
  gr.addColorStop(1, '#334155')
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(x0 - topW / 2, y0)
  g.lineTo(x0 + topW / 2, y0)
  g.lineTo(x1 + botW / 2, y1)
  g.lineTo(x1 - botW / 2, y1)
  g.closePath()
  g.fill()
  // glare streak
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(x0 - topW * 0.3, y0 + 2)
  g.lineTo(x0 - topW * 0.05, y1 - 2)
  g.stroke()
}

function drawCar(g: CanvasRenderingContext2D, kind: VKind, color: string) {
  const [w, h] = VSIZE[kind]
  // soft drop shadow
  g.fillStyle = 'rgba(0,0,0,0.38)'
  rr(g, -w / 2 + 3, -h / 2 + 6, w, h, 10)
  g.fill()
  wheels(g, w, [-h * 0.29, h * 0.3])
  // body
  g.fillStyle = bodyGrad(g, w, color)
  rr(g, -w / 2, -h / 2, w, h, kind === 'sport' || kind === 'player' ? 13 : 9)
  g.fill()
  g.strokeStyle = shade(color, -0.55)
  g.lineWidth = 1.2
  g.stroke()
  if (kind === 'police') {
    g.fillStyle = '#f8fafc'
    g.fillRect(-w / 2 + 1, -h * 0.12, w - 2, h * 0.34)
  }
  // hood crease
  g.strokeStyle = 'rgba(0,0,0,0.18)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(-w * 0.18, -h * 0.46)
  g.lineTo(-w * 0.14, -h * 0.22)
  g.moveTo(w * 0.18, -h * 0.46)
  g.lineTo(w * 0.14, -h * 0.22)
  g.stroke()
  // windshield, roof, rear window
  glass(g, 0, -h * 0.2, 0, -h * 0.04, w * 0.7, w * 0.84)
  g.fillStyle = shade(color, kind === 'police' ? 0 : 0.12)
  if (kind === 'police') g.fillStyle = '#e2e8f0'
  rr(g, -w * 0.4, -h * 0.04, w * 0.8, h * 0.26, 5)
  g.fill()
  if (kind !== 'van') glass(g, 0, h * 0.22, 0, h * 0.33, w * 0.82, w * 0.66)
  // mirrors
  g.fillStyle = shade(color, -0.3)
  g.fillRect(-w / 2 - 3, -h * 0.17, 4, 5)
  g.fillRect(w / 2 - 1, -h * 0.17, 4, 5)
  // lights
  g.fillStyle = '#fef9c3'
  rr(g, -w / 2 + 3, -h / 2 + 1, 9, 4, 2)
  g.fill()
  rr(g, w / 2 - 12, -h / 2 + 1, 9, 4, 2)
  g.fill()
  g.fillStyle = '#ef4444'
  rr(g, -w / 2 + 3, h / 2 - 4, 9, 3, 1.5)
  g.fill()
  rr(g, w / 2 - 12, h / 2 - 4, 9, 3, 1.5)
  g.fill()
  if (kind === 'sport' || kind === 'player') {
    g.fillStyle = kind === 'player' ? '#f0abfc' : '#ffffff'
    g.globalAlpha = 0.85
    g.fillRect(-5, -h / 2 + 2, 3, h * 0.3)
    g.fillRect(2, -h / 2 + 2, 3, h * 0.3)
    g.fillRect(-5, h * 0.22, 3, h * 0.26)
    g.fillRect(2, h * 0.22, 3, h * 0.26)
    g.globalAlpha = 1
    g.fillStyle = shade(color, -0.5)
    rr(g, -w / 2 + 1, h / 2 - 9, w - 2, 4, 2)
    g.fill()
  }
  if (kind === 'taxi') {
    g.fillStyle = '#111827'
    rr(g, -9, h * 0.04, 18, 7, 2)
    g.fill()
    g.fillStyle = '#fde047'
    g.fillRect(-7, h * 0.05 + 1, 14, 3)
    g.fillStyle = '#111827'
    for (let i = 0; i < 6; i++) g.fillRect(-w / 2 + 1 + (i % 2) * 3, -h * 0.05 + i * 3, 3, 3)
  }
  if (kind === 'van') {
    g.strokeStyle = 'rgba(0,0,0,0.25)'
    g.beginPath()
    g.moveTo(-w * 0.32, h * 0.25)
    g.lineTo(-w * 0.32, h * 0.46)
    g.moveTo(w * 0.32, h * 0.25)
    g.lineTo(w * 0.32, h * 0.46)
    g.stroke()
  }
  if (kind === 'police') {
    g.fillStyle = '#1e293b'
    rr(g, -w * 0.38, h * 0.02, w * 0.76, 6, 2)
    g.fill()
  }
  if (kind === 'wrong') {
    // battered beater: rust patches, cracked glass, hazard stripes on the roof
    g.fillStyle = 'rgba(120,53,15,0.55)'
    for (const [x, y, r] of [[-w * 0.3, -h * 0.36, 5], [w * 0.28, h * 0.12, 4], [-w * 0.26, h * 0.38, 4]] as const) {
      g.beginPath()
      g.ellipse(x, y, r, r * 0.7, 0.4, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = 'rgba(255,255,255,0.6)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(w * 0.1, -h * 0.19)
    g.lineTo(-w * 0.02, -h * 0.12)
    g.lineTo(w * 0.12, -h * 0.07)
    g.moveTo(-w * 0.02, -h * 0.12)
    g.lineTo(-w * 0.2, -h * 0.1)
    g.stroke()
    g.save()
    rr(g, -w * 0.4, -h * 0.04, w * 0.8, h * 0.26, 5)
    g.clip()
    g.fillStyle = '#fbbf24'
    for (let x = -w * 0.6; x < w * 0.5; x += 10) {
      g.beginPath()
      g.moveTo(x, h * 0.22)
      g.lineTo(x + 5, h * 0.22)
      g.lineTo(x + 15, -h * 0.04)
      g.lineTo(x + 10, -h * 0.04)
      g.closePath()
      g.fill()
    }
    g.restore()
  }
}

function drawTruck(g: CanvasRenderingContext2D, color: string) {
  const [w, h] = VSIZE.truck
  g.fillStyle = 'rgba(0,0,0,0.38)'
  rr(g, -w / 2 + 3, -h / 2 + 6, w, h, 6)
  g.fill()
  wheels(g, w, [-h * 0.36, h * 0.18, h * 0.3, h * 0.42])
  // cab
  const cabH = h * 0.24
  g.fillStyle = bodyGrad(g, w, color)
  rr(g, -w / 2 + 2, -h / 2, w - 4, cabH, 8)
  g.fill()
  glass(g, 0, -h / 2 + 6, 0, -h / 2 + 16, w * 0.7, w * 0.8)
  g.fillStyle = '#fef9c3'
  g.fillRect(-w / 2 + 4, -h / 2 + 1, 8, 3)
  g.fillRect(w / 2 - 12, -h / 2 + 1, 8, 3)
  // trailer
  const ty = -h / 2 + cabH + 3
  const th = h - cabH - 3
  const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0)
  gr.addColorStop(0, '#94a3b8')
  gr.addColorStop(0.5, '#f1f5f9')
  gr.addColorStop(1, '#94a3b8')
  g.fillStyle = gr
  rr(g, -w / 2, ty, w, th, 3)
  g.fill()
  g.strokeStyle = 'rgba(15,23,42,0.18)'
  g.lineWidth = 1
  for (let y = ty + 8; y < ty + th - 4; y += 9) {
    g.beginPath()
    g.moveTo(-w / 2 + 2, y)
    g.lineTo(w / 2 - 2, y)
    g.stroke()
  }
  g.fillStyle = color
  g.fillRect(-3, ty + 4, 6, th - 8)
  g.fillStyle = '#ef4444'
  g.fillRect(-w / 2 + 2, h / 2 - 3, 8, 3)
  g.fillRect(w / 2 - 10, h / 2 - 3, 8, 3)
}

function drawBus(g: CanvasRenderingContext2D, color: string) {
  const [w, h] = VSIZE.bus
  g.fillStyle = 'rgba(0,0,0,0.38)'
  rr(g, -w / 2 + 3, -h / 2 + 6, w, h, 8)
  g.fill()
  wheels(g, w, [-h * 0.32, h * 0.32])
  g.fillStyle = bodyGrad(g, w, color)
  rr(g, -w / 2, -h / 2, w, h, 8)
  g.fill()
  glass(g, 0, -h / 2 + 3, 0, -h / 2 + 12, w * 0.8, w * 0.86)
  // side windows seen from above
  g.fillStyle = '#1e293b'
  g.fillRect(-w / 2 + 1, -h / 2 + 16, 4, h - 28)
  g.fillRect(w / 2 - 5, -h / 2 + 16, 4, h - 28)
  // roof
  g.fillStyle = shade(color, 0.35)
  rr(g, -w / 2 + 7, -h / 2 + 16, w - 14, h - 26, 4)
  g.fill()
  g.fillStyle = '#cbd5e1'
  rr(g, -9, -h * 0.12, 18, 22, 3)
  g.fill()
  rr(g, -9, h * 0.18, 18, 16, 3)
  g.fill()
  g.strokeStyle = '#94a3b8'
  for (let i = 0; i < 4; i++) {
    g.beginPath()
    g.moveTo(-6, -h * 0.12 + 4 + i * 5)
    g.lineTo(6, -h * 0.12 + 4 + i * 5)
    g.stroke()
  }
  g.fillStyle = '#fef9c3'
  g.fillRect(-w / 2 + 3, -h / 2 + 1, 8, 3)
  g.fillRect(w / 2 - 11, -h / 2 + 1, 8, 3)
  g.fillStyle = '#ef4444'
  g.fillRect(-w / 2 + 3, h / 2 - 3, 8, 3)
  g.fillRect(w / 2 - 11, h / 2 - 3, 8, 3)
}

export function vehicleSprite(kind: VKind, color: string) {
  const [w, h] = VSIZE[kind]
  return sprite(`${kind}|${color}`, w, h, (g) => {
    if (kind === 'truck') drawTruck(g, color)
    else if (kind === 'bus') drawBus(g, color)
    else drawCar(g, kind, color)
  })
}

/** Forward headlight beams (drawn ahead of the car's nose). */
export function beamSprite() {
  return sprite('beam', 90, 170, (g) => {
    const gr = g.createLinearGradient(0, 85, 0, -85)
    gr.addColorStop(0, 'rgba(255,244,214,0.32)')
    gr.addColorStop(1, 'rgba(255,244,214,0)')
    g.fillStyle = gr
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * 12 - 4, 85)
      g.lineTo(s * 12 + 4, 85)
      g.lineTo(s * 12 + s * 30 + 14, -85)
      g.lineTo(s * 12 + s * 30 - 26, -85)
      g.closePath()
      g.fill()
    }
  })
}

export function glowSprite(color: string, r: number) {
  return sprite(`glow|${color}|${r}`, r * 2, r * 2, (g) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r)
    gr.addColorStop(0, color)
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(-r, -r, r * 2, r * 2)
  })
}

export function coneSprite() {
  return sprite('cone', 18, 18, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.beginPath()
    g.arc(2, 3, 9, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#c2410c'
    g.fillRect(-8, -8, 16, 16)
    const gr = g.createRadialGradient(-2, -2, 1, 0, 0, 7)
    gr.addColorStop(0, '#fdba74')
    gr.addColorStop(1, '#f97316')
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, 7, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    g.beginPath()
    g.arc(0, 0, 4, 0, Math.PI * 2)
    g.stroke()
  })
}

export function barrierSprite(w: number) {
  return sprite(`barrier|${w}`, w, 16, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.4)'
    g.fillRect(-w / 2 + 3, -6, w, 16)
    g.fillStyle = '#f8fafc'
    rr(g, -w / 2, -8, w, 14, 3)
    g.fill()
    g.save()
    g.beginPath()
    g.roundRect(-w / 2, -8, w, 14, 3)
    g.clip()
    g.fillStyle = '#ef4444'
    for (let x = -w / 2 - 14; x < w / 2; x += 14) {
      g.beginPath()
      g.moveTo(x, 6)
      g.lineTo(x + 7, 6)
      g.lineTo(x + 15, -8)
      g.lineTo(x + 8, -8)
      g.closePath()
      g.fill()
    }
    g.restore()
    g.fillStyle = '#fbbf24'
    g.beginPath()
    g.arc(-w / 2 + 6, -1, 2.5, 0, Math.PI * 2)
    g.arc(w / 2 - 6, -1, 2.5, 0, Math.PI * 2)
    g.fill()
  })
}

export function oilSprite() {
  return sprite('oil', 64, 40, (g) => {
    g.fillStyle = '#05050a'
    g.beginPath()
    g.ellipse(0, 0, 30, 17, 0.1, 0, Math.PI * 2)
    g.ellipse(14, 8, 14, 9, 0, 0, Math.PI * 2)
    g.ellipse(-16, -6, 12, 8, 0, 0, Math.PI * 2)
    g.fill()
    // rainbow sheen
    const gr = g.createLinearGradient(-24, -12, 24, 12)
    gr.addColorStop(0, 'rgba(168,85,247,0.45)')
    gr.addColorStop(0.5, 'rgba(34,211,238,0.35)')
    gr.addColorStop(1, 'rgba(250,204,21,0.35)')
    g.strokeStyle = gr
    g.lineWidth = 2.5
    g.beginPath()
    g.ellipse(-2, -2, 18, 9, 0.1, 0.4, 3.6)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.beginPath()
    g.ellipse(-8, -6, 6, 2.5, 0.2, 0, Math.PI * 2)
    g.fill()
  })
}

export function coinSprite() {
  return sprite('coin', 22, 22, (g) => {
    g.fillStyle = '#a16207'
    g.beginPath()
    g.arc(0, 1.5, 10, 0, Math.PI * 2)
    g.fill()
    const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 10)
    gr.addColorStop(0, '#fef9c3')
    gr.addColorStop(0.5, '#facc15')
    gr.addColorStop(1, '#ca8a04')
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, 10, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#a16207'
    g.lineWidth = 1.5
    g.beginPath()
    g.arc(0, 0, 6.5, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#fef08a'
    g.fillRect(-1.2, -4, 2.4, 8)
  })
}

export type PickKind = 'nitro' | 'shield' | 'magnet' | 'emp'

export function pickupSprite(kind: PickKind) {
  return sprite(`pick|${kind}`, 30, 30, (g) => {
    const col = kind === 'nitro' ? '#22d3ee' : kind === 'shield' ? '#60a5fa' : kind === 'emp' ? '#a78bfa' : '#f472b6'
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, 15)
    gr.addColorStop(0, col)
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(-15, -15, 30, 30)
    g.fillStyle = '#0f172a'
    g.beginPath()
    g.arc(0, 0, 11, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = col
    g.lineWidth = 2.5
    g.stroke()
    g.fillStyle = col
    g.strokeStyle = col
    if (kind === 'nitro') {
      // canister with flame
      rr(g, -4, -6, 8, 12, 2)
      g.fill()
      g.fillRect(-2, -8, 4, 2)
      g.fillStyle = '#ecfeff'
      g.fillRect(-2.5, -3, 1.6, 7)
    } else if (kind === 'shield') {
      g.beginPath()
      g.moveTo(0, -7)
      g.lineTo(6, -4)
      g.quadraticCurveTo(6, 4, 0, 8)
      g.quadraticCurveTo(-6, 4, -6, -4)
      g.closePath()
      g.fill()
    } else if (kind === 'emp') {
      // lightning bolt
      g.beginPath()
      g.moveTo(2, -8)
      g.lineTo(-5, 1)
      g.lineTo(-0.5, 1)
      g.lineTo(-2, 8)
      g.lineTo(5, -1.5)
      g.lineTo(0.5, -1.5)
      g.closePath()
      g.fill()
      g.fillStyle = '#f5f3ff'
      g.beginPath()
      g.moveTo(1.2, -6)
      g.lineTo(-3, 0)
      g.lineTo(-1.5, 0)
      g.closePath()
      g.fill()
    } else {
      g.lineWidth = 3.5
      g.beginPath()
      g.arc(0, 0, 5, Math.PI, 0)
      g.stroke()
      g.fillRect(-6.7, 0, 3.4, 4)
      g.fillRect(3.3, 0, 3.4, 4)
      g.fillStyle = '#e2e8f0'
      g.fillRect(-6.7, 3, 3.4, 2)
      g.fillRect(3.3, 3, 3.4, 2)
    }
  })
}

/** Faceted boulder seen from above. */
export function rockSprite(variant: number) {
  return sprite(`rock|${variant}`, 36, 34, (g) => {
    const pts: [number, number][] = []
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      const r = 15 + Math.sin(i * 2.7 + variant * 1.9) * 2.6
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.9])
    }
    g.fillStyle = 'rgba(0,0,0,0.4)'
    g.beginPath()
    for (const [x, y] of pts) g.lineTo(x + 3, y + 5)
    g.fill()
    const gr = g.createRadialGradient(-5, -6, 2, 0, 0, 18)
    gr.addColorStop(0, variant % 2 ? '#a8a29e' : '#9ca3af')
    gr.addColorStop(0.6, variant % 2 ? '#57534e' : '#4b5563')
    gr.addColorStop(1, '#1c1917')
    g.fillStyle = gr
    g.beginPath()
    for (const [x, y] of pts) g.lineTo(x, y)
    g.closePath()
    g.fill()
    g.strokeStyle = '#0c0a09'
    g.lineWidth = 1.4
    g.stroke()
    // facet edges
    g.strokeStyle = 'rgba(0,0,0,0.35)'
    g.lineWidth = 1
    const c: [number, number] = [pts[1][0] * 0.35, pts[1][1] * 0.35]
    g.beginPath()
    for (const i of [1, 4, 7]) {
      g.moveTo(c[0], c[1])
      g.lineTo(pts[i][0] * 0.92, pts[i][1] * 0.92)
    }
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.28)'
    g.beginPath()
    g.ellipse(-6, -7, 5, 3, -0.5, 0, Math.PI * 2)
    g.fill()
  })
}

/** Lying oil drum (axis vertical on screen); hazard stripes are drawn live so it can roll. */
export function barrelSprite() {
  return sprite('barrel', 26, 36, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.4)'
    rr(g, -13 + 3, -18 + 5, 26, 36, 6)
    g.fill()
    const gr = g.createLinearGradient(-13, 0, 13, 0)
    gr.addColorStop(0, '#7f1d1d')
    gr.addColorStop(0.35, '#ef4444')
    gr.addColorStop(0.55, '#fca5a5')
    gr.addColorStop(1, '#7f1d1d')
    g.fillStyle = gr
    rr(g, -13, -18, 26, 36, 6)
    g.fill()
    g.strokeStyle = '#450a0a'
    g.lineWidth = 1.4
    g.stroke()
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.fillRect(-13, -18, 26, 3)
    g.fillRect(-13, 15, 26, 3)
    g.fillStyle = 'rgba(0,0,0,0.28)'
    g.fillRect(-13, -7, 26, 2.5)
    g.fillRect(-13, 5, 26, 2.5)
  })
}

/** Armored wooden crate dropped by the boss. */
export function crateSprite() {
  return sprite('crate', 32, 32, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.4)'
    g.fillRect(-16 + 4, -16 + 5, 32, 32)
    const gr = g.createLinearGradient(-16, -16, 16, 16)
    gr.addColorStop(0, '#d97706')
    gr.addColorStop(1, '#78350f')
    g.fillStyle = gr
    g.fillRect(-16, -16, 32, 32)
    g.strokeStyle = 'rgba(69,26,3,0.6)'
    g.lineWidth = 1
    for (let y = -10; y < 16; y += 6.5) {
      g.beginPath()
      g.moveTo(-15, y)
      g.lineTo(15, y)
      g.stroke()
    }
    g.strokeStyle = '#451a03'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(-13, -13)
    g.lineTo(13, 13)
    g.moveTo(13, -13)
    g.lineTo(-13, 13)
    g.stroke()
    g.strokeStyle = '#334155'
    g.lineWidth = 3
    g.strokeRect(-14.5, -14.5, 29, 29)
    g.fillStyle = '#cbd5e1'
    for (const [x, y] of [[-14, -14], [14, -14], [-14, 14], [14, 14]] as const) {
      g.beginPath()
      g.arc(x, y, 2.4, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#facc15'
    g.beginPath()
    g.moveTo(0, -7)
    g.lineTo(7, 0)
    g.lineTo(0, 7)
    g.lineTo(-7, 0)
    g.closePath()
    g.fill()
    g.fillStyle = '#111827'
    g.fillRect(-1, -4, 2, 5)
    g.fillRect(-1, 2.2, 2, 2)
  })
}

export const BOSS_SIZE: [w: number, h: number] = [74, 158]

/** The Iron Hauler: armored war-rig seen from above, facing up. */
export function bossSprite() {
  const [w, h] = BOSS_SIZE
  return sprite('boss', w, h, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.45)'
    rr(g, -w / 2 + 4, -h / 2 + 8, w, h, 10)
    g.fill()
    // fat tires
    g.fillStyle = '#050505'
    for (const y of [-h * 0.36, h * 0.12, h * 0.26, h * 0.4]) {
      rr(g, -w / 2 - 4, y - 9, 9, 18, 3)
      g.fill()
      rr(g, w / 2 - 5, y - 9, 9, 18, 3)
      g.fill()
    }
    // spiked ram plow (front)
    g.fillStyle = '#52525b'
    g.beginPath()
    g.moveTo(-w / 2 - 2, -h / 2 + 10)
    g.lineTo(0, -h / 2 - 4)
    g.lineTo(w / 2 + 2, -h / 2 + 10)
    g.lineTo(w / 2 + 2, -h / 2 + 16)
    g.lineTo(-w / 2 - 2, -h / 2 + 16)
    g.closePath()
    g.fill()
    g.fillStyle = '#d4d4d8'
    for (let i = -3; i <= 3; i++) {
      const x = i * 10
      g.beginPath()
      g.moveTo(x - 4, -h / 2 + 8 + Math.abs(i) * 1.5)
      g.lineTo(x, -h / 2 - 6 + Math.abs(i) * 1.8)
      g.lineTo(x + 4, -h / 2 + 8 + Math.abs(i) * 1.5)
      g.closePath()
      g.fill()
    }
    // cab
    const cabH = h * 0.24
    const cg = g.createLinearGradient(-w / 2, 0, w / 2, 0)
    cg.addColorStop(0, '#1f2937')
    cg.addColorStop(0.5, '#6b7280')
    cg.addColorStop(1, '#1f2937')
    g.fillStyle = cg
    rr(g, -w / 2 + 3, -h / 2 + 14, w - 6, cabH, 8)
    g.fill()
    glass(g, 0, -h / 2 + 20, 0, -h / 2 + 32, w * 0.62, w * 0.72)
    // chrome exhaust stacks
    const sy = -h / 2 + 14 + cabH - 4
    g.fillStyle = '#e5e7eb'
    g.beginPath()
    g.arc(-w / 2 + 8, sy, 4, 0, Math.PI * 2)
    g.arc(w / 2 - 8, sy, 4, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#111827'
    g.beginPath()
    g.arc(-w / 2 + 8, sy, 2, 0, Math.PI * 2)
    g.arc(w / 2 - 8, sy, 2, 0, Math.PI * 2)
    g.fill()
    // armored trailer
    const ty = -h / 2 + 16 + cabH
    const th = h / 2 - ty
    const tg = g.createLinearGradient(-w / 2, 0, w / 2, 0)
    tg.addColorStop(0, '#18181b')
    tg.addColorStop(0.3, '#3f3f46')
    tg.addColorStop(0.5, '#71717a')
    tg.addColorStop(0.7, '#3f3f46')
    tg.addColorStop(1, '#18181b')
    g.fillStyle = tg
    rr(g, -w / 2, ty, w, th, 5)
    g.fill()
    g.strokeStyle = '#09090b'
    g.lineWidth = 1.5
    g.stroke()
    g.strokeStyle = 'rgba(0,0,0,0.45)'
    g.lineWidth = 1
    for (let y = ty + 22; y < h / 2 - 16; y += 22) {
      g.beginPath()
      g.moveTo(-w / 2 + 2, y)
      g.lineTo(w / 2 - 2, y)
      g.stroke()
    }
    g.fillStyle = '#a1a1aa'
    for (let y = ty + 6; y < h / 2 - 10; y += 11) {
      g.fillRect(-w / 2 + 3, y, 2, 2)
      g.fillRect(w / 2 - 5, y, 2, 2)
    }
    // angry face painted on the roof (eyes glow is drawn live)
    g.fillStyle = '#450a0a'
    g.beginPath()
    g.moveTo(-26, ty + 32)
    g.lineTo(-5, ty + 41)
    g.lineTo(-7, ty + 52)
    g.lineTo(-24, ty + 47)
    g.closePath()
    g.moveTo(26, ty + 32)
    g.lineTo(5, ty + 41)
    g.lineTo(7, ty + 52)
    g.lineTo(24, ty + 47)
    g.closePath()
    g.fill()
    g.fillStyle = '#e4e4e7'
    g.beginPath()
    g.moveTo(-20, ty + 62)
    for (let i = 0; i <= 8; i++) g.lineTo(-20 + i * 5, ty + 62 + (i % 2 ? 7 : 0))
    g.lineTo(20, ty + 74)
    g.lineTo(-20, ty + 74)
    g.closePath()
    g.fill()
    // rear hazard door
    g.save()
    rr(g, -w / 2 + 4, h / 2 - 16, w - 8, 14, 3)
    g.clip()
    g.fillStyle = '#facc15'
    g.fillRect(-w / 2, h / 2 - 16, w, 14)
    g.fillStyle = '#111827'
    for (let x = -w / 2 - 14; x < w / 2; x += 12) {
      g.beginPath()
      g.moveTo(x, h / 2 - 2)
      g.lineTo(x + 6, h / 2 - 2)
      g.lineTo(x + 20, h / 2 - 16)
      g.lineTo(x + 14, h / 2 - 16)
      g.closePath()
      g.fill()
    }
    g.restore()
  })
}

export const BOSS_EYES: [x: number, y: number][] = [
  [-15, -BOSS_SIZE[1] / 2 + 16 + BOSS_SIZE[1] * 0.24 + 43],
  [15, -BOSS_SIZE[1] / 2 + 16 + BOSS_SIZE[1] * 0.24 + 43],
]
