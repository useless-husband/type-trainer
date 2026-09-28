import test from "node:test";
import assert from "node:assert/strict";
import { createEnglishSession, createZhuyinSession } from "../src/session.js";

function typeAll(session, keys, start = 0, step = 100) {
  let t = start;
  const results = [];
  for (const k of keys) {
    results.push(session.press(k, t));
    t += step;
  }
  return results;
}

test("英打嚴格模式：全部打對", () => {
  const s = createEnglishSession("hi you", { strict: true });
  typeAll(s, [..."hi you"]);
  assert.ok(s.finished);
  const st = s.stats(0);
  assert.equal(st.accuracy, 100);
  assert.equal(st.errors, 0);
  assert.equal(st.chars, 6);
});

test("英打嚴格模式：打錯不前進，錯誤記在『該按的鍵』上", () => {
  const s = createEnglishSession("cat", { strict: true });
  assert.equal(s.press("x", 0).type, "wrong");
  assert.equal(s.index, 0);
  assert.equal(s.press("c", 100).type, "done");
  assert.equal(s.press("a", 200).type, "done");
  assert.equal(s.press("z", 300).type, "wrong");
  assert.equal(s.press("t", 400).type, "done");
  assert.ok(s.finished);
  assert.deepEqual(s.errorKeys, { c: 1, t: 1 });
  assert.equal(s.errors, 2);
  assert.equal(s.keystrokes, 5);
  assert.equal(s.stats(400).accuracy, 60);
});

test("英打寬鬆模式：打錯也前進，該字標記為錯", () => {
  const s = createEnglishSession("ab", { strict: false });
  assert.equal(s.press("x", 0).type, "skip");
  assert.equal(s.index, 1);
  assert.equal(s.marks[0], "bad");
  assert.equal(s.press("b", 100).type, "done");
  assert.ok(s.finished);
  assert.equal(s.marks[1], "ok");
  assert.equal(s.stats(100).chars, 1);
  assert.equal(s.stats(100).accuracy, 50);
});

test("大寫字母的錯誤記在對應的字母鍵上；符號記在數字鍵上", () => {
  const s = createEnglishSession("A!", { strict: true });
  s.press("b", 0);
  s.press("A", 10);
  s.press("q", 20);
  assert.deepEqual(s.errorKeys, { a: 1, 1: 1 });
});

test("換行需要按 Enter", () => {
  const s = createEnglishSession("a\nb");
  typeAll(s, ["a", "Enter", "b"]);
  assert.ok(s.finished);
  assert.equal(s.errors, 0);
});

test("WPM 計算：60 個字元在 60 秒 = 12 WPM（時間由呼叫者傳入）", () => {
  const text = "a".repeat(60);
  const s = createEnglishSession(text);
  typeAll(s, [...text], 1000, 1000);
  assert.equal(s.stats(0).ms, 59000);
  const s2 = createEnglishSession("a".repeat(5));
  s2.press("a", 0);
  for (let i = 1; i < 5; i++) s2.press("a", i * 15000);
  assert.equal(s2.stats(0).ms, 60000);
  assert.equal(s2.stats(0).speed, 1);
});

test("計時從第一個按鍵開始，結束時鎖定", () => {
  const s = createEnglishSession("ab");
  assert.equal(s.stats(5000).ms, 0);
  s.press("a", 1000);
  assert.equal(s.stats(3000).ms, 2000);
  s.press("b", 4000);
  assert.equal(s.stats(999999).ms, 3000);
});

test("結束後再按鍵會被忽略", () => {
  const s = createEnglishSession("a");
  s.press("a", 0);
  const before = s.keystrokes;
  assert.equal(s.press("a", 10).type, "ignored");
  assert.equal(s.keystrokes, before);
});

test("progress 隨進度增加", () => {
  const s = createEnglishSession("abcd");
  assert.equal(s.progress, 0);
  s.press("a", 0);
  s.press("b", 1);
  assert.equal(s.progress, 0.5);
});

test("空白內容：一開始就結束、進度 100%", () => {
  const s = createEnglishSession("");
  assert.ok(s.finished);
  assert.equal(s.progress, 1);
  assert.equal(s.stats(0).speed, 0);
});

