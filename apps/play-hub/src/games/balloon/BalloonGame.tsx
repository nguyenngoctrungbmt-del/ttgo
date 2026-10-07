import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import { paceMs, streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './balloon.css'

const meta = getGame('balloon')

const PALETTE = [
  { id: 'blue', hex: '#0D9488', label: 'Teal' },
  { id: 'purple', hex: '#0284C7', label: 'Sky' },
  { id: 'green', hex: '#45C486', label: 'Green' },
  { id: 'yellow', hex: '#FFC83D', label: 'Yellow' },
  { id: 'red', hex: '#FF6B6B', label: 'Red' },
] as const

type ColorId = (typeof PALETTE)[number]['id']

type Balloon = {
  id: number
  color: ColorId
  x: number
  y: number
  born: number
}

const ROUND_MS = 30_000

export default function BalloonGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [target, setTarget] = useState<ColorId>('blue')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [left, setLeft] = useState(30)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [combo, setCombo] = useState(0)
  const endAt = useRef(0)
  const spawnTimer = useRef<number | null>(null)
  const tickTimer = useRef<number | null>(null)
  const idRef = useRef(0)
  const targetRef = useRef<ColorId>('blue')
  const levelRef = useRef(1)
  const comboRef = useRef(0)
  const recorded = useRef(false)

  useEffect(() => {
    targetRef.current = target
  }, [target])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    comboRef.current = combo
  }, [combo])

  useEffect(() => () => clearAll(), [])

  function clearAll() {
    if (spawnTimer.current) window.clearTimeout(spawnTimer.current)
    if (tickTimer.current) window.clearInterval(tickTimer.current)
  }

  function start() {
    void unlockAudio()
    clearAll()
    recorded.current = false
    setScore(0)
    setLives(3)
    setCombo(0)
    comboRef.current = 0
    setLevel(1)
    levelRef.current = 1
    setLeft(30)
    setBalloons([])
    setOver(false)
    setRunning(true)
    const first = PALETTE[Math.floor(Math.random() * PALETTE.length)].id
    setTarget(first)
    targetRef.current = first
    endAt.current = Date.now() + ROUND_MS
    sfx.ready()

    tickTimer.current = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setLeft(remain)
      const rise = 1.6 + levelRef.current * 0.12
      const life = Math.max(1100, 2200 - levelRef.current * 80)
      setBalloons((prev) => {
        const now = Date.now()
        const kept: Balloon[] = []
        let missed = 0
        for (const b of prev) {
          if (now - b.born > life) {
            if (b.color === targetRef.current) missed += 1
          } else {
            kept.push({ ...b, y: b.y - rise })
          }
        }
        if (missed > 0) {
          setCombo(0)
          comboRef.current = 0
          setLives((l) => {
            const next = l - missed
            if (next <= 0) finish(0)
            return Math.max(0, next)
          })
          sfx.miss()
        }
        return kept
      })
      if (remain <= 0) finish()
    }, 80)

    scheduleSpawn(300)
  }

  function scheduleSpawn(delay: number) {
    spawnTimer.current = window.setTimeout(() => {
      if (Date.now() >= endAt.current) return
      idRef.current += 1
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)].id
      setBalloons((prev) => [
        ...prev,
        {
          id: idRef.current,
          color,
          x: 8 + Math.random() * 72,
          y: 78 + Math.random() * 10,
          born: Date.now(),
        },
      ])
      sfx.pop()
      const switchChance = Math.min(0.45, 0.18 + levelRef.current * 0.03)
      if (Math.random() < switchChance) {
        const nextTarget = PALETTE[Math.floor(Math.random() * PALETTE.length)].id
        setTarget(nextTarget)
      }
      const gap = paceMs(520, levelRef.current, 180, 28)
      scheduleSpawn(gap + Math.random() * 220)
    }, delay)
  }

  function finish(forcedLives?: number) {
    clearAll()
    setRunning(false)
    setOver(true)
    setBalloons([])
    if (recorded.current) return
    recorded.current = true
    setScore((current) => {
      const livesLeft = forcedLives ?? lives
      const cleared = current >= 100 || (livesLeft > 0 && current >= 60)
      if (cleared) sfx.win()
      else sfx.lose()
      recordPlay('balloon', current, cleared)
      return current
    })
  }

  function pop(id: number, color: ColorId) {
    if (!running) return
    void unlockAudio()
    setBalloons((prev) => prev.filter((b) => b.id !== id))
    if (color === targetRef.current) {
      sfx.tap()
      const nextCombo = comboRef.current + 1
      comboRef.current = nextCombo
      setCombo(nextCombo)
      const gained = streakScore(10, nextCombo - 1, { cap: 8, per: 2 })
      setScore((s) => s + gained)
      burst(gained, nextCombo)
      if (nextCombo % 4 === 0) {
        const nextLevel = levelRef.current + 1
        levelRef.current = nextLevel
        setLevel(nextLevel)
        if (nextLevel % 2 === 0) levelUp()
      }
    } else {
      sfx.miss()
      setCombo(0)
      comboRef.current = 0
      setLives((l) => {
        const next = l - 1
        if (next <= 0) finish(0)
        return next
      })
    }
  }

  const targetMeta = PALETTE.find((p) => p.id === target)!

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Combo', value: combo },
        { label: 'Lv', value: level },
        { label: 'Lives', value: lives },
        { label: 'Time', value: `${left}s` },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="balloon-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Pop balloons matching the target color." onPlay={start} />
        )}
        {(running || over) && (
          <>
            <div className="balloon-target">
              Target
              <strong style={{ color: targetMeta.hex }}>{targetMeta.label}</strong>
            </div>
            <div className="balloon-sky">
              {balloons.map((b) => {
                const color = PALETTE.find((p) => p.id === b.color)!
                return (
                  <button
                    key={b.id}
                    type="button"
                    className="balloon"
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      background: color.hex,
                      color: b.color === 'yellow' ? '#422006' : '#fff',
                    }}
                    onClick={() => pop(b.id, b.color)}
                    aria-label={`${color.label} balloon`}
                  >
                    🎈
                  </button>
                )
              })}
            </div>
          </>
        )}

        <ResultOverlay
          open={over}
          title="Sky cleared"
          subtitle={`Score ${score} · Level ${level}`}
          celebrate
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
