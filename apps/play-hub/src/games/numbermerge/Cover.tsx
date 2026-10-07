/** Number Merge cover: two blocks sliding into a glowing doubled block. Digits are drawn as stroked paths. */
const DIGIT: Record<string, string> = {
  '2': 'M1 3Q1 0 5 0Q9 0 9 4Q9 6 1 14H9',
  '3': 'M1 1H9L5 6Q9 6 9 10Q9 14 5 14Q2 14 1 12',
  '4': 'M7 14V0L1 10H10',
  '6': 'M8 1Q2 2 1 9Q1 14 5 14Q9 14 9 10Q9 6 5 6Q2 6 1 9',
}

function Digits({ text, dark }: { text: string; dark: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <g key={i} transform={`translate(${i * 12} 0)`}>
          <path d={DIGIT[ch]} stroke={dark} strokeWidth="5.5" />
          <path d={DIGIT[ch]} stroke="#fff" strokeWidth="2.8" />
        </g>
      ))}
    </>
  )
}

export default function Cover() {
  const block = (x: number, y: number, s: number, light: string, base: string, dark: string, text: string, id: string) => {
    const k = s / 40
    return (
      <g transform={`translate(${x} ${y})`}>
        <defs>
          <linearGradient id={`numbermerge-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.6" stopColor={base} />
          </linearGradient>
        </defs>
        <rect x="2" y={s * 0.12} width={s} height={s} rx={s * 0.2} fill="#000" opacity="0.28" />
        <rect y={s * 0.09} width={s} height={s * 0.91} rx={s * 0.2} fill={dark} />
        <rect width={s} height={s * 0.91} rx={s * 0.2} fill={`url(#numbermerge-${id})`} />
        <rect x={s * 0.1} y={s * 0.06} width={s * 0.8} height={s * 0.2} rx={s * 0.1} fill="#fff" opacity="0.32" />
        <g transform={`translate(${s / 2 - 10.5 * k} ${s * 0.45 - 7 * k}) scale(${k})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Digits text={text} dark={dark} />
        </g>
      </g>
    )
  }
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Number Merge">
      <defs>
        <linearGradient id="numbermerge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="numbermerge-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#numbermerge-bg)" />
      <g fill="#c7d2fe" opacity="0.18">
        <rect x="10" y="84" width="22" height="22" rx="5" />
        <rect x="88" y="84" width="22" height="22" rx="5" />
        <rect x="49" y="90" width="22" height="22" rx="5" />
      </g>
      <circle cx="60" cy="48" r="40" fill="url(#numbermerge-glow)" />
      <path d="M8 66 h10 M10 72 h8" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" />
      <path d="M102 66 h10 M102 72 h8" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" />
      {block(14, 54, 28, '#fca5a5', '#ef4444', '#991b1b', '32', 'a')}
      {block(78, 54, 28, '#fca5a5', '#ef4444', '#991b1b', '32', 'b')}
      {block(34, 16, 52, '#f9a8d4', '#ec4899', '#9d174d', '64', 'c')}
      <g fill="#fef9c3">
        <path d="M98 16 l2 4 4 1.5 -4 1.5 -2 4 -2 -4 -4 -1.5 4 -1.5 Z" />
        <path d="M20 24 l1.5 3 3 1 -3 1 -1.5 3 -1.5 -3 -3 -1 3 -1 Z" />
      </g>
    </svg>
  )
}
