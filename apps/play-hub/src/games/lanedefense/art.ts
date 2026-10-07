/** Lane Defense vector art. All drawers are centred at (0,0) with s = tile size in px. */

type G = CanvasRenderingContext2D

export type DefKind = 'pea' | 'bloom' | 'nut' | 'frost' | 'boom'
export type MonKind = 'blob' | 'cone' | 'runner' | 'brute' | 'hopper' | 'boss'

function eyes(g: G, x: number, y: number, r: number, gap: number, blink: boolean, angry = false, look = 0) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * gap
    if (blink) {
      g.strokeStyle = '#1f2937'
      g.lineWidth = Math.max(1.2, r * 0.4)
      g.beginPath()
      g.moveTo(ex - r, y)
      g.lineTo(ex + r, y)
      g.stroke()
      continue
    }
    g.fillStyle = '#fff'
    g.beginPath()
    g.ellipse(ex, y, r, r * 1.15, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#111827'
    g.beginPath()
    g.arc(ex + look * r * 0.3, y - r * 0.15, r * 0.55, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(ex + look * r * 0.3 - r * 0.2, y - r * 0.4, r * 0.2, 0, Math.PI * 2)
    g.fill()
    if (angry) {
      g.strokeStyle = '#111827'
      g.lineWidth = Math.max(1.2, r * 0.35)
      g.beginPath()
      g.moveTo(ex - r * 1.1 * sx, y - r * 1.5)
      g.lineTo(ex + r * 0.9 * sx, y - r * 1.05)
      g.stroke()
    }
  }
}

function leaf(g: G, x: number, y: number, len: number, ang: number, col: string) {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.fillStyle = col
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0)
  g.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0)
  g.fill()
  g.restore()
}

