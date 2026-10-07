/** Road Hopper extra art: lava vents, coral snakes, shield power-up, ambient particles. */
import { shadow, type Ambient } from './art'

/** Lava vent on a grass tile. warn 0..1 = rumble build-up; erupt >= 0 = eruption progress 0..1 (-1 when not erupting). */
export function drawVent(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, t: number, warn: number, erupt: number) {
  const jx = warn > 0 && erupt < 0 ? Math.sin(t * 60) * warn * 1.5 : 0
  ctx.fillStyle = '#292524'
  ctx.beginPath()
  ctx.ellipse(x + jx, y + C * 0.06, C * 0.36, C * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#44403c'
  ctx.beginPath()
  ctx.ellipse(x + jx, y + C * 0.02, C * 0.3, C * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  const heat = erupt >= 0 ? 1 : 0.25 + warn * 0.75
  const g = ctx.createRadialGradient(x + jx, y + C * 0.04, 1, x + jx, y + C * 0.04, C * 0.22)
  g.addColorStop(0, `rgba(254,240,138,${heat})`)
  g.addColorStop(0.5, `rgba(249,115,22,${heat * 0.9})`)
  g.addColorStop(1, 'rgba(127,29,29,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x + jx, y + C * 0.04, C * 0.22, C * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(251,146,60,${0.35 + heat * 0.5})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - C * 0.3, y + C * 0.1)
  ctx.lineTo(x - C * 0.42, y + C * 0.2)
  ctx.moveTo(x + C * 0.28, y + C * 0.12)
  ctx.lineTo(x + C * 0.44, y + C * 0.06)
  ctx.stroke()
  if (warn > 0 && erupt < 0) {
    ctx.strokeStyle = `rgba(239,68,68,${0.4 + 0.4 * Math.sin(t * 18)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, y + C * 0.06, C * (0.38 + warn * 0.08), C * (0.23 + warn * 0.05), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#fdba74'
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.6 + i / 3) % 1
      ctx.globalAlpha = 1 - k
      ctx.beginPath()
      ctx.arc(x + (i - 1) * C * 0.1, y - k * C * 0.5 * warn, C * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  if (erupt >= 0) {
    const hgt = C * 1.6 * Math.min(1, erupt * 4) * (1 - Math.max(0, erupt - 0.8) * 4)
    const wob = Math.sin(t * 30) * C * 0.03
    const fg = ctx.createLinearGradient(0, y - hgt, 0, y)
    fg.addColorStop(0, 'rgba(254,240,138,0)')
    fg.addColorStop(0.25, '#fde047')
    fg.addColorStop(0.6, '#f97316')
    fg.addColorStop(1, '#dc2626')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.moveTo(x - C * 0.24, y + C * 0.06)
    ctx.quadraticCurveTo(x - C * 0.28 + wob, y - hgt * 0.5, x + wob, y - hgt)
    ctx.quadraticCurveTo(x + C * 0.28 + wob, y - hgt * 0.5, x + C * 0.24, y + C * 0.06)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.ellipse(x, y - hgt * 0.35, C * 0.07, Math.max(1, hgt * 0.25), 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Coral snake: red / black / yellow bands. (x, y) = head ground position, dir = travel direction. */
export function drawSnake(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, C: number, t: number) {
  const n = 9
  const seg = (len * C) / n
  shadow(ctx, x - dir * len * C * 0.45 + C * 0.06, y + C * 0.16, len * C * 0.5, C * 0.12, 0.2)
  const bands = ['#dc2626', '#111827', '#facc15', '#111827']
  for (let i = n - 1; i >= 0; i--) {
    const sx = x - dir * i * seg
    const sy = y + Math.sin(t * 9 - i * 0.9) * C * 0.09
    const r = C * (0.15 - i * 0.008)
    ctx.fillStyle = bands[i % 4]
    ctx.beginPath()
    ctx.arc(sx, sy - C * 0.06, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.arc(sx - r * 0.25, sy - C * 0.06 - r * 0.45, r * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const hy = y + Math.sin(t * 9) * C * 0.09 - C * 0.08
  const hx = x + dir * C * 0.12
  ctx.fillStyle = '#b91c1c'
  ctx.beginPath()
  ctx.ellipse(hx, hy, C * 0.2, C * 0.15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.ellipse(hx - C * 0.02, hy - C * 0.04, C * 0.14, C * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  if (Math.sin(t * 7) > 0.2) {
    const tx = hx + dir * C * 0.2
    ctx.strokeStyle = '#be123c'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(tx, hy + C * 0.02)
    ctx.lineTo(tx + dir * C * 0.14, hy + C * 0.02)
    ctx.lineTo(tx + dir * C * 0.2, hy - C * 0.03)
    ctx.moveTo(tx + dir * C * 0.14, hy + C * 0.02)
    ctx.lineTo(tx + dir * C * 0.2, hy + C * 0.07)
    ctx.stroke()
  }
  for (const s of [-1, 1]) {
    const ex = hx + dir * C * 0.06 + s * C * 0.06
    const ey = hy - C * 0.06
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(ex, ey, C * 0.045, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.fillRect(ex - 1, ey - C * 0.035, 2, C * 0.07)
  }
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(hx + dir * C * 0.06 - C * 0.12, hy - C * 0.14)
  ctx.lineTo(hx + dir * C * 0.06 - C * 0.02, hy - C * 0.1)
  ctx.moveTo(hx + dir * C * 0.06 + C * 0.12, hy - C * 0.14)
  ctx.lineTo(hx + dir * C * 0.06 + C * 0.02, hy - C * 0.1)
  ctx.stroke()
}

/** Pulsing red warning chevron at a lane edge (something is about to enter, pointing in its travel direction). */
export function drawEdgeWarn(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, C: number, t: number) {
  const a = 0.5 + 0.5 * Math.sin(t * 14)
  ctx.globalAlpha = 0.4 + a * 0.6
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(x + dir * C * 0.34, y)
  ctx.lineTo(x, y - C * 0.24)
  ctx.lineTo(x, y + C * 0.24)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + dir * C * 0.1 - 1.5, y - C * 0.12, 3, C * 0.13)
  ctx.fillRect(x + dir * C * 0.1 - 1.5, y + C * 0.05, 3, 3)
  ctx.globalAlpha = 1
}

/** Bubble shield power-up. */
export function drawShieldPickup(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, t: number) {
  const by = y - C * 0.38 + Math.sin(t * 3 + x) * 3
  shadow(ctx, x, y + C * 0.1, C * 0.2, C * 0.07, 0.2)
  const g = ctx.createRadialGradient(x - C * 0.08, by - C * 0.08, 1, x, by, C * 0.26)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.45, 'rgba(103,232,249,0.65)')
  g.addColorStop(1, 'rgba(14,116,144,0.85)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, by, C * 0.26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0e7490'
  ctx.beginPath()
  ctx.moveTo(x, by - C * 0.13)
  ctx.lineTo(x + C * 0.11, by - C * 0.08)
  ctx.quadraticCurveTo(x + C * 0.1, by + C * 0.08, x, by + C * 0.14)
  ctx.quadraticCurveTo(x - C * 0.1, by + C * 0.08, x - C * 0.11, by - C * 0.08)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.fillRect(x - 1.5, by - C * 0.07, 3, C * 0.14)
  ctx.fillRect(x - C * 0.06, by - 1.5, C * 0.12, 3)
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, by, C * 0.26, -2.4, -1.4)
  ctx.stroke()
}

/** Shield bubble around the frog. */
export function drawShieldAura(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, t: number) {
  const r = C * (0.5 + Math.sin(t * 5) * 0.03)
  ctx.fillStyle = 'rgba(103,232,249,0.16)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(165,243,252,0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.arc(x, y, r * 0.8, -2.5 + t, -1.7 + t)
  ctx.stroke()
}

/** Gold Rush lane overlay. */
export function drawRushTint(ctx: CanvasRenderingContext2D, top: number, VW: number, C: number, t: number, r: number) {
  ctx.fillStyle = 'rgba(250,204,21,0.3)'
  ctx.fillRect(0, top, VW, C + 0.5)
  ctx.fillStyle = 'rgba(255,251,235,0.35)'
  const off = ((t * 60 + r * 23) % (VW + 60)) - 30
  ctx.beginPath()
  ctx.moveTo(off, top)
  ctx.lineTo(off + 14, top)
  ctx.lineTo(off + 4, top + C)
  ctx.lineTo(off - 10, top + C)
  ctx.closePath()
  ctx.fill()
}

/** Screen-space ambient particles for the current biome; stateless (derived from time). */
export function drawAmbient(ctx: CanvasRenderingContext2D, kind: Ambient, W: number, H: number, t: number) {
  if (kind === 'none') return
  const n = kind === 'rain' ? 40 : 26
  for (let i = 0; i < n; i++) {
    const s1 = ((i * 9301 + 49297) % 233280) / 233280
    const s2 = ((i * 4096 + 150889) % 714025) / 714025
    const s3 = ((i * 7919) % 1000) / 1000
    let x = s1 * W
    let y = s2 * H
    switch (kind) {
      case 'snow': {
        y = (y + t * (30 + s3 * 30)) % H
        x = (x + Math.sin(t + i) * 14 + W) % W
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.arc(x, y, 1.5 + s3 * 2, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'rain': {
        y = (y + t * (380 + s3 * 200)) % H
        x = (x - t * 60 + W * 100) % W
        ctx.strokeStyle = 'rgba(165,180,252,0.45)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 3, y + 12)
        ctx.stroke()
        break
      }
      case 'dust': {
        x = (x + t * (25 + s3 * 30)) % W
        y = (y + Math.sin(t * 0.8 + i) * 10 + H) % H
        ctx.fillStyle = 'rgba(217,119,6,0.25)'
        ctx.beginPath()
        ctx.arc(x, y, 1.5 + s3 * 2.5, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'fireflies': {
        x = (x + Math.sin(t * 0.7 + i * 2) * 20 + W) % W
        y = (y + Math.cos(t * 0.6 + i) * 16 + H) % H
        const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + i * 1.7))
        ctx.fillStyle = `rgba(254,240,138,${a * 0.3})`
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(254,249,195,${a})`
        ctx.beginPath()
        ctx.arc(x, y, 1.8, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'leaves': {
        y = (y + t * (40 + s3 * 25)) % H
        x = (x + Math.sin(t * 1.3 + i) * 24 + t * 12 + W * 100) % W
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(t * 2 + i)
        ctx.fillStyle = i % 2 ? 'rgba(234,88,12,0.8)' : 'rgba(250,204,21,0.8)'
        ctx.beginPath()
        ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        break
      }
      case 'embers': {
        y = H - ((H - y + t * (45 + s3 * 50)) % H)
        x = (x + Math.sin(t * 1.5 + i) * 12 + W) % W
        const a = 0.5 + 0.5 * Math.sin(t * 6 + i)
        ctx.fillStyle = `rgba(251,146,60,${0.35 + a * 0.5})`
        ctx.beginPath()
        ctx.arc(x, y, 1.4 + s3 * 1.8, 0, Math.PI * 2)
        ctx.fill()
        if (i % 3 === 0) {
          ctx.fillStyle = 'rgba(68,64,60,0.25)'
          ctx.beginPath()
          ctx.arc((x + 40) % W, (y + 70) % H, 3 + s3 * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
      case 'sparkle': {
        y = (y - t * 8 + H * 100) % H
        const a = Math.max(0, Math.sin(t * 2.5 + i * 2.1))
        if (a < 0.1) break
        const r = 2 + s3 * 3
        ctx.fillStyle = i % 2 ? `rgba(165,243,252,${a})` : `rgba(240,171,252,${a})`
        ctx.beginPath()
        ctx.moveTo(x, y - r * 2)
        ctx.lineTo(x + r * 0.5, y)
        ctx.lineTo(x, y + r * 2)
        ctx.lineTo(x - r * 0.5, y)
        ctx.closePath()
        ctx.moveTo(x - r * 2, y)
        ctx.lineTo(x, y + r * 0.5)
        ctx.lineTo(x + r * 2, y)
        ctx.lineTo(x, y - r * 0.5)
        ctx.closePath()
        ctx.fill()
        break
      }
    }
  }
}
