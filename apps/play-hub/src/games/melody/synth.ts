import { isSoundMuted } from '../../shared/sound'

/** Tiny mallet synth for Melody Keys. The context is created lazily on a user gesture. */
let ctx: AudioContext | null = null
let master: GainNode | null = null

export function ensureAudio() {
  if (typeof window === 'undefined') return
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctx()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

/** C-major pentatonic over two octaves: any sequence sounds musical. */
export const NOTE_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]

/** Xylophone-like tone: sine body + bright decaying overtone + soft click. */
export function playNote(i: number, dur = 0.6, vol = 0.22) {
  if (isSoundMuted() || !ctx || !master) return
  const freq = NOTE_FREQS[i % NOTE_FREQS.length]
  const t0 = ctx.currentTime + 0.005
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.25, dur))
  g.connect(master)
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(freq, t0)
  o1.connect(g)
  o1.start(t0)
  o1.stop(t0 + dur + 0.05)

  const g2 = ctx.createGain()
  g2.gain.setValueAtTime(0.0001, t0)
  g2.gain.exponentialRampToValueAtTime(vol * 0.35, t0 + 0.004)
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
  g2.connect(master)
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(freq * 3.98, t0)
  o2.connect(g2)
  o2.start(t0)
  o2.stop(t0 + 0.15)

  const g3 = ctx.createGain()
  g3.gain.setValueAtTime(0.0001, t0)
  g3.gain.exponentialRampToValueAtTime(vol * 0.5, t0 + 0.01)
  g3.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.8)
  g3.connect(master)
  const o3 = ctx.createOscillator()
  o3.type = 'sine'
  o3.frequency.setValueAtTime(freq * 2, t0)
  o3.connect(g3)
  o3.start(t0)
  o3.stop(t0 + dur)
}

/** Sour buzz for a wrong key. */
export function playBuzz() {
  if (isSoundMuted() || !ctx || !master) return
  const t0 = ctx.currentTime + 0.005
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
  g.connect(master)
  for (const f of [155, 164]) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f, t0)
    o.frequency.exponentialRampToValueAtTime(f * 0.7, t0 + 0.35)
    o.connect(g)
    o.start(t0)
    o.stop(t0 + 0.4)
  }
}
