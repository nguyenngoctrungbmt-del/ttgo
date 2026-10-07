import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './taprace.css'

const meta = getGame('taprace')
const ROUND_MS = 10_000

export default function TapRaceGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [taps, setTaps] = useState(0)
  const [left, setLeft] = useState(10)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [combo, setCombo] = useState(0)
  const endAt = useRef(0)
  const recorded = useRef(false)
  const lastTapAt = useRef(0)
  const tapsRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const remain = Math.max(0, (endAt.current - Date.now()) / 1000)
      setLeft(Number(remain.toFixed(1)))
      if (remain <= 0) finish()
    }, 50)
    return () => window.clearInterval(id)
  }, [running])

  function start() {
    void unlockAudio()
    recorded.current = false
    setTaps(0)
    tapsRef.current = 0
    setCombo(0)
    setLeft(10)
    setOver(false)
    setRunning(true)
    lastTapAt.current = 0
    endAt.current = Date.now() + ROUND_MS
    sfx.ready()
  }

  function finish() {
    setRunning(false)
    setOver(true)
    if (recorded.current) return
    recorded.current = true
    const current = tapsRef.current
    if (current >= 40) sfx.win()
    else sfx.lose()
    recordPlay('taprace', current, current >= 40)
  }

  function tap() {
    if (!running) return
    void unlockAudio()
    const now = Date.now()
    const gap = lastTapAt.current ? now - lastTapAt.current : 999
    lastTapAt.current = now
    const nextCombo = gap < 280 ? combo + 1 : 1
    setCombo(nextCombo)
    const next = tapsRef.current + 1
    tapsRef.current = next
    setTaps(next)
    setPulse(true)
    window.setTimeout(() => setPulse(false), 90)
    sfx.tap()
    if (next % 10 === 0) {
      burst(10, Math.floor(next / 10))
      if (next % 20 === 0) levelUp()
    } else if (nextCombo >= 5 && nextCombo % 5 === 0) {
      burst(5, nextCombo)
    }
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Taps', value: taps },
        { label: 'Combo', value: combo },
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
      <div className="taprace-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Mash the button for 10 seconds." onPlay={start} />
        )}
        {(running || over) && (
          <>
            <p className="muted taprace-hint">
              {running && (combo >= 5 ? `Combo x${combo}!` : 'Keep tapping!')}
              {over && `Finished with ${taps} taps.`}
            </p>
            <button
              type="button"
              className={`taprace-btn${pulse ? ' is-pulse' : ''}`}
              onClick={running ? tap : start}
              disabled={over && !running}
            >
              {running ? 'TAP!' : 'Again'}
            </button>
          </>
        )}
        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Time’s up</h2>
              <p>{taps} taps</p>
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
