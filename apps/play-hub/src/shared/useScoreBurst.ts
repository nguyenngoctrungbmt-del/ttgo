import { useCallback, useState } from 'react'
import { comboLabel } from './difficulty'
import { sfx } from './sound'

export type ScoreBurstItem = {
  id: number
  amount: number
  combo?: number
  tag?: string
}

let burstSeq = 0

export function useScoreBurst() {
  const [bursts, setBursts] = useState<ScoreBurstItem[]>([])

  const dismiss = useCallback((id: number) => {
    setBursts((list) => list.filter((b) => b.id !== id))
  }, [])

  const burst = useCallback((amount: number, streakOrCombo = 0) => {
    const id = ++burstSeq
    const tag = comboLabel(streakOrCombo)
    setBursts((list) => [...list.slice(-4), { id, amount, combo: streakOrCombo, tag }])
    sfx.score(streakOrCombo)
    if (streakOrCombo >= 3 && streakOrCombo % 3 === 0) sfx.combo()
  }, [])

  const levelUp = useCallback(() => {
    sfx.levelUp()
  }, [])

  return { bursts, burst, dismiss, levelUp }
}
