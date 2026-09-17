import { useEffect, useRef, useState, useCallback } from 'react';
import './FlappyBird.css';

const W = 360;
const H = 540;
const BIRD_X = 72;
const BIRD_R = 14;
const GRAVITY = 0.42;
const FLAP = -7.2;
const PIPE_W = 56;
const PIPE_GAP = 128;
const PIPE_SPEED = 2.35;
const PIPE_EVERY = 1600;
const GROUND_H = 64;
const BEST_KEY = 'ttgo-flappy-best';

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

function makePipe(x) {
  const minTop = 56;
  const maxTop = H - GROUND_H - PIPE_GAP - 56;
  const top = minTop + Math.random() * (maxTop - minTop);
  return { x, top, gap: PIPE_GAP, scored: false };
}

function hitPipe(birdY, pipe) {
  const withinX =
    BIRD_X + BIRD_R > pipe.x && BIRD_X - BIRD_R < pipe.x + PIPE_W;
  if (!withinX) return false;
  const topBottom = pipe.top;
  const gapBottom = pipe.top + pipe.gap;
  return birdY - BIRD_R < topBottom || birdY + BIRD_R > gapBottom;
}

export default function FlappyBird() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const [ui, setUi] = useState({
    mode: 'ready',
    score: 0,
    best: loadBest(),
  });

  const resetWorld = useCallback(() => {
    stateRef.current = {
      birdY: H * 0.42,
      vel: 0,
      pipes: [],
      lastPipe: 0,
      score: 0,
      mode: 'ready',
      groundOffset: 0,
      startedAt: 0,
    };
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.mode === 'ready') {
      s.mode = 'playing';
      s.startedAt = performance.now();
      s.lastPipe = performance.now();
      s.vel = FLAP;
      setUi((u) => ({ ...u, mode: 'playing', score: 0 }));
      return;
    }
    if (s.mode === 'playing') {
      s.vel = FLAP;
    }
  }, []);

  const restart = useCallback(() => {
    resetWorld();
    setUi((u) => ({ ...u, mode: 'ready', score: 0 }));
  }, [resetWorld]);

  useEffect(() => {
    resetWorld();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (stateRef.current?.mode === 'dead') restart();
        else flap();
      }
      if (e.code === 'Enter' && stateRef.current?.mode === 'dead') restart();
    };

    window.addEventListener('keydown', onKey);

    const draw = (now) => {
      const s = stateRef.current;
      if (!s) return;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#4ec0ca');
      sky.addColorStop(1, '#7ad5dc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // soft clouds
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 4; i++) {
        const cx = ((now * 0.02 + i * 110) % (W + 80)) - 40;
        const cy = 70 + i * 36;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 34, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 22, cy + 4, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (s.mode === 'playing') {
        s.vel += GRAVITY;
        s.birdY += s.vel;
        s.groundOffset = (s.groundOffset + PIPE_SPEED) % 24;

        if (now - s.lastPipe > PIPE_EVERY) {
          s.pipes.push(makePipe(W + 10));
          s.lastPipe = now;
        }

        for (const p of s.pipes) p.x -= PIPE_SPEED;
        s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -10);

        for (const p of s.pipes) {
          if (!p.scored && p.x + PIPE_W < BIRD_X) {
            p.scored = true;
            s.score += 1;
            setUi((u) => {
              const best = Math.max(u.best, s.score);
              if (best > u.best) saveBest(best);
              return { ...u, score: s.score, best };
            });
          }
          if (hitPipe(s.birdY, p)) s.mode = 'dead';
        }

        const floorY = H - GROUND_H;
        if (s.birdY + BIRD_R >= floorY || s.birdY - BIRD_R <= 0) {
          s.mode = 'dead';
        }

        if (s.mode === 'dead') {
          setUi((u) => {
            const best = Math.max(u.best, s.score);
            if (best > u.best) saveBest(best);
            return { mode: 'dead', score: s.score, best };
          });
        }
      } else if (s.mode === 'ready') {
        s.birdY = H * 0.42 + Math.sin(now / 220) * 6;
        s.groundOffset = (s.groundOffset + 1.2) % 24;
      }

      // pipes
      for (const p of s.pipes) {
        const body = '#5bbd3a';
        const lip = '#4aa52f';
        const rim = '#3d8a27';

        // top pipe
        ctx.fillStyle = body;
        ctx.fillRect(p.x, 0, PIPE_W, p.top);
        ctx.fillStyle = lip;
        ctx.fillRect(p.x - 3, p.top - 22, PIPE_W + 6, 22);
        ctx.strokeStyle = rim;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 3, p.top - 22, PIPE_W + 6, 22);

        // bottom pipe
        const by = p.top + p.gap;
        ctx.fillStyle = body;
        ctx.fillRect(p.x, by, PIPE_W, H - GROUND_H - by);
        ctx.fillStyle = lip;
        ctx.fillRect(p.x - 3, by, PIPE_W + 6, 22);
        ctx.strokeRect(p.x - 3, by, PIPE_W + 6, 22);
      }

      // ground
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = '#b9d94c';
      ctx.fillRect(0, H - GROUND_H, W, 14);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = -s.groundOffset; x < W; x += 24) {
        ctx.fillRect(x, H - GROUND_H + 14, 12, 8);
      }

      // bird
      const tilt = Math.max(-0.55, Math.min(0.85, s.vel / 10));
      ctx.save();
      ctx.translate(BIRD_X, s.birdY);
      ctx.rotate(tilt);
      // body
      ctx.fillStyle = '#f5d547';
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
      ctx.fill();
      // wing
      ctx.fillStyle = '#f0b429';
      ctx.beginPath();
      ctx.ellipse(-2, 2, 9, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(7.5, -4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = '#f07a2a';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(20, 3);
      ctx.lineTo(10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // score (in-game)
      if (s.mode === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(s.score), W / 2 + 2, 58);
        ctx.fillStyle = '#fff';
        ctx.fillText(String(s.score), W / 2, 56);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
    };
  }, [flap, resetWorld, restart]);

  const onPointer = (e) => {
    e.preventDefault();
    if (ui.mode === 'dead') restart();
    else flap();
  };

  return (
    <div className="flappy">
      <div className="flappy-stage">
        <canvas
          ref={canvasRef}
          className="flappy-canvas"
          width={W}
          height={H}
          onPointerDown={onPointer}
          role="img"
          aria-label="Flappy Bird game canvas"
        />

        {ui.mode === 'ready' && (
          <div className="flappy-overlay">
            <p className="flappy-hint">Tap / Space to flap</p>
          </div>
        )}

        {ui.mode === 'dead' && (
          <div className="flappy-overlay flappy-overlay--panel">
            <h2>Game over</h2>
            <p>
              Score <strong>{ui.score}</strong> · Best <strong>{ui.best}</strong>
            </p>
            <button type="button" className="flappy-btn" onClick={restart}>
              Play again
            </button>
          </div>
        )}
      </div>

      <div className="flappy-meta" aria-live="polite">
        <span>Score: {ui.score}</span>
        <span>Best: {ui.best}</span>
      </div>
      <p className="flappy-help">Click, tap, or press Space / ↑ to flap.</p>
    </div>
  );
}
