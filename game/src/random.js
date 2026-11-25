// Dapur Kilat — seeded random numbers, so a seed always replays the same kitchen:
// the same orders, in the same order, with the same customers.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max). */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

/** One element of an array, picked by the seeded rng. */
export function randomPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

