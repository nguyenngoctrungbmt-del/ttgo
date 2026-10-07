/** Drift King extra art: rolling barrels, spark mines, nitro cans, sakura / lava scenery, ambient particles. */
import { sprite } from './art'

export type Ambient = 'none' | 'dust' | 'snow' | 'leaves' | 'petals' | 'embers'

/** Rolling oil barrel seen from above (axis along y so it rolls along x in local space). */
export function barrelSprite(frame: number) {
  return sprite(`barrel|${frame}`, 24, 30, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.beginPath()
    g.roundRect(-10, -13, 24, 30, 5)
    g.fill()
    const gr = g.createLinearGradient(-12, 0, 12, 0)
    gr.addColorStop(0, '#7f1d1d')
    gr.addColorStop(0.35, '#ef4444')
    gr.addColorStop(0.55, '#fca5a5')
    gr.addColorStop(1, '#991b1b')
    g.fillStyle = gr
    g.beginPath()
    g.roundRect(-12, -15, 24, 30, 5)
    g.fill()
    g.strokeStyle = '#450a0a'
    g.lineWidth = 1.2
    g.stroke()
    // rolling hoops: offset by frame to fake rotation
    g.fillStyle = '#fbbf24'
    for (let k = 0; k < 3; k++) {
      const x = -12 + ((k * 8 + frame * 2) % 24)
      g.fillRect(x, -15, 2.2, 30)
    }
    // hazard stripe
    g.fillStyle = '#111827'
    g.fillRect(-12, -2, 24, 4)
  })
}

/** Spark mine: dark puck with a red light; `lit` toggles the light. */
export function mineSprite(lit: boolean) {
  return sprite(`mine|${lit}`, 26, 26, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.beginPath()
    g.arc(2, 3, 12, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#1f2937'
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.beginPath()
      g.arc(Math.cos(a) * 10, Math.sin(a) * 10, 2.6, 0, Math.PI * 2)
      g.fill()
    }
    const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 10)
    gr.addColorStop(0, '#6b7280')
    gr.addColorStop(1, '#111827')
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, 10, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = lit ? '#ef4444' : '#7f1d1d'
    g.beginPath()
    g.arc(0, 0, 4, 0, Math.PI * 2)
    g.fill()
    if (lit) {
      g.fillStyle = '#fecaca'
      g.beginPath()
      g.arc(-1, -1, 1.5, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/** Nitro canister pickup (cyan, distinct from hazards). */
export function nitroSprite() {
  return sprite('nitro', 22, 30, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'
    g.beginPath()
    g.roundRect(-7, -11, 18, 26, 6)
    g.fill()
    const gr = g.createLinearGradient(-9, 0, 9, 0)
    gr.addColorStop(0, '#0e7490')
    gr.addColorStop(0.4, '#22d3ee')
    gr.addColorStop(0.6, '#cffafe')
    gr.addColorStop(1, '#0e7490')
    g.fillStyle = gr
    g.beginPath()
    g.roundRect(-9, -11, 18, 24, 6)
    g.fill()
    g.fillStyle = '#e2e8f0'
    g.fillRect(-4, -15, 8, 5)
    g.fillStyle = '#1e3a8a'
    g.beginPath()
    g.moveTo(1, -7)
    g.lineTo(-4, 1)
    g.lineTo(0, 1)
    g.lineTo(-2, 8)
    g.lineTo(4, -1)
    g.lineTo(0, -1)
    g.closePath()
    g.fill()
  })
}

export function sakuraSprite() {
  return sprite('sakura', 48, 48, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.beginPath()
    g.arc(5, 6, 20, 0, Math.PI * 2)
    g.fill()
    const blobs: [number, number, number, string][] = [
      [-8, 4, 12, '#f472b6'],
      [8, 6, 11, '#f472b6'],
      [0, -8, 13, '#f9a8d4'],
      [-6, -4, 9, '#fbcfe8'],
      [6, -2, 8, '#fce7f3'],
    ]
    for (const [x, y, r, c] of blobs) {
      g.fillStyle = c
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#ffffff'
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1
      g.beginPath()
      g.arc(Math.cos(a) * 10, Math.sin(a) * 9 - 2, 1.4, 0, Math.PI * 2)
      g.fill()
    }
  })
}

export function lavaSprite() {
  return sprite('lava', 60, 40, (g) => {
    g.fillStyle = '#1c1210'
    g.beginPath()
    g.ellipse(0, 0, 30, 19, 0, 0, Math.PI * 2)
    g.fill()
    const gr = g.createRadialGradient(-4, -2, 2, 0, 0, 24)
    gr.addColorStop(0, '#fef08a')
    gr.addColorStop(0.35, '#fb923c')
    gr.addColorStop(0.8, '#dc2626')
    gr.addColorStop(1, 'rgba(127,29,29,0)')
    g.fillStyle = gr
    g.beginPath()
    g.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#292524'
    g.beginPath()
    g.ellipse(8, 3, 6, 4, 0.3, 0, Math.PI * 2)
    g.ellipse(-10, -4, 4, 3, 0, 0, Math.PI * 2)
    g.fill()
  })
}

/** Screen-space ambient particles, stateless (derived from time). */
export function drawAmbient(ctx: CanvasRenderingContext2D, kind: Ambient, W: number, H: number, t: number) {
  if (kind === 'none') return
  for (let i = 0; i < 28; i++) {
    const s1 = ((i * 9301 + 49297) % 233280) / 233280
    const s2 = ((i * 4096 + 150889) % 714025) / 714025
    const s3 = ((i * 7919) % 1000) / 1000
    let x = s1 * W
    let y = s2 * H
    if (kind === 'snow') {
      y = (y + t * (40 + s3 * 40)) % H
      x = (x + Math.sin(t + i) * 14 + W) % W
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(x, y, 1.5 + s3 * 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'dust') {
      x = (x + t * (30 + s3 * 30)) % W
      y = (y + Math.sin(t * 0.8 + i) * 12 + H) % H
      ctx.fillStyle = 'rgba(180,83,9,0.22)'
      ctx.beginPath()
      ctx.arc(x, y, 2 + s3 * 3, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'leaves' || kind === 'petals') {
      y = (y + t * (45 + s3 * 30)) % H
      x = (x + Math.sin(t * 1.3 + i) * 26 + t * 14 + W * 100) % W
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(t * 2 + i)
      if (kind === 'petals') ctx.fillStyle = i % 2 ? 'rgba(249,168,212,0.9)' : 'rgba(253,242,248,0.9)'
      else ctx.fillStyle = i % 2 ? 'rgba(234,88,12,0.8)' : 'rgba(250,204,21,0.8)'
      ctx.beginPath()
      ctx.ellipse(0, 0, kind === 'petals' ? 3.5 : 4.5, 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      y = H - ((H - y + t * (50 + s3 * 60)) % H)
      x = (x + Math.sin(t * 1.5 + i) * 14 + W) % W
      const a = 0.5 + 0.5 * Math.sin(t * 6 + i)
      ctx.fillStyle = `rgba(251,146,60,${0.35 + a * 0.55})`
      ctx.beginPath()
      ctx.arc(x, y, 1.4 + s3 * 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
