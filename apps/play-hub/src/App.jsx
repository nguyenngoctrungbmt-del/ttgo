import { Routes, Route } from 'react-router-dom';
import HubHome from './components/HubHome.jsx';
import GameShell from './components/GameShell.jsx';
import FlappyBird from './games/flappy-bird/FlappyBird.jsx';
import Snake from './games/snake/Snake.jsx';
import { GAMES } from './games/registry.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubHome games={GAMES} />} />
      <Route
        path="/flappy-bird"
        element={
          <GameShell title="Flappy Bird" backTo="/">
            <FlappyBird />
          </GameShell>
        }
      />
      <Route
        path="/snake"
        element={
          <GameShell title="Snake" backTo="/">
            <Snake />
          </GameShell>
        }
      />
    </Routes>
  );
}