// 「波紋がオブジェクトに当たった時に、揺れと虹が出ているか」を数値で判定する（Playwright + pngjs）。
// 使い方:
//   npm i -D playwright pngjs && npx playwright install webkit
//   node docs/water-ripple/verify-object.mjs <URL> <x,y,w,h> [chrome|webkit] [出力ディレクトリ]
//     x,y,w,h = 判定したいオブジェクトの矩形（ビューポート CSS px）。DOM なら getBoundingClientRect の値
//   例: node docs/water-ripple/verify-object.mjs "http://localhost:3000/?idleDropMs=0" 340,220,320,200 webkit ./obj-shots
//
// 手順: 静止状態を撮影(A0) → 矩形の中心を横切るように左右にドラッグ → 一定時間後に撮影(A1)
// 指標（0〜255 スケール、矩形内の平均）:
//   motion = |A1 - A0| の平均            … 揺れ（屈折で歪む・浮遊物が動く）が起きたか
//   fringe = |ΔR - ΔB| の平均            … R と B が別々にずれたか = 虹（色収差）
//   fringeRatio = fringe / motion        … 色収差なしの「ただの歪み」と区別するための比
//   ※ 虹の判定は白・灰・黒など「無彩色」の物体（UI カード等）でのみ有効。色付きの物体は物体自身の色差が混ざって判定不能
//     （較正で確認済み）→ 色付き物体は wobble のみ見て、虹は無彩色のテストパッチで確認する
// 判定しきい値は reference.html で較正済み（README の 5-4 参照）。
// 注意: アイドル演出（自動の雫・泳ぐ魚など）は A0 と A1 の差に混ざるので、検証中は止めること。
import { chromium, webkit, devices } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

// reference.html で較正（Chrome 157 / WebKit iPad、README 5-4 の表）:
//   揺れ: 正常 20〜29 / 波のハイライトだけ通過して物体は歪まない 2.7〜7.9 → 10
//   虹（無彩色の物体のみ有効）: 色収差あり 0.84〜0.86 / なし 0.16〜0.17 → 0.4
export const THRESHOLDS = Object.freeze({ motion: 10.0, fringeRatio: 0.4 });

export function parseRect(text) {
  const nums = String(text ?? '').split(',').map(Number);
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n)) || nums[2] <= 0 || nums[3] <= 0) {
    throw new Error(`rect は "x,y,w,h"（正の幅・高さ）で指定: ${text}`);
  }
  const [x, y, width, height] = nums;
  return Object.freeze({ x, y, width, height });
}

// a, b: 同サイズの RGBA バイト列
export function regionMetrics(a, b) {
  if (a.length !== b.length || a.length % 4 !== 0) throw new Error('画像サイズが一致しない');
  const n = a.length / 4;
  let motion = 0, fringe = 0;
  for (let i = 0; i < a.length; i += 4) {
    const dR = b[i] - a[i], dG = b[i + 1] - a[i + 1], dB = b[i + 2] - a[i + 2];
    motion += (Math.abs(dR) + Math.abs(dG) + Math.abs(dB)) / 3;
    fringe += Math.abs(dR - dB);
  }
  motion /= n; fringe /= n;
  return Object.freeze({ motion, fringe, fringeRatio: motion > 0 ? fringe / motion : 0 });
}

export function judge(m, t = THRESHOLDS) {
  return Object.freeze({ wobble: m.motion >= t.motion, rainbow: m.motion >= t.motion && m.fringeRatio >= t.fringeRatio });
}

async function main() {
  const [url, rectText, engine = 'chrome', outDir = './obj-shots'] = process.argv.slice(2);
  if (!url || !rectText) { console.error('usage: node verify-object.mjs <url> <x,y,w,h> [chrome|webkit] [outDir]'); process.exit(2); }
  const rect = parseRect(rectText);
  mkdirSync(outDir, { recursive: true });

  const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome', headless: false });
  const page = engine === 'webkit'
    ? await (await browser.newContext({ ...devices['iPad Pro 11 landscape'] })).newPage()
    : await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(url);
    await page.waitForTimeout(1500);
    const shot = async (name) => {
      const buf = await page.screenshot({ clip: rect, scale: 'css' });
      writeFileSync(`${outDir}/${name}.png`, buf);
      return PNG.sync.read(buf).data;
    };
    const a0 = await shot('A0-before');
    const cy = rect.y + rect.height / 2;
    const x0 = Math.max(1, rect.x - rect.width * 0.3), x1 = rect.x + rect.width * 1.3;
    await page.mouse.move(x0, cy); await page.mouse.down();
    for (let i = 0; i <= 20; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 20, cy + Math.sin(i / 3) * rect.height * 0.15); await page.waitForTimeout(16); }
    await page.mouse.up();
    await page.waitForTimeout(200);
    const a1 = await shot('A1-after');
    const metrics = regionMetrics(a0, a1);
    console.log(JSON.stringify({ engine, rect, metrics, verdict: judge(metrics), thresholds: THRESHOLDS, errors }, null, 2));
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
