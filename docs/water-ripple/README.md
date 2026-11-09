# 指でなぞると水面が波打つ表現を「HTML-in-Canvas デモ級」に引き上げる — 実装指示書

> **この文書の使い方**: 社用 PC の Claude Code に、このフォルダごと読ませて
> 「`docs/water-ripple/README.md` の指示に従って、既存の波紋実装を診断・修正・検証して」と依頼する。
> 同じフォルダに **動作確認済みのリファレンス実装** と **検証スクリプト** と **期待画像** がある。

| ファイル | 中身 |
|---|---|
| `reference.html` | 単一ファイルの完成形（WebGL2）。ブラウザで開くだけで動く。指/マウスでなぞると波紋 |
| `verify.mjs` | Playwright で「ドラッグ → スクショ → 入力可否 → console error」を自動確認 |
| `expected-chrome157.png` | Chrome 157 での期待画像（HTML カードが屈折・色収差で歪み、入力欄に実際に入力できている） |
| `expected-fallback.png` | HTML-in-Canvas 非対応ブラウザ（Chrome 156）での期待画像（カードは静止画として歪む） |
| `expected-webkit-ipad.png` | Playwright WebKit（iPad Pro 11 プロファイル）での期待画像 = **本番の iPad / Kiosk Pro に最も近い** |

検証済み環境（2026-11-09, macOS / Apple Silicon）: Chrome 157.0.8103.26 で HTML-in-Canvas 経路、
Chrome for Testing 156 で fallback 経路、Playwright WebKit 27.2（iPad プロファイル）で fallback 経路。
すべて console error 0。Chrome 157 では入力欄へのフォーカスと入力 `hello` を確認済み。
**iPad 実機・Kiosk Pro 上では未検証**（5-3 の手動チェックで確認すること）。

> ### ⚠ 本番環境は iPad + Kiosk Pro（= WebKit）。HTML-in-Canvas は使えない前提で作る
> Kiosk Pro は Apple の WKWebView（Safari と同じ WebKit エンジン）で表示する。HTML-in-Canvas は 2026-11-09 時点で
> Chrome 157 のみ正式対応で、WebKit は未出荷（実装作業の痕跡はあるが、Safari に載る時期は不明）。
> → **見た目の差の本体である ①〜④ は iPad でもすべて実現できる**（WebGL2 + float 描画は WebKit で確認済み）。
> ⑤「UI ごと歪ませる」が必要なら 4-5 の「疑似 HTML-in-Canvas」方式を使う。

---

## 0. 目標とする見た目（参考: X @nickbakeddesign "html-in-canvas" 2026-10-29 の動画）

- 鯉と蓮のある池の上に「Wishing pond」というフォームカードが浮かんでいる
- 指でなぞると、**なぞった軌跡に沿って航跡が残り**、波が同心円状に広がって反射・干渉する
- 波が通過すると **背景もカード上の文字・入力欄も屈折して歪む**。輪郭には **虹色のにじみ（色収差）**
- 波の山に **白いハイライト（スペキュラ）**、集光した明るい筋（コースティクス）
- 歪んでいる最中も **フォームは本物の DOM のまま入力できる** ← これが HTML-in-Canvas

### 受け入れ基準（Done の定義）

1. なぞった軌跡が途切れず連続した航跡になる（点のスタンプが並んだように見えない）
2. 波は広がって減衰し、画面端で反射する。120Hz 端末でも 60Hz 端末でも速さが同じ
3. 波の下の絵（背景・UI）が屈折で歪み、RGB がわずかにずれて虹色のにじみが出る
4. HTML-in-Canvas 対応 Chrome では、歪んだカードの入力欄をクリック → 入力できる。フォーカスリングも出る
5. 非対応ブラウザ（**本番の iPad / Kiosk Pro を含む**）でもエラーにならず、①〜④ の質感が出る
6. iPad でなぞってもページがスクロールせず、長押ししても選択ハイライト・コピーメニューが出ない
7. `verify.mjs` の出力で `errors: []`。`1-drag.png` が `expected-*.png` と同等の質感

