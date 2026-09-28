// 網頁介面：把 src/ 裡的純邏輯接到畫面上。

import { renderLineChart } from "../chart.js";
import {
  ZH_TOPICS, codeText, sentencesText, weakEnglishPool, weakZhuyinPool, wordsText, zhuyinSentences,
} from "../content.js";
import { addRecord, aggregateErrors, clearHistory, loadHistory, recentOf } from "../history.js";
import { FINGERS, fingerOfKey, keyForChar, keyIdFromCode, shiftKeyFor } from "../keyboard.js";
import { createRng } from "../rng.js";
import { createEnglishSession, createZhuyinSession } from "../session.js";
import { formatDuration } from "../stats.js";
import { normalizeCustomText } from "../text.js";
import { generateWeakEnglish, generateWeakZhuyin, topWeakKeys } from "../weakness.js";
import { DACHEN, keysToDisplay } from "../zhuyin.js";
import { createKeyboard, renderLegend } from "./keyboard-view.js";

const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = "type-trainer:settings:v1";
const EMPTY_HINT = "在上方貼上英文段落，按「用這段文字練習」開始。";

function store() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const state = {
  mode: "en", // en | zh | custom
  enSet: "words",
  topic: "all",
  strict: true,
  view: "finger",
  weak: false,
  session: null,
  kind: "en",
  recordMode: "words",
  cells: null,
  spans: [],
  curWrong: false,
  timer: null,
  history: [],
  finishedErrors: null,
};

const kb = createKeyboard($("kb"));
renderLegend($("legend"));

// ---------- 設定 ----------

function loadSettings() {
  try {
    const s = JSON.parse(store()?.getItem(SETTINGS_KEY) ?? "null");
    if (!s || typeof s !== "object") return;
    if (["en", "zh", "custom"].includes(s.mode)) state.mode = s.mode;
    if (["words", "sentences", "code"].includes(s.enSet)) state.enSet = s.enSet;
    if (typeof s.topic === "string" && Object.hasOwn(ZH_TOPICS, s.topic)) state.topic = s.topic;
    if (typeof s.strict === "boolean") state.strict = s.strict;
  } catch {
    /* 設定壞掉就用預設值 */
  }
}

function saveSettings() {
  try {
    store()?.setItem(
      SETTINGS_KEY,
      JSON.stringify({ mode: state.mode, enSet: state.enSet, topic: state.topic, strict: state.strict }),
    );
  } catch {
    /* 無痕模式等情況存不了，沒關係 */
  }
}

// ---------- 出題 ----------

function newSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function buildRound() {
  const rng = createRng(newSeed());
  if (state.mode === "zh") {
    state.kind = "zh";
    let sentences;
    if (state.weak) {
      sentences = generateWeakZhuyin(aggregateErrors(state.history, "zh"), weakZhuyinPool(), rng).items;
      state.recordMode = "weak";
    } else {
      sentences = zhuyinSentences(rng, state.topic, 5);
      state.recordMode = "zhuyin";
    }
    const { session, cells } = createZhuyinSession(sentences, { strict: state.strict });
    state.session = session;
    state.cells = cells;
    return;
  }
  state.kind = "en";
  let text;
  if (state.mode === "custom") {
    text = normalizeCustomText($("custom-text").value);
    state.recordMode = "custom";
  } else if (state.weak) {
    text = generateWeakEnglish(aggregateErrors(state.history, "en"), weakEnglishPool(), rng).text;
    state.recordMode = "weak";
  } else {
    text = { words: wordsText, sentences: sentencesText, code: codeText }[state.enSet](rng);
    state.recordMode = state.enSet;
  }
  state.session = createEnglishSession(text, { strict: state.strict });
  state.cells = null;
}

// ---------- 畫面 ----------

function makeSpan(cls, text) {
  const e = document.createElement("span");
  e.className = cls;
  e.textContent = text;
  return e;
}

function renderText() {
  const box = $("text");
  box.textContent = "";
  state.spans = [];
  box.lang = state.kind === "zh" ? "zh-Hant" : "en";
  box.classList.toggle("is-zh", state.kind === "zh");
  if (state.kind === "zh") {
    for (const c of state.cells) {
      if (c.ch === "\n") {
        box.append(makeSpan("zbreak", ""));
        continue;
      }
      const cell = makeSpan(c.unit >= 0 ? "zc" : "zc punct", "");
      cell.append(makeSpan("zh", c.ch), makeSpan("zy", c.zy ?? ""));
      box.append(cell);
      if (c.unit >= 0) state.spans[c.unit] = cell;
    }
  } else {
    for (const u of state.session.units) {
      const span = makeSpan(u.label === " " ? "ch sp" : "ch", u.label === "\n" ? "↵" : u.label);
      state.spans.push(span);
      box.append(span);
      if (u.label === "\n") box.append(document.createElement("br"));
    }
  }
  paintAll();
}

