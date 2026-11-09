// 波の「質感」を目で比較するための撮影ツール（Playwright）。
// reference.html と社用アプリを **同じなぞり方・同じタイミング・同じ切り出し位置** で撮り、並べて見比べる。
//
// 使い方:
//   npm i -D playwright && npx playwright install webkit
//   node docs/water-ripple/capture-sheet.mjs <URL> <出力ディレクトリ> [webkit|chrome] [ラベル]
//   例: node docs/water-ripple/capture-sheet.mjs "http://localhost:3000/" ./sheet-app webkit app
//
// 出力（どれも Claude が Read で見られる PNG/JPEG）:
//   frames.jpg  : なぞり終えてから +100 / +400 / +900 / +1600 / +3000ms の全画面を時系列で並べたもの
//   detail.png  : +400ms の瞬間をデバイスピクセル等倍で 3 か所切り出したもの（なぞった線の 始点・中央・終点）
//   frame-<t>.jpg : 各時刻の全画面（デバイス解像度）
// iPad Pro 11 横（1194×834, DPR 2）でなぞる軌跡は固定: 画面の左 12% → 右 88%、高さ中央を中心に振幅 12% の正弦波。
// アイドル演出（自動の雫・泳ぐ魚など）は止めてから撮ると比較しやすい。
import { chromium, webkit, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

export const TIMES_MS = Object.freeze([100, 400, 900, 1600, 3000]);
export const DETAIL_AT_MS = 400;
// なぞった線上の 3 点（画面比）。切り出しはこの点を中心に 600×400 デバイス px
export const DETAIL_POINTS = Object.freeze([
  Object.freeze({ name: 'start', fx: 0.12, fy: 0.5 }),
  Object.freeze({ name: 'middle', fx: 0.5, fy: 0.5 }),
  Object.freeze({ name: 'end', fx: 0.88, fy: 0.5 }),
]);
export const CROP = Object.freeze({ w: 600, h: 400 });

export function strokePoints(width, height, steps = 40) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return Object.freeze({ x: width * (0.12 + 0.76 * t), y: height * (0.5 + 0.12 * Math.sin(t * Math.PI * 2.5)) });
  });
}

export function cropOrigin(point, devW, devH, crop = CROP) {
  const x = Math.round(Math.min(Math.max(point.fx * devW - crop.w / 2, 0), devW - crop.w));
  const y = Math.round(Math.min(Math.max(point.fy * devH - crop.h / 2, 0), devH - crop.h));
  return Object.freeze({ x, y });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function captureFrames(page) {
  const { width, height } = page.viewportSize();
  const pts = strokePoints(width, height);
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) { await page.mouse.move(p.x, p.y); await sleep(16); }
  await page.mouse.up();
  const t0 = Date.now();
  const frames = [];
  for (const t of TIMES_MS) {
    const wait = t - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    const actual = Date.now() - t0;
    frames.push(Object.freeze({ t, actual, buf: await page.screenshot({ type: 'jpeg', quality: 92 }) }));
  }
  return frames;
}

function sheetHtml(label, frames, dev) {
  const b64 = (f) => `data:image/jpeg;base64,${f.buf.toString('base64')}`;
  const cell = (f) => `<figure><img src="${b64(f)}"><figcaption>+${f.t}ms (実測 +${f.actual}ms)</figcaption></figure>`;
  const detailFrame = frames.find((f) => f.t === DETAIL_AT_MS);
  const crops = DETAIL_POINTS.map((p) => {
    const o = cropOrigin(p, dev.w, dev.h);
    return `<figure><div class="crop" style="background-image:url(${b64(detailFrame)});background-position:-${o.x}px -${o.y}px;background-size:${dev.w}px ${dev.h}px"></div><figcaption>${p.name}（等倍 ${CROP.w}×${CROP.h}）</figcaption></figure>`;
  }).join('');
  return {
    frames: `<style>body{margin:0;background:#111;color:#ddd;font:14px system-ui}h1{font-size:16px;margin:8px}
      .g{display:grid;grid-template-columns:repeat(3,600px);gap:8px;padding:8px}img{width:600px;display:block}figure{margin:0}</style>
      <h1>${label} — なぞり終えてからの時系列</h1><div class="g">${frames.map(cell).join('')}</div>`,
    detail: `<style>body{margin:0;background:#111;color:#ddd;font:14px system-ui}h1{font-size:16px;margin:8px}
      .g{display:flex;gap:8px;padding:8px}.crop{width:${CROP.w}px;height:${CROP.h}px;background-repeat:no-repeat}figure{margin:0}</style>
      <h1>${label} — +${DETAIL_AT_MS}ms 等倍クローズアップ</h1><div class="g">${crops}</div>`,
  };
}

export async function renderSheets(browser, label, frames, dev, outDir) {
  const html = sheetHtml(label, frames, dev);
  const page = await browser.newPage({ viewport: { width: 1840, height: 400 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(html.frames); await page.waitForTimeout(200);
    await page.screenshot({ path: `${outDir}/frames.jpg`, type: 'jpeg', quality: 88, fullPage: true });
    await page.setContent(html.detail); await page.waitForTimeout(200);
    await page.screenshot({ path: `${outDir}/detail.png`, fullPage: true });
  } finally { await page.close(); }
}

export async function openPage(engine) {
  const browser = engine === 'chrome' ? await chromium.launch({ channel: 'chrome', headless: false }) : await webkit.launch();
  const ctx = await browser.newContext(engine === 'chrome'
    ? { viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 }
    : { ...devices['iPad Pro 11 landscape'] });
  return { browser, page: await ctx.newPage() };
}

async function main() {
  const [url, outDir, engine = 'webkit', label = url] = process.argv.slice(2);
  if (!url || !outDir) { console.error('usage: node capture-sheet.mjs <url> <outDir> [webkit|chrome] [label]'); process.exit(2); }
  mkdirSync(outDir, { recursive: true });
  const { browser, page } = await openPage(engine);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(url);
    await page.waitForTimeout(1500);
    const frames = await captureFrames(page);
    frames.forEach((f) => writeFileSync(`${outDir}/frame-${f.t}.jpg`, f.buf));
    const { width, height } = page.viewportSize();
    const dpr = await page.evaluate(() => devicePixelRatio);
    await renderSheets(browser, label, frames, { w: Math.round(width * dpr), h: Math.round(height * dpr) }, outDir);
    console.log(JSON.stringify({ outDir, engine, frames: frames.map((f) => ({ t: f.t, actual: f.actual })), errors }, null, 2));
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
