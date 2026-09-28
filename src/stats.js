// 打字統計：速度與正確率。全部是純函式，時間由呼叫者傳入（毫秒）。

/** 英打慣例：5 個字元算 1 個「字」（word）。 */
export const CHARS_PER_WORD = 5;

/** 每分鐘字數 WPM。correctChars 是「打對的字元數」。 */
export function wpm(correctChars, ms) {
  if (!(ms > 0) || !(correctChars > 0)) return 0;
  return correctChars / CHARS_PER_WORD / (ms / 60000);
}

/** 中文速度：每分鐘打對幾個字（字/分）。 */
export function cpm(chars, ms) {
  if (!(ms > 0) || !(chars > 0)) return 0;
  return chars / (ms / 60000);
}

/** 正確率（0–100）：(按鍵總數 − 錯誤數) / 按鍵總數。沒按過任何鍵時為 100。 */
export function accuracy(totalKeystrokes, errors) {
  if (!(totalKeystrokes > 0)) return 100;
  const ok = Math.max(0, totalKeystrokes - Math.max(0, errors));
  return (ok / totalKeystrokes) * 100;
}

/** 四捨五入到小數 1 位。 */
export function round1(n) {
  return Math.round(n * 10) / 10;
}

/** 把毫秒格式化成 m:ss。 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
