import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './styles/tp-base.css'
import { useThemeStore } from './store/themeStore'
import { loadCovers } from './games/covers'
import { useProgressStore } from './store/progressStore'

void useThemeStore.getState().hydrate()
// Load saved progress before any screen can write to it — a game opened directly
// must never save over real progress with empty state.
void useProgressStore.getState().hydrate()
// Start fetching cover art right away, in parallel with the first render.
void loadCovers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
