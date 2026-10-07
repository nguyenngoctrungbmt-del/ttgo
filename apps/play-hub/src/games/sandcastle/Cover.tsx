/** Sandcastle cover: a turreted castle on the beach as a wave curls in. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Sandcastle">
      <defs>
        <linearGradient id="sandcastle-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <linearGradient id="sandcastle-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde7a8" />
          <stop offset="1" stopColor="#e2b25e" />
        </linearGradient>
        <linearGradient id="sandcastle-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8d98f" />
          <stop offset="1" stopColor="#d39a4c" />
        </linearGradient>
        <linearGradient id="sandcastle-wave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <clipPath id="sandcastle-clip">
          <rect width="120" height="120" rx="26" />
        </clipPath>
      </defs>
      <g clipPath="url(#sandcastle-clip)">
        <rect width="120" height="120" fill="url(#sandcastle-sky)" />
        <circle cx="92" cy="24" r="11" fill="#fef9c3" />
        <circle cx="92" cy="24" r="17" fill="#fef08a" opacity="0.3" />
        <rect y="70" width="120" height="14" fill="#0ea5e9" />
        <path d="M0 84 H120 V120 H0 Z" fill="url(#sandcastle-sand)" />
        {/* castle */}
        <rect x="22" y="56" width="52" height="30" rx="2" fill="url(#sandcastle-wall)" />
        <rect x="16" y="38" width="16" height="48" rx="2" fill="url(#sandcastle-wall)" />
        <rect x="62" y="44" width="16" height="42" rx="2" fill="url(#sandcastle-wall)" />
        <rect x="38" y="30" width="18" height="56" rx="2" fill="url(#sandcastle-wall)" />
        {[16, 21.5, 27].map((x) => (
          <rect key={`a${x}`} x={x} y="33" width="4.5" height="6" rx="1" fill="#f2cf86" />
        ))}
        {[62, 67.5, 73].map((x) => (
          <rect key={`b${x}`} x={x} y="39" width="4.5" height="6" rx="1" fill="#f2cf86" />
        ))}
        {[38, 44.5, 51].map((x) => (
          <rect key={`c${x}`} x={x} y="25" width="5" height="6" rx="1" fill="#f2cf86" />
        ))}
        <path d="M44 86 V74 a3 3 0 0 1 6 0 V86 Z" fill="#7c4a1a" />
        <path d="M45 46 V41 a2 2 0 0 1 4 0 V46 Z" fill="#7c4a1a" />
        <path d="M22 54 V50 a2 2 0 0 1 4 0 V54 Z" fill="#7c4a1a" />
        <rect x="16" y="38" width="16" height="2" fill="#fff" opacity="0.35" />
        <rect x="38" y="30" width="18" height="2" fill="#fff" opacity="0.35" />
        {/* flag */}
        <line x1="47" y1="25" x2="47" y2="9" stroke="#78350f" strokeWidth="1.8" />
        <path d="M47 9 Q54 8 59 12 Q54 15 47 15 Z" fill="#ef4444" />
        {/* shell */}
        <path d="M24 104 a7 7 0 0 1 14 0 Z" fill="#f472b6" />
        <path d="M31 104 L27 98 M31 104 L31 97 M31 104 L35 98" stroke="#9d174d" strokeWidth="0.9" />
        {/* incoming wave */}
        <path d="M120 58 C104 56 92 66 92 80 C92 88 96 92 100 96 L120 120 Z" fill="url(#sandcastle-wave)" />
        <path d="M120 58 C106 57 96 64 94 74 C99 68 106 66 112 70 C108 64 114 60 120 61 Z" fill="#fff" opacity="0.9" />
        <circle cx="90" cy="86" r="2.2" fill="#e0f2fe" />
        <circle cx="86" cy="80" r="1.6" fill="#e0f2fe" />
        <circle cx="88" cy="93" r="1.4" fill="#e0f2fe" />
      </g>
    </svg>
  )
}