---

## 1. なぜ「全然違う」見た目になるのか — 見た目を決める 5 要素

従来によくある実装と、デモ級の実装の違い。**診断ではまずこの表のどの列に当たるかを判定する**。

| 要素 | よくある実装（安っぽく見える） | デモ級の実装 |
|---|---|---|
| ① 波の正体 | 円・リングを描いて半径を広げる（Canvas2D `arc`、CSS `@keyframes scale`、SVG）、または `sin(距離 - 時間)` の解析式 | **高さ場（height field）の波動方程式**を GPU で毎フレーム解く。波が干渉・反射・減衰する |
| ② 入力 | `pointerdown`/`click` の 1 点だけ、または `pointermove` の点をそのまま打つ | なぞった **前回点→今回点の「線分」** に高さを注入。`getCoalescedEvents()` で高頻度サンプルも拾う |
| ③ 描き方 | 波そのもの（線・半透明の輪）を上に重ねて描く | 波は **描かない**。高さの勾配 = 法線で、**下の絵を読む UV をずらす（屈折）** |
| ④ 色 | 単色または白の半透明 | **R/G/B でずらし量を変える（色収差）** + ラプラシアンで集光 + 法線でスペキュラ |
| ⑤ UI との関係 | UI（DOM）は波の上に普通に乗っていて歪まない | UI も「水の下の絵」の一部としてテクスチャ化され、一緒に屈折する（**HTML-in-Canvas**） |

①〜④ は 2010 年代からある古典的手法（Evan Wallace の WebGL Water、jQuery Ripples と同系統）。
**HTML-in-Canvas が新しいのは ⑤ だけ**。①〜④ が欠けていると、HTML-in-Canvas を使っても水には見えない。
→ 見た目の差の大半は ①〜④ にある可能性が高い。⑤ は「UI ごと歪ませたい」場合のみ必要。

---

## 2. Step 1 — 既存実装の診断（修正前に必ずやる。コードを書かずに報告まで）

### 2-1. 該当コードを見つける

```bash
# 波紋・ポインタ・描画まわりを洗い出す（node_modules 等は除外）
INC=(--include='*.js' --include='*.ts' --include='*.jsx' --include='*.tsx' --include='*.vue' --include='*.svelte' \
     --include='*.html' --include='*.css' --include='*.glsl' --include='*.frag' --include='*.vert' --include='*.wgsl')
grep -rnE "ripple|wave|波紋|water|pointermove|touchmove|mousemove|getCoalescedEvents|requestAnimationFrame" "${INC[@]}" . | grep -v node_modules
grep -rnE "getContext\(['\"](2d|webgl2?|webgpu)|THREE\.|PIXI\.|ShaderMaterial|gl_FragColor|fragColor|@keyframes" "${INC[@]}" . | grep -v node_modules
```

### 2-2. 判定チェックリスト（各項目 YES/NO と該当 `file:line` を報告）

- [ ] 描画 API は何か: CSS / SVG / Canvas2D / WebGL1 / WebGL2 / three.js / WebGPU
- [ ] ① 高さ場の状態テクスチャ（またはバッファ）を毎フレーム更新しているか。ping-pong（2 枚交互）になっているか
- [ ] ① 波の速さがフレームレート依存になっていないか（`requestAnimationFrame` 1 回 = 1 ステップ固定なら依存している）
- [ ] ② 入力は点か線分か。`getCoalescedEvents` を使っているか。`touch-action: none` があるか
- [ ] ② 座標変換: `clientX/Y` → canvas 座標で `getBoundingClientRect` と DPR を考慮しているか。Y 軸の反転はあるか
- [ ] ③ 「下の絵」をテクスチャとして持ち、UV をずらしてサンプリングしているか（屈折）
- [ ] ④ 色収差・集光・スペキュラの有無
- [ ] ⑤ UI（DOM）は波の上か、テクスチャとして水の下か
- [ ] canvas の解像度はデバイスピクセルか（`canvas.width = clientWidth * devicePixelRatio`）。ぼやけていないか
- [ ] float テクスチャを使っている場合、`EXT_color_buffer_float` 等の拡張チェックと FBO 完全性チェックがあるか

