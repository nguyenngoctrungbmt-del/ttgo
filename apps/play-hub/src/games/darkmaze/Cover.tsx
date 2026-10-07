/** Dark Maze cover: an explorer with a lantern carving a warm circle out of a dark maze. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Dark Maze">
      <defs>
        <radialGradient id="darkmaze-light" cx="0.46" cy="0.58" r="0.5">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#f59e0b" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0c0a09" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="darkmaze-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1917" />
          <stop offset="1" stopColor="#0c0a09" />
        </linearGradient>
        <linearGradient id="darkmaze-cloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#darkmaze-bg)" />
      <g stroke="#44403c" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7">
        <path d="M12 14 H108 V106 H12 Z" />
        <path d="M34 14 V40 H58 M84 14 V30 M12 62 H34 V84 M58 62 V40 M84 52 H108 M84 52 V84 H60 V106 M34 106 V96" />
      </g>
      <circle cx="55" cy="70" r="46" fill="url(#darkmaze-light)" />
      <g stroke="#d6d3d1" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M34 62 V84 M58 62 V44 M84 52 V84 H66" />
      </g>
      {/* stairs exit glow */}
      <circle cx="96" cy="26" r="9" fill="#4ade80" opacity="0.35" />
      <path d="M90 31 h12 v-3 h-9 v-3 h6 v-3 h-3" stroke="#86efac" strokeWidth="2" fill="none" />
      {/* explorer */}
      <ellipse cx="47" cy="88" rx="12" ry="3.5" fill="#000" opacity="0.4" />
      <path d="M36 86 Q36 66 47 64 Q58 66 58 86 Z" fill="url(#darkmaze-cloak)" />
      <circle cx="47" cy="66" r="10" fill="#fed7aa" />
      <path d="M36 66 Q38 52 47 52 Q57 52 58 66 Q52 60 47 60 Q41 60 36 66 Z" fill="#7c2d12" />
      <circle cx="43.5" cy="67" r="1.8" fill="#1c1917" />
      <circle cx="51" cy="67" r="1.8" fill="#1c1917" />
      <path d="M44 72 Q47 74 50 72" stroke="#9a3412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* lantern */}
      <path d="M58 76 Q64 70 66 72" stroke="#78350f" strokeWidth="2" fill="none" />
      <rect x="62" y="72" width="10" height="13" rx="2.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.6" />
      <path d="M67 76 q2.5 3 0 6 q-2.5 -3 0 -6 z" fill="#fff7ed" />
      <rect x="61" y="70" width="12" height="3" rx="1.2" fill="#78350f" />
    </svg>
  )
}
