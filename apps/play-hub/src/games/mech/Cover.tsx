/** Mech Survivor cover: the little mech blasting a swarm, saws orbiting, gems scattered. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Mech Survivor">
      <defs>
        <radialGradient id="mech-bg" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0" stopColor="#d6b07f" />
          <stop offset="1" stopColor="#7c5a36" />
        </radialGradient>
        <linearGradient id="mech-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.55" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="mech-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <radialGradient id="mech-drone" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.2" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="mech-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#mech-bg)" />
      <g fill="#8a6a48" opacity="0.6">
        <ellipse cx="20" cy="24" rx="10" ry="5" />
        <ellipse cx="98" cy="98" rx="12" ry="6" />
      </g>
      {/* gems */}
      {[
        [24, 88],
        [34, 100],
        [90, 22],
        [104, 60],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 5} l3.5 4 l-3.5 6 l-3.5 -6 z`} fill={i % 2 ? '#4ade80' : '#38bdf8'} stroke="#0c4a6e" strokeWidth="0.8" />
      ))}
      {/* drones */}
      {[
        [92, 40, 9],
        [100, 78, 7],
        [84, 92, 6],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y + r} rx={r} ry={r * 0.35} fill="#000" opacity="0.2" />
          <circle cx={x} cy={y} r={r} fill="url(#mech-drone)" stroke="#4c1d95" strokeWidth="1" />
          <circle cx={x - r * 0.35} cy={y} r={r * 0.3} fill="#f43f5e" />
        </g>
      ))}
      {/* blaster bolts */}
      <g stroke="#7dd3fc" strokeWidth="3.5" strokeLinecap="round">
        <line x1="64" y1="52" x2="76" y2="46" />
        <line x1="70" y1="60" x2="84" y2="62" />
      </g>
      <g stroke="#fff" strokeWidth="1.4" strokeLinecap="round">
        <line x1="65" y1="51.5" x2="75" y2="46.5" />
        <line x1="71" y1="60" x2="83" y2="62" />
      </g>
      <circle cx="92" cy="40" r="11" fill="#fde047" opacity="0.35" />
      {/* orbit ring + saws */}
      <circle cx="50" cy="66" r="30" fill="url(#mech-glow)" />
      <circle cx="50" cy="66" r="27" fill="none" stroke="#fff" strokeOpacity="0.25" strokeDasharray="3 4" />
      {[
        [50, 39],
        [27, 80],
        [74, 78],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 20})`}>
          <path d="M0 -7 L2 -3 L6.5 -3.5 L3.5 0 L6.5 3.5 L2 3 L0 7 L-2 3 L-6.5 3.5 L-3.5 0 L-6.5 -3.5 L-2 -3 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="0.8" />
          <circle r="2" fill="#475569" />
        </g>
      ))}
      {/* mech */}
      <g transform="translate(50 66)">
        <ellipse cx="2" cy="16" rx="18" ry="6" fill="#000" opacity="0.3" />
        <rect x="-10" y="4" width="6" height="10" fill="#334155" />
        <rect x="4" y="4" width="6" height="10" fill="#334155" />
        <rect x="-13" y="12" width="11" height="6" rx="2" fill="#1e293b" />
        <rect x="3" y="12" width="11" height="6" rx="2" fill="#1e293b" />
        <rect x="-18" y="-14" width="9" height="16" rx="3" fill="#475569" />
        <rect x="-13" y="-18" width="26" height="24" rx="8" fill="url(#mech-hull)" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="-13" y="-2" width="26" height="3.5" fill="#f97316" />
        <rect x="-2" y="-15" width="13" height="9" rx="3" fill="url(#mech-glass)" />
        <rect x="0" y="-14" width="5" height="2" fill="#fff" opacity="0.7" />
        <g transform="translate(2 -14) rotate(-20)">
          <rect x="0" y="-4" width="20" height="8" rx="2" fill="#334155" />
          <rect x="17" y="-4" width="4" height="8" fill="#f97316" />
          <circle r="5.5" fill="#64748b" />
        </g>
      </g>
    </svg>
  )
}
