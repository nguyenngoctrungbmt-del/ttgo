/** Vector art for Recipe Rush: ingredient icons, plated builds and customers. */

export type Menu = 'burger' | 'drink' | 'hotdog' | 'sundae'

export const BINS: Record<Menu, string[]> = {
  burger: ['patty', 'cheese', 'lettuce', 'tomato', 'onion', 'pickle', 'bacon', 'egg'],
  drink: ['cupS', 'cupM', 'cupL', 'cola', 'orange', 'lime', 'ice', 'lid'],
  hotdog: ['sausage', 'ketchup', 'mustard', 'relish', 'onion', 'cheese', 'bacon', 'pickle'],
  sundae: ['vanilla', 'choc', 'berry', 'sauce', 'sprinkles', 'cherry', 'cream', 'banana'],
}

export const LABELS: Record<string, string> = {
  patty: 'Patty', cheese: 'Cheese', lettuce: 'Lettuce', tomato: 'Tomato', onion: 'Onion', pickle: 'Pickle', bacon: 'Bacon', egg: 'Egg',
  cupS: 'Small', cupM: 'Medium', cupL: 'Large', cola: 'Cola', orange: 'Orange', lime: 'Lime', ice: 'Ice', lid: 'Lid',
  sausage: 'Sausage', ketchup: 'Ketchup', mustard: 'Mustard', relish: 'Relish',
  vanilla: 'Vanilla', choc: 'Choc', berry: 'Berry', sauce: 'Fudge', sprinkles: 'Sprinkles', cherry: 'Cherry', cream: 'Cream', banana: 'Banana',
}

export const MENU_NAMES: Record<Menu, string> = { burger: 'Burger', drink: 'Drink', hotdog: 'Hot dog', sundae: 'Sundae' }

const FLAVOR: Record<string, string> = { cola: '#5b2c0f', orange: '#fb923c', lime: '#84cc16' }

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

