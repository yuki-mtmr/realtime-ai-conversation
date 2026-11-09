// node --test docs/water-ripple/verify-object.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRect, regionMetrics, judge, THRESHOLDS } from './verify-object.mjs';

const px = (...rgba) => Uint8Array.from(rgba);

test('parseRect: 正しい矩形をパースする', () => {
  assert.deepEqual({ ...parseRect('10,20,30,40') }, { x: 10, y: 20, width: 30, height: 40 });
});
test('parseRect: 不正な入力は例外', () => {
  for (const bad of ['', '1,2,3', '1,2,0,4', 'a,b,c,d', undefined]) assert.throws(() => parseRect(bad));
});
test('regionMetrics: 変化なしなら 0', () => {
  const a = px(100, 100, 100, 255, 50, 60, 70, 255);
  assert.deepEqual({ ...regionMetrics(a, a) }, { motion: 0, fringe: 0, fringeRatio: 0 });
});
test('regionMetrics: 全チャネル同量の変化 = 揺れのみ（虹なし）', () => {
  const m = regionMetrics(px(100, 100, 100, 255), px(130, 130, 130, 255));
  assert.equal(m.motion, 30); assert.equal(m.fringe, 0);
});
test('regionMetrics: R と B が逆向き = 虹', () => {
  const m = regionMetrics(px(100, 100, 100, 255), px(130, 100, 70, 255));
  assert.equal(m.motion, 20); assert.equal(m.fringe, 60); assert.equal(m.fringeRatio, 3);
});
test('regionMetrics: サイズ不一致は例外', () => {
  assert.throws(() => regionMetrics(px(1, 2, 3, 4), px(1, 2, 3, 4, 5, 6, 7, 8)));
});
test('judge: 揺れが閾値未満なら虹も false（ハイライトだけの誤検出を防ぐ）', () => {
  assert.deepEqual({ ...judge({ motion: THRESHOLDS.motion - 1, fringeRatio: 5 }) }, { wobble: false, rainbow: false });
  assert.deepEqual({ ...judge({ motion: 20, fringeRatio: 0.16 }) }, { wobble: true, rainbow: false });
  assert.deepEqual({ ...judge({ motion: 20, fringeRatio: 0.84 }) }, { wobble: true, rainbow: true });
});
