// 練習歷史：存在 localStorage。讀到壞資料時要能安全地忽略，不能讓程式當掉。

export const STORAGE_KEY = "type-trainer:history:v1";
export const MAX_STORED = 100;
export const CHART_COUNT = 30;

const KINDS = new Set(["en", "zh"]);
const MODES = new Set(["words", "sentences", "code", "custom", "zhuyin", "weak"]);

function finite(n, lo, hi) {
  return typeof n === "number" && Number.isFinite(n) && n >= lo && n <= hi;
}

/** 檢查並整理一筆紀錄；不合格就回 null。 */
export function sanitizeRecord(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { t, kind, mode, speed, accuracy, chars, ms, errors } = raw;
  if (!finite(t, 1, 8.64e15)) return null;
  if (!KINDS.has(kind) || !MODES.has(mode)) return null;
  if (!finite(speed, 0, 5000) || !finite(accuracy, 0, 100)) return null;
  if (!finite(chars, 0, 1e6) || !finite(ms, 0, 1e9)) return null;
  const cleanErrors = {};
  if (errors !== null && typeof errors === "object" && !Array.isArray(errors)) {
    let n = 0;
    for (const [k, v] of Object.entries(errors)) {
      if (n >= 80) break;
      if (k === "__proto__" || k.length === 0 || k.length > 12) continue;
      if (!Number.isInteger(v) || v <= 0 || v > 1e6) continue;
      cleanErrors[k] = v;
      n++;
    }
  }
  return {
    t: Math.floor(t),
    kind,
    mode,
    speed: Math.round(speed * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    chars: Math.floor(chars),
    ms: Math.floor(ms),
    errors: cleanErrors,
  };
}

/** 讀取歷史；storage 壞了、內容不是 JSON、格式不對，都回傳空陣列或只留下合格的紀錄。 */
export function loadHistory(storage) {
  let text = null;
  try {
    text = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return [];
  }
  if (text === null) return [];
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const item of data) {
    const rec = sanitizeRecord(item);
    if (rec) out.push(rec);
  }
  return out.slice(-MAX_STORED);
}

function persist(storage, list) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** 新增一筆紀錄並存檔；回傳更新後的歷史。紀錄不合格時不新增。 */
export function addRecord(storage, record) {
  const list = loadHistory(storage);
  const rec = sanitizeRecord(record);
  if (!rec) return list;
  list.push(rec);
  const trimmed = list.slice(-MAX_STORED);
  persist(storage, trimmed);
  return trimmed;
}

/** 清除歷史。 */
export function clearHistory(storage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** 某一類（en / zh）最近 n 次紀錄，舊到新。 */
export function recentOf(history, kind, n = CHART_COUNT) {
  return history.filter((r) => r.kind === kind).slice(-n);
}

/** 把最近 n 次某類紀錄的錯誤次數加總。 */
export function aggregateErrors(history, kind, n = CHART_COUNT) {
  const total = {};
  for (const r of recentOf(history, kind, n)) {
    for (const [k, v] of Object.entries(r.errors)) total[k] = (total[k] ?? 0) + v;
  }
  return total;
}
