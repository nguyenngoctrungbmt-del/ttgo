/**
 * Tiny WebAudio drum machine + synth for Beat Tapper. The context is created
 * lazily (after a user gesture) and respects the app-wide mute switch.
 */
import { isSoundMuted } from '../../shared/sound'

export type Voice = 'kick' | 'snare' | 'clap' | 'hat' | 'ohat' | 'crash' | 'bass' | 'lead' | 'pad'
export type LeadWave = 'sawtooth' | 'square' | 'triangle'

export class Synth {
  ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private mutedNow = false
  lead: LeadWave = 'sawtooth'
  bassWave: OscillatorType = 'sawtooth'

  ensure(): boolean {
    if (typeof window === 'undefined') return false
    if (!this.ctx) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new Ctx()
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -14
        comp.ratio.value = 4
        const master = ctx.createGain()
        master.gain.value = 0.45
        master.connect(comp)
        comp.connect(ctx.destination)
        const len = Math.floor(ctx.sampleRate * 1)
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
        this.ctx = ctx
        this.master = master
        this.noise = buf
      } catch {
        return false
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined)
    return true
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running'
  }

  /** Output latency estimate so audio can be scheduled to land on the visuals. */
  get latency() {
    const c = this.ctx as (AudioContext & { outputLatency?: number }) | null
    if (!c) return 0
    return Math.min(0.15, Math.max(0, (c.outputLatency || 0) + (c.baseLatency || 0)))
  }

  syncMute() {
    const m = isSoundMuted()
    if (m === this.mutedNow || !this.master || !this.ctx) return
    this.mutedNow = m
    this.master.gain.setTargetAtTime(m ? 0 : 0.45, this.ctx.currentTime, 0.02)
  }

  /** Quick fade (death / song stop). */
  duck(on: boolean) {
    if (!this.master || !this.ctx) return
    const target = on || this.mutedNow ? 0 : 0.45
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, on ? 0.05 : 0.02)
  }

  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    g.connect(this.master!)
    return g
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number, q = 1) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = this.env(t, peak, 0.002, decay)
    src.connect(f)
    f.connect(g)
    src.start(t, Math.random() * 0.5)
    src.stop(t + decay + 0.05)
  }

  play(v: Voice, t: number, freq = 220, dur = 0.2, vel = 1) {
    if (!this.ctx || !this.master || this.mutedNow) return
    const ctx = this.ctx
    t = Math.max(t, ctx.currentTime)
    switch (v) {
      case 'kick': {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(160, t)
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
        const g = this.env(t, 0.9 * vel, 0.003, 0.32)
        o.connect(g)
        o.start(t)
        o.stop(t + 0.4)
        this.noiseHit(t, 'lowpass', 1200, 0.15 * vel, 0.02)
        break
      }
      case 'snare': {
        this.noiseHit(t, 'highpass', 1600, 0.45 * vel, 0.16)
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.setValueAtTime(210, t)
        o.frequency.exponentialRampToValueAtTime(140, t + 0.08)
        const g = this.env(t, 0.3 * vel, 0.002, 0.1)
        o.connect(g)
        o.start(t)
        o.stop(t + 0.15)
        break
      }
      case 'clap': {
        for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, 'bandpass', 1400, 0.35 * vel, i === 2 ? 0.14 : 0.02, 1.5)
        break
      }
      case 'hat':
        this.noiseHit(t, 'highpass', 7500, 0.16 * vel, 0.04)
        break
      case 'ohat':
        this.noiseHit(t, 'highpass', 6500, 0.14 * vel, 0.22)
        break
      case 'crash':
        this.noiseHit(t, 'highpass', 4000, 0.22 * vel, 1.1)
        break
      case 'bass': {
        const o = ctx.createOscillator()
        o.type = this.bassWave
        o.frequency.setValueAtTime(freq, t)
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.setValueAtTime(900, t)
        f.frequency.exponentialRampToValueAtTime(180, t + dur)
        f.Q.value = 6
        const g = this.env(t, 0.32 * vel, 0.005, dur)
        o.connect(f)
        f.connect(g)
        o.start(t)
        o.stop(t + dur + 0.05)
        break
      }
      case 'lead': {
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.value = this.lead === 'triangle' ? 5000 : 2600
        const g = ctx.createGain()
        const peak = (this.lead === 'square' ? 0.07 : this.lead === 'triangle' ? 0.16 : 0.09) * vel
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(peak, t + 0.008)
        g.gain.setValueAtTime(peak, t + Math.max(0.02, dur - 0.05))
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08)
        f.connect(g)
        g.connect(this.master)
        for (const det of [-6, 7]) {
          const o = ctx.createOscillator()
          o.type = this.lead
          o.frequency.value = freq
          o.detune.value = det
          o.connect(f)
          o.start(t)
          o.stop(t + dur + 0.12)
        }
        break
      }
      case 'pad': {
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.value = 1100
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.25)
        g.gain.setValueAtTime(0.05 * vel, t + Math.max(0.3, dur - 0.2))
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3)
        f.connect(g)
        g.connect(this.master)
        for (const m of [1, 1.5, 2.0]) {
          const o = ctx.createOscillator()
          o.type = 'sawtooth'
          o.frequency.value = freq * m
          o.detune.value = (Math.random() - 0.5) * 14
          o.connect(f)
          o.start(t)
          o.stop(t + dur + 0.35)
        }
        break
      }
    }
  }

  /** Off-beat "dud" when a note is missed. */
  dud(t: number) {
    if (!this.ctx || !this.master || this.mutedNow) return
    const o = this.ctx.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(70, t + 0.12)
    const g = this.env(t, 0.05, 0.003, 0.12)
    o.connect(g)
    o.start(t)
    o.stop(t + 0.16)
  }

  close() {
    if (this.ctx) void this.ctx.close().catch(() => undefined)
    this.ctx = null
    this.master = null
  }
}
