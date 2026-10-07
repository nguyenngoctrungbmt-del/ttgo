/** Hexa Sort cover: coloured hex stacks with tiles flipping between them. */
export default function Cover() {
  const slab = (x: number, y: number, top: string, side: string) => (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 0 L-7 6 L7 6 L14 0 L14 4 L7 10 L-7 10 L-14 4 Z" fill={side} />
      <path d="M-14 0 L-7 -6 L7 -6 L14 0 L7 6 L-7 6 Z" fill={top} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
    </g>
  )
  const stack = (x: number, y: number, n: number, top: string, side: string) => Array.from({ length: n }, (_, i) => <g key={i}>{slab(x, y - i * 4.5, top, side)}</g>)
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Hexa Sort">
      <defs>
        <linearGradient id="hexsort-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e7490" />
          <stop offset="1" stopColor="#083344" />
        </linearGradient>
        <radialGradient id="hexsort-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#hexsort-bg)" />
      <g fill="none" stroke="#a5f3fc" strokeOpacity="0.25" strokeWidth="1.5">
        <circle cx="18" cy="22" r="3" />
        <circle cx="104" cy="96" r="4" />
        <circle cx="98" cy="16" r="2" />
      </g>
      <path d="M24 92 L40 80 L80 80 L96 92 L80 104 L40 104 Z" fill="#082f49" opacity="0.6" />
      {stack(40, 92, 5, '#60a5fa', '#2563eb')}
      {stack(80, 92, 3, '#f87171', '#dc2626')}
      <circle cx="60" cy="58" r="26" fill="url(#hexsort-glow)" />
      {stack(60, 78, 9, '#fde047', '#eab308')}
      {/* flipping tile */}
      <g transform="translate(86 42) rotate(-25)">
        <path d="M-12 0 L-6 -3 L6 -3 L12 0 L6 3 L-6 3 Z" fill="#fde047" />
        <path d="M-12 0 L-6 3 L6 3 L12 0 L12 2.5 L6 5.5 L-6 5.5 L-12 2.5 Z" fill="#eab308" />
      </g>
      <path d="M84 70 q8 -18 -6 -26" stroke="#fef9c3" strokeWidth="2" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      <g fill="#fef9c3">
        <path d="M60 30 l2 4 4 1 -4 1 -2 4 -2 -4 -4 -1 4 -1 Z" />
        <path d="M30 50 l1.5 3 3 1 -3 1 -1.5 3 -1.5 -3 -3 -1 3 -1 Z" />
      </g>
    </svg>
  )
}
