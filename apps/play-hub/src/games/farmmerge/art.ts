/** Vector art for Farm Merge: item chains, generators, specials and animal customers. */

export const CHAINS = [
  { name: 'Crops', items: ['Seed', 'Sprout', 'Wheat', 'Sheaf', 'Flour', 'Dough', 'Bread', 'Cake', 'Grand Cake'], color: '#eab308' },
  { name: 'Coop', items: ['Egg', 'Chick', 'Hen', 'Egg Basket', 'Pancakes', 'Golden Egg'], color: '#f97316' },
  { name: 'Orchard', items: ['Blossom', 'Green Apple', 'Red Apple', 'Apple Basket', 'Apple Juice', 'Apple Pie'], color: '#ef4444' },
  { name: 'Garden', items: ['Bud', 'Daisy', 'Tulip', 'Rose', 'Bouquet', 'Wreath'], color: '#ec4899' },
]
export const GEN = 10
export const STAR = 20
export const GIFT = 21
export const GEN_NAMES = ['Seed Bag', 'Chicken Coop', 'Apple Tree', 'Flower Pot']

type G = CanvasRenderingContext2D
const cache = new Map<string, HTMLCanvasElement>()

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

const INK = '#3b2a1a'

function outline(g: G, w = 2.6) {
  g.lineWidth = w
  g.strokeStyle = INK
  g.stroke()
}

function circle(g: G, x: number, y: number, r: number, fill: string | CanvasGradient, line = true) {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = fill
  g.fill()
  if (line) outline(g)
}

function ellipse(g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, line = true, rot = 0) {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  g.fillStyle = fill
  g.fill()
  if (line) outline(g)
}

function shine(g: G, x: number, y: number, rx: number, ry: number, rot = -0.5) {
  g.fillStyle = 'rgba(255,255,255,0.6)'
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  g.fill()
}

function leaf(g: G, x: number, y: number, len: number, ang: number, fill = '#4ade80') {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, -len * 0.4, len, 0)
  g.quadraticCurveTo(len * 0.5, len * 0.4, 0, 0)
  g.fillStyle = lg(g, -len * 0.4, len * 0.4, fill, '#15803d')
  g.fill()
  outline(g, 2)
  g.restore()
}

function grainHead(g: G, x: number, y: number, s: number, ang = 0) {
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  for (let i = 0; i < 5; i++) {
    for (const side of [-1, 1]) {
      g.beginPath()
      g.ellipse(side * s * 0.22, -i * s * 0.32, s * 0.2, s * 0.32, side * 0.4, 0, Math.PI * 2)
      g.fillStyle = lg(g, -i * s * 0.32 - s * 0.3, -i * s * 0.32 + s * 0.3, '#fde68a', '#ca8a04')
      g.fill()
      outline(g, 1.6)
    }
  }
  g.restore()
}

function basket(g: G) {
  g.beginPath()
  g.moveTo(16, 52)
  g.lineTo(84, 52)
  g.lineTo(76, 86)
  g.lineTo(24, 86)
  g.closePath()
  g.fillStyle = lg(g, 52, 86, '#d6a46b', '#8b5a2b')
  g.fill()
  outline(g)
  g.strokeStyle = 'rgba(59,42,26,0.45)'
  g.lineWidth = 1.6
  for (let y = 60; y < 86; y += 8) {
    g.beginPath()
    g.moveTo(18 + (y - 52) * 0.2, y)
    g.lineTo(82 - (y - 52) * 0.2, y)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(22, 52)
  g.quadraticCurveTo(50, 14, 78, 52)
  g.lineWidth = 5
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = '#c08a52'
  g.stroke()
}

function apple(g: G, x: number, y: number, r: number, c0: string, c1: string) {
  g.beginPath()
  g.moveTo(x, y - r * 0.7)
  g.bezierCurveTo(x + r * 0.6, y - r * 1.15, x + r * 1.2, y - r * 0.4, x + r, y + r * 0.2)
  g.bezierCurveTo(x + r * 0.85, y + r * 0.9, x + r * 0.3, y + r * 1.05, x, y + r * 0.85)
  g.bezierCurveTo(x - r * 0.3, y + r * 1.05, x - r * 0.85, y + r * 0.9, x - r, y + r * 0.2)
  g.bezierCurveTo(x - r * 1.2, y - r * 0.4, x - r * 0.6, y - r * 1.15, x, y - r * 0.7)
  g.fillStyle = rg(g, x, y, r * 1.1, c0, c1)
  g.fill()
  outline(g)
  g.strokeStyle = INK
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(x, y - r * 0.65)
  g.quadraticCurveTo(x + r * 0.05, y - r * 1.05, x + r * 0.2, y - r * 1.2)
  g.stroke()
  leaf(g, x + r * 0.1, y - r * 0.95, r * 0.65, -0.5)
  shine(g, x - r * 0.45, y - r * 0.2, r * 0.18, r * 0.3, 0.3)
}

function flower(g: G, x: number, y: number, r: number, petal: string, center: string, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    g.beginPath()
    g.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48, r * 0.3, a, 0, Math.PI * 2)
    g.fillStyle = petal
    g.fill()
    outline(g, 1.8)
  }
  circle(g, x, y, r * 0.38, rg(g, x, y, r * 0.4, '#fef9c3', center))
}

