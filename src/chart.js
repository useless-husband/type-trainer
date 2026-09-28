// 自己畫的 SVG 折線圖（不依賴任何圖表函式庫）。顏色由 CSS class 控制，所以能跟著深淺色主題。

const W = 560;
const H = 180;
const PAD = { l: 40, r: 12, t: 24, b: 24 };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/** 挑一個好看的 y 軸上限（整數刻度）。 */
export function niceMax(max, floor = 10) {
  if (!(max > 0)) return floor;
  const steps = [10, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 800, 1000, 2000, 5000];
  for (const s of steps) if (max <= s) return Math.max(s, floor);
  return Math.ceil(max / 1000) * 1000;
}

/**
 * 產生折線圖的 SVG 字串。
 * @param values  數字陣列（舊到新），非有限數會被略過
 * @param opts    { title, unit, yMax, yMin, className }
 */
export function renderLineChart(values, opts = {}) {
  const { title = "折線圖", unit = "", yMin = 0, className = "chart" } = opts;
  const data = (values ?? []).filter((v) => Number.isFinite(v));
  const label = `${title}（最近 ${data.length} 次）`;
  const head = `<svg class="${esc(className)}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">`;
  if (data.length === 0) {
    return `${head}<text class="c-text" x="${PAD.l}" y="${H / 2}">尚無資料</text></svg>`;
  }
  const yMax = opts.yMax ?? niceMax(Math.max(...data));
  const span = yMax - yMin || 1;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (data.length === 1 ? iw / 2 : (iw * i) / (data.length - 1));
  const y = (v) => PAD.t + ih - (Math.min(Math.max(v, yMin), yMax) - yMin) / span * ih;
  const f = (n) => Math.round(n * 10) / 10;

  let out = head;
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + (span * i) / ticks;
    const yy = f(y(v));
    out += `<line class="c-grid" x1="${PAD.l}" y1="${yy}" x2="${W - PAD.r}" y2="${yy}"/>`;
    out += `<text class="c-text" x="${PAD.l - 6}" y="${yy + 4}" text-anchor="end">${f(v)}</text>`;
  }
  const pts = data.map((v, i) => `${f(x(i))},${f(y(v))}`);
  if (data.length > 1) out += `<polyline class="c-line" fill="none" points="${pts.join(" ")}"/>`;
  data.forEach((v, i) => {
    out += `<circle class="c-dot" cx="${f(x(i))}" cy="${f(y(v))}" r="3.5"><title>第 ${i + 1} 筆：${f(v)}${esc(unit)}</title></circle>`;
  });
  out += `<text class="c-text" x="${PAD.l}" y="${H - 6}">較早</text>`;
  out += `<text class="c-text" x="${W - PAD.r}" y="${H - 6}" text-anchor="end">最近</text>`;
  if (unit) out += `<text class="c-text" x="${PAD.l}" y="${PAD.t - 12}">${esc(unit)}</text>`;
  return `${out}</svg>`;
}
