import test from "node:test";
import assert from "node:assert/strict";
import { ZH_TOPICS, codeText, sentencesText, wordsText, zhuyinSentences } from "../src/content.js";
import { createRng } from "../src/rng.js";
import { isTypeable } from "../src/keyboard.js";

test("wordsText: 固定種子、固定字數", () => {
  assert.equal(wordsText(createRng(1), 30), wordsText(createRng(1), 30));
  assert.equal(wordsText(createRng(1), 30).split(" ").length, 30);
  assert.notEqual(wordsText(createRng(1), 30), wordsText(createRng(2), 30));
});

test("sentencesText: 句數正確、可打", () => {
  const t = sentencesText(createRng(4), 3);
  assert.ok([...t].every(isTypeable));
  assert.ok(t.length > 60);
});

test("codeText: 以換行相連，行數正確", () => {
  const t = codeText(createRng(4), 4);
  assert.equal(t.split("\n").length, 4);
  assert.ok([...t].every(isTypeable));
});

test("zhuyinSentences: 依主題篩選", () => {
  for (const topic of ["daily", "school", "taiwan"]) {
    const out = zhuyinSentences(createRng(8), topic, 5);
    assert.equal(out.length, 5);
    assert.ok(out.every((s) => s.c === topic));
  }
  assert.equal(zhuyinSentences(createRng(8), "all", 7).length, 7);
});

test("zhuyinSentences: 未知主題退回全部題庫；固定種子可重現", () => {
  assert.equal(zhuyinSentences(createRng(8), "nope", 3).length, 3);
  const a = zhuyinSentences(createRng(3), "all", 5).map((s) => s.t);
  const b = zhuyinSentences(createRng(3), "all", 5).map((s) => s.t);
  assert.deepEqual(a, b);
});

test("ZH_TOPICS 含所有主題", () => {
  assert.deepEqual(Object.keys(ZH_TOPICS), ["all", "daily", "school", "taiwan"]);
});
