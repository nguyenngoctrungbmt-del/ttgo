/** Gun Merge cover: two pistols fusing into a glowing rifle, a zombie behind sandbags. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Gun Merge">
      <defs>
        <linearGradient id="gunmerge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.55" stopColor="#9a3412" />
          <stop offset="1" stopColor="#1c1917" />
        </linearGradient>
        <radialGradient id="gunmerge-flash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#fde047" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gunmerge-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="gunmerge-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d08a4c" />
          <stop offset="1" stopColor="#7c3f16" />
        </linearGradient>
        <linearGradient id="gunmerge-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#gunmerge-bg)" />
      <circle cx="92" cy="20" r="9" fill="#fde68a" opacity="0.9" />
      {/* zombie */}
      <g stroke="#0b0f19" strokeWidth="1.6">
        <path d="M44 38 q-10 6 -12 14" stroke="#0b0f19" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M44 38 q-10 6 -12 14" stroke="#86efac" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M76 38 q10 6 12 14" stroke="#0b0f19" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M76 38 q10 6 12 14" stroke="#86efac" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <rect x="46" y="34" width="28" height="20" rx="7" fill="#3b82f6" />
        <circle cx="60" cy="28" r="11" fill="url(#gunmerge-skin)" />
        <ellipse cx="56" cy="27" rx="3" ry="2.6" fill="#0b0f19" stroke="none" />
        <ellipse cx="64" cy="27" rx="3" ry="2.6" fill="#0b0f19" stroke="none" />
        <circle cx="56" cy="27" r="1.5" fill="#fef08a" stroke="none" />
        <circle cx="64" cy="27" r="1.5" fill="#fef08a" stroke="none" />
        <ellipse cx="60" cy="34" rx="3.5" ry="1.6" fill="#450a0a" stroke="none" />
      </g>
      {/* sandbags */}
      <g stroke="#3b2f17" strokeWidth="1.4" fill="#c9b07a">
        <ellipse cx="18" cy="60" rx="15" ry="6" />
        <ellipse cx="48" cy="60" rx="15" ry="6" />
        <ellipse cx="78" cy="60" rx="15" ry="6" />
        <ellipse cx="106" cy="60" rx="15" ry="6" />
      </g>
      {/* merge flash */}
      <circle cx="60" cy="86" r="26" fill="url(#gunmerge-flash)" opacity="0.85" />
      {/* incoming pistols */}
      <g transform="translate(4 100) rotate(-25)" stroke="#0b0f19" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M3 5 L11 5 L9 17 L1 17 Z" fill="url(#gunmerge-wood)" />
        <rect x="0" y="-2" width="24" height="8" rx="1.5" fill="url(#gunmerge-steel)" />
      </g>
      <g transform="translate(116 100) rotate(25) scale(-1 1)" stroke="#0b0f19" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M3 5 L11 5 L9 17 L1 17 Z" fill="url(#gunmerge-wood)" />
        <rect x="0" y="-2" width="24" height="8" rx="1.5" fill="url(#gunmerge-steel)" />
      </g>
      {/* merged assault rifle, tilted up at the horde */}
      <g transform="translate(18 96) rotate(-24)" stroke="#0b0f19" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M0 2 L18 4 L18 16 L2 22 Z" fill="#d6b37a" />
        <path d="M44 16 L54 16 L60 38 L50 40 Z" fill="#a1824a" />
        <path d="M24 16 L33 16 L30 32 L22 32 Z" fill="#a1824a" />
        <rect x="16" y="2" width="46" height="15" rx="3" fill="#e2c48d" />
        <rect x="60" y="7" width="30" height="5" rx="1.5" fill="url(#gunmerge-steel)" />
        <rect x="88" y="5" width="6" height="9" rx="1.5" fill="#334155" />
        <path d="M26 2 L29 -6 L50 -6 L52 2" fill="none" strokeWidth="4" />
        <path d="M26 2 L29 -6 L50 -6 L52 2" fill="none" stroke="#d6b37a" strokeWidth="2" />
        <line x1="20" y1="6" x2="58" y2="6" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.4" />
        <path d="M96 9 L110 3 L106 9 L110 15 Z" fill="#fde047" stroke="none" />
      </g>
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <line x1="24" y1="104" x2="34" y2="98" />
        <line x1="96" y1="104" x2="86" y2="98" />
        <line x1="60" y1="112" x2="60" y2="106" />
      </g>
    </svg>
  )
}
