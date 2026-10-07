/** Vector art for Potion Shop: ingredients, potion bottles, specials, customers, cauldron and shop backdrop. */

export const INGREDIENTS = [
  { name: 'Herb', items: ['Leaf', 'Sprig', 'Herb Bundle', 'Golden Herb'], color: '#22c55e' },
  { name: 'Mushroom', items: ['Button Cap', 'Toadstool', 'Glowcap', 'Moon Mushroom'], color: '#ef4444' },
  { name: 'Crystal', items: ['Shard', 'Gem', 'Crystal Cluster', 'Star Crystal'], color: '#38bdf8' },
  { name: 'Feather', items: ['Down', 'Feather', 'Plume', 'Phoenix Feather'], color: '#f97316' },
]
export const POTION = 4
export const POTIONS = ['Vial', 'Flask', 'Phial', 'Love Potion', 'Fire Draught', 'Frost Brew', 'Storm Tonic', 'Shadow Elixir', 'Starlight Philter', 'Rainbow Panacea', "Sage's Stone"]
export const POTION_COLORS = ['#4ade80', '#60a5fa', '#c084fc', '#f472b6', '#fb923c', '#67e8f9', '#facc15', '#7c3aed', '#fde68a', '#f472b6', '#fbbf24']
export const WISP = 10
export const GLASS = 11

type G = CanvasRenderingContext2D
const cache = new Map<string, HTMLCanvasElement>()
const INK = '#1e1b2e'

function lg(g: G, y0: number, y1: number, a: string, b: string) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  gr.addColorStop(0, a)
  gr.addColorStop(1, b)
  return gr
}

function rg(g: G, x: number, y: number, r: number, a: string, b: string) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r)
  gr.addColorStop(0, a)
  gr.addColorStop(1, b)
  return gr
}

function ink(g: G, w = 2.6) {
  g.lineWidth = w
  g.strokeStyle = INK
  g.stroke()
}

function sparkle(g: G, x: number, y: number, s: number, c = '#ffffff') {
  g.fillStyle = c
  g.beginPath()
  g.moveTo(x, y - s)
  g.quadraticCurveTo(x, y, x + s, y)
  g.quadraticCurveTo(x, y, x, y + s)
  g.quadraticCurveTo(x, y, x - s, y)
  g.quadraticCurveTo(x, y, x, y - s)
  g.fill()
}

function leafShape(g: G, x: number, y: number, len: number, ang: number, c0: string, c1: string) {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0)
  g.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0)
  g.fillStyle = lg(g, -len * 0.4, len * 0.4, c0, c1)
  g.fill()
  ink(g, 2)
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(len * 0.1, 0)
  g.lineTo(len * 0.85, 0)
  g.stroke()
  g.restore()
}

function mushroom(g: G, x: number, y: number, s: number, cap0: string, cap1: string, dots: string, stem = '#fef3c7') {
  g.beginPath()
  g.moveTo(x - s * 0.3, y + s * 0.9)
  g.quadraticCurveTo(x - s * 0.35, y + s * 0.1, x - s * 0.2, y)
  g.lineTo(x + s * 0.2, y)
  g.quadraticCurveTo(x + s * 0.35, y + s * 0.1, x + s * 0.3, y + s * 0.9)
  g.closePath()
  g.fillStyle = lg(g, y, y + s, stem, '#d6c4a8')
  g.fill()
  ink(g)
  g.beginPath()
  g.moveTo(x - s, y + s * 0.1)
  g.bezierCurveTo(x - s, y - s * 0.9, x + s, y - s * 0.9, x + s, y + s * 0.1)
  g.quadraticCurveTo(x, y + s * 0.3, x - s, y + s * 0.1)
  g.closePath()
  g.fillStyle = rg(g, x, y - s * 0.3, s, cap0, cap1)
  g.fill()
  ink(g)
  g.fillStyle = dots
  for (const [dx, dy, r] of [[-0.45, -0.25, 0.14], [0.1, -0.5, 0.16], [0.5, -0.15, 0.12], [-0.05, -0.1, 0.09]]) {
    g.beginPath()
    g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
    g.fill()
  }
}

function gem(g: G, x: number, y: number, s: number, c0: string, c1: string, ang = 0) {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.beginPath()
  g.moveTo(0, -s)
  g.lineTo(s * 0.55, -s * 0.2)
  g.lineTo(s * 0.4, s * 0.8)
  g.lineTo(-s * 0.4, s * 0.8)
  g.lineTo(-s * 0.55, -s * 0.2)
  g.closePath()
  g.fillStyle = lg(g, -s, s, c0, c1)
  g.fill()
  ink(g, 2)
  g.fillStyle = 'rgba(255,255,255,0.45)'
  g.beginPath()
  g.moveTo(0, -s)
  g.lineTo(-s * 0.55, -s * 0.2)
  g.lineTo(-s * 0.1, s * 0.1)
  g.closePath()
  g.fill()
  g.restore()
}