test("注音：你 ㄋㄧˇ = s u 3", () => {
  const { session } = createZhuyinSession([{ t: "你", z: "ㄋㄧˇ" }]);
  const r = typeAll(session, ["s", "u", "3"]);
  assert.deepEqual(r.map((x) => x.type), ["ok", "ok", "done"]);
  assert.ok(session.finished);
  assert.equal(session.stats(0).accuracy, 100);
});

test("注音：一聲要按空白，按別的聲調算錯", () => {
  const { session } = createZhuyinSession([{ t: "媽", z: "ㄇㄚ" }]);
  session.press("a", 0);
  session.press("8", 10);
  assert.equal(session.press("3", 20).type, "wrong");
  assert.equal(session.press(" ", 30).type, "done");
  assert.deepEqual(session.errorKeys, { " ": 1 });
});

test("注音：輕聲『了 ㄌㄜ˙』可以 7 先或 7 後", () => {
  const first = createZhuyinSession([{ t: "了", z: "ㄌㄜ˙" }]).session;
  typeAll(first, ["7", "x", "k"]);
  assert.ok(first.finished);
  assert.equal(first.errors, 0);
  const last = createZhuyinSession([{ t: "了", z: "ㄌㄜ˙" }]).session;
  typeAll(last, ["x", "k", "7"]);
  assert.ok(last.finished);
  assert.equal(last.errors, 0);
});

test("注音：輕聲打到一半，只接受同一種順序", () => {
  const { session } = createZhuyinSession([{ t: "了", z: "ㄌㄜ˙" }]);
  session.press("7", 0);
  assert.deepEqual(session.expectedKeys(), ["x"]);
  assert.equal(session.press("k", 10).type, "wrong");
});

test("注音：expectedKeys 在輕聲第一鍵同時允許 7 和聲母", () => {
  const { session } = createZhuyinSession([{ t: "了", z: "ㄌㄜ˙" }]);
  assert.deepEqual(session.expectedKeys().sort(), ["7", "x"]);
});

test("注音：嚴格模式打錯不前進，錯誤記在該按的鍵", () => {
  const { session } = createZhuyinSession([{ t: "你", z: "ㄋㄧˇ" }]);
  session.press("s", 0);
  assert.equal(session.press("j", 10).type, "wrong");
  assert.deepEqual(session.expectedKeys(), ["u"]);
  session.press("u", 20);
  session.press("3", 30);
  assert.ok(session.finished);
  assert.deepEqual(session.errorKeys, { u: 1 });
});

test("注音：寬鬆模式打錯會吃掉一格，整個字算錯後繼續下一個字", () => {
  const { session } = createZhuyinSession([{ t: "你好", z: "ㄋㄧˇ ㄏㄠˇ" }], { strict: false });
  session.press("s", 0);
  assert.equal(session.press("j", 10).type, "wrong");
  assert.equal(session.press("3", 20).type, "skip");
  assert.equal(session.marks[0], "bad");
  assert.equal(session.index, 1);
  typeAll(session, ["c", "l", "3"], 100);
  assert.ok(session.finished);
  assert.equal(session.stats(0).chars, 1);
});

test("注音：中文速度是 字/分（10 字、60 秒 = 10）", () => {
  const sentence = { t: "好好好好好好好好好好", z: Array(10).fill("ㄏㄠˇ").join(" ") };
  const { session } = createZhuyinSession([sentence]);
  let t = 0;
  for (let i = 0; i < 10; i++) {
    session.press("c", t);
    session.press("l", t);
    t += 6000;
    session.press("3", i === 9 ? 60000 : t);
  }
  assert.ok(session.finished);
  assert.equal(session.stats(0).ms, 60000);
  assert.equal(session.stats(0).speed, 10);
});

test("倒退鍵：只能收回目前音節裡已按的鍵", () => {
  const { session } = createZhuyinSession([{ t: "你好", z: "ㄋㄧˇ ㄏㄠˇ" }]);
  assert.equal(session.backspace(), false);
  session.press("s", 0);
  assert.equal(session.backspace(), true);
  assert.deepEqual(session.expectedKeys(), ["s"]);
  typeAll(session, ["s", "u", "3"]);
  assert.equal(session.index, 1);
  assert.equal(session.backspace(), false);
});

test("stats.errorKeys 是複本，改動不影響 session", () => {
  const s = createEnglishSession("a");
  s.press("b", 0);
  const st = s.stats(1);
  st.errorKeys.a = 999;
  assert.equal(s.errorKeys.a, 1);
});
