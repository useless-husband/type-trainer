// 畫面上的虛擬鍵盤：只負責畫與更新 class，不含任何練習邏輯。

import { FINGERS, KEYBOARD_ROWS } from "../keyboard.js";
import { DACHEN } from "../zhuyin.js";

const ZH_LABEL = { ...DACHEN, 3: "ˇ", 4: "ˋ", 6: "ˊ", 7: "˙" };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function renderLegend(ul) {
  ul.textContent = "";
  for (const [id, name] of Object.entries(FINGERS)) {
    const li = el("li");
    const sw = el("span", "sw");
    sw.dataset.f = id;
    li.append(sw, el("span", null, name));
    ul.append(li);
  }
}

export function createKeyboard(root) {
  const keys = new Map();
  root.textContent = "";
  for (const row of KEYBOARD_ROWS) {
    const r = el("div", "kr");
    for (const k of row) {
      if (k.kind === "gap") {
        const g = el("div", "k gap");
        g.style.flexGrow = String(k.w);
        r.append(g);
        continue;
      }
      const d = el("div", "k");
      d.style.flexGrow = String(k.w);
      d.dataset.f = k.finger;
      d.dataset.id = k.id;
      const isLetter = k.kind === "char" && /^[a-z]$/.test(k.id);
      const parts = {};
      if (k.kind === "char") {
        if (isLetter) {
          parts.main = el("span", "k-main", k.id.toUpperCase());
        } else {
          parts.shift = el("span", "k-shift", k.shift);
          parts.main = el("span", "k-main", k.id);
        }
        parts.zy = el("span", "k-zy");
        parts.count = el("span", "k-count");
        d.append(...Object.values(parts));
      } else {
        parts.main = el("span", "k-mod", k.label);
        parts.zy = el("span", "k-zy");
        parts.count = el("span", "k-count");
        d.append(parts.main, parts.zy, parts.count);
        d.classList.add("mod");
      }
      keys.set(k.id, { node: d, parts, def: k });
      r.append(d);
    }
    root.append(r);
  }

  /**
   * @param o.zhuyin  注音模式：鍵帽顯示注音符號
   * @param o.next    Set，下一步要按的鍵 id
   * @param o.view    "finger" | "heat"
   * @param o.heat    { 鍵id: 錯誤次數 }
   */
  function update({ zhuyin = false, next = new Set(), view = "finger", heat = {} } = {}) {
    root.classList.toggle("zh", zhuyin);
    root.dataset.view = view;
    const max = Math.max(0, ...Object.values(heat));
    for (const [id, { node, parts }] of keys) {
      node.classList.toggle("next", next.has(id));
      node.classList.toggle("zh-key", zhuyin && (id in ZH_LABEL || id === " "));
      if (parts.zy) {
        let z = "";
        if (zhuyin) z = id === " " ? "一聲" : (ZH_LABEL[id] ?? "");
        parts.zy.textContent = z;
      }
      const c = view === "heat" ? (heat[id] ?? 0) : 0;
      let level = 0;
      if (c > 0 && max > 0) level = Math.min(5, Math.max(1, Math.ceil((c / max) * 5)));
      node.dataset.heat = String(level);
      if (parts.count) parts.count.textContent = c > 0 ? String(c) : "";
    }
  }

  function flashBad(id) {
    const k = keys.get(id);
    if (!k) return;
    k.node.classList.add("bad");
    setTimeout(() => k.node.classList.remove("bad"), 180);
  }

  return { update, flashBad };
}
