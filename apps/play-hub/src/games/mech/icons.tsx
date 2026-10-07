import type { PassiveId, WeaponId } from './defs'

const S = { fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

/** Small vector icons for weapons and parts (cards + HUD). */
export function PartIcon({ id, color }: { id: WeaponId | PassiveId | 'heal' | 'gold'; color: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className="mech-icon">
      <circle cx="16" cy="16" r="15" fill={color} opacity="0.9" />
      <circle cx="16" cy="16" r="15" fill="url(#mech-icon-shine)" />
      <defs>
        <radialGradient id="mech-icon-shine" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      {id === 'blaster' && (
        <g {...S}>
          <path d="M7 19 h12 l4 -3 v-3 h-16 z" />
          <path d="M23 14.5 h3" />
          <path d="M10 19 v4" />
        </g>
      )}
      {id === 'saws' && (
        <g {...S}>
          <circle cx="16" cy="16" r="5" />
          <path d="M16 6 l2 4 M26 16 l-4 2 M16 26 l-2 -4 M6 16 l4 -2" />
        </g>
      )}
      {id === 'missiles' && (
        <g {...S}>
          <path d="M8 24 L20 12 l4 -4 l-1 5 l-4 4 L11 27 z" />
          <path d="M9 19 l-3 1 M13 23 l-1 3" />
        </g>
      )}
      {id === 'lightning' && <path {...S} d="M18 5 L10 18 h6 l-2 9 l8 -13 h-6 z" />}
      {id === 'flamer' && <path {...S} d="M16 6 C11 13 10 17 12 21 a5 5 0 0 0 8 0 c2 -4 0 -7 -2 -9 c0 3 -1 4 -2 5 c-1 -3 0 -7 0 -11 z" />}
      {id === 'railgun' && (
        <g {...S}>
          <path d="M6 20 L24 11 M8 23 L26 14" />
          <path d="M11 18.5 l2 3 M16 16 l2 3 M21 13.5 l2 3" />
        </g>
      )}
      {id === 'drones' && (
        <g {...S}>
          <rect x="12" y="13" width="8" height="6" rx="2.5" />
          <path d="M12 16 h-4 M20 16 h4 M6 13.5 h4 M22 13.5 h4" />
          <path d="M16 19 v4" />
        </g>
      )}
      {id === 'servo' && (
        <g {...S}>
          <circle cx="16" cy="16" r="4" />
          <path d="M16 6 v4 M16 22 v4 M6 16 h4 M22 16 h4 M9 9 l3 3 M20 20 l3 3 M23 9 l-3 3 M12 20 l-3 3" />
        </g>
      )}
      {id === 'gyro' && (
        <g {...S}>
          <ellipse cx="16" cy="16" rx="10" ry="4" />
          <ellipse cx="16" cy="16" rx="4" ry="10" />
        </g>
      )}
      {id === 'blast' && <path {...S} d="M16 5 l3 7 l7 -2 l-4 6 l5 5 l-7 0 l-4 6 l-1 -7 l-7 -1 l5 -5 l-4 -6 l6 2 z" />}
      {id === 'capacitor' && (
        <g {...S}>
          <rect x="10" y="9" width="12" height="16" rx="2" />
          <path d="M14 6 v3 M18 6 v3 M17 12 l-3 5 h4 l-3 5" />
        </g>
      )}
      {id === 'fuel' && (
        <g {...S}>
          <rect x="9" y="10" width="14" height="16" rx="3" />
          <path d="M13 10 v-3 h6 v3 M13 18 h6" />
        </g>
      )}
      {id === 'armor' && <path {...S} d="M16 5 L25 9 C25 18 21 24 16 27 C11 24 7 18 7 9 Z" />}
      {id === 'thrusters' && (
        <g {...S}>
          <path d="M12 7 h8 v10 l-4 4 l-4 -4 z" />
          <path d="M13 23 l-1 3 M16 24 v3 M19 23 l1 3" />
        </g>
      )}
      {id === 'magnet' && <path {...S} d="M9 8 v9 a7 7 0 0 0 14 0 v-9 M9 12 h4 M19 12 h4 M13 8 v9 a3 3 0 0 0 6 0 v-9" />}
      {id === 'nanites' && <path {...S} d="M16 8 v16 M8 16 h16" />}
      {id === 'heal' && <path {...S} d="M16 26 C6 19 6 11 11 9 c3 -1 5 1 5 3 c0 -2 2 -4 5 -3 c5 2 5 10 -5 17 z" />}
      {id === 'gold' && (
        <g {...S}>
          <circle cx="16" cy="16" r="8" />
          <path d="M16 11 v10" />
        </g>
      )}
    </svg>
  )
}