function egg(g: G, x: number, y: number, s: number, c0 = '#ffffff', c1 = '#e7d7c1') {
  g.beginPath()
  g.moveTo(x, y - s)
  g.bezierCurveTo(x + s * 0.75, y - s, x + s * 0.85, y + s * 0.75, x, y + s * 0.8)
  g.bezierCurveTo(x - s * 0.85, y + s * 0.75, x - s * 0.75, y - s, x, y - s)
  g.fillStyle = rg(g, x, y, s * 1.1, c0, c1)
  g.fill()
  outline(g)
  shine(g, x - s * 0.28, y - s * 0.35, s * 0.15, s * 0.25, 0.3)
}

function eyes(g: G, x: number, y: number, d: number, s: number) {
  g.fillStyle = INK
  g.beginPath()
  g.arc(x - d, y, s, 0, Math.PI * 2)
  g.arc(x + d, y, s, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(x - d + s * 0.35, y - s * 0.35, s * 0.4, 0, Math.PI * 2)
  g.arc(x + d + s * 0.35, y - s * 0.35, s * 0.4, 0, Math.PI * 2)
  g.fill()
}

function drawItem(g: G, chain: number, tier: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  if (chain === 0) {
    switch (tier) {
      case 0:
        for (const [x, y, a] of [[38, 56, -0.5], [60, 48, 0.4], [54, 70, 0.1]] as const) {
          g.save()
          g.translate(x, y)
          g.rotate(a)
          g.beginPath()
          g.moveTo(0, -14)
          g.quadraticCurveTo(11, 0, 0, 13)
          g.quadraticCurveTo(-11, 0, 0, -14)
          g.fillStyle = lg(g, -14, 13, '#d6a46b', '#7c4a21')
          g.fill()
          outline(g)
          g.restore()
        }
        break
      case 1:
        ellipse(g, 50, 74, 28, 11, lg(g, 63, 85, '#a16207', '#57260b'))
        g.strokeStyle = '#15803d'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(50, 72)
        g.lineTo(50, 46)
        g.stroke()
        leaf(g, 50, 50, 26, -2.6)
        leaf(g, 50, 46, 28, -0.5)
        break
      case 2:
        g.strokeStyle = '#a16207'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(50, 90)
        g.quadraticCurveTo(48, 60, 52, 40)
        g.stroke()
        leaf(g, 50, 72, 22, -2.4, '#bef264')
        grainHead(g, 52, 40, 16, 0.08)
        break
      case 3:
        for (const a of [-0.35, 0, 0.35]) {
          g.save()
          g.translate(50, 86)
          g.rotate(a)
          g.strokeStyle = '#a16207'
          g.lineWidth = 3.5
          g.beginPath()
          g.moveTo(0, 0)
          g.lineTo(0, -44)
          g.stroke()
          grainHead(g, 0, -44, 12)
          g.restore()
        }
        g.fillStyle = '#ef4444'
        g.beginPath()
        g.roundRect(38, 64, 24, 8, 3)
        g.fill()
        outline(g, 2)
        break
      case 4:
        g.beginPath()
        g.moveTo(26, 40)
        g.quadraticCurveTo(50, 30, 74, 40)
        g.quadraticCurveTo(84, 66, 74, 88)
        g.lineTo(26, 88)
        g.quadraticCurveTo(16, 66, 26, 40)
        g.closePath()
        g.fillStyle = lg(g, 30, 88, '#ffffff', '#d6d3d1')
        g.fill()
        outline(g)
        g.beginPath()
        g.moveTo(34, 38)
        g.lineTo(40, 22)
        g.lineTo(60, 22)
        g.lineTo(66, 38)
        g.fillStyle = '#f5f5f4'
        g.fill()
        outline(g)
        g.fillStyle = '#ef4444'
        g.fillRect(36, 34, 28, 5)
        grainHead(g, 50, 74, 8)
        break
      case 5:
        g.beginPath()
        g.moveTo(18, 72)
        g.bezierCurveTo(14, 44, 40, 34, 52, 40)
        g.bezierCurveTo(70, 30, 88, 46, 82, 72)
        g.quadraticCurveTo(50, 82, 18, 72)
        g.closePath()
        g.fillStyle = rg(g, 50, 56, 40, '#fef3c7', '#e7c48d')
        g.fill()
        outline(g)
        g.fillStyle = 'rgba(255,255,255,0.8)'
        for (const [x, y] of [[36, 50], [60, 48], [48, 60], [70, 58]]) {
          g.beginPath()
          g.arc(x, y, 2.4, 0, Math.PI * 2)
          g.fill()
        }
        break
      case 6:
        g.beginPath()
        g.moveTo(14, 70)
        g.bezierCurveTo(12, 36, 88, 36, 86, 70)
        g.quadraticCurveTo(50, 80, 14, 70)
        g.closePath()
        g.fillStyle = lg(g, 40, 76, '#f59e0b', '#9a3412')
        g.fill()
        outline(g)
        g.strokeStyle = '#fde68a'
        g.lineWidth = 3.5
        for (const x of [32, 48, 64]) {
          g.beginPath()
          g.moveTo(x, 50)
          g.quadraticCurveTo(x + 6, 56, x + 4, 64)
          g.stroke()
        }
        shine(g, 34, 46, 10, 4, -0.2)
        break
      case 7:
        ellipse(g, 50, 80, 36, 9, '#e5e7eb')
        g.beginPath()
        g.moveTo(18, 50)
        g.lineTo(18, 76)
        g.quadraticCurveTo(50, 86, 82, 76)
        g.lineTo(82, 50)
        g.closePath()
        g.fillStyle = lg(g, 50, 82, '#fcd34d', '#b45309')
        g.fill()
        outline(g)
        ellipse(g, 50, 50, 32, 10, '#f9a8d4')
        g.fillStyle = '#f9a8d4'
        for (const x of [24, 36, 50, 64, 76]) {
          g.beginPath()
          g.arc(x, 58, 4, 0, Math.PI)
          g.fill()
        }
        circle(g, 50, 40, 6, rg(g, 50, 40, 6, '#fca5a5', '#b91c1c'))
        break
      default:
        g.beginPath()
        g.roundRect(14, 64, 72, 22, 5)
        g.fillStyle = lg(g, 64, 86, '#fbcfe8', '#db2777')
        g.fill()
        outline(g)
        g.beginPath()
        g.roundRect(24, 44, 52, 22, 5)
        g.fillStyle = lg(g, 44, 66, '#fef9c3', '#f59e0b')
        g.fill()
        outline(g)
        g.beginPath()
        g.roundRect(34, 26, 32, 20, 5)
        g.fillStyle = lg(g, 26, 46, '#e0f2fe', '#60a5fa')
        g.fill()
        outline(g)
        for (const x of [42, 50, 58]) {
          g.fillStyle = '#fef08a'
          g.fillRect(x - 1.5, 14, 3, 12)
          g.fillStyle = '#f97316'
          g.beginPath()
          g.ellipse(x, 11, 2.5, 4, 0, 0, Math.PI * 2)
          g.fill()
        }
        g.fillStyle = '#ffffff'
        for (const [x, y] of [[22, 74], [40, 76], [60, 74], [78, 76], [32, 54], [68, 54]]) {
          g.beginPath()
          g.arc(x, y, 2.5, 0, Math.PI * 2)
          g.fill()
        }
    }
  } else if (chain === 1) {
    switch (tier) {
      case 0:
        egg(g, 50, 54, 26)
        break
      case 1: {
        circle(g, 50, 52, 24, rg(g, 50, 52, 26, '#fef9c3', '#facc15'))
        g.beginPath()
        g.moveTo(26, 62)
        for (let i = 0; i <= 8; i++) g.lineTo(26 + i * 6, i % 2 ? 56 : 64)
        g.lineTo(74, 86)
        g.quadraticCurveTo(50, 94, 26, 86)
        g.closePath()
        g.fillStyle = lg(g, 56, 90, '#ffffff', '#e7d7c1')
        g.fill()
        outline(g)
        eyes(g, 50, 46, 9, 3.4)
        g.beginPath()
        g.moveTo(45, 53)
        g.lineTo(55, 53)
        g.lineTo(50, 59)
        g.closePath()
        g.fillStyle = '#f97316'
        g.fill()
        outline(g, 1.6)
        break
      }
      case 2: {
        g.beginPath()
        g.moveTo(20, 60)
        g.quadraticCurveTo(14, 34, 30, 40)
        g.quadraticCurveTo(40, 26, 58, 34)
        g.quadraticCurveTo(84, 36, 82, 62)
        g.quadraticCurveTo(76, 86, 48, 86)
        g.quadraticCurveTo(22, 84, 20, 60)
        g.closePath()
        g.fillStyle = rg(g, 50, 60, 36, '#ffffff', '#d6d3d1')
        g.fill()
        outline(g)
        g.fillStyle = '#ef4444'
        for (const [x, y, r] of [[60, 26, 6], [68, 28, 5], [54, 28, 5]] as const) {
          g.beginPath()
          g.arc(x, y, r, 0, Math.PI * 2)
          g.fill()
          outline(g, 1.6)
        }
        eyes(g, 64, 44, 0.01, 3.4)
        g.beginPath()
        g.moveTo(74, 46)
        g.lineTo(86, 50)
        g.lineTo(74, 54)
        g.closePath()
        g.fillStyle = '#f59e0b'
        g.fill()
        outline(g, 1.6)
        g.fillStyle = '#ef4444'
        g.beginPath()
        g.ellipse(72, 58, 3, 5, 0, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = 'rgba(59,42,26,0.4)'
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(30, 58)
        g.quadraticCurveTo(42, 66, 52, 60)
        g.stroke()
        break
      }
      case 3:
        basket(g)
        egg(g, 36, 50, 11)
        egg(g, 64, 50, 11)
        egg(g, 50, 46, 12, '#fff7ed', '#fdba74')
        break
      case 4:
        ellipse(g, 50, 82, 36, 8, '#e5e7eb')
        for (let i = 0; i < 4; i++) ellipse(g, 50, 74 - i * 10, 30, 8, lg(g, 66 - i * 10, 82 - i * 10, '#fcd34d', '#c2410c'))
        g.beginPath()
        g.moveTo(26, 42)
        g.quadraticCurveTo(50, 34, 74, 42)
        g.quadraticCurveTo(70, 56, 66, 50)
        g.quadraticCurveTo(58, 62, 52, 48)
        g.quadraticCurveTo(40, 58, 34, 48)
        g.quadraticCurveTo(28, 54, 26, 42)
        g.fillStyle = '#92400e'
        g.fill()
        g.beginPath()
        g.roundRect(42, 30, 16, 10, 2)
        g.fillStyle = '#fef08a'
        g.fill()
        outline(g, 2)
        break
      default:
        egg(g, 50, 54, 28, '#fef9c3', '#ca8a04')
        g.fillStyle = '#ffffff'
        for (const [x, y, s] of [[74, 26, 6], [26, 34, 4], [72, 78, 4]] as const) {
          g.beginPath()
          g.moveTo(x, y - s)
          g.lineTo(x + s * 0.3, y - s * 0.3)
          g.lineTo(x + s, y)
          g.lineTo(x + s * 0.3, y + s * 0.3)
          g.lineTo(x, y + s)
          g.lineTo(x - s * 0.3, y + s * 0.3)
          g.lineTo(x - s, y)
          g.lineTo(x - s * 0.3, y - s * 0.3)
          g.closePath()
          g.fill()
        }
    }
  } else if (chain === 2) {
    switch (tier) {
      case 0:
        leaf(g, 50, 56, 30, 0.6)
        flower(g, 46, 46, 22, '#fbcfe8', '#f472b6', 5)
        break
      case 1:
        apple(g, 50, 56, 26, '#d9f99d', '#4d7c0f')
        break
      case 2:
        apple(g, 50, 56, 28, '#fca5a5', '#b91c1c')
        break
      case 3:
        basket(g)
        apple(g, 36, 48, 11, '#fca5a5', '#b91c1c')
        apple(g, 64, 48, 11, '#d9f99d', '#4d7c0f')
        apple(g, 50, 42, 12, '#fca5a5', '#b91c1c')
        break
      case 4:
        g.beginPath()
        g.moveTo(28, 28)
        g.lineTo(72, 28)
        g.lineTo(66, 88)
        g.lineTo(34, 88)
        g.closePath()
        g.fillStyle = 'rgba(224,242,254,0.6)'
        g.fill()
        outline(g)
        g.beginPath()
        g.moveTo(30, 44)
        g.lineTo(70, 44)
        g.lineTo(66, 86)
        g.lineTo(34, 86)
        g.closePath()
        g.fillStyle = lg(g, 44, 86, '#fde68a', '#d97706')
        g.fill()
        g.strokeStyle = '#ef4444'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(56, 70)
        g.lineTo(64, 16)
        g.lineTo(76, 12)
        g.stroke()
        apple(g, 30, 34, 9, '#fca5a5', '#b91c1c')
        shine(g, 38, 60, 3, 12, 0)
        break
      default:
        ellipse(g, 50, 70, 38, 16, lg(g, 54, 86, '#fbbf24', '#92400e'))
        ellipse(g, 50, 62, 34, 13, '#b91c1c', false)
        g.strokeStyle = '#f59e0b'
        g.lineWidth = 5
        for (const d of [-20, -7, 7, 20]) {
          g.beginPath()
          g.moveTo(50 + d - 8, 52)
          g.lineTo(50 + d + 8, 72)
          g.moveTo(50 + d + 8, 52)
          g.lineTo(50 + d - 8, 72)
          g.stroke()
        }
        g.beginPath()
        g.ellipse(50, 62, 34, 13, 0, 0, Math.PI * 2)
        outline(g)
        g.fillStyle = 'rgba(255,255,255,0.7)'
        for (const [x, y] of [[30, 40], [50, 34], [70, 40]]) {
          g.beginPath()
          g.arc(x, y, 3, 0, Math.PI * 2)
          g.fill()
        }
    }
  } else {
    switch (tier) {
      case 0:
        g.strokeStyle = '#15803d'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(50, 88)
        g.lineTo(50, 50)
        g.stroke()
        leaf(g, 50, 72, 22, -2.6)
        leaf(g, 50, 66, 22, -0.5)
        g.beginPath()
        g.moveTo(50, 22)
        g.bezierCurveTo(64, 32, 62, 50, 50, 52)
        g.bezierCurveTo(38, 50, 36, 32, 50, 22)
        g.fillStyle = lg(g, 22, 52, '#86efac', '#16a34a')
        g.fill()
        outline(g)
        g.fillStyle = '#f9a8d4'
        g.beginPath()
        g.ellipse(50, 30, 4, 7, 0, 0, Math.PI * 2)
        g.fill()
        break
      case 1:
        g.strokeStyle = '#15803d'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(50, 90)
        g.lineTo(50, 50)
        g.stroke()
        flower(g, 50, 44, 26, '#ffffff', '#facc15', 10)
        break
      case 2:
        g.strokeStyle = '#15803d'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(50, 90)
        g.lineTo(50, 52)
        g.stroke()
        leaf(g, 50, 80, 26, -2.2)
        g.beginPath()
        g.moveTo(32, 28)
        g.lineTo(40, 40)
        g.lineTo(50, 24)
        g.lineTo(60, 40)
        g.lineTo(68, 28)
        g.quadraticCurveTo(72, 58, 50, 58)
        g.quadraticCurveTo(28, 58, 32, 28)
        g.closePath()
        g.fillStyle = lg(g, 24, 58, '#fda4af', '#e11d48')
        g.fill()
        outline(g)
        break
      case 3:
        g.strokeStyle = '#15803d'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(50, 90)
        g.lineTo(50, 54)
        g.stroke()
        leaf(g, 50, 76, 24, -2.4)
        leaf(g, 50, 70, 24, -0.6)
        circle(g, 50, 40, 20, rg(g, 50, 40, 22, '#fb7185', '#9f1239'))
        g.strokeStyle = '#881337'
        g.lineWidth = 2.4
        g.beginPath()
        g.arc(50, 40, 12, 0.5, 4.8)
        g.stroke()
        g.beginPath()
        g.arc(50, 41, 5, 2, 6.5)
        g.stroke()
        break
      case 4:
        g.beginPath()
        g.moveTo(30, 50)
        g.lineTo(70, 50)
        g.lineTo(56, 92)
        g.lineTo(44, 92)
        g.closePath()
        g.fillStyle = lg(g, 50, 92, '#c4b5fd', '#7c3aed')
        g.fill()
        outline(g)
        flower(g, 36, 40, 13, '#ffffff', '#facc15', 8)
        circle(g, 62, 38, 12, rg(g, 62, 38, 12, '#fb7185', '#be123c'))
        flower(g, 50, 28, 12, '#fde047', '#f97316', 6)
        g.fillStyle = '#f472b6'
        g.beginPath()
        g.moveTo(50, 66)
        g.lineTo(38, 74)
        g.lineTo(38, 60)
        g.closePath()
        g.moveTo(50, 66)
        g.lineTo(62, 74)
        g.lineTo(62, 60)
        g.closePath()
        g.fill()
        break
      default:
        g.beginPath()
        g.arc(50, 54, 32, 0, Math.PI * 2)
        g.arc(50, 54, 18, 0, Math.PI * 2, true)
        g.fillStyle = '#16a34a'
        g.fill('evenodd')
        outline(g)
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          leaf(g, 50 + Math.cos(a) * 24, 54 + Math.sin(a) * 24, 14, a + 1.6, '#86efac')
        }
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.3
          flower(g, 50 + Math.cos(a) * 25, 54 + Math.sin(a) * 25, 7, ['#fda4af', '#fde047', '#c4b5fd', '#ffffff', '#fb923c'][i], '#f59e0b', 5)
        }
        g.fillStyle = '#ef4444'
        g.beginPath()
        g.moveTo(50, 84)
        g.lineTo(40, 96)
        g.lineTo(46, 96)
        g.lineTo(50, 88)
        g.lineTo(54, 96)
        g.lineTo(60, 96)
        g.closePath()
        g.fill()
    }
  }
}

