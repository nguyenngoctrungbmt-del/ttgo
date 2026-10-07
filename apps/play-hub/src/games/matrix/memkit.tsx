/**
 * Small kit shared by the memory games (matrix, cups, darkmaze, changed, nback):
 * SVG hearts, power-up buttons, symbol shapes and canvas helpers.
 */
import type { ReactNode } from 'react'
import './mem.css'

const HEART = 'M12 21s-7.4-4.5-9.5-9.1C1 8.5 3.1 4.6 6.7 4.6c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.6 0 5.7 3.9 4.2 7.3C19.4 16.5 12 21 12 21z'

export function Hearts({ hp, max, shield = 0 }: { hp: number; max: number; shield?: number }) {
  return (
    <span className="mem-hearts" aria-label={`${hp} of ${max} hearts`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={i < hp ? 'is-on' : 'is-off'}>
          <path d={HEART} />
          {i < hp ? <ellipse cx="8" cy="9" rx="2" ry="1.4" fill="#fff" opacity="0.55" /> : null}
        </svg>
      ))}
      {shield > 0 ? (
        <span className="mem-hearts__shield">
          {ICONS.shield}
          {shield}
        </span>
      ) : null}
    </span>
  )
}

export type Power = { id: string; label: string; icon: ReactNode; count: number; disabled?: boolean; active?: boolean }

/** Bottom power-up tray; stops pointer propagation so taps never reach the arena. */
export function PowerBar({ powers, onUse }: { powers: Power[]; onUse: (id: string) => void }) {
  return (
    <div className="mem-powers" onPointerDown={(e) => e.stopPropagation()}>
      {powers.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`mem-power${p.active ? ' is-active' : ''}`}
          disabled={p.disabled || p.count <= 0}
          onClick={() => onUse(p.id)}
          aria-label={`${p.label} (${p.count} left)`}
        >
          <span className="mem-power__icon">{p.icon}</span>
          <span className="mem-power__label">{p.label}</span>
          <span className="mem-power__count">{p.count}</span>
        </button>
      ))}
    </div>
  )
}

const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const ICONS = {
  peek: (
    <svg {...sv}>
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </svg>
  ),
  shield: (
    <svg {...sv}>
      <path d="M12 2.5l8 3v6c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10v-6z" fill="currentColor" fillOpacity="0.25" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  ),
  freeze: (
    <svg {...sv}>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
    </svg>
  ),
  reveal: (
    <svg {...sv}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
      <path d="M10.5 7.5v6M7.5 10.5h6" />
    </svg>
  ),
  oil: (
    <svg {...sv}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  slow: (
    <svg {...sv}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2.5h6" />
    </svg>
  ),
}

// ── Canvas helpers ──────────────────────────────────────────

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)))
}

export type Sym = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'cross' | 'hex' | 'plus' | 'heart' | 'moon'
export const SYMS: Sym[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'hex', 'plus', 'heart', 'moon']

/** Builds a symbol path centred on (x, y) with radius r (caller fills/strokes). */
export function symPath(ctx: CanvasRenderingContext2D, s: Sym, x: number, y: number, r: number) {
  ctx.beginPath()
  if (s === 'circle') ctx.arc(x, y, r, 0, Math.PI * 2)
  else if (s === 'square') ctx.roundRect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7, r * 0.22)
  else if (s === 'triangle') {
    ctx.moveTo(x, y - r)
    ctx.lineTo(x + r * 0.98, y + r * 0.75)
    ctx.lineTo(x - r * 0.98, y + r * 0.75)
    ctx.closePath()
  } else if (s === 'diamond') {
    ctx.moveTo(x, y - r * 1.05)
    ctx.lineTo(x + r * 0.8, y)
    ctx.lineTo(x, y + r * 1.05)
    ctx.lineTo(x - r * 0.8, y)
    ctx.closePath()
  } else if (s === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const d = i % 2 ? r * 0.45 : r * 1.05
      if (i === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
      else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    }
    ctx.closePath()
  } else if (s === 'cross') {
    const t = r * 0.3
    const pts = [[-t, -r], [t, -r], [t, -t], [r, -t], [r, t], [t, t], [t, r], [-t, r], [-t, t], [-r, t], [-r, -t], [-t, -t]]
    const c = Math.SQRT1_2
    pts.forEach(([px, py], i) => {
      const qx = x + (px - py) * c
      const qy = y + (px + py) * c
      if (i === 0) ctx.moveTo(qx, qy)
      else ctx.lineTo(qx, qy)
    })
    ctx.closePath()
  } else if (s === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    ctx.closePath()
  } else if (s === 'plus') {
    const t = r * 0.36
    ctx.moveTo(x - t, y - r)
    ctx.lineTo(x + t, y - r)
    ctx.lineTo(x + t, y - t)
    ctx.lineTo(x + r, y - t)
    ctx.lineTo(x + r, y + t)
    ctx.lineTo(x + t, y + t)
    ctx.lineTo(x + t, y + r)
    ctx.lineTo(x - t, y + r)
    ctx.lineTo(x - t, y + t)
    ctx.lineTo(x - r, y + t)
    ctx.lineTo(x - r, y - t)
    ctx.lineTo(x - t, y - t)
    ctx.closePath()
  } else if (s === 'heart') {
    ctx.moveTo(x, y + r * 0.9)
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.25, x, y - r * 0.45)
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.25, x + r * 1.4, y - r * 0.1, x, y + r * 0.9)
    ctx.closePath()
  } else {
    ctx.arc(x, y, r, Math.PI * 0.3, Math.PI * 1.7)
    ctx.arc(x + r * 0.45, y - r * 0.05, r * 0.78, Math.PI * 1.55, Math.PI * 0.45, true)
    ctx.closePath()
  }
}

/** Filled symbol with a soft darker outline. */
export function drawSym(ctx: CanvasRenderingContext2D, s: Sym, x: number, y: number, r: number, fill: string, stroke = 'rgba(0,0,0,0.35)') {
  symPath(ctx, s, x, y, r)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1, r * 0.12)
  ctx.stroke()
}

export function checkMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#fff') {
  ctx.strokeStyle = color
  ctx.lineWidth = r * 0.36
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x - r * 0.6, y + r * 0.02)
  ctx.lineTo(x - r * 0.15, y + r * 0.48)
  ctx.lineTo(x + r * 0.65, y - r * 0.45)
  ctx.stroke()
}

/**
 * Phase pill drawn on the canvas: label plus an optional draining bar (frac 0..1).
 */
export function phasePill(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string, frac: number | null, color: string, pulse = 0) {
  ctx.font = `900 14px 'Plus Jakarta Sans', system-ui, sans-serif`
  const tw = ctx.measureText(text).width
  const w = Math.max(132, tw + 40)
  const h = frac == null ? 30 : 38
  const s = 1 + pulse * 0.06
  ctx.save()
  ctx.translate(cx, y + h / 2)
  ctx.scale(s, s)
  ctx.fillStyle = 'rgba(8,10,24,0.72)'
  rr(ctx, -w / 2, -h / 2, w, h, 15)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.8
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, frac == null ? 1 : -5)
  if (frac != null) {
    const bw = w - 28
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    rr(ctx, -bw / 2, 8, bw, 5, 2.5)
    ctx.fill()
    ctx.fillStyle = color
    rr(ctx, -bw / 2, 8, bw * Math.max(0, Math.min(1, frac)), 5, 2.5)
    ctx.fill()
  }
  ctx.restore()
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Tiny seeded RNG (mulberry32) for reproducible scenes/mazes. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
