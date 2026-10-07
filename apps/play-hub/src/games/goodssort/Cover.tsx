/** Goods Sort cover: a wooden shelf with three soda cans popping, goods behind. */
export default function Cover() {
  const can = (x: number, y: number, s = 1, dim = false) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={dim ? 0.55 : 1}>
      <rect x="-8" y="-24" width="16" height="26" rx="3" fill="url(#goodssort-can)" stroke="#172554" strokeWidth="1.2" />
      <path d="M-8 -8 C-3 -12 3 -4 8 -9 L8 -5 C3 0 -3 -8 -8 -4 Z" fill="#f8fafc" />
      <rect x="-7" y="-26" width="14" height="3" rx="1.2" fill="#e2e8f0" />
      <rect x="-5" y="-21" width="2" height="16" rx="1" fill="#fff" opacity="0.55" />
    </g>
  )
  const jar = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`} opacity="0.55">
      <rect x="-8" y="-18" width="16" height="20" rx="3" fill="#dc2626" />
      <rect x="-9" y="-23" width="18" height="6" rx="2" fill="#fff" />
      <rect x="-6" y="-12" width="12" height="7" rx="1.5" fill="#fef3c7" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Goods Sort">
      <defs>
        <linearGradient id="goodssort-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#3b0764" />
        </linearGradient>
        <linearGradient id="goodssort-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d3b1c" />
          <stop offset="1" stopColor="#3f1f0d" />
        </linearGradient>
        <linearGradient id="goodssort-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="goodssort-can" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.6" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="goodssort-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#goodssort-bg)" />
      <rect x="12" y="34" width="96" height="58" rx="8" fill="url(#goodssort-back)" />
      {jar(30, 64)}
      {jar(90, 64)}
      <circle cx="60" cy="68" r="34" fill="url(#goodssort-glow)" />
      {can(34, 86, 1.25)}
      {can(60, 80, 1.4)}
      {can(86, 86, 1.25)}
      <rect x="8" y="86" width="104" height="12" rx="4" fill="url(#goodssort-lip)" />
      <rect x="12" y="87.5" width="96" height="2" fill="#fff" opacity="0.5" />
      <g fill="#fef9c3">
        <path d="M60 20 l2.5 5 5 1.5 -5 1.5 -2.5 5 -2.5 -5 -5 -1.5 5 -1.5 Z" />
        <path d="M24 26 l1.5 3 3 1 -3 1 -1.5 3 -1.5 -3 -3 -1 3 -1 Z" />
        <path d="M96 24 l1.5 3 3 1 -3 1 -1.5 3 -1.5 -3 -3 -1 3 -1 Z" />
      </g>
      <g stroke="#fde047" strokeWidth="2.4" strokeLinecap="round">
        <path d="M42 46 l-5 -6" />
        <path d="M60 40 v-7" />
        <path d="M78 46 l5 -6" />
      </g>
    </svg>
  )
}
