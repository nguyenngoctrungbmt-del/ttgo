/** Sky themes that rotate in during long runs: cached sky/skyline layer + live weather. */

export type Weather = 'stars' | 'dust' | 'snow' | 'rain'

export type Theme = {
  name: string
  sub: string
  accent: string
  ground: string
  lip: string
  weather: Weather
}

export const THEMES: Theme[] = [
  { name: 'Midnight City', sub: 'back under the moon', accent: '#a78bfa', ground: '#1c1917', lip: '#44403c', weather: 'stars' },
  { name: 'Desert Dusk', sub: 'the sun sinks low', accent: '#fb923c', ground: '#2a1608', lip: '#9a3412', weather: 'dust' },
  { name: 'Aurora Tundra', sub: 'snow over the north', accent: '#5eead4', ground: '#1e293b', lip: '#e2e8f0', weather: 'snow' },
  { name: 'Storm Front', sub: 'lightning in the clouds', accent: '#cbd5e1', ground: '#111113', lip: '#52525b', weather: 'rain' },
]

export const AURORA = 2
export const STORM = 3

/** Waves 1-3 midnight, then a new sky every 3 waves, cycling. */
export function themeForWave(wave: number) {
  if (wave < 4) return 0
  return (1 + Math.floor((wave - 4) / 3)) % THEMES.length
}

function h(i: number, k: number) {
  return ((i * k) % 997) / 997
}

function skyline(c: CanvasRenderingContext2D, W: number, gy: number, body: string, lit: string, n: number, seed: number) {
  c.fillStyle = body
  for (let i = 0; i < n; i++) {
    const bw = 16 + ((i * 37 + seed) % 14)
    const bh = 26 + ((i * 53 + seed) % 46)
    c.fillRect((i / n) * W - 4, gy - bh, bw, bh)
  }
  c.fillStyle = lit
  for (let i = 0; i < 40; i++) c.fillRect((((i * 41 + seed) % 100) / 100) * W, gy - 8 - ((i * 29) % 50), 2, 2)
}

