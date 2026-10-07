let lastAt = 0

/** Skip buzzes that land too close together — avoids a mushy, constant rumble. */
function gate(minGapMs: number): boolean {
  const now = performance.now()
  if (now - lastAt < minGapMs) return false
  lastAt = now
  return true
}

function vibrate(ms: number) {
  try {
    // Browsers block (and log) vibrate before the first user gesture.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    if (activation && !activation.hasBeenActive) return
    navigator.vibrate?.(ms)
  } catch {
    // unsupported
  }
}

function impact(webMs: number, gap: number) {
  if (gate(gap)) vibrate(webMs)
}

export const haptic = {
  /** Tiny tick — taps, small hits. */
  light: () => impact(8, 45),
  /** Solid hit — kills, landings. */
  medium: () => impact(16, 60),
  /** Heavy thump — explosions, taking damage. */
  heavy: () => impact(30, 80),
  success: () => impact(25, 0),
  error: () => impact(60, 0),
}
