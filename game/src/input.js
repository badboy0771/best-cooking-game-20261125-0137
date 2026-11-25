// Dapur Kilat — mouse and keyboard input. Hit-testing reads the same LAYOUT
// rectangles render.js draws, so a click lands where the picture says it does.
// Returns the live mouse position in logical coordinates, which main.js passes to
// draw() for the hover highlight and the hand cursor.
import { FIELD, LAYOUT } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function attachInput(canvas, world, sound) {
  const mouse = { x: -1, y: -1, inside: false };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function clickAt(x, y) {
    const s = world.state;
    sound.unlock();
    if (s.screen === SCREEN_TITLE) {
      if (inside(x, y, LAYOUT.startButton)) {
        world.reset(world.state.seed);
        world.startGame();
        sound.chime();
      }
      return;
    }
    if (s.screen === SCREEN_OVER) {
      if (inside(x, y, LAYOUT.restartButton)) {
        world.reset(world.state.seed);
        world.startGame();
        sound.chime();
      }
      return;
    }
    if (s.screen !== SCREEN_PLAY) return;
    // Mute, top right.
    if (inside(x, y, LAYOUT.muteButton)) {
      sound.setMuted(!sound.muted);
      return;
    }
    // Ingredient bins.
    for (const bin of LAYOUT.bins) {
      if (inside(x, y, bin)) {
        world.act({ type: 'bin', id: bin.id });
        return;
      }
    }
    // Station slots.
    for (const panelDef of LAYOUT.stations) {
      for (let i = 0; i < panelDef.slots.length; i += 1) {
        if (inside(x, y, panelDef.slots[i])) {
          world.act({ type: 'station', kind: panelDef.kind, slot: i });
          return;
        }
      }
    }
    // The plate itself: dropping a cooked ingredient on it.
    if (inside(x, y, LAYOUT.plate)) {
      world.act({ type: 'plate' });
      return;
    }
    // Serve bell and trash.
    if (inside(x, y, LAYOUT.serveButton)) {
      world.act({ type: 'serve' });
      return;
    }
    if (inside(x, y, LAYOUT.trashButton)) {
      world.act({ type: 'trash' });
      return;
    }
    // An order card: serve that order, if the plate matches it.
    for (let i = 0; i < LAYOUT.orderCards.length; i += 1) {
      if (inside(x, y, LAYOUT.orderCards[i]) && s.orders[i]) {
        world.act({ type: 'order', id: s.orders[i].id });
        return;
      }
    }
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toLogical(event);
    mouse.x = p.x;
    mouse.y = p.y;
    clickAt(p.x, p.y);
  });

  window.addEventListener('keydown', (event) => {
    const s = world.state;
    if (event.repeat) return;
    sound.unlock();
    const key = event.key;
    if (key === 'Enter') {
      if (s.screen === SCREEN_TITLE || s.screen === SCREEN_OVER) {
        world.reset(world.state.seed);
        world.startGame();
        sound.chime();
      }
      return;
    }
    if (key === 'm' || key === 'M') {
      sound.setMuted(!sound.muted);
      return;
    }
    if (key === 'p' || key === 'P') {
      if (s.screen === SCREEN_PLAY) s.paused = !s.paused;
      return;
    }
    if ((key === 'r' || key === 'R') && s.screen === SCREEN_OVER) {
      world.reset(world.state.seed);
      world.startGame();
      sound.chime();
      return;
    }
    if (s.screen !== SCREEN_PLAY || s.paused) return;
    if (key >= '1' && key <= '9') {
      const bin = LAYOUT.bins[Number(key) - 1];
      if (bin) world.act({ type: 'bin', id: bin.id });
      return;
    }
    if (key === ' ') {
      event.preventDefault();
      world.act({ type: 'serve' });
      return;
    }
    if (key === 't' || key === 'T' || key === 'Backspace') {
      world.act({ type: 'trash' });
    }
  });

  return mouse;
}

