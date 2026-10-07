import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import ImpactFlash from '../../shared/ImpactFlash'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './rally.css'

const meta = getGame('rally')

const WIN_SCORE = 7
const PADDLE_W = 22
const PADDLE_H = 2.8
const BALL_R = 2.1
const YOU_Y = 90
const CPU_Y = 10

type Phase = 'idle' | 'playing' | 'over'

export default function RallyGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [phase, setPhase] = useState<Phase>('idle')
  const [youScore, setYouScore] = useState(0)
  const [cpuScore, setCpuScore] = useState(0)
  const [youX, setYouX] = useState(50)
  const [cpuX, setCpuX] = useState(50)
  const [ball, setBall] = useState({ x: 50, y: 50 })
  const [impact, setImpact] = useState({ trigger: 0, x: 50, y: 50 })
  const [shaking, setShaking] = useState(false)
  const [won, setWon] = useState(false)

  const phaseRef = useRef<Phase>('idle')
  const youXRef = useRef(50)
  const cpuXRef = useRef(50)
  const ballRef = useRef({ x: 50, y: 50, vx: 0, vy: 0 })
  const youScoreRef = useRef(0)
  const cpuScoreRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })
  const pointerXRef = useRef<number | null>(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const serveToYouRef = useRef(true)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent, down: boolean) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = down
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = down
    }
    const down = (e: KeyboardEvent) => onKey(e, true)
    const up = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function playImpact(x: number, y: number) {
    setImpact({ trigger: Date.now(), x, y })
    setShaking(true)
    window.setTimeout(() => setShaking(false), 320)
  }

  function serve() {
    const towardYou = serveToYouRef.current
    const angle = (towardYou ? 1 : -1) * (0.55 + Math.random() * 0.35)
    const speed = 48 + Math.min(youScoreRef.current + cpuScoreRef.current, 8) * 2.5
    ballRef.current = {
      x: 50,
      y: 50,
      vx: (Math.random() < 0.5 ? -1 : 1) * speed * Math.sin(angle),
      vy: (towardYou ? 1 : -1) * speed * Math.cos(angle * 0.4),
    }
    setBall({ x: 50, y: 50 })
  }

  function finish(youWin: boolean) {
    if (phaseRef.current !== 'playing') return
    phaseRef.current = 'over'
    setPhase('over')
    setWon(youWin)
    cancelAnimationFrame(rafRef.current)
    if (youWin) {
      sfx.win()
      levelUp()
    } else {
      sfx.lose()
    }
    recordPlay('rally', youScoreRef.current, youWin)
  }

  function scorePoint(who: 'you' | 'cpu', hitX: number, hitY: number) {
    playImpact(hitX, hitY)
    if (who === 'you') {
      youScoreRef.current += 1
      setYouScore(youScoreRef.current)
      burst(12, Math.min(youScoreRef.current, 6))
      sfx.match()
      serveToYouRef.current = false
      if (youScoreRef.current >= WIN_SCORE) {
        finish(true)
        return
      }
    } else {
      cpuScoreRef.current += 1
      setCpuScore(cpuScoreRef.current)
      sfx.tap()
      serveToYouRef.current = true
      if (cpuScoreRef.current >= WIN_SCORE) {
        finish(false)
        return
      }
    }
    serve()
  }

  function start() {
    void unlockAudio()
    cancelAnimationFrame(rafRef.current)
    youXRef.current = 50
    cpuXRef.current = 50
    youScoreRef.current = 0
    cpuScoreRef.current = 0
    serveToYouRef.current = true
    keysRef.current = { left: false, right: false }
    pointerXRef.current = null
    setYouX(50)
    setCpuX(50)
    setYouScore(0)
    setCpuScore(0)
    setWon(false)
    setImpact({ trigger: 0, x: 50, y: 50 })
    setPhase('playing')
    phaseRef.current = 'playing'
    serve()
    lastRef.current = performance.now()
    sfx.ready()
    rafRef.current = requestAnimationFrame(tick)
  }

  function tick(now: number) {
    if (phaseRef.current !== 'playing') return
    const dt = Math.min(0.05, (now - lastRef.current) / 1000)
    lastRef.current = now

    // Player paddle
    let px = youXRef.current
    const pSpeed = 78
    if (keysRef.current.left) px -= pSpeed * dt
    if (keysRef.current.right) px += pSpeed * dt
    if (pointerXRef.current != null) {
      px += (pointerXRef.current - px) * Math.min(1, 14 * dt)
    }
    px = Math.max(PADDLE_W / 2 + 1, Math.min(100 - PADDLE_W / 2 - 1, px))
    youXRef.current = px
    setYouX(px)

    // CPU paddle — tracks ball with lag that shrinks as rally goes on
    const skill = 0.55 + Math.min(0.35, (youScoreRef.current + cpuScoreRef.current) * 0.04)
    const target = ballRef.current.x + (Math.random() - 0.5) * (12 - skill * 10)
    cpuXRef.current += (target - cpuXRef.current) * skill * Math.min(1, 6 * dt)
    cpuXRef.current = Math.max(
      PADDLE_W / 2 + 1,
      Math.min(100 - PADDLE_W / 2 - 1, cpuXRef.current),
    )
    setCpuX(cpuXRef.current)

    const b = ballRef.current
    b.x += b.vx * dt
    b.y += b.vy * dt

    // Side walls
    if (b.x < BALL_R) {
      b.x = BALL_R
      b.vx = Math.abs(b.vx)
      sfx.tap()
    } else if (b.x > 100 - BALL_R) {
      b.x = 100 - BALL_R
      b.vx = -Math.abs(b.vx)
      sfx.tap()
    }

    // Your paddle
    if (
      b.vy > 0 &&
      b.y + BALL_R >= YOU_Y - PADDLE_H / 2 &&
      b.y - BALL_R <= YOU_Y + PADDLE_H / 2 &&
      Math.abs(b.x - youXRef.current) < PADDLE_W / 2 + BALL_R
    ) {
      b.y = YOU_Y - PADDLE_H / 2 - BALL_R
      const offset = (b.x - youXRef.current) / (PADDLE_W / 2)
      const speed = Math.min(92, Math.hypot(b.vx, b.vy) * 1.04 + 2)
      b.vx = offset * speed * 0.85
      b.vy = -Math.abs(speed * 0.75)
      sfx.match()
    }

    // CPU paddle
    if (
      b.vy < 0 &&
      b.y - BALL_R <= CPU_Y + PADDLE_H / 2 &&
      b.y + BALL_R >= CPU_Y - PADDLE_H / 2 &&
      Math.abs(b.x - cpuXRef.current) < PADDLE_W / 2 + BALL_R
    ) {
      b.y = CPU_Y + PADDLE_H / 2 + BALL_R
      const offset = (b.x - cpuXRef.current) / (PADDLE_W / 2)
      const speed = Math.min(88, Math.hypot(b.vx, b.vy) * 1.03 + 1.5)
      b.vx = offset * speed * 0.8
      b.vy = Math.abs(speed * 0.72)
      sfx.tap()
    }

    // Score
    if (b.y > 108) {
      scorePoint('cpu', b.x, 96)
      if (phaseRef.current === 'playing') rafRef.current = requestAnimationFrame(tick)
      return
    }
    if (b.y < -8) {
      scorePoint('you', b.x, 4)
      if (phaseRef.current === 'playing') rafRef.current = requestAnimationFrame(tick)
      return
    }

    setBall({ x: b.x, y: b.y })
    rafRef.current = requestAnimationFrame(tick)
  }

  function pointerToLane(clientX: number) {
    const el = arenaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    pointerXRef.current = ((clientX - rect.left) / rect.width) * 100
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'You', value: youScore },
        { label: 'CPU', value: cpuScore },
      ]}
      actions={
        phase === 'playing' ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="rally-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {phase === 'idle' ? (
          <PlayIdle hint={`First to ${WIN_SCORE} — drag to move your paddle.`} onPlay={start} />
        ) : (
          <div
            ref={arenaRef}
            className={`rally-arena${shaking ? ' is-impact-shake' : ''}`}
            role="application"
            aria-label="Paddle rally"
            onPointerDown={(e) => {
              e.preventDefault()
              void unlockAudio()
              ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
              pointerToLane(e.clientX)
            }}
            onPointerMove={(e) => {
              if (pointerXRef.current == null && e.buttons === 0) return
              pointerToLane(e.clientX)
            }}
            onPointerUp={() => {
              pointerXRef.current = null
            }}
            onPointerCancel={() => {
              pointerXRef.current = null
            }}
          >
            <ImpactFlash trigger={impact.trigger} x={impact.x} y={impact.y} />
            <div className="rally-hud">
              <span className="is-you">{youScore}</span>
              <span aria-hidden>·</span>
              <span className="is-cpu">{cpuScore}</span>
            </div>
            <div className="rally-net" aria-hidden />
            <div
              className="rally-paddle is-cpu"
              style={{ left: `${cpuX}%`, top: `${CPU_Y}%`, width: `${PADDLE_W}%` }}
              aria-hidden
            />
            <div
              className="rally-paddle is-you"
              style={{ left: `${youX}%`, top: `${YOU_Y}%`, width: `${PADDLE_W}%` }}
              aria-hidden
            />
            <div
              className="rally-ball"
              style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
              aria-hidden
            />
            <div className="rally-hint">drag · ← →</div>
          </div>
        )}
        <ResultOverlay
          open={phase === 'over'}
          title={won ? 'You win!' : 'CPU wins'}
          subtitle={`${youScore} – ${cpuScore}`}
          celebrate={won}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
