import test from "node:test";
import assert from "node:assert/strict";
import { createRng, randInt, sample, shuffle, weightedSample } from "../src/rng.js";

test("同樣的種子產生同樣的序列", () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test("不同種子產生不同序列", () => {
  assert.notEqual(createRng(1)(), createRng(2)());
});

test("亂數落在 [0,1)，randInt 落在範圍內", () => {
  const r = createRng(7);
  for (let i = 0; i < 500; i++) {
    const x = r();
    assert.ok(x >= 0 && x < 1);
    const n = randInt(r, 6);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 6);
  }
});

test("固定種子的第一個值不會變（防止演算法被無意改動）", () => {
  assert.equal(createRng(1)(), 0.6270739405881613);
});

test("shuffle 是排列（不增不減）且不改動原陣列", () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(createRng(3), src);
  assert.deepEqual([...out].sort((a, b) => a - b), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("sample 不重複，n 超過長度時回傳全部", () => {
  const out = sample(createRng(5), [1, 2, 3, 4, 5], 3);
  assert.equal(new Set(out).size, 3);
  assert.equal(sample(createRng(5), [1, 2], 10).length, 2);
  assert.deepEqual(sample(createRng(5), [1, 2], -1), []);
});

test("weightedSample 不會選到權重 0 的項目，並偏向大權重", () => {
  const list = ["a", "b", "c"];
  const out = weightedSample(createRng(9), list, [0, 1, 1], 5);
  assert.ok(!out.includes("a"));
  let heavy = 0;
  const r = createRng(11);
  for (let i = 0; i < 300; i++) if (weightedSample(r, list, [1, 1, 50], 1)[0] === "c") heavy++;
  assert.ok(heavy > 250, `heavy=${heavy}`);
});
