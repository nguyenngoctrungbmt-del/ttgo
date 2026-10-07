/** Vector art for Blade Slash: fruit sprites (cached), bombs and specials. */

export type FruitDef = { name: string; juice: string; flesh: string; seed?: string }

export const FRUITS: FruitDef[] = [
  { name: 'melon', juice: '#ef4444', flesh: '#f87171', seed: '#1f2937' },
  { name: 'orange', juice: '#fb923c', flesh: '#fdba74' },
  { name: 'apple', juice: '#fecaca', flesh: '#fef3c7', seed: '#78350f' },
  { name: 'pineapple', juice: '#facc15', flesh: '#fde68a' },
  { name: 'kiwi', juice: '#84cc16', flesh: '#a3e635', seed: '#111827' },
  { name: 'lemon', juice: '#fde047', flesh: '#fef9c3' },
  { name: 'peach', juice: '#fdba74', flesh: '#fed7aa', seed: '#9a3412' },
  { name: 'grape', juice: '#a855f7', flesh: '#d8b4fe' },
  { name: 'coconut', juice: '#f5f5f4', flesh: '#fafaf9' },
  { name: 'berry', juice: '#e11d48', flesh: '#fda4af' },
]

const BASE = 48
const cache = new Map<number, HTMLCanvasElement>()

function shine(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.55) {
  ctx.fillStyle = `rgba(255,255,255,${a})`
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, -0.6, 0, Math.PI * 2)
  ctx.fill()
}

function radial(ctx: CanvasRenderingContext2D, r: number, c0: string, c1: string) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1)
  g.addColorStop(0, c0)
  g.addColorStop(1, c1)
  return g
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, color = '#22c55e') {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0)
  ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(len * 0.85, 0)
  ctx.stroke()
  ctx.restore()
}

