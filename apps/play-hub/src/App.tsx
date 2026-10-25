import { Suspense, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Hub from './hub/Hub'
import ClassicShell from './classic/ClassicShell'
import FlappyBird from './classic/flappy-bird/FlappyBird'
import Snake from './classic/snake/Snake'
import { GAME_ROUTES } from './games/routes'
import { GAMES } from './data/games'
import { trackScreen } from './analytics/analytics'

const TITLE_SUFFIX = ' — TTGO Play Hub'

function PlayRoute() {
  const { id = '' } = useParams()
  const Game = GAME_ROUTES[id]
  const meta = GAMES.find((g) => g.path === `/play/${id}`)

  useEffect(() => {
    if (meta) document.title = `${meta.title}${TITLE_SUFFIX}`
  }, [meta])

  if (!Game) return <Navigate to="/" replace />
  return <Game />
}

export default function App() {
  const location = useLocation()
  const isPlay = location.pathname.startsWith('/play/')

  useEffect(() => {
    document.documentElement.classList.toggle('is-play', isPlay)
    document.body.classList.toggle('is-play', isPlay)
    if (!isPlay) document.title = `Free Browser Games${TITLE_SUFFIX}`
  }, [isPlay])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Firebase logs the first page view itself; hash-route changes after that are logged here.
  const firstView = useRef(true)
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false
      return
    }
    const screen = location.pathname === '/' ? 'hub' : location.pathname.slice(1).replaceAll('/', '_')
    void trackScreen(screen, location.pathname)
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route
        path="/play/:id"
        element={
          <div className="app-root">
            <div className="app-shell is-play">
              <Suspense fallback={<div className="route-loading" />}>
                <PlayRoute />
              </Suspense>
            </div>
          </div>
        }
      />
      <Route
        path="/flappy-bird"
        element={
          <ClassicShell title="Flappy Bird" backTo="/">
            <FlappyBird />
          </ClassicShell>
        }
      />
      <Route
        path="/snake"
        element={
          <ClassicShell title="Snake" backTo="/">
            <Snake />
          </ClassicShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
