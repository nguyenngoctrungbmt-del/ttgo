import { useState, useEffect, useRef } from 'react';
import './Snake.css';

const COLS = 20;
const ROWS = 20;
const CELL = 18;
const BASE_TICK_MS = 140;
const MIN_TICK_MS = 55;
const BEST_KEY = 'ttgo-snake-best';
const SWIPE_MIN = 24;

const DIR = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const START_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

function loadBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function spawnFood(snake) {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function tickMs(score) {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - score * 5);
}

export default function Snake() {
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [direction, setDirection] = useState('right');
  const [snake, setSnake] = useState(START_SNAKE);
  const [food, setFood] = useState(() => spawnFood(START_SNAKE));
  const [mode, setMode] = useState('ready');

  const canvasRef = useRef(null);
  const directionRef = useRef(direction);
  const nextDirRef = useRef(direction);
  const foodRef = useRef(food);
  const modeRef = useRef(mode);
  const scoreRef = useRef(score);
  const touchRef = useRef(null);
  const suppressClickRef = useRef(false);

  directionRef.current = direction;
  foodRef.current = food;
  modeRef.current = mode;
  scoreRef.current = score;

  function resetWorld() {
    setScore(0);
    scoreRef.current = 0;
    setDirection('right');
    directionRef.current = 'right';
    nextDirRef.current = 'right';
    setSnake(START_SNAKE);
    const f = spawnFood(START_SNAKE);
    foodRef.current = f;
    setFood(f);
  }

  function resetToReady() {
    resetWorld();
    setMode('ready');
    modeRef.current = 'ready';
  }

  function startPlaying() {
    setMode('playing');
    modeRef.current = 'playing';
  }

  function playAgain() {
    resetWorld();
    setMode('playing');
    modeRef.current = 'playing';
  }

  function trySetDirection(next) {
    const m = modeRef.current;
    if (m === 'ready') {
      setDirection(next);
      directionRef.current = next;
      nextDirRef.current = next;
      startPlaying();
      return;
    }
    if (m !== 'playing') return;
    if (next === OPPOSITE[directionRef.current]) return;
    if (next === OPPOSITE[nextDirRef.current]) return;
    nextDirRef.current = next;
    setDirection(next);
  }

  function onPrimaryAction() {
    const m = modeRef.current;
    if (m === 'ready') startPlaying();
    else if (m === 'dead') playAgain();
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onPrimaryAction();
        return;
      }

      let next = null;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') next = 'up';
      if (e.code === 'ArrowDown' || e.code === 'KeyS') next = 'down';
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') next = 'left';
      if (e.code === 'ArrowRight' || e.code === 'KeyD') next = 'right';
      if (!next) return;

      e.preventDefault();
      trySetDirection(next);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let lastTick = 0;
    let raf = 0;

    const loop = (now) => {
      if (modeRef.current === 'playing') {
        const ms = tickMs(scoreRef.current);
        if (now - lastTick >= ms) {
          lastTick = now;
          directionRef.current = nextDirRef.current;

          setSnake((prev) => {
            const d = DIR[directionRef.current];
            const head = prev[0];
            const nextHead = { x: head.x + d.x, y: head.y + d.y };

            if (
              nextHead.x < 0 ||
              nextHead.x >= COLS ||
              nextHead.y < 0 ||
              nextHead.y >= ROWS
            ) {
              setMode('dead');
              modeRef.current = 'dead';
              return prev;
            }

            if (prev.some((s) => s.x === nextHead.x && s.y === nextHead.y)) {
              setMode('dead');
              modeRef.current = 'dead';
              return prev;
            }

            const next = [nextHead, ...prev];
            const f = foodRef.current;
            const ate = nextHead.x === f.x && nextHead.y === f.y;

            if (ate) {
              const newFood = spawnFood(next);
              foodRef.current = newFood;
              setFood(newFood);
              setScore((s) => {
                const n = s + 1;
                scoreRef.current = n;
                setBest((b) => {
                  if (n > b) {
                    saveBest(n);
                    return n;
                  }
                  return b;
                });
                return n;
              });
            } else {
              next.pop();
            }

            return next;
          });
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = COLS * CELL;
    const H = ROWS * CELL;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#152415');
    bg.addColorStop(1, '#0e1a0e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(61, 90, 61, 0.35)';
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    // food
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.fillStyle = '#e85d4c';
    ctx.arc(fx, fy, CELL * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6bcf6b';
    ctx.fillRect(fx - 1, fy - CELL * 0.42, 2, 5);

    snake.forEach((seg, i) => {
      const pad = i === 0 ? 1 : 2;
      ctx.fillStyle = i === 0 ? '#7adf7a' : '#3d8f3d';
      ctx.fillRect(
        seg.x * CELL + pad,
        seg.y * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2
      );
    });

    if (mode === 'ready' || mode === 'dead') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8f0e4';
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(mode === 'ready' ? 'SNAKE' : 'GAME OVER', W / 2, H / 2 - 10);
      ctx.font = '13px monospace';
      ctx.fillStyle = 'rgba(232, 240, 228, 0.85)';
      ctx.fillText(
        mode === 'ready'
          ? 'Tap / Space / mũi tên để chơi'
          : 'Tap / Space để chơi lại',
        W / 2,
        H / 2 + 16
      );
      if (mode === 'dead') {
        ctx.fillText(`Score ${score} · Best ${best}`, W / 2, H / 2 + 36);
      }
    }
  }, [snake, direction, food, mode, score, best]);

  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    suppressClickRef.current = true;
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < SWIPE_MIN && absY < SWIPE_MIN) {
      onPrimaryAction();
      return;
    }

    if (absX > absY) {
      trySetDirection(dx > 0 ? 'right' : 'left');
    } else {
      trySetDirection(dy > 0 ? 'down' : 'up');
    }
  }

  function onCanvasClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onPrimaryAction();
  }

  const hint =
    mode === 'ready'
      ? 'Space, mũi tên, WASD hoặc vuốt để bắt đầu'
      : mode === 'dead'
        ? 'Game Over — Space / tap để chơi lại'
        : 'Mũi tên / WASD / vuốt · tốc độ tăng theo score';

  return (
    <div className="snake-wrap">
      <div className="snake-hud">
        <span>Score {score}</span>
        <span>Best {best}</span>
      </div>

      <div className="snake-stage">
        <canvas
          ref={canvasRef}
          className="snake-board"
          width={COLS * CELL}
          height={ROWS * CELL}
          onClick={onCanvasClick}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
      </div>

      <p className="snake-hint">{hint}</p>

      <div className="snake-actions">
        {mode === 'ready' && (
          <button type="button" className="snake-btn" onClick={startPlaying}>
            Start
          </button>
        )}
        {mode === 'dead' && (
          <button type="button" className="snake-btn" onClick={playAgain}>
            Chơi lại
          </button>
        )}
        {mode === 'playing' && (
          <button type="button" className="snake-btn snake-btn--ghost" onClick={resetToReady}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