function paintNight(c: CanvasRenderingContext2D, W: number, H: number, gy: number) {
  const sky = c.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#020617')
  sky.addColorStop(0.7, '#1e1b4b')
  sky.addColorStop(1, '#4c1d95')
  c.fillStyle = sky
  c.fillRect(0, 0, W, H)
  softGlow(c, W * 0.8, H * 0.14, 60, '199,210,254', 0.25)
  c.fillStyle = '#e0e7ff'
  c.beginPath()
  c.arc(W * 0.8, H * 0.14, 18, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#1e1b4b'
  c.beginPath()
  c.arc(W * 0.8 + 7, H * 0.14 - 4, 16, 0, Math.PI * 2)
  c.fill()
  skyline(c, W, gy, '#2e1065', 'rgba(253,224,71,0.25)', 18, 0)
}

function paintDusk(c: CanvasRenderingContext2D, W: number, H: number, gy: number) {
  const sky = c.createLinearGradient(0, 0, 0, gy)
  sky.addColorStop(0, '#1e1b4b')
  sky.addColorStop(0.45, '#9d174d')
  sky.addColorStop(0.78, '#ea580c')
  sky.addColorStop(1, '#fcd34d')
  c.fillStyle = sky
  c.fillRect(0, 0, W, H)
  // Thin high clouds lit from below
  c.fillStyle = 'rgba(253,186,116,0.35)'
  for (let i = 0; i < 6; i++) {
    c.beginPath()
    c.ellipse(h(i, 613) * W, H * (0.18 + h(i, 211) * 0.25), 50 + h(i, 97) * 40, 4, 0, 0, Math.PI * 2)
    c.fill()
  }
  // Setting sun with retro bands
  const sx = W * 0.32
  const sy = gy - 84
  softGlow(c, sx, sy, 130, '251,146,60', 0.45)
  const sg = c.createLinearGradient(0, sy - 52, 0, sy + 52)
  sg.addColorStop(0, '#fef9c3')
  sg.addColorStop(1, '#f97316')
  c.fillStyle = sg
  c.beginPath()
  c.arc(sx, sy, 52, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = 'rgba(157,23,77,0.55)'
  for (let k = 0; k < 4; k++) c.fillRect(sx - 54, sy + 8 + k * 9, 108, 2 + k)
  // Far mesas
  c.fillStyle = 'rgba(124,45,18,0.75)'
  c.beginPath()
  c.moveTo(0, gy)
  c.lineTo(0, gy - 50)
  c.lineTo(W * 0.12, gy - 52)
  c.lineTo(W * 0.18, gy - 30)
  c.lineTo(W * 0.55, gy - 34)
  c.lineTo(W * 0.6, gy - 70)
  c.lineTo(W * 0.78, gy - 72)
  c.lineTo(W * 0.84, gy - 40)
  c.lineTo(W, gy - 44)
  c.lineTo(W, gy)
  c.closePath()
  c.fill()
  skyline(c, W, gy, '#431407', 'rgba(254,240,138,0.45)', 16, 7)
}

function paintAurora(c: CanvasRenderingContext2D, W: number, H: number, gy: number) {
  const sky = c.createLinearGradient(0, 0, 0, gy)
  sky.addColorStop(0, '#020617')
  sky.addColorStop(0.6, '#0b2a3a')
  sky.addColorStop(1, '#115e59')
  c.fillStyle = sky
  c.fillRect(0, 0, W, H)
  c.fillStyle = 'rgba(224,242,254,0.55)'
  for (let i = 0; i < 40; i++) c.fillRect(h(i, 449) * W, h(i, 733) * gy * 0.7, 1.2, 1.2)
  // Snowy peaks
  c.fillStyle = '#2f5a86'
  c.beginPath()
  c.moveTo(0, gy)
  const peaks = [0, 0.14, 0.3, 0.46, 0.62, 0.8, 1]
  peaks.forEach((k, i) => c.lineTo(k * W, gy - (i % 2 ? 90 : 40) - h(i, 37) * 30))
  c.lineTo(W, gy)
  c.closePath()
  c.fill()
  c.fillStyle = '#e2e8f0'
  for (let i = 1; i < peaks.length; i += 2) {
    const px = peaks[i] * W
    const py = gy - 90 - h(i, 37) * 30
    c.beginPath()
    c.moveTo(px, py)
    c.lineTo(px - 14, py + 18)
    c.lineTo(px - 4, py + 13)
    c.lineTo(px + 3, py + 19)
    c.lineTo(px + 13, py + 16)
    c.closePath()
    c.fill()
  }
  skyline(c, W, gy, '#061726', 'rgba(165,243,252,0.45)', 18, 13)
  // Snow on rooftops
  c.fillStyle = 'rgba(226,232,240,0.7)'
  for (let i = 0; i < 18; i++) {
    const bw = 16 + ((i * 37 + 13) % 14)
    const bh = 26 + ((i * 53 + 13) % 46)
    c.fillRect((i / 18) * W - 4, gy - bh, bw, 2)
  }
}

function paintStorm(c: CanvasRenderingContext2D, W: number, H: number, gy: number) {
  const sky = c.createLinearGradient(0, 0, 0, gy)
  sky.addColorStop(0, '#0f0f14')
  sky.addColorStop(0.55, '#27272a')
  sky.addColorStop(1, '#3f3f50')
  c.fillStyle = sky
  c.fillRect(0, 0, W, H)
  // Heavy cloud banks: dark lumps with lighter underside
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 9; i++) {
      const x = (i / 8) * W + (row % 2 ? 20 : -10)
      const y = H * (0.06 + row * 0.09) + h(i + row * 9, 331) * 16
      const r = 34 + h(i, 89 + row) * 26
      c.fillStyle = row === 2 ? '#3f3f46' : row === 1 ? '#2e2e35' : '#1f1f25'
      c.beginPath()
      c.ellipse(x, y, r * 1.4, r * 0.6, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = 'rgba(161,161,170,0.12)'
      c.beginPath()
      c.ellipse(x, y + r * 0.35, r * 1.1, r * 0.18, 0, 0, Math.PI * 2)
      c.fill()
    }
  }
  // Rain curtains in the distance
  c.strokeStyle = 'rgba(161,161,170,0.12)'
  c.lineWidth = 14
  for (let i = 0; i < 4; i++) {
    const x = h(i, 523) * W
    c.beginPath()
    c.moveTo(x, H * 0.3)
    c.lineTo(x - 30, gy)
    c.stroke()
  }
  skyline(c, W, gy, '#1c1c22', 'rgba(254,240,138,0.2)', 18, 21)
}

const PAINTERS = [paintNight, paintDusk, paintAurora, paintStorm]
const cache = new Map<string, HTMLCanvasElement>()

export function themeLayer(idx: number, W: number, H: number, gy: number, dpr: number) {
  const key = `${idx}|${W}|${H}|${dpr}`
  let cv = cache.get(key)
  if (!cv) {
    if (cache.size > 8) cache.clear()
    cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(W * dpr))
    cv.height = Math.max(1, Math.round(H * dpr))
    const c = cv.getContext('2d')
    if (c) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      PAINTERS[idx](c, W, H, gy)
    }
    cache.set(key, cv)
  }
  return cv
}

/** Glow fading to the same hue (rgb given as 'r,g,b'). */
export function softGlow(c: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${alpha})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  c.fillStyle = g
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
}

export type Sky = {
  motes: { x: number; y: number; vx: number; vy: number; life: number; s: number }[]
  bolt: { x: number; y: number }[]
  boltT: number
  nextBolt: number
}

export function freshSky(): Sky {
  return { motes: [], bolt: [], boltT: 0, nextBolt: 4 }
}

const MAX_MOTES = 60