function paintUnit(i) {
  const span = state.spans[i];
  if (!span) return;
  const s = state.session;
  span.classList.remove("ok", "bad", "cur", "wrong");
  const mark = s.marks[i];
  if (mark) span.classList.add(mark);
  else if (i === s.index && !s.finished) {
    span.classList.add("cur");
    if (state.curWrong) span.classList.add("wrong");
  }
}

function paintAll() {
  for (let i = 0; i < state.spans.length; i++) paintUnit(i);
  scrollToCurrent();
}

function scrollToCurrent() {
  const cur = state.spans[state.session.index];
  const box = $("text");
  if (!cur) return;
  const top = cur.offsetTop - box.offsetTop;
  const bottom = top + cur.offsetHeight;
  if (top < box.scrollTop + 8) box.scrollTop = Math.max(0, top - 12);
  else if (bottom > box.scrollTop + box.clientHeight - 8) box.scrollTop = bottom - box.clientHeight + 12;
}

function heatSource() {
  const s = state.session;
  if (s.finished && state.finishedErrors) return state.finishedErrors;
  if (Object.keys(s.errorKeys).length > 0) return s.errorKeys;
  return aggregateErrors(state.history, state.kind);
}

function nextKeys() {
  const s = state.session;
  const ids = new Set();
  if (s.finished) return { ids, text: "" };
  const parts = [];
  for (const k of s.expectedKeys()) {
    if (state.kind === "zh") {
      ids.add(k);
      const finger = FINGERS[fingerOfKey(k)] ?? "";
      if (k === " ") parts.push(`空白鍵（一聲） ${finger}`);
      else if (DACHEN[k]) parts.push(`${DACHEN[k]}（${k.toUpperCase()} 鍵） ${finger}`);
      else parts.push(`${keysToDisplay([k])}（${k} 鍵） ${finger}`);
    } else {
      const info = k === "Enter" ? { id: "Enter", shift: false } : keyForChar(k);
      if (!info) continue;
      ids.add(info.id);
      if (info.shift) ids.add(shiftKeyFor(info.id));
      const shown = k === " " ? "空白鍵" : k;
      parts.push(`${shown} ${FINGERS[fingerOfKey(info.id)] ?? ""}${info.shift ? "，另一手小指按 Shift" : ""}`);
    }
  }
  return { ids, text: parts.length ? `下一鍵：${parts.join(" 或 ")}` : "" };
}

function paintKeyboard() {
  const { ids, text } = nextKeys();
  kb.update({
    zhuyin: state.kind === "zh",
    next: ids,
    view: state.view,
    heat: state.view === "heat" ? heatSource() : {},
  });
  $("next-line").textContent = text;
  $("legend").hidden = state.view !== "finger";
  $("heat-legend").hidden = state.view !== "heat";
  const own = Object.keys(state.session.errorKeys).length > 0 || state.finishedErrors;
  $("view-note").textContent = state.view === "heat" ? (own ? "顯示這一次的錯誤" : "顯示最近 30 次的累計錯誤") : "";
}

function paintStats() {
  const s = state.session;
  const st = s.stats(performance.now());
  $("st-speed").textContent = String(st.speed);
  $("st-acc").textContent = String(st.accuracy);
  $("st-time").textContent = formatDuration(st.ms);
  const pct = s.units.length === 0 ? 0 : Math.round(st.progress * 100);
  $("st-fill").style.width = `${pct}%`;
  $("st-bar").setAttribute("aria-valuenow", String(pct));
  $("st-prog").textContent = `${s.index} / ${s.units.length}`;
}

function paintCompose() {
  $("compose-row").hidden = state.kind !== "zh";
  if (state.kind === "zh") $("compose").textContent = keysToDisplay(state.session.buffer) || " ";
}

function paintLabels() {
  const zh = state.kind === "zh";
  $("st-unit").textContent = zh ? "字/分" : "WPM";
  $("r-speed-label").textContent = zh ? "速度（字/分）" : "速度（WPM）";
  $("r-chars-label").textContent = zh ? "打對的字數" : "打對的字元數";
  $("cap-speed").textContent = zh ? "速度（字/分）" : "速度（WPM）";
}

function refresh() {
  paintLabels();
  paintStats();
  paintKeyboard();
  paintCompose();
}