### 2-3. 報告フォーマット

```
## 診断結果
- 描画方式: (例) Canvas2D で arc を半径拡大 — src/ripple.ts:42
- 欠けている要素: ①②③④⑤ のうち (例) ①③④⑤
- 修正方針: (例) 描画部分を reference.html の WebGL2 パイプラインに置換。入力処理は流用可（Y 反転のみ修正）
- 影響範囲: 変更ファイル一覧 / 既存テスト有無
```

**ここで一度人間に報告して方針の承認を取ってから** Step 2 に進む。

---

## 3. Step 2 — 実装方針

### 3-1. パイプライン（reference.html と同じ構成）

```
毎フレーム:
  [入力] pointer 線分キュー ──▶ DROP パス（線分の周りに高さを足す）   state A → B, swap
  [時間] 固定 60Hz アキュムレータ ─▶ UPDATE パス × n 回（波動方程式）     state A → B, swap
  [絵]   SCENE パス: 背景 + （HTML カードのテクスチャ） ─▶ sceneTex（画面解像度 RGBA8）
  [合成] WATER パス: state の勾配で sceneTex を RGB 別に屈折サンプリング + 集光 + スペキュラ ─▶ 画面
```

- state テクスチャ: `RGBA16F`（R = 高さ, G = 速度）。長辺 256〜512 セル。画面解像度にしない（重い上に波が遅くなる）
- WebGL2 + `EXT_color_buffer_float`（無ければ `EXT_color_buffer_half_float`）。取れなければ機能を無効化
- 全画面は三角形 1 枚（`[-1,-1, 3,-1, -1,3]`）で描く

### 3-2. 核心のシェーダー（reference.html から抜粋。そのまま使える）

波動方程式（R=高さ, G=速度）:
```glsl
float avg = 0.25 * (h(+x) + h(-x) + h(+y) + h(-y));  // 4 近傍の平均
s.g += (avg - s.r) * 2.0;   // 平均との差で加速
s.g *= uDamping;            // 0.99 前後。1 に近いほど長く残る
s.r += s.g;
```
線分注入（なぞった跡を連続にする肝）:
```glsl
float d = segDist(vUv * uAspect, uA * uAspect, uB * uAspect) / uRadius; // アスペクト補正必須
float drop = max(0.0, 1.0 - d);
s.r += (0.5 - 0.5 * cos(drop * PI)) * uStrength;  // 余弦で縁を滑らかに
```
屈折 + 色収差 + 集光 + スペキュラ:
```glsl
vec2 grad = vec2(hR - hL, hU - hD);
vec2 off  = -grad * uRefraction;
col.r = texture(uScene, vUv + off * (1.0 + uDispersion)).r;
col.g = texture(uScene, vUv + off).g;
col.b = texture(uScene, vUv + off * (1.0 - uDispersion)).b;
float lap = hL + hR + hD + hU - 4.0 * hC;          // 凸部 = 集光
col += vec3(0.55, 0.85, 0.80) * clamp(-lap * uCaustics, 0.0, 0.6);
vec3 n = normalize(vec3(-grad * 6.0, 1.0));
col += pow(max(dot(reflect(-L, n), vec3(0,0,1)), 0.0), 90.0) * uSpecular;
```

### 3-3. 既存構成ごとの移植指針

| 既存 | 方針 |
|---|---|
| CSS / SVG / Canvas2D | 描画部分を WebGL2 に置換（reference.html の構成をモジュール分割して移植）。入力・UI は流用 |
| 生 WebGL で解析式の波 | ① を高さ場シミュに置換し、③④ を WATER パスとして追加 |
| three.js | sim は `WebGLRenderTarget`（`HalfFloatType`）2 枚で ping-pong、WATER パスは `ShaderMaterial` の全画面 quad か postprocessing の Pass。three.js の `HTMLTexture` は実験ブランチ由来で **バージョン未確認** — 使う前に該当バージョンの docs で存在確認 |
| React | canvas を 1 つ持つコンポーネントに閉じ込め、GL 状態は `useRef`。再レンダーで GL を作り直さない |

