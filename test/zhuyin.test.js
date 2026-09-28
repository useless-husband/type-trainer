import test from "node:test";
import assert from "node:assert/strict";
import {
  DACHEN, KEY_OF_SYMBOL, buildZhuyinPlan, isHan, isValidBody, isValidSyllable,
  keysToDisplay, parseSyllable, syllableKeySeqs,
} from "../src/zhuyin.js";

test("大千鍵位：37 個注音符號各對應一個不同的鍵", () => {
  const symbols = Object.values(DACHEN);
  assert.equal(symbols.length, 37);
  assert.equal(new Set(symbols).size, 37);
  assert.equal(Object.keys(DACHEN).length, 37);
});

test("大千鍵位：抽查常見的鍵", () => {
  assert.equal(DACHEN[1], "ㄅ");
  assert.equal(DACHEN.q, "ㄆ");
  assert.equal(DACHEN.a, "ㄇ");
  assert.equal(DACHEN.z, "ㄈ");
  assert.equal(DACHEN.t, "ㄔ");
  assert.equal(DACHEN[5], "ㄓ");
  assert.equal(DACHEN.g, "ㄕ");
  assert.equal(DACHEN.b, "ㄖ");
  assert.equal(DACHEN.u, "ㄧ");
  assert.equal(DACHEN.j, "ㄨ");
  assert.equal(DACHEN.m, "ㄩ");
  assert.equal(DACHEN[";"], "ㄤ");
  assert.equal(DACHEN["/"], "ㄥ");
  assert.equal(DACHEN["-"], "ㄦ");
});

test("聲調鍵：二聲 6、三聲 3、四聲 4、輕聲 7", () => {
  assert.equal(KEY_OF_SYMBOL["ˊ"], "6");
  assert.equal(KEY_OF_SYMBOL["ˇ"], "3");
  assert.equal(KEY_OF_SYMBOL["ˋ"], "4");
  assert.equal(KEY_OF_SYMBOL["˙"], "7");
});

test("parseSyllable: 拆出音節本體與聲調", () => {
  assert.deepEqual(parseSyllable("ㄋㄧˇ"), { body: "ㄋㄧ", tone: 3 });
  assert.deepEqual(parseSyllable("ㄇㄚ"), { body: "ㄇㄚ", tone: 1 });
  assert.deepEqual(parseSyllable("ㄔˊ"), { body: "ㄔ", tone: 2 });
  assert.deepEqual(parseSyllable("ㄩㄝˋ"), { body: "ㄩㄝ", tone: 4 });
  assert.deepEqual(parseSyllable("˙ㄉㄜ"), { body: "ㄉㄜ", tone: 5 });
  assert.deepEqual(parseSyllable("ㄉㄜ˙"), { body: "ㄉㄜ", tone: 5 });
});

test("parseSyllable: 壞輸入回 null", () => {
  assert.equal(parseSyllable(""), null);
  assert.equal(parseSyllable("ˇ"), null);
  assert.equal(parseSyllable("abc"), null);
  assert.equal(parseSyllable("ㄋㄧˇˋ"), null);
  assert.equal(parseSyllable(null), null);
  assert.equal(parseSyllable(42), null);
});

test("合法音節：常見音節通過", () => {
  for (const s of ["ㄋㄧˇ", "ㄏㄠˇ", "ㄓ", "ㄔˊ", "ㄕˋ", "ㄖˋ", "ㄗ˙", "ㄦˊ", "ㄧ", "ㄨㄛˇ", "ㄩㄝˋ", "ㄒㄩㄝˊ", "ㄐㄧㄥ", "ㄓㄨㄤ", "ㄌㄩˋ", "ㄕㄟˊ", "ㄢ"]) {
    assert.ok(isValidSyllable(s), s);
  }
});

test("合法音節：不存在的音節被擋下", () => {
  for (const s of ["ㄅㄩ", "ㄐㄚ", "ㄓㄧ", "ㄍㄧ", "ㄅㄨㄥ", "ㄈㄧㄠ", "ㄐ", "ㄅ", "ㄦㄚ", "ㄨㄨ"]) {
    assert.equal(isValidBody(s), false, s);
  }
  assert.equal(isValidSyllable("xyz"), false);
});

test("syllableKeySeqs: 一聲以空白結尾", () => {
  // 媽 ㄇㄚ = a 8 + 空白
  assert.deepEqual(syllableKeySeqs("ㄇㄚ"), [["a", "8", " "]]);
});

test("syllableKeySeqs: 二、三、四聲", () => {
  assert.deepEqual(syllableKeySeqs("ㄋㄧˇ"), [["s", "u", "3"]]);
  assert.deepEqual(syllableKeySeqs("ㄔˊ"), [["t", "6"]]);
  assert.deepEqual(syllableKeySeqs("ㄕˋ"), [["g", "4"]]);
});

test("syllableKeySeqs: 輕聲可以先打 7 或後打 7", () => {
  assert.deepEqual(syllableKeySeqs("ㄉㄜ˙"), [["7", "2", "k"], ["2", "k", "7"]]);
  assert.deepEqual(syllableKeySeqs("˙ㄉㄜ"), syllableKeySeqs("ㄉㄜ˙"));
});

test("syllableKeySeqs: 不合法的音節丟出錯誤", () => {
  assert.throws(() => syllableKeySeqs("abc"));
});

test("keysToDisplay: 按鍵轉回注音，一聲的空白顯示 ˉ", () => {
  assert.equal(keysToDisplay(["s", "u", "3"]), "ㄋㄧˇ");
  assert.equal(keysToDisplay(["a", "8", " "]), "ㄇㄚˉ");
  assert.equal(keysToDisplay([]), "");
  assert.equal(keysToDisplay(["7", "2", "k"]), "˙ㄉㄜ");
});

test("isHan: 漢字 vs 標點與英數", () => {
  assert.ok(isHan("你"));
  assert.ok(isHan("臺"));
  assert.equal(isHan("，"), false);
  assert.equal(isHan("。"), false);
  assert.equal(isHan("a"), false);
  assert.equal(isHan("1"), false);
});

test("buildZhuyinPlan: 標點不算單元，單元數 = 漢字數", () => {
  const { cells, units } = buildZhuyinPlan([{ t: "你好嗎？", z: "ㄋㄧˇ ㄏㄠˇ ㄇㄚ˙" }]);
  assert.equal(units.length, 3);
  assert.equal(cells.length, 4);
  assert.equal(cells[3].unit, -1);
  assert.equal(cells[0].zy, "ㄋㄧˇ");
  assert.equal(units[2].seqs.length, 2);
});

test("buildZhuyinPlan: 多句之間插入換行格，注音數量不符時報錯", () => {
  const two = buildZhuyinPlan([
    { t: "好。", z: "ㄏㄠˇ" },
    { t: "早", z: "ㄗㄠˇ" },
  ]);
  assert.equal(two.units.length, 2);
  assert.ok(two.cells.some((c) => c.ch === "\n"));
  assert.throws(() => buildZhuyinPlan([{ t: "你好", z: "ㄋㄧˇ" }]));
});
