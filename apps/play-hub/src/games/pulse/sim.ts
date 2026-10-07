// Pulse Dash physics, kept free of rendering/audio so the level solver can run the exact same rules.

export const T = 30
export const H2 = 12
export const G = 2600
export const JUMP = 590
export const PADV = 820
export const SHIP_ACC = 1700
export const CEIL_H = 7 * T
export const TOL = 9

export type Mode = 'cube' | 'ship'
export type PortalKind = 'up' | 'down' | 'ship' | 'cube'
export type Obj =
  | { k: 'spike'; x: number; y: number; dir: 1 | -1 }
  | { k: 'block'; x: number; y: number; w: number; h: number }
  | { k: 'pad'; x: number; used: boolean }
  | { k: 'orb'; x: number; y: number; used: boolean }
  | { k: 'gem'; x: number; y: number; got: boolean }
  | { k: 'portal'; x: number; kind: PortalKind; used: boolean }
  | { k: 'cp'; x: number; stage: number; used: boolean }
export type Seg = { x0: number; x1: number }

export type SimWorld = {
  objs: Obj[]
  ground: Seg[]
  ceil: Seg[]
  x: number
  y: number
  vy: number
  gdir: 1 | -1
  mode: Mode
  grounded: boolean
  buffer: number
  speed: number
  inv: number
}

/** Side effects the game wants to react to (effects, stats). `crash` returns true when the run ends. */
export type Hooks = {
  crash: () => boolean
  jump?: () => void
  pad?: () => void
  orb?: (o: { x: number; y: number }) => void
  gem?: (o: { x: number; y: number }) => void
  portal?: (kind: PortalKind) => void
  cp?: (o: { x: number; stage: number }) => void
}

export function addSeg(list: Seg[], x0: number, x1: number) {
  const last = list[list.length - 1]
  if (last && Math.abs(last.x1 - x0) < 1) last.x1 = x1
  else list.push({ x0, x1 })
}

/** One physics substep. Returns false if the run ended. */
export function simSub(w: SimWorld, dt: number, hold: boolean, demo: boolean, gemR: number, h: Hooks): boolean {
  const prevY = w.y
  w.buffer -= dt

  // Demo autopilot: jump at obstacles ahead
  let demoJump = false
  if (demo) {
    for (const o of w.objs) {
      if ((o.k === 'spike' || o.k === 'block') && o.x > w.x && o.x - w.x < T * 1.6) demoJump = true
    }
    const onGap = !w.ground.some((g) => g.x0 <= w.x + T * 1.3 && g.x1 >= w.x + T * 1.3)
    if (onGap) demoJump = true
  }

  if (w.mode === 'cube') {
    w.vy += G * w.gdir * dt
    w.vy = Math.max(-900, Math.min(900, w.vy))
    if (w.grounded && (hold || w.buffer > 0 || demoJump)) {
      w.vy = -JUMP * w.gdir
      w.grounded = false
      w.buffer = 0
      h.jump?.()
    }
  } else {
    w.vy += (hold ? -SHIP_ACC : SHIP_ACC * 0.85) * dt
    w.vy = Math.max(-380, Math.min(380, w.vy))
  }
  w.x += w.speed * dt
  w.y += w.vy * dt
  w.grounded = false

  const px0 = w.x - H2
  const px1 = w.x + H2
  const inv = w.inv > 0 || demo
  const land = (top: number, bottom: number): boolean => {
    if (w.y + H2 <= top || w.y - H2 >= bottom) return true
    if (w.vy >= 0 && prevY + H2 <= top + TOL) {
      w.y = top - H2
      w.vy = 0
      if (w.gdir === 1 || w.mode === 'ship') w.grounded = w.mode === 'cube'
      return true
    }
    if (w.vy <= 0 && prevY - H2 >= bottom - TOL) {
      w.y = bottom + H2
      w.vy = 0
      if (w.gdir === -1 && w.mode === 'cube') w.grounded = true
      return true
    }
    if (inv) {
      w.y = top < -9000 ? bottom + H2 : top - H2
      w.vy = 0
      w.grounded = w.gdir === 1
      return true
    }
    return !h.crash()
  }
  for (const g of w.ground) {
    if (px1 <= g.x0 || px0 >= g.x1) continue
    if (!land(0, 99999)) return false
  }
  for (const c of w.ceil) {
    if (px1 <= c.x0 || px0 >= c.x1) continue
    if (!land(-99999, -CEIL_H)) return false
  }
  // Invulnerable safety floors over gaps
  if (inv && w.mode === 'cube') {
    if (w.gdir === 1 && w.y + H2 > 0) {
      w.y = -H2
      w.vy = 0
      w.grounded = true
    }
    if (w.gdir === -1 && w.y - H2 < -CEIL_H) {
      w.y = -CEIL_H + H2
      w.vy = 0
      w.grounded = true
    }
  }

  for (const o of w.objs) {
    if (o.x > px1 + T * 2) break
    if (o.x + T * 8 < px0) continue
    if (o.k === 'block') {
      if (px1 <= o.x || px0 >= o.x + o.w) continue
      if (!land(o.y, o.y + o.h)) return false
    } else if (o.k === 'spike') {
      if (inv) continue
      const sx0 = o.x + T * 0.32
      const sx1 = o.x + T * 0.68
      const sy0 = o.dir === 1 ? o.y + T * 0.38 : o.y
      const sy1 = o.dir === 1 ? o.y + T : o.y + T * 0.62
      if (px1 - 2 > sx0 && px0 + 2 < sx1 && w.y + H2 - 2 > sy0 && w.y - H2 + 2 < sy1) {
        if (h.crash()) return false
      }
    } else if (o.k === 'pad') {
      if (!o.used && px1 > o.x && px0 < o.x + T && w.y + H2 > -10 && w.gdir === 1) {
        o.used = true
        w.vy = -PADV
        w.grounded = false
        h.pad?.()
      }
    } else if (o.k === 'orb') {
      const near = Math.hypot(o.x - w.x, o.y - w.y) < 34
      if (!o.used && near && (w.buffer > 0 || (hold && w.vy * w.gdir > 0) || demo)) {
        o.used = true
        w.vy = -JUMP * 1.05 * w.gdir
        w.buffer = 0
        h.orb?.(o)
      }
    } else if (o.k === 'gem') {
      if (!o.got && Math.hypot(o.x - w.x, o.y - w.y) < gemR) {
        o.got = true
        h.gem?.(o)
      }
    } else if (o.k === 'portal') {
      if (!o.used && w.x >= o.x + T / 2) {
        o.used = true
        if (o.kind === 'up') w.gdir = -1
        else if (o.kind === 'down') w.gdir = 1
        else if (o.kind === 'ship') {
          w.mode = 'ship'
          w.gdir = 1
        } else w.mode = 'cube'
        h.portal?.(o.kind)
      }
    } else if (o.k === 'cp') {
      if (!o.used && w.x >= o.x) {
        o.used = true
        h.cp?.(o)
      }
    }
  }

  // Fell out of the world
  if (w.y > 260 || w.y < -CEIL_H - 360) {
    if (demo) {
      w.y = -H2
      w.vy = 0
    } else if (h.crash()) return false
  }
  return true
}