function drawGenerator(g: G, kind: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  if (kind === 0) {
    g.beginPath()
    g.moveTo(24, 36)
    g.quadraticCurveTo(50, 28, 76, 36)
    g.quadraticCurveTo(90, 66, 78, 90)
    g.lineTo(22, 90)
    g.quadraticCurveTo(10, 66, 24, 36)
    g.closePath()
    g.fillStyle = lg(g, 30, 90, '#e7c48d', '#a16207')
    g.fill()
    outline(g)
    g.beginPath()
    g.moveTo(30, 36)
    g.lineTo(36, 16)
    g.lineTo(64, 16)
    g.lineTo(70, 36)
    g.fillStyle = '#d6b37a'
    g.fill()
    outline(g)
    g.strokeStyle = '#7c2d12'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(30, 34)
    g.lineTo(70, 34)
    g.stroke()
    grainHead(g, 50, 76, 9)
    for (const [x, y] of [[40, 18], [52, 14], [60, 19]]) {
      g.fillStyle = '#7c4a21'
      g.beginPath()
      g.ellipse(x, y, 3, 4, 0.4, 0, Math.PI * 2)
      g.fill()
    }
  } else if (kind === 1) {
    g.beginPath()
    g.roundRect(18, 44, 64, 46, 4)
    g.fillStyle = lg(g, 44, 90, '#ef4444', '#991b1b')
    g.fill()
    outline(g)
    g.beginPath()
    g.moveTo(10, 48)
    g.lineTo(50, 16)
    g.lineTo(90, 48)
    g.closePath()
    g.fillStyle = lg(g, 16, 48, '#78716c', '#44403c')
    g.fill()
    outline(g)
    g.beginPath()
    g.moveTo(40, 90)
    g.lineTo(40, 66)
    g.arc(50, 66, 10, Math.PI, 0)
    g.lineTo(60, 90)
    g.closePath()
    g.fillStyle = '#451a03'
    g.fill()
    outline(g, 2)
    g.strokeStyle = 'rgba(255,255,255,0.5)'
    g.lineWidth = 2
    for (const y of [54, 62, 70, 78]) {
      g.beginPath()
      g.moveTo(20, y)
      g.lineTo(36, y)
      g.moveTo(64, y)
      g.lineTo(80, y)
      g.stroke()
    }
    egg(g, 50, 82, 6)
  } else if (kind === 2) {
    g.beginPath()
    g.moveTo(44, 92)
    g.lineTo(46, 58)
    g.lineTo(54, 58)
    g.lineTo(56, 92)
    g.closePath()
    g.fillStyle = lg(g, 58, 92, '#a16207', '#57260b')
    g.fill()
    outline(g)
    for (const [x, y, r] of [[34, 44, 20], [66, 44, 20], [50, 30, 22], [50, 52, 18]] as const) circle(g, x, y, r, rg(g, x, y, r, '#86efac', '#15803d'), false)
    g.beginPath()
    g.arc(34, 44, 20, Math.PI * 0.5, Math.PI * 1.4)
    g.arc(50, 30, 22, Math.PI * 1.1, Math.PI * 1.9)
    g.arc(66, 44, 20, Math.PI * 1.6, Math.PI * 0.5)
    outline(g)
    for (const [x, y] of [[36, 36], [60, 28], [64, 50], [44, 52]]) circle(g, x, y, 5, rg(g, x, y, 5, '#fca5a5', '#b91c1c'))
  } else {
    g.beginPath()
    g.moveTo(26, 60)
    g.lineTo(74, 60)
    g.lineTo(66, 92)
    g.lineTo(34, 92)
    g.closePath()
    g.fillStyle = lg(g, 60, 92, '#fb923c', '#9a3412')
    g.fill()
    outline(g)
    g.beginPath()
    g.roundRect(22, 54, 56, 10, 3)
    g.fillStyle = '#ea580c'
    g.fill()
    outline(g)
    leaf(g, 50, 54, 22, -2.4)
    leaf(g, 50, 54, 22, -0.7)
    flower(g, 34, 34, 11, '#fda4af', '#f59e0b', 6)
    flower(g, 66, 34, 11, '#c4b5fd', '#f59e0b', 6)
    flower(g, 50, 22, 12, '#fde047', '#f97316', 6)
  }
}