### 3-4. 調整パラメータ（reference.html の `PARAMS`、最初はこの値から）

| 名前 | 既定 | 効き方 |
|---|---|---|
| `simLongSide` | 384 | 格子の細かさ。上げると細かい波・重くなる |
| `damping` | 0.992 | 波の残り時間 |
| `dropRadiusPx` | 18 | 指の太さ（CSS px） |
| `dropStrength` | 0.9 | 波の高さ |
| `refraction` | 0.06 | 歪みの強さ（デモ級の肝。0.03〜0.1） |
| `dispersion` | 0.35 | 虹色のにじみ |
| `caustics` / `specular` | 1.8 / 0.5 | 明るい筋 / 白いハイライト |

---

## 4. HTML-in-Canvas API（UI ごと歪ませる場合のみ）

### 4-1. 費用・提供状況（2026-11-09 時点、Chrome 公式 docs で確認済み）

- **無料**。ブラウザ標準 API なのでライセンス・課金なし
- **Chrome 157 で正式リリース**（2026-10-26 の Chrome ブログ）。Origin Trial のトークン登録は不要
- 他ブラウザ（Safari / Firefox）は対応未記載 → **必ず feature detection + fallback**
- 社用 PC の Chrome が管理ポリシーで 157 未満に留まっている可能性あり → `chrome://version` で確認

### 4-2. Origin Trial 時代の情報は古い（ネット記事に注意）

| 古い（OT 期・記事に多い） | 現行（Chrome 157 stable） |
|---|---|
| `<canvas layoutsubtree>` | `<canvas content="drawable">` + 子要素に `drawable` 属性 |
| `gl.texElementImage2D(...)` | `gl.texElementSubImage2D(target, level, x, y, element)`（事前に `texImage2D(..., null)` で領域確保） |
| WebGPU `copyElementImageToTexture` | `device.queue.drawElementImageToTexture(source, destination)` |

### 4-3. 最小コード

```html
<canvas id="gl" content="drawable">
  <div id="card" drawable> …普通のフォーム… </div>
</canvas>
```
```js
// feature detection（公式 docs の方法）
const c = document.createElement('canvas'); c.setAttribute('content', 'drawable');
const HIC = c.content === 'drawable';

// paint イベント内で DOM → テクスチャ。描画もここで行い、requestPaint で連続アニメーション
canvas.addEventListener('paint', () => {
  ensureCardTexture();                                   // ← 必ず paint 内で（下の落とし穴 1）
  gl.bindTexture(gl.TEXTURE_2D, cardTex);
  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, card);
  renderFrame();
  canvas.requestPaint();
});
canvas.requestPaint();

// ヒットテスト・フォーカスリング・a11y の位置をシェーダーの描画位置と一致させる（CSS px）
canvas.updateElementGeometry(card, { canvasTransform: new DOMMatrix().translate(x, y) });
```

### 4-4. 実地で踏んだ落とし穴（reference.html 作成時に確認済み）

1. **`canvas.getElementImageDefaultSize(el)` は最初の paint 前に呼ぶと `InvalidStateError: No cached paint record for element.`**
   → テクスチャ確保は paint ハンドラ内で遅延して行い、サイズが変わった時だけ作り直す
2. DOM から作ったテクスチャは **上が 0 行目**。GL の UV（左下原点）で読むなら `1.0 - v` で Y 反転
3. 非対応ブラウザでは canvas の子は fallback content 扱いで **描画されず `offsetWidth` も 0**。fallback では Canvas2D で静止画を作る（または DOM を canvas の外に出して重ねる）
4. 屈折で見た目は揺れるが、ヒットテストは `updateElementGeometry` で渡した歪む前の矩形で行われる（実用上は問題なし）
5. canvas グリッドはデバイスピクセルに合わせる: `ResizeObserver` で `{ box: 'device-pixel-content-box' }` を observe し、`devicePixelContentBoxSize` から `canvas.width/height` を設定。サイズ変更後は `requestPaint()`

