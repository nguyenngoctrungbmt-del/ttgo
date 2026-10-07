/** Vector art for Merge Defenders: units per type and tier, enemies and bosses. */

export type UnitType = 'archer' | 'mage' | 'cannon' | 'frost' | 'lightning'
export const UNIT_TYPES: UnitType[] = ['archer', 'mage', 'cannon', 'frost', 'lightning']
export const UNIT_NAME: Record<UnitType, string> = { archer: 'Archer', mage: 'Mage', cannon: 'Cannon', frost: 'Frost', lightning: 'Storm' }
export const UNIT_COLOR: Record<UnitType, string> = { archer: '#22c55e', mage: '#6366f1', cannon: '#475569', frost: '#38bdf8', lightning: '#facc15' }

export const TIER_BASE = ['#94a3b8', '#4ade80', '#60a5fa', '#c084fc', '#fb923c', '#f87171', '#fde047', '#f0abfc']
export const TIER_DARK = ['#475569', '#15803d', '#1d4ed8', '#7e22ce', '#c2410c', '#b91c1c', '#a16207', '#a21caf']
export const MAX_TIER = 7

type G = CanvasRenderingContext2D

function eyes(g: G, x: number, y: number, s: number, gap: number, angry = false) {
  for (const sx of [-1, 1]) {
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.ellipse(x + sx * gap, y, s, s * 1.15, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#111827'
    g.beginPath()
    g.arc(x + sx * gap + s * 0.15, y + s * 0.15, s * 0.6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(x + sx * gap + s * 0.35, y - s * 0.2, s * 0.22, 0, Math.PI * 2)
    g.fill()
  }
  if (angry) {
    g.strokeStyle = '#111827'
    g.lineWidth = s * 0.45
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x - gap - s, y - s * 1.5)
    g.lineTo(x - gap + s * 0.8, y - s * 0.9)
    g.moveTo(x + gap + s, y - s * 1.5)
    g.lineTo(x + gap - s * 0.8, y - s * 0.9)
    g.stroke()
  }
}

function radial(g: G, r: number, a: string, b: string, c: string) {
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.1)
  gr.addColorStop(0, a)
  gr.addColorStop(0.55, b)
  gr.addColorStop(1, c)
  return gr
}

function pip(g: G, x: number, y: number, s: number) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? s * 0.45 : s
    if (i === 0) g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    else g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
}