function drawSpecial(g: G, kind: number) {
  if (kind === STAR) {
    const cols = ['#f472b6', '#fb923c', '#fde047', '#4ade80', '#38bdf8']
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
      const r = i % 2 ? 16 : 38
      g.lineTo(50 + Math.cos(a) * r, 54 + Math.sin(a) * r)
    }
    g.closePath()
    const gr = g.createLinearGradient(14, 20, 86, 90)
    cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c))
    g.fillStyle = gr
    g.fill()
    outline(g)
    eyes(g, 50, 52, 8, 3.4)
    g.strokeStyle = INK
    g.lineWidth = 2.4
    g.beginPath()
    g.arc(50, 58, 6, 0.3, Math.PI - 0.3)
    g.stroke()
  } else {
    g.beginPath()
    g.roundRect(18, 46, 64, 42, 6)
    g.fillStyle = lg(g, 46, 88, '#60a5fa', '#1d4ed8')
    g.fill()
    outline(g)
    g.beginPath()
    g.roundRect(14, 36, 72, 14, 4)
    g.fillStyle = lg(g, 36, 50, '#93c5fd', '#2563eb')
    g.fill()
    outline(g)
    g.fillStyle = '#facc15'
    g.fillRect(44, 36, 12, 52)
    g.beginPath()
    g.ellipse(40, 28, 12, 7, -0.5, 0, Math.PI * 2)
    g.ellipse(60, 28, 12, 7, 0.5, 0, Math.PI * 2)
    g.fill()
    outline(g, 2)
  }
}

