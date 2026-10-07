/** Cached vector sprites for Drift King. Cars face +x (heading 0) so rotation = heading. */

const PAD = 12
const SCALE = 2
const cache = new Map<string, HTMLCanvasElement>()

export function sprite(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
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
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  ctx.drawImage(spr, -w / 2 - PAD, -h / 2 - PAD, w + PAD * 2, h + PAD * 2)
  ctx.restore()
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

export const CAR_L = 46
export const CAR_W = 24

/** Drift coupe seen from above, nose toward +x. */
export function carSprite(body: string, dark: string, stripe: string) {
  return sprite(`car|${body}|${stripe}`, CAR_L, CAR_W, (g) => {
    const L = CAR_L
    const W = CAR_W
    g.fillStyle = 'rgba(0,0,0,0.4)'
    rr(g, -L / 2 + 3, -W / 2 + 4, L, W, 7)
    g.fill()
    // tyres
    g.fillStyle = '#0a0a0a'
    for (const x of [-L * 0.3, L * 0.28]) {
      rr(g, x - 6, -W / 2 - 2, 12, 5, 2)
      g.fill()
      rr(g, x - 6, W / 2 - 3, 12, 5, 2)
      g.fill()
    }
    const gr = g.createLinearGradient(0, -W / 2, 0, W / 2)
    gr.addColorStop(0, dark)
    gr.addColorStop(0.25, body)
    gr.addColorStop(0.5, '#ffffff')
    gr.addColorStop(0.56, body)
    gr.addColorStop(1, dark)
    g.fillStyle = gr
    rr(g, -L / 2, -W / 2, L, W, 8)
    g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.5)'
    g.lineWidth = 1
    g.stroke()
    // stripes
    g.fillStyle = stripe
    g.fillRect(-L / 2 + 2, -3.5, L - 4, 2.5)
    g.fillRect(-L / 2 + 2, 1, L - 4, 2.5)
    // windshield + roof + rear glass
    g.fillStyle = '#0f172a'
    g.beginPath()
    g.moveTo(L * 0.18, -W * 0.38)
    g.lineTo(L * 0.18, W * 0.38)
    g.lineTo(L * 0.02, W * 0.33)
    g.lineTo(L * 0.02, -W * 0.33)
    g.closePath()
    g.fill()
    g.fillStyle = body
    rr(g, -L * 0.22, -W * 0.33, L * 0.24, W * 0.66, 4)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.fillRect(-L * 0.2, -W * 0.3, L * 0.2, 2)
    g.fillStyle = '#0f172a'
    g.beginPath()
    g.moveTo(-L * 0.22, -W * 0.3)
    g.lineTo(-L * 0.22, W * 0.3)
    g.lineTo(-L * 0.32, W * 0.25)
    g.lineTo(-L * 0.32, -W * 0.25)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.4)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(L * 0.15, -W * 0.25)
    g.lineTo(L * 0.05, -W * 0.05)
    g.stroke()
    // spoiler
    g.fillStyle = dark
    rr(g, -L / 2 - 2, -W / 2 + 1, 5, W - 2, 2)
    g.fill()
    // lights
    g.fillStyle = '#fef9c3'
    g.fillRect(L / 2 - 3, -W / 2 + 2, 3, 5)
    g.fillRect(L / 2 - 3, W / 2 - 7, 3, 5)
    g.fillStyle = '#ef4444'
    g.fillRect(-L / 2, -W / 2 + 2, 2, 5)
    g.fillRect(-L / 2, W / 2 - 7, 2, 5)
  })
}

export function beamSprite() {
  return sprite('beam', 200, 120, (g) => {
    const gr = g.createLinearGradient(-100, 0, 100, 0)
    gr.addColorStop(0, 'rgba(255,247,214,0.6)')
    gr.addColorStop(1, 'rgba(255,247,214,0)')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(-100, -10)
    g.lineTo(100, -60)
    g.lineTo(100, 60)
    g.lineTo(-100, 10)
    g.closePath()
    g.fill()
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

export function treeSprite(leaf: string, light: string, snow: boolean) {
  return sprite(`tree|${leaf}|${snow}`, 44, 44, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.28)'
    g.beginPath()
    g.arc(5, 6, 19, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = leaf
    g.beginPath()
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = i % 2 ? 14 : 20
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
    g.fillStyle = light
    g.beginPath()
    g.arc(-5, -5, 9, 0, Math.PI * 2)
    g.fill()
    if (snow) {
      g.fillStyle = 'rgba(255,255,255,0.85)'
      g.beginPath()
      g.arc(-4, -4, 6, 0, Math.PI * 2)
      g.arc(5, 3, 3.5, 0, Math.PI * 2)
      g.fill()
    }
  })
}

export function rockSprite(col: string, light: string) {
  return sprite(`rock|${col}`, 34, 26, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.28)'
    g.beginPath()
    g.ellipse(4, 5, 16, 11, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-15, 4)
    g.lineTo(-10, -9)
    g.lineTo(3, -12)
    g.lineTo(15, -3)
    g.lineTo(12, 9)
    g.lineTo(-6, 11)
    g.closePath()
    g.fill()
    g.fillStyle = light
    g.beginPath()
    g.moveTo(-10, -9)
    g.lineTo(3, -12)
    g.lineTo(6, -3)
    g.lineTo(-6, -1)
    g.closePath()
    g.fill()
  })
}

export function tyreStackSprite(accent: string) {
  return sprite(`tyres|${accent}`, 26, 26, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.beginPath()
    g.arc(3, 4, 12, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#111827'
    g.beginPath()
    g.arc(0, 0, 12, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = accent
    g.lineWidth = 3
    g.beginPath()
    g.arc(0, 0, 9, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#374151'
    g.beginPath()
    g.arc(0, 0, 5, 0, Math.PI * 2)
    g.fill()
  })
}

export function coneSprite() {
  return sprite('cone', 16, 16, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'
    g.beginPath()
    g.arc(2, 3, 8, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#c2410c'
    g.fillRect(-7, -7, 14, 14)
    g.fillStyle = '#fb923c'
    g.beginPath()
    g.arc(0, 0, 6, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#fff'
    g.lineWidth = 1.8
    g.beginPath()
    g.arc(0, 0, 3.4, 0, Math.PI * 2)
    g.stroke()
  })
}

export function oilSprite() {
  return sprite('oil', 50, 34, (g) => {
    g.fillStyle = '#050508'
    g.beginPath()
    g.ellipse(0, 0, 23, 14, 0.2, 0, Math.PI * 2)
    g.ellipse(12, 6, 10, 7, 0, 0, Math.PI * 2)
    g.fill()
    const gr = g.createLinearGradient(-20, -10, 20, 10)
    gr.addColorStop(0, 'rgba(168,85,247,0.5)')
    gr.addColorStop(0.5, 'rgba(34,211,238,0.4)')
    gr.addColorStop(1, 'rgba(250,204,21,0.4)')
    g.strokeStyle = gr
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(-2, -1, 14, 7, 0.2, 0.3, 3.5)
    g.stroke()
  })
}

export function coinSprite() {
  return sprite('coin', 18, 18, (g) => {
    g.fillStyle = '#a16207'
    g.beginPath()
    g.arc(0, 1.2, 8, 0, Math.PI * 2)
    g.fill()
    const gr = g.createRadialGradient(-2, -2, 1, 0, 0, 8)
    gr.addColorStop(0, '#fef9c3')
    gr.addColorStop(0.55, '#facc15')
    gr.addColorStop(1, '#ca8a04')
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, 8, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fef08a'
    g.fillRect(-1, -3.5, 2, 7)
  })
}