function feather(g: G, x: number, y: number, len: number, ang: number, c0: string, c1: string, w = 0.3) {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.beginPath()
  g.moveTo(0, len * 0.5)
  g.bezierCurveTo(-len * w, len * 0.1, -len * w * 0.9, -len * 0.35, 0, -len * 0.5)
  g.bezierCurveTo(len * w * 0.9, -len * 0.35, len * w, len * 0.1, 0, len * 0.5)
  g.fillStyle = lg(g, -len * 0.5, len * 0.5, c0, c1)
  g.fill()
  ink(g, 2)
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(0, len * 0.62)
  g.lineTo(0, -len * 0.42)
  g.stroke()
  g.strokeStyle = 'rgba(30,27,46,0.25)'
  g.lineWidth = 1
  for (let i = -3; i <= 3; i++) {
    g.beginPath()
    g.moveTo(0, i * len * 0.1)
    g.lineTo(len * w * 0.7, i * len * 0.1 - len * 0.06)
    g.moveTo(0, i * len * 0.1)
    g.lineTo(-len * w * 0.7, i * len * 0.1 - len * 0.06)
    g.stroke()
  }
  g.restore()
}

function drawIngredient(g: G, chain: number, tier: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  if (chain === 0) {
    if (tier === 0) leafShape(g, 26, 66, 52, -0.6, '#86efac', '#15803d')
    else if (tier === 1) {
      g.strokeStyle = '#15803d'
      g.lineWidth = 3.5
      g.beginPath()
      g.moveTo(50, 90)
      g.quadraticCurveTo(46, 60, 52, 22)
      g.stroke()
      for (let i = 0; i < 3; i++) {
        leafShape(g, 49, 76 - i * 20, 24, -2.6 + i * 0.1, '#86efac', '#16a34a')
        leafShape(g, 51, 70 - i * 20, 24, -0.5 - i * 0.1, '#86efac', '#16a34a')
      }
    } else if (tier === 2) {
      for (const a of [-0.4, 0, 0.4]) {
        g.save()
        g.translate(50, 84)
        g.rotate(a)
        g.strokeStyle = '#166534'
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(0, 0)
        g.lineTo(0, -54)
        g.stroke()
        leafShape(g, 0, -30, 20, -2.4, '#4ade80', '#15803d')
        leafShape(g, 0, -42, 20, -0.7, '#4ade80', '#15803d')
        g.restore()
      }
      g.beginPath()
      g.roundRect(38, 66, 24, 10, 3)
      g.fillStyle = '#a16207'
      g.fill()
      ink(g, 2)
    } else {
      g.fillStyle = 'rgba(250,204,21,0.35)'
      g.beginPath()
      g.arc(50, 50, 40, 0, Math.PI * 2)
      g.fill()
      for (const a of [-0.5, -0.15, 0.2, 0.55]) leafShape(g, 50, 82, 50, -Math.PI / 2 + a, '#fef08a', '#ca8a04')
      sparkle(g, 26, 26, 7)
      sparkle(g, 76, 36, 5)
    }
  } else if (chain === 1) {
    if (tier === 0) mushroom(g, 50, 56, 26, '#e7d7c1', '#a8a29e', 'rgba(255,255,255,0.6)')
    else if (tier === 1) mushroom(g, 50, 54, 32, '#fca5a5', '#b91c1c', '#ffffff')
    else if (tier === 2) {
      g.fillStyle = 'rgba(103,232,249,0.3)'
      g.beginPath()
      g.arc(50, 46, 38, 0, Math.PI * 2)
      g.fill()
      mushroom(g, 50, 52, 32, '#a5f3fc', '#0e7490', '#ecfeff', '#cffafe')
      mushroom(g, 24, 70, 13, '#a5f3fc', '#0e7490', '#ecfeff', '#cffafe')
    } else {
      g.fillStyle = 'rgba(196,181,253,0.35)'
      g.beginPath()
      g.arc(50, 46, 42, 0, Math.PI * 2)
      g.fill()
      mushroom(g, 50, 52, 34, '#e9d5ff', '#6d28d9', '#fef9c3', '#ede9fe')
      g.fillStyle = '#fef9c3'
      g.beginPath()
      g.arc(70, 22, 9, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#6d28d9'
      g.beginPath()
      g.arc(74, 19, 8, 0, Math.PI * 2)
      g.fill()
      sparkle(g, 24, 28, 6)
    }
  } else if (chain === 2) {
    if (tier === 0) gem(g, 50, 52, 26, '#bae6fd', '#0284c7', 0.4)
    else if (tier === 1) {
      g.beginPath()
      g.moveTo(26, 40)
      g.lineTo(40, 24)
      g.lineTo(60, 24)
      g.lineTo(74, 40)
      g.lineTo(50, 84)
      g.closePath()
      g.fillStyle = lg(g, 24, 84, '#a5f3fc', '#0369a1')
      g.fill()
      ink(g)
      g.strokeStyle = 'rgba(255,255,255,0.55)'
      g.lineWidth = 1.6
      g.beginPath()
      g.moveTo(26, 40)
      g.lineTo(74, 40)
      g.moveTo(40, 24)
      g.lineTo(46, 40)
      g.lineTo(50, 84)
      g.moveTo(60, 24)
      g.lineTo(54, 40)
      g.stroke()
      sparkle(g, 36, 34, 4)
    } else if (tier === 2) {
      gem(g, 32, 60, 20, '#c4b5fd', '#6d28d9', -0.4)
      gem(g, 68, 60, 20, '#c4b5fd', '#6d28d9', 0.4)
      gem(g, 50, 48, 30, '#ddd6fe', '#7c3aed', 0)
      g.beginPath()
      g.ellipse(50, 84, 30, 7, 0, 0, Math.PI * 2)
      g.fillStyle = '#57534e'
      g.fill()
      ink(g, 2)
    } else {
      g.fillStyle = 'rgba(253,224,71,0.35)'
      g.beginPath()
      g.arc(50, 50, 42, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
        const r = i % 2 ? 15 : 36
        g.lineTo(50 + Math.cos(a) * r, 52 + Math.sin(a) * r)
      }
      g.closePath()
      g.fillStyle = lg(g, 16, 88, '#fef9c3', '#eab308')
      g.fill()
      ink(g)
      sparkle(g, 50, 50, 8)
    }
  } else {
    if (tier === 0) {
      g.fillStyle = rg(g, 50, 52, 26, '#ffffff', '#e7e5e4')
      for (const [x, y, r] of [[40, 52, 16], [58, 46, 16], [56, 62, 14], [44, 40, 12]] as const) {
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
      g.beginPath()
      g.arc(50, 52, 24, 0, Math.PI * 2)
      g.strokeStyle = 'rgba(30,27,46,0.25)'
      g.lineWidth = 1.5
      g.stroke()
    } else if (tier === 1) feather(g, 50, 52, 70, 0.5, '#e0f2fe', '#60a5fa')
    else if (tier === 2) {
      feather(g, 42, 54, 70, -0.3, '#c4b5fd', '#7c3aed', 0.26)
      feather(g, 58, 52, 74, 0.35, '#fbcfe8', '#db2777', 0.26)
      g.fillStyle = '#facc15'
      g.beginPath()
      g.arc(50, 82, 6, 0, Math.PI * 2)
      g.fill()
      ink(g, 2)
    } else {
      g.fillStyle = 'rgba(251,146,60,0.35)'
      g.beginPath()
      g.arc(50, 50, 42, 0, Math.PI * 2)
      g.fill()
      feather(g, 50, 50, 84, 0.3, '#fde047', '#dc2626', 0.32)
      g.fillStyle = '#fef9c3'
      for (const [x, y] of [[26, 30], [76, 70], [30, 74]]) sparkle(g, x, y, 5, '#fef08a')
    }
  }
}

function bottleBody(g: G, shape: number, c0: string, c1: string) {
  g.beginPath()
  switch (shape) {
    case 0:
      g.moveTo(42, 34)
      g.lineTo(42, 76)
      g.quadraticCurveTo(50, 88, 58, 76)
      g.lineTo(58, 34)
      break
    case 1:
      g.moveTo(44, 30)
      g.lineTo(44, 44)
      g.arc(50, 64, 22, -Math.PI / 2 - 0.28, Math.PI * 1.5 + 0.28, false)
      g.lineTo(56, 30)
      break
    case 2:
      g.moveTo(44, 26)
      g.lineTo(44, 40)
      g.lineTo(34, 82)
      g.quadraticCurveTo(50, 90, 66, 82)
      g.lineTo(56, 40)
      g.lineTo(56, 26)
      break
    case 3:
      g.moveTo(50, 88)
      g.bezierCurveTo(10, 60, 26, 30, 46, 44)
      g.lineTo(46, 32)
      g.lineTo(54, 32)
      g.lineTo(54, 44)
      g.bezierCurveTo(74, 30, 90, 60, 50, 88)
      break
    case 4:
      g.moveTo(44, 28)
      g.lineTo(44, 40)
      g.lineTo(26, 84)
      g.lineTo(74, 84)
      g.lineTo(56, 40)
      g.lineTo(56, 28)
      break
    case 5:
      g.moveTo(44, 26)
      g.lineTo(44, 36)
      g.lineTo(30, 46)
      g.lineTo(30, 80)
      g.quadraticCurveTo(50, 92, 70, 80)
      g.lineTo(70, 46)
      g.lineTo(56, 36)
      g.lineTo(56, 26)
      break
    case 6:
      g.moveTo(45, 24)
      g.lineTo(45, 40)
      g.lineTo(32, 52)
      g.lineTo(40, 86)
      g.lineTo(60, 86)
      g.lineTo(68, 52)
      g.lineTo(55, 40)
      g.lineTo(55, 24)
      break
    case 7:
      g.moveTo(44, 28)
      g.lineTo(44, 40)
      g.bezierCurveTo(22, 46, 24, 90, 50, 88)
      g.bezierCurveTo(76, 90, 78, 46, 56, 40)
      g.lineTo(56, 28)
      break
    default:
      g.moveTo(44, 26)
      g.lineTo(44, 38)
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 - 0.3 - (i / 10) * (Math.PI * 2 - 0.6)
        const r = i % 2 ? 20 : 30
        g.lineTo(50 + Math.cos(a) * r * 0.95, 62 + Math.sin(a) * r * 0.85)
      }
      g.lineTo(56, 38)
      g.lineTo(56, 26)
  }
  g.closePath()
  g.save()
  g.clip()
  g.fillStyle = 'rgba(224,242,254,0.35)'
  g.fillRect(0, 0, 100, 100)
  g.fillStyle = lg(g, 44, 92, c0, c1)
  g.fillRect(0, 48, 100, 52)
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.ellipse(50, 48, 30, 3, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.7)'
  for (const [x, y, r] of [[44, 70, 2.5], [56, 62, 1.8], [50, 78, 1.5]]) {
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
  ink(g)
  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.beginPath()
  g.ellipse(41, 60, 2.5, 10, 0.15, 0, Math.PI * 2)
  g.fill()
}

function cork(g: G, top = 18) {
  g.beginPath()
  g.roundRect(42, top, 16, 12, 3)
  g.fillStyle = lg(g, top, top + 12, '#d6a46b', '#8b5a2b')
  g.fill()
  ink(g, 2)
}

function drawPotion(g: G, tier: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const c = POTION_COLORS[tier]
  const dark: Record<number, string> = { 0: '#15803d', 1: '#1d4ed8', 2: '#7e22ce', 3: '#be185d', 4: '#c2410c', 5: '#0e7490', 6: '#a16207', 7: '#2e1065', 8: '#b45309', 9: '#7c3aed', 10: '#92400e' }
  if (tier === 9) {
    bottleBody(g, 7, '#fde047', '#7c3aed')
    g.save()
    g.beginPath()
    g.rect(24, 50, 52, 40)
    g.clip()
    const cols = ['#f87171', '#fb923c', '#fde047', '#4ade80', '#38bdf8', '#a78bfa']
    cols.forEach((col, i) => {
      g.strokeStyle = col
      g.globalAlpha = 0.55
      g.lineWidth = 4
      g.beginPath()
      g.arc(50, 96, 12 + i * 5, Math.PI, Math.PI * 2)
      g.stroke()
    })
    g.globalAlpha = 1
    g.restore()
    cork(g, 18)
    sparkle(g, 72, 30, 6)
    sparkle(g, 26, 40, 4)
    return
  }
  if (tier === 10) {
    g.fillStyle = 'rgba(251,191,36,0.35)'
    g.beginPath()
    g.arc(50, 54, 42, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(50, 14)
    g.lineTo(80, 40)
    g.lineTo(70, 84)
    g.lineTo(30, 84)
    g.lineTo(20, 40)
    g.closePath()
    g.fillStyle = lg(g, 14, 84, '#fef3c7', '#dc2626')
    g.fill()
    ink(g)
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.beginPath()
    g.moveTo(50, 14)
    g.lineTo(20, 40)
    g.lineTo(44, 46)
    g.closePath()
    g.fill()
    sparkle(g, 50, 52, 10)
    return
  }
  const shape = [0, 1, 2, 3, 4, 5, 6, 7, 8][tier]
  bottleBody(g, shape, c, dark[tier])
  cork(g, shape === 6 ? 14 : shape === 1 ? 20 : 16)
  if (tier === 4) {
    g.fillStyle = '#fde047'
    g.beginPath()
    g.moveTo(50, 60)
    g.quadraticCurveTo(60, 70, 50, 80)
    g.quadraticCurveTo(40, 70, 50, 60)
    g.fill()
  } else if (tier === 5) {
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI
      g.beginPath()
      g.moveTo(50 + Math.cos(a) * 9, 68 + Math.sin(a) * 9)
      g.lineTo(50 - Math.cos(a) * 9, 68 - Math.sin(a) * 9)
      g.stroke()
    }
  } else if (tier === 6) {
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.moveTo(53, 56)
    g.lineTo(44, 70)
    g.lineTo(50, 70)
    g.lineTo(46, 82)
    g.lineTo(57, 66)
    g.lineTo(51, 66)
    g.closePath()
    g.fill()
  } else if (tier === 7) {
    g.fillStyle = '#e9d5ff'
    g.beginPath()
    g.arc(50, 66, 8, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#2e1065'
    g.beginPath()
    g.arc(47, 65, 2, 0, Math.PI * 2)
    g.arc(53, 65, 2, 0, Math.PI * 2)
    g.fill()
  } else if (tier === 8) {
    sparkle(g, 50, 64, 8)
  } else if (tier === 3) {
    g.fillStyle = 'rgba(255,255,255,0.8)'
    g.beginPath()
    g.moveTo(50, 74)
    g.bezierCurveTo(40, 66, 44, 58, 50, 63)
    g.bezierCurveTo(56, 58, 60, 66, 50, 74)
    g.fill()
  }
  if (tier >= 2) sparkle(g, 74, 30, 4 + tier * 0.4)
}

function drawSpecial(g: G, kind: number) {
  if (kind === WISP) {
    const gr = g.createRadialGradient(50, 50, 2, 50, 50, 40)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.35, '#a5f3fc')
    gr.addColorStop(1, 'rgba(165,243,252,0)')
    g.fillStyle = gr
    g.beginPath()
    g.arc(50, 50, 40, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(50, 22)
    g.bezierCurveTo(70, 34, 68, 64, 50, 70)
    g.bezierCurveTo(32, 64, 30, 34, 50, 22)
    g.fillStyle = lg(g, 22, 70, '#ecfeff', '#67e8f9')
    g.fill()
    ink(g, 2)
    g.fillStyle = INK
    g.beginPath()
    g.arc(44, 48, 3, 0, Math.PI * 2)
    g.arc(56, 48, 3, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.beginPath()
    g.arc(50, 54, 5, 0.3, Math.PI - 0.3)
    g.stroke()
  } else {
    g.beginPath()
    g.roundRect(28, 16, 44, 8, 3)
    g.roundRect(28, 78, 44, 8, 3)
    g.fillStyle = '#a16207'
    g.fill()
    ink(g, 2)
    g.beginPath()
    g.moveTo(32, 24)
    g.quadraticCurveTo(32, 48, 48, 51)
    g.quadraticCurveTo(32, 54, 32, 78)
    g.lineTo(68, 78)
    g.quadraticCurveTo(68, 54, 52, 51)
    g.quadraticCurveTo(68, 48, 68, 24)
    g.closePath()
    g.fillStyle = 'rgba(224,242,254,0.6)'
    g.fill()
    ink(g, 2)
    g.fillStyle = '#fbbf24'
    g.beginPath()
    g.moveTo(38, 30)
    g.lineTo(62, 30)
    g.quadraticCurveTo(56, 44, 50, 48)
    g.quadraticCurveTo(44, 44, 38, 30)
    g.fill()
    g.beginPath()
    g.moveTo(36, 76)
    g.quadraticCurveTo(50, 62, 64, 76)
    g.fill()
  }
}

/** Cached sprite: chain 0..3 ingredients, POTION potions, or a special (WISP / GLASS). */
export function itemSprite(chain: number, tier: number, size: number): HTMLCanvasElement {
  const px = Math.max(12, Math.round(size))
  const key = `${chain}|${tier}|${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil(px * dpr)
  c.height = Math.ceil(px * dpr)
  const g = c.getContext('2d')!
  const s = (px * dpr) / 100
  g.fillStyle = 'rgba(0,0,0,0.2)'
  g.beginPath()
  g.ellipse(50 * s, 90 * s, 26 * s, 5 * s, 0, 0, Math.PI * 2)
  g.fill()
  g.scale(s, s)
  if (chain === POTION) drawPotion(g, tier)
  else if (chain >= WISP) drawSpecial(g, chain)
  else drawIngredient(g, chain, tier)
  cache.set(key, c)
  if (cache.size > 240) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

// ── Customers ──────────────────────────────────────────────

export const CUSTOMERS = ['Villager', 'Knight', 'Witch', 'Wizard', 'Princess', 'Dragon', 'Ghost']

/** Head-and-shoulders customer portrait; mood 1 = happy, 0 = furious. */
export function drawCustomer(g: G, kind: number, x: number, y: number, r: number, mood: number, t: number) {
  g.save()
  g.translate(x, y + Math.sin(t * 2.2 + kind) * 1.2)
  if (mood < 0.3) g.translate(Math.sin(t * 40) * 1.2, 0)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const lw = Math.max(1.4, r * 0.07)
  const line = () => {
    g.lineWidth = lw
    g.strokeStyle = INK
    g.stroke()
  }
  const skin = kind === 5 ? '#86efac' : kind === 6 ? '#f1f5f9' : '#fcd9b6'
  const skinD = kind === 5 ? '#15803d' : kind === 6 ? '#94a3b8' : '#e0a37a'
  const robe = ['#a16207', '#64748b', '#7c3aed', '#1d4ed8', '#ec4899', '#16a34a', '#cbd5e1'][kind]
  // shoulders
  g.beginPath()
  g.moveTo(-r * 0.95, r * 1.1)
  g.quadraticCurveTo(-r * 0.9, r * 0.5, 0, r * 0.5)
  g.quadraticCurveTo(r * 0.9, r * 0.5, r * 0.95, r * 1.1)
  g.closePath()
  g.fillStyle = lg(g, r * 0.5, r * 1.1, robe, INK)
  g.fill()
  line()
  if (kind === 6) {
    g.beginPath()
    g.moveTo(-r * 0.7, r * 0.9)
    g.quadraticCurveTo(-r * 0.8, -r * 0.9, 0, -r * 0.85)
    g.quadraticCurveTo(r * 0.8, -r * 0.9, r * 0.7, r * 0.9)
    g.lineTo(r * 0.4, r * 0.7)
    g.lineTo(0, r * 0.95)
    g.lineTo(-r * 0.4, r * 0.7)
    g.closePath()
    g.fillStyle = rg(g, 0, 0, r, '#ffffff', '#cbd5e1')
    g.globalAlpha = 0.92
    g.fill()
    g.globalAlpha = 1
    line()
  } else {
    if (kind === 5) {
      for (const s of [-1, 1]) {
        g.beginPath()
        g.moveTo(s * r * 0.3, -r * 0.55)
        g.lineTo(s * r * 0.55, -r * 1.05)
        g.lineTo(s * r * 0.6, -r * 0.45)
        g.closePath()
        g.fillStyle = '#fef3c7'
        g.fill()
        line()
      }
    }
    g.beginPath()
    g.ellipse(0, 0, r * 0.62, r * 0.66, 0, 0, Math.PI * 2)
    g.fillStyle = rg(g, 0, 0, r * 0.7, skin, skinD)
    g.fill()
    line()
  }
  // headwear
  if (kind === 0) {
    g.beginPath()
    g.ellipse(0, -r * 0.45, r * 0.85, r * 0.18, 0, 0, Math.PI * 2)
    g.fillStyle = '#eab308'
    g.fill()
    line()
    g.beginPath()
    g.ellipse(0, -r * 0.6, r * 0.45, r * 0.25, 0, Math.PI, Math.PI * 2)
    g.fill()
    line()
  } else if (kind === 1) {
    g.beginPath()
    g.arc(0, -r * 0.1, r * 0.68, Math.PI * 1.02, Math.PI * 1.98)
    g.lineTo(r * 0.68, r * 0.05)
    g.lineTo(-r * 0.68, r * 0.05)
    g.closePath()
    g.fillStyle = lg(g, -r * 0.8, 0, '#e2e8f0', '#64748b')
    g.fill()
    line()
    g.fillStyle = '#ef4444'
    g.beginPath()
    g.moveTo(0, -r * 0.78)
    g.quadraticCurveTo(r * 0.5, -r * 1.2, r * 0.7, -r * 0.7)
    g.quadraticCurveTo(r * 0.3, -r * 0.85, 0, -r * 0.7)
    g.fill()
  } else if (kind === 2 || kind === 3) {
    g.beginPath()
    g.moveTo(-r * 0.85, -r * 0.35)
    g.lineTo(r * 0.85, -r * 0.35)
    g.lineTo(r * 0.12, -r * 1.35)
    g.closePath()
    g.fillStyle = kind === 2 ? '#4c1d95' : '#1e40af'
    g.fill()
    line()
    g.fillStyle = '#fde047'
    g.beginPath()
    g.arc(r * 0.05, -r * 0.75, r * 0.08, 0, Math.PI * 2)
    g.fill()
    if (kind === 3) {
      g.beginPath()
      g.moveTo(-r * 0.4, r * 0.25)
      g.quadraticCurveTo(0, r * 1.2, r * 0.4, r * 0.25)
      g.fillStyle = '#f1f5f9'
      g.fill()
      line()
    }
  } else if (kind === 4) {
    g.beginPath()
    g.moveTo(-r * 0.4, -r * 0.5)
    g.lineTo(-r * 0.45, -r * 0.9)
    g.lineTo(-r * 0.2, -r * 0.7)
    g.lineTo(0, -r * 1)
    g.lineTo(r * 0.2, -r * 0.7)
    g.lineTo(r * 0.45, -r * 0.9)
    g.lineTo(r * 0.4, -r * 0.5)
    g.closePath()
    g.fillStyle = '#facc15'
    g.fill()
    line()
    g.fillStyle = '#92400e'
    g.beginPath()
    g.ellipse(-r * 0.62, r * 0.1, r * 0.14, r * 0.45, 0.1, 0, Math.PI * 2)
    g.ellipse(r * 0.62, r * 0.1, r * 0.14, r * 0.45, -0.1, 0, Math.PI * 2)
    g.fill()
  }
  // face
  const ey = -r * 0.05
  g.fillStyle = INK
  g.beginPath()
  g.ellipse(-r * 0.22, ey, r * 0.08, r * 0.1, 0, 0, Math.PI * 2)
  g.ellipse(r * 0.22, ey, r * 0.08, r * 0.1, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = lw
  if (mood < 0.35) {
    g.beginPath()
    g.moveTo(-r * 0.34, ey - r * 0.2)
    g.lineTo(-r * 0.12, ey - r * 0.12)
    g.moveTo(r * 0.34, ey - r * 0.2)
    g.lineTo(r * 0.12, ey - r * 0.12)
    g.stroke()
  }
  g.beginPath()
  if (mood > 0.6) g.arc(0, r * 0.18, r * 0.16, 0.2, Math.PI - 0.2)
  else if (mood > 0.35) {
    g.moveTo(-r * 0.12, r * 0.28)
    g.lineTo(r * 0.12, r * 0.28)
  } else g.arc(0, r * 0.38, r * 0.14, Math.PI + 0.3, -0.3)
  g.stroke()
  if (mood < 0.35) {
    g.fillStyle = 'rgba(239,68,68,0.35)'
  } else g.fillStyle = 'rgba(244,114,182,0.35)'
  g.beginPath()
  g.ellipse(-r * 0.4, r * 0.15, r * 0.1, r * 0.06, 0, 0, Math.PI * 2)
  g.ellipse(r * 0.4, r * 0.15, r * 0.1, r * 0.06, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

// ── Shop scenery ───────────────────────────────────────────

const bgCache = new Map<string, HTMLCanvasElement>()

/** Static shop interior: plank wall, shelves with jars, window with a moon, counter. */
export function shopSprite(W: number, H: number, counterY: number): HTMLCanvasElement {
  const key = `${W}|${H}|${counterY}`
  const hit = bgCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(W * dpr)
  c.height = Math.ceil(H * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const wall = g.createLinearGradient(0, 0, 0, counterY)
  wall.addColorStop(0, '#2e1065')
  wall.addColorStop(1, '#4c1d95')
  g.fillStyle = wall
  g.fillRect(0, 0, W, counterY)
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.lineWidth = 1
  for (let x = 0; x < W; x += 26) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, counterY)
    g.stroke()
  }
  // window with the moon
  g.fillStyle = '#1e1b4b'
  g.beginPath()
  g.roundRect(W * 0.78, 10, W * 0.17, 44, [20, 20, 4, 4])
  g.fill()
  g.fillStyle = '#fef9c3'
  g.beginPath()
  g.arc(W * 0.86, 28, 7, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#a16207'
  g.lineWidth = 3
  g.beginPath()
  g.roundRect(W * 0.78, 10, W * 0.17, 44, [20, 20, 4, 4])
  g.moveTo(W * 0.865, 10)
  g.lineTo(W * 0.865, 54)
  g.stroke()
  // shelf with jars
  g.fillStyle = '#78350f'
  g.fillRect(6, 44, W * 0.62, 5)
  const jars = ['#4ade80', '#f472b6', '#60a5fa', '#facc15', '#c084fc', '#fb923c']
  for (let i = 0; i < 7; i++) {
    const x = 16 + i * ((W * 0.6 - 20) / 7)
    const h = 12 + (i % 3) * 5
    g.fillStyle = jars[i % jars.length]
    g.globalAlpha = 0.75
    g.beginPath()
    g.roundRect(x, 44 - h, 12, h, 3)
    g.fill()
    g.globalAlpha = 1
    g.fillStyle = '#a16207'
    g.fillRect(x + 2, 44 - h - 3, 8, 3)
  }
  // counter
  const ct = g.createLinearGradient(0, counterY, 0, counterY + 18)
  ct.addColorStop(0, '#b45309')
  ct.addColorStop(1, '#78350f')
  g.fillStyle = ct
  g.fillRect(0, counterY, W, 18)
  g.fillStyle = 'rgba(255,255,255,0.18)'
  g.fillRect(0, counterY, W, 3)
  // floor / table below
  const fl = g.createLinearGradient(0, counterY + 18, 0, H)
  fl.addColorStop(0, '#3b0764')
  fl.addColorStop(1, '#1e1b2e')
  g.fillStyle = fl
  g.fillRect(0, counterY + 18, W, H - counterY - 18)
  bgCache.set(key, c)
  if (bgCache.size > 6) {
    const first = bgCache.keys().next().value
    if (first) bgCache.delete(first)
  }
  return c
}

/** Bubbling cauldron centred at x,y (width ~2.2r); liquid colour can be tinted while brewing. */
export function drawCauldron(g: G, x: number, y: number, r: number, t: number, liquid: string, brew: number) {
  g.save()
  g.translate(x, y)
  // fire
  for (let i = 0; i < 5; i++) {
    const fx = (i - 2) * r * 0.3
    const h = r * (0.45 + Math.sin(t * 14 + i * 1.7) * 0.12 + brew * 0.25)
    const gr = g.createLinearGradient(0, r * 0.95, 0, r * 0.95 - h)
    gr.addColorStop(0, '#fde047')
    gr.addColorStop(0.5, '#f97316')
    gr.addColorStop(1, 'rgba(239,68,68,0)')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(fx - r * 0.16, r * 0.98)
    g.quadraticCurveTo(fx, r * 0.95 - h * 1.4, fx + r * 0.16, r * 0.98)
    g.fill()
  }
  // legs
  g.fillStyle = '#18181b'
  g.fillRect(-r * 0.75, r * 0.6, r * 0.12, r * 0.42)
  g.fillRect(r * 0.63, r * 0.6, r * 0.12, r * 0.42)
  // pot
  g.beginPath()
  g.moveTo(-r * 1.0, -r * 0.25)
  g.bezierCurveTo(-r * 1.15, r * 0.7, r * 1.15, r * 0.7, r * 1.0, -r * 0.25)
  g.closePath()
  g.fillStyle = lg(g, -r * 0.3, r * 0.8, '#52525b', '#09090b')
  g.fill()
  g.lineWidth = 2.5
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.15)'
  g.beginPath()
  g.ellipse(-r * 0.55, r * 0.1, r * 0.12, r * 0.3, 0.4, 0, Math.PI * 2)
  g.fill()
  // liquid surface
  g.beginPath()
  g.ellipse(0, -r * 0.25, r * 0.98, r * 0.28, 0, 0, Math.PI * 2)
  const lq = g.createRadialGradient(0, -r * 0.3, 2, 0, -r * 0.25, r)
  lq.addColorStop(0, '#ffffff')
  lq.addColorStop(0.25, liquid)
  lq.addColorStop(1, '#14532d')
  g.fillStyle = lq
  g.fill()
  // rim
  g.beginPath()
  g.ellipse(0, -r * 0.25, r * 1.04, r * 0.3, 0, 0, Math.PI * 2)
  g.lineWidth = r * 0.12
  g.strokeStyle = '#3f3f46'
  g.stroke()
  g.lineWidth = 2
  g.strokeStyle = INK
  g.stroke()
  // bubbles
  for (let i = 0; i < 7; i++) {
    const k = (t * (0.6 + brew) + i * 0.37) % 1
    const bx = Math.sin(i * 2.3 + t * 0.7) * r * 0.6
    const by = -r * 0.3 - k * r * (0.9 + brew * 0.8)
    const br = r * (0.06 + (i % 3) * 0.03) * (1 - k * 0.5)
    g.globalAlpha = 1 - k
    g.fillStyle = liquid
    g.beginPath()
    g.arc(bx, by, br, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 1
    g.stroke()
  }
  g.globalAlpha = 1
  g.restore()
}

/** Black cat familiar (the discard bin). */
export function drawCat(g: G, x: number, y: number, s: number, t: number, open: boolean) {
  g.save()
  g.translate(x, y)
  g.lineJoin = 'round'
  g.fillStyle = '#18181b'
  g.strokeStyle = '#a78bfa'
  g.lineWidth = 1.5
  g.beginPath()
  g.ellipse(0, s * 0.35, s * 0.55, s * 0.45, 0, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.beginPath()
  g.moveTo(s * 0.5, s * 0.5)
  g.quadraticCurveTo(s * 1.0, s * 0.3 + Math.sin(t * 3) * s * 0.2, s * 0.8, -s * 0.1)
  g.lineWidth = s * 0.14
  g.strokeStyle = '#18181b'
  g.stroke()
  g.beginPath()
  g.arc(0, -s * 0.15, s * 0.42, 0, Math.PI * 2)
  g.fillStyle = '#18181b'
  g.fill()
  g.lineWidth = 1.5
  g.strokeStyle = '#a78bfa'
  g.stroke()
  for (const sd of [-1, 1]) {
    g.beginPath()
    g.moveTo(sd * s * 0.12, -s * 0.5)
    g.lineTo(sd * s * 0.38, -s * 0.72)
    g.lineTo(sd * s * 0.4, -s * 0.3)
    g.closePath()
    g.fillStyle = '#18181b'
    g.fill()
  }
  g.fillStyle = '#facc15'
  g.beginPath()
  g.ellipse(-s * 0.16, -s * 0.18, s * 0.09, open ? s * 0.12 : s * 0.03, 0, 0, Math.PI * 2)
  g.ellipse(s * 0.16, -s * 0.18, s * 0.09, open ? s * 0.12 : s * 0.03, 0, 0, Math.PI * 2)
  g.fill()
  if (open) {
    g.fillStyle = '#f472b6'
    g.beginPath()
    g.ellipse(0, s * 0.02, s * 0.12, s * 0.1, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}
