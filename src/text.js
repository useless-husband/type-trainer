// 練習文字的處理：自訂文字正規化、英文單元。

import { isTypeable, keyForChar } from "./keyboard.js";

export const MAX_CUSTOM_CHARS = 2000;

const REPLACEMENTS = [
  [/[‘’‛′]/g, "'"],
  [/[“”‟″]/g, '"'],
  [/[–—−]/g, "-"],
  [/…/g, "..."],
  [/[  - 　]/g, " "],
];

/**
 * 把貼上的文字整理成「美式鍵盤打得出來」的樣子：
 * 換成一般引號與破折號、Tab 變空白、多個空白合成一個、去掉頭尾空白與空行、
 * 移除打不出來的字元，最後截到 MAX_CUSTOM_CHARS。
 */
export function normalizeCustomText(input, max = MAX_CUSTOM_CHARS) {
  if (typeof input !== "string") return "";
  let s = input.replace(/\r\n?/g, "\n");
  for (const [re, to] of REPLACEMENTS) s = s.replace(re, to);
  s = s.replace(/\t/g, " ");
  s = [...s].filter((c) => isTypeable(c)).join("");
  const lines = s
    .split("\n")
    .map((l) => l.replace(/ {2,}/g, " ").trim())
    .filter((l) => l.length > 0);
  s = lines.join("\n");
  if (s.length > max) s = s.slice(0, max).trimEnd();
  return s;
}

/** 英文文字 → 練習單元（每個字元一個單元）。 */
export function englishUnits(text) {
  return [...text].map((ch) => ({
    label: ch,
    seqs: [[ch === "\n" ? "Enter" : ch]],
    weight: 1,
  }));
}

/** 英文單元的按鍵 → 熱圖用的實體鍵 id（大寫 A 算 a 鍵、! 算 1 鍵）。 */
export function englishKeyId(key) {
  if (key === "Enter") return "Enter";
  return keyForChar(key)?.id ?? key;
}
