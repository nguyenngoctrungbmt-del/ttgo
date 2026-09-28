const MUTE_KEY = 'ttgo-sfx-muted';

let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}

/**
 * @param {'eat'|'die'|'start'|'flap'|'score'|'hit'} name
 */
export function playSfx(name) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const now = c.currentTime;
  const tone = (freq, dur, type = 'square', vol = 0.07, slideTo) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    if (slideTo != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(now);
    o.stop(now + dur + 0.02);
  };

  switch (name) {
    case 'eat':
    case 'score':
      tone(520, 0.07, 'square', 0.06);
      tone(780, 0.1, 'square', 0.05);
      break;
    case 'die':
    case 'hit':
      tone(280, 0.22, 'sawtooth', 0.055, 80);
      break;
    case 'start':
      tone(360, 0.06, 'triangle', 0.05);
      tone(480, 0.1, 'triangle', 0.045);
      break;
    case 'flap':
      tone(420, 0.05, 'triangle', 0.045, 620);
      break;
    default:
      break;
  }
}
