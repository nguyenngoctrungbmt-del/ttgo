/** Chain Link cover: a glowing swipe path linking gem orbs. */
export default function Cover() {
  const orb = (x: number, y: number, r: number, id: string) => (
    <g>
      <circle cx={x} cy={y + r * 0.12} r={r} fill="#1e1b4b" opacity="0.4" />
      <circle cx={x} cy={y} r={r} fill={`url(#chainmerge-${id})`} />
      <ellipse cx={x - r * 0.38} cy={y - r * 0.45} rx={r * 0.26} ry={r * 0.13} fill="#fff" opacity="0.6" transform={`rotate(-35 ${x - r * 0.38} ${y - r * 0.45})`} />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Chain Link">
      <defs>
        <linearGradient id="chainmerge-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="chainmerge-p" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fce7f3" />
          <stop offset="0.55" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#be185d" />
        </radialGradient>
        <radialGradient id="chainmerge-y" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.55" stopColor="#fde047" />
          <stop offset="1" stopColor="#ca8a04" />
        </radialGradient>
        <radialGradient id="chainmerge-b" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="0.55" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="chainmerge-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#chainmerge-bg)" />
      <g fill="#f5d0fe" opacity="0.7">
        <circle cx="18" cy="16" r="1.3" />
        <circle cx="102" cy="22" r="1.6" />
        <circle cx="96" cy="104" r="1.2" />
      </g>
      <path d="M28 88 L48 68 L72 72 L90 46" stroke="#f0abfc" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35" />
      <path d="M28 88 L48 68 L72 72 L90 46" stroke="#fdf4ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {orb(28, 88, 12, 'p')}
      {orb(48, 68, 12, 'p')}
      {orb(72, 72, 13, 'y')}
      <circle cx="90" cy="40" r="26" fill="url(#chainmerge-glow)" />
      {orb(90, 42, 17, 'b')}
      <path d="M90 32 L94 39 L102 40 L96 45 L98 53 L90 49 L82 53 L84 45 L78 40 L86 39 Z" fill="#fff" opacity="0.85" />
      <g stroke="#fdf4ff" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="90" y1="10" x2="90" y2="16" />
        <line x1="112" y1="42" x2="118" y2="42" />
        <line x1="106" y1="24" x2="110" y2="20" />
      </g>
    </svg>
  )
}
