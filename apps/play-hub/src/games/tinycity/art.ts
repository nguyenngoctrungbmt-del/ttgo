import type { BType, Terrain } from './city'

/** Iso box: centre-bottom at (x,y); hw = half width along the diamond, h = wall height. */
export function isoBox(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, h: number, top: string, left: string, right: string) {
  const hh = hw / 2
  ctx.fillStyle = left
  ctx.beginPath()
  ctx.moveTo(x - hw, y - hh)
  ctx.lineTo(x, y)
  ctx.lineTo(x, y - h)
  ctx.lineTo(x - hw, y - hh - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = right
  ctx.beginPath()
  ctx.moveTo(x + hw, y - hh)
  ctx.lineTo(x, y)
  ctx.lineTo(x, y - h)
  ctx.lineTo(x + hw, y - hh - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = top
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x - hw, y - hh - h)
  ctx.lineTo(x, y - hw - h)
  ctx.lineTo(x + hw, y - hh - h)
  ctx.closePath()
  ctx.fill()
}

/** Gable roof running left-right over an iso box of half width hw at height h. */
function gable(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, h: number, rh: number, a: string, b: string) {
  const hh = hw / 2
  const top = y - h
  // ridge from left-mid to right-mid of the top face
  const lx = x - hw / 2
  const ly = top - hh * 1.5
  const rx = x + hw / 2
  const ry = top - hh / 2
  ctx.fillStyle = a
  ctx.beginPath()
  ctx.moveTo(x - hw, top - hh)
  ctx.lineTo(x, top)
  ctx.lineTo(rx, ry - rh)
  ctx.lineTo(lx, ly - rh)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = b
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x + hw, top - hh)
  ctx.lineTo(rx, ry - rh)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath()
  ctx.moveTo(x - hw, top - hh)
  ctx.lineTo(lx, ly - rh)
  ctx.lineTo(x, top - hw)
  ctx.closePath()
  ctx.fill()
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, seed: number) {
  const sw = Math.sin(t * 1.6 + seed) * s * 0.06
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(x, y, s * 0.4, s * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7c4a21'
  ctx.fillRect(x - s * 0.06, y - s * 0.4, s * 0.12, s * 0.4)
  ctx.fillStyle = '#15803d'
  ctx.beginPath()
  ctx.arc(x + sw, y - s * 0.62, s * 0.36, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(x + sw - s * 0.1, y - s * 0.72, s * 0.2, 0, Math.PI * 2)
  ctx.fill()
}

export function drawTerrain(ctx: CanvasRenderingContext2D, t: Terrain, x: number, y: number, tw: number, time: number, seed: number) {
  const hw = tw / 2
  if (t === 'water') {
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.moveTo(x, y - hw * 0.5 + 2)
    ctx.lineTo(x + hw - 3, y)
    ctx.lineTo(x, y + hw * 0.5 - 2)
    ctx.lineTo(x - hw + 3, y)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1.2
    const k = Math.sin(time * 2 + seed) * 2
    ctx.beginPath()
    ctx.moveTo(x - hw * 0.35 + k, y - 1)
    ctx.lineTo(x - hw * 0.1 + k, y - 1)
    ctx.moveTo(x + hw * 0.05 - k, y + 3)
    ctx.lineTo(x + hw * 0.3 - k, y + 3)
    ctx.stroke()
  } else if (t === 'tree') {
    tree(ctx, x - tw * 0.14, y - tw * 0.02, tw * 0.42, time, seed)
    tree(ctx, x + tw * 0.14, y + tw * 0.04, tw * 0.48, time, seed + 2)
    tree(ctx, x, y - tw * 0.12, tw * 0.36, time, seed + 4)
  } else {
    ctx.fillStyle = '#6b7280'
    ctx.beginPath()
    ctx.ellipse(x - tw * 0.08, y - tw * 0.04, tw * 0.2, tw * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#9ca3af'
    ctx.beginPath()
    ctx.ellipse(x - tw * 0.1, y - tw * 0.08, tw * 0.15, tw * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#78716c'
    ctx.beginPath()
    ctx.ellipse(x + tw * 0.14, y + tw * 0.03, tw * 0.12, tw * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Building standing on the tile whose centre is (x,y). */
export function drawBuilding(ctx: CanvasRenderingContext2D, b: BType, x: number, y: number, tw: number, time: number, seed: number) {
  const u = tw / 40
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2 * u, tw * 0.34, tw * 0.15, 0, 0, Math.PI * 2)
  ctx.fill()
  const by = y + 6 * u
  switch (b) {
    case 'house': {
      const hw = 11 * u
      isoBox(ctx, x, by, hw, 9 * u, '#fef3c7', '#fde68a', '#f59e0b')
      gable(ctx, x, by, hw, 9 * u, 7 * u, '#ef4444', '#b91c1c')
      ctx.fillStyle = '#7c2d12'
      ctx.fillRect(x + 3 * u, by - 7 * u, 3 * u, 5 * u)
      ctx.fillStyle = '#bfdbfe'
      ctx.fillRect(x - 7 * u, by - 9 * u, 3 * u, 3 * u)
      break
    }
    case 'park': {
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(x, y - 8 * u)
      ctx.lineTo(x + 16 * u, y)
      ctx.lineTo(x, y + 8 * u)
      ctx.lineTo(x - 16 * u, y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#fde68a'
      ctx.lineWidth = 2 * u
      ctx.beginPath()
      ctx.moveTo(x - 10 * u, y - 4 * u)
      ctx.quadraticCurveTo(x, y + 2 * u, x + 10 * u, y + 4 * u)
      ctx.stroke()
      tree(ctx, x - 7 * u, y + 1 * u, 16 * u, time, seed)
      tree(ctx, x + 7 * u, y - 3 * u, 14 * u, time, seed + 1)
      ctx.fillStyle = '#f472b6'
      ctx.fillRect(x + 4 * u, y + 3 * u, 2 * u, 2 * u)
      ctx.fillStyle = '#fde047'
      ctx.fillRect(x - 3 * u, y + 5 * u, 2 * u, 2 * u)
      break
    }
    case 'shop': {
      const hw = 13 * u
      isoBox(ctx, x, by, hw, 11 * u, '#e0f2fe', '#7dd3fc', '#0284c7')
      // striped awning on the right face
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#ef4444'
        const ax = x + (i / 4) * hw
        ctx.beginPath()
        ctx.moveTo(ax, by - 7 * u - (i / 4) * hw * 0.5)
        ctx.lineTo(ax + hw / 4, by - 7 * u - ((i + 1) / 4) * hw * 0.5)
        ctx.lineTo(ax + hw / 4 + 1 * u, by - 4 * u - ((i + 1) / 4) * hw * 0.5)
        ctx.lineTo(ax + 1 * u, by - 4 * u - (i / 4) * hw * 0.5)
        ctx.closePath()
        ctx.fill()
      }
      ctx.fillStyle = '#fde047'
      ctx.fillRect(x - 9 * u, by - 10 * u, 6 * u, 3 * u)
      break
    }
    case 'factory': {
      const hw = 14 * u
      isoBox(ctx, x, by, hw, 10 * u, '#d1d5db', '#9ca3af', '#6b7280')
      ctx.fillStyle = '#4b5563'
      for (let i = 0; i < 3; i++) {
        const sx = x - hw + 4 * u + i * 7 * u
        const sy = by - hw * 0.5 - 10 * u + i * 3.5 * u + 2 * u
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + 5 * u, sy - 5 * u)
        ctx.lineTo(sx + 6 * u, sy + 3 * u)
        ctx.closePath()
        ctx.fill()
      }
      ctx.fillStyle = '#7f1d1d'
      ctx.fillRect(x + 6 * u, by - 24 * u, 4 * u, 12 * u)
      ctx.fillStyle = '#fca5a5'
      ctx.fillRect(x + 6 * u, by - 21 * u, 4 * u, 1.5 * u)
      for (let i = 0; i < 3; i++) {
        const k = (time * 0.5 + i / 3 + seed * 0.13) % 1
        ctx.globalAlpha = 0.55 * (1 - k)
        ctx.fillStyle = '#e5e7eb'
        ctx.beginPath()
        ctx.arc(x + 8 * u + k * 6 * u, by - 26 * u - k * 16 * u, (2 + k * 4) * u, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }
    case 'fountain': {
      ctx.fillStyle = '#cbd5e1'
      ctx.beginPath()
      ctx.ellipse(x, y + 1 * u, 13 * u, 6.5 * u, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.ellipse(x, y, 10.5 * u, 5 * u, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(x - 1.5 * u, y - 10 * u, 3 * u, 10 * u)
      ctx.strokeStyle = 'rgba(224,242,254,0.9)'
      ctx.lineWidth = 1.4 * u
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + time * 0.5
        const ex = Math.cos(a) * 8 * u
        const ey = Math.sin(a) * 4 * u
        ctx.beginPath()
        ctx.moveTo(x, y - 10 * u)
        ctx.quadraticCurveTo(x + ex * 0.5, y - 16 * u - Math.sin(time * 6 + i) * u, x + ex, y + ey)
        ctx.stroke()
      }
      break
    }
    case 'school': {
      const hw = 15 * u
      isoBox(ctx, x, by, hw, 12 * u, '#fef9c3', '#fde047', '#ca8a04')
      gable(ctx, x, by, hw, 12 * u, 6 * u, '#dc2626', '#991b1b')
      isoBox(ctx, x - 2 * u, by - 14 * u, 3.5 * u, 10 * u, '#fef9c3', '#fde047', '#ca8a04')
      ctx.fillStyle = '#e5e7eb'
      ctx.fillRect(x - 2.5 * u, by - 36 * u, 1 * u, 10 * u)
      ctx.fillStyle = '#3b82f6'
      const fw = Math.sin(time * 5) * u
      ctx.beginPath()
      ctx.moveTo(x - 1.5 * u, by - 36 * u)
      ctx.lineTo(x + 5 * u, by - 34.5 * u + fw)
      ctx.lineTo(x - 1.5 * u, by - 32 * u)
      ctx.fill()
      ctx.fillStyle = '#bfdbfe'
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 * u + i * 4 * u, by - 9 * u - i * 2 * u, 2.5 * u, 3 * u)
      break
    }
    case 'windmill': {
      ctx.fillStyle = '#f5f5f4'
      ctx.beginPath()
      ctx.moveTo(x - 6 * u, by)
      ctx.lineTo(x - 3 * u, by - 26 * u)
      ctx.lineTo(x + 3 * u, by - 26 * u)
      ctx.lineTo(x + 6 * u, by)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#d6d3d1'
      ctx.beginPath()
      ctx.moveTo(x, by)
      ctx.lineTo(x + 3 * u, by - 26 * u)
      ctx.lineTo(x + 6 * u, by)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#b91c1c'
      ctx.beginPath()
      ctx.moveTo(x - 4.5 * u, by - 26 * u)
      ctx.lineTo(x, by - 32 * u)
      ctx.lineTo(x + 4.5 * u, by - 26 * u)
      ctx.closePath()
      ctx.fill()
      const hx = x
      const hy = by - 24 * u
      for (let i = 0; i < 4; i++) {
        const a = time * 2 + (i * Math.PI) / 2 + seed
        ctx.save()
        ctx.translate(hx, hy)
        ctx.rotate(a)
        ctx.fillStyle = '#fef3c7'
        ctx.fillRect(1 * u, -1.5 * u, 13 * u, 3 * u)
        ctx.strokeStyle = '#a16207'
        ctx.lineWidth = 0.6 * u
        ctx.strokeRect(1 * u, -1.5 * u, 13 * u, 3 * u)
        ctx.restore()
      }
      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.arc(hx, hy, 1.6 * u, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'tower': {
      const hw = 10 * u
      const h = 38 * u
      isoBox(ctx, x, by, hw, h, '#e0e7ff', '#818cf8', '#4338ca')
      ctx.fillStyle = 'rgba(254,240,138,0.9)'
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 2; c++) {
          if ((r + c + seed) % 3 === 0) continue
          const wx = x + 2 * u + c * 4 * u
          const wy = by - 6 * u - r * 5.5 * u - c * 2 * u
          ctx.fillRect(wx, wy - 2.5 * u, 2.4 * u, 2.8 * u)
          const lx = x - 4.5 * u - c * 4 * u
          ctx.fillRect(lx, wy - 2.5 * u, 2.4 * u, 2.8 * u)
        }
      }
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(x, by - h - hw - 2 * u, 1.4 * u, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'statue': {
      isoBox(ctx, x, by, 8 * u, 6 * u, '#e7e5e4', '#d6d3d1', '#a8a29e')
      const g = ctx.createLinearGradient(x - 4 * u, 0, x + 4 * u, 0)
      g.addColorStop(0, '#fef08a')
      g.addColorStop(1, '#ca8a04')
      ctx.fillStyle = g
      const top = by - 10 * u
      ctx.beginPath()
      ctx.arc(x, top - 14 * u, 2.6 * u, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x - 3 * u, top)
      ctx.lineTo(x - 2.5 * u, top - 11 * u)
      ctx.lineTo(x + 2.5 * u, top - 11 * u)
      ctx.lineTo(x + 3 * u, top)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#eab308'
      ctx.lineWidth = 1.6 * u
      ctx.beginPath()
      ctx.moveTo(x + 2 * u, top - 10 * u)
      ctx.lineTo(x + 6 * u, top - 18 * u)
      ctx.stroke()
      if (Math.sin(time * 3 + seed) > 0.7) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x + 5.5 * u, top - 20 * u, 1.4 * u, 1.4 * u)
      }
      break
    }
  }
}
