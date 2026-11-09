// 質感の「失敗例ギャラリー」を reference.html から生成する（reference/ フォルダの画像の作り方の記録）。
// 使い方: node docs/water-ripple/make-gallery.mjs <reference.html の絶対パス> <出力 PNG>
// 各行 = 1 つのパラメータずれ。同じなぞり方で +400ms / +1600ms の全画面と、+400ms の中央等倍クローズアップを並べる。
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { captureFrames, cropOrigin, DETAIL_POINTS, openPage } from './capture-sheet.mjs';

export const VARIANTS = Object.freeze([
  { q: '', label: 'OK（既定値）', note: 'なめらかな大きいうねり。歪んだ縁に太い虹。3 秒で穏やかに収まる' },
  { q: 'simLongSide=384&viscosity=0&dropRadiusPx=18&dropStrength=0.9&refraction=0.06', label: 'NG: はしご状の筋・粒状ハイライト', note: '格子が細かすぎ＋粘性なし。指の軌跡に細い平行線、ハイライトがチカチカ' },
  { q: 'dispersion=0', label: 'NG: 虹なし', note: 'R/G/B を同じ量ずらしている（1 回サンプリング）' },
  { q: 'refraction=0.02', label: 'NG: 歪みが弱い', note: '屈折量不足。波はあるが物体がほぼ歪まない' },
  { q: 'caustics=0&specular=0', label: 'NG: のっぺり', note: '集光・ハイライトなし。立体感がない' },
  { q: 'damping=0.95', label: 'NG: すぐ消える', note: '減衰が強すぎ。広がる前に消える' },
  { q: 'simLongSide=96', label: 'NG: 荒れてブロック状', note: '格子が粗すぎ。波が太く速く広がり、ハイライトが四角い粒になる' },
]);

async function main() {
  const [refPath, outPng] = process.argv.slice(2);
  if (!refPath || !outPng) { console.error('usage: node make-gallery.mjs <reference.html> <out.png>'); process.exit(2); }
  mkdirSync(dirname(outPng), { recursive: true });
  const rows = [];
  for (const v of VARIANTS) {
    const { browser, page } = await openPage('webkit');
    try {
      await page.goto(`file://${refPath}?idleDropMs=0${v.q ? `&${v.q}` : ''}`);
      await page.waitForTimeout(1500);
      const frames = await captureFrames(page);
      const { width, height } = page.viewportSize();
      const dpr = await page.evaluate(() => devicePixelRatio);
      rows.push({ v, frames, dev: { w: Math.round(width * dpr), h: Math.round(height * dpr) } });
    } finally { await browser.close(); }
  }
  const b64 = (f) => `data:image/jpeg;base64,${f.buf.toString('base64')}`;
  const mid = DETAIL_POINTS.find((p) => p.name === 'middle');
  const rowHtml = ({ v, frames, dev }) => {
    const f400 = frames.find((f) => f.t === 400), f1600 = frames.find((f) => f.t === 1600);
    const o = cropOrigin(mid, dev.w, dev.h, { w: 480, h: 336 });
    return `<div class="r"><div class="l"><b>${v.label}</b><p>${v.note}</p><code>${v.q || '(既定値)'}</code></div>
      <figure><img src="${b64(f400)}"><figcaption>+400ms</figcaption></figure>
      <figure><img src="${b64(f1600)}"><figcaption>+1600ms</figcaption></figure>
      <figure><div class="c" style="background-image:url(${b64(f400)});background-position:-${o.x}px -${o.y}px;background-size:${dev.w}px ${dev.h}px"></div><figcaption>+400ms 中央 等倍</figcaption></figure></div>`;
  };
  const html = `<style>body{margin:0;background:#111;color:#ddd;font:14px system-ui}.r{display:flex;gap:8px;padding:8px;border-bottom:1px solid #333;align-items:flex-start}
    .l{width:220px}.l p{margin:6px 0;color:#aaa}code{font-size:11px;color:#8cc;word-break:break-all}img{width:480px;display:block}.c{width:480px;height:336px;background-repeat:no-repeat}figure{margin:0}</style>
    ${rows.map(rowHtml).join('')}`;
  const { browser, page } = await openPage('webkit');
  try {
    const p2 = await browser.newPage({ viewport: { width: 1720, height: 400 }, deviceScaleFactor: 1 });
    await p2.setContent(html); await p2.waitForTimeout(300);
    await p2.screenshot({ path: outPng, type: outPng.endsWith('.jpg') ? 'jpeg' : 'png', ...(outPng.endsWith('.jpg') ? { quality: 85 } : {}), fullPage: true });
    console.log(JSON.stringify({ out: outPng, variants: VARIANTS.length }));
  } finally { await page.close(); await browser.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
