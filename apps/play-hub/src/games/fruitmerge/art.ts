/** Vector fruit art for Fruit Drop. Everything is drawn around (0,0) with physics radius r. */

export type FruitDef = { name: string; r: number; pts: number; colors: string[] }

export const FRUITS: FruitDef[] = [
  { name: 'Cherry', r: 13, pts: 1, colors: ['#e11d48', '#fda4af', '#22c55e'] },
  { name: 'Strawberry', r: 17, pts: 3, colors: ['#ef4444', '#fecaca', '#fde047'] },
  { name: 'Grape', r: 21, pts: 6, colors: ['#9333ea', '#d8b4fe', '#a3e635'] },
  { name: 'Orange', r: 26, pts: 10, colors: ['#f97316', '#fed7aa', '#fde047'] },
  { name: 'Apple', r: 31, pts: 15, colors: ['#dc2626', '#fecaca', '#86efac'] },
  { name: 'Pear', r: 36, pts: 21, colors: ['#a3e635', '#fef9c3', '#65a30d'] },
  { name: 'Peach', r: 42, pts: 28, colors: ['#fb923c', '#ffe4e6', '#f43f5e'] },
  { name: 'Pineapple', r: 49, pts: 36, colors: ['#facc15', '#fef08a', '#16a34a'] },
  { name: 'Melon', r: 57, pts: 45, colors: ['#86efac', '#f0fdf4', '#15803d'] },
  { name: 'Watermelon', r: 66, pts: 55, colors: ['#16a34a', '#86efac', '#ef4444'] },
  { name: 'Golden Melon', r: 76, pts: 66, colors: ['#fbbf24', '#fffbeb', '#ffffff'] },
]
export const MAX_TIER = FRUITS.length - 1

type G = CanvasRenderingContext2D

function shade(g: G, r: number, c0: string, c1: string, c2: string, ox = -0.35, oy = -0.4) {
  const gr = g.createRadialGradient(ox * r, oy * r, r * 0.08, 0, 0, r * 1.12)
  gr.addColorStop(0, c0)
  gr.addColorStop(0.5, c1)
  gr.addColorStop(1, c2)
  return gr
}

function shine(g: G, r: number, x = -0.38, y = -0.42, a = 0.55) {
  g.fillStyle = `rgba(255,255,255,${a})`
  g.beginPath()
  g.ellipse(x * r, y * r, r * 0.2, r * 0.11, -0.7, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = `rgba(255,255,255,${a * 0.8})`
  g.beginPath()
  g.arc((x + 0.2) * r, (y - 0.1) * r, r * 0.05, 0, Math.PI * 2)
  g.fill()
}

function rim(g: G, w: number, c = 'rgba(0,0,0,0.28)') {
  g.strokeStyle = c
  g.lineWidth = w
  g.stroke()
}

function leaf(g: G, x: number, y: number, len: number, ang: number, c0 = '#4ade80', c1 = '#15803d') {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  const gr = g.createLinearGradient(0, -len * 0.3, 0, len * 0.3)
  gr.addColorStop(0, c0)
  gr.addColorStop(1, c1)
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0)
  g.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0)
  g.fill()
  g.strokeStyle = 'rgba(20,83,45,0.6)'
  g.lineWidth = Math.max(0.6, len * 0.06)
  g.beginPath()
  g.moveTo(len * 0.1, 0)
  g.lineTo(len * 0.85, 0)
  g.stroke()
  g.restore()
}

function stem(g: G, x0: number, y0: number, x1: number, y1: number, w: number) {
  g.strokeStyle = '#78350f'
  g.lineWidth = w
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo((x0 + x1) / 2 + w, (y0 + y1) / 2, x1, y1)
  g.stroke()
}

