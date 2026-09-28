import test from "node:test";
import assert from "node:assert/strict";
import { accuracy, cpm, formatDuration, round1, wpm } from "../src/stats.js";

test("wpm: 300 個正確字元在 1 分鐘 = 60 WPM", () => {
  assert.equal(wpm(300, 60000), 60);
});

test("wpm: 半分鐘打 50 個字元 = 20 WPM", () => {
  assert.equal(wpm(50, 30000), 20);
});

test("wpm: 沒有時間或沒有字元時為 0，不會出現 Infinity/NaN", () => {
  assert.equal(wpm(10, 0), 0);
  assert.equal(wpm(0, 1000), 0);
  assert.equal(wpm(10, -5), 0);
  assert.equal(wpm(NaN, 1000), 0);
});

test("cpm: 30 個字在 30 秒 = 60 字/分", () => {
  assert.equal(cpm(30, 30000), 60);
  assert.equal(cpm(0, 30000), 0);
  assert.equal(cpm(5, 0), 0);
});

test("accuracy: 100 次按鍵錯 5 次 = 95%", () => {
  assert.equal(accuracy(100, 5), 95);
});

test("accuracy: 沒按鍵時為 100，錯誤數超過按鍵數時不會小於 0", () => {
  assert.equal(accuracy(0, 0), 100);
  assert.equal(accuracy(10, 20), 0);
  assert.equal(accuracy(10, -3), 100);
});

test("round1 與 formatDuration", () => {
  assert.equal(round1(12.345), 12.3);
  assert.equal(round1(12.35), 12.4);
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65000), "1:05");
  assert.equal(formatDuration(600000), "10:00");
  assert.equal(formatDuration(-100), "0:00");
});
