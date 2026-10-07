/** Tank Arena cover: a green tank firing at a crowned slime boss. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Tank Arena">
      <defs>
        <linearGradient id="tank-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#566235" />
          <stop offset="1" stopColor="#2a3119" />
        </linearGradient>
        <linearGradient id="tank-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bc046" />
          <stop offset="1" stopColor="#4d6b17" />
        </linearGradient>
        <radialGradient id="tank-slime" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#831843" />
        </radialGradient>
        <linearGradient id="tank-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
        <radialGradient id="tank-flash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.5" stopColor="#fde047" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#tank-bg)" />
      <g fill="#000" opacity="0.1">
        <rect x="0" y="0" width="30" height="30" />
        <rect x="60" y="0" width="30" height="30" />
        <rect x="30" y="30" width="30" height="30" />
        <rect x="90" y="30" width="30" height="30" />
        <rect x="0" y="60" width="30" height="30" />
        <rect x="60" y="60" width="30" height="30" />
        <rect x="30" y="90" width="30" height="30" />
        <rect x="90" y="90" width="30" height="30" />
      </g>
      {/* boss slime */}
      <ellipse cx="82" cy="52" rx="24" ry="7" fill="#000" opacity="0.25" />
      <path d="M68 22 q-8 -6 -6 -14 l7 10 z M96 22 q8 -6 6 -14 l-7 10 z" fill="#f5f5f4" />
      <ellipse cx="82" cy="36" rx="22" ry="19" fill="url(#tank-slime)" />
      <ellipse cx="73" cy="27" rx="6" ry="3" fill="#fff" opacity="0.4" transform="rotate(-30 73 27)" />
      <circle cx="75" cy="38" r="4.5" fill="#fff" />
      <circle cx="88" cy="38" r="4.5" fill="#fff" />
      <circle cx="74" cy="39.5" r="2.2" fill="#111" />
      <circle cx="87" cy="39.5" r="2.2" fill="#111" />
      <path d="M70 32 l9 3 M93 32 l-9 3" stroke="#4a044e" strokeWidth="2" strokeLinecap="round" />
      <path d="M71 18 l-2 -11 7 6 6 -10 6 10 7 -6 -2 11 z" fill="url(#tank-crown)" stroke="#713f12" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="82" cy="14" r="1.8" fill="#dc2626" />
      {/* shell + hit */}
      <circle cx="66" cy="50" r="10" fill="url(#tank-flash)" />
      <path d="M44 72 L60 56" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
      {/* small slime */}
      <circle cx="20" cy="30" r="9" fill="#4ade80" />
      <circle cx="18" cy="29" r="2.2" fill="#fff" />
      <circle cx="23" cy="29" r="2.2" fill="#fff" />
      {/* tank */}
      <g transform="translate(36 86) rotate(-45)">
        <ellipse cx="3" cy="4" rx="24" ry="20" fill="#000" opacity="0.3" />
        <rect x="-21" y="-19" width="42" height="9" rx="2" fill="#1f2414" />
        <rect x="-21" y="10" width="42" height="9" rx="2" fill="#1f2414" />
        <g fill="#4b5232">
          <rect x="-17" y="-19" width="2.5" height="9" />
          <rect x="-9" y="-19" width="2.5" height="9" />
          <rect x="-1" y="-19" width="2.5" height="9" />
          <rect x="7" y="-19" width="2.5" height="9" />
          <rect x="15" y="-19" width="2.5" height="9" />
          <rect x="-17" y="10" width="2.5" height="9" />
          <rect x="-9" y="10" width="2.5" height="9" />
          <rect x="-1" y="10" width="2.5" height="9" />
          <rect x="7" y="10" width="2.5" height="9" />
          <rect x="15" y="10" width="2.5" height="9" />
        </g>
        <rect x="-18" y="-12" width="36" height="24" rx="6" fill="url(#tank-hull)" stroke="#bcd97a" strokeWidth="1.5" />
        <rect x="4" y="-4" width="28" height="8" fill="#4d6b17" />
        <rect x="30" y="-5.5" width="6" height="11" fill="#334a0c" />
        <circle cx="0" cy="0" r="11" fill="#556b2f" stroke="#bcd97a" strokeWidth="1.5" />
        <circle cx="-2" cy="0" r="4" fill="#2f3d10" />
      </g>
    </svg>
  )
}
