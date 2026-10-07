/** Crane Tower cover: a crane swinging a floor onto a bright tower at sunset. */
export default function Cover() {
  const floors = [
    { y: 96, w: 50, c: '#e76f51', d: '#9c3d26' },
    { y: 84, w: 50, c: '#2a9d8f', d: '#1d6b62' },
    { y: 72, w: 46, c: '#e9c46a', d: '#a8862f' },
    { y: 60, w: 46, c: '#7fb8d8', d: '#41799a' },
  ]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Crane Tower">
      <defs>
        <linearGradient id="crane-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d8fd6" />
          <stop offset="0.6" stopColor="#f6a96b" />
          <stop offset="1" stopColor="#ffd59e" />
        </linearGradient>
        <radialGradient id="crane-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="1" stopColor="#fff7c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="crane-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#crane-sky)" />
      <circle cx="92" cy="70" r="26" fill="url(#crane-sun)" />
      <circle cx="92" cy="70" r="9" fill="#fff7c2" />
      <g fill="#6ea7cc" opacity="0.7">
        <rect x="4" y="82" width="14" height="40" />
        <rect x="20" y="90" width="12" height="30" />
        <rect x="88" y="86" width="14" height="34" />
        <rect x="104" y="78" width="12" height="42" />
      </g>
      {/* jib */}
      <rect x="-2" y="10" width="124" height="3" fill="#f59e0b" />
      <rect x="-2" y="20" width="124" height="3" fill="#f59e0b" />
      <path d="M0 12 L6 22 L12 12 L18 22 L24 12 L30 22 L36 12 L42 22 L48 12 L54 22 L60 12 L66 22 L72 12 L78 22 L84 12 L90 22 L96 12 L102 22 L108 12 L114 22 L120 12" stroke="#d97706" strokeWidth="1.6" fill="none" />
      <rect x="62" y="19" width="14" height="7" rx="1.5" fill="#374151" />
      <line x1="69" y1="26" x2="76" y2="40" stroke="#1f2937" strokeWidth="1.4" />
      <path d="M66 46 L76 40 L86 46" stroke="#1f2937" strokeWidth="1" fill="none" />
      {/* swinging gold floor */}
      <g transform="rotate(-8 76 51)">
        <rect x="56" y="46" width="40" height="11" fill="url(#crane-gold)" />
        <rect x="55" y="45" width="42" height="2" fill="#fef9c3" />
        <rect x="61" y="49" width="5" height="6" fill="#fff7c2" />
        <rect x="70" y="49" width="5" height="6" fill="#fff7c2" />
        <rect x="79" y="49" width="5" height="6" fill="#fff7c2" />
        <rect x="88" y="49" width="5" height="6" fill="#fff7c2" />
      </g>
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="100" y1="44" x2="110" y2="42" />
        <line x1="101" y1="52" x2="113" y2="51" />
      </g>
      {/* tower */}
      <rect x="35" y="108" width="54" height="12" fill="#475569" />
      <rect x="40" y="110" width="44" height="10" fill="#93c5fd" />
      {floors.map((f, i) => (
        <g key={i}>
          <rect x={62 - f.w / 2} y={f.y} width={f.w} height="12" fill={f.c} />
          <rect x={62 - f.w / 2} y={f.y + 10} width={f.w} height="2" fill={f.d} />
          <rect x={61 - f.w / 2} y={f.y} width={f.w + 2} height="1.6" fill="#ffffff" opacity="0.6" />
          {[0, 1, 2, 3].map((j) => (
            <rect key={j} x={62 - f.w / 2 + 5 + j * ((f.w - 10) / 4)} y={f.y + 3.5} width="5" height="6" fill={(i + j) % 3 === 0 ? '#1e293b' : '#fde68a'} />
          ))}
        </g>
      ))}
      <g fill="#fde047">
        <path d="M44 54 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 Z" />
        <path d="M30 70 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1 Z" />
      </g>
    </svg>
  )
}
