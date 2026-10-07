import { useEffect, useRef, type RefObject } from 'react'

export type Frame = {
  ctx: CanvasRenderingContext2D
  /** Canvas size in CSS pixels. */
  w: number
  h: number
  /** Real seconds since last frame (clamped). */
  raw: number
  /** Seconds since mount. */
  t: number
}

/**
 * Drives a DPR-aware canvas that fills its parent. `onFrame` is read from a
 * ref every tick, so it can close over fresh state without restarting the loop.
 */
export function useActionCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onFrame: (frame: Frame) => void,
  onResize?: (w: number, h: number) => void,
) {
  const frameRef = useRef(onFrame)
  const resizeRef = useRef(onResize)
  frameRef.current = onFrame
  resizeRef.current = onResize

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let last = performance.now()
    let t = 0

    function fit() {
      const el = canvas!
      const rect = el.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      const nw = Math.max(1, Math.round(rect.width))
      const nh = Math.max(1, Math.round(rect.height))
      if (nw === w && nh === h) return
      w = nw
      h = nh
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      resizeRef.current?.(w, h)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)

    function loop(now: number) {
      const raw = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      t += raw
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      frameRef.current({ ctx: ctx!, w, h, raw, t })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    function onVisibility() {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [canvasRef])
}

/** Pointer position in canvas CSS pixels. */
export function localPoint(e: { clientX: number; clientY: number }, el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

/** Floating virtual joystick: touch anywhere to plant it, drag to steer. */
export class Stick {
  id: number | null = null
  ox = 0
  oy = 0
  x = 0
  y = 0
  readonly radius: number

  constructor(radius = 54) {
    this.radius = radius
  }

  get active() {
    return this.id != null
  }

  down(id: number, x: number, y: number) {
    this.id = id
    this.ox = x
    this.oy = y
    this.x = x
    this.y = y
  }

  move(id: number, x: number, y: number) {
    if (id !== this.id) return
    this.x = x
    this.y = y
    const dx = x - this.ox
    const dy = y - this.oy
    const d = Math.hypot(dx, dy)
    // Drag the base along so the stick never feels "stuck" at the rim.
    if (d > this.radius * 1.4) {
      const k = (d - this.radius * 1.4) / d
      this.ox += dx * k
      this.oy += dy * k
    }
  }

  up(id: number) {
    if (id === this.id) this.id = null
  }

  /** Direction vector with magnitude 0..1. */
  vec() {
    if (!this.active) return { x: 0, y: 0, mag: 0 }
    const dx = this.x - this.ox
    const dy = this.y - this.oy
    const d = Math.hypot(dx, dy)
    if (d < 4) return { x: 0, y: 0, mag: 0 }
    const mag = Math.min(1, d / this.radius)
    return { x: (dx / d) * mag, y: (dy / d) * mag, mag }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return
    const v = this.vec()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(this.ox, this.oy, this.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.arc(this.ox + v.x * this.radius, this.oy + v.y * this.radius, this.radius * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