/** Defender. `t` = time for idle sway, `act` 0..1 = attack/produce pulse, `dmg` 0..1 damage taken. */
export function drawDefender(g: G, kind: DefKind, s: number, t: number, act: number, dmg: number, blink: boolean) {
  const sway = Math.sin(t * 2.2) * 0.04
  g.save()
  g.rotate(sway)
  // pot / soil mound
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(0, s * 0.32, s * 0.32, s * 0.09, 0, 0, Math.PI * 2)
  g.fill()
  switch (kind) {
    case 'pea': {
      leaf(g, 0, s * 0.28, s * 0.3, -2.6, '#15803d')
      leaf(g, 0, s * 0.28, s * 0.3, -0.5, '#16a34a')
      g.strokeStyle = '#15803d'
      g.lineWidth = s * 0.07
      g.beginPath()
      g.moveTo(0, s * 0.3)
      g.quadraticCurveTo(-s * 0.06, s * 0.12, 0, -s * 0.02)
      g.stroke()
      const sq = 1 + act * 0.12
      g.save()
      g.translate(0, -s * 0.08)
      g.scale(1 / sq, sq)
      const gr = g.createRadialGradient(-s * 0.08, -s * 0.12, s * 0.02, 0, 0, s * 0.26)
      gr.addColorStop(0, '#bef264')
      gr.addColorStop(1, '#16a34a')
      g.fillStyle = gr
      g.beginPath()
      g.arc(0, 0, s * 0.22, 0, Math.PI * 2)
      g.fill()
      // snout pointing up
      g.fillStyle = '#22c55e'
      g.beginPath()
      g.roundRect(-s * 0.09, -s * 0.36, s * 0.18, s * 0.2, s * 0.05)
      g.fill()
      g.fillStyle = '#14532d'
      g.beginPath()
      g.ellipse(0, -s * 0.36, s * 0.08, s * 0.035, 0, 0, Math.PI * 2)
      g.fill()
      eyes(g, 0, s * 0.01, s * 0.06, s * 0.09, blink)
      g.restore()
      break
    }
    case 'frost': {
      leaf(g, 0, s * 0.28, s * 0.3, -2.6, '#0e7490')
      leaf(g, 0, s * 0.28, s * 0.3, -0.5, '#0891b2')
      g.strokeStyle = '#0e7490'
      g.lineWidth = s * 0.07
      g.beginPath()
      g.moveTo(0, s * 0.3)
      g.lineTo(0, 0)
      g.stroke()
      const sq = 1 + act * 0.12
      g.save()
      g.translate(0, -s * 0.08)
      g.scale(1 / sq, sq)
      const gr = g.createRadialGradient(-s * 0.08, -s * 0.12, s * 0.02, 0, 0, s * 0.26)
      gr.addColorStop(0, '#e0f2fe')
      gr.addColorStop(1, '#0ea5e9')
      g.fillStyle = gr
      g.beginPath()
      g.arc(0, 0, s * 0.22, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#bae6fd'
      for (const a of [-0.9, -0.3, 0.3, 0.9]) {
        g.beginPath()
        g.moveTo(Math.sin(a) * s * 0.18, -Math.cos(a) * s * 0.18)
        g.lineTo(Math.sin(a) * s * 0.32, -Math.cos(a) * s * 0.32)
        g.lineTo(Math.sin(a + 0.15) * s * 0.18, -Math.cos(a + 0.15) * s * 0.18)
        g.fill()
      }
      g.fillStyle = '#38bdf8'
      g.beginPath()
      g.roundRect(-s * 0.08, -s * 0.36, s * 0.16, s * 0.18, s * 0.05)
      g.fill()
      eyes(g, 0, s * 0.01, s * 0.06, s * 0.09, blink)
      g.restore()
      break
    }
    case 'bloom': {
      g.strokeStyle = '#15803d'
      g.lineWidth = s * 0.06
      g.beginPath()
      g.moveTo(0, s * 0.3)
      g.lineTo(0, -s * 0.02)
      g.stroke()
      leaf(g, 0, s * 0.2, s * 0.24, -2.7, '#16a34a')
      leaf(g, 0, s * 0.2, s * 0.24, -0.4, '#22c55e')
      const pulse = 1 + act * 0.15
      g.save()
      g.translate(0, -s * 0.1)
      g.rotate(t * 0.6)
      g.fillStyle = '#facc15'
      for (let i = 0; i < 10; i++) {
        g.rotate((Math.PI * 2) / 10)
        g.beginPath()
        g.ellipse(0, -s * 0.2 * pulse, s * 0.06, s * 0.12, 0, 0, Math.PI * 2)
        g.fill()
      }
      g.restore()
      g.fillStyle = '#f59e0b'
      g.beginPath()
      g.arc(0, -s * 0.1, s * 0.14, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#92400e'
      eyes(g, 0, -s * 0.13, s * 0.035, s * 0.055, blink)
      g.strokeStyle = '#78350f'
      g.lineWidth = Math.max(1, s * 0.025)
      g.beginPath()
      g.arc(0, -s * 0.07, s * 0.05, 0.2, Math.PI - 0.2)
      g.stroke()
      break
    }
    case 'nut': {
      const gr = g.createRadialGradient(-s * 0.1, -s * 0.12, s * 0.05, 0, 0, s * 0.38)
      gr.addColorStop(0, '#d6a46b')
      gr.addColorStop(1, '#8b5a2b')
      g.fillStyle = gr
      g.beginPath()
      g.ellipse(0, -s * 0.02, s * 0.3, s * 0.36, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#5c3a1a'
      g.lineWidth = Math.max(1, s * 0.03)
      g.stroke()
      g.strokeStyle = 'rgba(92,58,26,0.5)'
      g.beginPath()
      g.arc(0, -s * 0.3, s * 0.18, 0.5, Math.PI - 0.5)
      g.stroke()
      eyes(g, 0, -s * 0.06, s * 0.065, s * 0.11, blink, dmg > 0.5, 0)
      g.strokeStyle = '#3f2412'
      g.lineWidth = Math.max(1.2, s * 0.03)
      g.beginPath()
      if (dmg > 0.5) g.arc(0, s * 0.16, s * 0.07, Math.PI + 0.3, -0.3)
      else g.arc(0, s * 0.08, s * 0.07, 0.3, Math.PI - 0.3)
      g.stroke()
      if (dmg > 0.33) {
        g.strokeStyle = '#3f2412'
        g.lineWidth = Math.max(1.2, s * 0.025)
        g.beginPath()
        g.moveTo(-s * 0.22, -s * 0.2)
        g.lineTo(-s * 0.12, -s * 0.12)
        g.lineTo(-s * 0.18, -s * 0.02)
        if (dmg > 0.66) {
          g.moveTo(s * 0.2, s * 0.05)
          g.lineTo(s * 0.12, s * 0.14)
          g.lineTo(s * 0.2, s * 0.24)
        }
        g.stroke()
      }
      break
    }
    case 'boom': {
      const swell = 1 + act * 0.35
      g.strokeStyle = '#15803d'
      g.lineWidth = s * 0.05
      g.beginPath()
      g.moveTo(-s * 0.12, -s * 0.05)
      g.quadraticCurveTo(0, -s * 0.4, s * 0.02, -s * 0.38)
      g.moveTo(s * 0.13, -s * 0.02)
      g.quadraticCurveTo(s * 0.05, -s * 0.35, s * 0.02, -s * 0.38)
      g.stroke()
      leaf(g, s * 0.02, -s * 0.38, s * 0.18, -0.3, '#22c55e')
      for (const [cx, cy] of [[-s * 0.13, s * 0.08], [s * 0.14, s * 0.1]]) {
        g.save()
        g.translate(cx, cy)
        g.scale(swell, swell)
        const gr = g.createRadialGradient(-s * 0.05, -s * 0.06, s * 0.02, 0, 0, s * 0.17)
        gr.addColorStop(0, '#fca5a5')
        gr.addColorStop(1, act > 0.5 && Math.sin(t * 40) > 0 ? '#fde047' : '#dc2626')
        g.fillStyle = gr
        g.beginPath()
        g.arc(0, 0, s * 0.15, 0, Math.PI * 2)
        g.fill()
        eyes(g, 0, -s * 0.01, s * 0.035, s * 0.05, false, true)
        g.restore()
      }
      break
    }
  }
  g.restore()
}

const MON_COL: Record<MonKind, [string, string, string]> = {
  blob: ['#c4b5fd', '#8b5cf6', '#4c1d95'],
  cone: ['#c4b5fd', '#8b5cf6', '#4c1d95'],
  runner: ['#fca5a5', '#ef4444', '#7f1d1d'],
  brute: ['#86efac', '#16a34a', '#14532d'],
  hopper: ['#fde68a', '#f59e0b', '#78350f'],
  boss: ['#a78bfa', '#5b21b6', '#2e1065'],
}

/** Monster walking down the lane (toward +y). `step` animates the gait, `bite` 0..1 jaw. */
export function drawMonster(g: G, kind: MonKind, s: number, step: number, bite: number, frozen: boolean, flash: boolean, windup = 0) {
  const big = kind === 'boss' ? 1.7 : kind === 'brute' ? 1.2 : kind === 'runner' ? 0.8 : 1
  const R = s * 0.27 * big
  const col = MON_COL[kind]
  const sq = Math.sin(step) * 0.08
  g.save()
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(0, R * 0.95, R * 0.9, R * 0.25, 0, 0, Math.PI * 2)
  g.fill()
  // feet
  g.fillStyle = col[2]
  for (const sx of [-1, 1]) {
    const lift = Math.max(0, Math.sin(step + (sx > 0 ? Math.PI : 0))) * R * 0.2
    g.beginPath()
    g.ellipse(sx * R * 0.45, R * 0.85 - lift, R * 0.22, R * 0.14, 0, 0, Math.PI * 2)
    g.fill()
  }
  if (kind === 'hopper') {
    g.strokeStyle = '#64748b'
    g.lineWidth = Math.max(1.5, R * 0.12)
    g.beginPath()
    for (let i = 0; i < 4; i++) {
      g.moveTo(-R * 0.3, R * 0.55 + i * R * 0.1)
      g.lineTo(R * 0.3, R * 0.6 + i * R * 0.1)
    }
    g.stroke()
  }
  g.scale(1 + sq, 1 - sq)
  const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1)
  gr.addColorStop(0, frozen ? '#e0f2fe' : col[0])
  gr.addColorStop(0.6, frozen ? '#7dd3fc' : col[1])
  gr.addColorStop(1, frozen ? '#0369a1' : col[2])
  g.beginPath()
  if (kind === 'blob' || kind === 'cone' || kind === 'boss') {
    g.moveTo(-R, R * 0.6)
    g.bezierCurveTo(-R * 1.15, -R * 0.4, -R * 0.6, -R * 1.1, 0, -R * 1.05)
    g.bezierCurveTo(R * 0.6, -R * 1.1, R * 1.15, -R * 0.4, R, R * 0.6)
    g.quadraticCurveTo(0, R * 0.95, -R, R * 0.6)
  } else if (kind === 'runner') {
    g.ellipse(0, 0, R * 0.85, R, 0, 0, Math.PI * 2)
  } else {
    g.roundRect(-R, -R * 0.95, R * 2, R * 1.75, R * 0.55)
  }
  g.fillStyle = gr
  g.fill()
  if (flash) {
    g.fillStyle = 'rgba(255,255,255,0.65)'
    g.fill()
  }
  // arms
  g.strokeStyle = frozen ? '#0369a1' : col[2]
  g.lineWidth = Math.max(2, R * 0.2)
  g.lineCap = 'round'
  const reach = bite * R * 0.4
  g.beginPath()
  g.moveTo(-R * 0.85, R * 0.1)
  g.lineTo(-R * 1.05, R * 0.45 + reach)
  g.moveTo(R * 0.85, R * 0.1)
  g.lineTo(R * 1.05, R * 0.45 + reach)
  g.stroke()
  // face (looking down the lane)
  eyes(g, 0, -R * 0.15, R * 0.24, R * 0.36, false, kind !== 'blob' && kind !== 'hopper', 0)
  g.fillStyle = '#1f2937'
  g.beginPath()
  g.ellipse(0, R * 0.35, R * 0.35, R * (0.1 + bite * 0.18), 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fff'
  g.beginPath()
  g.moveTo(-R * 0.22, R * 0.28)
  g.lineTo(-R * 0.14, R * 0.4)
  g.lineTo(-R * 0.06, R * 0.28)
  g.moveTo(R * 0.06, R * 0.28)
  g.lineTo(R * 0.14, R * 0.4)
  g.lineTo(R * 0.22, R * 0.28)
  g.fill()
  // headgear
  if (kind === 'cone') {
    g.fillStyle = '#f97316'
    g.beginPath()
    g.moveTo(-R * 0.55, -R * 0.75)
    g.lineTo(0, -R * 1.85)
    g.lineTo(R * 0.55, -R * 0.75)
    g.closePath()
    g.fill()
    g.fillStyle = '#fff'
    g.fillRect(-R * 0.36, -R * 1.2, R * 0.72, R * 0.14)
    g.fillStyle = '#ea580c'
    g.fillRect(-R * 0.7, -R * 0.82, R * 1.4, R * 0.14)
  } else if (kind === 'brute') {
    g.fillStyle = '#94a3b8'
    g.beginPath()
    g.moveTo(-R * 0.75, -R * 0.75)
    g.lineTo(-R * 0.6, -R * 1.45)
    g.lineTo(R * 0.6, -R * 1.45)
    g.lineTo(R * 0.75, -R * 0.75)
    g.closePath()
    g.fill()
    g.fillStyle = '#cbd5e1'
    g.fillRect(-R * 0.62, -R * 1.42, R * 0.25, R * 0.6)
    g.strokeStyle = '#475569'
    g.lineWidth = 1.5
    g.stroke()
  } else if (kind === 'runner') {
    g.fillStyle = '#7f1d1d'
    for (const sx of [-1, 1]) {
      g.beginPath()
      g.moveTo(sx * R * 0.35, -R * 0.8)
      g.lineTo(sx * R * 0.65, -R * 1.35)
      g.lineTo(sx * R * 0.6, -R * 0.7)
      g.fill()
    }
  } else if (kind === 'boss') {
    g.fillStyle = '#fbbf24'
    g.beginPath()
    g.moveTo(-R * 0.6, -R * 0.85)
    g.lineTo(-R * 0.6, -R * 1.35)
    g.lineTo(-R * 0.3, -R * 1.1)
    g.lineTo(0, -R * 1.45)
    g.lineTo(R * 0.3, -R * 1.1)
    g.lineTo(R * 0.6, -R * 1.35)
    g.lineTo(R * 0.6, -R * 0.85)
    g.closePath()
    g.fill()
    g.fillStyle = '#ef4444'
    g.beginPath()
    g.arc(0, -R * 1.05, R * 0.08, 0, Math.PI * 2)
    g.fill()
    // club raised during wind-up
    g.save()
    g.translate(R * 1.05, R * 0.3)
    g.rotate(-0.4 - windup * 1.6)
    g.fillStyle = '#78350f'
    g.beginPath()
    g.roundRect(-R * 0.1, -R * 1.2, R * 0.2, R * 1.2, R * 0.08)
    g.fill()
    g.fillStyle = '#92400e'
    g.beginPath()
    g.ellipse(0, -R * 1.25, R * 0.25, R * 0.35, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  g.restore()
}

export function drawOrb(g: G, x: number, y: number, r: number, t: number) {
  const gl = g.createRadialGradient(x, y, 0, x, y, r * 2.2)
  gl.addColorStop(0, 'rgba(253,224,71,0.6)')
  gl.addColorStop(1, 'rgba(253,224,71,0)')
  g.fillStyle = gl
  g.beginPath()
  g.arc(x, y, r * 2.2, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.translate(x, y)
  g.rotate(t * 1.5)
  g.fillStyle = '#fde047'
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4)
    g.beginPath()
    g.moveTo(-r * 0.25, -r * 0.9)
    g.lineTo(0, -r * 1.5)
    g.lineTo(r * 0.25, -r * 0.9)
    g.fill()
  }
  g.restore()
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
  gr.addColorStop(0, '#fffbeb')
  gr.addColorStop(0.5, '#fde047')
  gr.addColorStop(1, '#f59e0b')
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#92400e'
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.1, r * 0.1, 0, Math.PI * 2)
  g.arc(x + r * 0.3, y - r * 0.1, r * 0.1, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#92400e'
  g.lineWidth = Math.max(1, r * 0.12)
  g.beginPath()
  g.arc(x, y + r * 0.05, r * 0.28, 0.3, Math.PI - 0.3)
  g.stroke()
}

export function drawMower(g: G, x: number, y: number, s: number, t: number, running: boolean) {
  g.save()
  g.translate(x, y)
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(0, s * 0.18, s * 0.32, s * 0.08, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#dc2626'
  g.beginPath()
  g.roundRect(-s * 0.28, -s * 0.12, s * 0.56, s * 0.26, s * 0.08)
  g.fill()
  g.fillStyle = '#fca5a5'
  g.fillRect(-s * 0.22, -s * 0.1, s * 0.44, s * 0.06)
  g.fillStyle = '#1f2937'
  for (const sx of [-1, 1]) {
    g.beginPath()
    g.arc(sx * s * 0.22, s * 0.15, s * 0.08, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = '#94a3b8'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-s * 0.15, s * 0.12)
  g.lineTo(-s * 0.2, s * 0.38)
  g.lineTo(s * 0.2, s * 0.38)
  g.lineTo(s * 0.15, s * 0.12)
  g.stroke()
  if (running) {
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const a = t * 30 + i * 2.1
      g.beginPath()
      g.moveTo(Math.cos(a) * s * 0.2, -s * 0.16 + Math.sin(a) * s * 0.04)
      g.lineTo(Math.cos(a + 0.6) * s * 0.2, -s * 0.16 + Math.sin(a + 0.6) * s * 0.04)
      g.stroke()
    }
  }
  g.restore()
}
