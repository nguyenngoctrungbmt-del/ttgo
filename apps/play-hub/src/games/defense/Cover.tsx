/** City Shield cover: interceptors bursting over a night skyline as missiles rain down. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="City Shield">
      <defs>
        <linearGradient id="defense-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020617" />
          <stop offset="0.65" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
        <radialGradient id="defense-blast" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#fde047" />
          <stop offset="0.8" stopColor="#f97316" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="defense-trail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f87171" stopOpacity="0" />
          <stop offset="1" stopColor="#f87171" />
        </linearGradient>
        <linearGradient id="defense-shot" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7dd3fc" stopOpacity="0" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#defense-sky)" />
      <g fill="#e0e7ff" opacity="0.7">
        <circle cx="16" cy="18" r="0.9" />
        <circle cx="40" cy="10" r="0.7" />
        <circle cx="98" cy="22" r="0.9" />
        <circle cx="76" cy="8" r="0.7" />
        <circle cx="108" cy="44" r="0.7" />
      </g>
      {/* incoming missiles */}
      <path d="M14 0 L44 46" stroke="url(#defense-trail)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M104 0 L86 34" stroke="url(#defense-trail)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M70 0 L76 26" stroke="url(#defense-trail)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="86" cy="34" r="3" fill="#fecaca" />
      <circle cx="76" cy="26" r="2.5" fill="#fecaca" />
      {/* interceptor trails and blasts */}
      <path d="M60 96 L46 48" stroke="url(#defense-shot)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M100 98 L92 62" stroke="url(#defense-shot)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="46" r="20" fill="url(#defense-blast)" />
      <circle cx="62" cy="34" r="11" fill="url(#defense-blast)" />
      <circle cx="92" cy="60" r="13" fill="url(#defense-blast)" />
      <circle cx="46" cy="46" r="23" fill="none" stroke="#fde047" strokeWidth="1.5" opacity="0.5" />
      {/* shield dome */}
      <path d="M8 100 Q60 58 112 100" fill="#7dd3fc" opacity="0.14" stroke="#7dd3fc" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* skyline */}
      <g>
        <rect x="14" y="84" width="9" height="16" fill="#0ea5e9" />
        <rect x="24" y="76" width="9" height="24" fill="#38bdf8" />
        <rect x="34" y="88" width="8" height="12" fill="#0ea5e9" />
        <rect x="74" y="80" width="9" height="20" fill="#38bdf8" />
        <rect x="84" y="86" width="8" height="14" fill="#0ea5e9" />
        <rect x="93" y="78" width="9" height="22" fill="#38bdf8" />
      </g>
      <g fill="#fef08a" opacity="0.85">
        <rect x="27" y="80" width="3" height="2" />
        <rect x="27" y="86" width="3" height="2" />
        <rect x="17" y="88" width="3" height="2" />
        <rect x="77" y="84" width="3" height="2" />
        <rect x="96" y="82" width="3" height="2" />
        <rect x="96" y="88" width="3" height="2" />
      </g>
      {/* battery */}
      <path d="M50 100 L55 90 L65 90 L70 100 Z" fill="#94a3b8" />
      <rect x="58.5" y="84" width="3" height="7" fill="#cbd5e1" />
      <rect x="0" y="100" width="120" height="20" fill="#1c1917" />
      <rect x="0" y="100" width="120" height="2" fill="#57534e" />
    </svg>
  )
}
