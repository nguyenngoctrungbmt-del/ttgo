/** Helix Drop cover: a helix tower with a fireball smashing down through a ring. */
export default function Cover() {
  const ring = (y: number, gapFrom: number, red: boolean) => {
    // Front-facing elliptical ring (rx 40, ry 13) drawn as two arcs with a gap.
    const rx = 40
    const ry = 13
    const pts = (a0: number, a1: number) => {
      const p: string[] = []
      for (let i = 0; i <= 8; i++) {
        const a = a0 + ((a1 - a0) * i) / 8
        p.push(`${60 + Math.cos(a) * rx},${y + Math.sin(a) * ry}`)
      }
      for (let i = 8; i >= 0; i--) {
        const a = a0 + ((a1 - a0) * i) / 8
        p.push(`${60 + Math.cos(a) * 12},${y + Math.sin(a) * 4}`)
      }
      return p.join(' ')
    }
    const g0 = gapFrom
    const g1 = gapFrom + 1.1
    return (
      <g>
        <path d={`M20 ${y} A40 13 0 0 0 100 ${y} L100 ${y + 7} A40 13 0 0 1 20 ${y + 7} Z`} fill="url(#helix-wall)" />
        <polygon points={pts(g1, g0 + Math.PI * 2)} fill="url(#helix-top)" />
        {red ? <polygon points={pts(g1, g1 + 0.9)} fill="#ef4444" /> : null}
      </g>
    )
  }
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Helix Drop">
      <defs>
        <linearGradient id="helix-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbcfe8" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="helix-pole" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.4" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="helix-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="helix-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b21b6" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id="helix-fire" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="0.4" stopColor="#fdba74" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
        <radialGradient id="helix-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#helix-bg)" />
      <rect x="51" y="0" width="18" height="120" fill="url(#helix-pole)" />
      {ring(98, 0.3, true)}
      {ring(68, 1.9, false)}
      {/* shattering ring pieces */}
      <g fill="#8b5cf6">
        <path d="M14 36 l14 -3 l3 6 l-14 4 z" />
        <path d="M90 34 l14 2 l-2 7 l-14 -3 z" />
        <path d="M24 26 l8 -2 l2 4 l-8 2 z" opacity="0.7" />
        <path d="M86 24 l9 1 l-1 4 l-9 -1 z" opacity="0.7" />
      </g>
      {/* fireball */}
      <circle cx="60" cy="40" r="22" fill="url(#helix-glow)" />
      <path d="M52 22 Q60 6 68 22 Q64 16 60 18 Q56 16 52 22 Z" fill="#fde047" />
      <path d="M50 30 Q60 -2 70 30 Z" fill="#fb923c" opacity="0.85" />
      <circle cx="60" cy="40" r="10" fill="url(#helix-fire)" />
      <circle cx="56.5" cy="36.5" r="3" fill="#fff" opacity="0.85" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="44" y1="14" x2="44" y2="26" />
        <line x1="76" y1="14" x2="76" y2="26" />
      </g>
    </svg>
  )
}