function paintFruit(ctx: CanvasRenderingContext2D, i: number, r: number) {
  ctx.lineWidth = r * 0.06
  ctx.lineJoin = 'round'
  // soft drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(r * 0.08, r * 0.14, r * 0.98, r * 0.95, 0, 0, Math.PI * 2)
  ctx.fill()
  switch (FRUITS[i].name) {
    case 'melon': {
      ctx.fillStyle = radial(ctx, r, '#4ade80', '#14532d')
      ctx.strokeStyle = '#052e16'
      ctx.beginPath()
      ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = r * 0.14
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath()
        for (let s = -6; s <= 6; s++) {
          const y = (s / 6) * r
          const x = k * r * 0.42 + (s % 2 ? r * 0.06 : -r * 0.06)
          if (s === -6) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
      shine(ctx, -r * 0.4, -r * 0.4, r * 0.28, r * 0.14)
      break
    }
    case 'orange': {
      ctx.fillStyle = radial(ctx, r, '#fed7aa', '#ea580c')
      ctx.strokeStyle = '#9a3412'
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(154,52,18,0.35)'
      for (let k = 0; k < 18; k++) {
        const a = k * 2.4
        const d = ((k * 37) % 10) / 10 * r * 0.75
        ctx.beginPath()
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.035, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#4d7c0f'
      ctx.beginPath()
      ctx.arc(0, -r * 0.9, r * 0.09, 0, Math.PI * 2)
      ctx.fill()
      leaf(ctx, 0, -r * 0.92, r * 0.5, -0.5)
      shine(ctx, -r * 0.38, -r * 0.38, r * 0.26, r * 0.13)
      break
    }
    case 'apple': {
      ctx.fillStyle = radial(ctx, r, '#fca5a5', '#b91c1c')
      ctx.strokeStyle = '#7f1d1d'
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.62)
      ctx.bezierCurveTo(r * 0.6, -r * 1.05, r * 1.15, -r * 0.4, r * 0.88, r * 0.35)
      ctx.bezierCurveTo(r * 0.7, r * 0.9, r * 0.25, r * 1.0, 0, r * 0.82)
      ctx.bezierCurveTo(-r * 0.25, r * 1.0, -r * 0.7, r * 0.9, -r * 0.88, r * 0.35)
      ctx.bezierCurveTo(-r * 1.15, -r * 0.4, -r * 0.6, -r * 1.05, 0, -r * 0.62)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = r * 0.1
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.55)
      ctx.quadraticCurveTo(r * 0.05, -r * 0.9, r * 0.18, -r * 1.05)
      ctx.stroke()
      leaf(ctx, r * 0.12, -r * 0.85, r * 0.5, -0.35)
      shine(ctx, -r * 0.42, -r * 0.3, r * 0.22, r * 0.12)
      break
    }
    case 'pineapple': {
      for (let k = -2; k <= 2; k++) leaf(ctx, k * r * 0.12, -r * 0.7, r * (0.7 - Math.abs(k) * 0.1), -Math.PI / 2 + k * 0.35, k % 2 ? '#15803d' : '#22c55e')
      ctx.fillStyle = radial(ctx, r, '#fde68a', '#ca8a04')
      ctx.strokeStyle = '#854d0e'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.12, r * 0.72, r * 0.86, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = 'rgba(133,77,14,0.6)'
      ctx.lineWidth = r * 0.05
      for (let k = -4; k <= 4; k++) {
        ctx.beginPath()
        ctx.moveTo(k * r * 0.3 - r, -r)
        ctx.lineTo(k * r * 0.3 + r, r * 1.2)
        ctx.moveTo(k * r * 0.3 + r, -r)
        ctx.lineTo(k * r * 0.3 - r, r * 1.2)
        ctx.stroke()
      }
      ctx.restore()
      shine(ctx, -r * 0.3, -r * 0.15, r * 0.16, r * 0.1)
      break
    }
    case 'kiwi': {
      ctx.fillStyle = radial(ctx, r, '#a16207', '#57340f')
      ctx.strokeStyle = '#3f2307'
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(253,230,138,0.35)'
      ctx.lineWidth = 1
      for (let k = 0; k < 26; k++) {
        const a = k * 2.1
        const d = ((k * 53) % 10) / 10 * r * 0.75
        const x = Math.cos(a) * d
        const y = Math.sin(a) * d * 0.8
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + r * 0.06, y - r * 0.05)
        ctx.stroke()
      }
      // Cut-open end showing the green flesh so it reads as a kiwi.
      ctx.save()
      ctx.translate(r * 0.42, r * 0.12)
      ctx.rotate(0.3)
      ctx.fillStyle = '#84cc16'
      ctx.strokeStyle = '#d9f99d'
      ctx.lineWidth = r * 0.06
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 0.42, r * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#f7fee7'
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 0.12, r * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111827'
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.34, r * 0.035, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      shine(ctx, -r * 0.38, -r * 0.32, r * 0.22, r * 0.1, 0.3)
      break
    }
    case 'lemon': {
      ctx.fillStyle = radial(ctx, r, '#fef9c3', '#eab308')
      ctx.strokeStyle = '#a16207'
      ctx.beginPath()
      ctx.moveTo(-r * 1.02, 0)
      ctx.bezierCurveTo(-r * 0.8, -r * 0.95, r * 0.8, -r * 0.95, r * 1.02, 0)
      ctx.bezierCurveTo(r * 0.8, r * 0.95, -r * 0.8, r * 0.95, -r * 1.02, 0)
      ctx.fill()
      ctx.stroke()
      shine(ctx, -r * 0.35, -r * 0.35, r * 0.3, r * 0.12)
      break
    }
    case 'peach': {
      ctx.fillStyle = radial(ctx, r, '#fed7aa', '#f97316')
      ctx.strokeStyle = '#c2410c'
      ctx.beginPath()
      ctx.arc(0, r * 0.05, r * 0.92, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(225,29,72,0.35)'
      ctx.beginPath()
      ctx.arc(r * 0.3, r * 0.25, r * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(154,52,18,0.55)'
      ctx.lineWidth = r * 0.06
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.82)
      ctx.quadraticCurveTo(-r * 0.35, 0, 0, r * 0.9)
      ctx.stroke()
      leaf(ctx, 0, -r * 0.85, r * 0.55, -0.7)
      shine(ctx, -r * 0.45, -r * 0.3, r * 0.2, r * 0.12)
      break
    }
    case 'grape': {
      const pts = [
        [0, -0.55], [-0.42, -0.45], [0.42, -0.45], [-0.62, -0.05], [-0.2, -0.1], [0.22, -0.1], [0.62, -0.05],
        [-0.4, 0.3], [0, 0.3], [0.4, 0.3], [-0.2, 0.65], [0.2, 0.65],
      ]
      ctx.strokeStyle = '#3b0764'
      for (const [px, py] of pts) {
        ctx.fillStyle = radial(ctx, r * 0.3, '#e9d5ff', '#7e22ce')
        ctx.save()
        ctx.translate(px * r, py * r)
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = r * 0.04
        ctx.stroke()
        shine(ctx, -r * 0.1, -r * 0.1, r * 0.08, r * 0.04, 0.6)
        ctx.restore()
      }
      leaf(ctx, 0, -r * 0.82, r * 0.6, -0.3)
      break
    }
    case 'coconut': {
      ctx.fillStyle = radial(ctx, r, '#a8723f', '#3f2307')
      ctx.strokeStyle = '#1c0f03'
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(253,230,138,0.25)'
      ctx.lineWidth = r * 0.04
      for (let k = 0; k < 7; k++) {
        ctx.beginPath()
        ctx.arc(0, 0, r * (0.25 + k * 0.1), k, k + 1.4)
        ctx.stroke()
      }
      ctx.fillStyle = '#1c0f03'
      for (const [px, py] of [[-0.18, -0.4], [0.18, -0.4], [0, -0.12]]) {
        ctx.beginPath()
        ctx.arc(px * r, py * r, r * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
      shine(ctx, -r * 0.4, -r * 0.35, r * 0.2, r * 0.1, 0.25)
      break
    }
    default: {
      // strawberry
      ctx.fillStyle = radial(ctx, r, '#fda4af', '#be123c')
      ctx.strokeStyle = '#881337'
      ctx.beginPath()
      ctx.moveTo(0, r * 0.98)
      ctx.bezierCurveTo(-r * 0.6, r * 0.7, -r * 1.05, -r * 0.1, -r * 0.8, -r * 0.55)
      ctx.quadraticCurveTo(0, -r * 0.95, r * 0.8, -r * 0.55)
      ctx.bezierCurveTo(r * 1.05, -r * 0.1, r * 0.6, r * 0.7, 0, r * 0.98)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fef08a'
      for (let row = 0; row < 4; row++) {
        for (let c = -2; c <= 2; c++) {
          const y = -r * 0.25 + row * r * 0.28
          const x = c * r * 0.28 * (1 - row * 0.18) + (row % 2 ? r * 0.12 : 0)
          ctx.beginPath()
          ctx.ellipse(x, y, r * 0.035, r * 0.06, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      for (let k = -2; k <= 2; k++) leaf(ctx, 0, -r * 0.62, r * 0.45, -Math.PI / 2 + k * 0.6, '#16a34a')
      shine(ctx, -r * 0.38, -r * 0.2, r * 0.16, r * 0.1, 0.45)
    }
  }
}

/** Fruit sprite canvas sized for radius BASE; draw it scaled with fruitDraw. */
function fruitSprite(i: number): HTMLCanvasElement {
  let c = cache.get(i)
  if (c) return c
  c = document.createElement('canvas')
  const s = Math.ceil(BASE * 2.8)
  c.width = s * 2
  c.height = s * 2
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)
  ctx.translate(s / 2, s / 2)
  paintFruit(ctx, i, BASE)
  cache.set(i, c)
  return c
}

export function drawFruit(ctx: CanvasRenderingContext2D, i: number, x: number, y: number, r: number, rot = 0) {
  const img = fruitSprite(i)
  const s = r * 2.8
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.drawImage(img, -s / 2, -s / 2, s, s)
  ctx.restore()
}

export function drawBomb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.arc(r * 0.08, r * 0.12, r * 0.92, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r)
  g.addColorStop(0, '#6b7280')
  g.addColorStop(0.5, '#1f2937')
  g.addColorStop(1, '#030712')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2)
  ctx.fill()
  // pulsing danger band
  const pulse = 0.55 + Math.sin(t * 12) * 0.35
  ctx.strokeStyle = `rgba(239,68,68,${pulse})`
  ctx.lineWidth = r * 0.12
  ctx.beginPath()
  ctx.ellipse(0, r * 0.05, r * 0.86, r * 0.3, 0, 0, Math.PI)
  ctx.stroke()
  // angry eyes
  ctx.fillStyle = '#fca5a5'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * r * 0.12, -r * 0.18)
    ctx.lineTo(s * r * 0.45, -r * 0.3)
    ctx.lineTo(s * r * 0.4, -r * 0.08)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.2, r * 0.1, -0.7, 0, Math.PI * 2)
  ctx.fill()
  // cap + fuse
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(-r * 0.2, -r * 1.02, r * 0.4, r * 0.22)
  ctx.strokeStyle = '#d6b588'
  ctx.lineWidth = r * 0.09
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.0)
  ctx.quadraticCurveTo(r * 0.35, -r * 1.35, r * 0.5, -r * 1.2)
  ctx.stroke()
  const sx = r * 0.5
  const sy = -r * 1.2
  const fl = 0.7 + Math.sin(t * 40) * 0.3
  ctx.fillStyle = 'rgba(253,224,71,0.45)'
  ctx.beginPath()
  ctx.arc(sx, sy, r * 0.32 * fl, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + t * 9
    const rr = k % 2 ? r * 0.08 : r * 0.22 * fl
    ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr)
  }
  ctx.fill()
  ctx.restore()
}

