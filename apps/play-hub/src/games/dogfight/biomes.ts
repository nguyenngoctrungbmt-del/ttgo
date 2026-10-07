/** Theatres of war for Dogfight Ace: ground palette, scenery sprites and weather. */
import { rand } from '../../shared/action/fx'
import { FLOE_SIZE, ISLAND_SIZE, MESA_SIZE, floeSprite, hash2, islandSprite, mesaSprite } from './art'

export type Weather = 'none' | 'dust' | 'snow' | 'rain'
export type Biome = {
  name: string
  sub: string
  ground: [string, string]
  glint: string
  props: 'islands' | 'mesas' | 'floes'
  propDensity: number
  lowClouds: [density: number, alpha: number]
  highAlpha: number
  storm: boolean
  weather: Weather
}

export const BIOMES: Biome[] = [
  { name: 'OCEAN FRONT', sub: 'home waters', ground: ['#0e7490', '#155e75'], glint: 'rgba(207,250,254,0.22)', props: 'islands', propDensity: 0.3, lowClouds: [0.5, 0.85], highAlpha: 0.45, storm: false, weather: 'none' },
  { name: 'DESERT CANYON', sub: 'dust storms over the mesas', ground: ['#e0a764', '#c27c3e'], glint: 'rgba(124,45,18,0.28)', props: 'mesas', propDensity: 0.38, lowClouds: [0.3, 0.55], highAlpha: 0.3, storm: false, weather: 'dust' },
  { name: 'ARCTIC SHELF', sub: 'snow and drifting ice', ground: ['#1e5a8a', '#163f63'], glint: 'rgba(224,242,254,0.32)', props: 'floes', propDensity: 0.55, lowClouds: [0.55, 0.8], highAlpha: 0.5, storm: false, weather: 'snow' },
  { name: 'NIGHT STORM', sub: 'lightning lights the sky', ground: ['#10263d', '#071321'], glint: 'rgba(148,163,184,0.18)', props: 'islands', propDensity: 0.2, lowClouds: [0.6, 0.75], highAlpha: 0.55, storm: true, weather: 'rain' },
]

/** Waves 1–4 ocean, then a new theatre every 4 waves, cycling the three new ones. */
export function biomeFor(wave: number) {
  return wave <= 4 ? 0 : 1 + (Math.floor((wave - 5) / 4) % 3)
}

/** Sea/sand with glints and scenery props on the parallax ground layer. */
export function drawGround(ctx: CanvasRenderingContext2D, b: Biome, W: number, H: number, camX: number, camY: number, t: number, alpha: number) {
  if (alpha <= 0) return
  ctx.globalAlpha = alpha
  const sea = ctx.createLinearGradient(0, 0, 0, H)
  sea.addColorStop(0, b.ground[0])
  sea.addColorStop(1, b.ground[1])
  ctx.fillStyle = sea
  ctx.fillRect(0, 0, W, H)
  const gp = 0.55
  const gx0 = camX * gp
  const gy0 = camY * gp
  // Wave glints (sea) or dune ridges (sand).
  ctx.strokeStyle = b.glint
  ctx.lineWidth = b.props === 'mesas' ? 2.5 : 1.5
  ctx.beginPath()
  const wc = b.props === 'mesas' ? 90 : 70
  for (let cx = Math.floor((gx0 - W / 2) / wc); cx <= Math.floor((gx0 + W / 2) / wc); cx++) {
    for (let cy = Math.floor((gy0 - H / 2) / wc); cy <= Math.floor((gy0 + H / 2) / wc); cy++) {
      const hv = hash2(cx, cy, 1)
      if (hv > 0.45) continue
      const sx = cx * wc + hv * 60 - gx0 + W / 2
      const sy = cy * wc + hash2(cx, cy, 2) * 60 - gy0 + H / 2
      if (b.props === 'mesas') {
        const len = 40 + hv * 50
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(sx + len / 2, sy - 10, sx + len, sy + 2)
      } else {
        const len = 6 + hv * 14
        const bob = Math.sin(t * 1.5 + hv * 10) * 2
        ctx.moveTo(sx, sy + bob)
        ctx.quadraticCurveTo(sx + len / 2, sy - 3 + bob, sx + len, sy + bob)
      }
    }
  }
  ctx.stroke()
  const S = b.props === 'mesas' ? MESA_SIZE : b.props === 'floes' ? FLOE_SIZE : ISLAND_SIZE
  const ic = b.props === 'floes' ? 360 : b.props === 'mesas' ? 440 : 520
  for (let cx = Math.floor((gx0 - W / 2 - S) / ic); cx <= Math.floor((gx0 + W / 2 + S) / ic); cx++) {
    for (let cy = Math.floor((gy0 - H / 2 - S) / ic); cy <= Math.floor((gy0 + H / 2 + S) / ic); cy++) {
      const hv = hash2(cx, cy, 7)
      if (hv > b.propDensity) continue
      const sx = cx * ic + hash2(cx, cy, 8) * (ic / 2) - gx0 + W / 2
      const sy = cy * ic + hash2(cx, cy, 9) * (ic / 2) - gy0 + H / 2
      const v = Math.floor(hv * 10) % 3
      const img = b.props === 'mesas' ? mesaSprite(v) : b.props === 'floes' ? floeSprite(v) : islandSprite(v)
      if (b.storm) ctx.globalAlpha = alpha * 0.45
      ctx.drawImage(img, sx - S / 2, sy - S / 2, S, S)
      if (b.storm) ctx.globalAlpha = alpha
    }
  }
  ctx.globalAlpha = 1
}

