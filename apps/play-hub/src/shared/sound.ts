type ToneOpts = {
  freq?: number
  duration?: number
  type?: OscillatorType
  volume?: number
  slideTo?: number
}

let audioCtx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new Ctx()
  }
  return audioCtx
}

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem('ttgo.playhub.mute') === '1'
  } catch {
    return muted
  }
}

export function setSoundMuted(next: boolean): void {
  muted = next
  try {
    localStorage.setItem('ttgo.playhub.mute', next ? '1' : '0')
  } catch {
    // ignore
  }
}

export async function unlockAudio(): Promise<void> {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') await ctx.resume()
}

function tone({
  freq = 440,
  duration = 0.12,
  type = 'sine',
  volume = 0.08,
  slideTo,
}: ToneOpts = {}): void {
  if (isSoundMuted()) return
  const ctx = getCtx()
  if (!ctx) return
  void ctx.resume()

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), ctx.currentTime + duration)
  }
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration + 0.02)
}

type NoiseOpts = {
  duration?: number
  volume?: number
  /** Filter cutoff at start (Hz). */
  freq?: number
  /** Filter cutoff at end (Hz). */
  freqTo?: number
  type?: BiquadFilterType
}

let noiseBuffer: AudioBuffer | null = null

function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const len = Math.floor(ctx.sampleRate * 1.2)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return buf
}

/** Filtered white-noise burst — explosions, slashes, impacts. */
function noise({
  duration = 0.25,
  volume = 0.12,
  freq = 2400,
  freqTo = 200,
  type = 'lowpass',
}: NoiseOpts = {}): void {
  if (isSoundMuted()) return
  const ctx = getCtx()
  if (!ctx) return
  void ctx.resume()

  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(freq, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 20), ctx.currentTime + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  src.start(ctx.currentTime, Math.random() * 0.5)
  src.stop(ctx.currentTime + duration + 0.02)
}

export const sfx = {
  tap: () => tone({ freq: 520, duration: 0.07, type: 'triangle', volume: 0.06 }),
  flip: () => tone({ freq: 380, duration: 0.09, type: 'square', volume: 0.04 }),
  match: () => {
    tone({ freq: 523, duration: 0.1, type: 'sine', volume: 0.07 })
    window.setTimeout(() => tone({ freq: 659, duration: 0.12, type: 'sine', volume: 0.07 }), 70)
  },
  miss: () => tone({ freq: 180, duration: 0.18, type: 'sawtooth', volume: 0.05, slideTo: 90 }),
  move: () => tone({ freq: 300, duration: 0.06, type: 'triangle', volume: 0.045 }),
  pop: () => tone({ freq: 640, duration: 0.08, type: 'sine', volume: 0.06, slideTo: 420 }),
  ready: () => tone({ freq: 880, duration: 0.15, type: 'sine', volume: 0.08 }),
  /** Rising chirp when points are earned; pitch climbs with streak/combo. */
  score: (streak = 0) => {
    const bump = Math.min(streak, 10) * 28
    tone({ freq: 620 + bump, duration: 0.09, type: 'sine', volume: 0.07, slideTo: 880 + bump })
  },
  combo: () => {
    ;[660, 880, 1175].forEach((freq, i) => {
      window.setTimeout(() => tone({ freq, duration: 0.1, type: 'triangle', volume: 0.06 }), i * 55)
    })
  },
  levelUp: () => {
    ;[523, 784, 1046].forEach((freq, i) => {
      window.setTimeout(() => tone({ freq, duration: 0.12, type: 'sine', volume: 0.075 }), i * 70)
    })
  },
  win: () => {
    ;[523, 659, 784, 1046].forEach((freq, i) => {
      window.setTimeout(() => tone({ freq, duration: 0.16, type: 'sine', volume: 0.07 }), i * 90)
    })
  },
  lose: () => tone({ freq: 220, duration: 0.35, type: 'triangle', volume: 0.06, slideTo: 110 }),
  tick: () => tone({ freq: 740, duration: 0.04, type: 'square', volume: 0.03 }),

  // ── Action kit ──────────────────────────────────────────
  /** Short laser / gun shot. */
  shoot: () => tone({ freq: 900, duration: 0.07, type: 'square', volume: 0.025, slideTo: 300 }),
  /** Meaty hit on an enemy. */
  hit: () => {
    noise({ duration: 0.08, volume: 0.09, freq: 3200, freqTo: 600 })
    tone({ freq: 240, duration: 0.07, type: 'square', volume: 0.035, slideTo: 120 })
  },
  /** Explosion — size 0..1 scales the weight. */
  boom: (size = 0.6) => {
    noise({ duration: 0.25 + size * 0.45, volume: 0.1 + size * 0.1, freq: 1800, freqTo: 60 })
    tone({ freq: 120, duration: 0.2 + size * 0.3, type: 'sine', volume: 0.08 + size * 0.06, slideTo: 40 })
  },
  /** Blade swish. */
  slash: () => noise({ duration: 0.12, volume: 0.08, freq: 1200, freqTo: 6000, type: 'bandpass' }),
  /** Metal-on-metal clang (parry, knife on knife). */
  clang: () => {
    tone({ freq: 1320, duration: 0.22, type: 'triangle', volume: 0.06, slideTo: 1240 })
    tone({ freq: 1980, duration: 0.16, type: 'sine', volume: 0.04 })
    noise({ duration: 0.05, volume: 0.06, freq: 6000, freqTo: 2000, type: 'highpass' })
  },
  /** Dull thud (landing, knife into wood). */
  thud: () => {
    noise({ duration: 0.09, volume: 0.1, freq: 700, freqTo: 120 })
    tone({ freq: 150, duration: 0.09, type: 'sine', volume: 0.08, slideTo: 70 })
  },
  /** Power-up pickup sparkle. */
  power: () => {
    ;[784, 988, 1318, 1568].forEach((freq, i) => {
      window.setTimeout(() => tone({ freq, duration: 0.08, type: 'triangle', volume: 0.05 }), i * 40)
    })
  },
  /** Fast air whoosh (dash, jump, swing). */
  whoosh: () => noise({ duration: 0.18, volume: 0.05, freq: 500, freqTo: 2500, type: 'bandpass' }),
  /** Player took damage. */
  hurt: () => {
    tone({ freq: 300, duration: 0.18, type: 'sawtooth', volume: 0.05, slideTo: 80 })
    noise({ duration: 0.15, volume: 0.08, freq: 1400, freqTo: 200 })
  },
  /** Mission completed fanfare. */
  mission: () => {
    ;[659, 880, 1046, 1318].forEach((freq, i) => {
      window.setTimeout(() => tone({ freq, duration: 0.14, type: 'triangle', volume: 0.06 }), i * 80)
    })
  },
}
