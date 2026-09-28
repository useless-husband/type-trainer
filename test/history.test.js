import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_STORED, STORAGE_KEY, addRecord, aggregateErrors, clearHistory, loadHistory, recentOf, sanitizeRecord,
} from "../src/history.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    _data: data,
  };
}

const rec = (over = {}) => ({
  t: 1700000000000, kind: "en", mode: "words", speed: 42.34, accuracy: 96.55, chars: 120, ms: 60000,
  errors: { a: 2, s: 1 }, ...over,
});

test("sanitizeRecord: 合格的紀錄會被整理（數字取到小數 1 位）", () => {
  const r = sanitizeRecord(rec());
  assert.equal(r.speed, 42.3);
  assert.equal(r.accuracy, 96.6);
  assert.deepEqual(r.errors, { a: 2, s: 1 });
});

test("sanitizeRecord: 缺欄位、型別錯、超出範圍都拒絕", () => {
  assert.equal(sanitizeRecord(null), null);
  assert.equal(sanitizeRecord("x"), null);
  assert.equal(sanitizeRecord([]), null);
  assert.equal(sanitizeRecord(rec({ t: "yesterday" })), null);
  assert.equal(sanitizeRecord(rec({ kind: "jp" })), null);
  assert.equal(sanitizeRecord(rec({ mode: "hack" })), null);
  assert.equal(sanitizeRecord(rec({ speed: NaN })), null);
  assert.equal(sanitizeRecord(rec({ speed: -1 })), null);
  assert.equal(sanitizeRecord(rec({ accuracy: 101 })), null);
  assert.equal(sanitizeRecord(rec({ chars: Infinity })), null);
  assert.equal(sanitizeRecord(rec({ ms: undefined })), null);
});

test("sanitizeRecord: 壞的 errors 會被清掉但紀錄保留", () => {
  assert.deepEqual(sanitizeRecord(rec({ errors: null })).errors, {});
  assert.deepEqual(sanitizeRecord(rec({ errors: [1, 2] })).errors, {});
  assert.deepEqual(sanitizeRecord(rec({ errors: { a: -1, b: 1.5, c: "3", d: 4 } })).errors, { d: 4 });
});

test("sanitizeRecord: __proto__ 鍵不會汙染物件原型", () => {
  const evil = JSON.parse('{"__proto__": 5, "a": 1}');
  const r = sanitizeRecord(rec({ errors: evil }));
  assert.deepEqual(r.errors, { a: 1 });
  assert.equal(Object.getPrototypeOf(r.errors), Object.prototype);
  assert.equal({}.polluted, undefined);
});

test("loadHistory: 沒有資料 → 空陣列", () => {
  assert.deepEqual(loadHistory(memoryStorage()), []);
  assert.deepEqual(loadHistory(null), []);
  assert.deepEqual(loadHistory(undefined), []);
});

test("loadHistory: 壞掉的 JSON 或非陣列 → 空陣列，不丟例外", () => {
  assert.deepEqual(loadHistory(memoryStorage({ [STORAGE_KEY]: "{not json" })), []);
  assert.deepEqual(loadHistory(memoryStorage({ [STORAGE_KEY]: '{"a":1}' })), []);
  assert.deepEqual(loadHistory(memoryStorage({ [STORAGE_KEY]: "null" })), []);
  assert.deepEqual(loadHistory(memoryStorage({ [STORAGE_KEY]: "42" })), []);
});

test("loadHistory: 陣列裡混了壞紀錄 → 只留下好的", () => {
  const text = JSON.stringify([rec(), { foo: 1 }, null, rec({ t: 1700000000001 }), "x"]);
  const list = loadHistory(memoryStorage({ [STORAGE_KEY]: text }));
  assert.equal(list.length, 2);
});

test("loadHistory: storage 丟例外時也安全", () => {
  const boom = { getItem() { throw new Error("denied"); } };
  assert.deepEqual(loadHistory(boom), []);
});

test("addRecord: 存檔後可以讀回來", () => {
  const st = memoryStorage();
  const list = addRecord(st, rec());
  assert.equal(list.length, 1);
  assert.deepEqual(loadHistory(st), list);
});

test("addRecord: 不合格的紀錄不會存進去", () => {
  const st = memoryStorage();
  assert.deepEqual(addRecord(st, { bad: true }), []);
  assert.equal(st._data.has(STORAGE_KEY), false);
});

test("addRecord: 超過上限時保留最新的", () => {
  const st = memoryStorage();
  for (let i = 0; i < MAX_STORED + 5; i++) addRecord(st, rec({ t: 1700000000000 + i }));
  const list = loadHistory(st);
  assert.equal(list.length, MAX_STORED);
  assert.equal(list.at(-1).t, 1700000000000 + MAX_STORED + 4);
  assert.equal(list[0].t, 1700000000005);
});

test("addRecord: setItem 失敗（例如容量滿了）時仍回傳記憶體中的清單，不丟例外", () => {
  const st = { getItem: () => null, setItem() { throw new Error("quota"); } };
  const list = addRecord(st, rec());
  assert.equal(list.length, 1);
});

test("clearHistory 清除資料", () => {
  const st = memoryStorage();
  addRecord(st, rec());
  assert.equal(clearHistory(st), true);
  assert.deepEqual(loadHistory(st), []);
  assert.equal(clearHistory({ removeItem() { throw new Error("x"); } }), false);
});

test("recentOf 與 aggregateErrors：依類別過濾，只看最近 n 次", () => {
  const h = [
    rec({ t: 1, kind: "en", errors: { a: 1 } }),
    rec({ t: 2, kind: "zh", mode: "zhuyin", errors: { 5: 4 } }),
    rec({ t: 3, kind: "en", errors: { a: 2, b: 1 } }),
    rec({ t: 4, kind: "en", errors: { b: 5 } }),
  ].map(sanitizeRecord);
  assert.equal(recentOf(h, "en").length, 3);
  assert.deepEqual(aggregateErrors(h, "en"), { a: 3, b: 6 });
  assert.deepEqual(aggregateErrors(h, "en", 2), { a: 2, b: 6 });
  assert.deepEqual(aggregateErrors(h, "zh"), { 5: 4 });
  assert.deepEqual(aggregateErrors([], "en"), {});
});
