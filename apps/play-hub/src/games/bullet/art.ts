/** Cached bullet sprites and vector art for Bullet Storm. */

export type BType = 'orb' | 'big' | 'rice' | 'star'
export const BCOLORS = ['#f472b6', '#22d3ee', '#a78bfa', '#facc15', '#4ade80', '#fb7185', '#60a5fa', '#fb923c']
export const BRADIUS: Record<BType, number> = { orb: 5, big: 9, rice: 3.6, star: 5.5 }

const cache = new Map<string, { c: HTMLCanvasElement; size: number }>()

/** Pre-rendered bullet (glow + colour + white core). Rice/star sprites point along +x. */
export function bulletSprite(type: BType, color: number) {
  const key = `${type}|${color}`
  const hit = cache.get(key)
  if (hit) return hit
  const col = BCOLORS[color % BCOLORS.length]
  const r = BRADIUS[type]
  const size = Math.ceil(r * 4.4 + (type === 'rice' ? 10 : 0))
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = c.height = Math.ceil(size * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(size / 2, size / 2)
  const halo = g.createRadialGradient(0, 0, r * 0.6, 0, 0, size / 2)
  halo.addColorStop(0, col)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  g.globalAlpha = 0.45
  g.fillStyle = halo
  if (type === 'rice') {
    g.beginPath()
    g.ellipse(0, 0, size / 2, r * 2.2, 0, 0, Math.PI * 2)
    g.fill()
  } else {
    g.beginPath()
    g.arc(0, 0, size / 2, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.fillStyle = col
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = 1.2
  if (type === 'rice') {
    g.beginPath()
    g.ellipse(0, 0, r * 2.4, r * 1.15, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.ellipse(0.5, 0, r * 1.5, r * 0.5, 0, 0, Math.PI * 2)
    g.fill()
  } else if (type === 'star') {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rr = i % 2 ? r * 0.55 : r * 1.35
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.closePath()
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(0, 0, r * 0.45, 0, Math.PI * 2)
    g.fill()
  } else {
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(0, 0, r * 0.55, 0, Math.PI * 2)
    g.fill()
  }
  const out = { c, size }
  cache.set(key, out)
  return out
}

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Player ship, nose up. */
export function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, bank: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1 - Math.abs(bank) * 0.3, 1)
  const f = 7 + Math.sin(t * 45) * 2.5
  ctx.fillStyle = 'rgba(244,114,182,0.5)'
  ell(ctx, -5, 13 + f * 0.5, 2.6, f)
  ell(ctx, 5, 13 + f * 0.5, 2.6, f)
  ctx.fillStyle = '#fdf4ff'
  ell(ctx, -5, 12 + f * 0.3, 1.3, f * 0.5)
  ell(ctx, 5, 12 + f * 0.3, 1.3, f * 0.5)
  // Wings
  ctx.fillStyle = '#7e22ce'
  ctx.beginPath()
  ctx.moveTo(0, -6)
  ctx.lineTo(17, 8)
  ctx.lineTo(15, 13)
  ctx.lineTo(4, 9)
  ctx.lineTo(-4, 9)
  ctx.lineTo(-15, 13)
  ctx.lineTo(-17, 8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e879f9'
  ctx.beginPath()
  ctx.moveTo(0, -4)
  ctx.lineTo(15, 8)
  ctx.lineTo(4, 6)
  ctx.lineTo(-4, 6)
  ctx.lineTo(-15, 8)
  ctx.closePath()
  ctx.fill()
  // Hull
  const g = ctx.createLinearGradient(-6, 0, 6, 0)
  g.addColorStop(0, '#cbd5e1')
  g.addColorStop(0.5, '#ffffff')
  g.addColorStop(1, '#94a3b8')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -20)
  ctx.lineTo(6, -4)
  ctx.lineTo(7, 12)
  ctx.lineTo(-7, 12)
  ctx.lineTo(-6, -4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0891b2'
  ell(ctx, 0, -7, 2.8, 5.5)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ell(ctx, -0.8, -9, 1, 2)
  ctx.fillStyle = '#f0abfc'
  ctx.fillRect(-15.5, 8, 2, 4)
  ctx.fillRect(13.5, 8, 2, 4)
  ctx.restore()
}

export type EKind = 'pop' | 'fan' | 'turret' | 'swirl' | 'sniper'

/** Enemy craft, facing down. */
export function drawEnemy(ctx: CanvasRenderingContext2D, kind: EKind, x: number, y: number, t: number, flash: boolean, spin: number) {
  const c = (col: string) => (flash ? '#ffffff' : col)
  ctx.save()
  ctx.translate(x, y)
  if (kind === 'pop') {
    ctx.rotate(spin)
    ctx.fillStyle = c('#be123c')
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2
      ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12)
      ctx.lineTo(Math.cos(a + Math.PI / 3) * 6, Math.sin(a + Math.PI / 3) * 6)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c('#fda4af')
    ell(ctx, 0, 0, 5, 5)
    ctx.fillStyle = '#1f0a12'
    ell(ctx, 0, 1, 2.4, 2.4)
  } else if (kind === 'fan') {
    ctx.fillStyle = c('#4c1d95')
    ctx.beginPath()
    ctx.moveTo(0, 18)
    ctx.lineTo(22, -6)
    ctx.lineTo(16, -14)
    ctx.lineTo(0, -8)
    ctx.lineTo(-16, -14)
    ctx.lineTo(-22, -6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c('#a78bfa')
    ctx.beginPath()
    ctx.moveTo(0, 13)
    ctx.lineTo(15, -4)
    ctx.lineTo(0, -3)
    ctx.lineTo(-15, -4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c('#fde047')
    ell(ctx, 0, 4, 4, 5)
    ctx.fillStyle = 'rgba(253,224,71,0.5)'
    ell(ctx, -10, -12, 3, 4 + Math.sin(t * 30))
    ell(ctx, 10, -12, 3, 4 + Math.sin(t * 30))
  } else if (kind === 'turret') {
    ctx.fillStyle = c('#0f766e')
    ell(ctx, 0, 0, 20, 20)
    ctx.rotate(spin)
    ctx.fillStyle = c('#14b8a6')
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(15, -3, 9, 6)
    }
    ctx.fillStyle = c('#5eead4')
    ell(ctx, 0, 0, 13, 13)
    ctx.fillStyle = c('#042f2e')
    ell(ctx, 0, 0, 7, 7)
    ctx.fillStyle = '#f0fdfa'
    ell(ctx, 0, 0, 3 + Math.sin(t * 6), 3 + Math.sin(t * 6))
  } else if (kind === 'swirl') {
    ctx.rotate(spin * 2)
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2)
      ctx.fillStyle = c('#c2410c')
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(14, -4, 16, 8)
      ctx.quadraticCurveTo(8, 4, 0, 6)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = c('#fdba74')
    ell(ctx, 0, 0, 7, 7)
    ctx.fillStyle = '#431407'
    ell(ctx, 0, 0, 3, 3)
  } else {
    ctx.fillStyle = c('#1e3a8a')
    ctx.beginPath()
    ctx.moveTo(0, 20)
    ctx.lineTo(8, -2)
    ctx.lineTo(14, -12)
    ctx.lineTo(0, -6)
    ctx.lineTo(-14, -12)
    ctx.lineTo(-8, -2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c('#60a5fa')
    ctx.fillRect(-1.5, 2, 3, 18)
    ctx.fillStyle = c('#f87171')
    ell(ctx, 0, -2, 3.5, 3.5)
  }
  ctx.restore()
}

/** The stage boss: a crystalline flagship with orbiting rings. */
export function drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, hue: string, flash: boolean, rage: number, form: 'seraph' | 'eye' | 'moth' | 'crystal' = 'seraph') {
  if (form !== 'seraph') {
    drawBossAlt(ctx, x, y, t, hue, flash, rage, form)
    return
  }
  ctx.save()
  ctx.translate(x, y)
  // Aura
  const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 80)
  aura.addColorStop(0, hue)
  aura.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 0.25 + rage * 0.15
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(0, 0, 80, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  // Orbiting rings
  ctx.strokeStyle = hue
  ctx.lineWidth = 2
  for (let i = 0; i < 2; i++) {
    ctx.save()
    ctx.rotate(t * (i ? -0.8 : 0.6))
    ctx.beginPath()
    ctx.ellipse(0, 0, 54, 18, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#fdf4ff'
    ctx.beginPath()
    ctx.arc(54, 0, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // Wings
  const wf = flash ? '#ffffff' : '#312e81'
  ctx.fillStyle = wf
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sd * 12, -10)
    ctx.lineTo(sd * 48, -22 + Math.sin(t * 2) * 3)
    ctx.lineTo(sd * 40, 6)
    ctx.lineTo(sd * 54, 20)
    ctx.lineTo(sd * 16, 16)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = flash ? '#ffffff' : hue
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sd * 16, -6)
    ctx.lineTo(sd * 40, -15)
    ctx.lineTo(sd * 34, 4)
    ctx.lineTo(sd * 18, 8)
    ctx.closePath()
    ctx.fill()
  }
  // Core crystal
  const g = ctx.createLinearGradient(-18, -26, 18, 26)
  g.addColorStop(0, flash ? '#ffffff' : '#f5d0fe')
  g.addColorStop(0.5, flash ? '#ffffff' : hue)
  g.addColorStop(1, flash ? '#ffffff' : '#3b0764')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -30)
  ctx.lineTo(18, -6)
  ctx.lineTo(12, 22)
  ctx.lineTo(0, 30)
  ctx.lineTo(-12, 22)
  ctx.lineTo(-18, -6)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -30)
  ctx.lineTo(0, 30)
  ctx.moveTo(-18, -6)
  ctx.lineTo(18, -6)
  ctx.stroke()
  // Eye
  const pulse = 1 + Math.sin(t * 8) * 0.15
  ctx.fillStyle = '#0b0216'
  ell(ctx, 0, 4, 9, 6)
  ctx.fillStyle = rage > 0.5 ? '#f43f5e' : '#fde047'
  ell(ctx, 0, 4, 4 * pulse, 4 * pulse)
  ctx.fillStyle = '#ffffff'
  ell(ctx, -1.2, 2.8, 1.3, 1.3)
  ctx.restore()
}

