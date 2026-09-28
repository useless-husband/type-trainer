// 可注入種子的亂數：mulberry32。所有會用到亂數的函式都接受 rng（回傳 [0,1) 的函式）。

/** 建立固定種子的亂數產生器。同樣的 seed 永遠產生同樣的序列。 */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0 <= n < max 的整數。 */
export function randInt(rng, max) {
  return Math.floor(rng() * max);
}

/** Fisher–Yates 洗牌，回傳新陣列，不改動原陣列。 */
export function shuffle(rng, list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 不重複地隨機取 n 個。 */
export function sample(rng, list, n) {
  return shuffle(rng, list).slice(0, Math.max(0, n));
}

/**
 * 依權重不重複地取 n 個（Efraimidis–Spirakis）。
 * weights[i] <= 0 的項目不會被選到。回傳 list 中的項目。
 */
export function weightedSample(rng, list, weights, n) {
  const keyed = [];
  for (let i = 0; i < list.length; i++) {
    const w = weights[i];
    if (!(w > 0)) continue;
    keyed.push({ i, k: Math.log(rng() || Number.MIN_VALUE) / w });
  }
  keyed.sort((x, y) => y.k - x.k || x.i - y.i);
  return keyed.slice(0, n).map((e) => list[e.i]);
}