/** Live layer drawn over the cached sky: twinkles, aurora ribbons, birds, lightning. */
export function drawSkyLive(ctx: CanvasRenderingContext2D, idx: number, W: number, H: number, gy: number, t: number, sky: Sky, alpha: number) {
  ctx.globalAlpha = alpha
  if (idx === 0) {
    ctx.fillStyle = '#e0e7ff'
    for (let i = 0; i < 50; i++) {
      ctx.globalAlpha = alpha * (0.3 + 0.3 * Math.sin(t * 2 + i))
      ctx.fillRect((i * 97.3) % W, (i * 53.7) % (H * 0.7), 1.5, 1.5)
    }
  } else if (idx === 1) {
    // Distant birds
    ctx.strokeStyle = 'rgba(67,20,7,0.7)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 4; i++) {
      const bx = ((t * (14 + i * 3) + i * 97) % (W + 60)) - 30
      const by = H * (0.22 + i * 0.05) + Math.sin(t + i) * 6
      const f = Math.sin(t * 8 + i * 2) * 3
      ctx.beginPath()
      ctx.moveTo(bx - 6, by - f)
      ctx.lineTo(bx, by)
      ctx.lineTo(bx + 6, by - f)
      ctx.stroke()
    }
  } else if (idx === AURORA) {
    for (let k = 0; k < 3; k++) {
      const base = H * (0.14 + k * 0.08)
      const col = k === 1 ? '167,139,250' : '52,211,153'
      const g = ctx.createLinearGradient(0, base - 30, 0, base + 46)
      g.addColorStop(0, `rgba(${col},0)`)
      g.addColorStop(0.55, `rgba(${col},0.32)`)
      g.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      const seg = 12
      for (let i = 0; i <= seg; i++) {
        const x = (i / seg) * W
        const y = base + Math.sin(x * 0.012 + t * 0.5 + k * 2) * 16 - 30
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      for (let i = seg; i >= 0; i--) {
        const x = (i / seg) * W
        ctx.lineTo(x, base + Math.sin(x * 0.012 + t * 0.5 + k * 2 + 0.6) * 16 + 46)
      }
      ctx.closePath()
      ctx.fill()
    }
  } else if (idx === STORM && sky.boltT > 0 && sky.bolt.length) {
    ctx.globalAlpha = alpha * Math.min(1, sky.boltT * 6) * 0.25
    ctx.fillStyle = '#e0e7ff'
    ctx.fillRect(0, 0, W, gy)
    ctx.globalAlpha = alpha * Math.min(1, sky.boltT * 6)
    ctx.lineJoin = 'round'
    for (const [col, lw] of [['rgba(196,181,253,0.5)', 6], ['#f5f3ff', 2]] as const) {
      ctx.strokeStyle = col
      ctx.lineWidth = lw
      ctx.beginPath()
      sky.bolt.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/** Returns true on the frame a lightning bolt strikes (for a thunder sfx). */
export function stepSky(sky: Sky, idx: number, weather: Weather, W: number, H: number, gy: number, dt: number) {
  let struck = false
  if (idx === STORM) {
    sky.boltT = Math.max(0, sky.boltT - dt)
    sky.nextBolt -= dt
    if (sky.nextBolt <= 0) {
      sky.nextBolt = 4 + Math.random() * 5
      sky.boltT = 0.22
      sky.bolt = []
      let x = Math.random() * W
      let y = H * 0.12
      const end = gy - 40 - Math.random() * 60
      sky.bolt.push({ x, y })
      while (y < end) {
        y += 16 + Math.random() * 18
        x += (Math.random() - 0.5) * 34
        sky.bolt.push({ x, y })
      }
      struck = true
    }
  }
  const rate = weather === 'rain' ? 70 : weather === 'snow' ? 22 : weather === 'dust' ? 10 : 0
  let n = rate * dt
  while (n > 0 && sky.motes.length < MAX_MOTES) {
    if (n < 1 && Math.random() > n) break
    n -= 1
    if (weather === 'rain') sky.motes.push({ x: Math.random() * (W + 80), y: -10, vx: -90, vy: 520 + Math.random() * 120, life: 2, s: 1 })
    else if (weather === 'snow') sky.motes.push({ x: Math.random() * W, y: -6, vx: 8 + Math.random() * 10, vy: 26 + Math.random() * 24, life: 30, s: 1 + Math.random() * 1.8 })
    else sky.motes.push({ x: -6, y: Math.random() * gy, vx: 30 + Math.random() * 30, vy: (Math.random() - 0.5) * 8, life: 30, s: 1 + Math.random() * 1.5 })
  }
  for (const m of sky.motes) {
    m.x += (m.vx + (weather === 'snow' ? Math.sin(m.y * 0.05) * 10 : 0)) * dt
    m.y += m.vy * dt
    m.life -= dt
  }
  for (let i = sky.motes.length - 1; i >= 0; i--) {
    const m = sky.motes[i]
    if (m.life <= 0 || m.y > gy || m.x > W + 10 || m.x < -90) sky.motes.splice(i, 1)
  }
  return struck
}

export function drawWeather(ctx: CanvasRenderingContext2D, sky: Sky, weather: Weather) {
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(203,213,225,0.45)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (const m of sky.motes) {
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * 0.03, m.y - m.vy * 0.03)
    }
    ctx.stroke()
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (const m of sky.motes) {
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.s, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (weather === 'dust') {
    ctx.fillStyle = 'rgba(254,215,170,0.5)'
    for (const m of sky.motes) ctx.fillRect(m.x, m.y, m.s * 1.6, m.s)
  }
}