### 4-5. iPad / Kiosk Pro（WebKit）向け — 本番はこちら

**WebKit で実際に踏んだ問題（reference.html は修正済み）**:

1. **`ResizeObserver` の `{ box: 'device-pixel-content-box' }` に WebKit は非対応で、`observe()` が `TypeError` を投げる**
   → canvas が 300×150 のまま何も描かれない。`try { ro.observe(c, {box:'device-pixel-content-box'}) } catch { ro.observe(c) }` とし、
   サイズは `contentRect × devicePixelRatio` で計算する
2. **なぞる操作でテキスト選択が始まり、選択ハイライト（半透明の青）が canvas 全体に被る**（画面が青白く濁る。シェーダーの不具合に見えるので注意）
   → `body { -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent }`、
   入力欄だけ `user-select:text` に戻す。水面上の `pointerdown` で `preventDefault()`
3. iPad の DPR は 2 なので、全画面パス（scene / water）は 2388×1668 程度になる。重ければ `PARAMS.maxDpr` を 1.5 に下げる（sim 解像度は別なので波の質は落ちない）

**UI（フォーム等）も歪ませたい場合 — 疑似 HTML-in-Canvas 方式**（HTML-in-Canvas 無しで ⑤ を近似する）:

- UI の見た目を Canvas2D で描いてテクスチャ化 → SCENE パスに合成（reference.html の `uploadCardFallback` と同じ）
- 操作用に **本物の DOM を同じ位置に `opacity: 0` で重ねる**（入力・タップは DOM が受ける）
- `input` / `focus` / `blur` イベントで Canvas2D を描き直して `texImage2D` で再アップロード（キャレットは自前描画、点滅は 530ms 程度）
- iPad のソフトキーボード表示でビューポートが変わるので `visualViewport` の resize で位置を再計算
- UI が多い／頻繁に変わる場合は割に合わない → **UI は水面の上に普通の DOM として載せ、歪ませるのは背景だけ**にするのが現実解。デモの見た目の大部分は ①〜④ で出る

**Kiosk Pro 側の設定・確認**:
- ブラウザエンジンが **WKWebView**（既定）になっていること。旧 UIWebView 設定だと WebGL2 等の挙動が異なる可能性がある
- デバッグは Kiosk Pro の「Web Inspector を有効化」設定 + Mac の Safari「開発」メニューから接続して console を見る
- iPadOS のバージョンを記録しておく（WebGL2 / `EXT_color_buffer_float` / `getCoalescedEvents` の可否が OS 依存。reference.html は後者 2 つが無くても動くよう分岐済み）

### 4-6. セキュリティ・プライバシー上の制約（仕様）

クロスオリジンの画像・iframe 内容、`:visited` 情報、スペルチェックの波線、オートフィル候補、IME ポップアップ、システムカラーなどはテクスチャに描かれない。
→ カード内に外部ドメインの画像を置くと空白になる。同一オリジンから配信する。

---

## 5. Step 3 — 検証（TDD 方針）

### 5-1. 単体テスト（TDD 適用: 先にテストを書いて RED を確認 → 実装）

GL に依存しない純粋関数を切り出してテストする（vitest / jest など、既存プロジェクトのテスト基盤に合わせる）。

| 関数 | テスト観点 |
|---|---|
| `clientToUv(clientX, clientY, rect)` | 左上 → `(0,1)`、右下 → `(1,0)`（Y 反転）、rect のオフセット・スケールを考慮 |
| `segmentQueue.push(a, b)` | 上限（例 64）を超えたら捨てる。`drain()` で空になる。元配列を破壊しない |
| `fixedSteps(accMs, dtMs, hz, maxSteps)` | 16.7ms × 60Hz = 1 ステップ、8.3ms × 2 回で 1 ステップ（120Hz 端末）、タブ復帰で巨大 dt が来ても `maxSteps` で頭打ち |
| `cardRectUv(x, y, w, h, cw, ch)` | CSS px の矩形 → 左下原点 UV に変換 |
| `simSize(W, H, longSide)` | 横長・縦長でアスペクト比を保つ |

