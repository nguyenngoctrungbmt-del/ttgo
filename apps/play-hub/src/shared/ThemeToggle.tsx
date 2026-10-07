import { useThemeStore } from '../store/themeStore'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useThemeStore((s) => s.mode)
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      className={`btn btn-ghost${compact ? ' btn-icon' : ''}`}
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={compact ? undefined : { minHeight: 40, padding: '0.45rem 0.85rem' }}
    >
      <span aria-hidden>{isDark ? '☀' : '☾'}</span>
      {!compact && (isDark ? 'Light' : 'Dark')}
    </button>
  )
}
