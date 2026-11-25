// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real
// rules forward from a fresh world for a fixed number of seconds, steered by a
// goal-driven autopilot (serve the oldest order: fetch what is missing, cook what
// needs cooking, plate what is ready), so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { INGREDIENTS, STEP } from './config.js';

const DECISION_EVERY_SECONDS = 0.35;

/** One autopilot decision: the single next move toward serving the oldest order. */
function autopilot(world, opts) {
  const s = world.state;
  if (s.screen !== 'play') return;
  const order = s.orders[0];
  if (!order) return;
  const plateCount = {};
  for (const item of s.plate) plateCount[item] = (plateCount[item] || 0) + 1;
  const recipeCount = {};
  for (const item of order.recipe.items) recipeCount[item] = (recipeCount[item] || 0) + 1;
  const missing = Object.keys(recipeCount).filter((item) => (plateCount[item] || 0) < recipeCount[item]);

  // The plate already holds the whole recipe: serve it, unless this scene is
  // meant to freeze with the dish ready on the plate.
  if (missing.length === 0) {
    if (opts.serve) world.act({ type: 'serve' });
    return;
  }
  // Carrying something: a cooked ingredient goes on the plate, a raw one onto
  // its station when a slot is free.
  if (s.hand) {
    if (s.hand.cooked) {
      world.act({ type: 'plate' });
      return;
    }
    const prep = INGREDIENTS[s.hand.item].prep;
    const free = s.stations[prep].findIndex((slot) => slot === null);
    if (free >= 0) world.act({ type: 'station', kind: prep, slot: free });
    return;
  }
  // Hands free: first collect a finished ingredient the plate still needs.
  for (const kind of Object.keys(s.stations)) {
    for (let i = 0; i < s.stations[kind].length; i += 1) {
      const slot = s.stations[kind][i];
      if (slot && slot.state === 'ready' && missing.includes(slot.item)) {
        world.act({ type: 'station', kind, slot: i });
        return;
      }
    }
  }
  // Otherwise fetch the first missing ingredient that is not already cooking,
  // but only when its station has a free slot (or it needs no cooking at all).
  for (const item of missing) {
    const def = INGREDIENTS[item];
    let onStation = false;
    for (const kind of Object.keys(s.stations)) {
      for (const slot of s.stations[kind]) {
        if (slot && slot.item === item) onStation = true;
      }
    }
    if (onStation) continue;
    if (def.prep === null) {
      world.act({ type: 'bin', id: item });
      return;
    }
    const free = s.stations[def.prep].findIndex((slot) => slot === null);
    if (free >= 0) {
      world.act({ type: 'bin', id: item });
      return;
    }
  }
  // Nothing to fetch and nothing ready: something is cooking. Wait for it.
}

/** Step the world for `seconds`, letting the autopilot decide a move regularly. */
function runAutopilot(world, seconds, opts) {
  let nextDecision = 0;
  for (let t = 0; t < seconds; t += STEP) {
    if (t >= nextDecision) {
      autopilot(world, opts);
      nextDecision = t + DECISION_EVERY_SECONDS;
    }
    world.step(STEP);
    if (world.state.screen !== 'play') break;
  }
}

const START_SECONDS = 6;
const PLAY_SECONDS = 6.5;
const SERVE_SECONDS = 14;
const END_SHIFT_SECONDS = 75;

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is
 * start) and return the screen to draw and the score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.reset(1);
    world.startGame();
    runAutopilot(world, PLAY_SECONDS, { serve: false });
    return { screen: 'play', score: world.state.score, served: world.state.served };
  }
  if (name === 'serve') {
    world.reset(1);
    world.startGame();
    runAutopilot(world, SERVE_SECONDS, { serve: false });
    return { screen: 'play', score: world.state.score, served: world.state.served };
  }
  if (name === 'end') {
    world.reset(1, { shiftSeconds: END_SHIFT_SECONDS });
    world.startGame();
    runAutopilot(world, END_SHIFT_SECONDS, { serve: true });
    return { screen: world.state.screen, score: world.state.score, served: world.state.served };
  }
  // start: a living kitchen behind the title card — the autopilot plays a few
  // seconds first, then the title overlay goes on top.
  world.reset(1);
  world.startGame();
  runAutopilot(world, START_SECONDS, { serve: false });
  world.state.screen = 'title';
  return { screen: 'title', score: 0, served: 0 };
}

