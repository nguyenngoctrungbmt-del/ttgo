/** Block Blitz cover: a glossy stack with a T piece slamming down. */
const B = ({ x, y, c, l, d }: { x: number; y: number; c: string; l: string; d: string }) => (
  <g>
    <rect x={x} y={y} width="17" height="17" rx="3.5" fill={d} />
    <rect x={x + 1.2} y={y + 1.2} width="14.6" height="13.6" rx="3" fill={c} />
    <rect x={x + 3} y={y + 2} width="11" height="3" rx="1.5" fill={l} opacity="0.75" />
  </g>
)

const CY = { c: '#22d3ee', l: '#ecfeff', d: '#0e7490' }
const YE = { c: '#facc15', l: '#fef9c3', d: '#a16207' }
const PU = { c: '#a855f7', l: '#f3e8ff', d: '#6b21a8' }
const GR = { c: '#22c55e', l: '#dcfce7', d: '#15803d' }
const RE = { c: '#ef4444', l: '#fee2e2', d: '#991b1b' }
const BL = { c: '#3b82f6', l: '#dbeafe', d: '#1e40af' }
const OR = { c: '#f97316', l: '#ffedd5', d: '#c2410c' }

export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Block Blitz">
      <defs>
        <linearGradient id="blocks-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="blocks-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a5b4fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a5b4fc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#blocks-bg)" />
      <circle cx="60" cy="40" r="44" fill="url(#blocks-glow)" />
      {/* motion streaks */}
      <g stroke="#e0e7ff" strokeWidth="2.4" strokeLinecap="round" opacity="0.55">
        <line x1="43" y1="6" x2="43" y2="18" />
        <line x1="60" y1="2" x2="60" y2="16" />
        <line x1="77" y1="6" x2="77" y2="18" />
      </g>
      {/* falling T */}
      <B x={34.5} y={22} {...PU} />
      <B x={51.5} y={22} {...PU} />
      <B x={68.5} y={22} {...PU} />
      <B x={51.5} y={39} {...PU} />
      {/* stack */}
      <B x={9} y={84} {...BL} />
      <B x={9} y={67} {...BL} />
      <B x={26} y={84} {...BL} />
      <B x={43} y={84} {...GR} />
      <B x={43} y={67} {...GR} />
      <B x={60} y={84} {...YE} />
      <B x={77} y={84} {...YE} />
      <B x={77} y={67} {...RE} />
      <B x={94} y={84} {...RE} />
      <B x={94} y={67} {...OR} />
      <B x={94} y={50} {...OR} />
      <B x={26} y={67} {...CY} />
      {/* clearing flash */}
      <rect x="6" y="101" width="108" height="6" rx="3" fill="#fff" opacity="0.9" />
      <circle cx="60" cy="104" r="9" fill="#fff" opacity="0.35" />
      <path d="M85 60 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z" fill="#fef9c3" />
    </svg>
  )
}
