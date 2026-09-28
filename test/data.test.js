import test from "node:test";
import assert from "node:assert/strict";
import { CODE_SNIPPETS } from "../src/data/code.js";
import { SENTENCES_EN } from "../src/data/sentences-en.js";
import { SENTENCES_ZH } from "../src/data/sentences-zh.js";
import { WORDS } from "../src/data/words.js";
import { isTypeable } from "../src/keyboard.js";
import { isHan, isValidSyllable, parseSyllable, syllableKeySeqs } from "../src/zhuyin.js";

test("單字表：剛好 1000 個、全小寫字母、不重複", () => {
  assert.equal(WORDS.length, 1000);
  assert.equal(new Set(WORDS).size, 1000);
  for (const w of WORDS) assert.match(w, /^[a-z]+$/, w);
});

test("英文句子：至少 100 句、不重複、全部打得出來、長度合理", () => {
  assert.ok(SENTENCES_EN.length >= 100);
  assert.equal(new Set(SENTENCES_EN).size, SENTENCES_EN.length);
  for (const s of SENTENCES_EN) {
    assert.ok([...s].every(isTypeable), s);
    assert.ok(s.length >= 15 && s.length <= 120, s);
    assert.equal(s, s.trim());
    assert.ok(/[.?!]$/.test(s), s);
  }
});

test("程式碼片段：至少 40 行、不重複、單行、不以空白開頭、全部打得出來", () => {
  assert.ok(CODE_SNIPPETS.length >= 40);
  assert.equal(new Set(CODE_SNIPPETS).size, CODE_SNIPPETS.length);
  for (const c of CODE_SNIPPETS) {
    assert.ok([...c].every((ch) => isTypeable(ch) && ch !== "\n"), c);
    assert.equal(c, c.trim());
    assert.ok(c.length <= 100, c);
  }
});

test("中文句子：至少 150 句、不重複、三個主題都有", () => {
  assert.ok(SENTENCES_ZH.length >= 150);
  assert.equal(new Set(SENTENCES_ZH.map((s) => s.t)).size, SENTENCES_ZH.length);
  const cats = new Set(SENTENCES_ZH.map((s) => s.c));
  assert.deepEqual([...cats].sort(), ["daily", "school", "taiwan"]);
  for (const c of cats) assert.ok(SENTENCES_ZH.filter((s) => s.c === c).length >= 40, c);
});

test("中文句子：欄位齊全、格式正確", () => {
  for (const s of SENTENCES_ZH) {
    assert.equal(typeof s.t, "string");
    assert.equal(typeof s.z, "string");
    assert.equal(s.t, s.t.trim());
    assert.ok(s.t.length >= 5 && s.t.length <= 30, s.t);
    assert.ok(!/  /.test(s.z) && s.z === s.z.trim(), s.t);
  }
});

test("中文句子：注音音節數 = 漢字數", () => {
  for (const s of SENTENCES_ZH) {
    const han = [...s.t].filter(isHan).length;
    assert.equal(s.z.split(" ").length, han, s.t);
  }
});

test("中文句子：每一個音節都是合法注音，並能轉成按鍵序列", () => {
  for (const s of SENTENCES_ZH) {
    for (const syl of s.z.split(" ")) {
      assert.ok(isValidSyllable(syl), `${s.t} -> ${syl}`);
      const seqs = syllableKeySeqs(syl);
      assert.ok(seqs.length >= 1 && seqs.every((q) => q.length >= 2), `${s.t} -> ${syl}`);
    }
  }
});

test("中文句子：注音只用注音符號區塊的字元（不會混進漢字一或別的符號）", () => {
  for (const s of SENTENCES_ZH) {
    for (const ch of s.z.replaceAll(" ", "")) {
      const c = ch.codePointAt(0);
      const bopomofo = c >= 0x3105 && c <= 0x312f;
      assert.ok(bopomofo || "ˊˇˋ˙".includes(ch), `${s.t}: U+${c.toString(16)}`);
    }
  }
});

test("中文句子：抽查台灣讀音（一、不本調，輕聲、期、覺、樂、著）", () => {
  const z = (t) => SENTENCES_ZH.find((s) => s.t === t)?.z;
  assert.equal(z("你吃飽了嗎？"), "ㄋㄧˇ ㄔ ㄅㄠˇ ㄌㄜ˙ ㄇㄚ˙");
  assert.equal(z("我喜歡在雨天聽音樂。"), "ㄨㄛˇ ㄒㄧˇ ㄏㄨㄢ ㄗㄞˋ ㄩˇ ㄊㄧㄢ ㄊㄧㄥ ㄧㄣ ㄩㄝˋ");
  assert.equal(z("貓咪躺在沙發上睡覺。"), "ㄇㄠ ㄇㄧ ㄊㄤˇ ㄗㄞˋ ㄕㄚ ㄈㄚ ㄕㄤˋ ㄕㄨㄟˋ ㄐㄧㄠˋ");
  assert.equal(z("這學期我選了美術課。"), "ㄓㄜˋ ㄒㄩㄝˊ ㄑㄧˊ ㄨㄛˇ ㄒㄩㄢˇ ㄌㄜ˙ ㄇㄟˇ ㄕㄨˋ ㄎㄜˋ");
  assert.equal(z("他笑著跟我打招呼。"), "ㄊㄚ ㄒㄧㄠˋ ㄓㄜ˙ ㄍㄣ ㄨㄛˇ ㄉㄚˇ ㄓㄠ ㄏㄨ");
  assert.equal(z("我們搭捷運到台北一零一。"), "ㄨㄛˇ ㄇㄣ˙ ㄉㄚ ㄐㄧㄝˊ ㄩㄣˋ ㄉㄠˋ ㄊㄞˊ ㄅㄟˇ ㄧ ㄌㄧㄥˊ ㄧ");
  assert.equal(z("你今天看起來很開心。"), "ㄋㄧˇ ㄐㄧㄣ ㄊㄧㄢ ㄎㄢˋ ㄑㄧˇ ㄌㄞˊ ㄏㄣˇ ㄎㄞ ㄒㄧㄣ");
});

test("中文句子：『不』一律是 ㄅㄨˋ、『一』一律是 ㄧ（不做變調）", () => {
  for (const s of SENTENCES_ZH) {
    const syl = s.z.split(" ");
    [...s.t].filter(isHan).forEach((ch, i) => {
      if (ch === "不") assert.equal(syl[i], "ㄅㄨˋ", s.t);
      if (ch === "一") assert.equal(syl[i], "ㄧ", s.t);
    });
  }
});

test("中文句子：每個音節的聲調解析正常（1–5）", () => {
  const tones = new Set();
  for (const s of SENTENCES_ZH) for (const syl of s.z.split(" ")) tones.add(parseSyllable(syl).tone);
  assert.deepEqual([...tones].sort(), [1, 2, 3, 4, 5]);
});
