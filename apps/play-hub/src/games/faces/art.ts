/** Procedural vector characters for Face Names. */

export type Face = {
  id: number
  name: string
  skin: number
  hair: number
  hairColor: number
  eyes: number
  brows: number
  glasses: number
  hat: number
  beard: number
  mouth: number
  shirt: number
  pattern: number
  freckles: boolean
  earrings: boolean
  job: number
  fav: number
}

export const NAMES = [
  'Ava', 'Ben', 'Cleo', 'Dan', 'Eva', 'Finn', 'Gus', 'Hana', 'Ivy', 'Jack', 'Kai', 'Lena', 'Max', 'Nia', 'Omar', 'Pia',
  'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Vic', 'Wes', 'Xena', 'Yuri', 'Zoe', 'Alex', 'Bea', 'Carl', 'Dina', 'Eli', 'Faye',
  'Gina', 'Hugo', 'Iris', 'Jade', 'Kurt', 'Lily', 'Milo', 'Nora', 'Otto', 'Pam', 'Ravi', 'Sara', 'Theo', 'Ugo', 'Vera', 'Will',
  'Yara', 'Zack', 'Ada', 'Bo', 'Cora', 'Drew', 'Emma', 'Fred', 'Gil', 'Hope', 'Ian', 'Joy', 'Leo', 'Mia', 'Ned', 'Ola',
]
export const JOBS = ['Chef', 'Pilot', 'Doctor', 'Artist', 'Farmer', 'Teacher', 'Singer', 'Baker', 'Astronaut', 'Detective', 'Gardener', 'Plumber']
export const JOB_COLORS = ['#f8fafc', '#38bdf8', '#f87171', '#c084fc', '#a3e635', '#fbbf24', '#f472b6', '#fdba74', '#94a3b8', '#a8a29e', '#4ade80', '#60a5fa']
export const FAVS: { name: string; color: string }[] = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Yellow', color: '#facc15' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Teal', color: '#14b8a6' },
]

const SKINS = ['#fde3c8', '#f5c9a0', '#e0a878', '#c68456', '#8d5a3b', '#5c3a25']
const SKIN_SHADE = ['#f2c9a6', '#e4ae80', '#c98d5d', '#a96b40', '#6f442b', '#46291a']
const HAIRS = ['#1f1a17', '#4a2c1a', '#8b5a2b', '#d4a24c', '#f3d58a', '#b23a1e', '#9ca3af', '#7c3aed']
const SHIRTS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#ec4899', '#475569']

const HAIR_N = 10
const HAT_N = 6

function ri(n: number) {
  return Math.floor(Math.random() * n)
}

export function randomFace(id: number, name: string): Face {
  return {
    id,
    name,
    skin: ri(SKINS.length),
    hair: ri(HAIR_N),
    hairColor: ri(HAIRS.length),
    eyes: ri(4),
    brows: ri(3),
    glasses: Math.random() < 0.35 ? 1 + ri(3) : 0,
    hat: Math.random() < 0.3 ? 1 + ri(HAT_N - 1) : 0,
    beard: Math.random() < 0.25 ? 1 + ri(3) : 0,
    mouth: ri(4),
    shirt: ri(SHIRTS.length),
    pattern: ri(3),
    freckles: Math.random() < 0.25,
    earrings: Math.random() < 0.25,
    job: ri(JOBS.length),
    fav: ri(FAVS.length),
  }
}

const KEYS: (keyof Face)[] = ['skin', 'hair', 'hairColor', 'glasses', 'hat', 'beard', 'shirt', 'eyes', 'mouth']

/** Number of clearly visible differences between two faces. */
export function faceDistance(a: Face, b: Face) {
  let d = 0
  for (const k of KEYS) if (a[k] !== b[k]) d++
  return d
}

