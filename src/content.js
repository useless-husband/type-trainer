// 依題庫組出一場練習要打的內容。所有隨機都透過傳入的 rng，測試時用固定種子。

import { CODE_SNIPPETS } from "./data/code.js";
import { SENTENCES_EN } from "./data/sentences-en.js";
import { SENTENCES_ZH } from "./data/sentences-zh.js";
import { WORDS } from "./data/words.js";
import { sample } from "./rng.js";
import { syllableKeySeqs } from "./zhuyin.js";

export const ZH_TOPICS = {
  all: "全部主題",
  daily: "日常生活",
  school: "校園",
  taiwan: "台灣地名與美食",
};

/** 常用單字：隨機 n 個，以空白相連。 */
export function wordsText(rng, n = 30) {
  return sample(rng, WORDS, n).join(" ");
}

/** 英文句子：隨機 n 句，以空白相連。 */
export function sentencesText(rng, n = 4) {
  return sample(rng, SENTENCES_EN, n).join(" ");
}

/** 程式碼片段：隨機 n 行，以換行相連（要按 Enter）。 */
export function codeText(rng, n = 4) {
  return sample(rng, CODE_SNIPPETS, n).join("\n");
}

/** 中文句子（含注音）：依主題隨機 n 句。 */
export function zhuyinSentences(rng, topic = "all", n = 5) {
  const pool = topic === "all" ? SENTENCES_ZH : SENTENCES_ZH.filter((s) => s.c === topic);
  return sample(rng, pool.length > 0 ? pool : SENTENCES_ZH, n);
}

/** 弱點練習可用的英文詞庫：常用字＋句子與程式碼裡出現的詞（含標點符號）。 */
export function weakEnglishPool() {
  const set = new Set(WORDS);
  for (const line of [...SENTENCES_EN, ...CODE_SNIPPETS]) {
    for (const tok of line.split(/\s+/)) if (tok.length > 0) set.add(tok);
  }
  return [...set];
}

/** 弱點練習用的中文題庫：每句多帶一份每個音節的按鍵序列。 */
export function weakZhuyinPool() {
  return SENTENCES_ZH.map((s) => ({ ...s, seqs: s.z.split(" ").map(syllableKeySeqs) }));
}
