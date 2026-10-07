/** Farm Merge cover: two wheat stalks merging into a loaf, with a happy cow order card. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Farm Merge">
      <defs>
        <linearGradient id="farmmerge-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.45" stopColor="#e0f2fe" />
          <stop offset="0.46" stopColor="#84cc16" />
          <stop offset="1" stopColor="#3f6212" />
        </linearGradient>
        <linearGradient id="farmmerge-bread" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id="farmmerge-grain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
        <radialGradient id="farmmerge-pop" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fef08a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#farmmerge-sky)" />
      <circle cx="96" cy="18" r="9" fill="#fde047" />
      <path d="M0 56 Q30 44 60 54 T120 50 L120 60 L0 60Z" fill="#86efac" />
      {/* barn */}
      <path d="M8 56 L8 38 L20 28 L32 38 L32 56Z" fill="#dc2626" stroke="#3b2a1a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 39 L20 26 L35 39" fill="none" stroke="#f5f5f4" strokeWidth="3" strokeLinejoin="round" />
      <rect x="15" y="44" width="10" height="12" fill="#7f1d1d" stroke="#3b2a1a" strokeWidth="1.2" />
      {/* order card with cow */}
      <rect x="70" y="26" width="42" height="30" rx="7" fill="#fffbeb" stroke="#b45309" strokeWidth="2" />
      <path d="M74 33 q-4 -4 -2 -7 M90 33 q4 -4 2 -7" stroke="#fde68a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="73.5" cy="36" rx="3.5" ry="2" fill="#f5f5f4" stroke="#3b2a1a" strokeWidth="1" />
      <ellipse cx="90.5" cy="36" rx="3.5" ry="2" fill="#f5f5f4" stroke="#3b2a1a" strokeWidth="1" />
      <ellipse cx="82" cy="40" rx="8" ry="8" fill="#ffffff" stroke="#3b2a1a" strokeWidth="1.4" />
      <ellipse cx="78" cy="36.5" rx="3" ry="2.4" fill="#3b2a1a" opacity="0.85" />
      <circle cx="79" cy="39" r="1.2" fill="#3b2a1a" />
      <circle cx="85" cy="39" r="1.2" fill="#3b2a1a" />
      <ellipse cx="82" cy="44.5" rx="5" ry="3" fill="#fbcfe8" stroke="#3b2a1a" strokeWidth="1" />
      <circle cx="80.3" cy="44.5" r="0.8" fill="#3b2a1a" />
      <circle cx="83.7" cy="44.5" r="0.8" fill="#3b2a1a" />
      <path d="M95 46 q4 -10 10 -2 q-4 6 -10 2z" fill="url(#farmmerge-bread)" stroke="#3b2a1a" strokeWidth="1.2" />
      {/* merge pop */}
      <circle cx="60" cy="86" r="24" fill="url(#farmmerge-pop)" />
      {/* wheat stalks flying in */}
      {[
        [22, 92, -30],
        [98, 92, 30],
      ].map(([x, y, a]) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(${a})`}>
          <line x1="0" y1="10" x2="0" y2="-12" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <ellipse cx="-3" cy={-12 - i * 5} rx="2.6" ry="4" fill="url(#farmmerge-grain)" stroke="#3b2a1a" strokeWidth="0.8" transform={`rotate(-20 -3 ${-12 - i * 5})`} />
              <ellipse cx="3" cy={-12 - i * 5} rx="2.6" ry="4" fill="url(#farmmerge-grain)" stroke="#3b2a1a" strokeWidth="0.8" transform={`rotate(20 3 ${-12 - i * 5})`} />
            </g>
          ))}
        </g>
      ))}
      {/* the loaf */}
      <path d="M38 94 C36 70 84 70 82 94 Q60 100 38 94Z" fill="url(#farmmerge-bread)" stroke="#3b2a1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 82 q4 4 3 9 M60 80 q4 4 3 10 M70 82 q4 4 3 9" stroke="#fde68a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="80" rx="6" ry="2.4" fill="#ffffff" opacity="0.5" />
      <g fill="#ffffff">
        <path d="M60 58 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
        <path d="M86 72 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1z" />
        <path d="M32 70 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1z" />
      </g>
    </svg>
  )
}