export type Flake = { x: number; y: number; z: number; ph: number }

export function makeWeather(b: Biome, W: number, H: number): Flake[] {
  const n = b.weather === 'rain' ? 60 : b.weather === 'snow' ? 50 : b.weather === 'dust' ? 34 : 0
  return Array.from({ length: n }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.5, 1.2), ph: rand(0, 6) }))
}

/** Screen-space weather drifting against the camera motion. */
export function drawWeather(ctx: CanvasRenderingContext2D, b: Biome, fl: Flake[], W: number, H: number, dt: number, dcx: number, dcy: number, t: number, alpha: number) {
  if (!fl.length || alpha <= 0) return
  const wx = b.weather === 'rain' ? -60 : b.weather === 'snow' ? -20 : -110
  const wy = b.weather === 'rain' ? 520 : b.weather === 'snow' ? 60 : 18
  ctx.lineCap = 'round'
  for (const f of fl) {
    f.x += wx * f.z * dt - dcx * f.z * 1.3
    f.y += wy * f.z * dt - dcy * f.z * 1.3
    if (f.x < -20) f.x += W + 40
    if (f.x > W + 20) f.x -= W + 40
    if (f.y < -20) f.y += H + 40
    if (f.y > H + 20) f.y -= H + 40
    if (b.weather === 'rain') {
      ctx.globalAlpha = 0.35 * alpha * f.z
      ctx.strokeStyle = '#bfdbfe'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(f.x, f.y)
      ctx.lineTo(f.x + wx * 0.03, f.y + wy * 0.03)
      ctx.stroke()
    } else if (b.weather === 'snow') {
      ctx.globalAlpha = (0.55 + Math.sin(t * 2 + f.ph) * 0.25) * alpha
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(f.x + Math.sin(t * 1.5 + f.ph) * 6, f.y, 1.4 + f.z * 1.2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalAlpha = 0.5 * alpha
      ctx.strokeStyle = f.ph > 3 ? '#fef3c7' : '#fde68a'
      ctx.lineWidth = 1.5 + f.z
      ctx.beginPath()
      ctx.moveTo(f.x, f.y)
      ctx.lineTo(f.x - wx * 0.08, f.y - wy * 0.08)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/** Jagged lightning bolt from the top edge. */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, H: number, seed: number, alpha: number) {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#e0f2fe'
  ctx.lineWidth = 3
  ctx.beginPath()
  let px = x
  let py = 0
  ctx.moveTo(px, py)
  for (let i = 1; i <= 9; i++) {
    px += (hash2(i, seed, 3) - 0.5) * 60
    py = (H * 0.55 * i) / 9
    ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  ctx.globalAlpha = 1
}
