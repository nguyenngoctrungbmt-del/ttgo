/** Planet Merge cover: a glowing gravity well with Saturn, two merging moons and the danger ring. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Planet Merge">
      <defs>
        <linearGradient id="planetmerge-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0b1026" />
        </linearGradient>
        <radialGradient id="planetmerge-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="planetmerge-saturn" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#a16207" />
        </radialGradient>
        <radialGradient id="planetmerge-earth" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#93c5fd" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="planetmerge-moon" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#64748b" />
        </radialGradient>
        <radialGradient id="planetmerge-pop" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#planetmerge-bg)" />
      {[[14, 18], [100, 14], [22, 98], [104, 92], [60, 8], [8, 60], [112, 58], [86, 110]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="#ffffff" opacity="0.8" />
      ))}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#7dd3fc" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="6 5" />
      <circle cx="60" cy="60" r="30" fill="url(#planetmerge-core)" />
      <circle cx="60" cy="60" r="7" fill="#ede9fe" />
      {/* saturn */}
      <ellipse cx="78" cy="44" rx="24" ry="6" fill="none" stroke="#fde68a" strokeWidth="2.5" transform="rotate(-20 78 44)" opacity="0.6" />
      <circle cx="78" cy="44" r="13" fill="url(#planetmerge-saturn)" stroke="#713f12" strokeWidth="1" />
      <path d="M57 50 A24 6 -20 0 0 99 38" fill="none" stroke="#fef08a" strokeWidth="2.5" transform="rotate(0)" />
      <circle cx="74" cy="43" r="1.6" fill="#0b0f19" />
      <circle cx="82" cy="43" r="1.6" fill="#0b0f19" />
      <path d="M75 47 q3 2.5 6 0" stroke="#0b0f19" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* earth */}
      <circle cx="44" cy="80" r="12" fill="url(#planetmerge-earth)" stroke="#172554" strokeWidth="1" />
      <path d="M36 76 q4 -5 8 -2 q-2 4 -7 5z M46 84 q5 -2 8 2 q-4 4 -7 2z" fill="#22c55e" />
      <circle cx="40" cy="79" r="1.5" fill="#0b0f19" />
      <circle cx="48" cy="79" r="1.5" fill="#0b0f19" />
      {/* merging moons */}
      <circle cx="30" cy="40" r="14" fill="url(#planetmerge-pop)" />
      <circle cx="24" cy="38" r="6.5" fill="url(#planetmerge-moon)" stroke="#334155" strokeWidth="0.8" />
      <circle cx="36" cy="42" r="6.5" fill="url(#planetmerge-moon)" stroke="#334155" strokeWidth="0.8" />
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
        <line x1="30" y1="28" x2="30" y2="24" />
        <line x1="40" y1="31" x2="43" y2="28" />
        <line x1="20" y1="31" x2="17" y2="28" />
      </g>
      {/* incoming asteroid */}
      <circle cx="96" cy="86" r="5" fill="#b45309" stroke="#451a03" strokeWidth="1" />
      <path d="M100 90 L110 100" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}
