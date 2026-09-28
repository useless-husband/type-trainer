import test from "node:test";
import assert from "node:assert/strict";
import { FINGERS, KEYBOARD_ROWS, fingerOfKey, getKey, isTypeable, keyForChar, keyIdFromCode, shiftKeyFor } from "../src/keyboard.js";

test("每個鍵的手指都是已知的手指", () => {
  for (const row of KEYBOARD_ROWS) {
    for (const k of row) {
      if (k.kind === "gap") continue;
      assert.ok(k.finger in FINGERS, `${k.id} -> ${k.finger}`);
    }
  }
});

test("每一列寬度加起來是 15 單位", () => {
  for (const row of KEYBOARD_ROWS) {
    const sum = row.reduce((s, k) => s + k.w, 0);
    assert.equal(sum, 15);
  }
});

test("基準列手指：asdf 左手、jkl; 右手", () => {
  assert.deepEqual(["a", "s", "d", "f"].map(fingerOfKey), ["lp", "lr", "lm", "li"]);
  assert.deepEqual(["j", "k", "l", ";"].map(fingerOfKey), ["ri", "rm", "rr", "rp"]);
  assert.equal(fingerOfKey(" "), "th");
});

test("keyForChar: 小寫、大寫、符號、空白、換行", () => {
  assert.deepEqual(keyForChar("a"), { id: "a", shift: false });
  assert.deepEqual(keyForChar("A"), { id: "a", shift: true });
  assert.deepEqual(keyForChar("!"), { id: "1", shift: true });
  assert.deepEqual(keyForChar("{"), { id: "[", shift: true });
  assert.deepEqual(keyForChar('"'), { id: "'", shift: true });
  assert.deepEqual(keyForChar(" "), { id: " ", shift: false });
  assert.deepEqual(keyForChar("\n"), { id: "Enter", shift: false });
});

test("所有可見 ASCII（32–126）都打得出來，中文與 emoji 不行", () => {
  for (let c = 32; c < 127; c++) assert.ok(isTypeable(String.fromCharCode(c)), String.fromCharCode(c));
  assert.equal(isTypeable("你"), false);
  assert.equal(isTypeable("é"), false);
  assert.equal(keyForChar("🙂"), null);
});

test("Shift 用另一隻手：左手的字母用右 Shift，右手的字母用左 Shift", () => {
  assert.equal(shiftKeyFor("a"), "ShiftRight");
  assert.equal(shiftKeyFor("j"), "ShiftLeft");
});

test("keyIdFromCode 認得字母、數字、標點與空白", () => {
  assert.equal(keyIdFromCode("KeyQ"), "q");
  assert.equal(keyIdFromCode("Digit5"), "5");
  assert.equal(keyIdFromCode("Semicolon"), ";");
  assert.equal(keyIdFromCode("Comma"), ",");
  assert.equal(keyIdFromCode("Period"), ".");
  assert.equal(keyIdFromCode("Slash"), "/");
  assert.equal(keyIdFromCode("Minus"), "-");
  assert.equal(keyIdFromCode("Space"), " ");
  assert.equal(keyIdFromCode("F1"), null);
  assert.equal(keyIdFromCode(undefined), null);
});

test("getKey 找得到特殊鍵", () => {
  assert.equal(getKey("Enter").kind, "mod");
  assert.equal(getKey("nope"), undefined);
});
