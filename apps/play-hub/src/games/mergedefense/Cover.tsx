/** Merge Defenders cover: an archer and a mage merging in a burst while a slime marches past. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Merge Defenders">
      <defs>
        <linearGradient id="mergedefense-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.35" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <radialGradient id="mergedefense-slime" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bbf7d0" />
          <stop offset="0.55" stopColor="#84cc16" />
          <stop offset="1" stopColor="#365314" />
        </radialGradient>
        <radialGradient id="mergedefense-burst" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef9c3" stopOpacity="1" />
          <stop offset="0.6" stopColor="#fde047" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mergedefense-robe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#mergedefense-bg)" />
      {/* road */}
      <path d="M-4 40 H124" stroke="#78350f" strokeWidth="16" />
      <path d="M-4 40 H124" stroke="#d6a46b" strokeWidth="12" />
      {/* slime enemy */}
      <g transform="translate(92 38)">
        <path d="M-10 7 Q-11 -10 0 -10 Q11 -10 10 7 Q0 10 -10 7 Z" fill="url(#mergedefense-slime)" />
        <circle cx="-3.5" cy="-2" r="2.6" fill="#fff" />
        <circle cx="3.5" cy="-2" r="2.6" fill="#fff" />
        <circle cx="-3" cy="-1.6" r="1.4" fill="#111827" />
        <circle cx="4" cy="-1.6" r="1.4" fill="#111827" />
        <path d="M-6 -6 L-1 -4 M6 -6 L1 -4" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {/* arrow streak */}
      <path d="M30 60 L80 42" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <path d="M80 42 l-5 0 l2 4 Z" fill="#fff" />
      {/* merge burst */}
      <circle cx="60" cy="84" r="30" fill="url(#mergedefense-burst)" />
      {/* pedestal */}
      <ellipse cx="60" cy="102" rx="22" ry="6" fill="#a16207" />
      <ellipse cx="60" cy="99" rx="22" ry="5.5" fill="#fde047" />
      {/* mage hero */}
      <path d="M48 98 Q50 80 60 80 Q70 80 72 98 Z" fill="url(#mergedefense-robe)" />
      <circle cx="60" cy="76" r="8" fill="#fde4c8" />
      <circle cx="57" cy="76" r="1.6" fill="#111827" />
      <circle cx="63" cy="76" r="1.6" fill="#111827" />
      <path d="M49 71 H71 L62 50 Z" fill="#4338ca" />
      <path d="M61 58 l1.2 2.4 2.6 0.4 -1.9 1.8 0.5 2.6 -2.4 -1.3 -2.4 1.3 0.5 -2.6 -1.9 -1.8 2.6 -0.4 Z" fill="#fde047" />
      <path d="M53 49 L56 45 L59 49 L62 44 L65 49 L68 45 L70 50 L52 50 Z" fill="#fde047" stroke="#a16207" strokeWidth="0.8" />
      {/* merging ghosts */}
      <circle cx="30" cy="86" r="7" fill="#4ade80" opacity="0.7" />
      <circle cx="90" cy="86" r="7" fill="#818cf8" opacity="0.7" />
      <path d="M38 86 h8 M74 86 h8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <g fill="#fff">
        <path d="M84 66 l1.5 3 3 1 -3 1 -1.5 3 -1.5 -3 -3 -1 3 -1 Z" />
        <path d="M34 66 l1.2 2.4 2.4 0.8 -2.4 0.8 -1.2 2.4 -1.2 -2.4 -2.4 -0.8 2.4 -0.8 Z" />
      </g>
    </svg>
  )
}
