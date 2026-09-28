// 注音：大千（標準）鍵位、音節解析與合法性檢查、把句子轉成「要按哪些鍵」。

/** 大千鍵位：鍵 → 注音符號（聲調鍵另外處理）。 */
export const DACHEN = {
  1: "ㄅ", q: "ㄆ", a: "ㄇ", z: "ㄈ",
  2: "ㄉ", w: "ㄊ", s: "ㄋ", x: "ㄌ",
  e: "ㄍ", d: "ㄎ", c: "ㄏ",
  r: "ㄐ", f: "ㄑ", v: "ㄒ",
  5: "ㄓ", t: "ㄔ", g: "ㄕ", b: "ㄖ",
  y: "ㄗ", h: "ㄘ", n: "ㄙ",
  u: "ㄧ", j: "ㄨ", m: "ㄩ",
  8: "ㄚ", i: "ㄛ", k: "ㄜ", ",": "ㄝ",
  9: "ㄞ", o: "ㄟ", l: "ㄠ", ".": "ㄡ",
  0: "ㄢ", p: "ㄣ", ";": "ㄤ", "/": "ㄥ",
  "-": "ㄦ",
};

/** 聲調鍵：二聲 6、三聲 3、四聲 4、輕聲 7；一聲按空白。 */
export const TONE_KEYS = { "ˊ": "6", "ˇ": "3", "ˋ": "4", "˙": "7" };
export const TONE_OF_KEY = { 6: "ˊ", 3: "ˇ", 4: "ˋ", 7: "˙", " ": "ˉ" };

/** 注音符號 → 鍵（含聲調符號）。 */
export const KEY_OF_SYMBOL = {};
for (const [k, v] of Object.entries(DACHEN)) KEY_OF_SYMBOL[v] = k;
Object.assign(KEY_OF_SYMBOL, TONE_KEYS);

const INITIALS = "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ";
const BASE_SET = new Set(Object.values(DACHEN));

const w = (s) => s.split(" ");
// 每一類聲母後面允許接的韻母（含介音）。'' 代表只有聲母（僅舌尖音可以）。
const RIMES = {
  none: w("ㄚ ㄛ ㄜ ㄝ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄦ ㄧ ㄧㄚ ㄧㄛ ㄧㄝ ㄧㄞ ㄧㄠ ㄧㄡ ㄧㄢ ㄧㄣ ㄧㄤ ㄧㄥ ㄨ ㄨㄚ ㄨㄛ ㄨㄞ ㄨㄟ ㄨㄢ ㄨㄣ ㄨㄤ ㄨㄥ ㄩ ㄩㄝ ㄩㄢ ㄩㄣ ㄩㄥ"),
  f: w("ㄚ ㄛ ㄟ ㄡ ㄢ ㄣ ㄤ ㄥ ㄨ"),
  bpmf: w("ㄚ ㄛ ㄜ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄧ ㄧㄝ ㄧㄠ ㄧㄡ ㄧㄢ ㄧㄣ ㄧㄥ ㄨ"),
  dtnl: w("ㄚ ㄛ ㄜ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄧ ㄧㄚ ㄧㄝ ㄧㄠ ㄧㄡ ㄧㄢ ㄧㄣ ㄧㄤ ㄧㄥ ㄨ ㄨㄛ ㄨㄟ ㄨㄢ ㄨㄣ ㄨㄥ ㄩ ㄩㄝ ㄩㄢ ㄩㄣ"),
  gkh: w("ㄚ ㄜ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄨ ㄨㄚ ㄨㄛ ㄨㄞ ㄨㄟ ㄨㄢ ㄨㄣ ㄨㄤ ㄨㄥ"),
  jqx: w("ㄧ ㄧㄚ ㄧㄝ ㄧㄠ ㄧㄡ ㄧㄢ ㄧㄣ ㄧㄤ ㄧㄥ ㄩ ㄩㄝ ㄩㄢ ㄩㄣ ㄩㄥ"),
  zcs: w(" ㄚ ㄜ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄨ ㄨㄚ ㄨㄛ ㄨㄞ ㄨㄟ ㄨㄢ ㄨㄣ ㄨㄤ ㄨㄥ"), // 開頭的空字串 = 只有聲母
};
RIMES.zcs[0] = "";