function bottle(ctx: CanvasRenderingContext2D, r: number, body: string, cap: string) {
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(-r * 0.45, r * 0.9)
  ctx.lineTo(-r * 0.5, -r * 0.2)
  ctx.quadraticCurveTo(-r * 0.5, -r * 0.5, -r * 0.2, -r * 0.55)
  ctx.lineTo(r * 0.2, -r * 0.55)
  ctx.quadraticCurveTo(r * 0.5, -r * 0.5, r * 0.5, -r * 0.2)
  ctx.lineTo(r * 0.45, r * 0.9)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = Math.max(1, r * 0.06)
  ctx.stroke()
  ctx.fillStyle = cap
  ctx.beginPath()
  ctx.moveTo(-r * 0.2, -r * 0.55)
  ctx.lineTo(-r * 0.08, -r * 1.0)
  ctx.lineTo(r * 0.08, -r * 1.0)
  ctx.lineTo(r * 0.2, -r * 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(-r * 0.35, -r * 0.15, r * 0.14, r * 0.85)
  ctx.fillStyle = '#fff'
  ctx.fillRect(-r * 0.32, r * 0.15, r * 0.64, r * 0.3)
}

function scoop(ctx: CanvasRenderingContext2D, r: number, c1: string, c2: string, deco: 'dots' | 'chips' | 'seeds') {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-r * 0.85, r * 0.25)
  ctx.bezierCurveTo(-r * 0.95, -r * 0.9, r * 0.95, -r * 0.9, r * 0.85, r * 0.25)
  for (let i = 0; i <= 6; i++) {
    const x = r * 0.85 - (i / 6) * r * 1.7
    ctx.lineTo(x, r * 0.25 + (i % 2 ? r * 0.18 : 0))
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = deco === 'chips' ? '#3f1d0b' : deco === 'seeds' ? '#fef08a' : '#78350f'
  const pts = [[-0.4, -0.2], [0.2, -0.4], [0.45, 0], [-0.1, 0.05], [0.1, -0.15]]
  for (const [x, y] of pts) {
    if (deco === 'chips') {
      ctx.fillRect(x * r - r * 0.06, y * r - r * 0.06, r * 0.13, r * 0.13)
    } else {
      ell(ctx, x * r, y * r, r * (deco === 'dots' ? 0.035 : 0.05), r * (deco === 'dots' ? 0.035 : 0.08))
      ctx.fill()
    }
  }
}

/** Ingredient icon centred at the origin, radius r. */
export function drawIng(ctx: CanvasRenderingContext2D, id: string, r: number) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  switch (id) {
    case 'patty': {
      const g = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5)
      g.addColorStop(0, '#92400e')
      g.addColorStop(1, '#451a03')
      ctx.fillStyle = g
      ell(ctx, 0, 0, r * 0.95, r * 0.55)
      ctx.fill()
      ctx.strokeStyle = '#1c0a02'
      ctx.lineWidth = Math.max(1.5, r * 0.1)
      for (const x of [-0.4, 0, 0.4]) {
        ctx.beginPath()
        ctx.moveTo((x - 0.15) * r, -r * 0.25)
        ctx.lineTo((x + 0.15) * r, r * 0.25)
        ctx.stroke()
      }
      break
    }
    case 'cheese':
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(-r * 0.85, -r * 0.6)
      ctx.lineTo(r * 0.85, -r * 0.6)
      ctx.lineTo(r * 0.85, r * 0.35)
      ctx.quadraticCurveTo(r * 0.6, r * 0.9, r * 0.4, r * 0.35)
      ctx.lineTo(-r * 0.85, r * 0.35)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#ca8a04'
      ctx.lineWidth = Math.max(1, r * 0.06)
      ctx.stroke()
      ctx.fillStyle = '#eab308'
      ell(ctx, -r * 0.35, -r * 0.15, r * 0.14, r * 0.12)
      ctx.fill()
      ell(ctx, r * 0.3, -r * 0.3, r * 0.1, r * 0.09)
      ctx.fill()
      break
    case 'lettuce':
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(-r * 0.95, 0)
      for (let i = 0; i <= 8; i++) {
        const x = -r * 0.95 + (i / 8) * r * 1.9
        ctx.quadraticCurveTo(x - r * 0.12, -r * (0.75 + (i % 2) * 0.2), x, -r * 0.45)
      }
      ctx.quadraticCurveTo(r * 0.9, r * 0.6, 0, r * 0.55)
      ctx.quadraticCurveTo(-r * 0.9, r * 0.6, -r * 0.95, 0)
      ctx.fill()
      ctx.strokeStyle = '#15803d'
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.beginPath()
      ctx.moveTo(-r * 0.6, r * 0.1)
      ctx.quadraticCurveTo(0, -r * 0.2, r * 0.6, r * 0.1)
      ctx.stroke()
      break
    case 'tomato':
      ctx.fillStyle = '#dc2626'
      ell(ctx, 0, 0, r * 0.85, r * 0.85)
      ctx.fill()
      ctx.fillStyle = '#f87171'
      ell(ctx, 0, 0, r * 0.65, r * 0.65)
      ctx.fill()
      ctx.fillStyle = '#fef3c7'
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ell(ctx, Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, r * 0.07, r * 0.12, a)
        ctx.fill()
      }
      ctx.fillStyle = '#b91c1c'
      ell(ctx, 0, 0, r * 0.14, r * 0.14)
      ctx.fill()
      break
    case 'onion':
      ctx.strokeStyle = '#a855f7'
      ctx.lineWidth = Math.max(2, r * 0.16)
      ell(ctx, 0, 0, r * 0.78, r * 0.78)
      ctx.stroke()
      ctx.strokeStyle = '#e9d5ff'
      ctx.lineWidth = Math.max(1.5, r * 0.1)
      ell(ctx, 0, 0, r * 0.5, r * 0.5)
      ctx.stroke()
      ell(ctx, 0, 0, r * 0.25, r * 0.25)
      ctx.stroke()
      break
    case 'pickle':
      for (const [x, y] of [[-0.35, -0.2], [0.35, 0.15]]) {
        ctx.fillStyle = '#65a30d'
        ell(ctx, x * r, y * r, r * 0.48, r * 0.48)
        ctx.fill()
        ctx.fillStyle = '#bef264'
        ell(ctx, x * r, y * r, r * 0.34, r * 0.34)
        ctx.fill()
        ctx.fillStyle = '#4d7c0f'
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4
          ell(ctx, x * r + Math.cos(a) * r * 0.16, y * r + Math.sin(a) * r * 0.16, r * 0.05, r * 0.05)
          ctx.fill()
        }
      }
      break
    case 'bacon':
      for (const dy of [-0.3, 0.25]) {
        ctx.strokeStyle = '#be123c'
        ctx.lineWidth = Math.max(3, r * 0.32)
        ctx.beginPath()
        for (let i = 0; i <= 8; i++) {
          const x = -r * 0.9 + (i / 8) * r * 1.8
          const y = dy * r + Math.sin(i * 1.4) * r * 0.12
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.strokeStyle = '#fecdd3'
        ctx.lineWidth = Math.max(1, r * 0.08)
        ctx.stroke()
      }
      break
    case 'egg':
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(-r * 0.9, 0)
      ctx.bezierCurveTo(-r * 0.9, -r * 0.8, r * 0.3, -r * 0.95, r * 0.8, -r * 0.3)
      ctx.bezierCurveTo(r * 1.1, r * 0.3, r * 0.4, r * 0.85, -r * 0.2, r * 0.7)
      ctx.bezierCurveTo(-r * 0.7, r * 0.6, -r * 0.9, r * 0.4, -r * 0.9, 0)
      ctx.fill()
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = Math.max(1, r * 0.05)
      ctx.stroke()
      ctx.fillStyle = '#f59e0b'
      ell(ctx, -r * 0.05, 0, r * 0.35, r * 0.33)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ell(ctx, -r * 0.15, -r * 0.1, r * 0.1, r * 0.07)
      ctx.fill()
      break
    case 'cupS':
    case 'cupM':
    case 'cupL': {
      const h = id === 'cupS' ? 0.55 : id === 'cupM' ? 0.75 : 0.95
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.moveTo(-r * 0.55, -r * h)
      ctx.lineTo(r * 0.55, -r * h)
      ctx.lineTo(r * 0.4, r * 0.9)
      ctx.lineTo(-r * 0.4, r * 0.9)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(-r * 0.47, r * 0.05, r * 0.94, r * 0.25)
      ctx.fillStyle = '#334155'
      ctx.font = `900 ${Math.round(r * 0.55)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(id === 'cupS' ? 'S' : id === 'cupM' ? 'M' : 'L', 0, -r * (h * 0.45) + r * 0.05)
      break
    }
    case 'cola':
      bottle(ctx, r, '#5b2c0f', '#dc2626')
      break
    case 'orange':
      ctx.fillStyle = '#ea580c'
      ell(ctx, 0, 0, r * 0.85, r * 0.85)
      ctx.fill()
      ctx.fillStyle = '#fdba74'
      ell(ctx, 0, 0, r * 0.68, r * 0.68)
      ctx.fill()
      ctx.strokeStyle = '#fff7ed'
      ctx.lineWidth = Math.max(1, r * 0.07)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66)
        ctx.stroke()
      }
      break
    case 'lime':
      ctx.fillStyle = '#4d7c0f'
      ctx.beginPath()
      ctx.arc(0, r * 0.25, r * 0.9, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#bef264'
      ctx.beginPath()
      ctx.arc(0, r * 0.25, r * 0.72, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#ecfccb'
      ctx.lineWidth = Math.max(1, r * 0.07)
      for (let i = 1; i < 5; i++) {
        const a = Math.PI + (i / 5) * Math.PI
        ctx.beginPath()
        ctx.moveTo(0, r * 0.25)
        ctx.lineTo(Math.cos(a) * r * 0.7, r * 0.25 + Math.sin(a) * r * 0.7)
        ctx.stroke()
      }
      break
    case 'ice':
      for (const [x, y] of [[-0.3, 0.2], [0.3, 0.1], [0, -0.35]]) {
        ctx.fillStyle = 'rgba(186,230,253,0.95)'
        ctx.beginPath()
        ctx.roundRect(x * r - r * 0.32, y * r - r * 0.32, r * 0.64, r * 0.64, r * 0.12)
        ctx.fill()
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = Math.max(1, r * 0.06)
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.fillRect(x * r - r * 0.2, y * r - r * 0.2, r * 0.14, r * 0.14)
      }
      break
    case 'lid':
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.moveTo(-r * 0.9, r * 0.2)
      ctx.quadraticCurveTo(0, -r * 0.9, r * 0.9, r * 0.2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(-r * 0.95, r * 0.15, r * 1.9, r * 0.2)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = Math.max(2, r * 0.12)
      ctx.beginPath()
      ctx.moveTo(r * 0.05, -r * 0.3)
      ctx.lineTo(r * 0.35, -r * 0.95)
      ctx.stroke()
      break
    case 'sausage':
      ctx.fillStyle = '#b45309'
      ctx.beginPath()
      ctx.roundRect(-r * 0.95, -r * 0.28, r * 1.9, r * 0.56, r * 0.28)
      ctx.fill()
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillRect(-r * 0.7, -r * 0.18, r * 1.3, r * 0.1)
      break
    case 'ketchup':
      bottle(ctx, r, '#dc2626', '#fef2f2')
      break
    case 'mustard':
      bottle(ctx, r, '#eab308', '#fef9c3')
      break
    case 'relish':
      ctx.fillStyle = '#e5e7eb'
      ctx.beginPath()
      ctx.moveTo(-r * 0.85, -r * 0.1)
      ctx.lineTo(r * 0.85, -r * 0.1)
      ctx.quadraticCurveTo(r * 0.8, r * 0.85, 0, r * 0.85)
      ctx.quadraticCurveTo(-r * 0.8, r * 0.85, -r * 0.85, -r * 0.1)
      ctx.fill()
      ctx.fillStyle = '#4d7c0f'
      for (let i = 0; i < 7; i++) {
        ell(ctx, (-0.55 + i * 0.18) * r, -r * (0.15 + (i % 2) * 0.12), r * 0.12, r * 0.1)
        ctx.fill()
      }
      break
    case 'vanilla':
      scoop(ctx, r, '#fffbeb', '#fde68a', 'dots')
      break
    case 'choc':
      scoop(ctx, r, '#a16207', '#4a2511', 'chips')
      break
    case 'berry':
      scoop(ctx, r, '#fbcfe8', '#ec4899', 'seeds')
      break
    case 'sauce':
      ctx.fillStyle = '#3f1d0b'
      ctx.beginPath()
      ctx.moveTo(-r * 0.9, -r * 0.4)
      ctx.lineTo(r * 0.9, -r * 0.4)
      for (let i = 0; i <= 5; i++) {
        const x = r * 0.9 - (i / 5) * r * 1.8
        ctx.quadraticCurveTo(x + r * 0.15, r * (0.2 + (i % 2) * 0.5), x, -r * 0.1)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ell(ctx, -r * 0.4, -r * 0.3, r * 0.2, r * 0.06)
      ctx.fill()
      break
    case 'sprinkles': {
      const cols = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#ec4899', '#a855f7']
      ctx.lineWidth = Math.max(2, r * 0.14)
      for (let i = 0; i < 10; i++) {
        const a = i * 2.3
        const d = r * (0.2 + ((i * 37) % 10) / 16)
        ctx.strokeStyle = cols[i % cols.length]
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
        ctx.lineTo(Math.cos(a) * d + Math.cos(i) * r * 0.25, Math.sin(a) * d + Math.sin(i) * r * 0.25)
        ctx.stroke()
      }
      break
    }
    case 'cherry':
      ctx.strokeStyle = '#15803d'
      ctx.lineWidth = Math.max(1.5, r * 0.08)
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.1)
      ctx.quadraticCurveTo(r * 0.1, -r * 0.7, r * 0.45, -r * 0.9)
      ctx.stroke()
      {
        const g = ctx.createRadialGradient(-r * 0.2, r * 0.1, r * 0.05, 0, r * 0.25, r * 0.6)
        g.addColorStop(0, '#fca5a5')
        g.addColorStop(1, '#b91c1c')
        ctx.fillStyle = g
      }
      ell(ctx, 0, r * 0.25, r * 0.55, r * 0.55)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ell(ctx, -r * 0.18, r * 0.08, r * 0.1, r * 0.14)
      ctx.fill()
      break
    case 'cream':
      ctx.fillStyle = '#fff'
      for (const [x, y, s] of [[0, 0.45, 0.8], [0, 0.0, 0.62], [0, -0.4, 0.42]]) {
        ell(ctx, x * r, y * r, s * r, s * r * 0.45)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.moveTo(-r * 0.15, -r * 0.55)
      ctx.quadraticCurveTo(0, -r * 1.0, r * 0.12, -r * 0.6)
      ctx.fill()
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = Math.max(1, r * 0.06)
      ell(ctx, 0, r * 0.45, r * 0.8, r * 0.36)
      ctx.stroke()
      break
    case 'banana':
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(-r * 0.9, -r * 0.3)
      ctx.quadraticCurveTo(-r * 0.2, r * 0.9, r * 0.9, -r * 0.2)
      ctx.quadraticCurveTo(r * 0.1, r * 0.35, -r * 0.9, -r * 0.3)
      ctx.fill()
      ctx.strokeStyle = '#a16207'
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.stroke()
      ctx.fillStyle = '#422006'
      ell(ctx, r * 0.9, -r * 0.2, r * 0.07, r * 0.07)
      ctx.fill()
      break
  }
}

export function bunColors(ctx: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, '#fbbf24')
  g.addColorStop(1, '#b45309')
  return g
}

/** Stack height (px at width w) a burger layer adds. */
function layerH(id: string, w: number) {
  if (id === 'patty' || id === 'egg') return w * 0.14
  if (id === 'cheese' || id === 'lettuce' || id === 'bacon') return w * 0.07
  return w * 0.08
}

function burgerLayer(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number) {
  const hw = w / 2
  ctx.save()
  ctx.translate(x, y)
  switch (id) {
    case 'patty': {
      const g = ctx.createLinearGradient(0, -w * 0.07, 0, w * 0.07)
      g.addColorStop(0, '#92400e')
      g.addColorStop(1, '#451a03')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.roundRect(-hw * 0.95, -w * 0.07, w * 0.95, w * 0.14, w * 0.06)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      for (let i = 0; i < 6; i++) ctx.fillRect(-hw * 0.8 + i * w * 0.15, -w * 0.02, w * 0.06, w * 0.02)
      break
    }
    case 'cheese':
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(-hw, -w * 0.03)
      ctx.lineTo(hw, -w * 0.03)
      ctx.lineTo(hw * 0.9, w * 0.04)
      ctx.lineTo(hw * 0.5, w * 0.12)
      ctx.lineTo(hw * 0.3, w * 0.04)
      ctx.lineTo(-hw * 0.3, w * 0.04)
      ctx.lineTo(-hw * 0.55, w * 0.1)
      ctx.lineTo(-hw * 0.8, w * 0.04)
      ctx.closePath()
      ctx.fill()
      break
    case 'lettuce':
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(-hw * 1.05, 0)
      for (let i = 0; i <= 10; i++) {
        const xx = -hw * 1.05 + (i / 10) * w * 1.05
        ctx.quadraticCurveTo(xx - w * 0.05, w * (0.06 + (i % 2) * 0.04), xx, 0)
      }
      ctx.lineTo(hw, -w * 0.035)
      ctx.lineTo(-hw, -w * 0.035)
      ctx.closePath()
      ctx.fill()
      break
    case 'tomato':
      for (const sx of [-0.45, 0.45]) {
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.roundRect(sx * hw - hw * 0.5, -w * 0.04, hw, w * 0.08, w * 0.04)
        ctx.fill()
        ctx.fillStyle = '#fca5a5'
        ctx.fillRect(sx * hw - hw * 0.35, -w * 0.015, hw * 0.7, w * 0.02)
      }
      break
    case 'onion':
      ctx.strokeStyle = '#c084fc'
      ctx.lineWidth = w * 0.035
      for (const sx of [-0.55, 0, 0.55]) {
        ctx.beginPath()
        ctx.ellipse(sx * hw, 0, hw * 0.3, w * 0.03, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'pickle':
      ctx.fillStyle = '#65a30d'
      for (const sx of [-0.6, -0.2, 0.2, 0.6]) {
        ctx.beginPath()
        ctx.ellipse(sx * hw, 0, hw * 0.2, w * 0.035, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'bacon':
      ctx.strokeStyle = '#be123c'
      ctx.lineWidth = w * 0.06
      ctx.beginPath()
      for (let i = 0; i <= 10; i++) {
        const xx = -hw + (i / 10) * w
        const yy = Math.sin(i * 1.3) * w * 0.02
        if (i === 0) ctx.moveTo(xx, yy)
        else ctx.lineTo(xx, yy)
      }
      ctx.stroke()
      ctx.strokeStyle = '#fecdd3'
      ctx.lineWidth = w * 0.015
      ctx.stroke()
      break
    case 'egg':
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(0, 0, hw * 0.92, w * 0.065, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.ellipse(-hw * 0.1, -w * 0.02, hw * 0.25, w * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
      break
  }
  ctx.restore()
}

/** The order being assembled on the plate. `ready` adds the finishing touch (top bun, etc.). */
export function drawBuild(ctx: CanvasRenderingContext2D, menu: Menu, items: string[], x: number, y: number, w: number, ready: boolean, drop: number) {
  ctx.save()
  // Plate
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ell(ctx, x, y + w * 0.06, w * 0.72, w * 0.13)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ell(ctx, x, y, w * 0.7, w * 0.12)
  ctx.fill()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ell(ctx, x, y - w * 0.01, w * 0.5, w * 0.08)
  ctx.stroke()
  const lastDrop = (i: number) => (i === items.length - 1 ? -drop * w * 0.5 : 0)
  if (menu === 'burger') {
    let yy = y - w * 0.06
    ctx.fillStyle = bunColors(ctx, yy - w * 0.08, yy)
    ctx.beginPath()
    ctx.roundRect(x - w * 0.45, yy - w * 0.08, w * 0.9, w * 0.1, w * 0.04)
    ctx.fill()
    yy -= w * 0.09
    items.forEach((id, i) => {
      const h = layerH(id, w * 0.9)
      burgerLayer(ctx, id, x, yy - h / 2 + lastDrop(i), w * 0.9)
      yy -= h
    })
    if (ready) {
      const top = yy - w * 0.02 - drop * w * 0.6
      ctx.fillStyle = bunColors(ctx, top - w * 0.22, top)
      ctx.beginPath()
      ctx.moveTo(x - w * 0.46, top)
      ctx.bezierCurveTo(x - w * 0.46, top - w * 0.3, x + w * 0.46, top - w * 0.3, x + w * 0.46, top)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fef3c7'
      for (const [sx, sy] of [[-0.2, -0.13], [0.05, -0.18], [0.25, -0.12], [-0.05, -0.09], [0.15, -0.06]]) {
        ell(ctx, x + sx * w, top + sy * w, w * 0.02, w * 0.012, 0.4)
        ctx.fill()
      }
    }
  } else if (menu === 'hotdog') {
    const yy = y - w * 0.08
    ctx.fillStyle = bunColors(ctx, yy - w * 0.12, yy + w * 0.05)
    ctx.beginPath()
    ctx.roundRect(x - w * 0.5, yy - w * 0.08, w, w * 0.14, w * 0.07)
    ctx.fill()
    items.forEach((id, i) => {
      const d = lastDrop(i)
      if (id === 'sausage') {
        ctx.save()
        ctx.translate(x, yy - w * 0.03 + d)
        ctx.scale(1, 0.6)
        drawIng(ctx, 'sausage', w * 0.46)
        ctx.restore()
        return
      }
      const ty = yy - w * 0.14 + d
      const col: Record<string, string> = { ketchup: '#dc2626', mustard: '#eab308', relish: '#4d7c0f', onion: '#e9d5ff', cheese: '#facc15', bacon: '#be123c', pickle: '#65a30d' }
      ctx.strokeStyle = col[id] ?? '#fff'
      ctx.lineWidth = id === 'cheese' || id === 'bacon' ? w * 0.04 : w * 0.025
      ctx.beginPath()
      for (let k = 0; k <= 12; k++) {
        const xx = x - w * 0.42 + (k / 12) * w * 0.84
        const yv = ty + (id === 'ketchup' || id === 'mustard' ? Math.sin(k * 1.6 + i) * w * 0.03 : (k % 2) * w * 0.012) - i * w * 0.012
        if (k === 0) ctx.moveTo(xx, yv)
        else ctx.lineTo(xx, yv)
      }
      ctx.stroke()
    })
    if (ready) {
      ctx.fillStyle = 'rgba(253,230,138,0.85)'
      ctx.beginPath()
      ctx.roundRect(x - w * 0.5, yy - w * 0.02, w, w * 0.07, w * 0.035)
      ctx.fill()
    }
  } else if (menu === 'sundae') {
    // Glass bowl
    const by = y - w * 0.08
    ctx.fillStyle = 'rgba(219,234,254,0.55)'
    ctx.beginPath()
    ctx.moveTo(x - w * 0.42, by - w * 0.22)
    ctx.quadraticCurveTo(x, by + w * 0.2, x + w * 0.42, by - w * 0.22)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(219,234,254,0.7)'
    ctx.fillRect(x - w * 0.04, by + w * 0.0, w * 0.08, w * 0.06)
    let sy = by - w * 0.2
    let n = 0
    items.forEach((id, i) => {
      const d = lastDrop(i)
      if (id === 'vanilla' || id === 'choc' || id === 'berry') {
        const sx = x + (n % 2 ? w * 0.12 : -w * 0.12) * (n === 0 ? 0 : 1)
        ctx.save()
        ctx.translate(sx, sy - w * 0.08 + d)
        drawIng(ctx, id, w * 0.2)
        ctx.restore()
        sy -= w * 0.13
        n++
      } else {
        ctx.save()
        const offs: Record<string, number> = { sauce: 0.02, sprinkles: 0.0, cream: -0.06, cherry: -0.16, banana: 0.08 }
        ctx.translate(x + (id === 'banana' ? w * 0.28 : 0), sy + (offs[id] ?? 0) * w + d)
        drawIng(ctx, id, w * (id === 'cherry' ? 0.12 : id === 'banana' ? 0.18 : 0.2))
        ctx.restore()
        if (id === 'cream') sy -= w * 0.1
      }
    })
  } else {
    // Drink: cup size, flavour fill, ice, lid
    const size = items.find((i) => i.startsWith('cup'))
    if (size) {
      const h = size === 'cupS' ? 0.42 : size === 'cupM' ? 0.56 : 0.7
      const top = y - w * 0.04 - h * w
      const bot = y - w * 0.04
      const flavor = items.find((i) => FLAVOR[i])
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.moveTo(x - w * 0.24, top)
      ctx.lineTo(x + w * 0.24, top)
      ctx.lineTo(x + w * 0.18, bot)
      ctx.lineTo(x - w * 0.18, bot)
      ctx.closePath()
      ctx.fill()
      if (flavor) {
        ctx.save()
        ctx.clip()
        ctx.fillStyle = FLAVOR[flavor]
        ctx.globalAlpha = 0.9
        ctx.fillRect(x - w * 0.3, top + w * 0.05, w * 0.6, h * w)
        ctx.restore()
      }
      if (items.includes('ice')) {
        ctx.fillStyle = 'rgba(224,242,254,0.85)'
        for (const [dx, dy] of [[-0.08, 0.1], [0.07, 0.14], [0, 0.22]]) {
          ctx.beginPath()
          ctx.roundRect(x + dx * w - w * 0.05, top + dy * w, w * 0.1, w * 0.1, 3)
          ctx.fill()
        }
      }
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x - w * 0.24, top)
      ctx.lineTo(x - w * 0.18, bot)
      ctx.lineTo(x + w * 0.18, bot)
      ctx.lineTo(x + w * 0.24, top)
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(x - w * 0.21, top + h * w * 0.55, w * 0.42, w * 0.06)
      if (items.includes('lid')) {
        const ly = top - (items[items.length - 1] === 'lid' ? drop * w * 0.4 : 0)
        ctx.fillStyle = '#e2e8f0'
        ctx.beginPath()
        ctx.moveTo(x - w * 0.27, ly)
        ctx.quadraticCurveTo(x, ly - w * 0.16, x + w * 0.27, ly)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(x + w * 0.03, ly - w * 0.08)
        ctx.lineTo(x + w * 0.12, ly - w * 0.32)
        ctx.stroke()
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.strokeRect(x - w * 0.22, y - w * 0.5, w * 0.44, w * 0.45)
      ctx.setLineDash([])
    }
  }
  ctx.restore()
}

export const CUSTOMER_KINDS = 6

/** Animal customer, upper body; mood: 1 happy, 0 neutral, -1 annoyed. */
export function drawCustomer(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, r: number, mood: number, t: number) {
  const palettes = [
    { fur: '#f59e0b', inner: '#fde68a', shirt: '#3b82f6' }, // cat
    { fur: '#92400e', inner: '#d6a46b', shirt: '#22c55e' }, // bear
    { fur: '#e5e7eb', inner: '#fbcfe8', shirt: '#ec4899' }, // bunny
    { fur: '#4ade80', inner: '#bbf7d0', shirt: '#f97316' }, // frog
    { fur: '#f8fafc', inner: '#1f2937', shirt: '#a855f7' }, // panda
    { fur: '#ea580c', inner: '#fff7ed', shirt: '#14b8a6' }, // fox
  ]
  const p = palettes[kind % palettes.length]
  ctx.save()
  ctx.translate(x, y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Body
  ctx.fillStyle = p.shirt
  ctx.beginPath()
  ctx.moveTo(-r * 1.0, r * 2.0)
  ctx.quadraticCurveTo(-r * 1.0, r * 0.8, 0, r * 0.75)
  ctx.quadraticCurveTo(r * 1.0, r * 0.8, r * 1.0, r * 2.0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(-r * 0.12, r * 0.9, r * 0.24, r * 1.1)
  const k = kind % palettes.length
  // Ears
  ctx.fillStyle = p.fur
  if (k === 0 || k === 5) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * r * 0.85, -r * 0.3)
      ctx.lineTo(s * r * 0.7, -r * 1.15)
      ctx.lineTo(s * r * 0.2, -r * 0.75)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = p.inner
      ctx.beginPath()
      ctx.moveTo(s * r * 0.72, -r * 0.45)
      ctx.lineTo(s * r * 0.66, -r * 0.95)
      ctx.lineTo(s * r * 0.35, -r * 0.72)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = p.fur
    }
  } else if (k === 1 || k === 4) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = k === 4 ? '#1f2937' : p.fur
      ell(ctx, s * r * 0.7, -r * 0.7, r * 0.32, r * 0.32)
      ctx.fill()
    }
  } else if (k === 2) {
    for (const s of [-1, 1]) {
      const wig = Math.sin(t * 3 + s) * 0.08
      ctx.save()
      ctx.translate(s * r * 0.35, -r * 0.7)
      ctx.rotate(s * 0.15 + wig)
      ctx.fillStyle = p.fur
      ell(ctx, 0, -r * 0.55, r * 0.22, r * 0.65)
      ctx.fill()
      ctx.fillStyle = p.inner
      ell(ctx, 0, -r * 0.55, r * 0.11, r * 0.48)
      ctx.fill()
      ctx.restore()
    }
  } else if (k === 3) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = p.fur
      ell(ctx, s * r * 0.45, -r * 0.75, r * 0.32, r * 0.3)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ell(ctx, s * r * 0.45, -r * 0.78, r * 0.22, r * 0.2)
      ctx.fill()
      ctx.fillStyle = '#111827'
      ell(ctx, s * r * 0.45, -r * 0.76, r * 0.1, r * 0.11)
      ctx.fill()
    }
  }
  // Head
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.15, p.fur)
  g.addColorStop(1, p.fur)
  ctx.fillStyle = g
  ell(ctx, 0, 0, r * 0.95, r * 0.85)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = Math.max(1, r * 0.05)
  ctx.stroke()
  // Muzzle
  if (k !== 3) {
    ctx.fillStyle = k === 4 ? '#fff' : p.inner
    ell(ctx, 0, r * 0.35, r * 0.48, r * 0.35)
    ctx.fill()
  }
  if (k === 4) {
    ctx.fillStyle = '#1f2937'
    ell(ctx, -r * 0.38, -r * 0.08, r * 0.2, r * 0.26, 0.4)
    ctx.fill()
    ell(ctx, r * 0.38, -r * 0.08, r * 0.2, r * 0.26, -0.4)
    ctx.fill()
  }
  // Eyes (frog has them on top already)
  if (k !== 3) {
    const blink = ((t + kind) % 3.3) < 0.12
    for (const s of [-1, 1]) {
      if (blink || mood > 0) {
        ctx.strokeStyle = k === 4 ? '#fff' : '#1f2937'
        ctx.lineWidth = Math.max(1.5, r * 0.08)
        ctx.beginPath()
        if (blink) {
          ctx.moveTo(s * r * 0.38 - r * 0.1, -r * 0.08)
          ctx.lineTo(s * r * 0.38 + r * 0.1, -r * 0.08)
        } else ctx.arc(s * r * 0.38, -r * 0.03, r * 0.11, Math.PI * 1.15, Math.PI * 1.85)
        ctx.stroke()
      } else {
        ctx.fillStyle = k === 4 ? '#fff' : '#1f2937'
        ell(ctx, s * r * 0.38, -r * 0.08, r * 0.09, r * 0.11)
        ctx.fill()
      }
    }
  }
  if (mood < 0) {
    ctx.strokeStyle = k === 4 ? '#ef4444' : '#1f2937'
    ctx.lineWidth = Math.max(1.5, r * 0.07)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * r * 0.55, -r * 0.35)
      ctx.lineTo(s * r * 0.22, -r * 0.25)
      ctx.stroke()
    }
  }
  // Nose & mouth
  ctx.fillStyle = '#1f2937'
  ell(ctx, 0, r * 0.22, r * 0.09, r * 0.07)
  ctx.fill()
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = Math.max(1.2, r * 0.06)
  ctx.beginPath()
  if (mood > 0) ctx.arc(0, r * 0.32, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI)
  else if (mood < 0) ctx.arc(0, r * 0.58, r * 0.16, 1.2 * Math.PI, 1.8 * Math.PI)
  else {
    ctx.moveTo(-r * 0.12, r * 0.42)
    ctx.lineTo(r * 0.12, r * 0.42)
  }
  ctx.stroke()
  // Blush
  ctx.fillStyle = mood < 0 ? 'rgba(239,68,68,0.45)' : 'rgba(244,114,182,0.4)'
  ell(ctx, -r * 0.62, r * 0.2, r * 0.13, r * 0.08)
  ctx.fill()
  ell(ctx, r * 0.62, r * 0.2, r * 0.13, r * 0.08)
  ctx.fill()
  ctx.restore()
}