function starPath(ctx: CanvasRenderingContext2D, r: number, inner: number) {
  ctx.beginPath()
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const rr = k % 2 ? r * inner : r
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
}

function face(ctx: CanvasRenderingContext2D, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(-r * 0.2, -r * 0.05, r * 0.07, r * 0.11, 0, 0, Math.PI * 2)
  ctx.ellipse(r * 0.2, -r * 0.05, r * 0.07, r * 0.11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = r * 0.07
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, r * 0.1, r * 0.16, 0.3, Math.PI - 0.3)
  ctx.stroke()
}

export type SpecialKind = 'star' | 'ice' | 'heart' | 'gold'

export function drawSpecial(ctx: CanvasRenderingContext2D, kind: SpecialKind, x: number, y: number, r: number, rot: number, t: number, dmg = 0) {
  ctx.save()
  ctx.translate(x, y)
  const halo = 1 + Math.sin(t * 6) * 0.08
  ctx.fillStyle = kind === 'ice' ? 'rgba(125,211,252,0.18)' : kind === 'heart' ? 'rgba(244,114,182,0.2)' : 'rgba(253,224,71,0.2)'
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.45 * halo, 0, Math.PI * 2)
  ctx.fill()
  if (kind === 'star') {
    ctx.rotate(rot * 0.5)
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 2, 0, 0, r)
    g.addColorStop(0, '#fef9c3')
    g.addColorStop(1, '#f59e0b')
    ctx.fillStyle = g
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = r * 0.08
    ctx.lineJoin = 'round'
    starPath(ctx, r * 1.05, 0.48)
    ctx.fill()
    ctx.stroke()
    ctx.rotate(-rot * 0.5)
    face(ctx, r, '#78350f')
  } else if (kind === 'ice') {
    ctx.rotate(rot * 0.4)
    const g = ctx.createLinearGradient(-r, -r, r, r)
    g.addColorStop(0, '#f0f9ff')
    g.addColorStop(1, '#38bdf8')
    ctx.fillStyle = g
    ctx.strokeStyle = '#0369a1'
    ctx.lineWidth = r * 0.07
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = r * 0.1
    ctx.lineCap = 'round'
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65)
      ctx.lineTo(-Math.cos(a) * r * 0.65, -Math.sin(a) * r * 0.65)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.moveTo(-r * 0.6, -r * 0.4)
    ctx.lineTo(-r * 0.2, -r * 0.75)
    ctx.lineTo(-r * 0.1, -r * 0.6)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 'heart') {
    ctx.rotate(Math.sin(t * 3) * 0.15)
    const s = 1 + Math.sin(t * 8) * 0.06
    ctx.scale(s, s)
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r * 1.1)
    g.addColorStop(0, '#fbcfe8')
    g.addColorStop(1, '#db2777')
    ctx.fillStyle = g
    ctx.strokeStyle = '#9d174d'
    ctx.lineWidth = r * 0.08
    ctx.beginPath()
    ctx.moveTo(0, r * 0.85)
    ctx.bezierCurveTo(-r * 1.3, 0, -r * 0.7, -r * 1.05, 0, -r * 0.4)
    ctx.bezierCurveTo(r * 0.7, -r * 1.05, r * 1.3, 0, 0, r * 0.85)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.45, -r * 0.35, r * 0.18, r * 0.1, -0.7, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Golden melon: multi-hit bonus fruit, cracks as it takes hits.
    ctx.rotate(rot)
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05)
    g.addColorStop(0, '#fffbeb')
    g.addColorStop(0.45, '#facc15')
    g.addColorStop(1, '#a16207')
    ctx.fillStyle = g
    ctx.strokeStyle = '#713f12'
    ctx.lineWidth = r * 0.06
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(161,98,7,0.55)'
    ctx.lineWidth = r * 0.08
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath()
      ctx.ellipse(0, 0, Math.abs(k) * r * 0.32 + 1, r * 0.97, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.strokeStyle = '#fff7ed'
    ctx.lineWidth = r * 0.06
    for (let k = 0; k < dmg; k++) {
      const a = k * 2.3
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15)
      ctx.lineTo(Math.cos(a + 0.3) * r * 0.55, Math.sin(a + 0.3) * r * 0.55)
      ctx.lineTo(Math.cos(a - 0.1) * r * 0.9, Math.sin(a - 0.1) * r * 0.9)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.25, r * 0.12, -0.7, 0, Math.PI * 2)
    ctx.fill()
    // twinkles
    ctx.rotate(-rot)
    ctx.fillStyle = '#ffffff'
    for (let k = 0; k < 3; k++) {
      const a = t * 1.5 + k * 2.1
      const tw = Math.max(0, Math.sin(t * 5 + k * 2))
      ctx.save()
      ctx.translate(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2)
      ctx.scale(tw, tw)
      starPath(ctx, r * 0.22, 0.3)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()
}
