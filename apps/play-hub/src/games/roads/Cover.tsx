/** Road Rush cover: coloured houses and workplaces linked by roads, cars on the move. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Road Rush">
      <defs>
        <linearGradient id="roads-grass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bef264" />
          <stop offset="1" stopColor="#65a30d" />
        </linearGradient>
        <linearGradient id="roads-work" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="roads-work2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#roads-grass)" />
      <path d="M88 0 Q80 40 96 70 T90 120 H110 Q100 90 112 60 T108 0 Z" fill="#38bdf8" />
      {/* roads */}
      <g stroke="#1f2937" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M22 30 V82 H70 V34 H100" />
      </g>
      <g stroke="#64748b" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M22 30 V82 H70 V34 H100" />
      </g>
      <rect x="88" y="29" width="14" height="10" fill="#a16207" />
      <path d="M22 40 V48 M22 58 V66 M34 82 H42 M52 82 H60 M70 70 V62" stroke="#fde68a" strokeWidth="1.4" />
      {/* workplaces */}
      <rect x="96" y="20" width="20" height="20" rx="4" fill="url(#roads-work)" />
      <g fill="#ffffff" opacity="0.85">
        <rect x="99" y="25" width="4" height="3" />
        <rect x="105" y="25" width="4" height="3" />
        <rect x="111" y="25" width="3" height="3" />
        <rect x="99" y="31" width="4" height="3" />
        <rect x="105" y="31" width="4" height="3" />
      </g>
      <rect x="10" y="90" width="22" height="22" rx="4" fill="url(#roads-work2)" />
      <g fill="#ffffff">
        <circle cx="104" cy="14" r="2.4" />
        <circle cx="110" cy="15" r="2.4" />
        <circle cx="98" cy="15" r="2.4" />
      </g>
      {/* houses */}
      <g>
        <rect x="12" y="20" width="14" height="10" fill="#f8fafc" />
        <path d="M10 21 L19 12 L28 21 Z" fill="#3b82f6" />
      </g>
      <g>
        <rect x="56" y="88" width="14" height="10" fill="#f8fafc" />
        <path d="M54 89 L63 80 L72 89 Z" fill="#ef4444" />
      </g>
      {/* cars */}
      <rect x="18" y="52" width="8" height="12" rx="2" fill="#3b82f6" />
      <rect x="19.5" y="54" width="5" height="3" fill="#ffffff" opacity="0.8" />
      <rect x="40" y="78" width="12" height="8" rx="2" fill="#ef4444" />
      <rect x="47" y="79.5" width="3" height="5" fill="#ffffff" opacity="0.8" />
      <rect x="76" y="30" width="12" height="8" rx="2" fill="#3b82f6" />
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
        <line x1="30" y1="79" x2="36" y2="79" />
        <line x1="31" y1="85" x2="36" y2="85" />
      </g>
      {/* overflow ring */}
      <circle cx="106" cy="30" r="15" fill="none" stroke="#ef4444" strokeWidth="2.4" strokeDasharray="60 100" transform="rotate(-90 106 30)" />
    </svg>
  )
}
