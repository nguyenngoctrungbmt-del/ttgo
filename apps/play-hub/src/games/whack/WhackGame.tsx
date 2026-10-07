import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import { paceMs, streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './whack.css'

const meta = getGame('whack')
const CELLS = 9
const ROUND_MS = 30_000

export default function WhackGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [active, setActive] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [left, setLeft] = useState(30)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [hitFlash, setHitFlash] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const endAt = useRef(0)
  const spawnTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const tickTimer = useRef<number | null>(null)
  const activeRef = useRef<number | null>(null)
  const levelRef = useRef(1)
  const comboRef = useRef(0)
  const recorded = useRef(false)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    comboRef.current = combo
  }, [combo])

  useEffect(() => () => clearAll(), [])

  function clearAll() {
    if (spawnTimer.current) window.clearTimeout(spawnTimer.current)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
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
    setOver(false)
    setRunning(true)
    setActive(null)
    endAt.current = Date.now() + ROUND_MS
    sfx.ready()

    tickTimer.current = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setLeft(remain)
      if (remain <= 0) finish()
    }, 200)

    scheduleSpawn(450)
  }

  function scheduleSpawn(delay: number) {
    spawnTimer.current = window.setTimeout(() => {
      const next = Math.floor(Math.random() * CELLS)
      setActive(next)
      sfx.pop()
      const hideMs = paceMs(780, levelRef.current, 320, 40)
      hideTimer.current = window.setTimeout(() => {
        if (activeRef.current === next) {
          setActive(null)
          setCombo(0)
          comboRef.current = 0
          setLives((l) => {
            const nextLives = l - 1
            sfx.miss()
            if (nextLives <= 0) finish(nextLives)
            return nextLives
          })
        }
        if (Date.now() < endAt.current) {
          const gap = paceMs(420, levelRef.current, 120, 28)
          scheduleSpawn(gap + Math.random() * 180)
        }
      }, hideMs)
    }, delay)
  }

  function finish(forcedLives?: number) {
    clearAll()
    setActive(null)
    setRunning(false)
    setOver(true)
    if (recorded.current) return
    recorded.current = true
    setScore((current) => {
      const livesLeft = forcedLives ?? lives
      const cleared = current >= 120 || livesLeft > 0
      if (cleared) sfx.win()
      else sfx.lose()
      recordPlay('whack', current, cleared)
      return current
    })
  }

  function hit(index: number) {
    if (!running || active !== index) return
    void unlockAudio()
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    setActive(null)
    setHitFlash(index)
    window.setTimeout(() => setHitFlash(null), 220)
    const nextCombo = comboRef.current + 1
    comboRef.current = nextCombo
    setCombo(nextCombo)
    const gained = streakScore(10, nextCombo - 1, { cap: 10, per: 2 })
    setScore((s) => s + gained)
    burst(gained, nextCombo)
    if (nextCombo % 4 === 0) {
      const nextLevel = levelRef.current + 1
      levelRef.current = nextLevel
      setLevel(nextLevel)
      if (nextLevel % 2 === 0) levelUp()
    }
    sfx.tap()
    if (Date.now() < endAt.current) {
      scheduleSpawn(paceMs(200, levelRef.current, 70, 18))
    }
  }

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
      <div className="whack-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Pop targets before they vanish." onPlay={start} />
        )}
        {(running || over) && (
          <div className="whack-grid">
            {Array.from({ length: CELLS }, (_, index) => (
              <button
                key={index}
                type="button"
                className={`whack-cell${active === index ? ' is-up' : ''}${hitFlash === index ? ' is-hit' : ''}`}
                onClick={() => hit(index)}
                aria-label={active === index ? 'Target' : 'Empty'}
              >
                <span className="whack-mole" aria-hidden>
                  {active === index || hitFlash === index ? '🎯' : ''}
                </span>
              </button>
            ))}
          </div>
        )}

        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Round over</h2>
              <p>
                Score {score} · Level {level}
              </p>
              <div className="overlay-actions">
                <button type="button" className="btn btn-primary" onClick={start}>
                  Play again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
