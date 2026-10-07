import { create } from 'zustand'
import { loadJson, saveJson } from '../shared/storage'
import { DARK_BG, LIGHT_BG } from '../shared/nativeChrome'

export type ThemeMode = 'light' | 'dark'

type ThemeState = {
  mode: ThemeMode
  hydrated: boolean
  hydrate: () => Promise<void>
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const STORAGE_KEY = 'ttgo.playhub.theme.v1'

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
  document.documentElement.style.colorScheme = mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', mode === 'dark' ? DARK_BG : LIGHT_BG)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  hydrated: false,

  hydrate: async () => {
    const saved = await loadJson<{ mode?: ThemeMode }>(STORAGE_KEY, {})
    // Dark by default to match the TTGO site; light only when the player picked it.
    const mode: ThemeMode = saved.mode === 'light' ? 'light' : 'dark'

    applyTheme(mode)
    set({ mode, hydrated: true })
  },

  setMode: (mode) => {
    applyTheme(mode)
    set({ mode })
    void saveJson(STORAGE_KEY, { mode })
  },

  toggle: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark'
    get().setMode(next)
  },
}))
