# three.js 品質引き上げプロンプト（水面の波紋・風景）

既存の three.js 実装（マウスで波紋が立つ水面 / 風景）を、three.js 公式サンプルの水準まで引き上げるためのプロンプト。

下のコードブロックをそのまま Claude Code（Opus 5.5）に貼る。スクショ（`target.png`）を用意できる場合はリポジトリに置いてから貼る。

参照 URL は 2026-10-28 に存在確認済み（three.js 公式 `examples/files.json` 掲載 / HTTP 200）。

```
# 目的
このリポジトリの three.js 実装（マウスでなぞると波紋が立つ水面 / 風景の描画）の見た目の品質を、
three.js 公式サンプルの水準まで引き上げる。
今の実装は「動いてはいるが安っぽい」。原因は手法と基本設定の不足だと考えている。

# 重要: 参照は「ソースコード」で読む
デモページは WebGL のため、あなたには見えない。必ず下の raw URL のソースを取得して読むこと
（WebFetch で要約させず、curl で全文を取得して読む）。

## 水面の波紋（マウス操作）
- 本命（WebGL / GPGPU で高さを計算）:
  https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_gpgpu_water.html
  デモ: https://threejs.org/examples/#webgl_gpgpu_water
- WebGPU 版（compute shader）:
  https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_compute_water.html
- 屈折・水底の光の模様（caustics）の定番:
  https://github.com/evanw/webgl-water （デモ: https://madebyevan.com/webgl-water/）
  three.js 移植版: https://github.com/martinRenou/threejs-water

## 風景
- 手続き生成の地形（TSL）:
  https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_tsl_procedural_terrain.html
- 大気散乱の空と海:
  https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_shaders_ocean.html
- 高さで変わる霧（奥行き感）:
  https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_fog_height.html
- 実サイトの完成形（地形・草・水を含む）:
  https://github.com/brunosimon/folio-2025
- 草原の参考（デモのみ）: https://al-ro.github.io/projects/grass/

注意: webgpu_ で始まるものは WebGPURenderer + TSL 前提。
今の実装が WebGLRenderer なら webgl_ 版を優先し、WebGPU 版は手法の参考に留める。
React Three Fiber を使っている場合は、手法を R3F の書き方に移植する。

# 最初にやること（実装前に、ここで止まって私の確認を待つ）
1. 今の実装を読み、使っているレンダラ・three.js のバージョン・水面と風景の作り方を一覧にする
2. 参照ソースを読み、品質を生んでいる手法を具体的に列挙する
   （例: 高さマップのシミュレーション方式、法線の計算、反射・屈折、フレネル、
   空の大気散乱、霧、トーンマッピング、色空間、環境マップ）
3. 「今の実装」と「参照」の差分を表にし、効果が大きい順に直す項目を並べる
推測で埋めず、ソースに書いてあることだけを根拠にする。

# 基本設定のチェック（シェーダより先に効くことが多い）
- renderer.outputColorSpace = THREE.SRGBColorSpace / テクスチャの colorSpace 指定
- renderer.toneMapping（ACESFilmic または AgX）と toneMappingExposure
- renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
- 環境マップ（HDRI + PMREMGenerator）で反射とライティングを作る
- ポストエフェクト（bloom、SMAA などのアンチエイリアス）
- 霧と空の色を合わせ、遠景を空に溶かす

# 進め方（各段階で止まって私の確認を待つ）
0. 上の「最初にやること」を提示
1. 差分表の上位から 1 項目ずつ直す
2. 1 項目直すたびに Playwright でスクショを撮り、参照（target.png があればそれ）と比べて自己修正
3. 最後に 375px / 1440px で確認し、fps を計測して報告

# 制約
- 参照のコードを丸ごと貼り付けない。手法を理解した上で、今の構成に合わせて実装する
- モバイルでは描画負荷を下げる（DPR 上限 1.5、シミュレーション解像度を下げる）
- 60fps を目安に、画面外では描画とシミュレーションを止める

# 完成条件
- 水面: マウスでなぞった軌跡に波紋が広がり、反射・屈折・ハイライトが自然に見える
- 風景: 空・霧・地形の色がつながり、遠近感がある
- 変更点ごとに「何を変え、なぜ良くなったか」を 1 行で説明できる
```
