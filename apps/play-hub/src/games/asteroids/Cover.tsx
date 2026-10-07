/** Rock Blaster cover: a cyan fighter blasting a big rock apart in deep space. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Rock Blaster">
      <defs>
        <radialGradient id="asteroids-bg" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#312e81" />
          <stop offset="1" stopColor="#030712" />
        </radialGradient>
        <linearGradient id="asteroids-rock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8a29e" />
          <stop offset="1" stopColor="#44403c" />
        </linearGradient>
        <linearGradient id="asteroids-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.5" stopColor="#0e7490" />
          <stop offset="1" stopColor="#164e63" />
        </linearGradient>
        <radialGradient id="asteroids-boom" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.4" stopColor="#fde047" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="asteroids-neb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a855f7" stopOpacity="0.45" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#asteroids-bg)" />
      <circle cx="28" cy="30" r="34" fill="url(#asteroids-neb)" />
      <g fill="#e0e7ff">
        <circle cx="14" cy="18" r="1" />
        <circle cx="100" cy="14" r="1.3" />
        <circle cx="108" cy="58" r="0.9" />
        <circle cx="20" cy="96" r="1.1" />
        <circle cx="56" cy="10" r="0.8" />
        <circle cx="94" cy="104" r="1" />
      </g>
      {/* big rock */}
      <g transform="translate(76 40) rotate(15)">
        <path d="M-24 -6 L-14 -22 L4 -25 L20 -14 L25 4 L14 22 L-6 24 L-22 12 Z" fill="url(#asteroids-rock)" stroke="#d6d3d1" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="6" cy="-6" r="6" fill="#000" opacity="0.22" />
        <circle cx="-9" cy="9" r="4" fill="#000" opacity="0.22" />
        <ellipse cx="-8" cy="-12" rx="8" ry="5" fill="#fff" opacity="0.12" />
      </g>
      {/* impact */}
      <circle cx="62" cy="56" r="14" fill="url(#asteroids-boom)" />
      <g fill="#a8a29e">
        <rect x="48" y="44" width="4" height="4" transform="rotate(20 50 46)" />
        <rect x="56" y="68" width="3" height="3" />
        <rect x="44" y="60" width="3" height="3" transform="rotate(40 45 61)" />
      </g>
      {/* lasers */}
      <g stroke="#fde047" strokeWidth="3" strokeLinecap="round">
        <line x1="44" y1="74" x2="54" y2="64" />
        <line x1="32" y1="86" x2="40" y2="78" opacity="0.8" />
      </g>
      {/* ship */}
      <g transform="translate(26 92) rotate(-45)">
        <path d="M-8 -5 Q-26 0 -8 5 Z" fill="#fb923c" />
        <path d="M-8 -2.5 Q-18 0 -8 2.5 Z" fill="#fef3c7" />
        <path d="M2 -4 L-13 -14 L-9 -4 Z M2 4 L-13 14 L-9 4 Z" fill="#155e75" stroke="#a5f3fc" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M18 0 Q4 -8 -9 -5 L-7 0 L-9 5 Q4 8 18 0 Z" fill="url(#asteroids-hull)" stroke="#a5f3fc" strokeWidth="1.6" strokeLinejoin="round" />
        <ellipse cx="5" cy="0" rx="4.5" ry="2.6" fill="#f0f9ff" />
      </g>
      {/* small rock */}
      <path d="M96 86 l7 -3 5 5 -2 7 -7 2 -5 -5 z" fill="url(#asteroids-rock)" stroke="#d6d3d1" strokeWidth="1.4" />
    </svg>
  )
}