/** A look-alike: same base, one or two visible features changed. */
export function lookAlike(base: Face, id: number, name: string): Face {
  const f: Face = { ...base, id, name, job: ri(JOBS.length), fav: ri(FAVS.length) }
  const options: (() => void)[] = [
    () => (f.hairColor = (f.hairColor + 1 + ri(HAIRS.length - 1)) % HAIRS.length),
    () => (f.glasses = f.glasses ? 0 : 1 + ri(3)),
    () => (f.hat = f.hat ? 0 : 1 + ri(HAT_N - 1)),
    () => (f.shirt = (f.shirt + 1 + ri(SHIRTS.length - 1)) % SHIRTS.length),
    () => (f.beard = f.beard ? 0 : 1 + ri(3)),
    () => (f.hair = (f.hair + 1 + ri(HAIR_N - 1)) % HAIR_N),
  ]
  const n = 1 + (Math.random() < 0.5 ? 1 : 0)
  const picks = options.sort(() => Math.random() - 0.5).slice(0, n)
  for (const p of picks) p()
  if (faceDistance(f, base) === 0) f.shirt = (f.shirt + 1) % SHIRTS.length
  return f
}

export type FaceAnim = { t: number; blink: boolean; mood: 0 | 1 | -1 }

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

/** Back layer of hair (behind head). */
function hairBack(ctx: CanvasRenderingContext2D, f: Face, r: number) {
  ctx.fillStyle = HAIRS[f.hairColor]
  if (f.hair === 3) {
    ctx.beginPath()
    ctx.moveTo(-r * 1.0, -r * 0.2)
    ctx.quadraticCurveTo(-r * 1.15, r * 1.0, -r * 0.8, r * 1.35)
    ctx.lineTo(r * 0.8, r * 1.35)
    ctx.quadraticCurveTo(r * 1.15, r * 1.0, r * 1.0, -r * 0.2)
    ctx.closePath()
    ctx.fill()
  } else if (f.hair === 7) {
    ctx.beginPath()
    ctx.moveTo(-r * 1.05, -r * 0.3)
    ctx.quadraticCurveTo(-r * 1.15, r * 0.6, -r * 0.85, r * 0.75)
    ctx.lineTo(r * 0.85, r * 0.75)
    ctx.quadraticCurveTo(r * 1.15, r * 0.6, r * 1.05, -r * 0.3)
    ctx.closePath()
    ctx.fill()
  } else if (f.hair === 5) {
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.9 + (i / 10) * Math.PI * 1.2
      ell(ctx, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.85 - r * 0.1, r * 0.38, r * 0.38)
      ctx.fill()
    }
  } else if (f.hair === 9) {
    for (const s of [-1, 1]) {
      ell(ctx, s * r * 1.12, r * 0.25, r * 0.26, r * 0.55, s * 0.3)
      ctx.fill()
    }
  } else if (f.hair === 4 && f.hat === 0) {
    ell(ctx, 0, -r * 1.12, r * 0.38, r * 0.32)
    ctx.fill()
  }
}

