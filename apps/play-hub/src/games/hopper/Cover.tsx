/** Road Hopper cover: a frog mid-hop over a road lane, a car rushing past, a river ahead. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Road Hopper">
      <defs>
        <linearGradient id="hopper-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0284c7" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="hopper-frog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
        <clipPath id="hopper-clip">
          <rect width="120" height="120" rx="26" />
        </clipPath>
      </defs>
      <g clipPath="url(#hopper-clip)">
        <rect width="120" height="120" fill="#84cc4f" />
        {/* river */}
        <rect y="0" width="120" height="30" fill="url(#hopper-water)" />
        <path d="M10 12 q5 -3 10 0 M60 20 q5 -3 10 0 M92 9 q5 -3 10 0" stroke="#e0f2fe" strokeWidth="2" fill="none" opacity="0.7" />
        <rect x="64" y="10" width="44" height="12" rx="2" fill="#a16207" />
        <rect x="64" y="20" width="44" height="3" fill="#713f12" />
        {/* grass strip with tree */}
        <rect y="30" width="120" height="26" fill="#8fd65a" />
        <rect x="14" y="40" width="5" height="10" fill="#92400e" />
        <rect x="6" y="26" width="22" height="16" fill="#16a34a" />
        <rect x="8" y="22" width="20" height="10" fill="#4ade80" />
        {/* road */}
        <rect y="56" width="120" height="38" fill="#4b5563" />
        <g fill="#f8fafc" opacity="0.8">
          <rect x="4" y="74" width="14" height="3" />
          <rect x="30" y="74" width="14" height="3" />
          <rect x="82" y="74" width="14" height="3" />
          <rect x="108" y="74" width="14" height="3" />
        </g>
        {/* car */}
        <ellipse cx="90" cy="92" rx="22" ry="4" fill="#000" opacity="0.25" />
        <rect x="70" y="76" width="40" height="14" fill="#b91c1c" />
        <rect x="70" y="72" width="40" height="6" fill="#ef4444" />
        <rect x="80" y="64" width="22" height="10" fill="#f87171" />
        <rect x="83" y="66" width="16" height="4" fill="#bae6fd" />
        <circle cx="78" cy="90" r="4" fill="#111827" />
        <circle cx="102" cy="90" r="4" fill="#111827" />
        <rect x="66" y="80" width="4" height="4" fill="#fef08a" />
        <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
          <line x1="114" y1="70" x2="122" y2="70" />
          <line x1="112" y1="80" x2="122" y2="80" />
        </g>
        <rect y="94" width="120" height="26" fill="#84cc4f" />
        {/* frog mid-hop */}
        <ellipse cx="44" cy="100" rx="13" ry="4" fill="#000" opacity="0.25" />
        <g transform="translate(44 66)">
          <rect x="-15" y="8" width="7" height="6" fill="#16a34a" />
          <rect x="8" y="8" width="7" height="6" fill="#16a34a" />
          <rect x="-12" y="-6" width="24" height="18" rx="3" fill="#15803d" />
          <rect x="-11" y="-10" width="24" height="16" rx="3" fill="url(#hopper-frog)" />
          <rect x="-5" y="2" width="12" height="5" rx="2" fill="#d9f99d" />
          <circle cx="-5" cy="-11" r="5.5" fill="#4ade80" />
          <circle cx="7" cy="-11" r="5.5" fill="#4ade80" />
          <circle cx="-5" cy="-12" r="4" fill="#fff" />
          <circle cx="7" cy="-12" r="4" fill="#fff" />
          <circle cx="-4" cy="-13" r="2" fill="#111827" />
          <circle cx="8" cy="-13" r="2" fill="#111827" />
          <circle cx="-7" cy="1" r="1.8" fill="#f9a8d4" />
          <circle cx="11" cy="1" r="1.8" fill="#f9a8d4" />
        </g>
        <path d="M30 96 Q36 82 40 80" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
        {/* coin */}
        <circle cx="22" cy="106" r="6" fill="#b45309" />
        <circle cx="21" cy="105" r="5" fill="#fde047" />
      </g>
    </svg>
  )
}
