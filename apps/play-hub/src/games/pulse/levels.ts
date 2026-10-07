// Pulse Dash authored stages: 30 hand-built layouts written in a tiny piece language.
import { CEIL_H, T, addSeg, type Obj, type Seg } from './sim'

/**
 * Piece tokens (lengths in tiles):
 *  R<n>          flat runway
 *  S<n>          n floor spikes in a row (gem above)
 *  B<h>x<w>      block h tall, w wide (gem on top)
 *  BS<w>         1-high block w wide, one empty tile, then a spike
 *  ST / ST+      three-step stairs (+ = spike on the tall step's first tile)
 *  G<n>          gap of n tiles
 *  P             jump pad, then 5 spikes
 *  PW            jump pad, then a 3-high wall to land on
 *  O / OG        orb over 7 spikes / orb over a 7-tile gap
 *  OO            two orbs over a 12-spike pit
 *  GR<L>:a,b     gravity flip for L tiles with ceiling spikes at a, b… (offsets from the piece start)
 *  SH<L>:u3@9,d2@15   ship run L tiles; obstacles from the ceiling (u) or floor (d) with height and offset
 */
export type StageDef = { name: string; sub: string; speed: number; hue: number; pieces: string[] }

export const STAGES: StageDef[] = [
  // ── Arc 1: cube basics ─────────────────────────────
  { name: 'First Beat', sub: 'tap to jump the spikes', speed: 290, hue: 190, pieces: ['R6', 'S1', 'R9', 'S1', 'R9', 'B1x1', 'R9', 'S1', 'R8', 'B1x2', 'R9', 'S2', 'R9', 'S1', 'R7', 'B1x3', 'R10'] },
  { name: 'Neon Steps', sub: 'land on top of blocks', speed: 298, hue: 280, pieces: ['R6', 'B1x2', 'R7', 'ST', 'R8', 'S2', 'R7', 'BS2', 'R7', 'B2x2', 'R8', 'ST', 'R7', 'B1x3', 'R6', 'S2', 'R8'] },
  { name: 'Mind the Gap', sub: 'jump across the gaps', speed: 305, hue: 330, pieces: ['R6', 'G2', 'R8', 'S2', 'R7', 'G2', 'R7', 'B1x2', 'R6', 'G3', 'R8', 'ST', 'R6', 'G2', 'R5', 'S2', 'R6', 'G3', 'R8'] },
  { name: 'Spring Up', sub: 'yellow pads launch you high', speed: 312, hue: 45, pieces: ['R6', 'P', 'R8', 'S2', 'R7', 'PW', 'R8', 'G2', 'R6', 'P', 'R7', 'BS2', 'R7', 'PW', 'R6', 'S3', 'R8'] },
  { name: 'Beat Drop', sub: 'BOSS STAGE · everything so far, faster', speed: 322, hue: 300, pieces: ['R6', 'S3', 'R6', 'ST', 'R5', 'G3', 'R5', 'P', 'R5', 'BS3', 'R5', 'S2', 'R4', 'G2', 'R5', 'PW', 'R5', 'ST+', 'R5', 'S3', 'R5', 'B2x3', 'R5', 'G3', 'R8'] },
  // ── Arc 2: orbs ────────────────────────────────────
  { name: 'Orb Intro', sub: 'tap yellow orbs in mid-air', speed: 312, hue: 150, pieces: ['R6', 'O', 'R9', 'S1', 'R8', 'O', 'R9', 'B1x2', 'R8', 'OG', 'R9', 'S2', 'R9'] },
  { name: 'Orb Pits', sub: 'orbs over open gaps', speed: 322, hue: 210, pieces: ['R6', 'OG', 'R7', 'S2', 'R6', 'OG', 'R7', 'ST', 'R6', 'O', 'R6', 'G3', 'R6', 'OG', 'R9'] },
  { name: 'Pad & Orb', sub: 'chain the bounces', speed: 330, hue: 15, pieces: ['R6', 'P', 'R6', 'O', 'R6', 'PW', 'R6', 'OG', 'R6', 'S3', 'R5', 'P', 'R6', 'O', 'R6', 'B2x2', 'R9'] },
  { name: 'Double Orbs', sub: 'two orbs, one long pit', speed: 334, hue: 170, pieces: ['R6', 'OO', 'R8', 'S2', 'R6', 'OO', 'R7', 'G3', 'R6', 'O', 'R6', 'OO', 'R9'] },
  { name: 'Orbital', sub: 'BOSS STAGE · orbs, pads and gaps', speed: 342, hue: 260, pieces: ['R6', 'OG', 'R5', 'S3', 'R5', 'P', 'R5', 'OO', 'R5', 'ST+', 'R5', 'G3', 'R5', 'O', 'R4', 'BS3', 'R5', 'PW', 'R5', 'OO', 'R5', 'S3', 'R9'] },
  // ── Arc 3: gravity ─────────────────────────────────
  { name: 'Upside', sub: 'blue portal flips gravity', speed: 330, hue: 190, pieces: ['R6', 'GR18:10', 'R8', 'S2', 'R7', 'GR20:9,15', 'R9'] },
  { name: 'Ceiling Walk', sub: 'run along the roof', speed: 340, hue: 280, pieces: ['R6', 'GR24:9,14,19', 'R7', 'ST', 'R6', 'GR22:10,16', 'R6', 'S3', 'R9'] },
  { name: 'Flip Flop', sub: 'in and out of gravity', speed: 346, hue: 330, pieces: ['R6', 'GR16:10', 'R5', 'GR16:9', 'R5', 'S2', 'R5', 'GR20:9,14', 'R5', 'OG', 'R5', 'GR16:11', 'R9'] },
  { name: 'Gravity Gaps', sub: 'the floor falls away below', speed: 352, hue: 45, pieces: ['R6', 'G3', 'R5', 'GR22:9,15,20', 'R5', 'G3', 'R5', 'P', 'R5', 'GR24:9,14,19', 'R5', 'OG', 'R9'] },
  { name: 'Inversion', sub: 'BOSS STAGE · gravity everywhere', speed: 358, hue: 300, pieces: ['R6', 'GR26:9,13,18,23', 'R4', 'S3', 'R4', 'GR20:9,15', 'R4', 'OO', 'R5', 'GR24:10,15,20', 'R4', 'ST+', 'R5', 'GR22:9,14,19', 'R4', 'G3', 'R9'] },
  // ── Arc 4: ship ────────────────────────────────────
  { name: 'Lift Off', sub: 'pink portal: hold to fly', speed: 345, hue: 150, pieces: ['R6', 'SH30:d1@9,u1@15,d2@21,u1@27', 'R7', 'S2', 'R8'] },
  { name: 'Canyon Flight', sub: 'weave through the canyon', speed: 352, hue: 210, pieces: ['R6', 'SH38:d2@9,u2@15,d3@21,u2@27,d2@33', 'R6', 'ST', 'R6', 'S2', 'R9'] },
  { name: 'Zigzag', sub: 'up, down, up, down', speed: 358, hue: 15, pieces: ['R6', 'SH42:u3@9,d3@15,u3@21,d3@27,u3@33,d2@39', 'R6', 'OG', 'R9'] },
  { name: 'Ship & Spikes', sub: 'fly, land, jump', speed: 362, hue: 170, pieces: ['R6', 'S3', 'R5', 'SH32:d2@9,u3@15,d3@21,u2@27', 'R5', 'P', 'R5', 'SH30:u2@9,d3@15,u3@21,d2@26', 'R5', 'G3', 'R9'] },
  { name: 'Skyline', sub: 'BOSS STAGE · the long flight', speed: 368, hue: 260, pieces: ['R6', 'SH56:d2@9,u3@15,d3@21,u3@27,d3@33,u3@39,d2@45,u2@51', 'R5', 'OO', 'R5', 'GR18:10,14', 'R5', 'SH30:d3@9,u3@15,d3@21,u2@26', 'R9'] },
  // ── Arc 5: remix ───────────────────────────────────
  { name: 'Rhythm', sub: 'a breather — feel the beat', speed: 355, hue: 190, pieces: ['R6', 'S1', 'R6', 'S1', 'R6', 'S2', 'R6', 'B1x2', 'R6', 'O', 'R6', 'S2', 'R6', 'GR16:10', 'R9'] },
  { name: 'Stairway', sub: 'climb, flip and drop', speed: 366, hue: 280, pieces: ['R6', 'ST+', 'R4', 'ST', 'R4', 'B2x2', 'R4', 'GR20:9,14', 'R4', 'ST+', 'R4', 'BS3', 'R4', 'PW', 'R9'] },
  { name: 'Pulse Storm', sub: 'orbs inside gravity', speed: 372, hue: 330, pieces: ['R6', 'GR24:9,16,21', 'R4', 'OO', 'R4', 'SH30:u3@9,d3@15,u2@21,d2@26', 'R4', 'P', 'R4', 'OG', 'R4', 'S3', 'R9'] },
  { name: 'Hyperdrive', sub: 'speed rising', speed: 382, hue: 45, pieces: ['R6', 'S3', 'R4', 'G3', 'R4', 'ST', 'R4', 'OO', 'R4', 'SH34:d3@9,u3@15,d3@21,u3@27', 'R4', 'GR20:9,15', 'R4', 'BS3', 'R9'] },
  { name: 'Overload', sub: 'BOSS STAGE · no breathing room', speed: 390, hue: 300, pieces: ['R6', 'P', 'R4', 'OO', 'R4', 'S3', 'R4', 'GR26:9,13,18,23', 'R4', 'SH42:d3@9,u3@15,d3@21,u3@27,d2@33,u2@38', 'R4', 'ST+', 'R4', 'G3', 'R4', 'OG', 'R9'] },
  // ── Arc 6: mastery ─────────────────────────────────
  { name: 'Afterglow', sub: 'a breather after the storm', speed: 378, hue: 150, pieces: ['R6', 'S2', 'R7', 'O', 'R7', 'B1x3', 'R7', 'GR16:10', 'R7', 'SH24:d2@9,u2@15', 'R9'] },
  { name: 'Gauntlet', sub: 'every trick, back to back', speed: 394, hue: 210, pieces: ['R6', 'S3', 'R4', 'P', 'R4', 'OG', 'R4', 'ST+', 'R4', 'GR22:9,14,19', 'R4', 'OO', 'R4', 'B1x3', 'R4', 'G3', 'R9'] },
  { name: 'Triple Threat', sub: 'cube, gravity, ship', speed: 400, hue: 15, pieces: ['R6', 'S3', 'R4', 'S3', 'R4', 'GR24:9,14,19', 'R4', 'SH36:u3@9,d3@15,u3@21,d3@27,u2@32', 'R4', 'OO', 'R4', 'PW', 'R9'] },
  { name: 'Edge', sub: 'tight landings', speed: 405, hue: 170, pieces: ['R6', 'ST+', 'R4', 'G3', 'R4', 'BS3', 'R4', 'OG', 'R4', 'S3', 'R4', 'GR26:9,13,18,23', 'R4', 'SH30:d3@9,u3@15,d3@21,u2@26', 'R4', 'G3', 'R9'] },
  { name: 'Infinity', sub: 'FINAL BOSS · the full pulse', speed: 412, hue: 260, pieces: ['R6', 'S3', 'R4', 'OO', 'R4', 'GR26:9,13,18,23', 'R4', 'P', 'R4', 'SH46:d3@9,u3@15,d3@21,u3@27,d3@33,u2@39', 'R4', 'ST+', 'R4', 'OG', 'R4', 'GR22:9,14,19', 'R4', 'B1x3', 'R4', 'G3', 'R9'] },
]