/** Unit sprite of size d (square), centered at (0,0). Tier is 1-based. */
export function drawUnit(g: G, type: UnitType, tier: number, d: number) {
  const r = d / 2
  const ti = Math.max(0, Math.min(TIER_BASE.length - 1, tier - 1))
  // pedestal
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.beginPath()
  g.ellipse(0, r * 0.72, r * 0.8, r * 0.22, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = TIER_DARK[ti]
  g.beginPath()
  g.ellipse(0, r * 0.62, r * 0.78, r * 0.24, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = TIER_BASE[ti]
  g.beginPath()
  g.ellipse(0, r * 0.55, r * 0.78, r * 0.22, 0, 0, Math.PI * 2)
  g.fill()
  if (tier >= 7) {
    const aura = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r)
    aura.addColorStop(0, 'rgba(253,224,71,0.45)')
    aura.addColorStop(1, 'rgba(253,224,71,0)')
    g.fillStyle = aura
    g.beginPath()
    g.arc(0, -r * 0.05, r, 0, Math.PI * 2)
    g.fill()
  }
  const s = 0.86 + tier * 0.02
  g.save()
  g.scale(s, s)
  switch (type) {
    case 'archer': {
      if (tier >= 3) {
        g.fillStyle = tier >= 5 ? '#b91c1c' : '#166534'
        g.beginPath()
        g.moveTo(-r * 0.35, -r * 0.1)
        g.quadraticCurveTo(-r * 0.6, r * 0.4, -r * 0.45, r * 0.5)
        g.lineTo(r * 0.45, r * 0.5)
        g.quadraticCurveTo(r * 0.6, r * 0.4, r * 0.35, -r * 0.1)
        g.fill()
      }
      g.fillStyle = radial(g, r * 0.45, '#bbf7d0', '#22c55e', '#14532d')
      g.beginPath()
      g.ellipse(0, r * 0.2, r * 0.36, r * 0.32, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fde4c8'
      g.beginPath()
      g.arc(0, -r * 0.2, r * 0.28, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#15803d'
      g.beginPath()
      g.moveTo(-r * 0.34, -r * 0.12)
      g.quadraticCurveTo(-r * 0.3, -r * 0.62, 0, -r * 0.7)
      g.quadraticCurveTo(r * 0.38, -r * 0.6, r * 0.34, -r * 0.12)
      g.quadraticCurveTo(0, -r * 0.42, -r * 0.34, -r * 0.12)
      g.fill()
      eyes(g, 0, -r * 0.15, r * 0.07, r * 0.11)
      // bow
      g.strokeStyle = tier >= 5 ? '#fbbf24' : '#92400e'
      g.lineWidth = r * 0.08
      g.lineCap = 'round'
      g.beginPath()
      g.arc(r * 0.42, r * 0.1, r * 0.36, -Math.PI / 2.2, Math.PI / 2.2)
      g.stroke()
      g.strokeStyle = '#f8fafc'
      g.lineWidth = r * 0.025
      g.beginPath()
      g.moveTo(r * 0.5, -r * 0.24)
      g.lineTo(r * 0.5, r * 0.44)
      g.stroke()
      if (tier >= 2) {
        g.fillStyle = '#ef4444'
        g.beginPath()
        g.moveTo(r * 0.12, -r * 0.62)
        g.lineTo(r * 0.36, -r * 0.82)
        g.lineTo(r * 0.24, -r * 0.56)
        g.fill()
      }
      break
    }
    case 'mage': {
      g.fillStyle = radial(g, r * 0.5, '#c7d2fe', '#6366f1', '#312e81')
      g.beginPath()
      g.moveTo(-r * 0.4, r * 0.48)
      g.quadraticCurveTo(-r * 0.3, -r * 0.05, 0, -r * 0.05)
      g.quadraticCurveTo(r * 0.3, -r * 0.05, r * 0.4, r * 0.48)
      g.closePath()
      g.fill()
      g.fillStyle = '#fde4c8'
      g.beginPath()
      g.arc(0, -r * 0.2, r * 0.25, 0, Math.PI * 2)
      g.fill()
      eyes(g, 0, -r * 0.18, r * 0.065, r * 0.1)
      if (tier >= 3) {
        g.fillStyle = '#e5e7eb'
        g.beginPath()
        g.moveTo(-r * 0.18, -r * 0.08)
        g.quadraticCurveTo(0, r * 0.4, r * 0.18, -r * 0.08)
        g.fill()
      }
      g.fillStyle = tier >= 5 ? '#7c3aed' : '#4338ca'
      g.beginPath()
      g.moveTo(-r * 0.38, -r * 0.32)
      g.lineTo(r * 0.38, -r * 0.32)
      g.lineTo(r * 0.08, -r * 0.95)
      g.closePath()
      g.fill()
      g.fillStyle = '#fde047'
      pip(g, r * 0.02, -r * 0.55, r * 0.09)
      g.strokeStyle = '#92400e'
      g.lineWidth = r * 0.07
      g.beginPath()
      g.moveTo(-r * 0.5, r * 0.45)
      g.lineTo(-r * 0.5, -r * 0.35)
      g.stroke()
      const orb = g.createRadialGradient(-r * 0.5, -r * 0.42, 0, -r * 0.5, -r * 0.42, r * 0.16)
      orb.addColorStop(0, '#ffffff')
      orb.addColorStop(1, tier >= 5 ? '#f0abfc' : '#a5b4fc')
      g.fillStyle = orb
      g.beginPath()
      g.arc(-r * 0.5, -r * 0.42, r * 0.14, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'cannon': {
      g.fillStyle = '#78350f'
      g.beginPath()
      g.roundRect(-r * 0.45, r * 0.1, r * 0.9, r * 0.3, r * 0.08)
      g.fill()
      g.save()
      g.translate(0, r * 0.05)
      g.rotate(-0.5)
      const bar = g.createLinearGradient(0, -r * 0.22, 0, r * 0.22)
      bar.addColorStop(0, '#94a3b8')
      bar.addColorStop(0.5, '#334155')
      bar.addColorStop(1, '#0f172a')
      g.fillStyle = bar
      g.beginPath()
      g.roundRect(-r * 0.3, -r * 0.22, r * 0.85, r * 0.44, r * 0.12)
      g.fill()
      g.fillStyle = '#020617'
      g.beginPath()
      g.ellipse(r * 0.55, 0, r * 0.07, r * 0.18, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = tier >= 5 ? '#fbbf24' : '#a16207'
      for (let i = 0; i < Math.min(3, 1 + Math.floor(tier / 2)); i++) g.fillRect(-r * 0.12 + i * r * 0.2, -r * 0.24, r * 0.07, r * 0.48)
      g.restore()
      for (const sx of [-1, 1]) {
        g.fillStyle = '#92400e'
        g.beginPath()
        g.arc(sx * r * 0.3, r * 0.38, r * 0.16, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#fbbf24'
        g.beginPath()
        g.arc(sx * r * 0.3, r * 0.38, r * 0.05, 0, Math.PI * 2)
        g.fill()
      }
      eyes(g, -r * 0.05, r * 0.02, r * 0.07, r * 0.12, true)
      break
    }
    case 'frost': {
      g.fillStyle = radial(g, r * 0.5, '#f0f9ff', '#7dd3fc', '#0369a1')
      g.beginPath()
      g.moveTo(0, -r * 0.75)
      g.lineTo(r * 0.38, -r * 0.1)
      g.lineTo(r * 0.25, r * 0.45)
      g.lineTo(-r * 0.25, r * 0.45)
      g.lineTo(-r * 0.38, -r * 0.1)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.8)'
      g.lineWidth = r * 0.03
      g.beginPath()
      g.moveTo(0, -r * 0.75)
      g.lineTo(0, r * 0.45)
      g.moveTo(-r * 0.38, -r * 0.1)
      g.lineTo(r * 0.38, -r * 0.1)
      g.stroke()
      eyes(g, 0, -r * 0.02, r * 0.07, r * 0.13)
      g.fillStyle = 'rgba(224,242,254,0.9)'
      const shards = Math.min(4, tier)
      for (let i = 0; i < shards; i++) {
        const a = (i / shards) * Math.PI * 2 + 0.5
        const x = Math.cos(a) * r * 0.6
        const y = Math.sin(a) * r * 0.35 - r * 0.1
        g.beginPath()
        g.moveTo(x, y - r * 0.13)
        g.lineTo(x + r * 0.07, y)
        g.lineTo(x, y + r * 0.13)
        g.lineTo(x - r * 0.07, y)
        g.fill()
      }
      break
    }
    case 'lightning': {
      g.fillStyle = radial(g, r * 0.5, '#fefce8', '#facc15', '#a16207')
      g.beginPath()
      g.arc(0, 0, r * 0.36, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = tier >= 4 ? '#475569' : '#64748b'
      g.beginPath()
      g.arc(-r * 0.25, -r * 0.42, r * 0.2, 0, Math.PI * 2)
      g.arc(0, -r * 0.52, r * 0.24, 0, Math.PI * 2)
      g.arc(r * 0.26, -r * 0.42, r * 0.2, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fef08a'
      g.beginPath()
      g.moveTo(r * 0.05, -r * 0.35)
      g.lineTo(-r * 0.12, r * 0.02)
      g.lineTo(r * 0.02, r * 0.02)
      g.lineTo(-r * 0.08, r * 0.38)
      g.lineTo(r * 0.16, -r * 0.06)
      g.lineTo(r * 0.02, -r * 0.06)
      g.closePath()
      g.fill()
      eyes(g, 0, r * 0.05, r * 0.065, r * 0.17)
      if (tier >= 3) {
        g.strokeStyle = '#fde047'
        g.lineWidth = r * 0.05
        g.beginPath()
        g.moveTo(-r * 0.52, -r * 0.05)
        g.lineTo(-r * 0.62, r * 0.12)
        g.lineTo(-r * 0.5, r * 0.15)
        g.lineTo(-r * 0.6, r * 0.32)
        g.moveTo(r * 0.52, -r * 0.05)
        g.lineTo(r * 0.62, r * 0.12)
        g.lineTo(r * 0.5, r * 0.15)
        g.lineTo(r * 0.6, r * 0.32)
        g.stroke()
      }
      break
    }
  }
  g.restore()
  // headgear by tier
  if (tier >= 4) {
    const cy = -r * 0.82
    g.fillStyle = tier >= 6 ? '#fde047' : '#e5e7eb'
    g.strokeStyle = tier >= 6 ? '#a16207' : '#64748b'
    g.lineWidth = r * 0.03
    g.beginPath()
    g.moveTo(-r * 0.2, cy + r * 0.1)
    g.lineTo(-r * 0.24, cy - r * 0.08)
    g.lineTo(-r * 0.1, cy)
    g.lineTo(0, cy - r * 0.14)
    g.lineTo(r * 0.1, cy)
    g.lineTo(r * 0.24, cy - r * 0.08)
    g.lineTo(r * 0.2, cy + r * 0.1)
    g.closePath()
    g.fill()
    g.stroke()
  }
  // tier pips
  g.fillStyle = '#ffffff'
  const n = Math.min(7, tier)
  const sp = r * 0.2
  for (let i = 0; i < n; i++) pip(g, (i - (n - 1) / 2) * sp, r * 0.58, r * 0.08)
}

export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'splitter' | 'mini' | 'shield' | 'ogre' | 'witch' | 'golem'

/** Enemy sprite of radius r centered at (0,0). */
export function drawEnemy(g: G, kind: EnemyKind, r: number) {
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.beginPath()
  g.ellipse(0, r * 0.85, r * 0.8, r * 0.22, 0, 0, Math.PI * 2)
  g.fill()
  switch (kind) {
    case 'grunt':
    case 'mini':
    case 'splitter': {
      const cols = kind === 'grunt' ? ['#bbf7d0', '#4ade80', '#166534'] : kind === 'mini' ? ['#d9f99d', '#65a30d', '#365314'] : ['#fef9c3', '#facc15', '#a16207']
      g.fillStyle = radial(g, r, cols[0], cols[1], cols[2])
      g.beginPath()
      g.moveTo(-r * 0.95, r * 0.75)
      g.quadraticCurveTo(-r, -r * 0.9, 0, -r * 0.92)
      g.quadraticCurveTo(r, -r * 0.9, r * 0.95, r * 0.75)
      g.quadraticCurveTo(0, r * 0.95, -r * 0.95, r * 0.75)
      g.fill()
      if (kind === 'splitter') {
        g.strokeStyle = 'rgba(161,98,7,0.7)'
        g.lineWidth = r * 0.08
        g.beginPath()
        g.moveTo(0, -r * 0.9)
        g.lineTo(-r * 0.1, -r * 0.3)
        g.lineTo(r * 0.08, r * 0.1)
        g.stroke()
      }
      if (kind === 'mini') {
        g.fillStyle = '#e5e7eb'
        g.beginPath()
        g.moveTo(-r * 0.6, -r * 0.6)
        g.lineTo(-r * 0.8, -r * 1.2)
        g.lineTo(-r * 0.3, -r * 0.8)
        g.moveTo(r * 0.6, -r * 0.6)
        g.lineTo(r * 0.8, -r * 1.2)
        g.lineTo(r * 0.3, -r * 0.8)
        g.fill()
      }
      eyes(g, 0, -r * 0.2, r * 0.2, r * 0.32, kind === 'mini')
      g.fillStyle = 'rgba(255,255,255,0.45)'
      g.beginPath()
      g.ellipse(-r * 0.45, -r * 0.55, r * 0.2, r * 0.1, -0.6, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'runner': {
      g.fillStyle = radial(g, r, '#fecaca', '#ef4444', '#7f1d1d')
      g.beginPath()
      g.arc(0, 0, r * 0.85, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#7f1d1d'
      g.beginPath()
      g.moveTo(-r * 0.5, -r * 0.6)
      g.lineTo(-r * 0.7, -r * 1.15)
      g.lineTo(-r * 0.2, -r * 0.8)
      g.moveTo(r * 0.5, -r * 0.6)
      g.lineTo(r * 0.7, -r * 1.15)
      g.lineTo(r * 0.2, -r * 0.8)
      g.fill()
      eyes(g, r * 0.1, -r * 0.1, r * 0.18, r * 0.3, true)
      g.strokeStyle = 'rgba(254,202,202,0.7)'
      g.lineWidth = r * 0.1
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(-r * 1.1, -r * 0.2)
      g.lineTo(-r * 1.5, -r * 0.2)
      g.moveTo(-r * 1.0, r * 0.25)
      g.lineTo(-r * 1.35, r * 0.25)
      g.stroke()
      break
    }
    case 'tank':
    case 'shield': {
      const cols = kind === 'tank' ? ['#e9d5ff', '#9333ea', '#3b0764'] : ['#dbeafe', '#3b82f6', '#1e3a8a']
      g.fillStyle = radial(g, r, cols[0], cols[1], cols[2])
      g.beginPath()
      g.roundRect(-r * 0.9, -r * 0.8, r * 1.8, r * 1.6, r * 0.5)
      g.fill()
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(-r * 0.9, -r * 0.1, r * 1.8, r * 0.18)
      eyes(g, 0, -r * 0.35, r * 0.17, r * 0.3, true)
      if (kind === 'shield') {
        g.fillStyle = '#cbd5e1'
        g.strokeStyle = '#475569'
        g.lineWidth = r * 0.08
        g.beginPath()
        g.moveTo(r * 0.55, -r * 0.4)
        g.lineTo(r * 1.15, -r * 0.4)
        g.lineTo(r * 1.15, r * 0.25)
        g.quadraticCurveTo(r * 0.85, r * 0.75, r * 0.55, r * 0.25)
        g.closePath()
        g.fill()
        g.stroke()
      } else {
        g.fillStyle = '#d8b4fe'
        for (const x of [-0.5, 0, 0.5]) {
          g.beginPath()
          g.arc(x * r, r * 0.45, r * 0.12, 0, Math.PI * 2)
          g.fill()
        }
      }
      break
    }
    case 'ogre': {
      g.fillStyle = radial(g, r, '#d9f99d', '#65a30d', '#1a2e05')
      g.beginPath()
      g.ellipse(0, 0, r * 0.95, r * 0.9, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fef3c7'
      g.beginPath()
      g.moveTo(-r * 0.35, r * 0.25)
      g.lineTo(-r * 0.25, r * 0.0)
      g.lineTo(-r * 0.15, r * 0.25)
      g.moveTo(r * 0.35, r * 0.25)
      g.lineTo(r * 0.25, r * 0.0)
      g.lineTo(r * 0.15, r * 0.25)
      g.fill()
      eyes(g, 0, -r * 0.3, r * 0.14, r * 0.28, true)
      g.strokeStyle = '#78350f'
      g.lineWidth = r * 0.2
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(r * 0.7, r * 0.5)
      g.lineTo(r * 1.15, -r * 0.6)
      g.stroke()
      break
    }
    case 'witch': {
      g.fillStyle = radial(g, r, '#f5d0fe', '#a855f7', '#3b0764')
      g.beginPath()
      g.moveTo(-r * 0.85, r * 0.8)
      g.quadraticCurveTo(-r * 0.6, -r * 0.3, 0, -r * 0.3)
      g.quadraticCurveTo(r * 0.6, -r * 0.3, r * 0.85, r * 0.8)
      g.closePath()
      g.fill()
      g.fillStyle = '#bef264'
      g.beginPath()
      g.arc(0, -r * 0.2, r * 0.4, 0, Math.PI * 2)
      g.fill()
      eyes(g, 0, -r * 0.2, r * 0.12, r * 0.18, true)
      g.fillStyle = '#1e1b4b'
      g.beginPath()
      g.ellipse(0, -r * 0.5, r * 0.7, r * 0.14, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.moveTo(-r * 0.4, -r * 0.55)
      g.lineTo(r * 0.3, -r * 1.35)
      g.lineTo(r * 0.4, -r * 0.55)
      g.fill()
      break
    }
    case 'golem': {
      g.fillStyle = radial(g, r, '#d6d3d1', '#78716c', '#292524')
      g.beginPath()
      const pts = [[-0.9, -0.4], [-0.5, -0.95], [0.4, -0.9], [0.95, -0.3], [0.85, 0.6], [0.2, 0.9], [-0.6, 0.85], [-0.95, 0.3]]
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)))
      g.closePath()
      g.fill()
      g.strokeStyle = '#1c1917'
      g.lineWidth = r * 0.05
      g.stroke()
      g.strokeStyle = '#fb923c'
      g.lineWidth = r * 0.06
      g.beginPath()
      g.moveTo(-r * 0.3, r * 0.2)
      g.lineTo(0, r * 0.45)
      g.lineTo(r * 0.3, r * 0.15)
      g.stroke()
      g.fillStyle = '#fb923c'
      g.beginPath()
      g.arc(-r * 0.3, -r * 0.3, r * 0.12, 0, Math.PI * 2)
      g.arc(r * 0.3, -r * 0.3, r * 0.12, 0, Math.PI * 2)
      g.fill()
      break
    }
  }
}
