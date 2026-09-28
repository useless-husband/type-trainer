import test from "node:test";
import assert from "node:assert/strict";
import { englishKeyId, englishUnits, normalizeCustomText } from "../src/text.js";

test("normalizeCustomText: 彎引號與破折號換成一般字元", () => {
  assert.equal(normalizeCustomText("“Hi” — it’s ok…"), '"Hi" - it\'s ok...');
});

test("normalizeCustomText: 多個空白合併、頭尾去空白、Tab 變空白", () => {
  assert.equal(normalizeCustomText("  a   b\tc  "), "a b c");
});

test("normalizeCustomText: 空行移除、換行保留為單一換行", () => {
  assert.equal(normalizeCustomText("a\r\n\r\n\r\nb\n  c  "), "a\nb\nc");
});

test("normalizeCustomText: 打不出來的字元被移除", () => {
  assert.equal(normalizeCustomText("café 你好 ok"), "caf ok");
});

test("normalizeCustomText: 非字串與超長輸入", () => {
  assert.equal(normalizeCustomText(null), "");
  assert.equal(normalizeCustomText(123), "");
  const long = "abcd ".repeat(1000);
  assert.ok(normalizeCustomText(long).length <= 2000);
  assert.equal(normalizeCustomText("hello world", 5), "hello");
});

test("englishUnits: 一字元一單元，換行對應 Enter", () => {
  const u = englishUnits("a\nB");
  assert.equal(u.length, 3);
  assert.deepEqual(u[1].seqs, [["Enter"]]);
  assert.deepEqual(u[2].seqs, [["B"]]);
});

test("englishKeyId: 大寫與符號對應到實體鍵", () => {
  assert.equal(englishKeyId("A"), "a");
  assert.equal(englishKeyId("?"), "/");
  assert.equal(englishKeyId("Enter"), "Enter");
  assert.equal(englishKeyId(" "), " ");
});
