// Dapur Kilat — game loop and wiring: canvas, fixed-step simulation, input,
// sound, and the ?shot= scenes. No network requests anywhere: the game is plain
// static files, and the same code runs for a player and for the screenshots.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { SoundBank } from './audio.js';
import { attachInput } from './input.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';
import { createWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');

const world = createWorld(seed);
const sound = new SoundBank();

try {
  world.best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
} catch {
  world.best = 0;
}

const mouse = attachInput(canvas, world, sound);

/** Fit the 1280x720 field into the window, letterboxed, keeping the aspect. */
function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale);
  canvas.height = Math.round(FIELD.height * scale);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
}
window.addEventListener('resize', resize);
resize();

/** Drain the world's event queue into sounds. */
function drainEvents() {
  for (const event of world.events) {
    switch (event) {
      case 'pickup': sound.pop(); break;
      case 'place': sound.place(); break;
      case 'chop': sound.chop(); break;
      case 'ding': sound.ding(); break;
      case 'bell': sound.bell(); break;
      case 'serve': sound.chime(); break;
      case 'level': sound.fanfare(); break;
      case 'buzz': sound.buzz(); break;
      case 'trash': sound.thud(); break;
      case 'burnt': sound.buzz(); break;
      case 'expired': sound.buzz(); break;
      default: break;
    }
  }
  world.events.length = 0;
}

/** Keep the sizzle bed in step with how many things are cooking. */
function updateSizzle() {
  let cooking = 0;
  for (const kind of Object.keys(world.state.stations)) {
    for (const slot of world.state.stations[kind]) {
      if (slot && slot.state === 'cooking') cooking += 1;
    }
  }
  sound.setSizzle(world.state.screen === 'play' && !world.state.paused ? cooking : 0);
}

function renderFrame() {
  ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  draw(ctx, world, mouse.inside ? mouse : null, sound);
  const s = world.state;
  const screenName = s.screen === 'play' ? 'bermain' : s.screen === 'over' ? 'selesai' : 'judul';
  statusEl.textContent = `Dapur Kilat, ${screenName}. Skor ${s.score}, koin ${s.coins}, kombo ${s.combo}, level ${s.level}, nyawa ${s.lives}, sisa shift ${Math.ceil(s.shiftLeft)} detik, tersaji ${s.served}.`;
}

if (shot) {
  // A screenshot scene: stage the world, draw one frame, and say so.
  const result = stageShot(shot, world);
  if (result.screen === 'over' || world.state.screen === 'over') {
    const s = world.state;
    if (s.score > (world.best || 0)) {
      world.best = s.score;
      try { window.localStorage.setItem(BEST_KEY, String(s.score)); } catch { /* ignore */ }
    }
  }
  renderFrame();
  window.__shotReady = true;
  window.__shotResult = {
    screen: world.state.screen,
    score: world.state.score,
    served: world.state.served,
    coins: world.state.coins,
    bestCombo: world.state.bestCombo,
    lives: world.state.lives,
    shiftLeft: Math.round(world.state.shiftLeft),
    orders: world.state.orders.length,
    plate: world.state.plate.length,
  };
} else {
  // The live game: a fixed-step accumulator, so the rules run at 60 Hz whatever
  // the display's rate, and the best score is saved when a shift ends.
  let last = performance.now();
  let acc = 0;
  let savedBest = world.best || 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    while (acc >= STEP) {
      world.step(STEP);
      acc -= STEP;
    }
    drainEvents();
    updateSizzle();
    const s = world.state;
    if (s.screen === 'over' && s.score > savedBest) {
      savedBest = s.score;
      world.best = s.score;
      try { window.localStorage.setItem(BEST_KEY, String(s.score)); } catch { /* ignore */ }
    }
    renderFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// A handle for the play-test harness: the live state, read-only enough to check.
window.__dapurKilat = {
  world,
  sound,
  screen() { return world.state.screen; },
};