/** Cached sprite for an item (chain 0..3), generator (GEN + kind) or special. */
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
  g.fillStyle = 'rgba(0,0,0,0.16)'
  g.beginPath()
  g.ellipse(50 * s, 90 * s, 30 * s, 6 * s, 0, 0, Math.PI * 2)
  g.fill()
  g.scale(s, s)
  if (chain >= GEN && chain < STAR) drawGenerator(g, chain - GEN)
  else if (chain >= STAR) drawSpecial(g, chain)
  else drawItem(g, chain, tier)
  cache.set(key, c)
  if (cache.size > 260) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

// ── Customers ──────────────────────────────────────────────

export const ANIMALS = ['Cow', 'Pig', 'Sheep', 'Duck', 'Goat']

/** Animal customer portrait centred at x,y with radius r. `happy` 0..1 adds a smile bounce. */
export function drawAnimal(g: G, kind: number, x: number, y: number, r: number, happy: number, t: number) {
  g.save()
  g.translate(x, y + Math.sin(t * 2 + kind) * 1.2 - happy * 4)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const lw = Math.max(1.5, r * 0.07)
  const line = () => {
    g.lineWidth = lw
    g.strokeStyle = INK
    g.stroke()
  }
  const head = (fill: string | CanvasGradient) => {
    g.beginPath()
    g.ellipse(0, 0, r * 0.82, r * 0.74, 0, 0, Math.PI * 2)
    g.fillStyle = fill
    g.fill()
    line()
  }
  if (kind === 0) {
    for (const s of [-1, 1]) {
      g.beginPath()
      g.ellipse(s * r * 0.85, -r * 0.3, r * 0.3, r * 0.14, s * 0.4, 0, Math.PI * 2)
      g.fillStyle = '#f5f5f4'
      g.fill()
      line()
      g.beginPath()
      g.moveTo(s * r * 0.35, -r * 0.6)
      g.quadraticCurveTo(s * r * 0.5, -r * 1.05, s * r * 0.62, -r * 0.95)
      g.lineWidth = r * 0.12
      g.strokeStyle = '#fde68a'
      g.stroke()
    }
    head(rg(g, 0, 0, r, '#ffffff', '#e7e5e4'))
    g.fillStyle = INK
    g.beginPath()
    g.ellipse(-r * 0.4, -r * 0.3, r * 0.22, r * 0.18, 0.4, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(0, r * 0.32, r * 0.5, r * 0.3, 0, 0, Math.PI * 2)
    g.fillStyle = '#fbcfe8'
    g.fill()
    line()
    g.fillStyle = INK
    g.beginPath()
    g.arc(-r * 0.17, r * 0.32, r * 0.06, 0, Math.PI * 2)
    g.arc(r * 0.17, r * 0.32, r * 0.06, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 1) {
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * r * 0.3, -r * 0.6)
      g.lineTo(s * r * 0.75, -r * 0.95)
      g.lineTo(s * r * 0.75, -r * 0.4)
      g.closePath()
      g.fillStyle = '#f9a8d4'
      g.fill()
      line()
    }
    head(rg(g, 0, 0, r, '#fce7f3', '#f472b6'))
    g.beginPath()
    g.ellipse(0, r * 0.3, r * 0.32, r * 0.22, 0, 0, Math.PI * 2)
    g.fillStyle = '#f9a8d4'
    g.fill()
    line()
    g.fillStyle = '#9d174d'
    g.beginPath()
    g.ellipse(-r * 0.11, r * 0.3, r * 0.05, r * 0.08, 0, 0, Math.PI * 2)
    g.ellipse(r * 0.11, r * 0.3, r * 0.05, r * 0.08, 0, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 2) {
    g.fillStyle = '#f8fafc'
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      g.beginPath()
      g.arc(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.62 - r * 0.1, r * 0.3, 0, Math.PI * 2)
      g.fill()
      line()
    }
    g.beginPath()
    g.ellipse(0, r * 0.05, r * 0.55, r * 0.6, 0, 0, Math.PI * 2)
    g.fillStyle = rg(g, 0, 0, r * 0.6, '#57534e', '#292524')
    g.fill()
    line()
    g.fillStyle = '#f8fafc'
    for (const [x, y] of [[-0.25, -0.6], [0, -0.7], [0.25, -0.6]]) {
      g.beginPath()
      g.arc(x * r, y * r, r * 0.2, 0, Math.PI * 2)
      g.fill()
    }
  } else if (kind === 3) {
    head(rg(g, 0, 0, r, '#fef9c3', '#facc15'))
    g.beginPath()
    g.ellipse(0, r * 0.32, r * 0.42, r * 0.18, 0, 0, Math.PI * 2)
    g.fillStyle = '#fb923c'
    g.fill()
    line()
    g.fillStyle = '#facc15'
    g.beginPath()
    g.moveTo(-r * 0.1, -r * 0.7)
    g.quadraticCurveTo(0, -r * 1.1, r * 0.15, -r * 0.72)
    g.fill()
  } else {
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * r * 0.3, -r * 0.6)
      g.quadraticCurveTo(s * r * 0.6, -r * 1.2, s * r * 0.15, -r * 1.1)
      g.lineWidth = r * 0.14
      g.strokeStyle = '#a8a29e'
      g.stroke()
      g.beginPath()
      g.ellipse(s * r * 0.85, -r * 0.15, r * 0.3, r * 0.12, s * 0.5, 0, Math.PI * 2)
      g.fillStyle = '#d6d3d1'
      g.fill()
      line()
    }
    head(rg(g, 0, 0, r, '#f5f5f4', '#a8a29e'))
    g.beginPath()
    g.moveTo(-r * 0.12, r * 0.6)
    g.lineTo(0, r * 1.0)
    g.lineTo(r * 0.12, r * 0.6)
    g.fillStyle = '#d6d3d1'
    g.fill()
    line()
  }
  // eyes + mouth shared
  const ey = kind === 2 ? -r * 0.05 : -r * 0.12
  g.fillStyle = kind === 2 ? '#ffffff' : INK
  g.beginPath()
  g.arc(-r * 0.25, ey, r * 0.1, 0, Math.PI * 2)
  g.arc(r * 0.25, ey, r * 0.1, 0, Math.PI * 2)
  g.fill()
  if (kind !== 2) {
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(-r * 0.22, ey - r * 0.04, r * 0.035, 0, Math.PI * 2)
    g.arc(r * 0.28, ey - r * 0.04, r * 0.035, 0, Math.PI * 2)
    g.fill()
  }
  if (happy > 0.05) {
    g.strokeStyle = kind === 2 ? '#ffffff' : INK
    g.lineWidth = lw
    g.beginPath()
    g.arc(0, kind === 3 ? r * 0.18 : r * 0.12 + (kind === 0 || kind === 1 ? r * 0.38 : 0), r * 0.16, 0.2, Math.PI - 0.2)
    g.stroke()
  }
  g.fillStyle = 'rgba(244,114,182,0.4)'
  g.beginPath()
  g.ellipse(-r * 0.5, r * 0.1, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
  g.ellipse(r * 0.5, r * 0.1, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** Lightning bolt icon for energy. */
export function drawBolt(g: G, x: number, y: number, s: number) {
  g.save()
  g.translate(x, y)
  g.beginPath()
  g.moveTo(s * 0.15, -s)
  g.lineTo(-s * 0.55, s * 0.12)
  g.lineTo(-s * 0.02, s * 0.12)
  g.lineTo(-s * 0.2, s)
  g.lineTo(s * 0.55, -s * 0.2)
  g.lineTo(s * 0.02, -s * 0.2)
  g.closePath()
  g.fillStyle = lg(g, -s, s, '#fef08a', '#f59e0b')
  g.fill()
  g.lineWidth = Math.max(1.2, s * 0.14)
  g.strokeStyle = '#78350f'
  g.stroke()
  g.restore()
}
