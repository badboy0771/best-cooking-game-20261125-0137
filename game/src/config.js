// Dapur Kilat — every tuning number, recipe and screen rectangle in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One work shift lasts this long; when the timer hits zero the shift is over. */
export const SHIFT_SECONDS = 150;

export const MAX_LIVES = 3;
export const MAX_ORDERS = 3;

/**
 * Every ingredient: its emoji, its name, which station cooks it (null = ready to
 * serve as it is) and how long that station takes. prep is one of 'grill', 'chop',
 * 'wok' or null.
 */
export const INGREDIENTS = {
  bun:     { name: 'Roti',   emoji: '🍞', prep: null,    time: 0, color: '#e8b96a' },
  patty:   { name: 'Patty',  emoji: '🥩', prep: 'grill', time: 6, color: '#b0563a' },
  chicken: { name: 'Ayam',  emoji: '🍗', prep: 'grill', time: 7, color: '#e08a4c' },
  rice:    { name: 'Nasi',   emoji: '🍚', prep: 'wok',   time: 5, color: '#f5f0e1' },
  noodle:  { name: 'Mie',    emoji: '🍜', prep: 'wok',   time: 5, color: '#f2c14e' },
  egg:     { name: 'Telur',  emoji: '🥚', prep: 'wok',   time: 4, color: '#fdf6d8' },
  veg:     { name: 'Sayur',  emoji: '🥬', prep: 'chop',  time: 3, color: '#58b368' },
  cheese:  { name: 'Keju',   emoji: '🧀', prep: null,    time: 0, color: '#ffd23f' },
  sauce:   { name: 'Saus',   emoji: '🌶️', prep: null,    time: 0, color: '#d7263d' },
};

/** The order the ingredient bins sit on the counter, left to right, top to bottom. */
export const BIN_ORDER = ['bun', 'patty', 'chicken', 'rice', 'noodle', 'egg', 'veg', 'cheese', 'sauce'];

/** The four dishes on the menu: the recipe is the exact multiset the plate must hold. */
export const RECIPES = [
  { id: 'burger',    name: 'Burger Klasik', emoji: '🍔', items: ['bun', 'patty', 'veg', 'cheese'],          reward: 40 },
  { id: 'nasgor',    name: 'Nasi Goreng',   emoji: '🍛', items: ['rice', 'egg', 'chicken', 'sauce'],        reward: 50 },
  { id: 'geprek',    name: 'Ayam Geprek',   emoji: '🍗', items: ['chicken', 'rice', 'veg', 'sauce'],        reward: 45 },
  { id: 'miegoreng', name: 'Mie Goreng',    emoji: '🍜', items: ['noodle', 'egg', 'veg', 'sauce'],          reward: 45 },
];

/** The three prep stations: two slots each, so two things can cook at once. */
export const STATIONS = {
  grill: { name: 'Panggangan', emoji: '🔥', slots: 2, color: '#3a3f4a', accent: '#ff7a3c' },
  chop:  { name: 'Talenan',    emoji: '🔪', slots: 2, color: '#a9804f', accent: '#8bc34a' },
  wok:   { name: 'Wajan',      emoji: '🍳', slots: 2, color: '#2f333d', accent: '#4fc3f7' },
};

/** Seconds a finished dish may sit on its station before it burns. */
export const BURN_GRACE_SECONDS = 8;

/** Order pacing: a new order every spawnInterval seconds, patience per order. */
export const ORDERS = {
  firstPatience: 55,
  patienceBase: 50,
  patiencePerLevel: -2,
  patienceMin: 32,
  spawnBase: 14,
  spawnPerLevel: -1,
  spawnMin: 7,
};

/** A level is earned every this many served dishes; pacing tightens with the level. */
export const LEVEL_EVERY_SERVES = 4;

/** Serving pays the dish reward, plus up to this patience bonus, plus 5 per combo step. */
export const SCORE = { patienceBonus: 20, comboBonus: 5, levelBonus: 25 };

/** The customers who walk in, in a fixed rotation so a seed replays the same faces. */
export const CUSTOMERS = ['🧑', '👩', '👨', '👵', '👴', '🧕', '👱', '🧔'];

export const PALETTE = {
  wall: '#f7e8c9',
  wallTrim: '#e8cfa0',
  floor: '#c98f5f',
  floorLine: '#b57a4e',
  hud: '#2b2118',
  hudText: '#fff3d6',
  board: '#6b4423',
  boardInner: '#8a5a30',
  card: '#fff8e7',
  cardText: '#3a2a18',
  counter: '#8a5a30',
  counterTop: '#a9743f',
  panel: '#fff3d6',
  panelEdge: '#d9b380',
  text: '#3a2a18',
  muted: '#8a7a63',
  good: '#2e9e5b',
  warn: '#e8a13c',
  bad: '#d7263d',
  gold: '#f2c94c',
  plate: '#ffffff',
  plateEdge: '#cfd8dc',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';

/**
 * Every clickable rectangle, in logical coordinates. render.js draws them and
 * input.js hit-tests them, so the two can never drift apart.
 */
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 64 },
  muteButton: { x: 1212, y: 12, w: 56, h: 40 },
  ordersLabel: { x: 16, y: 72, w: 300, h: 22 },
  orderCards: [
    { x: 16, y: 96, w: 400, h: 88 },
    { x: 440, y: 96, w: 400, h: 88 },
    { x: 864, y: 96, w: 400, h: 88 },
  ],
  binsLabel: { x: 16, y: 196, w: 300, h: 22 },
  // 3x3 grid of bins, 96x80, 6px gaps, starting at (16, 220).
  bins: BIN_ORDER.map((id, i) => ({
    id,
    x: 16 + (i % 3) * 102,
    y: 220 + Math.floor(i / 3) * 86,
    w: 96,
    h: 80,
  })),
  stationsLabel: { x: 340, y: 196, w: 560, h: 22 },
  // Three station panels, 176 wide, two slots each, starting at (340, 220).
  stations: ['grill', 'chop', 'wok'].map((kind, i) => ({
    kind,
    x: 340 + i * 192,
    y: 220,
    w: 176,
    h: 180,
    slots: [0, 1].map((s) => ({ x: 348 + i * 192 + s * 88, y: 268, w: 80, h: 120 })),
  })),
  plateLabel: { x: 936, y: 196, w: 328, h: 22 },
  platePanel: { x: 936, y: 220, w: 328, h: 180 },
  plate: { x: 1000, y: 258, w: 200, h: 104 },
  serveButton: { x: 956, y: 372, w: 140, h: 44 },
  trashButton: { x: 1112, y: 372, w: 132, h: 44 },
  counterBand: { x: 0, y: 520, w: 1280, h: 128 },
  chef: { x: 560, y: 520, w: 160, h: 128 },
  handLabel: { x: 16, y: 556, w: 320, h: 60 },
  toast: { x: 360, y: 556, w: 560, h: 60 },
  helpBar: { x: 0, y: 656, w: 1280, h: 64 },
  startButton: { x: 490, y: 470, w: 300, h: 64 },
  restartButton: { x: 490, y: 540, w: 300, h: 64 },
};

