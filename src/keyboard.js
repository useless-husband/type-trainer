// 美式 QWERTY 鍵盤資料：每個鍵該用哪根手指，以及「字元 → 要按哪個鍵」的對照。

export const FINGERS = {
  lp: "左手小指",
  lr: "左手無名指",
  lm: "左手中指",
  li: "左手食指",
  th: "拇指",
  ri: "右手食指",
  rm: "右手中指",
  rr: "右手無名指",
  rp: "右手小指",
};

// 每列：[鍵 id, shift 後的字元（沒有就省略）, 手指, 寬度（以一般鍵為 1）]
// id 就是不按 Shift 時的字元；特殊鍵用名稱。
const R1 = "`~ 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+".split(" ");
const R1F = ["lp", "lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp", "rp"];
const R2 = "q w e r t y u i o p [{ ]} \\|".split(" ");
const R2F = ["lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp", "rp", "rp"];
const R3 = "a s d f g h j k l ;: '\"".split(" ");
const R3F = ["lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp"];
const R4 = "z x c v b n m ,< .> /?".split(" ");
const R4F = ["lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp"];

function charKeys(specs, fingers) {
  return specs.map((s, i) => {
    const id = s[0];
    const shift = s.length > 1 ? s[1] : id.toUpperCase();
    return { id, shift, finger: fingers[i], w: 1, kind: "char" };
  });
}

function mod(id, label, finger, w) {
  return { id, label, finger, w, kind: "mod" };
}

export const KEYBOARD_ROWS = [
  [...charKeys(R1, R1F), mod("Backspace", "⌫", "rp", 2)],
  [mod("Tab", "Tab", "lp", 1.5), ...charKeys(R2, R2F).map((k) => (k.id === "\\" ? { ...k, w: 1.5 } : k))],
  [mod("CapsLock", "Caps", "lp", 1.75), ...charKeys(R3, R3F), mod("Enter", "Enter", "rp", 2.25)],
  [mod("ShiftLeft", "Shift", "lp", 2.25), ...charKeys(R4, R4F), mod("ShiftRight", "Shift", "rp", 2.75)],
  [
    { id: "_gap_l", kind: "gap", w: 3.75 },
    { id: " ", label: "空白", finger: "th", w: 6.25, kind: "mod" },
    { id: "_gap_r", kind: "gap", w: 5 },
  ],
];

const BY_ID = new Map();
const CHAR_MAP = new Map();
for (const row of KEYBOARD_ROWS) {
  for (const k of row) {
    if (k.kind === "gap") continue;
    BY_ID.set(k.id, k);
    if (k.kind === "char") {
      CHAR_MAP.set(k.id, { id: k.id, shift: false });
      if (k.shift !== k.id) CHAR_MAP.set(k.shift, { id: k.id, shift: true });
    }
  }
}
CHAR_MAP.set(" ", { id: " ", shift: false });
CHAR_MAP.set("\n", { id: "Enter", shift: false });

/** 依 id 取鍵的資料；沒有就回 undefined。 */
export function getKey(id) {
  return BY_ID.get(id);
}

/** 這個字元要按哪個鍵、要不要按 Shift。無法用美式鍵盤打出來就回 null。 */
export function keyForChar(ch) {
  return CHAR_MAP.get(ch) ?? null;
}

/** 字元能不能用這個練習程式打出來（美式鍵盤上的可見字元、空白、換行）。 */
export function isTypeable(ch) {
  return CHAR_MAP.has(ch);
}

/** 某個鍵該用哪根手指（回傳 FINGERS 的 key）。 */
export function fingerOfKey(id) {
  return BY_ID.get(id)?.finger ?? null;
}

/** 要按 Shift 時，用「另一隻手」的小指。回傳要高亮的 Shift 鍵 id。 */
export function shiftKeyFor(id) {
  const f = fingerOfKey(id);
  if (!f || f === "th") return "ShiftLeft";
  return f[0] === "l" ? "ShiftRight" : "ShiftLeft";
}

// 瀏覽器 KeyboardEvent.code → 鍵 id（只含大千注音會用到的鍵與空白）。
const CODE_MAP = {
  Minus: "-",
  Semicolon: ";",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: " ",
};

/** KeyboardEvent.code → 鍵 id。不認得就回 null。 */
export function keyIdFromCode(code) {
  if (typeof code !== "string") return null;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return CODE_MAP[code] ?? null;
}
