/** Knife Toss cover: a spinning log studded with knives and an apple. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Knife Toss">
      <defs>
        <linearGradient id="knife-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="knife-log" cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#e7b77d" />
          <stop offset="1" stopColor="#b07a45" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#knife-bg)" />
      <circle cx="60" cy="50" r="40" fill="#f59e0b" opacity="0.12" />
      {[-40, 70, 170].map((a) => (
        <g key={a} transform={`rotate(${a} 60 50)`}>
          <rect x="57" y="-6" width="6" height="18" rx="2" fill="#7c2d12" />
          <rect x="55" y="11" width="10" height="2.5" fill="#334155" />
          <path d="M57 13.5 L63 13.5 L60 28 Z" fill="#e2e8f0" />
        </g>
      ))}
      <circle cx="60" cy="50" r="28" fill="#7c4a21" />
      <circle cx="60" cy="50" r="25" fill="url(#knife-log)" />
      <g fill="none" stroke="#9a6236" strokeWidth="1.6" opacity="0.8">
        <circle cx="61" cy="49" r="19" />
        <circle cx="61" cy="49" r="13" />
        <circle cx="61" cy="49" r="7" />
      </g>
      {/* apple on the rim */}
      <circle cx="86" cy="34" r="7" fill="#ef4444" />
      <circle cx="84" cy="32" r="2" fill="#fecaca" />
      <path d="M86 27 q2 -4 5 -3" stroke="#16a34a" strokeWidth="2" fill="none" />
      {/* flying knife */}
      <g transform="translate(60 92)">
        <path d="M-3 -6 L3 -6 L0 -24 Z" fill="#f8fafc" />
        <rect x="-5" y="-7" width="10" height="2.5" fill="#334155" />
        <rect x="-3" y="-4.5" width="6" height="16" rx="2" fill="#9a3412" />
      </g>
      <g stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <line x1="50" y1="100" x2="50" y2="112" />
        <line x1="70" y1="100" x2="70" y2="112" />
      </g>
    </svg>
  )
}
