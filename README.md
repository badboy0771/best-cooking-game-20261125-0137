# best-cooking-game-20261125-0137 — Dapur Kilat 🍳

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/badboy0771/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/badboy0771/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

**Dapur Kilat — Sizzle & Serve** is a timed cooking-rush game: orders land on
the board, you grab ingredients off the counter, cook them at the right
station, assemble the dish on the plate, and serve it before the customer
storms off. One 2½-minute shift, three lives, and a combo that pays more the
longer you keep it alive.

## How to play

- **Take an order in** — it appears on the order board with its recipe and a
  patience bar. The first customer always wants the house signature,
  Burger Klasik, so the opening minute teaches the whole loop.
- **Grab ingredients** — click a bin on the counter (or press 1–9). Nine
  ingredients: Roti, Patty, Ayam, Nasi, Mie, Telur, Sayur, Keju, Saus.
- **Cook what needs cooking** — Patty and Ayam go on the 🔥 Panggangan (grill),
  Sayur on the 🔪 Talenan (chopping board), Nasi, Mie and Telur in the 🍳 Wajan
  (wok). Each station has two slots. A finished dish flashes SIAP — pick it
  up before the grace period ends, or it burns and must be thrown away.
- **Assemble on the plate** — click the plate to add a cooked ingredient. The
  recipe chips on the order card tick green as each one lands.
- **Serve** — click the 🔔 SAJIKAN bell (or press Space), or click the order
  card itself, when the plate matches a recipe. Serving pays the dish reward
  plus a patience bonus plus 5 coins per combo step; every 4 dishes levels
  the kitchen up and orders arrive faster.

A customer whose patience runs out leaves angry: you lose a life and your
combo. Lose all three lives, or run out the shift timer, and the shift ends
with a report — dishes served, best combo, burnt dishes, walk-outs.

## The menu

| Dish | Recipe | Reward |
| --- | --- | --- |
| 🍔 Burger Klasik | Roti + Patty (grill) + Sayur (chop) + Keju | 40 |
| 🍛 Nasi Goreng | Nasi (wok) + Telur (wok) + Ayam (grill) + Saus | 50 |
| 🍗 Ayam Geprek | Ayam (grill) + Nasi (wok) + Sayur (chop) + Saus | 45 |
| 🍜 Mie Goreng | Mie (wok) + Telur (wok) + Sayur (chop) + Saus | 45 |

## Controls

Mouse everywhere, plus keyboard: **1–9** grab an ingredient, **Space** serve,
**T** empty the plate / drop what you hold, **M** mute, **P** pause,
**Enter** start, **R** cook again after a shift ends.

## Sound and life

All sound is synthesised with WebAudio — pickup pops, a chopping snap, a
sizzle bed that follows how many things are cooking, a ding when a dish is
ready, a serving chime, a level-up fanfare — no audio files. The chef slides
along the counter toward whatever you last touched, steam rises off the
stations, and coins burst when a dish is served. Mute with M or the 🔊 button.

## Files

- `game/index.html` — the page; `game/src/` is the game, one job per file:
  `config.js` (tuning, recipes, layout), `random.js` (seeded RNG),
  `world.js` (orders, stations, plate, score), `render.js` (canvas drawing),
  `input.js` (mouse + keyboard), `audio.js` (WebAudio effects),
  `shots.js` (the screenshot autopilot), `main.js` (loop and wiring).
- `main.ts` — the Node 22 entrypoint: copies `game/` and `screenshots/` to
  `/output` (or `MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the
  vendored `vendor/makefun-game.ts`. Two runs write the same bytes.
- `shots.mjs` — dev tool: drives headless Chrome over CDP, takes the four
  screenshots from `shots.json`, soaks the end scene across seeds, and
  play-tests the live game with real mouse clicks and keys.
- `serve.ts` — a tiny static server for local play: `node serve.ts`, then
  open http://localhost:8080.

## Play it

```sh
node serve.ts
# open http://localhost:8080 — no build step, no network requests
```

Screenshots are real renders of the game's own code in a browser (see
`shots.json`): the title over a living kitchen, a dish mid-assembly with a
patty on the grill, a finished Burger Klasik ready on the plate, and the
end-of-shift report.

Built for the [make.fun bounty](https://make.fun/bounty/best-cooking-game-20261125-0137)
"Make the best cooking game" — an original game, made for this competition.