export type IKind = 'p' | 'bigp' | 'pt' | 'bomb' | 'life'

export function drawItem(ctx: CanvasRenderingContext2D, kind: IKind, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  if (kind === 'p' || kind === 'bigp') {
    const s = kind === 'bigp' ? 1.5 : 1
    ctx.scale(s, s)
    ctx.fillStyle = 'rgba(248,113,113,0.35)'
    ell(ctx, 0, 0, 10, 10)
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-6, -6, 12, 12)
    ctx.fillStyle = '#fecaca'
    ctx.fillRect(-6, -6, 12, 3)
    ctx.fillStyle = '#ffffff'
    ctx.font = "900 9px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('P', 0, 1)
  } else if (kind === 'pt') {
    ctx.rotate(t * 3)
    ctx.fillStyle = 'rgba(96,165,250,0.35)'
    ell(ctx, 0, 0, 9, 9)
    ctx.fillStyle = '#2563eb'
    ctx.fillRect(-5, -5, 10, 10)
    ctx.fillStyle = '#bfdbfe'
    ctx.fillRect(-2.5, -2.5, 5, 5)
  } else if (kind === 'bomb') {
    ctx.rotate(t * 2)
    ctx.fillStyle = 'rgba(74,222,128,0.35)'
    ell(ctx, 0, 0, 13, 13)
    ctx.fillStyle = '#16a34a'
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const r = i % 2 ? 4 : 9
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#dcfce7'
    ell(ctx, 0, 0, 2.5, 2.5)
  } else {
    const b = 1 + Math.sin(t * 6) * 0.1
    ctx.scale(b, b)
    ctx.fillStyle = 'rgba(244,114,182,0.35)'
    ell(ctx, 0, 0, 13, 13)
    ctx.fillStyle = '#ec4899'
    ctx.beginPath()
    ctx.moveTo(0, 8)
    ctx.bezierCurveTo(-12, 0, -8, -10, 0, -4)
    ctx.bezierCurveTo(8, -10, 12, 0, 0, 8)
    ctx.fill()
    ctx.fillStyle = '#fce7f3'
    ell(ctx, -3.5, -3.5, 1.6, 1.6)
  }
  ctx.restore()
}