function initialClass(ini) {
  if (ini === "") return "none";
  if (ini === "ㄈ") return "f";
  if ("ㄅㄆㄇ".includes(ini)) return "bpmf";
  if ("ㄉㄊㄋㄌ".includes(ini)) return "dtnl";
  if ("ㄍㄎㄏ".includes(ini)) return "gkh";
  if ("ㄐㄑㄒ".includes(ini)) return "jqx";
  return "zcs";
}

/**
 * 解析一個音節字串，例如 "ㄋㄧˇ"、"˙ㄉㄜ"、"ㄇㄚ"（一聲）。
 * 回傳 { body, tone }：body 是不含聲調的符號、tone 是 1–5（5 = 輕聲）；無法解析回 null。
 */
export function parseSyllable(str) {
  if (typeof str !== "string" || str.length === 0) return null;
  let tone = 1;
  let body = "";
  for (const ch of str) {
    if (ch === "ˊ") tone = 2;
    else if (ch === "ˇ") tone = 3;
    else if (ch === "ˋ") tone = 4;
    else if (ch === "˙") tone = 5;
    else if (BASE_SET.has(ch)) body += ch;
    else return null;
  }
  if (body.length === 0) return null;
  // 聲調符號只能各出現一次
  const marks = [...str].filter((c) => c in TONE_KEYS).length;
  if (marks > 1) return null;
  return { body, tone };
}

/** 音節（不含聲調）是否為合法的國語音節，例如 ㄋㄧ 合法、ㄅㄩ 不合法。 */
export function isValidBody(body) {
  if (typeof body !== "string" || body.length === 0) return false;
  const first = body[0];
  const hasInitial = INITIALS.includes(first);
  const ini = hasInitial ? first : "";
  const rime = hasInitial ? body.slice(1) : body;
  return RIMES[initialClass(ini)].includes(rime);
}

/** 完整音節（含聲調符號）是否合法。 */
export function isValidSyllable(str) {
  const p = parseSyllable(str);
  return p !== null && isValidBody(p.body);
}

/**
 * 一個音節可以接受的按鍵序列（陣列的陣列）。
 * 一聲 → 空白結尾；輕聲 → 「7」可以打在前面（˙ㄇㄚ）或後面（ㄇㄚ˙）。
 */
export function syllableKeySeqs(str) {
  const p = parseSyllable(str);
  if (!p) throw new Error(`不合法的注音：${str}`);
  const keys = [...p.body].map((s) => KEY_OF_SYMBOL[s]);
  if (p.tone === 1) return [[...keys, " "]];
  if (p.tone === 5) return [["7", ...keys], [...keys, "7"]];
  const toneKey = { 2: "6", 3: "3", 4: "4" }[p.tone];
  return [[...keys, toneKey]];
}

/** 把已按的鍵轉成注音符號（顯示用）。一聲的空白顯示成 ˉ。 */
export function keysToDisplay(keys) {
  return keys.map((k) => DACHEN[k] ?? TONE_OF_KEY[k] ?? "").join("");
}

const HAN = /\p{Script=Han}/u;

/** 是不是漢字（要打的字）。標點與其他符號不用打。 */
export function isHan(ch) {
  return HAN.test(ch);
}

/**
 * 把一批句子 [{ t, z }] 轉成練習計畫：
 *   cells：畫面上每個字元 { ch, zy, unit }，unit 是要打的單元編號，標點為 -1
 *   units：每個漢字一個單元 { label, seqs, weight: 1 }
 */
export function buildZhuyinPlan(sentences) {
  const cells = [];
  const units = [];
  sentences.forEach((s, si) => {
    const syl = s.z.split(" ");
    let n = 0;
    for (const ch of s.t) {
      if (isHan(ch)) {
        const zy = syl[n++];
        cells.push({ ch, zy, unit: units.length });
        units.push({ label: zy, seqs: syllableKeySeqs(zy), weight: 1 });
      } else {
        cells.push({ ch, zy: null, unit: -1 });
      }
    }
    if (n !== syl.length) throw new Error(`注音數量與漢字不符：${s.t}`);
    if (si < sentences.length - 1) cells.push({ ch: "\n", zy: null, unit: -1 });
  });
  return { cells, units };
}