export const AUTHORED = STAGES.length

type Out = { objs: Obj[]; ground: Seg[]; ceil: Seg[] }

/** Appends one authored stage at x0 (in px). Returns the end x and how many gems it holds. */
export function buildStage(out: Out, x0: number, def: StageDef): { end: number; gems: number } {
  const O = out.objs
  let cur = 0
  let gems = 0
  const tx = (i: number) => x0 + i * T
  const spike = (i: number, dir: 1 | -1 = 1, surf = 0) => O.push({ k: 'spike', x: tx(i), y: dir === 1 ? surf - T : surf, dir })
  const block = (i: number, h: number, wd = 1) => O.push({ k: 'block', x: tx(i), y: -h * T, w: wd * T, h: h * T })
  const gem = (i: number, yt: number) => {
    O.push({ k: 'gem', x: tx(i) + T / 2, y: -yt * T, got: false })
    gems++
  }
  const floor = (a: number, b: number) => addSeg(out.ground, tx(a), tx(b))
  for (const p of def.pieces) {
    const s = cur
    let len = 0
    let hole: [number, number] | null = null
    if (p[0] === 'R') len = Number(p.slice(1))
    else if (/^S\d$/.test(p)) {
      const n = Number(p.slice(1))
      for (let i = 0; i < n; i++) spike(s + i)
      gem(s + Math.floor(n / 2), n >= 3 ? 2.8 : 2.6)
      len = n
    } else if (/^B\d+x\d+$/.test(p)) {
      const [h, wd] = p.slice(1).split('x').map(Number)
      block(s, h, wd)
      gem(s + wd - 1, h + 1.2)
      len = wd
    } else if (p.startsWith('BS')) {
      const wd = Number(p.slice(2))
      block(s, 1, wd)
      spike(s + wd + 1)
      gem(s + wd, 2.4)
      len = wd + 2
    } else if (p === 'ST' || p === 'ST+') {
      block(s, 1, 2)
      block(s + 2, 2, 2)
      block(s + 4, 1, 1)
      if (p === 'ST+') spike(s + 2, 1, -2 * T)
      gem(s + 3, 3.4)
      len = 5
    } else if (/^G\d$/.test(p)) {
      const n = Number(p.slice(1))
      hole = [s, s + n]
      gem(s + Math.floor(n / 2), 1.8)
      len = n
    } else if (p === 'P') {
      O.push({ k: 'pad', x: tx(s), used: false })
      for (let i = 2; i < 7; i++) spike(s + i)
      gem(s + 4, 4.2)
      len = 7
    } else if (p === 'PW') {
      O.push({ k: 'pad', x: tx(s), used: false })
      block(s + 4, 3, 2)
      gem(s + 4, 4.8)
      len = 6
    } else if (p === 'O' || p === 'OG') {
      if (p === 'O') for (let i = 2; i < 9; i++) spike(s + i)
      else hole = [s + 2, s + 9]
      O.push({ k: 'orb', x: tx(s + 4) + T / 2, y: -2.2 * T, used: false })
      gem(s + 7, 3)
      len = 9
    } else if (p === 'OO') {
      for (let i = 2; i < 14; i++) spike(s + i)
      O.push({ k: 'orb', x: tx(s + 4) + T / 2, y: -2.2 * T, used: false })
      O.push({ k: 'orb', x: tx(s + 9) + T / 2, y: -2.2 * T, used: false })
      gem(s + 7, 3.2)
      len = 14
    } else if (p.startsWith('GR')) {
      const [a, b] = p.slice(2).split(':')
      const L = Number(a)
      O.push({ k: 'portal', x: tx(s), kind: 'up', used: false })
      addSeg(out.ceil, tx(s - 2), tx(s + L + 3))
      for (const i of (b ?? '').split(',').filter(Boolean).map(Number)) {
        spike(s + i, -1, -CEIL_H)
        gem(s + i, 7 - 2.4)
      }
      O.push({ k: 'portal', x: tx(s + L), kind: 'down', used: false })
      len = L + 4
    } else if (p.startsWith('SH')) {
      const [a, b] = p.slice(2).split(':')
      const L = Number(a)
      O.push({ k: 'portal', x: tx(s), kind: 'ship', used: false })
      addSeg(out.ceil, tx(s - 2), tx(s + L + 2))
      for (const ob of (b ?? '').split(',').filter(Boolean)) {
        const up = ob[0] === 'u'
        const [hs, at] = ob.slice(1).split('@')
        const h = Number(hs)
        const i = s + Number(at)
        if (up) {
          O.push({ k: 'block', x: tx(i), y: -CEIL_H, w: T, h: h * T })
          gem(i, 7 - h - 2)
        } else {
          block(i, h, 1)
          gem(i, h + 2)
        }
      }
      O.push({ k: 'portal', x: tx(s + L), kind: 'cube', used: false })
      len = L + 4
    }
    if (hole) {
      floor(cur, hole[0])
      cur = hole[1]
      floor(cur, s + len)
    } else floor(cur, s + len)
    cur = s + len
  }
  out.objs.sort((a, b) => a.x - b.x)
  return { end: tx(cur), gems }
}