function keyName(k) {
  if (k === " ") return "空白";
  return k.length === 1 ? k.toUpperCase() : k;
}

function paintWeakNote() {
  const weak = topWeakKeys(aggregateErrors(state.history, state.kind), 5);
  const tip =
    weak.length > 0
      ? `目前最常錯的鍵：${weak.map((w) => keyName(w.key)).join("、")}`
      : "還沒有錯誤紀錄，會先隨機出題";
  for (const id of ["btn-weak", "btn-weak2"]) {
    $(id).title = tip;
    $(id).disabled = state.mode === "custom";
  }
}

// ---------- 流程 ----------

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function showEmptyCustom() {
  stopTimer();
  state.kind = "en";
  state.session = createEnglishSession("");
  state.cells = null;
  state.spans = [];
  $("text").textContent = EMPTY_HINT;
  $("text").classList.remove("is-zh");
  $("result").hidden = true;
  refresh();
  renderHistory();
  paintWeakNote();
}

function startRound({ focus = true } = {}) {
  stopTimer();
  if (state.mode === "custom" && normalizeCustomText($("custom-text").value).length === 0) {
    showEmptyCustom();
    return;
  }
  state.finishedErrors = null;
  state.curWrong = false;
  buildRound();
  $("result").hidden = true;
  renderText();
  $("text").scrollTop = 0;
  refresh();
  renderHistory();
  paintWeakNote();
  if (focus) $("practice").focus({ preventScroll: true });
}

