/** Boxing Champ cover: a glove landing a star punch on a dazed rival. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Boxing Champ">
      <defs>
        <radialGradient id="boxing-bg" cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="1" stopColor="#0b0613" />
        </radialGradient>
        <radialGradient id="boxing-glove" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="boxing-skin" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f5d0a9" />
          <stop offset="1" stopColor="#b9874f" />
        </radialGradient>
        <radialGradient id="boxing-flash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#boxing-bg)" />
      {/* ropes */}
      <path d="M0 70 Q60 76 120 70" stroke="#ef4444" strokeWidth="3" fill="none" />
      <path d="M0 82 Q60 88 120 82" stroke="#f8fafc" strokeWidth="3" fill="none" />
      {/* rival */}
      <path d="M44 120 L50 78 Q66 72 82 78 L88 120 Z" fill="url(#boxing-skin)" />
      <ellipse cx="66" cy="52" rx="19" ry="21" fill="url(#boxing-skin)" />
      <path d="M48 42 Q66 26 84 42 Q78 34 66 33 Q54 34 48 42 Z" fill="#111827" />
      {/* dazed eyes */}
      <g stroke="#111827" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M56 50 l5 5 M61 50 l-5 5" />
        <path d="M71 50 l5 5 M76 50 l-5 5" />
      </g>
      <ellipse cx="66" cy="64" rx="4" ry="3.5" fill="#450a0a" />
      {/* stars circling */}
      <g fill="#fde047">
        <path d="M44 30 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" />
        <path d="M88 26 l1.6 3.2 3.4 .4 -2.5 2.4 .7 3.4 -3.2 -1.7 -3.2 1.7 .7 -3.4 -2.5 -2.4 3.4 -.4z" />
      </g>
      {/* impact flash + glove */}
      <circle cx="46" cy="62" r="24" fill="url(#boxing-flash)" />
      <g transform="rotate(-25 34 82)">
        <rect x="14" y="92" width="22" height="30" rx="6" fill="#d4a373" />
        <rect x="14" y="88" width="24" height="9" rx="3" fill="#f8fafc" />
        <ellipse cx="28" cy="72" rx="20" ry="21" fill="url(#boxing-glove)" />
        <ellipse cx="44" cy="76" rx="7" ry="10" fill="#dc2626" transform="rotate(-20 44 76)" />
        <path d="M17 66 Q28 58 39 66" stroke="#7f1d1d" strokeWidth="2" fill="none" />
      </g>
      <g stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round">
        <line x1="22" y1="46" x2="30" y2="52" />
        <line x1="16" y1="58" x2="26" y2="60" />
        <line x1="34" y1="38" x2="38" y2="46" />
      </g>
    </svg>
  )
}
