import type { PerkId } from './DungeonGame'

/** Small vector icons for the chest perk cards. */
export default function PerkIcon({ id }: { id: PerkId }) {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="rgba(0,0,0,0.35)" />
      {id === 'dmg' && (
        <g>
          <path d="M28 6 L34 6 L34 12 L16 30 L10 24 Z" fill="#e2e8f0" />
          <path d="M28 6 L34 6 L17 23 Z" fill="#fff" />
          <path d="M8 22 L18 32" stroke="#fbbf24" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M11 29 L6 34" stroke="#92400e" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M30 20 l3 -2 M33 26 l3 0 M20 8 l0 -3" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {id === 'heart' && (
        <g>
          <path d="M20 33 C6 23 7 11 14 10 C17 9.5 19 11 20 13 C21 11 23 9.5 26 10 C33 11 34 23 20 33 Z" fill="#ef4444" />
          <ellipse cx="14.5" cy="15" rx="3" ry="2" fill="#fecaca" transform="rotate(-30 14.5 15)" />
          <path d="M20 17 v9 M15.5 21.5 h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}
      {id === 'spin' && (
        <g fill="none" strokeLinecap="round">
          <path d="M20 8 A12 12 0 1 1 8 20" stroke="#7dd3fc" strokeWidth="3.4" />
          <path d="M20 13 A7 7 0 1 1 13 20" stroke="#e0f2fe" strokeWidth="2.6" />
          <path d="M8 20 L5 15 M8 20 L13 18" stroke="#7dd3fc" strokeWidth="3" />
        </g>
      )}
      {id === 'wave' && (
        <g>
          <path d="M14 7 Q34 20 14 33 Q26 20 14 7 Z" fill="#bae6fd" />
          <path d="M8 12 Q22 20 8 28" fill="none" stroke="#7dd3fc" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {id === 'vamp' && (
        <g>
          <path d="M20 6 C26 15 30 20 30 25 A10 10 0 0 1 10 25 C10 20 14 15 20 6 Z" fill="#dc2626" />
          <ellipse cx="15.5" cy="24" rx="2.4" ry="3.6" fill="#fca5a5" />
          <path d="M16 33 l2 -4 l2 4 M22 33 l2 -4" stroke="#fff" strokeWidth="1.6" fill="none" />
        </g>
      )}
      {id === 'speed' && (
        <g>
          <path d="M14 8 H24 V22 L32 25 Q34 30 30 31 H12 Z" fill="#a16207" />
          <path d="M12 27 H31" stroke="#fde68a" strokeWidth="2.2" />
          <path d="M26 12 l6 -3 M27 17 l7 -1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 18 h7 M2 24 h8" stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}
      {id === 'rate' && (
        <g>
          <path d="M26 6 L32 6 L32 12 L19 25 L13 19 Z" fill="#e2e8f0" opacity="0.5" transform="rotate(-25 20 20)" />
          <path d="M26 6 L32 6 L32 12 L19 25 L13 19 Z" fill="#e2e8f0" />
          <path d="M11 21 L19 29" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 27 L9 32" stroke="#92400e" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M6 9 l4 2 M5 15 l5 0" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {id === 'reach' && (
        <g>
          <path d="M31 5 L36 5 L36 10 L14 32 L9 27 Z" fill="#e2e8f0" />
          <path d="M7 25 L16 34" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 6 H20 M8 6 l3 -3 M8 6 l3 3" stroke="#86efac" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      )}
    </svg>
  )
}