/** Front layer of hair (over forehead). */
function hairFront(ctx: CanvasRenderingContext2D, f: Face, r: number, hat: boolean) {
  const col = HAIRS[f.hairColor]
  ctx.fillStyle = col
  const h = f.hair
  if (h === 0) return
  if (hat) {
    // Only side tufts peek out from under a hat.
    if (h !== 6) {
      for (const s of [-1, 1]) {
        ell(ctx, s * r * 0.82, -r * 0.25, r * 0.22, r * 0.32, s * 0.4)
        ctx.fill()
      }
    }
    return
  }
  if (h === 1 || h === 4 || h === 9) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, -r * 0.1)
    ctx.bezierCurveTo(-r * 1.05, -r * 1.1, r * 1.05, -r * 1.1, r * 0.95, -r * 0.1)
    ctx.quadraticCurveTo(r * 0.6, -r * 0.55, 0, -r * 0.58)
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.55, -r * 0.95, -r * 0.1)
    ctx.fill()
  } else if (h === 2) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, -r * 0.15)
    const spikes = 6
    for (let i = 0; i <= spikes; i++) {
      const x = -r * 0.95 + (i / spikes) * r * 1.9
      const top = -r * (0.95 + Math.sin((i / spikes) * Math.PI) * 0.35)
      ctx.lineTo(x - r * 0.12, -r * 0.7)
      ctx.lineTo(x, top)
    }
    ctx.lineTo(r * 0.95, -r * 0.15)
    ctx.quadraticCurveTo(0, -r * 0.6, -r * 0.95, -r * 0.15)
    ctx.fill()
  } else if (h === 3 || h === 7) {
    ctx.beginPath()
    ctx.moveTo(-r * 1.0, r * 0.1)
    ctx.bezierCurveTo(-r * 1.1, -r * 1.15, r * 1.1, -r * 1.15, r * 1.0, r * 0.1)
    ctx.lineTo(r * 0.82, -r * 0.2)
    ctx.quadraticCurveTo(r * 0.3, -r * 0.45, -r * 0.1, -r * 0.62)
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.3, -r * 0.82, -r * 0.2)
    ctx.closePath()
    ctx.fill()
  } else if (h === 5) {
    for (let i = 0; i < 7; i++) {
      const x = -r * 0.75 + (i / 6) * r * 1.5
      ell(ctx, x, -r * (0.72 + Math.sin((i / 6) * Math.PI) * 0.18), r * 0.3, r * 0.26)
      ctx.fill()
    }
  } else if (h === 6) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.2, -r * 0.6)
    for (let i = 0; i <= 5; i++) {
      const y = -r * 0.6 - Math.sin((i / 5) * Math.PI) * r * 0.65
      const x = -r * 0.2 + (i / 5) * r * 0.4
      ctx.lineTo(x, y - (i % 2 ? r * 0.12 : 0))
    }
    ctx.lineTo(r * 0.2, -r * 0.6)
    ctx.closePath()
    ctx.fill()
  } else if (h === 8) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, -r * 0.05)
    ctx.bezierCurveTo(-r * 1.0, -r * 1.15, r * 1.05, -r * 1.1, r * 0.98, -r * 0.15)
    ctx.quadraticCurveTo(r * 0.2, -r * 0.85, -r * 0.55, -r * 0.4)
    ctx.quadraticCurveTo(-r * 0.8, -r * 0.3, -r * 0.95, -r * 0.05)
    ctx.fill()
  }
  // Sheen
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = Math.max(1, r * 0.06)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(-r * 0.15, -r * 0.2, r * 0.7, -2.4, -1.9)
  ctx.stroke()
}

function drawHat(ctx: CanvasRenderingContext2D, f: Face, r: number) {
  const hat = f.hat
  if (hat === 1) {
    // Cap
    const c = SHIRTS[(f.shirt + 3) % SHIRTS.length]
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.moveTo(-r * 0.98, -r * 0.35)
    ctx.bezierCurveTo(-r * 0.95, -r * 1.25, r * 0.95, -r * 1.25, r * 0.98, -r * 0.35)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ell(ctx, r * 0.55, -r * 0.36, r * 0.75, r * 0.14)
    ctx.fill()
    ctx.fillStyle = c
    ell(ctx, r * 0.55, -r * 0.4, r * 0.75, r * 0.13)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ell(ctx, 0, -r * 1.02, r * 0.1, r * 0.06)
    ctx.fill()
  } else if (hat === 2) {
    // Beanie with pompom
    ctx.fillStyle = '#0ea5e9'
    ctx.beginPath()
    ctx.moveTo(-r * 0.98, -r * 0.3)
    ctx.bezierCurveTo(-r * 1.0, -r * 1.35, r * 1.0, -r * 1.35, r * 0.98, -r * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#0369a1'
    ctx.beginPath()
    ctx.roundRect(-r * 1.02, -r * 0.48, r * 2.04, r * 0.26, r * 0.1)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = Math.max(1, r * 0.05)
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(i * r * 0.26, -r * 0.48)
      ctx.lineTo(i * r * 0.26, -r * 0.24)
      ctx.stroke()
    }
    ctx.fillStyle = '#f8fafc'
    ell(ctx, 0, -r * 1.12, r * 0.2, r * 0.2)
    ctx.fill()
  } else if (hat === 3) {
    // Top hat
    ctx.fillStyle = '#111827'
    ell(ctx, 0, -r * 0.62, r * 1.15, r * 0.2)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(-r * 0.65, -r * 1.55, r * 1.3, r * 0.95, r * 0.08)
    ctx.fill()
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-r * 0.65, -r * 0.88, r * 1.3, r * 0.18)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(-r * 0.5, -r * 1.5, r * 0.15, r * 0.6)
  } else if (hat === 4) {
    // Cowboy hat
    ctx.fillStyle = '#92400e'
    ctx.beginPath()
    ctx.moveTo(-r * 1.45, -r * 0.55)
    ctx.quadraticCurveTo(0, -r * 0.25, r * 1.45, -r * 0.55)
    ctx.quadraticCurveTo(r * 1.2, -r * 0.4, 0, -r * 0.38)
    ctx.quadraticCurveTo(-r * 1.2, -r * 0.4, -r * 1.45, -r * 0.55)
    ctx.fill()
    ctx.fillStyle = '#b45309'
    ctx.beginPath()
    ctx.moveTo(-r * 0.7, -r * 0.5)
    ctx.quadraticCurveTo(-r * 0.75, -r * 1.35, -r * 0.2, -r * 1.2)
    ctx.quadraticCurveTo(0, -r * 1.05, r * 0.2, -r * 1.2)
    ctx.quadraticCurveTo(r * 0.75, -r * 1.35, r * 0.7, -r * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#451a03'
    ctx.fillRect(-r * 0.7, -r * 0.68, r * 1.4, r * 0.14)
  } else if (hat === 5) {
    // Crown
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.moveTo(-r * 0.75, -r * 0.6)
    ctx.lineTo(-r * 0.8, -r * 1.3)
    ctx.lineTo(-r * 0.4, -r * 0.95)
    ctx.lineTo(0, -r * 1.45)
    ctx.lineTo(r * 0.4, -r * 0.95)
    ctx.lineTo(r * 0.8, -r * 1.3)
    ctx.lineTo(r * 0.75, -r * 0.6)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = Math.max(1, r * 0.05)
    ctx.stroke()
    ctx.fillStyle = '#ef4444'
    ell(ctx, 0, -r * 0.82, r * 0.11, r * 0.11)
    ctx.fill()
    ctx.fillStyle = '#3b82f6'
    ell(ctx, -r * 0.45, -r * 0.78, r * 0.08, r * 0.08)
    ell(ctx, r * 0.45, -r * 0.78, r * 0.08, r * 0.08)
    ctx.fill()
  }
}

