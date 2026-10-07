import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import './gauge.css'

const meta = getGame('gauge')

type Zone = { start: number; end: number }

function makeZone(level: number): Zone {
  const width = Math.max(8, 22 - level)
  const start = 8 + Math.floor(Math.random() * (84 - width))
  return { start, end: start + width }
}

export default function GaugeGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [pos, setPos] = useState(0)
  const [zone, setZone] = useState<Zone>(() => makeZone(1))
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const dirRef = useRef(1)
  const speedRef = useRef(1.4)
  const scoreRef = useRef(0)
  const posRef = useRef(0)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (!running || over) return
    const id = window.setInterval(() => {
      setPos((p) => {
        let next = p + dirRef.current * speedRef.current
        if (next >= 100) {
          next = 100
          dirRef.current = -1
        } else if (next <= 0) {
          next = 0
          dirRef.current = 1
        }
        posRef.current = next
        return next
      })
    }, 16)
    return () => window.clearInterval(id)
  }, [running, over, level])

  function start() {
    void unlockAudio()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setLevel(1)
    setZone(makeZone(1))
    setPos(0)
    posRef.current = 0
    dirRef.current = 1
    speedRef.current = 1.4
    setRunning(true)
    setOver(false)
    setFlash(null)
    sfx.ready()
  }

  function stop() {
    if (!running || over) return
    void unlockAudio()
    const p = posRef.current
    const hit = p >= zone.start && p <= zone.end
    if (hit) {
      sfx.match()
      setFlash('ok')
      const center = (zone.start + zone.end) / 2
      const accuracy = 1 - Math.abs(p - center) / Math.max((zone.end - zone.start) / 2, 1)
      const gained = 10 + Math.round(accuracy * 14) + Math.min(streak, 6) * 2
      const nextScore = scoreRef.current + gained
      scoreRef.current = nextScore
      setScore(nextScore)
      const nextStreak = streak + 1
      setStreak(nextStreak)
      burst(gained, nextStreak)
      const nextLevel = level + 1
      setLevel(nextLevel)
      if (nextLevel % 5 === 0) levelUp()
      speedRef.current = Math.min(3.6, 1.4 + nextLevel * 0.14)
      window.setTimeout(() => {
        setFlash(null)
        setZone(makeZone(nextLevel))
        setPos(0)
        posRef.current = 0
        dirRef.current = 1
      }, 280)
    } else {
      sfx.miss()
      setFlash('bad')
      setStreak(0)
      setLives((l) => {
        const left = l - 1
        if (left <= 0) {
          setOver(true)
          setRunning(false)
          sfx.lose()
          recordPlay('gauge', scoreRef.current, scoreRef.current >= 80)
        } else {
          window.setTimeout(() => {
            setFlash(null)
            setZone(makeZone(level))
            setPos(0)
            posRef.current = 0
            dirRef.current = 1
          }, 280)
        }
        return left
      })
    }
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Streak', value: streak },
        { label: 'Lv', value: level },
        { label: 'Lives', value: lives },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className={`gauge-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Start, then stop the marker in the green zone." onPlay={start} />
        )}
        {running && (
          <>
            <div className="gauge-track">
              <div
                className="gauge-zone"
                style={{ left: `${zone.start}%`, width: `${zone.end - zone.start}%` }}
              />
              <div className="gauge-needle" style={{ left: `${pos}%` }} />
            </div>
            <button type="button" className="gauge-stop btn btn-primary" onClick={stop}>
              Stop
            </button>
          </>
        )}
        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Round over</h2>
              <p>Score {score} · Level {level}</p>
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
