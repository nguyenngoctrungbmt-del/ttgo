/**
 * Game-feel toolkit for canvas action games: particles, floating text,
 * shock rings, screen shake, hit-stop, slow-mo and screen flashes.
 * All coordinates are CSS pixels inside the canvas.
 */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  gravity: number
  drag: number
  shape: 'dot' | 'spark' | 'square'
  rot: number
  spin: number
}

type Floater = {
  x: number
  y: number
  vy: number
  life: number
  max: number
  text: string
  color: string
  size: number
}

type Ring = {
  x: number
  y: number
  r: number
  maxR: number
  life: number
  max: number
  color: string
  width: number
}

export type BurstOpts = {
  count?: number
  color?: string | string[]
  speed?: number
  size?: number
  life?: number
  gravity?: number
  drag?: number
  shape?: Particle['shape']
  /** Emit direction in radians; omitted = all around. */
  angle?: number
  spread?: number
}

const MAX_PARTICLES = 420

function pick<T>(v: T | T[]): T {
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v
}

export class Fx {
  particles: Particle[] = []
  floaters: Floater[] = []
  rings: Ring[] = []
  shakeMag = 0
  shakeTime = 0
  shakeDur = 0
  hitstop = 0
  slowTime = 0
  slowScale = 1
  flashTime = 0
  flashDur = 0
  flashColor = '#fff'
  offsetX = 0
  offsetY = 0

  reset() {
    this.particles = []
    this.floaters = []
    this.rings = []
    this.shakeMag = 0
    this.shakeTime = 0
    this.hitstop = 0
    this.slowTime = 0
    this.flashTime = 0
  }