/**
 * Head-and-shoulders portrait centred on the head; r = head radius.
 * Drawn in about a 2.6r × 3r box (shoulders extend to y = +1.9r).
 */
export function drawFace(ctx: CanvasRenderingContext2D, f: Face, x: number, y: number, r: number, anim: FaceAnim) {
  ctx.save()
  ctx.translate(x, y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const skin = SKINS[f.skin]
  const shade = SKIN_SHADE[f.skin]
  const outline = 'rgba(30,20,15,0.55)'
  const lw = Math.max(1, r * 0.05)

  hairBack(ctx, f, r)

  // Shoulders / shirt
  const shirt = SHIRTS[f.shirt]
  ctx.fillStyle = shirt
  ctx.beginPath()
  ctx.moveTo(-r * 1.25, r * 1.95)
  ctx.quadraticCurveTo(-r * 1.25, r * 0.95, -r * 0.35, r * 0.82)
  ctx.lineTo(r * 0.35, r * 0.82)
  ctx.quadraticCurveTo(r * 1.25, r * 0.95, r * 1.25, r * 1.95)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.clip()
  if (f.pattern === 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    for (let i = 0; i < 5; i++) ctx.fillRect(-r * 1.3, r * (1.0 + i * 0.22), r * 2.6, r * 0.09)
  } else if (f.pattern === 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    for (let i = 0; i < 9; i++) {
      ell(ctx, -r * 0.9 + (i % 3) * r * 0.9 + (Math.floor(i / 3) % 2) * r * 0.45, r * (1.15 + Math.floor(i / 3) * 0.3), r * 0.07, r * 0.07)
      ctx.fill()
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(r * 0.5, r * 0.8, r, r * 1.2)
  ctx.restore()
  // Collar
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.moveTo(-r * 0.32, r * 0.78)
  ctx.lineTo(0, r * 1.12)
  ctx.lineTo(r * 0.32, r * 0.78)
  ctx.closePath()
  ctx.fill()

  // Neck
  ctx.fillStyle = shade
  ctx.fillRect(-r * 0.28, r * 0.55, r * 0.56, r * 0.32)

  // Ears
  for (const s of [-1, 1]) {
    ctx.fillStyle = skin
    ell(ctx, s * r * 0.92, r * 0.05, r * 0.18, r * 0.24)
    ctx.fill()
    if (f.earrings) {
      ctx.fillStyle = '#fbbf24'
      ell(ctx, s * r * 0.95, r * 0.34, r * 0.07, r * 0.07)
      ctx.fill()
    }
  }

  // Head
  const hg = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1)
  hg.addColorStop(0, skin)
  hg.addColorStop(1, shade)
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.92)
  ctx.bezierCurveTo(r * 0.62, -r * 0.92, r * 0.92, -r * 0.5, r * 0.9, 0.05 * r)
  ctx.bezierCurveTo(r * 0.88, r * 0.55, r * 0.5, r * 0.82, 0, r * 0.82)
  ctx.bezierCurveTo(-r * 0.5, r * 0.82, -r * 0.88, r * 0.55, -r * 0.9, 0.05 * r)
  ctx.bezierCurveTo(-r * 0.92, -r * 0.5, -r * 0.62, -r * 0.92, 0, -r * 0.92)
  ctx.fill()
  ctx.strokeStyle = outline
  ctx.lineWidth = lw
  ctx.stroke()

  // Cheeks / freckles
  ctx.fillStyle = 'rgba(244,114,182,0.28)'
  ell(ctx, -r * 0.5, r * 0.3, r * 0.16, r * 0.1)
  ctx.fill()
  ell(ctx, r * 0.5, r * 0.3, r * 0.16, r * 0.1)
  ctx.fill()
  if (f.freckles) {
    ctx.fillStyle = 'rgba(120,53,15,0.55)'
    for (const [fx, fy] of [[-0.55, 0.18], [-0.45, 0.26], [-0.6, 0.3], [0.55, 0.18], [0.45, 0.26], [0.6, 0.3]]) {
      ell(ctx, fx * r, fy * r, r * 0.03, r * 0.03)
      ctx.fill()
    }
  }

  hairFront(ctx, f, r, f.hat > 0)

  // Eyes
  const ey = -r * 0.02
  const ex = r * 0.34
  const dark = '#1f2937'
  if (anim.blink || anim.mood === 1 || f.eyes === 1) {
    ctx.strokeStyle = dark
    ctx.lineWidth = Math.max(1.2, r * 0.07)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      if (anim.blink) {
        ctx.moveTo(s * ex - r * 0.12, ey)
        ctx.lineTo(s * ex + r * 0.12, ey)
      } else ctx.arc(s * ex, ey + r * 0.05, r * 0.12, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    }
  } else {
    for (const s of [-1, 1]) {
      if (f.eyes === 2) {
        ctx.fillStyle = '#fff'
        ell(ctx, s * ex, ey, r * 0.15, r * 0.17)
        ctx.fill()
        ctx.fillStyle = dark
        ell(ctx, s * ex + r * 0.02, ey + r * 0.02, r * 0.09, r * 0.1)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ell(ctx, s * ex - r * 0.01, ey - r * 0.03, r * 0.035, r * 0.035)
        ctx.fill()
      } else {
        ctx.fillStyle = dark
        ell(ctx, s * ex, ey, r * 0.075, r * (f.eyes === 3 ? 0.05 : 0.09))
        ctx.fill()
        if (f.eyes === 3) {
          ctx.strokeStyle = dark
          ctx.lineWidth = Math.max(1, r * 0.05)
          ctx.beginPath()
          ctx.moveTo(s * ex - r * 0.13, ey - r * 0.06)
          ctx.lineTo(s * ex + r * 0.13, ey - r * 0.06)
          ctx.stroke()
        }
      }
    }
  }
  // Brows
  ctx.strokeStyle = f.hair === 0 ? '#57534e' : HAIRS[f.hairColor]
  ctx.lineWidth = Math.max(1.4, r * (f.brows === 2 ? 0.1 : 0.065))
  const sad = anim.mood === -1
  for (const s of [-1, 1]) {
    ctx.beginPath()
    if (f.brows === 1) {
      ctx.moveTo(s * (ex - r * 0.14), ey - r * (sad ? 0.2 : 0.26))
      ctx.lineTo(s * (ex + r * 0.14), ey - r * (sad ? 0.3 : 0.22))
    } else {
      ctx.arc(s * ex, ey - r * 0.12, r * 0.15, Math.PI * (sad ? 1.35 : 1.2), Math.PI * (sad ? 1.65 : 1.8))
    }
    ctx.stroke()
  }

  // Nose
  ctx.strokeStyle = shade
  ctx.lineWidth = Math.max(1, r * 0.06)
  ctx.beginPath()
  ctx.moveTo(0, r * 0.08)
  ctx.quadraticCurveTo(r * 0.09, r * 0.22, -r * 0.02, r * 0.26)
  ctx.stroke()

  // Mouth
  const my = r * 0.47
  const mood = anim.mood
  ctx.strokeStyle = '#7f1d1d'
  ctx.lineWidth = Math.max(1.2, r * 0.065)
  if (mood === -1) {
    ctx.beginPath()
    ctx.arc(0, my + r * 0.16, r * 0.17, Math.PI * 1.2, Math.PI * 1.8)
    ctx.stroke()
  } else if (mood === 1 || f.mouth === 1) {
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.moveTo(-r * 0.24, my - r * 0.04)
    ctx.quadraticCurveTo(0, my + r * 0.32, r * 0.24, my - r * 0.04)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillRect(-r * 0.17, my - r * 0.03, r * 0.34, r * 0.07)
  } else if (f.mouth === 2) {
    ctx.fillStyle = '#7f1d1d'
    ell(ctx, 0, my + r * 0.03, r * 0.08, r * 0.1)
    ctx.fill()
  } else if (f.mouth === 3) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.16, my + r * 0.04)
    ctx.quadraticCurveTo(r * 0.05, my + r * 0.1, r * 0.2, my - r * 0.06)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(0, my - r * 0.06, r * 0.18, Math.PI * 0.2, Math.PI * 0.8)
    ctx.stroke()
  }

  // Facial hair
  if (f.beard) {
    ctx.fillStyle = HAIRS[f.hairColor]
    if (f.beard === 1) {
      ctx.beginPath()
      ctx.moveTo(-r * 0.28, my - r * 0.04)
      ctx.quadraticCurveTo(-r * 0.15, my - r * 0.2, 0, my - r * 0.1)
      ctx.quadraticCurveTo(r * 0.15, my - r * 0.2, r * 0.28, my - r * 0.04)
      ctx.quadraticCurveTo(0, my - r * 0.02, -r * 0.28, my - r * 0.04)
      ctx.fill()
    } else if (f.beard === 2) {
      ctx.beginPath()
      ctx.moveTo(-r * 0.88, r * 0.05)
      ctx.quadraticCurveTo(-r * 0.75, r * 0.95, 0, r * 0.98)
      ctx.quadraticCurveTo(r * 0.75, r * 0.95, r * 0.88, r * 0.05)
      ctx.quadraticCurveTo(r * 0.6, r * 0.5, r * 0.3, my)
      ctx.quadraticCurveTo(0, my - r * 0.18, -r * 0.3, my)
      ctx.quadraticCurveTo(-r * 0.6, r * 0.5, -r * 0.88, r * 0.05)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(-r * 0.15, my + r * 0.18)
      ctx.quadraticCurveTo(0, my + r * 0.48, r * 0.15, my + r * 0.18)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Glasses
  if (f.glasses) {
    ctx.strokeStyle = f.glasses === 3 ? '#111827' : '#334155'
    ctx.lineWidth = Math.max(1.2, r * 0.06)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      if (f.glasses === 1) ctx.arc(s * ex, ey, r * 0.2, 0, Math.PI * 2)
      else ctx.roundRect(s * ex - r * 0.22, ey - r * 0.16, r * 0.44, r * 0.32, r * 0.06)
      if (f.glasses === 3) {
        ctx.fillStyle = 'rgba(17,24,39,0.88)'
        ctx.fill()
      } else {
        ctx.fillStyle = 'rgba(186,230,253,0.18)'
        ctx.fill()
      }
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(-ex + r * 0.2, ey - r * 0.02)
    ctx.quadraticCurveTo(0, ey - r * 0.1, ex - r * 0.2, ey - r * 0.02)
    ctx.stroke()
    if (f.glasses === 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = Math.max(1, r * 0.04)
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(s * ex - r * 0.12, ey - r * 0.06)
        ctx.lineTo(s * ex - r * 0.03, ey - r * 0.1)
        ctx.stroke()
      }
    }
  }

  drawHat(ctx, f, r)
  ctx.restore()
}
