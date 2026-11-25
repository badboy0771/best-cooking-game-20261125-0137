// Dapur Kilat — the kitchen simulation: orders, stations, the plate, the score.
// Pure rules, no drawing and no sound: step() advances the clock, act() applies one
// player move, and both push event names onto world.events, which main.js drains to
// play sounds. Everything random comes from the seeded rng, so a seed replays.
import {
  BURN_GRACE_SECONDS,
  CUSTOMERS,
  FIELD,
  INGREDIENTS,
  LAYOUT,
  LEVEL_EVERY_SERVES,
  MAX_LIVES,
  MAX_ORDERS,
  ORDERS,
  RECIPES,
  SCORE,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';
import { mulberry32, randomPick } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** Does the plate hold exactly the recipe's multiset of ingredients? */
export function plateMatchesOrder(plate, recipe) {
  if (plate.length !== recipe.items.length) return false;
  const have = {};
  for (const item of plate) have[item] = (have[item] || 0) + 1;
  const want = {};
  for (const item of recipe.items) want[item] = (want[item] || 0) + 1;
  return Object.keys(want).every((item) => have[item] === want[item]);
}

/** The first order whose recipe the plate matches, or null. */
export function findMatchingOrder(state) {
  for (const order of state.orders) {
    if (plateMatchesOrder(state.plate, order.recipe)) return order;
  }
  return null;
}

/** How many station slots are cooking right now (for the sizzle sound). */
export function cookingCount(state) {
  let n = 0;
  for (const kind of Object.keys(state.stations)) {
    for (const slot of state.stations[kind]) if (slot && slot.state === 'cooking') n += 1;
  }
  return n;
}

export function createWorld(seed = 1) {
  const world = {
    state: null,
    events: [],

    reset(nextSeed = seed, opts = {}) {
      const rng = mulberry32(nextSeed);
      this.state = {
        screen: SCREEN_TITLE,
        seed: nextSeed,
        rng,
        time: 0,
        shiftSeconds: opts.shiftSeconds ?? SHIFT_SECONDS,
        shiftLeft: opts.shiftSeconds ?? SHIFT_SECONDS,
        score: 0,
        coins: 0,
        combo: 0,
        bestCombo: 0,
        served: 0,
        level: 1,
        lives: MAX_LIVES,
        hand: null,
        plate: [],
        orders: [],
        stations: {
          grill: [null, null],
          chop: [null, null],
          wok: [null, null],
        },
        spawnTimer: 2,
        orderSeq: 0,
        nextOrderId: 1,
        particles: [],
        floaters: [],
        toasts: [],
        chefX: FIELD.width / 2,
        chefTargetX: FIELD.width / 2,
        paused: false,
        shake: 0,
        servePulse: 0,
        overReason: null,
        stats: { picked: 0, cooked: 0, burnt: 0, trashed: 0, expired: 0 },
      };
      this.events.length = 0;
      // The first customer always wants the house signature, so the opening
      // minute teaches the full loop: bin, grill, chop, plate, serve.
      this.spawnOrder(true);
      return this.state;
    },

    spawnOrder(first = false) {
      const s = this.state;
      const recipe = first ? RECIPES[0] : randomPick(s.rng, RECIPES);
      const patience = first
        ? ORDERS.firstPatience
        : Math.max(
            ORDERS.patienceMin,
            ORDERS.patienceBase + ORDERS.patiencePerLevel * (s.level - 1),
          );
      s.orders.push({
        id: s.nextOrderId,
        recipe,
        patience,
        maxPatience: patience,
        customer: CUSTOMERS[s.orderSeq % CUSTOMERS.length],
      });
      s.nextOrderId += 1;
      s.orderSeq += 1;
      this.events.push('bell');
      this.addToast(`Pesanan baru: ${recipe.name}!`, 'info');
    },

    addToast(text, kind = 'info') {
      const s = this.state;
      s.toasts.push({ text, kind, life: 2.6 });
      if (s.toasts.length > 3) s.toasts.shift();
    },

    addFloater(x, y, text, color = '#f2c94c') {
      this.state.floaters.push({ x, y, text, color, life: 1.4 });
    },

    burst(x, y, kind, count = 10) {
      const s = this.state;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + s.rng() * 0.6;
        const speed = 40 + s.rng() * 90;
        s.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          life: 0.7 + s.rng() * 0.5,
          maxLife: 1.2,
          kind,
        });
      }
    },

    steam(x, y) {
      const s = this.state;
      if (s.particles.length > 220) return;
      s.particles.push({
        x: x + (s.rng() - 0.5) * 30, y,
        vx: (s.rng() - 0.5) * 8, vy: -28 - s.rng() * 20,
        life: 0.9 + s.rng() * 0.5, maxLife: 1.4, kind: 'steam',
      });
    },

    startGame() {
      const s = this.state;
      s.screen = SCREEN_PLAY;
      s.shiftLeft = s.shiftSeconds;
      s.time = 0;
      s.paused = false;
      this.events.push('bell');
    },

    endGame(reason) {
      const s = this.state;
      s.screen = SCREEN_OVER;
      s.overReason = reason;
      s.hand = null;
      this.events.push('over');
    },

    serveOrder(order) {
      const s = this.state;
      const patienceBonus = Math.round(SCORE.patienceBonus * (order.patience / order.maxPatience));
      const comboBonus = SCORE.comboBonus * s.combo;
      const earned = order.recipe.reward + patienceBonus + comboBonus;
      s.coins += earned;
      s.score += earned;
      s.served += 1;
      s.combo += 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.plate = [];
      s.orders = s.orders.filter((o) => o.id !== order.id);
      const plate = LAYOUT.plate;
      this.addFloater(plate.x + plate.w / 2, plate.y, `+${earned} 🪙`, '#f2c94c');
      this.burst(plate.x + plate.w / 2, plate.y + 30, 'coin', 14);
      this.events.push('serve');
      this.addToast(`Tersaji! ${order.recipe.name} +${earned} koin${s.combo > 1 ? ` (kombo x${s.combo})` : ''}`, 'good');
      const level = 1 + Math.floor(s.served / LEVEL_EVERY_SERVES);
      if (level > s.level) {
        s.level = level;
        s.coins += SCORE.levelBonus;
        s.score += SCORE.levelBonus;
        this.events.push('level');
        this.addToast(`LEVEL ${level}! Pesanan datang lebih cepat (+${SCORE.levelBonus} bonus)`, 'good');
      }
    },

    /** One player move. Returns true when it did something. */
    act(action) {
      const s = this.state;
      if (!s || s.screen !== SCREEN_PLAY || s.paused) return false;
      switch (action.type) {
        case 'bin': {
          if (s.hand) {
            this.events.push('buzz');
            this.addToast('Tangan penuh! Taruh dulu bahan yang dipegang.', 'bad');
            return false;
          }
          const def = INGREDIENTS[action.id];
          s.hand = { item: action.id, cooked: def.prep === null };
          s.stats.picked += 1;
          const bin = LAYOUT.bins.find((b) => b.id === action.id);
          if (bin) s.chefTargetX = bin.x + bin.w / 2;
          this.events.push('pickup');
          return true;
        }
        case 'station': {
          const slots = s.stations[action.kind];
          const slot = slots[action.slot];
          const panel = LAYOUT.stations.find((p) => p.kind === action.kind);
          if (panel) s.chefTargetX = panel.x + panel.w / 2;
          if (slot && slot.state === 'burnt') {
            slots[action.slot] = null;
            s.stats.trashed += 1;
            this.events.push('trash');
            this.addToast('Hangus! Dibuang ke tempat sampah.', 'bad');
            return true;
          }
          if (slot && slot.state === 'ready') {
            if (s.hand) {
              this.events.push('buzz');
              this.addToast('Tangan penuh! Taruh dulu bahan yang dipegang.', 'bad');
              return false;
            }
            s.hand = { item: slot.item, cooked: true };
            slots[action.slot] = null;
            s.stats.cooked += 1;
            this.events.push('pickup');
            return true;
          }
          if (slot && slot.state === 'cooking') {
            this.events.push('buzz');
            this.addToast('Masih dimasak, sabar…', 'info');
            return false;
          }
          if (!slot && s.hand && !s.hand.cooked && INGREDIENTS[s.hand.item].prep === action.kind) {
            slots[action.slot] = { item: s.hand.item, progress: 0, state: 'cooking', burnTimer: 0 };
            s.hand = null;
            this.events.push(action.kind === 'chop' ? 'chop' : 'place');
            return true;
          }
          if (!slot && s.hand && s.hand.cooked) {
            this.events.push('buzz');
            this.addToast('Sudah matang — taruh di piring, bukan di stasiun!', 'bad');
            return false;
          }
          if (!slot && s.hand) {
            this.events.push('buzz');
            const want = STATIONS[INGREDIENTS[s.hand.item].prep].name;
            this.addToast(`${INGREDIENTS[s.hand.item].name} dimasak di ${want}, bukan di sini.`, 'bad');
            return false;
          }
          return false;
        }
        case 'plate': {
          const plate = LAYOUT.plate;
          s.chefTargetX = plate.x + plate.w / 2;
          if (s.hand && s.hand.cooked) {
            s.plate.push(s.hand.item);
            s.hand = null;
            this.events.push('place');
            if (findMatchingOrder(s)) s.servePulse = 1.2;
            return true;
          }
          if (s.hand) {
            this.events.push('buzz');
            this.addToast('Masih mentah! Masak dulu di stasiun.', 'bad');
            return false;
          }
          return false;
        }
        case 'serve': {
          const order = findMatchingOrder(s);
          if (!order) {
            this.events.push('buzz');
            s.shake = 0.3;
            this.addToast(s.plate.length === 0 ? 'Piring masih kosong!' : 'Resep di piring tidak cocok dengan pesanan!', 'bad');
            return false;
          }
          this.serveOrder(order);
          return true;
        }
        case 'order': {
          const order = s.orders.find((o) => o.id === action.id);
          if (!order) return false;
          if (plateMatchesOrder(s.plate, order.recipe)) {
            this.serveOrder(order);
            return true;
          }
          this.events.push('buzz');
          s.shake = 0.3;
          const other = findMatchingOrder(s);
          this.addToast(
            other ? 'Piring ini cocok untuk pesanan lain, bukan yang ini!' : 'Resep di piring belum cocok dengan pesanan ini.',
            'bad',
          );
          return false;
        }
        case 'trash': {
          if (s.hand) {
            s.hand = null;
            s.stats.trashed += 1;
            this.events.push('trash');
            return true;
          }
          if (s.plate.length > 0) {
            s.plate = [];
            s.stats.trashed += 1;
            this.events.push('trash');
            this.addToast('Piring dikosongkan.', 'info');
            return true;
          }
          return false;
        }
        default:
          return false;
      }
    },

    /** Advance the clock by dt seconds. */
    step(dt) {
      const s = this.state;
      if (!s) return;
      // Steam, floaters and toasts animate on every screen, so the title screen
      // is a living kitchen, not a still image.
      for (let i = s.particles.length - 1; i >= 0; i -= 1) {
        const p = s.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= p.kind === 'coin' ? 160 * dt : 12 * dt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }
      for (let i = s.floaters.length - 1; i >= 0; i -= 1) {
        const f = s.floaters[i];
        f.life -= dt;
        f.y -= 34 * dt;
        if (f.life <= 0) s.floaters.splice(i, 1);
      }
      for (let i = s.toasts.length - 1; i >= 0; i -= 1) {
        s.toasts[i].life -= dt;
        if (s.toasts[i].life <= 0) s.toasts.splice(i, 1);
      }
      s.chefX += (s.chefTargetX - s.chefX) * Math.min(1, dt * 6);
      if (s.shake > 0) s.shake -= dt;
      if (s.servePulse > 0) s.servePulse -= dt;
      if (s.screen !== SCREEN_PLAY || s.paused) return;

      s.time += dt;
      s.shiftLeft -= dt;
      if (s.shiftLeft <= 0) {
        s.shiftLeft = 0;
        this.endGame('time');
        return;
      }
      // A new order walks in on a timer, faster as the level rises.
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        if (s.orders.length < MAX_ORDERS) this.spawnOrder();
        s.spawnTimer = Math.max(
          ORDERS.spawnMin,
          ORDERS.spawnBase + ORDERS.spawnPerLevel * (s.level - 1),
        );
      }
      // Patience runs out: the customer storms off, a life is lost, the combo dies.
      for (let i = s.orders.length - 1; i >= 0; i -= 1) {
        const order = s.orders[i];
        order.patience -= dt;
        if (order.patience <= 0) {
          s.orders.splice(i, 1);
          s.lives -= 1;
          s.combo = 0;
          s.stats.expired += 1;
          this.events.push('expired');
          this.addToast(`Pelanggan kabur! ${order.recipe.name} tidak tersaji. (-1 ❤️)`, 'bad');
          if (s.lives <= 0) {
            this.endGame('lives');
            return;
          }
        }
      }
      // Cooking: progress, then a grace period, then burnt.
      for (const kind of Object.keys(s.stations)) {
        const panel = LAYOUT.stations.find((p) => p.kind === kind);
        s.stations[kind].forEach((slot, index) => {
          if (!slot) return;
          const def = INGREDIENTS[slot.item];
          if (slot.state === 'cooking') {
            slot.progress += dt / def.time;
            if (slot.progress >= 1) {
              slot.progress = 1;
              slot.state = 'ready';
              slot.burnTimer = 0;
              this.events.push('ding');
              this.addToast(`${def.name} matang! Ambil sebelum hangus.`, 'good');
            } else if (kind !== 'chop' && Math.random() < dt * 6) {
              this.steam(panel.slots[index].x + 40, panel.slots[index].y + 10);
            }
          } else if (slot.state === 'ready') {
            slot.burnTimer += dt;
            if (slot.burnTimer >= BURN_GRACE_SECONDS) {
              slot.state = 'burnt';
              s.stats.burnt += 1;
              this.events.push('burnt');
              this.addToast(`${def.name} hangus! Klik untuk membuangnya.`, 'bad');
            }
          }
        });
      }
    },
  };

  world.reset(seed);
  return world;
}