  burst(x: number, y: number, opts: BurstOpts = {}) {
    const {
      count = 14,
      color = '#fff',
      speed = 220,
      size = 3,
      life = 0.55,
      gravity = 300,
      drag = 2.2,
      shape = 'dot',
      angle,
      spread = Math.PI * 2,
    } = opts
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift()
      const a = angle == null ? Math.random() * Math.PI * 2 : angle + (Math.random() - 0.5) * spread
      const s = speed * (0.35 + Math.random() * 0.75)
      const l = life * (0.6 + Math.random() * 0.6)
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        size: size * (0.6 + Math.random() * 0.8),
        color: pick(color),
        gravity,
        drag,
        shape,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 14,
      })
    }
  }

  /** Big chunky explosion: sparks + smoke + ring + shake. */
  explode(x: number, y: number, power = 1, colors: string[] = ['#fde047', '#fb923c', '#ef4444', '#fff7ed']) {
    this.burst(x, y, { count: Math.round(18 * power), color: colors, speed: 320 * power, size: 3.2, life: 0.6, shape: 'spark' })
    this.burst(x, y, { count: Math.round(10 * power), color: ['#57534e', '#78716c', '#a8a29e'], speed: 90 * power, size: 7 * power, life: 0.8, gravity: -40, drag: 3 })
    this.ring(x, y, { color: colors[0], maxR: 46 * power, life: 0.35, width: 4 })
    this.shake(5 * power, 0.25)
  }

  text(x: number, y: number, text: string, color = '#fff', size = 18) {
    this.floaters.push({ x, y, vy: -70, life: 0.9, max: 0.9, text, color, size })
    if (this.floaters.length > 24) this.floaters.shift()
  }

  ring(x: number, y: number, opts: { color?: string; maxR?: number; life?: number; width?: number } = {}) {
    const { color = '#fff', maxR = 40, life = 0.35, width = 3 } = opts
    this.rings.push({ x, y, r: 2, maxR, life, max: life, color, width })
  }

  shake(mag: number, dur = 0.2) {
    if (mag >= this.shakeMag * (this.shakeTime / Math.max(this.shakeDur, 0.001))) {
      this.shakeMag = mag
      this.shakeTime = dur
      this.shakeDur = dur
    }
  }

  /** Freeze gameplay for a beat — makes hits land. */
  stop(seconds: number) {
    this.hitstop = Math.max(this.hitstop, seconds)
  }

  slowmo(seconds: number, scale = 0.35) {
    this.slowTime = seconds
    this.slowScale = scale
  }

  flash(color = '#fff', dur = 0.12) {
    this.flashColor = color
    this.flashTime = dur
    this.flashDur = dur
  }

  /**
   * Advance effects with real time and return the scaled delta the
   * game simulation should use (0 during hit-stop).
   */
  step(raw: number): number {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - raw)
      const k = this.shakeTime / Math.max(this.shakeDur, 0.001)
      const m = this.shakeMag * k * k
      this.offsetX = (Math.random() * 2 - 1) * m
      this.offsetY = (Math.random() * 2 - 1) * m
    } else {
      this.offsetX = 0
      this.offsetY = 0
    }
    if (this.flashTime > 0) this.flashTime = Math.max(0, this.flashTime - raw)

    let dt = raw
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - raw)
      dt = 0
    } else if (this.slowTime > 0) {
      this.slowTime = Math.max(0, this.slowTime - raw)
      dt = raw * this.slowScale
    }

    // Particles keep moving a little during hit-stop so the frame feels alive.
    const pdt = dt === 0 ? raw * 0.15 : dt
    for (const p of this.particles) {
      p.life -= pdt
      p.vx -= p.vx * p.drag * pdt
      p.vy -= p.vy * p.drag * pdt
      p.vy += p.gravity * pdt
      p.x += p.vx * pdt
      p.y += p.vy * pdt
      p.rot += p.spin * pdt
    }
    this.particles = this.particles.filter((p) => p.life > 0)

    for (const f of this.floaters) {
      f.life -= raw
      f.y += f.vy * raw
      f.vy *= 0.94
    }
    this.floaters = this.floaters.filter((f) => f.life > 0)

    for (const r of this.rings) {
      r.life -= raw
      const k = 1 - r.life / r.max
      r.r = 2 + (r.maxR - 2) * (1 - (1 - k) * (1 - k))
    }
    this.rings = this.rings.filter((r) => r.life > 0)
    return dt
  }

  /** Call before drawing the world; pair with ctx.restore(). */
  applyShake(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.max)
      ctx.strokeStyle = r.color
      ctx.lineWidth = r.width * (r.life / r.max) + 0.5
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
      ctx.stroke()
    }

    for (const p of this.particles) {
      const k = p.life / p.max
      ctx.globalAlpha = Math.min(1, k * 1.6)
      ctx.fillStyle = p.color
      if (p.shape === 'spark') {
        const len = Math.min(18, Math.hypot(p.vx, p.vy) * 0.035) + p.size
        const a = Math.atan2(p.vy, p.vx)
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.size * k + 0.4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - Math.cos(a) * len, p.y - Math.sin(a) * len)
        ctx.stroke()
      } else if (p.shape === 'square') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        const s = p.size * (0.4 + k * 0.6)
        ctx.fillRect(-s / 2, -s / 2, s, s)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (0.3 + k * 0.7), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const f of this.floaters) {
      const k = f.life / f.max
      const pop = k > 0.8 ? 1 + (k - 0.8) * 2.5 : 1
      ctx.globalAlpha = Math.min(1, k * 2)
      ctx.font = `800 ${Math.round(f.size * pop)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      ctx.strokeText(f.text, f.x, f.y)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, f.x, f.y)
    }
    ctx.globalAlpha = 1
  }

  /** Full-screen flash; draw after restoring the shake transform. */
  drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.flashTime <= 0) return
    ctx.globalAlpha = (this.flashTime / this.flashDur) * 0.55
    ctx.fillStyle = this.flashColor
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }
}

// ── Drawing helpers ─────────────────────────────────────────

const spriteCache = new Map<string, HTMLCanvasElement>()

/** Pre-rendered emoji sprite (fast to blit every frame). */
export function emojiSprite(ch: string, size: number): HTMLCanvasElement {
  const px = Math.max(8, Math.round(size))
  const key = `${ch}|${px}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const c = document.createElement('canvas')
  const dim = Math.ceil(px * 1.3)
  c.width = dim * dpr
  c.height = dim * dpr
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  g.fillText(ch, dim / 2, dim / 2 + px * 0.06)
  spriteCache.set(key, c)
  if (spriteCache.size > 300) {
    const first = spriteCache.keys().next().value
    if (first) spriteCache.delete(first)
  }
  return c
}

export function drawEmoji(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  size: number,
  rot = 0,
  scaleX = 1,
  scaleY = 1,
) {
  const s = emojiSprite(ch, size)
  const dim = size * 1.3
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY)
  ctx.drawImage(s, -dim / 2, -dim / 2, dim, dim)
  ctx.restore()
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = alpha
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

/** Frame-rate independent exponential approach. */
export function approach(current: number, target: number, rate: number, dt: number) {
  return target + (current - target) * Math.exp(-rate * dt)
}