/** Alternate boss bodies: a petal-ringed eye, a great moth and a rotating crystal star. */
function drawBossAlt(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, hue: string, flash: boolean, rage: number, form: 'eye' | 'moth' | 'crystal') {
  ctx.save()
  ctx.translate(x, y)
  const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 84)
  aura.addColorStop(0, hue)
  aura.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 0.25 + rage * 0.15
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(0, 0, 84, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  const body = flash ? '#ffffff' : hue
  if (form === 'eye') {
    // Petals breathing around a huge eye
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 0.4
      const len = 46 + Math.sin(t * 3 + i) * 5
      ctx.fillStyle = i % 2 ? '#1e1b4b' : body
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * len * 0.55, Math.sin(a) * len * 0.55, len * 0.5, 9, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#f8fafc'
    ell(ctx, 0, 0, 26, 22)
    const look = Math.sin(t * 0.9) * 6
    ctx.fillStyle = body
    ell(ctx, look, 2, 13, 13)
    ctx.fillStyle = '#0b0216'
    ell(ctx, look, 2, rage > 0.5 ? 3 : 6, 9)
    ctx.fillStyle = '#ffffff'
    ell(ctx, look - 4, -3, 2.4, 2.4)
    ctx.strokeStyle = '#1e1b4b'
    ctx.lineWidth = 3
    const lid = Math.max(0, Math.sin(t * 0.7) - 0.9) * 10
    ctx.beginPath()
    ctx.ellipse(0, 0, 26, 22 - lid * 2, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (form === 'moth') {
    const flap = Math.sin(t * 3) * 0.12
    for (const sd of [-1, 1]) {
      ctx.save()
      ctx.scale(sd, 1)
      ctx.rotate(flap)
      ctx.fillStyle = flash ? '#ffffff' : '#312e81'
      ctx.beginPath()
      ctx.moveTo(6, -6)
      ctx.quadraticCurveTo(60, -52, 70, -10)
      ctx.quadraticCurveTo(66, 12, 10, 6)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(6, 6)
      ctx.quadraticCurveTo(50, 20, 44, 46)
      ctx.quadraticCurveTo(24, 44, 6, 14)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = body
      ell(ctx, 42, -16, 12, 9)
      ell(ctx, 30, 28, 7, 6)
      ctx.fillStyle = '#0b0216'
      ell(ctx, 42, -16, 5, 4)
      ctx.restore()
    }
    const g = ctx.createLinearGradient(0, -26, 0, 30)
    g.addColorStop(0, flash ? '#ffffff' : '#fef3c7')
    g.addColorStop(1, body)
    ctx.fillStyle = g
    ell(ctx, 0, 2, 9, 28)
    ctx.strokeStyle = body
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-3, -24)
    ctx.quadraticCurveTo(-14, -40, -22, -38)
    ctx.moveTo(3, -24)
    ctx.quadraticCurveTo(14, -40, 22, -38)
    ctx.stroke()
    ctx.fillStyle = rage > 0.5 ? '#f43f5e' : '#fde047'
    ell(ctx, -4, -16, 2.6, 2.6)
    ell(ctx, 4, -16, 2.6, 2.6)
  } else {
    // Crystal star: rotating spikes around a faceted core
    ctx.save()
    ctx.rotate(t * 0.5)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const L = i % 2 ? 40 : 58
      ctx.fillStyle = i % 2 ? '#1e1b4b' : body
      ctx.beginPath()
      ctx.moveTo(Math.cos(a - 0.22) * 16, Math.sin(a - 0.22) * 16)
      ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L)
      ctx.lineTo(Math.cos(a + 0.22) * 16, Math.sin(a + 0.22) * 16)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    const g = ctx.createLinearGradient(-20, -20, 20, 20)
    g.addColorStop(0, flash ? '#ffffff' : '#f0fdfa')
    g.addColorStop(0.5, body)
    g.addColorStop(1, '#0b0216')
    ctx.fillStyle = g
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - t * 0.8
      if (i === 0) ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22)
      else ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22)
    }
    ctx.closePath()
    ctx.fill()
    const pulse = 1 + Math.sin(t * 8) * 0.15
    ctx.fillStyle = '#0b0216'
    ell(ctx, 0, 0, 8, 8)
    ctx.fillStyle = rage > 0.5 ? '#f43f5e' : '#fde047'
    ell(ctx, 0, 0, 4 * pulse, 4 * pulse)
  }
  ctx.restore()
}
