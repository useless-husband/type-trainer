import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

test("index.html 只用相對路徑載入本地檔案，且檔案存在", () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (ref.startsWith("data:") || ref.startsWith("https://github.com/useless-husband/")) continue;
    assert.ok(!/^(https?:)?\/\//.test(ref), `不可載入外部資源：${ref}`);
    assert.ok(!ref.startsWith("/"), `請用相對路徑：${ref}`);
    assert.ok(existsSync(join(root, ref)), `找不到：${ref}`);
  }
});

test("樣式表與腳本沒有外部網址（不用 CDN、可離線）", () => {
  const css = readFileSync(join(root, "style.css"), "utf8");
  assert.ok(!/https?:\/\//.test(css));
  for (const f of ["src/ui/app.js", "src/ui/keyboard-view.js"]) {
    const js = readFileSync(join(root, f), "utf8");
    assert.ok(!/https?:\/\//.test(js), f);
  }
});

test("index.html 有語言、viewport 與色彩配置宣告", () => {
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /name="color-scheme" content="light dark"/);
});

test("app.js 用到的元素 id 都在 index.html 裡", () => {
  const js = readFileSync(join(root, "src/ui/app.js"), "utf8");
  const ids = new Set([...js.matchAll(/\$\("([a-z0-9-]+)"\)/g)].map((m) => m[1]));
  assert.ok(ids.size > 20);
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `index.html 缺少 #${id}`);
});
