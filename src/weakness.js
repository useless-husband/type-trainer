// 弱點練習：從歷史錯誤統計挑出最常錯的鍵，產生含有這些鍵的練習內容。

import { weightedSample, sample } from "./rng.js";
import { englishKeyId } from "./text.js";

/** 最常錯的 n 個鍵，依錯誤次數多到少、同次數依鍵名排序。 */
export function topWeakKeys(errors, n = 5) {
  return Object.entries(errors ?? {})
    .filter(([, c]) => Number.isFinite(c) && c > 0)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, n);
}

function weightMap(weak) {
  const m = new Map();
  for (const { key, count } of weak) m.set(key, count);
  return m;
}

/** 一個英文詞含有多少「弱點鍵」（依錯誤次數加權），除以長度的平方根讓短詞不吃虧。 */
export function scoreEnglishToken(token, weights) {
  let s = 0;
  for (const ch of token) s += weights.get(englishKeyId(ch)) ?? 0;
  return s / Math.sqrt(Math.max(1, token.length));
}

/**
 * 英打弱點練習。
 * @returns { text, keys, fallback }  fallback = true 表示沒有歷史錯誤，改為隨機常用字
 */
export function generateWeakEnglish(errors, pool, rng, { count = 24, topKeys = 5 } = {}) {
  const weak = topWeakKeys(errors, topKeys);
  if (weak.length === 0) {
    return { text: sample(rng, pool, count).join(" "), keys: [], fallback: true };
  }
  const weights = weightMap(weak);
  const scored = pool.map((tok, i) => ({ tok, i, s: scoreEnglishToken(tok, weights) })).filter((e) => e.s > 0);
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  const top = scored.slice(0, Math.max(count * 4, 60));
  let picked = weightedSample(rng, top, top.map((e) => e.s), count).map((e) => e.tok);
  if (picked.length < count) {
    // 含弱點鍵的詞不夠多：重複挑選補滿，讓弱點鍵多練幾次
    const src = picked.length > 0 ? picked : sample(rng, pool, count);
    const out = picked.slice();
    while (out.length < count) out.push(src[out.length % src.length]);
    picked = out;
  }
  return { text: picked.join(" "), keys: weak.map((w) => w.key), fallback: false };
}

/** 一句中文含有多少弱點鍵（看每個音節的第一種按法）。 */
export function scoreZhuyinSentence(unitSeqs, weights) {
  let s = 0;
  for (const seqs of unitSeqs) for (const k of seqs[0]) s += weights.get(k) ?? 0;
  return s / Math.sqrt(Math.max(1, unitSeqs.length));
}

/**
 * 注音弱點練習：挑出含最多弱點鍵的句子。
 * @param sentences [{ t, z, seqs: string[][][] }]  seqs 為每個音節的按鍵序列（見 zhuyin.syllableKeySeqs）
 * @returns { items, keys, fallback }  items 是被選中的句子物件
 */
export function generateWeakZhuyin(errors, sentences, rng, { count = 5, topKeys = 5 } = {}) {
  const weak = topWeakKeys(errors, topKeys);
  if (weak.length === 0) return { items: sample(rng, sentences, count), keys: [], fallback: true };
  const weights = weightMap(weak);
  const scores = sentences.map((s) => scoreZhuyinSentence(s.seqs, weights));
  const idx = sentences.map((_, i) => i).filter((i) => scores[i] > 0);
  idx.sort((a, b) => scores[b] - scores[a] || a - b);
  const top = idx.slice(0, Math.max(count * 6, 30));
  const chosen = weightedSample(rng, top, top.map((i) => scores[i]), count).map((i) => sentences[i]);
  if (chosen.length < count) {
    const rest = sentences.filter((s) => !chosen.includes(s));
    chosen.push(...sample(rng, rest, count - chosen.length));
  }
  return { items: chosen, keys: weak.map((w) => w.key), fallback: false };
}
