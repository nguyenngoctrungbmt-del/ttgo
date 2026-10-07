/** Face Names cover: three party guests, the middle one wearing a big name tag. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Face Names">
      <defs>
        <linearGradient id="faces-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
        <radialGradient id="faces-skin1" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fde3c8" />
          <stop offset="1" stopColor="#e4ae80" />
        </radialGradient>
        <radialGradient id="faces-skin2" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#c68456" />
          <stop offset="1" stopColor="#8d5a3b" />
        </radialGradient>
        <radialGradient id="faces-spot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#faces-bg)" />
      {/* bunting */}
      <path d="M0 14 Q60 30 120 14" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.8" />
      {[12, 30, 48, 66, 84, 102].map((x, i) => (
        <path key={x} d={`M${x - 6} ${16 + Math.sin((x / 120) * Math.PI) * 7} l12 0 l-6 10 z`} fill={['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899'][i]} />
      ))}
      <circle cx="60" cy="62" r="40" fill="url(#faces-spot)" />
      {/* left guest */}
      <g transform="translate(26 70)">
        <path d="M-17 34 Q-17 20 -5 18 L5 18 Q17 20 17 34 Z" fill="#3b82f6" />
        <circle r="14" fill="url(#faces-skin2)" />
        <path d="M-14 -2 C-15 -18 15 -18 14 -2 Q8 -10 0 -10 Q-8 -10 -14 -2 Z" fill="#1f1a17" />
        <circle cx="-5" cy="1" r="1.8" fill="#1f2937" />
        <circle cx="5" cy="1" r="1.8" fill="#1f2937" />
        <path d="M-4 7 Q0 10 4 7" stroke="#7f1d1d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
      {/* right guest */}
      <g transform="translate(94 70)">
        <path d="M-17 34 Q-17 20 -5 18 L5 18 Q17 20 17 34 Z" fill="#22c55e" />
        <path d="M-15 -4 Q-17 14 -12 18 L12 18 Q17 14 15 -4 Z" fill="#b23a1e" />
        <circle r="14" fill="url(#faces-skin1)" />
        <path d="M-15 0 C-16 -19 16 -19 15 0 L12 -4 Q4 -7 -2 -10 Q-8 -5 -12 -4 Z" fill="#b23a1e" />
        <circle cx="-5" cy="1" r="4" fill="none" stroke="#334155" strokeWidth="1.5" />
        <circle cx="5" cy="1" r="4" fill="none" stroke="#334155" strokeWidth="1.5" />
        <circle cx="-5" cy="1" r="1.5" fill="#1f2937" />
        <circle cx="5" cy="1" r="1.5" fill="#1f2937" />
        <path d="M-4 8 Q0 11 4 8" stroke="#7f1d1d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
      {/* centre guest */}
      <g transform="translate(60 56)">
        <path d="M-24 50 Q-24 28 -8 25 L8 25 Q24 28 24 50 Z" fill="#ef4444" />
        <circle r="20" fill="url(#faces-skin1)" stroke="#78350f" strokeOpacity="0.4" strokeWidth="1" />
        <path d="M-20 -2 C-21 -26 21 -26 20 -2 Q10 -13 0 -13 Q-10 -13 -20 -2 Z" fill="#4a2c1a" />
        <path d="M-9 -1 a3 3 0 0 1 6 0" stroke="#1f2937" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M3 -1 a3 3 0 0 1 6 0" stroke="#1f2937" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M-7 8 Q0 16 7 8 Z" fill="#7f1d1d" />
        <ellipse cx="-11" cy="5" rx="3.5" ry="2" fill="#f472b6" opacity="0.4" />
        <ellipse cx="11" cy="5" rx="3.5" ry="2" fill="#f472b6" opacity="0.4" />
        {/* name tag */}
        <rect x="-15" y="30" width="30" height="16" rx="4" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
        <rect x="-10" y="35" width="20" height="2.5" rx="1" fill="#92400e" />
        <rect x="-10" y="40" width="13" height="2" rx="1" fill="#92400e" opacity="0.6" />
      </g>
    </svg>
  )
}
