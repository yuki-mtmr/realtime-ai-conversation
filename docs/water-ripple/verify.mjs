// 波紋の目視検証用スクリプト（Playwright）。
// 使い方:
//   npm i -D playwright
//   node docs/water-ripple/verify.mjs <URL または file:///絶対パス> [出力ディレクトリ] [chrome|webkit]
// 例: node docs/water-ripple/verify.mjs http://localhost:3000/ ./ripple-shots webkit
//   chrome = インストール済み Chrome（HTML-in-Canvas は 157+）
//   webkit = Playwright WebKit + iPad Pro 11 横向きプロファイル（iPad / Kiosk Pro の WKWebView 近似。
//            初回は `npx playwright install webkit`）。実機と同一ではないので最終確認は実機で
//
// 出力:
//   0-idle.png  : 操作前
//   1-drag.png  : 画面を左→右に波打つ軌跡でドラッグした直後（軌跡に沿った航跡＋屈折が出ていること）
//   2-typed.png : 中央付近をクリックして "hello" と入力した後（HTML-in-Canvas ON の時のみ意味がある）
// 標準出力に JSON（HTML-in-Canvas の有無・Chrome バージョン・console error）を出す。
import { chromium, webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const target = process.argv[2];
const outDir = process.argv[3] ?? './ripple-shots';
const engine = process.argv[4] ?? 'chrome';
if (!target) { console.error('usage: node verify.mjs <url> [outDir]'); process.exit(2); }
mkdirSync(outDir, { recursive: true });

// channel:'chrome' = インストール済み Chrome を使う（HTML-in-Canvas は Chrome 157+）
// headless だと GPU が無効になる環境があるため headed で起動する
const browser = engine === 'webkit'
  ? await webkit.launch()
  : await chromium.launch({ channel: 'chrome', headless: false });
const page = engine === 'webkit'
  ? await (await browser.newContext({ ...devices['iPad Pro 11 landscape'] })).newPage()
  : await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(target);
await page.waitForTimeout(1000);
const info = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.setAttribute('content', 'drawable');
  return { htmlInCanvas: c.content === 'drawable', ua: navigator.userAgent,
    canvasPx: [document.querySelector('canvas')?.width, document.querySelector('canvas')?.height] };
});
await page.screenshot({ path: `${outDir}/0-idle.png` });

const { width, height } = page.viewportSize();
const y0 = height / 2;
await page.mouse.move(width * 0.15, y0);
await page.mouse.down();
for (let i = 0; i <= 30; i++) {
  await page.mouse.move(width * 0.15 + i * width * 0.023, y0 + Math.sin(i / 4) * height * 0.09);
  await page.waitForTimeout(16);
}
await page.mouse.up();
await page.waitForTimeout(250);
await page.screenshot({ path: `${outDir}/1-drag.png` });

await page.mouse.click(width / 2, y0);
await page.keyboard.type('hello');
await page.waitForTimeout(300);
const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName ?? null, value: document.activeElement?.value ?? null }));
await page.screenshot({ path: `${outDir}/2-typed.png` });

console.log(JSON.stringify({ ...info, focused, errors }, null, 2));
await browser.close();
