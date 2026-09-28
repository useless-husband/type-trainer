// 練習流程：一場練習就是一串「單元」，每個單元有一個以上可接受的按鍵序列。
// 英打的單元是一個字元；注音的單元是一個音節（例如 ㄋㄧˇ = s u 3）。
// 時間一律由呼叫者傳入（毫秒），因此測試可以完全決定性。

import { accuracy, cpm, round1, wpm } from "./stats.js";
import { englishKeyId, englishUnits } from "./text.js";
import { buildZhuyinPlan } from "./zhuyin.js";

function isPrefix(prefix, seq) {
  if (prefix.length > seq.length) return false;
  for (let i = 0; i < prefix.length; i++) if (prefix[i] !== seq[i]) return false;
  return true;
}

export class Session {
  /**
   * @param units   [{ label, seqs: string[][], weight }]
   * @param opts.strict      true = 必須打對才能前進；false = 錯了也前進，最後統計
   * @param opts.kind        "en"（WPM）或 "zh"（字/分）
   * @param opts.normalizeKey 把按鍵轉成熱圖用的鍵 id
   */
  constructor(units, { strict = true, kind = "en", normalizeKey = (k) => k } = {}) {
    this.units = units;
    this.strict = strict;
    this.kind = kind;
    this.normalizeKey = normalizeKey;
    this.index = 0;
    this.buffer = [];
    this.bad = false;
    this.marks = new Array(units.length).fill(null); // "ok" | "bad" | null
    this.startTime = null;
    this.endTime = null;
    this.keystrokes = 0;
    this.errors = 0;
    this.errorKeys = {};
    this.correctChars = 0;
    if (units.length === 0) this.endTime = 0;
  }

  get finished() {
    return this.index >= this.units.length;
  }

  get currentUnit() {
    return this.units[this.index] ?? null;
  }

  /** 目前這個單元裡，還可能符合的按鍵序列。 */
  _candidates() {
    const unit = this.currentUnit;
    if (!unit) return [];
    const c = unit.seqs.filter((s) => isPrefix(this.buffer, s));
    return c.length > 0 ? c : unit.seqs;
  }

  /** 下一個應該按的鍵（多個可接受時回傳全部，不重複）。 */
  expectedKeys() {
    if (this.finished) return [];
    const pos = this.buffer.length;
    const keys = new Set();
    for (const s of this._candidates()) if (pos < s.length) keys.add(s[pos]);
    return [...keys];
  }

  /**
   * 送出一個按鍵。回傳 { type }：
   *   "ok"     按對了（單元還沒打完）
   *   "done"   按對了且這個單元完成
   *   "wrong"  按錯了（嚴格模式：不前進；寬鬆模式：這一格算錯，繼續）
   *   "skip"   寬鬆模式下按錯且單元因此結束
   *   "ignored" 已經結束
   */
  press(key, now) {
    if (this.finished) return { type: "ignored" };
    if (this.startTime === null) this.startTime = now;
    const unit = this.currentUnit;
    const pos = this.buffer.length;
    const cands = this._candidates();
    const hit = !this.bad && cands.some((s) => s[pos] === key);
    this.keystrokes++;

    if (!hit) {
      this.errors++;
      const expected = this.normalizeKey(cands[0][pos]);
      this.errorKeys[expected] = (this.errorKeys[expected] ?? 0) + 1;
      if (this.strict) return { type: "wrong", expected: cands[0][pos] };
      this.bad = true;
      this.buffer.push(key);
      if (this.buffer.length >= unit.seqs[0].length) {
        this._complete("bad", now);
        return { type: "skip" };
      }
      return { type: "wrong", expected: cands[0][pos] };
    }

    this.buffer.push(key);
    if (cands.some((s) => s.length === this.buffer.length && isPrefix(this.buffer, s))) {
      this._complete("ok", now);
      return { type: "done" };
    }
    return { type: "ok" };
  }

  _complete(mark, now) {
    this.marks[this.index] = mark;
    if (mark === "ok") this.correctChars += this.units[this.index].weight;
    this.index++;
    this.buffer = [];
    this.bad = false;
    if (this.finished) this.endTime = now;
  }

  /** 倒退鍵：只能收回目前這個單元裡已按的鍵。 */
  backspace() {
    if (this.finished || this.buffer.length === 0) return false;
    this.buffer.pop();
    this.bad = this.buffer.length > 0 && !this.currentUnit.seqs.some((s) => isPrefix(this.buffer, s));
    return true;
  }

  get progress() {
    return this.units.length === 0 ? 1 : this.index / this.units.length;
  }

  elapsed(now) {
    if (this.startTime === null) return 0;
    return Math.max(0, (this.endTime ?? now) - this.startTime);
  }

  /** 目前的統計數字。speed 在英打是 WPM、在中文是 字/分。 */
  stats(now) {
    const ms = this.elapsed(now);
    const speed = this.kind === "zh" ? cpm(this.correctChars, ms) : wpm(this.correctChars, ms);
    return {
      ms,
      speed: round1(speed),
      accuracy: round1(accuracy(this.keystrokes, this.errors)),
      keystrokes: this.keystrokes,
      errors: this.errors,
      chars: this.correctChars,
      total: this.units.length,
      progress: this.progress,
      errorKeys: { ...this.errorKeys },
    };
  }
}

/** 英打：一段文字，每個字元一個單元。 */
export function createEnglishSession(text, { strict = true } = {}) {
  return new Session(englishUnits(text), { strict, kind: "en", normalizeKey: englishKeyId });
}

/** 注音：一批句子 [{ t, z }]。回傳 session 與畫面要用的 cells。 */
export function createZhuyinSession(sentences, { strict = true } = {}) {
  const { cells, units } = buildZhuyinPlan(sentences);
  return { session: new Session(units, { strict, kind: "zh" }), cells };
}
