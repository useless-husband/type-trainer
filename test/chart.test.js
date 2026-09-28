import test from "node:test";
import assert from "node:assert/strict";
import { niceMax, renderLineChart } from "../src/chart.js";

test("niceMax: 選出剛好蓋住資料的刻度", () => {
  assert.equal(niceMax(0), 10);
  assert.equal(niceMax(37), 40);
  assert.equal(niceMax(100), 100);
  assert.equal(niceMax(101), 120);
  assert.equal(niceMax(9000), 9000);
});

test("空資料：顯示『尚無資料』", () => {
  const svg = renderLineChart([]);
  assert.match(svg, /尚無資料/);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(renderLineChart(null), /尚無資料/);
});

test("每筆資料一個點，折線點數相同", () => {
  const svg = renderLineChart([10, 20, 15, 30], { title: "速度", unit: "WPM" });
  assert.equal((svg.match(/<circle /g) ?? []).length, 4);
  const pts = svg.match(/<polyline[^>]*points="([^"]+)"/)[1].split(" ");
  assert.equal(pts.length, 4);
  assert.match(svg, /aria-label="速度（最近 4 次）"/);
});

test("只有一筆：只有點，沒有折線", () => {
  const svg = renderLineChart([50]);
  assert.equal((svg.match(/<circle /g) ?? []).length, 1);
  assert.ok(!svg.includes("<polyline"));
});

test("非有限數字被略過", () => {
  const svg = renderLineChart([1, NaN, Infinity, 3, undefined]);
  assert.equal((svg.match(/<circle /g) ?? []).length, 2);
});

test("數值越大 y 座標越小（越靠上）", () => {
  const svg = renderLineChart([10, 90], { yMax: 100 });
  const ys = [...svg.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(ys[1] < ys[0]);
});

test("超出 yMax 的值被夾在圖內", () => {
  const svg = renderLineChart([500], { yMax: 100 });
  const cy = Number(svg.match(/cy="([\d.]+)"/)[1]);
  assert.ok(cy >= 0 && cy <= 180);
});

test("標題與單位會被跳脫，避免注入 HTML", () => {
  const svg = renderLineChart([1, 2], { title: '<img src=x onerror="a">', unit: "<b>" });
  assert.ok(!svg.includes("<img"));
  assert.ok(!svg.includes("<b>"));
});

test("固定輸入 → 固定輸出", () => {
  assert.equal(renderLineChart([1, 2, 3]), renderLineChart([1, 2, 3]));
});