/** Draws one fruit body (no face). */
export function drawFruit(g: G, tier: number, r: number) {
  const lw = Math.max(1, r * 0.06)
  switch (tier) {
    case 0: {
      stem(g, 0, -r * 0.7, r * 0.35, -r * 1.25, lw * 1.2)
      leaf(g, r * 0.3, -r * 1.15, r * 0.6, -0.3)
      g.fillStyle = shade(g, r, '#fecdd3', '#e11d48', '#7f1d1d')
      g.beginPath()
      g.arc(0, r * 0.05, r * 0.95, 0, Math.PI * 2)
      g.fill()
      rim(g, lw)
      shine(g, r, -0.35, -0.3)
      break
    }
    case 1: {
      g.fillStyle = shade(g, r, '#fecaca', '#ef4444', '#991b1b')
      g.beginPath()
      g.moveTo(0, r * 1.02)
      g.bezierCurveTo(-r * 0.6, r * 0.75, -r * 1.05, r * 0.05, -r * 0.92, -r * 0.45)
      g.bezierCurveTo(-r * 0.8, -r * 0.9, r * 0.8, -r * 0.9, r * 0.92, -r * 0.45)
      g.bezierCurveTo(r * 1.05, r * 0.05, r * 0.6, r * 0.75, 0, r * 1.02)
      g.fill()
      rim(g, lw)
      g.fillStyle = '#fde047'
      for (let i = 0; i < 14; i++) {
        const row = Math.floor(i / 4)
        const col = i % 4
        const x = (col - 1.5 + (row % 2) * 0.5) * r * 0.42
        const y = (row - 0.6) * r * 0.42
        if (Math.hypot(x, y * 1.2) > r * 0.82) continue
        g.beginPath()
        g.ellipse(x, y, r * 0.045, r * 0.075, 0, 0, Math.PI * 2)
        g.fill()
      }
      for (let i = 0; i < 5; i++) leaf(g, 0, -r * 0.72, r * 0.55, -Math.PI / 2 + (i - 2) * 0.62, '#4ade80', '#166534')
      shine(g, r, -0.42, -0.25, 0.45)
      break
    }
    case 2: {
      stem(g, 0, -r * 0.6, r * 0.1, -r * 1.15, lw * 1.3)
      leaf(g, r * 0.08, -r * 0.95, r * 0.75, -0.5, '#bef264', '#4d7c0f')
      const balls: [number, number][] = [[-0.58, -0.38], [0, -0.46], [0.58, -0.38], [-0.3, 0.16], [0.3, 0.16], [0, 0.64]]
      for (const [bx, by] of balls) {
        g.save()
        g.translate(bx * r, by * r)
        const br = r * 0.4
        g.fillStyle = shade(g, br, '#f3e8ff', '#9333ea', '#3b0764')
        g.beginPath()
        g.arc(0, 0, br, 0, Math.PI * 2)
        g.fill()
        rim(g, lw * 0.8, 'rgba(46,16,101,0.45)')
        g.fillStyle = 'rgba(255,255,255,0.5)'
        g.beginPath()
        g.ellipse(-br * 0.35, -br * 0.38, br * 0.22, br * 0.12, -0.7, 0, Math.PI * 2)
        g.fill()
        g.restore()
      }
      break
    }
    case 3: {
      g.fillStyle = shade(g, r, '#ffedd5', '#f97316', '#9a3412')
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.fill()
      rim(g, lw)
      g.fillStyle = 'rgba(154,52,18,0.25)'
      for (let i = 0; i < 26; i++) {
        const a = i * 2.39
        const d = r * (0.25 + ((i * 7) % 10) / 14)
        if (d > r * 0.9) continue
        g.beginPath()
        g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.03, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#4d7c0f'
      g.beginPath()
      g.arc(0, -r * 0.9, r * 0.09, 0, Math.PI * 2)
      g.fill()
      leaf(g, r * 0.05, -r * 0.92, r * 0.55, -0.35)
      shine(g, r)
      break
    }
    case 4: {
      g.fillStyle = shade(g, r, '#fee2e2', '#dc2626', '#7f1d1d')
      g.beginPath()
      g.moveTo(0, -r * 0.62)
      g.bezierCurveTo(r * 0.55, -r * 1.05, r * 1.12, -r * 0.5, r * 0.98, r * 0.18)
      g.bezierCurveTo(r * 0.85, r * 0.8, r * 0.35, r * 1.05, 0, r * 0.88)
      g.bezierCurveTo(-r * 0.35, r * 1.05, -r * 0.85, r * 0.8, -r * 0.98, r * 0.18)
      g.bezierCurveTo(-r * 1.12, -r * 0.5, -r * 0.55, -r * 1.05, 0, -r * 0.62)
      g.fill()
      rim(g, lw)
      const bl = g.createRadialGradient(r * 0.45, r * 0.35, 0, r * 0.45, r * 0.35, r * 0.6)
      bl.addColorStop(0, 'rgba(253,224,71,0.45)')
      bl.addColorStop(1, 'rgba(253,224,71,0)')
      g.fillStyle = bl
      g.fill()
      stem(g, 0, -r * 0.55, r * 0.12, -r * 1.05, lw * 1.4)
      leaf(g, r * 0.1, -r * 0.88, r * 0.7, -0.45)
      shine(g, r, -0.45, -0.32)
      break
    }
    case 5: {
      g.fillStyle = shade(g, r, '#fefce8', '#bef264', '#4d7c0f')
      g.beginPath()
      g.moveTo(0, -r * 0.95)
      g.bezierCurveTo(r * 0.42, -r * 0.95, r * 0.45, -r * 0.35, r * 0.7, -r * 0.05)
      g.bezierCurveTo(r * 1.08, r * 0.4, r * 0.85, r * 1.0, 0, r * 1.0)
      g.bezierCurveTo(-r * 0.85, r * 1.0, -r * 1.08, r * 0.4, -r * 0.7, -r * 0.05)
      g.bezierCurveTo(-r * 0.45, -r * 0.35, -r * 0.42, -r * 0.95, 0, -r * 0.95)
      g.fill()
      rim(g, lw)
      g.fillStyle = 'rgba(120,53,15,0.28)'
      for (let i = 0; i < 16; i++) {
        const a = i * 2.2
        const d = r * (0.2 + ((i * 5) % 9) / 13)
        g.beginPath()
        g.arc(Math.cos(a) * d * 0.8, r * 0.25 + Math.sin(a) * d * 0.7, r * 0.025, 0, Math.PI * 2)
        g.fill()
      }
      stem(g, 0, -r * 0.9, -r * 0.08, -r * 1.25, lw * 1.4)
      leaf(g, -r * 0.05, -r * 1.12, r * 0.6, -0.2)
      shine(g, r, -0.3, -0.45, 0.5)
      break
    }
    case 6: {
      g.fillStyle = shade(g, r, '#fff1f2', '#fdba74', '#e11d48', -0.2, -0.45)
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.fill()
      rim(g, lw)
      const bl = g.createRadialGradient(r * 0.4, r * 0.3, 0, r * 0.4, r * 0.3, r * 0.8)
      bl.addColorStop(0, 'rgba(244,63,94,0.4)')
      bl.addColorStop(1, 'rgba(244,63,94,0)')
      g.fillStyle = bl
      g.fill()
      g.strokeStyle = 'rgba(190,18,60,0.35)'
      g.lineWidth = lw * 1.2
      g.beginPath()
      g.moveTo(r * 0.05, -r * 0.92)
      g.bezierCurveTo(r * 0.45, -r * 0.4, r * 0.45, r * 0.4, r * 0.1, r * 0.95)
      g.stroke()
      leaf(g, r * 0.05, -r * 0.9, r * 0.6, -0.5)
      leaf(g, r * 0.0, -r * 0.92, r * 0.5, -2.4, '#86efac', '#166534')
      shine(g, r, -0.45, -0.35, 0.4)
      break
    }
    case 7: {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.32
        const len = r * (0.55 + (3 - Math.abs(i - 3)) * 0.1)
        g.save()
        g.translate(0, -r * 0.62)
        g.rotate(a + Math.PI / 2)
        const gr = g.createLinearGradient(0, 0, 0, -len)
        gr.addColorStop(0, '#15803d')
        gr.addColorStop(1, '#4ade80')
        g.fillStyle = gr
        g.beginPath()
        g.moveTo(-r * 0.09, 0)
        g.quadraticCurveTo(-r * 0.04, -len * 0.6, 0, -len)
        g.quadraticCurveTo(r * 0.04, -len * 0.6, r * 0.09, 0)
        g.fill()
        g.restore()
      }
      g.save()
      g.beginPath()
      g.ellipse(0, r * 0.1, r * 0.82, r * 0.9, 0, 0, Math.PI * 2)
      g.fillStyle = shade(g, r, '#fef9c3', '#facc15', '#a16207')
      g.fill()
      g.clip()
      g.strokeStyle = 'rgba(146,64,14,0.5)'
      g.lineWidth = lw
      for (let k = -4; k <= 4; k++) {
        g.beginPath()
        g.moveTo(k * r * 0.34 - r, -r)
        g.lineTo(k * r * 0.34 + r, r * 1.1)
        g.moveTo(k * r * 0.34 + r, -r)
        g.lineTo(k * r * 0.34 - r, r * 1.1)
        g.stroke()
      }
      g.fillStyle = 'rgba(120,53,15,0.55)'
      for (let yy = -4; yy <= 4; yy++) {
        for (let xx = -4; xx <= 4; xx++) {
          g.beginPath()
          g.arc(xx * r * 0.34 + (yy % 2 ? r * 0.17 : 0), yy * r * 0.34 * 0.5 + r * 0.1 + yy * r * 0.1, r * 0.035, 0, Math.PI * 2)
          g.fill()
        }
      }
      g.restore()
      g.beginPath()
      g.ellipse(0, r * 0.1, r * 0.82, r * 0.9, 0, 0, Math.PI * 2)
      rim(g, lw)
      shine(g, r, -0.35, -0.25, 0.45)
      break
    }
    case 8: {
      g.save()
      g.fillStyle = shade(g, r, '#f7fee7', '#86efac', '#166534')
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.fill()
      g.clip()
      g.strokeStyle = 'rgba(240,253,244,0.7)'
      g.lineWidth = lw * 0.7
      g.lineJoin = 'round'
      for (let k = 0; k < 9; k++) {
        g.beginPath()
        for (let s = 0; s <= 12; s++) {
          const x = -r + (s / 12) * 2 * r
          const y = -r + k * r * 0.25 + Math.sin(s * 1.7 + k) * r * 0.06
          if (s === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.stroke()
        g.beginPath()
        for (let s = 0; s <= 12; s++) {
          const y = -r + (s / 12) * 2 * r
          const x = -r + k * r * 0.25 + Math.cos(s * 1.3 + k) * r * 0.06
          if (s === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.stroke()
      }
      g.restore()
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      rim(g, lw)
      g.fillStyle = '#854d0e'
      g.beginPath()
      g.arc(0, -r * 0.94, r * 0.07, 0, Math.PI * 2)
      g.fill()
      shine(g, r)
      break
    }
    case 9: {
      g.save()
      g.fillStyle = shade(g, r, '#bbf7d0', '#22c55e', '#14532d')
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.fill()
      g.clip()
      g.fillStyle = 'rgba(20,83,45,0.85)'
      for (let k = -3; k <= 3; k++) {
        g.beginPath()
        const x0 = k * r * 0.32
        g.moveTo(x0 - r * 0.05, -r)
        for (let s = 0; s <= 10; s++) {
          const y = -r + (s / 10) * 2 * r
          const bow = Math.sin((y / r) * 1.5) * k * r * 0.05
          g.lineTo(x0 + bow + (s % 2 ? r * 0.07 : -r * 0.02), y)
        }
        for (let s = 10; s >= 0; s--) {
          const y = -r + (s / 10) * 2 * r
          const bow = Math.sin((y / r) * 1.5) * k * r * 0.05
          g.lineTo(x0 + bow + r * 0.1 + (s % 2 ? r * 0.04 : -r * 0.03), y)
        }
        g.fill()
      }
      g.restore()
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      rim(g, lw)
      g.fillStyle = '#365314'
      g.beginPath()
      g.arc(0, -r * 0.95, r * 0.06, 0, Math.PI * 2)
      g.fill()
      shine(g, r, -0.42, -0.42, 0.5)
      break
    }
    default: {
      g.save()
      g.fillStyle = shade(g, r, '#fffbeb', '#fbbf24', '#92400e')
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.fill()
      g.clip()
      g.fillStyle = 'rgba(255,251,235,0.35)'
      for (let k = -3; k <= 3; k++) {
        g.beginPath()
        g.ellipse(k * r * 0.34, 0, r * 0.07, r * 1.1, 0, 0, Math.PI * 2)
        g.fill()
      }
      g.restore()
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      rim(g, lw * 1.2, 'rgba(146,64,14,0.6)')
      // tiny crown
      g.fillStyle = '#fde047'
      g.strokeStyle = '#b45309'
      g.lineWidth = lw * 0.8
      g.beginPath()
      g.moveTo(-r * 0.3, -r * 0.9)
      g.lineTo(-r * 0.36, -r * 1.25)
      g.lineTo(-r * 0.15, -r * 1.05)
      g.lineTo(0, -r * 1.32)
      g.lineTo(r * 0.15, -r * 1.05)
      g.lineTo(r * 0.36, -r * 1.25)
      g.lineTo(r * 0.3, -r * 0.9)
      g.closePath()
      g.fill()
      g.stroke()
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.arc(0, -r * 1.0, r * 0.05, 0, Math.PI * 2)
      g.fill()
      shine(g, r, -0.4, -0.4, 0.75)
      star(g, r * 0.55, -r * 0.45, r * 0.14)
      star(g, -r * 0.6, r * 0.45, r * 0.09)
    }
  }
}

export function star(g: G, x: number, y: number, s: number, c = '#ffffff') {
  g.fillStyle = c
  g.beginPath()
  g.moveTo(x, y - s)
  g.quadraticCurveTo(x, y, x + s, y)
  g.quadraticCurveTo(x, y, x, y + s)
  g.quadraticCurveTo(x, y, x - s, y)
  g.quadraticCurveTo(x, y, x, y - s)
  g.fill()
}

export type Mood = 'happy' | 'scared' | 'squish' | 'blink' | 'wow'

/** Cute face in the fruit's local frame. */
export function drawFace(g: G, tier: number, r: number, mood: Mood) {
  const yOff = tier === 2 ? -r * 0.12 : tier === 5 ? r * 0.22 : tier === 7 ? r * 0.12 : r * 0.05
  const ex = r * (tier < 2 ? 0.34 : 0.3)
  const ey = yOff - r * 0.06
  const es = r * (tier < 2 ? 0.12 : 0.1)
  g.lineCap = 'round'
  if (mood === 'blink' || mood === 'squish') {
    g.strokeStyle = '#1f2937'
    g.lineWidth = Math.max(1.2, r * 0.06)
    g.beginPath()
    if (mood === 'squish') {
      g.moveTo(-ex - es, ey - es * 0.7)
      g.lineTo(-ex + es * 0.6, ey)
      g.lineTo(-ex - es, ey + es * 0.7)
      g.moveTo(ex + es, ey - es * 0.7)
      g.lineTo(ex - es * 0.6, ey)
      g.lineTo(ex + es, ey + es * 0.7)
    } else {
      g.moveTo(-ex - es, ey)
      g.quadraticCurveTo(-ex, ey + es * 0.8, -ex + es, ey)
      g.moveTo(ex - es, ey)
      g.quadraticCurveTo(ex, ey + es * 0.8, ex + es, ey)
    }
    g.stroke()
  } else {
    const big = mood === 'scared' || mood === 'wow' ? 1.25 : 1
    for (const sx of [-1, 1]) {
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.ellipse(sx * ex, ey, es * big, es * 1.15 * big, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#1f2937'
      g.beginPath()
      g.arc(sx * ex + (mood === 'scared' ? 0 : es * 0.15), ey + es * 0.1, es * 0.62 * (mood === 'scared' ? 0.7 : 1), 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.arc(sx * ex + es * 0.32, ey - es * 0.25, es * 0.25, 0, Math.PI * 2)
      g.fill()
    }
    if (mood === 'scared') {
      g.strokeStyle = '#1f2937'
      g.lineWidth = Math.max(1, r * 0.04)
      g.beginPath()
      g.moveTo(-ex - es, ey - es * 1.7)
      g.lineTo(-ex + es * 0.8, ey - es * 2.1)
      g.moveTo(ex + es, ey - es * 1.7)
      g.lineTo(ex - es * 0.8, ey - es * 2.1)
      g.stroke()
    }
  }
  // cheeks
  g.fillStyle = 'rgba(244,114,182,0.45)'
  for (const sx of [-1, 1]) {
    g.beginPath()
    g.ellipse(sx * (ex + es * 0.9), ey + es * 1.6, es * 0.75, es * 0.45, 0, 0, Math.PI * 2)
    g.fill()
  }
  // mouth
  g.strokeStyle = '#1f2937'
  g.fillStyle = '#7f1d1d'
  g.lineWidth = Math.max(1.1, r * 0.05)
  const my = ey + es * 1.7
  g.beginPath()
  if (mood === 'scared' || mood === 'wow') {
    g.ellipse(0, my + es * 0.2, es * 0.45, es * 0.6, 0, 0, Math.PI * 2)
    g.fill()
  } else if (mood === 'squish') {
    g.moveTo(-es * 0.7, my)
    g.lineTo(-es * 0.25, my + es * 0.4)
    g.lineTo(es * 0.25, my)
    g.lineTo(es * 0.7, my + es * 0.4)
    g.stroke()
  } else {
    g.arc(0, my - es * 0.3, es * 0.6, 0.2, Math.PI - 0.2)
    g.stroke()
  }
}

export type SpecialKind = 'bomb' | 'rainbow' | 'potion'
export const SPECIAL_R: Record<SpecialKind, number> = { bomb: 22, rainbow: 19, potion: 20 }
export const SPECIAL_NAME: Record<SpecialKind, string> = { bomb: 'Bomb', rainbow: 'Rainbow Drop', potion: 'Shrink Potion' }

export function drawSpecial(g: G, kind: SpecialKind, r: number, t: number, fuse = 0) {
  const lw = Math.max(1, r * 0.07)
  if (kind === 'bomb') {
    g.strokeStyle = '#a16207'
    g.lineWidth = lw * 1.3
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(r * 0.3, -r * 0.85)
    g.quadraticCurveTo(r * 0.55, -r * 1.35, r * 0.85, -r * 1.2)
    g.stroke()
    const flick = 0.7 + Math.sin(t * 40) * 0.3
    g.fillStyle = '#fde047'
    g.beginPath()
    g.arc(r * 0.85, -r * 1.2, r * 0.2 * flick, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f97316'
    g.beginPath()
    g.arc(r * 0.85, -r * 1.2, r * 0.11 * flick, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = shade(g, r, '#94a3b8', '#1e293b', '#020617')
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.fill()
    if (fuse > 0) {
      g.fillStyle = `rgba(239,68,68,${0.35 + Math.sin(t * 30) * 0.3})`
      g.fill()
    }
    g.fillStyle = '#334155'
    g.fillRect(r * 0.05, -r * 1.0, r * 0.5, r * 0.3)
    g.strokeStyle = '#fbbf24'
    g.lineWidth = lw
    g.beginPath()
    g.arc(0, 0, r * 0.62, Math.PI * 0.85, Math.PI * 1.35)
    g.stroke()
    shine(g, r, -0.4, -0.4, 0.5)
  } else if (kind === 'rainbow') {
    const cols = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7']
    g.save()
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.clip()
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i]
      g.beginPath()
      g.moveTo(0, 0)
      g.arc(0, 0, r * 1.1, t * 2 + (i / 6) * Math.PI * 2, t * 2 + ((i + 1) / 6) * Math.PI * 2)
      g.fill()
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r)
    gr.addColorStop(0, 'rgba(255,255,255,0.95)')
    gr.addColorStop(0.45, 'rgba(255,255,255,0.35)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(-r, -r, r * 2, r * 2)
    g.restore()
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    rim(g, lw, 'rgba(255,255,255,0.8)')
    star(g, 0, 0, r * 0.45 * (0.85 + Math.sin(t * 6) * 0.15), '#ffffff')
    shine(g, r, -0.4, -0.45, 0.7)
  } else {
    g.fillStyle = '#92400e'
    g.fillRect(-r * 0.2, -r * 1.25, r * 0.4, r * 0.32)
    g.fillStyle = 'rgba(224,242,254,0.65)'
    g.beginPath()
    g.roundRect(-r * 0.3, -r * 0.98, r * 0.6, r * 0.5, r * 0.08)
    g.fill()
    g.beginPath()
    g.arc(0, r * 0.12, r * 0.88, 0, Math.PI * 2)
    g.fill()
    g.save()
    g.beginPath()
    g.arc(0, r * 0.12, r * 0.78, 0, Math.PI * 2)
    g.clip()
    const lg = g.createLinearGradient(0, -r * 0.2, 0, r)
    lg.addColorStop(0, '#22d3ee')
    lg.addColorStop(1, '#7c3aed')
    g.fillStyle = lg
    const wave = Math.sin(t * 5) * r * 0.06
    g.beginPath()
    g.moveTo(-r, r * 0.05 + wave)
    g.quadraticCurveTo(0, -r * 0.1 - wave, r, r * 0.05 + wave)
    g.lineTo(r, r)
    g.lineTo(-r, r)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i < 3; i++) {
      const by = r * 0.8 - ((t * 0.6 + i * 0.33) % 1) * r * 0.8
      g.beginPath()
      g.arc((i - 1) * r * 0.3, by, r * 0.07, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
    g.beginPath()
    g.arc(0, r * 0.12, r * 0.88, 0, Math.PI * 2)
    rim(g, lw, 'rgba(14,116,144,0.7)')
    shine(g, r, -0.35, -0.2, 0.7)
  }
}
