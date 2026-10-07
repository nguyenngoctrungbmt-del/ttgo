import { useEffect, useRef, type TouchEvent } from 'react'

export type Dir = 'up' | 'down' | 'left' | 'right'

const KEY_MAP: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

type Options = {
  enabled?: boolean
  /** Minimum swipe distance in px before a direction fires. */
  threshold?: number
  onDirection: (dir: Dir) => void
}

/**
 * Keyboard arrows (desktop/editor) + touch swipe (mobile-first).
 * No on-screen D-pad — spread `swipeHandlers` onto the play surface.
 */
export function useDirectionInput({ enabled = true, threshold = 24, onDirection }: Options) {
  const onDirectionRef = useRef(onDirection)
  const enabledRef = useRef(enabled)
  const touchRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    onDirectionRef.current = onDirection
  }, [onDirection])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!enabledRef.current) return
      const dir = KEY_MAP[e.key]
      if (!dir) return
      e.preventDefault()
      onDirectionRef.current(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onTouchStart(e: TouchEvent) {
    if (!enabledRef.current) return
    const t = e.changedTouches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchEnd(e: TouchEvent) {
    if (!enabledRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return
    if (Math.abs(dx) > Math.abs(dy)) onDirectionRef.current(dx > 0 ? 'right' : 'left')
    else onDirectionRef.current(dy > 0 ? 'down' : 'up')
  }

  return {
    swipeHandlers: {
      onTouchStart,
      onTouchEnd,
    } as const,
  }
}

export function dirToDelta(dir: Dir): { dr: number; dc: number } {
  switch (dir) {
    case 'up':
      return { dr: -1, dc: 0 }
    case 'down':
      return { dr: 1, dc: 0 }
    case 'left':
      return { dr: 0, dc: -1 }
    case 'right':
      return { dr: 0, dc: 1 }
  }
}
