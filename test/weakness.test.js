import test from "node:test";
import assert from "node:assert/strict";
import { weakEnglishPool, weakZhuyinPool } from "../src/content.js";
import { createRng } from "../src/rng.js";
import { generateWeakEnglish, generateWeakZhuyin, scoreEnglishToken, topWeakKeys } from "../src/weakness.js";

const pool = weakEnglishPool();

test("topWeakKeys: 依次數排序、同次數依鍵名、忽略 0 與壞值", () => {
  const out = topWeakKeys({ q: 3, a: 3, z: 10, x: 0, y: -1, w: NaN, k: "5" }, 5);
  assert.deepEqual(out, [
    { key: "z", count: 10 },
    { key: "a", count: 3 },
    { key: "q", count: 3 },
  ]);
  assert.deepEqual(topWeakKeys(null), []);
  assert.deepEqual(topWeakKeys({ a: 1, b: 2, c: 3 }, 2).map((e) => e.key), ["c", "b"]);
});

test("scoreEnglishToken: 含弱點鍵的詞分數較高", () => {
  const w = new Map([["q", 5]]);
  assert.ok(scoreEnglishToken("quick", w) > 0);
  assert.equal(scoreEnglishToken("hello", w), 0);
  assert.ok(scoreEnglishToken("Q", w) > 0, "大寫也算同一個鍵");
});

test("英打弱點練習：固定種子產生固定結果", () => {
  const a = generateWeakEnglish({ z: 5, x: 3 }, pool, createRng(123));
  const b = generateWeakEnglish({ z: 5, x: 3 }, pool, createRng(123));
  assert.deepEqual(a, b);
  const c = generateWeakEnglish({ z: 5, x: 3 }, pool, createRng(124));
  assert.notEqual(a.text, c.text);
});

test("英打弱點練習：每個詞都含有弱點鍵，數量正確", () => {
  const r = generateWeakEnglish({ z: 5, x: 3 }, pool, createRng(1), { count: 20 });
  const words = r.text.split(" ");
  assert.equal(words.length, 20);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.keys, ["z", "x"]);
  for (const w of words) assert.ok(/[zxZX]/.test(w), w);
});

test("英打弱點練習：標點鍵也能練（; 和 大寫括號）", () => {
  const r = generateWeakEnglish({ ";": 9 }, pool, createRng(2), { count: 10 });
  for (const w of r.text.split(" ")) assert.ok(w.includes(";") || w.includes(":"), w);
});

test("英打弱點練習：錯誤次數多的鍵，對應的詞優先被選中", () => {
  const r = generateWeakEnglish({ z: 100, q: 1 }, pool, createRng(5), { count: 10 });
  const words = r.text.split(" ");
  const withZ = words.filter((w) => /[zZ]/.test(w)).length;
  const available = pool.filter((w) => /[zZ]/.test(w)).length;
  assert.equal(withZ, Math.min(10, available));
});

test("英打弱點練習：沒有歷史錯誤時退回隨機常用字（fallback）", () => {
  const r = generateWeakEnglish({}, pool, createRng(1), { count: 12 });
  assert.equal(r.fallback, true);
  assert.equal(r.text.split(" ").length, 12);
  assert.deepEqual(r.keys, []);
});

test("英打弱點練習：含弱點鍵的詞不夠多時仍補滿數量", () => {
  const r = generateWeakEnglish({ "`": 4 }, ["a`b", "cc", "dd"], createRng(1), { count: 6 });
  const words = r.text.split(" ");
  assert.equal(words.length, 6);
  assert.ok(words.every((w) => w === "a`b"));
});

test("注音弱點練習：挑出含弱點鍵最多的句子，固定種子可重現", () => {
  const zp = weakZhuyinPool();
  const a = generateWeakZhuyin({ 5: 10 }, zp, createRng(9), { count: 5 });
  const b = generateWeakZhuyin({ 5: 10 }, zp, createRng(9), { count: 5 });
  assert.deepEqual(a.items.map((s) => s.t), b.items.map((s) => s.t));
  assert.equal(a.items.length, 5);
  assert.equal(new Set(a.items.map((s) => s.t)).size, 5);
  for (const s of a.items) {
    const keys = s.seqs.flatMap((q) => q[0]);
    assert.ok(keys.includes("5"), s.t);
  }
});

test("注音弱點練習：聲調鍵（如 4）也算弱點", () => {
  const zp = weakZhuyinPool();
  const r = generateWeakZhuyin({ 7: 8 }, zp, createRng(3), { count: 4 });
  for (const s of r.items) assert.ok(s.z.includes("˙"), s.t);
});

test("注音弱點練習：沒有歷史錯誤時隨機挑句（fallback）", () => {
  const zp = weakZhuyinPool();
  const r = generateWeakZhuyin({}, zp, createRng(3), { count: 3 });
  assert.equal(r.fallback, true);
  assert.equal(r.items.length, 3);
});

test("注音弱點練習：句子不夠時用隨機句補滿", () => {
  const zp = weakZhuyinPool().slice(0, 6);
  const r = generateWeakZhuyin({ "-": 5 }, zp, createRng(3), { count: 4 });
  assert.equal(r.items.length, 4);
});