function finish() {
  stopTimer();
  const s = state.session;
  const st = s.stats(performance.now());
  state.finishedErrors = { ...s.errorKeys };
  if (st.keystrokes > 0) {
    state.history = addRecord(store(), {
      t: Date.now(),
      kind: state.kind,
      mode: state.recordMode,
      speed: st.speed,
      accuracy: st.accuracy,
      chars: st.chars,
      ms: st.ms,
      errors: st.errorKeys,
    });
  }
  const zh = state.kind === "zh";
  $("r-speed").textContent = `${st.speed} ${zh ? "字/分" : "WPM"}`;
  $("r-acc").textContent = `${st.accuracy}%`;
  $("r-time").textContent = formatDuration(st.ms);
  $("r-chars").textContent = `${st.chars} / ${st.total}`;
  $("r-err").textContent = `${st.errors} 次`;
  const top = topWeakKeys(st.errorKeys, 5);
  $("r-weak").textContent =
    top.length > 0
      ? `這次最常按錯的鍵：${top.map((t) => `${keyName(t.key)}（${t.count}）`).join("、")}。鍵盤已切換成錯誤熱圖。`
      : "這次沒有按錯任何鍵。";
  $("result").hidden = false;
  if (top.length > 0) state.view = "heat";
  syncView();
  refresh();
  renderHistory();
  paintWeakNote();
  $("result").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function handleKey(key) {
  const s = state.session;
  if (s.finished) return;
  const started = s.startTime !== null;
  const before = s.index;
  const r = s.press(key, performance.now());
  if (!started && !state.timer) state.timer = setInterval(paintStats, 250);
  if (r.type === "wrong" || r.type === "skip") {
    state.curWrong = true;
    const exp = r.expected ?? key;
    kb.flashBad(state.kind === "zh" ? exp : (keyForChar(exp)?.id ?? exp));
  } else {
    state.curWrong = false;
  }
  paintUnit(before);
  if (s.index !== before && !s.finished) paintUnit(s.index);
  scrollToCurrent();
  if (s.finished) finish();
  else refresh();
}

function onKeyDown(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return;
  const s = state.session;
  if (e.key === "Escape") {
    e.preventDefault();
    if (state.mode === "custom" && s.units.length === 0) return;
    startRound();
    return;
  }
  if (s.finished) {
    if (e.key === "Enter" && s.units.length > 0) {
      e.preventDefault();
      startRound();
    }
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    if (s.backspace()) {
      state.curWrong = false;
      paintUnit(s.index);
      refresh();
    }
    return;
  }
  if (state.kind === "zh") {
    const id = keyIdFromCode(e.code);
    if (!id) return;
    e.preventDefault();
    handleKey(id);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    handleKey("Enter");
  } else if (e.key.length === 1) {
    e.preventDefault();
    handleKey(e.key);
  }
  // e.key 是 "Unidentified"（手機）或 "Process"（輸入法）時，改由 input 事件處理
}

function onMobileInput(e) {
  const text = e.target.value;
  e.target.value = "";
  if (state.kind === "zh") return;
  for (const ch of text) {
    if (state.session.finished) break;
    handleKey(ch === "\n" ? "Enter" : ch);
  }
}

// ---------- 歷史 ----------

function renderHistory() {
  const list = recentOf(state.history, state.kind);
  const zh = state.kind === "zh";
  const unit = zh ? "字/分" : "WPM";
  $("chart-speed").innerHTML = renderLineChart(
    list.map((r) => r.speed),
    { title: `速度（${unit}）`, unit },
  );
  const minAcc = list.length ? Math.min(...list.map((r) => r.accuracy)) : 100;
  $("chart-acc").innerHTML = renderLineChart(
    list.map((r) => r.accuracy),
    { title: "正確率", unit: "%", yMin: Math.max(0, Math.floor(minAcc / 10) * 10 - 10), yMax: 100 },
  );
  const best = list.length ? Math.max(...list.map((r) => r.speed)) : 0;
  const label = zh ? "注音打字" : "英打";
  $("history-note").textContent = list.length
    ? `${label}最近 ${list.length} 次。最高速度 ${best} ${unit}。`
    : `${label}還沒有紀錄，練完一次就會出現在這裡。`;
}

// ---------- 事件 ----------

function syncView() {
  for (const b of document.querySelectorAll("#seg-view button")) {
    b.setAttribute("aria-checked", String(b.dataset.view === state.view));
  }
}

function syncControls() {
  for (const b of document.querySelectorAll("#seg-mode button")) {
    b.setAttribute("aria-checked", String(b.dataset.mode === state.mode));
  }
  $("f-en").hidden = state.mode !== "en";
  $("f-zh").hidden = state.mode !== "zh";
  $("custom-box").hidden = state.mode !== "custom";
  $("sel-en").value = state.enSet;
  $("sel-topic").value = state.topic;
  $("sel-strict").value = state.strict ? "strict" : "loose";
  syncView();
}

function bind() {
  for (const [k, v] of Object.entries(ZH_TOPICS)) $("sel-topic").append(new Option(v, k));

  for (const b of document.querySelectorAll("#seg-mode button")) {
    b.addEventListener("click", () => {
      state.mode = b.dataset.mode;
      state.weak = false;
      saveSettings();
      syncControls();
      if (state.mode === "custom") {
        showEmptyCustom();
        $("custom-text").focus();
      } else {
        startRound();
      }
    });
  }
  for (const b of document.querySelectorAll("#seg-view button")) {
    b.addEventListener("click", () => {
      state.view = b.dataset.view;
      syncView();
      paintKeyboard();
    });
  }
  $("sel-en").addEventListener("change", (e) => {
    state.enSet = e.target.value;
    state.weak = false;
    saveSettings();
    startRound();
  });
  $("sel-topic").addEventListener("change", (e) => {
    state.topic = e.target.value;
    state.weak = false;
    saveSettings();
    startRound();
  });
  $("sel-strict").addEventListener("change", (e) => {
    state.strict = e.target.value === "strict";
    saveSettings();
    startRound();
  });
  $("btn-new").addEventListener("click", () => {
    state.weak = false;
    startRound();
  });
  const weakStart = () => {
    state.weak = true;
    startRound();
  };
  $("btn-weak").addEventListener("click", weakStart);
  $("btn-weak2").addEventListener("click", weakStart);
  $("btn-again").addEventListener("click", () => startRound());
  $("btn-custom").addEventListener("click", () => {
    const n = normalizeCustomText($("custom-text").value).length;
    $("custom-note").textContent =
      n > 0 ? `已整理為 ${n} 個字元。` : "請先貼上一段英文，再按「用這段文字練習」。";
    if (n > 0) startRound();
  });
  $("btn-clear").addEventListener("click", () => {
    if (!window.confirm("要清除全部練習紀錄嗎？這個動作無法復原。")) return;
    clearHistory(store());
    state.history = [];
    state.finishedErrors = null;
    renderHistory();
    paintKeyboard();
    paintWeakNote();
  });

  const practice = $("practice");
  const mobile = $("mobile-input");
  practice.addEventListener("keydown", onKeyDown);
  practice.addEventListener("focusin", () => practice.classList.add("focused"));
  practice.addEventListener("focusout", () => practice.classList.remove("focused"));
  practice.addEventListener("click", () => {
    if (window.matchMedia("(pointer: coarse)").matches && state.kind === "en") mobile.focus();
    else practice.focus();
  });
  mobile.addEventListener("input", onMobileInput);
}

function init() {
  loadSettings();
  state.history = loadHistory(store());
  bind();
  syncControls();
  if (state.mode === "custom") showEmptyCustom();
  else startRound({ focus: false });
}

init();
