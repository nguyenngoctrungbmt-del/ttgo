/** Tiny City cover: a little isometric island town. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Tiny City">
      <defs>
        <linearGradient id="tinycity-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="tinycity-tower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#tinycity-sea)" />
      <path d="M14 24 q6 -3 12 0 M90 100 q6 -3 12 0 M84 18 q5 -3 10 0" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.5" />
      {/* island */}
      <path d="M60 40 L104 62 L60 84 L16 62 Z" fill="#cbd5e1" />
      <path d="M16 62 L60 84 L60 94 L16 72 Z" fill="#92400e" />
      <path d="M104 62 L60 84 L60 94 L104 72 Z" fill="#78350f" />
      <path d="M60 43 L99 62 L60 81 L21 62 Z" fill="#86efac" />
      <path d="M60 52 L82 62 M38 62 L60 72 M49 57 L71 67 M38 62 L60 52 M60 72 L82 62" stroke="#cbd5e1" strokeWidth="1.6" />
      {/* pond */}
      <path d="M72 70 L80 74 L72 78 L64 74 Z" fill="#38bdf8" />
      {/* park */}
      <circle cx="44" cy="66" r="5" fill="#16a34a" />
      <circle cx="50" cy="69" r="4" fill="#22c55e" />
      {/* tower */}
      <path d="M58 30 L66 34 L66 62 L58 66 Z" fill="#312e81" />
      <path d="M50 34 L58 30 L58 66 L50 62 Z" fill="url(#tinycity-tower)" />
      <path d="M50 34 L58 30 L66 34 L58 38 Z" fill="#e0e7ff" />
      <g fill="#fde68a">
        <rect x="52" y="40" width="2.4" height="3" />
        <rect x="52" y="47" width="2.4" height="3" />
        <rect x="52" y="54" width="2.4" height="3" />
        <rect x="61" y="41" width="2.4" height="3" />
        <rect x="61" y="55" width="2.4" height="3" />
      </g>
      {/* house */}
      <path d="M74 56 L84 61 L84 69 L74 64 Z" fill="#f59e0b" />
      <path d="M66 60 L74 56 L74 64 L66 68 Z" fill="#fde68a" />
      <path d="M65 60 L73 50 L85 61 L74 57 Z" fill="#ef4444" />
      <path d="M73 50 L85 61 L84 62 Z" fill="#b91c1c" />
      {/* factory */}
      <path d="M30 52 L40 47 L40 55 L30 60 Z" fill="#9ca3af" />
      <path d="M40 47 L48 51 L48 59 L40 55 Z" fill="#6b7280" />
      <rect x="42" y="38" width="3" height="12" fill="#7f1d1d" />
      <circle cx="45" cy="34" r="3" fill="#e5e7eb" opacity="0.8" />
      <circle cx="49" cy="29" r="4" fill="#e5e7eb" opacity="0.6" />
      {/* car + person */}
      <rect x="57" y="74" width="7" height="3.5" rx="1" fill="#ef4444" transform="rotate(26 60 76)" />
      <circle cx="35" cy="60" r="1.4" fill="#fcd34d" />
      <rect x="34.2" y="61" width="1.8" height="3" fill="#a855f7" />
      <path d="M90 34 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 Z" fill="#fde047" />
    </svg>
  )
}