### 5-2. ブラウザ検証（視覚。TDD opt-out — スクショで代替）

```bash
npm i -D playwright
npx playwright install webkit
# 本番相当（iPad / WebKit）— こちらを主に見る
node docs/water-ripple/verify.mjs http://localhost:<port>/<波紋のページ> ./ripple-shots-webkit webkit
# 参考（Chrome 157, HTML-in-Canvas 経路）
node docs/water-ripple/verify.mjs http://localhost:<port>/<波紋のページ> ./ripple-shots-chrome chrome
```
- 出力 JSON: `errors: []`、`canvasPx` が画面サイズ × DPR になっている（`[300,150]` なら ResizeObserver で落ちている）
- `htmlInCanvas` は Chrome 157 なら true、WebKit なら false が正常。`focused.value === "hello"` は HTML-in-Canvas 版のみ
- `1-drag.png` を Read して `expected-webkit-ipad.png`（WebKit）/ `expected-chrome157.png`（Chrome）と比較し、受け入れ基準 1〜3 を目視判定。**画面が青白く濁っていたら選択ハイライト（4-5 の 2）**
- 比較の前に、まず `reference.html` 自体を同じスクリプトで回して、社用 PC の環境で期待画像が再現できることを確認する（環境差の切り分け）

### 5-3. 実機（手動チェック）— 本番の iPad + Kiosk Pro で

- [ ] iPad 実機の Kiosk Pro でなぞる → スクロールしない、軌跡が途切れない、2 本指・3 本指でも破綻しない
- [ ] 長押し・ダブルタップで選択ハイライト／コピーメニュー／ズームが出ない
- [ ] 数十分放置・連続操作してもフレーム落ち・発熱で破綻しない（キオスクは長時間稼働）
- [ ] 120Hz 端末（ProMotion 等）と 60Hz で波の速さが同じ
- [ ] ウィンドウのリサイズ・回転後もぼやけない／カード位置とクリック位置がずれない
- [ ] DevTools Performance で 1 フレーム 16ms 未満（重ければ `simLongSide` を 256 に）

---

## 6. その他の落とし穴

- **float テクスチャ**: WebGL2 でも float への描画には `EXT_color_buffer_float` が必要。`checkFramebufferStatus` を必ず確認
- **同じテクスチャを読みながら書かない**: 必ず ping-pong（A を読んで B に書き swap）
- **波の速さのフレームレート依存**: 1 rAF = 1 ステップにしない。固定タイムステップ＋上限
- **アスペクト比**: 注入半径・距離計算は `uv * vec2(W/H, 1)` で補正しないと楕円になる
- **入力の取りこぼし**: `pointermove` だけだと速くなぞった時に点が飛ぶ → 線分注入＋`getCoalescedEvents`
- **マウスのホバー**: マウスは `buttons === 0` の時に注入しない（タッチ/ペンはそのまま）
- **アイドル時の演出**: 何も触っていない時に小さな雫を時々落とすと「生きた水面」に見える（`idleDropMs`）

---

## 7. 参考（2026-11-09 確認）

- Chrome docs: HTML-in-Canvas — https://developer.chrome.com/docs/web-platform/html-in-canvas （/concepts, /webgl, /webgpu）
- Chrome ブログ（Chrome 157 stable 告知）— https://developer.chrome.com/blog/html-in-canvas
- WICG 仕様リポジトリ — https://github.com/WICG/html-in-canvas
- WICG 公式デモ（WebGL）— https://wicg.github.io/html-in-canvas/Examples/webGL.html
- デモ集 — https://github.com/GoogleChromeLabs/css-web-ui-demos/blob/main/html-in-canvas/awesome-html-in-canvas.md
- 古典的手法の源流: Evan Wallace "WebGL Water" — https://madebyevan.com/webgl-water/ 、jQuery Ripples — https://github.com/sirxemic/jquery.ripples
